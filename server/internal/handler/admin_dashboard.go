package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type AdminDashboardHandler struct {
	DB *gorm.DB
}

// Stats returns overview statistics for the admin dashboard
func (h *AdminDashboardHandler) Stats(c *gin.Context) {
	today := time.Now().Truncate(24 * time.Hour)

	var totalUsers int64
	h.DB.Model(&model.User{}).Count(&totalUsers)

	var todayUsers int64
	h.DB.Model(&model.User{}).Where("created_at >= ?", today).Count(&todayUsers)

	var totalOrders int64
	var totalRevenue float64
	h.DB.Model(&model.Order{}).Where("status = ?", "paid").Count(&totalOrders)
	h.DB.Model(&model.Order{}).Where("status = ?", "paid").Select("COALESCE(SUM(paid_amount), 0)").Scan(&totalRevenue)

	var todayRevenue float64
	h.DB.Model(&model.Order{}).Where("status = ? AND paid_at >= ?", "paid", today).Select("COALESCE(SUM(paid_amount), 0)").Scan(&todayRevenue)

	var todayGenerations int64
	h.DB.Model(&model.Generation{}).Where("created_at >= ?", today).Count(&todayGenerations)

	var totalGenerations int64
	h.DB.Model(&model.Generation{}).Count(&totalGenerations)

	var activeUsers int64
	h.DB.Model(&model.User{}).Where("last_login_at >= ?", today).Count(&activeUsers)

	// Credits stats
	var totalCreditsConsumed float64
	h.DB.Model(&model.UserCredits{}).Select("COALESCE(SUM(total_consumed), 0)").Scan(&totalCreditsConsumed)

	var todayCreditsConsumed float64
	h.DB.Model(&model.CreditLog{}).Where("type = ? AND created_at >= ?", "consume", today).
		Select("COALESCE(SUM(ABS(amount)), 0)").Scan(&todayCreditsConsumed)

	// Conversation & message stats
	var totalConversations int64
	h.DB.Model(&model.Conversation{}).Count(&totalConversations)

	var todayConversations int64
	h.DB.Model(&model.Conversation{}).Where("created_at >= ?", today).Count(&todayConversations)

	var totalMessages int64
	h.DB.Model(&model.Message{}).Count(&totalMessages)

	var todayMessages int64
	h.DB.Model(&model.Message{}).Where("created_at >= ?", today).Count(&todayMessages)

	c.JSON(http.StatusOK, gin.H{
		"total_users":            totalUsers,
		"today_users":            todayUsers,
		"total_revenue":          totalRevenue,
		"today_revenue":          todayRevenue,
		"total_orders":           totalOrders,
		"today_generations":      todayGenerations,
		"total_generations":      totalGenerations,
		"active_users":           activeUsers,
		"total_credits_consumed": totalCreditsConsumed,
		"today_credits_consumed": todayCreditsConsumed,
		"total_conversations":    totalConversations,
		"today_conversations":    todayConversations,
		"total_messages":         totalMessages,
		"today_messages":         todayMessages,
	})
}

// Trends returns trend data for charts (last N days)
func (h *AdminDashboardHandler) Trends(c *gin.Context) {
	days := 7
	if c.Query("days") == "30" {
		days = 30
	}

	type DayStat struct {
		Date  string  `json:"date"`
		Count int64   `json:"count"`
		Sum   float64 `json:"sum"`
	}

	now := time.Now().Truncate(24 * time.Hour)
	startDate := now.AddDate(0, 0, -days+1)

	// User registrations per day
	var userTrends []DayStat
	h.DB.Model(&model.User{}).
		Where("created_at >= ?", startDate).
		Select("DATE(created_at) as date, COUNT(*) as count").
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&userTrends)

	// Revenue per day
	var revenueTrends []DayStat
	h.DB.Model(&model.Order{}).
		Where("status = ? AND paid_at >= ?", "paid", startDate).
		Select("DATE(paid_at) as date, COALESCE(SUM(paid_amount), 0) as sum").
		Group("DATE(paid_at)").
		Order("date ASC").
		Scan(&revenueTrends)

	// Generations per day
	var genTrends []DayStat
	h.DB.Model(&model.Generation{}).
		Where("created_at >= ?", startDate).
		Select("DATE(created_at) as date, COUNT(*) as count").
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&genTrends)

	c.JSON(http.StatusOK, gin.H{
		"users":       userTrends,
		"revenue":     revenueTrends,
		"generations": genTrends,
		"days":        days,
	})
}
