package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type AdminUserHandler struct {
	DB *gorm.DB
}

func (h *AdminUserHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	keyword := c.Query("keyword")

	var users []model.User
	var total int64

	query := h.DB.Model(&model.User{})
	if keyword != "" {
		query = query.Where("nickname LIKE ? OR email LIKE ? OR phone LIKE ?",
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	query.Count(&total)
	query.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&users)

	// Collect user IDs and batch-load credits
	userIDs := make([]uint, len(users))
	for i, u := range users {
		userIDs[i] = u.ID
	}
	var creditsList []model.UserCredits
	h.DB.Where("user_id IN ?", userIDs).Find(&creditsList)
	creditsMap := map[uint]model.UserCredits{}
	for _, cr := range creditsList {
		creditsMap[cr.UserID] = cr
	}

	type userRow struct {
		model.User
		Balance        float64 `json:"balance"`
		TotalRecharged float64 `json:"total_recharged"`
		TotalConsumed  float64 `json:"total_consumed"`
	}
	rows := make([]userRow, len(users))
	for i, u := range users {
		cr := creditsMap[u.ID]
		rows[i] = userRow{User: u, Balance: cr.Balance, TotalRecharged: cr.TotalRecharged, TotalConsumed: cr.TotalConsumed}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      rows,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *AdminUserHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var user model.User
	if err := h.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var credits model.UserCredits
	h.DB.Where("user_id = ?", user.ID).First(&credits)

	c.JSON(http.StatusOK, gin.H{"user": user, "credits": credits})
}

func (h *AdminUserHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := h.DB.Model(&model.User{}).Where("id = ?", id).Update("status", req.Status)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func (h *AdminUserHandler) AdjustCredits(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Amount float64 `json:"amount" binding:"required"`
		Remark string  `json:"remark"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var credits model.UserCredits
	if err := h.DB.Where("user_id = ?", id).First(&credits).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user credits not found"})
		return
	}

	h.DB.Model(&credits).Update("balance", gorm.Expr("balance + ?", req.Amount))

	userID, _ := strconv.ParseUint(id, 10, 64)
	h.DB.Create(&model.CreditLog{
		UserID:  uint(userID),
		Type:    "gift",
		Amount:  req.Amount,
		Balance: credits.Balance + req.Amount,
		Detail:  "admin adjust: " + req.Remark,
	})

	c.JSON(http.StatusOK, gin.H{"message": "credits adjusted"})
}

// GetCreditLogs returns credit logs for a specific user
func (h *AdminUserHandler) GetCreditLogs(c *gin.Context) {
	id := c.Param("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	var logs []model.CreditLog
	var total int64
	query := h.DB.Model(&model.CreditLog{}).Where("user_id = ?", id)
	query.Count(&total)
	query.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&logs)

	c.JSON(http.StatusOK, gin.H{"data": logs, "total": total})
}

// RechargePackage manually applies a package to a user (admin gift)
func (h *AdminUserHandler) RechargePackage(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		PackageID uint   `json:"package_id" binding:"required"`
		Remark    string `json:"remark"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := strconv.ParseUint(id, 10, 64)

	var pkg model.Package
	if err := h.DB.First(&pkg, req.PackageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "套餐不存在"})
		return
	}

	// Add credits
	var credits model.UserCredits
	if err := h.DB.Where("user_id = ?", userID).First(&credits).Error; err != nil {
		credits = model.UserCredits{UserID: uint(userID), Balance: 0}
		h.DB.Create(&credits)
	}
	h.DB.Model(&credits).Updates(map[string]interface{}{
		"balance":         gorm.Expr("balance + ?", pkg.Credits),
		"total_recharged": gorm.Expr("total_recharged + ?", pkg.Credits),
	})

	// Update VIP if package is subscription type
	if pkg.Type == "monthly" || pkg.Type == "quarterly" || pkg.Type == "yearly" {
		var duration time.Duration
		switch pkg.Type {
		case "monthly":
			duration = 30 * 24 * time.Hour
		case "quarterly":
			duration = 90 * 24 * time.Hour
		case "yearly":
			duration = 365 * 24 * time.Hour
		}
		expiresAt := time.Now().Add(duration)
		h.DB.Model(&model.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
			"vip_level":      1,
			"vip_expires_at": expiresAt,
		})
	}

	// Log
	h.DB.Create(&model.CreditLog{
		UserID:  uint(userID),
		Type:    "gift",
		Amount:  pkg.Credits,
		Balance: credits.Balance + pkg.Credits,
		Detail:  fmt.Sprintf("管理员充值套餐: %s (%s)", pkg.Name, req.Remark),
	})

	c.JSON(http.StatusOK, gin.H{"message": "充值成功", "credits_added": pkg.Credits, "package_name": pkg.Name})
}
