package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/model"
	"github.com/lingmiai/server/internal/service"
	"gorm.io/gorm"
)

type ChatHandler struct {
	DB  *gorm.DB
	Cfg *config.Config
	LLM *service.LLMService
}

type CreateConversationRequest struct {
	Title string `json:"title"`
	Model string `json:"model" binding:"required"`
}

type SendMessageRequest struct {
	Content string `json:"content" binding:"required"`
	Model   string `json:"model"`
}

func (h *ChatHandler) ListConversations(c *gin.Context) {
	userID := c.GetUint("user_id")

	var conversations []model.Conversation
	h.DB.Where("user_id = ?", userID).Order("pinned DESC, updated_at DESC").Find(&conversations)

	c.JSON(http.StatusOK, conversations)
}

func (h *ChatHandler) CreateConversation(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req CreateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	title := req.Title
	if title == "" {
		title = "New Conversation"
	}

	conv := model.Conversation{
		UserID: userID,
		Title:  title,
		Model:  req.Model,
	}

	if err := h.DB.Create(&conv).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create conversation"})
		return
	}

	c.JSON(http.StatusCreated, conv)
}

func (h *ChatHandler) GetConversation(c *gin.Context) {
	userID := c.GetUint("user_id")
	convID := c.Param("id")

	var conv model.Conversation
	if err := h.DB.Where("id = ? AND user_id = ?", convID, userID).First(&conv).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "conversation not found"})
		return
	}

	var messages []model.Message
	h.DB.Where("conversation_id = ?", conv.ID).Order("created_at ASC").Find(&messages)

	c.JSON(http.StatusOK, gin.H{
		"conversation": conv,
		"messages":     messages,
	})
}

func (h *ChatHandler) DeleteConversation(c *gin.Context) {
	userID := c.GetUint("user_id")
	convID := c.Param("id")

	result := h.DB.Where("id = ? AND user_id = ?", convID, userID).Delete(&model.Conversation{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "conversation not found"})
		return
	}

	// Delete associated messages
	h.DB.Where("conversation_id = ?", convID).Delete(&model.Message{})

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *ChatHandler) UpdateConversation(c *gin.Context) {
	userID := c.GetUint("user_id")
	convID := c.Param("id")

	var req struct {
		Title  *string `json:"title"`
		Pinned *bool   `json:"pinned"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Pinned != nil {
		updates["pinned"] = *req.Pinned
	}

	result := h.DB.Model(&model.Conversation{}).Where("id = ? AND user_id = ?", convID, userID).Updates(updates)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "conversation not found"})
		return
	}

	var conv model.Conversation
	h.DB.First(&conv, convID)
	c.JSON(http.StatusOK, conv)
}

// SendMessage handles sending a message and getting AI response
func (h *ChatHandler) SendMessage(c *gin.Context) {
	userID := c.GetUint("user_id")
	convID := c.Param("id")

	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify conversation ownership
	var conv model.Conversation
	if err := h.DB.Where("id = ? AND user_id = ?", convID, userID).First(&conv).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "conversation not found"})
		return
	}

	// Check credits
	var credits model.UserCredits
	h.DB.Where("user_id = ?", userID).First(&credits)
	if credits.Balance <= 0 {
		c.JSON(http.StatusPaymentRequired, gin.H{"error": "insufficient credits"})
		return
	}

	// Save user message
	userMsg := model.Message{
		ConversationID: conv.ID,
		Role:           "user",
		Content:        req.Content,
		Model:          conv.Model,
	}
	h.DB.Create(&userMsg)
	h.DB.Model(&conv).Updates(map[string]interface{}{
		"message_count": gorm.Expr("message_count + 1"),
	})

	// Build context messages from history
	var history []model.Message
	h.DB.Where("conversation_id = ?", conv.ID).Order("created_at ASC").Limit(50).Find(&history)

	var chatMessages []service.ChatMessage
	for _, m := range history {
		chatMessages = append(chatMessages, service.ChatMessage{Role: m.Role, Content: m.Content})
	}

	// Select channel and call LLM
	channel, err := h.LLM.SelectChannel(conv.Model)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "no available channel: " + err.Error()})
		return
	}

	llmReq := &service.ChatRequest{
		Model:    conv.Model,
		Messages: chatMessages,
		Stream:   false,
	}

	result, err := h.LLM.ChatCompletion(channel, llmReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "LLM error: " + err.Error()})
		return
	}

	assistantContent := ""
	if len(result.Choices) > 0 {
		assistantContent = result.Choices[0].Message.Content
	}

	// Save assistant message
	assistantMsg := model.Message{
		ConversationID: conv.ID,
		Role:           "assistant",
		Content:        assistantContent,
		Model:          conv.Model,
		TokensUsed:     result.Usage.TotalTokens,
	}
	h.DB.Create(&assistantMsg)
	h.DB.Model(&conv).Updates(map[string]interface{}{
		"message_count": gorm.Expr("message_count + 1"),
	})

	// Deduct credits
	tokenCost := float64(result.Usage.TotalTokens) / 1000.0
	h.DB.Model(&credits).Update("balance", gorm.Expr("balance - ?", tokenCost))
	h.DB.Create(&model.CreditLog{
		UserID:  userID,
		Type:    "consume",
		Amount:  -tokenCost,
		Balance: credits.Balance - tokenCost,
		Model:   conv.Model,
		Detail:  "chat completion",
	})

	c.JSON(http.StatusOK, gin.H{
		"user_message":      userMsg,
		"assistant_message": assistantMsg,
	})
}

// StreamMessage handles SSE streaming chat
func (h *ChatHandler) StreamMessage(c *gin.Context) {
	userID := c.GetUint("user_id")
	convID := c.Param("id")

	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var conv model.Conversation
	if err := h.DB.Where("id = ? AND user_id = ?", convID, userID).First(&conv).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "conversation not found"})
		return
	}

	var credits model.UserCredits
	h.DB.Where("user_id = ?", userID).First(&credits)
	if credits.Balance <= 0 {
		c.JSON(http.StatusPaymentRequired, gin.H{"error": "insufficient credits"})
		return
	}

	// Save user message
	userMsg := model.Message{ConversationID: conv.ID, Role: "user", Content: req.Content, Model: conv.Model}
	h.DB.Create(&userMsg)

	// Build messages
	var history []model.Message
	h.DB.Where("conversation_id = ?", conv.ID).Order("created_at ASC").Limit(50).Find(&history)
	var chatMessages []service.ChatMessage
	for _, m := range history {
		chatMessages = append(chatMessages, service.ChatMessage{Role: m.Role, Content: m.Content})
	}

	channel, err := h.LLM.SelectChannel(conv.Model)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	llmReq := &service.ChatRequest{Model: conv.Model, Messages: chatMessages, Stream: true}

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "streaming not supported"})
		return
	}

	if err := h.LLM.StreamChatCompletion(channel, llmReq, c.Writer, flusher); err != nil {
		// Stream already started, can't send JSON error
		return
	}
}
