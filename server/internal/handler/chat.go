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
	DB         *gorm.DB
	Cfg        *config.Config
	LLM        *service.LLMService
	Moderation *service.ModerationService
}

type CreateConversationRequest struct {
	Title string `json:"title"`
	Model string `json:"model" binding:"required"`
}

type SendMessageRequest struct {
	Content string `json:"content" binding:"required"`
	Model   string `json:"model"`
}

const imageGenSystemPrompt = `你是灵觅AI助手。你具备图片生成能力。

【核心规则 - 图片生成】
当用户要求生成、创建、画、绘制任何图片/照片/插画/海报时，你必须：
1. 用一句话说明你正在生成什么
2. 立刻输出 <image_gen>英文prompt</image_gen> 标签

示例：
用户: "帮我生成一张小狗卡通照片"
助手: "好的，正在为你生成一张可爱的卡通小狗图片。
<image_gen>A cute cartoon puppy with big round eyes, fluffy soft fur, happy expression, small body, bright warm colors, clean simple background, cartoon style, high quality, rich details, healing kawaii style</image_gen>"

用户: "画一个日落海滩"
助手: "正在为你生成日落海滩图片。
<image_gen>A beautiful sunset beach scene, golden hour light reflecting on calm ocean waves, palm trees silhouetted against orange and purple sky, soft sand, cinematic composition, photorealistic, 4k quality</image_gen>"

【严格要求】
- 只要用户意图是要图片，必须输出 <image_gen> 标签，绝不要只给文字建议
- <image_gen> 内必须是详细的英文描述（画面、风格、光线、构图、质量）
- 不要告诉用户"你无法生成图片"，你可以通过 <image_gen> 标签直接生成
- 不要只给出"提示词建议"让用户自己去生成，你必须直接生成
- 如果用户请求与图片无关，正常用中文回答即可`

func (h *ChatHandler) ListConversations(c *gin.Context) {
	userID := c.GetUint("user_id")

	var conversations []model.Conversation
	h.DB.Where("user_id = ?", userID).Order("pinned DESC, updated_at DESC").Find(&conversations)

	c.JSON(http.StatusOK, gin.H{"data": conversations})
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

	// Content moderation
	if h.Moderation != nil {
		result := h.Moderation.CheckText(req.Content)
		if result.RiskLevel == "block" {
			h.Moderation.LogModeration(userID, "text", "chat", req.Content, "", 0, result.HitWords, "", "block")
			c.JSON(http.StatusForbidden, gin.H{"error": "\u5185\u5bb9\u5305\u542b\u8fdd\u89c4\u4fe1\u606f\uff0c\u8bf7\u4fee\u6539\u540e\u91cd\u8bd5"})
			return
		}
		if result.RiskLevel == "suspect" {
			risk, reason := h.Moderation.CheckTextWithAI(req.Content)
			if risk == "block" {
				h.Moderation.LogModeration(userID, "text", "chat", req.Content, "", 0, result.HitWords, reason, "block")
				c.JSON(http.StatusForbidden, gin.H{"error": "\u5185\u5bb9\u5305\u542b\u8fdd\u89c4\u4fe1\u606f\uff0c\u8bf7\u4fee\u6539\u540e\u91cd\u8bd5"})
				return
			}
		}
	}

	// Check credits
	var credits model.UserCredits
	h.DB.Where("user_id = ?", userID).First(&credits)
	if credits.Balance <= 0 {
		c.JSON(http.StatusPaymentRequired, gin.H{"error": "insufficient credits"})
		return
	}

	// If client requests a different model, update the conversation
	if req.Model != "" && req.Model != conv.Model {
		conv.Model = req.Model
		h.DB.Model(&conv).Update("model", req.Model)
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

	// Prepend system prompt for image generation capability
	chatMessages := []service.ChatMessage{
		{Role: "system", Content: imageGenSystemPrompt},
	}
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
		assistantContent = result.Choices[0].Message.ContentString()
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
	h.DB.Model(&model.UserCredits{}).Where("user_id = ?", userID).
		Update("balance", gorm.Expr("balance - ?", tokenCost))

	var updatedCredits model.UserCredits
	h.DB.Where("user_id = ?", userID).First(&updatedCredits)
	h.DB.Create(&model.CreditLog{
		UserID:  userID,
		Type:    "consume",
		Amount:  -tokenCost,
		Balance: updatedCredits.Balance,
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

	// Content moderation
	if h.Moderation != nil {
		result := h.Moderation.CheckText(req.Content)
		if result.RiskLevel == "block" {
			h.Moderation.LogModeration(userID, "text", "chat", req.Content, "", 0, result.HitWords, "", "block")
			c.JSON(http.StatusForbidden, gin.H{"error": "\u5185\u5bb9\u5305\u542b\u8fdd\u89c4\u4fe1\u606f\uff0c\u8bf7\u4fee\u6539\u540e\u91cd\u8bd5"})
			return
		}
		if result.RiskLevel == "suspect" {
			risk, reason := h.Moderation.CheckTextWithAI(req.Content)
			if risk == "block" {
				h.Moderation.LogModeration(userID, "text", "chat", req.Content, "", 0, result.HitWords, reason, "block")
				c.JSON(http.StatusForbidden, gin.H{"error": "\u5185\u5bb9\u5305\u542b\u8fdd\u89c4\u4fe1\u606f\uff0c\u8bf7\u4fee\u6539\u540e\u91cd\u8bd5"})
				return
			}
		}
	}

	var credits model.UserCredits
	h.DB.Where("user_id = ?", userID).First(&credits)
	if credits.Balance <= 0 {
		c.JSON(http.StatusPaymentRequired, gin.H{"error": "insufficient credits"})
		return
	}

	// If client requests a different model, update the conversation
	if req.Model != "" && req.Model != conv.Model {
		conv.Model = req.Model
		h.DB.Model(&conv).Update("model", req.Model)
	}

	// Save user message
	userMsg := model.Message{ConversationID: conv.ID, Role: "user", Content: req.Content, Model: conv.Model}
	h.DB.Create(&userMsg)

	// Build messages with image generation system prompt
	var history []model.Message
	h.DB.Where("conversation_id = ?", conv.ID).Order("created_at ASC").Limit(50).Find(&history)
	chatMessages := []service.ChatMessage{
		{Role: "system", Content: imageGenSystemPrompt},
	}
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

	result, err := h.LLM.StreamChatCompletion(channel, llmReq, c.Writer, flusher)
	if err != nil {
		// Stream already started, can't send JSON error
		return
	}

	// Save assistant message
	assistantMsg := model.Message{
		ConversationID: conv.ID,
		Role:           "assistant",
		Content:        result.Content,
		Model:          conv.Model,
		TokensUsed:     result.TotalTokens,
	}
	h.DB.Create(&assistantMsg)
	h.DB.Model(&conv).Updates(map[string]interface{}{
		"message_count": gorm.Expr("message_count + 2"),
	})

	// Deduct credits
	tokenCost := float64(result.TotalTokens) / 1000.0
	h.DB.Model(&model.UserCredits{}).Where("user_id = ?", userID).
		Update("balance", gorm.Expr("balance - ?", tokenCost))

	var updatedCredits model.UserCredits
	h.DB.Where("user_id = ?", userID).First(&updatedCredits)
	h.DB.Create(&model.CreditLog{
		UserID:  userID,
		Type:    "consume",
		Amount:  -tokenCost,
		Balance: updatedCredits.Balance,
		Model:   conv.Model,
		Detail:  "chat completion (stream)",
	})
}
