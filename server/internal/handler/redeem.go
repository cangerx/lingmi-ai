package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type RedeemHandler struct {
	DB *gorm.DB
}

func (h *RedeemHandler) Redeem(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := h.DB.Begin()

	var code model.RedeemCode
	if err := tx.Where("code = ?", req.Code).First(&code).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "兑换码不存在"})
		return
	}

	if code.Status == "disabled" {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "兑换码已禁用"})
		return
	}
	if code.Status == "used" || (code.MaxUses > 0 && code.UsedCount >= code.MaxUses) {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "兑换码已使用完"})
		return
	}
	if code.ExpiresAt != nil && code.ExpiresAt.Before(time.Now()) {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "兑换码已过期"})
		return
	}

	// Check if user already redeemed this code
	var existCount int64
	tx.Model(&model.RedeemLog{}).Where("code_id = ? AND user_id = ?", code.ID, userID).Count(&existCount)
	if existCount > 0 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "您已使用过此兑换码"})
		return
	}

	// Update code usage
	newCount := code.UsedCount + 1
	codeUpdates := map[string]interface{}{"used_count": newCount}
	if newCount >= code.MaxUses {
		codeUpdates["status"] = "used"
	}
	tx.Model(&code).Updates(codeUpdates)

	// Add credits
	tx.Model(&model.UserCredits{}).Where("user_id = ?", userID).
		Update("balance", gorm.Expr("balance + ?", code.Credits))

	// If package type, also apply VIP subscription
	packageName := ""
	if code.Type == "package" && code.PackageID != nil {
		var pkg model.Package
		if tx.First(&pkg, *code.PackageID).Error == nil {
			packageName = pkg.Name
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
				tx.Model(&model.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
					"vip_level":      1,
					"vip_expires_at": expiresAt,
				})
			}
		}
	}

	// Get updated balance
	var credits model.UserCredits
	tx.Where("user_id = ?", userID).First(&credits)

	// Log
	detail := "兑换码: " + code.Code
	if packageName != "" {
		detail = "兑换码(套餐:" + packageName + "): " + code.Code
	}
	tx.Create(&model.CreditLog{
		UserID:  userID,
		Type:    "gift",
		Amount:  code.Credits,
		Balance: credits.Balance,
		Detail:  detail,
	})

	// Redeem log
	tx.Create(&model.RedeemLog{
		CodeID:     code.ID,
		UserID:     userID,
		Credits:    code.Credits,
		IP:         c.ClientIP(),
		RedeemedAt: time.Now(),
	})

	tx.Commit()

	resp := gin.H{
		"message": "兑换成功",
		"credits": code.Credits,
		"balance": credits.Balance,
	}
	if packageName != "" {
		resp["package_name"] = packageName
	}
	c.JSON(http.StatusOK, resp)
}
