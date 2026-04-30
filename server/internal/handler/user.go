package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type UserHandler struct {
	DB *gorm.DB
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

	c.JSON(http.StatusOK, logs)
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
