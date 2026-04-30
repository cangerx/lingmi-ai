package handler

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/middleware"
	"github.com/lingmiai/server/internal/model"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	DB  *gorm.DB
	Cfg *config.Config
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Nickname string `json:"nickname" binding:"required,min=2"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token string     `json:"token"`
	User  model.User `json:"user"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if email exists
	var count int64
	h.DB.Model(&model.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	// Generate invite code
	inviteCode := generateInviteCode()

	user := model.User{
		Email:        req.Email,
		PasswordHash: string(hash),
		Nickname:     req.Nickname,
		InviteCode:   inviteCode,
		Role:         "user",
		Status:       "active",
	}

	if err := h.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	// Create credits account with initial bonus
	credits := model.UserCredits{
		UserID:  user.ID,
		Balance: 100, // registration bonus
	}
	h.DB.Create(&credits)

	// Log the bonus
	h.DB.Create(&model.CreditLog{
		UserID:  user.ID,
		Type:    "gift",
		Amount:  100,
		Balance: 100,
		Detail:  "registration bonus",
	})

	// Generate token
	token, err := middleware.GenerateToken(user.ID, user.Role, h.Cfg.JWT.Secret, h.Cfg.JWT.ExpireHour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, AuthResponse{Token: token, User: user})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user model.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	if user.Status == "banned" {
		c.JSON(http.StatusForbidden, gin.H{"error": "account has been banned"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	// Update last login
	now := time.Now()
	h.DB.Model(&user).Updates(map[string]interface{}{
		"last_login_at": now,
		"last_login_ip": c.ClientIP(),
	})

	token, err := middleware.GenerateToken(user.ID, user.Role, h.Cfg.JWT.Secret, h.Cfg.JWT.ExpireHour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{Token: token, User: user})
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID := c.GetUint("user_id")

	var user model.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var credits model.UserCredits
	h.DB.Where("user_id = ?", userID).First(&credits)

	c.JSON(http.StatusOK, gin.H{
		"user":    user,
		"credits": credits,
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	userID := c.GetUint("user_id")
	role, _ := c.Get("user_role")

	token, err := middleware.GenerateToken(userID, role.(string), h.Cfg.JWT.Secret, h.Cfg.JWT.ExpireHour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

func generateInviteCode() string {
	b := make([]byte, 4)
	rand.Read(b)
	return hex.EncodeToString(b)
}
