package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"github.com/lingmiai/server/internal/service"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserHandler struct {
	DB         *gorm.DB
	Moderation *service.ModerationService
}

func (h *UserHandler) GetCredits(c *gin.Context) {
	userID := c.GetUint("user_id")

	var credits model.UserCredits
	if err := h.DB.Where("user_id = ?", userID).First(&credits).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "credits not found"})
		return
	}

	c.JSON(http.StatusOK, credits)
}

func (h *UserHandler) GetCreditLogs(c *gin.Context) {
	userID := c.GetUint("user_id")

	var logs []model.CreditLog
	h.DB.Where("user_id = ?", userID).Order("created_at DESC").Limit(50).Find(&logs)

	c.JSON(http.StatusOK, gin.H{"data": logs})
}

func (h *UserHandler) GetUsageStats(c *gin.Context) {
	userID := c.GetUint("user_id")

	// Credits overview
	var credits model.UserCredits
	h.DB.Where("user_id = ?", userID).First(&credits)

	// Today's consumption
	var todayConsumed float64
	h.DB.Model(&model.CreditLog{}).
		Where("user_id = ? AND type = 'consume' AND created_at >= CURDATE()", userID).
		Select("COALESCE(SUM(ABS(amount)), 0)").Scan(&todayConsumed)

	// Total conversation count
	var convCount int64
	h.DB.Model(&model.Conversation{}).Where("user_id = ?", userID).Count(&convCount)

	// Total messages
	var msgCount int64
	h.DB.Model(&model.Message{}).
		Joins("JOIN conversations ON conversations.id = messages.conversation_id").
		Where("conversations.user_id = ?", userID).Count(&msgCount)

	// Total image generations
	var genCount int64
	h.DB.Model(&model.Generation{}).Where("user_id = ?", userID).Count(&genCount)

	// Per-model consumption breakdown (top 5)
	type ModelStat struct {
		Model    string  `json:"model"`
		Total    float64 `json:"total"`
		Count    int64   `json:"count"`
	}
	var modelStats []ModelStat
	h.DB.Model(&model.CreditLog{}).
		Where("user_id = ? AND type = 'consume' AND model != ''", userID).
		Select("model, COALESCE(SUM(ABS(amount)), 0) as total, COUNT(*) as count").
		Group("model").Order("total DESC").Limit(5).Scan(&modelStats)

	c.JSON(http.StatusOK, gin.H{
		"balance":        credits.Balance,
		"total_recharged": credits.TotalRecharged,
		"total_consumed": credits.TotalConsumed,
		"today_consumed": todayConsumed,
		"conversations":  convCount,
		"messages":       msgCount,
		"generations":    genCount,
		"model_stats":    modelStats,
	})
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		Nickname string `json:"nickname"`
		Avatar   string `json:"avatar"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Nickname != "" {
		// Moderation: check nickname
		if h.Moderation != nil {
			result := h.Moderation.CheckText(req.Nickname)
			if result.RiskLevel == "block" {
				h.Moderation.LogModeration(userID, "text", "profile", req.Nickname, "", 0, result.HitWords, "", "block")
				c.JSON(http.StatusBadRequest, gin.H{"error": "昵称包含违规内容，请修改"})
				return
			}
		}
		updates["nickname"] = req.Nickname
	}
	if req.Avatar != "" {
		updates["avatar"] = req.Avatar
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	h.DB.Model(&model.User{}).Where("id = ?", userID).Updates(updates)

	var user model.User
	h.DB.First(&user, userID)
	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user model.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "旧密码不正确"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	h.DB.Model(&user).Update("password_hash", string(hash))
	c.JSON(http.StatusOK, gin.H{"message": "密码修改成功"})
}
