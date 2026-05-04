package handler

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/middleware"
	"github.com/lingmiai/server/internal/model"
	"github.com/lingmiai/server/internal/service"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// getReferralSetting reads a single referral setting from DB
func getReferralSetting(db *gorm.DB, key string) string {
	var setting model.SystemSetting
	if err := db.Where("setting_group = ? AND setting_key = ?", "referral", key).First(&setting).Error; err != nil {
		return ""
	}
	return setting.Value
}

type AuthHandler struct {
	DB  *gorm.DB
	Cfg *config.Config
	SMS *service.SMSService
}

type RegisterRequest struct {
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required,min=6"`
	Nickname   string `json:"nickname" binding:"required,min=2"`
	InviteCode string `json:"invite_code"`
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

	// Generate a placeholder phone to avoid unique index conflict on empty values
	phonePlaceholder := "u_" + inviteCode

	// Resolve referrer
	var invitedBy *uint
	if req.InviteCode != "" {
		var referrer model.User
		if err := h.DB.Where("invite_code = ?", req.InviteCode).First(&referrer).Error; err == nil {
			invitedBy = &referrer.ID
		}
	}

	user := model.User{
		Email:        req.Email,
		Phone:        phonePlaceholder,
		PasswordHash: string(hash),
		Nickname:     req.Nickname,
		InviteCode:   inviteCode,
		InvitedBy:    invitedBy,
		Role:         "user",
		Status:       "active",
	}

	if err := h.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	// Create credits account with initial bonus
	initialBalance := float64(100)
	credits := model.UserCredits{
		UserID:  user.ID,
		Balance: initialBalance,
	}
	h.DB.Create(&credits)
	h.DB.Create(&model.CreditLog{
		UserID:  user.ID,
		Type:    "gift",
		Amount:  initialBalance,
		Balance: initialBalance,
		Detail:  "registration bonus",
	})

	// Referral bonus: both get credits (read amount from DB settings)
	if invitedBy != nil {
		bonusStr := getReferralSetting(h.DB, "registration_bonus")
		referralBonus := float64(200) // default
		if v, err := strconv.ParseFloat(bonusStr, 64); err == nil && v > 0 {
			referralBonus = v
		}
		// Bonus for new user
		h.DB.Model(&model.UserCredits{}).Where("user_id = ?", user.ID).Update("balance", gorm.Expr("balance + ?", referralBonus))
		h.DB.Create(&model.CreditLog{UserID: user.ID, Type: "invite", Amount: referralBonus, Balance: initialBalance + referralBonus, Detail: "邀请注册奖励"})

		// Bonus for referrer
		h.DB.Model(&model.UserCredits{}).Where("user_id = ?", *invitedBy).Update("balance", gorm.Expr("balance + ?", referralBonus))
		var refCredits model.UserCredits
		h.DB.Where("user_id = ?", *invitedBy).First(&refCredits)
		h.DB.Create(&model.CreditLog{UserID: *invitedBy, Type: "invite", Amount: referralBonus, Balance: refCredits.Balance, Detail: fmt.Sprintf("邀请用户 %s 注册奖励", req.Nickname)})
	}

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

// ── Phone SMS Login ─────────────────────────────

type SendCodeRequest struct {
	Phone string `json:"phone" binding:"required"`
}

func (h *AuthHandler) SendCode(c *gin.Context) {
	var req SendCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "手机号不能为空"})
		return
	}

	if err := h.SMS.SendCode(req.Phone); err != nil {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "验证码已发送"})
}

type PhoneLoginRequest struct {
	Phone      string `json:"phone" binding:"required"`
	Code       string `json:"code" binding:"required"`
	InviteCode string `json:"invite_code"`
}

func (h *AuthHandler) PhoneLogin(c *gin.Context) {
	var req PhoneLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !h.SMS.VerifyCode(req.Phone, req.Code) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "验证码错误或已过期"})
		return
	}

	// Find or create user by phone
	var user model.User
	err := h.DB.Where("phone = ?", req.Phone).First(&user).Error
	if err != nil {
		// Resolve referrer
		var invitedBy *uint
		if req.InviteCode != "" {
			var referrer model.User
			if err := h.DB.Where("invite_code = ?", req.InviteCode).First(&referrer).Error; err == nil {
				invitedBy = &referrer.ID
			}
		}

		// Auto register
		inviteCode := generateInviteCode()
		emailPlaceholder := fmt.Sprintf("phone_%s@local", req.Phone)
		user = model.User{
			Phone:      req.Phone,
			Email:      emailPlaceholder,
			Nickname:   "用户" + req.Phone[len(req.Phone)-4:],
			InviteCode: inviteCode,
			InvitedBy:  invitedBy,
			Role:       "user",
			Status:     "active",
		}
		if err := h.DB.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建用户失败"})
			return
		}
		// Credits bonus
		initialBalance := float64(100)
		h.DB.Create(&model.UserCredits{UserID: user.ID, Balance: initialBalance})
		h.DB.Create(&model.CreditLog{UserID: user.ID, Type: "gift", Amount: initialBalance, Balance: initialBalance, Detail: "registration bonus"})

		// Referral bonus
		if invitedBy != nil {
			bonusStr := getReferralSetting(h.DB, "registration_bonus")
			referralBonus := float64(200)
			if v, err := strconv.ParseFloat(bonusStr, 64); err == nil && v > 0 {
				referralBonus = v
			}
			h.DB.Model(&model.UserCredits{}).Where("user_id = ?", user.ID).Update("balance", gorm.Expr("balance + ?", referralBonus))
			h.DB.Create(&model.CreditLog{UserID: user.ID, Type: "invite", Amount: referralBonus, Balance: initialBalance + referralBonus, Detail: "邀请注册奖励"})
			h.DB.Model(&model.UserCredits{}).Where("user_id = ?", *invitedBy).Update("balance", gorm.Expr("balance + ?", referralBonus))
			var refCredits model.UserCredits
			h.DB.Where("user_id = ?", *invitedBy).First(&refCredits)
			h.DB.Create(&model.CreditLog{UserID: *invitedBy, Type: "invite", Amount: referralBonus, Balance: refCredits.Balance, Detail: fmt.Sprintf("邀请用户 %s 注册奖励", user.Nickname)})
		}
	}

	if user.Status == "banned" {
		c.JSON(http.StatusForbidden, gin.H{"error": "账号已被封禁"})
		return
	}

	now := time.Now()
	h.DB.Model(&user).Updates(map[string]interface{}{"last_login_at": now, "last_login_ip": c.ClientIP()})

	token, err := middleware.GenerateToken(user.ID, user.Role, h.Cfg.JWT.Secret, h.Cfg.JWT.ExpireHour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{Token: token, User: user})
}

// ── OAuth Login ─────────────────────────────────

type OAuthLoginRequest struct {
	Provider string `json:"provider" binding:"required"` // wechat, weibo, qq
	Code     string `json:"code" binding:"required"`
}

func (h *AuthHandler) OAuthLogin(c *gin.Context) {
	var req OAuthLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	oauthSvc := service.NewOAuthService(h.DB)
	user, err := oauthSvc.HandleCallback(req.Provider, req.Code, h.Cfg)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if user.Status == "banned" {
		c.JSON(http.StatusForbidden, gin.H{"error": "账号已被封禁"})
		return
	}

	now := time.Now()
	h.DB.Model(user).Updates(map[string]interface{}{"last_login_at": now, "last_login_ip": c.ClientIP()})

	token, err := middleware.GenerateToken(user.ID, user.Role, h.Cfg.JWT.Secret, h.Cfg.JWT.ExpireHour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{Token: token, User: *user})
}

func generateInviteCode() string {
	b := make([]byte, 4)
	rand.Read(b)
	return hex.EncodeToString(b)
}
