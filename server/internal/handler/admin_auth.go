package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/middleware"
	"github.com/lingmiai/server/internal/model"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AdminAuthHandler struct {
	DB  *gorm.DB
	Cfg *config.Config
}

// Login handles admin login using AdminUser table
func (h *AdminAuthHandler) Login(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var admin model.AdminUser
	if err := h.DB.Preload("Role").Where("username = ?", req.Username).First(&admin).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid username or password"})
		return
	}

	if admin.Status != "active" {
		c.JSON(http.StatusForbidden, gin.H{"error": "account has been disabled"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid username or password"})
		return
	}

	// Update last login
	now := time.Now()
	h.DB.Model(&admin).Updates(map[string]interface{}{
		"last_login_at": now,
		"last_login_ip": c.ClientIP(),
	})

	// Generate token with admin role
	token, err := middleware.GenerateToken(admin.ID, "admin", h.Cfg.JWT.Secret, h.Cfg.JWT.ExpireHour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	// Log admin action
	h.DB.Create(&model.AdminLog{
		AdminID: admin.ID,
		Action:  "login",
		Detail:  "admin login",
		IP:      c.ClientIP(),
	})

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"admin": admin,
	})
}

// GetProfile returns the current admin user's profile
func (h *AdminAuthHandler) GetProfile(c *gin.Context) {
	adminID := c.GetUint("user_id")

	var admin model.AdminUser
	if err := h.DB.Preload("Role").First(&admin, adminID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "admin not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"admin": admin})
}

// ChangePassword changes the current admin user's password
func (h *AdminAuthHandler) ChangePassword(c *gin.Context) {
	adminID := c.GetUint("user_id")

	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var admin model.AdminUser
	if err := h.DB.First(&admin, adminID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "admin not found"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.OldPassword)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "old password is incorrect"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	h.DB.Model(&admin).Update("password_hash", string(hash))

	h.DB.Create(&model.AdminLog{
		AdminID: adminID,
		Action:  "change_password",
		Detail:  "admin changed password",
		IP:      c.ClientIP(),
	})

	c.JSON(http.StatusOK, gin.H{"message": "password changed"})
}
