package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type ReferralHandler struct {
	DB *gorm.DB
}

// Stats returns the current user's referral statistics
func (h *ReferralHandler) Stats(c *gin.Context) {
	userID := c.GetUint("user_id")

	// Invite code
	var user model.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Invited count
	var invitedCount int64
	h.DB.Model(&model.User{}).Where("invited_by = ?", userID).Count(&invitedCount)

	// Commission totals
	var totalCommission float64
	h.DB.Model(&model.Commission{}).Where("user_id = ?", userID).
		Select("COALESCE(SUM(amount), 0)").Scan(&totalCommission)

	var pendingCommission float64
	h.DB.Model(&model.Commission{}).Where("user_id = ? AND status = ?", userID, "pending").
		Select("COALESCE(SUM(amount), 0)").Scan(&pendingCommission)

	var settledCommission float64
	h.DB.Model(&model.Commission{}).Where("user_id = ? AND status = ?", userID, "settled").
		Select("COALESCE(SUM(amount), 0)").Scan(&settledCommission)

	c.JSON(http.StatusOK, gin.H{
		"invite_code":          user.InviteCode,
		"invited_count":        invitedCount,
		"total_commission":     totalCommission,
		"pending_commission":   pendingCommission,
		"settled_commission":   settledCommission,
	})
}

// Commissions returns the list of commissions earned
func (h *ReferralHandler) Commissions(c *gin.Context) {
	userID := c.GetUint("user_id")

	var commissions []struct {
		model.Commission
		InviteeNickname string `json:"invitee_nickname"`
	}
	h.DB.Table("commissions").
		Select("commissions.*, users.nickname as invitee_nickname").
		Joins("LEFT JOIN users ON users.id = commissions.invitee_id").
		Where("commissions.user_id = ?", userID).
		Order("commissions.created_at DESC").
		Limit(100).
		Find(&commissions)

	c.JSON(http.StatusOK, gin.H{"data": commissions})
}

// Invitees returns the list of users invited by the current user
func (h *ReferralHandler) Invitees(c *gin.Context) {
	userID := c.GetUint("user_id")

	type InviteeItem struct {
		ID        uint   `json:"id"`
		Nickname  string `json:"nickname"`
		Avatar    string `json:"avatar"`
		CreatedAt string `json:"created_at"`
	}

	var invitees []InviteeItem
	h.DB.Model(&model.User{}).
		Select("id, nickname, avatar, created_at").
		Where("invited_by = ?", userID).
		Order("created_at DESC").
		Limit(100).
		Find(&invitees)

	c.JSON(http.StatusOK, gin.H{"data": invitees})
}
