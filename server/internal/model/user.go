package model

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Phone        string         `gorm:"size:20;uniqueIndex" json:"phone"`
	Email        string         `gorm:"size:100;uniqueIndex" json:"email"`
	PasswordHash string         `gorm:"size:255" json:"-"`
	Nickname     string         `gorm:"size:50" json:"nickname"`
	Avatar       string         `gorm:"size:500" json:"avatar"`
	Role         string         `gorm:"size:20;default:user" json:"role"` // user, admin
	Status       string         `gorm:"size:20;default:active" json:"status"` // active, banned
	VIPLevel     int            `gorm:"default:0" json:"vip_level"`
	VIPExpiresAt *time.Time     `json:"vip_expires_at"`
	InviteCode   string         `gorm:"size:20;uniqueIndex" json:"invite_code"`
	InvitedBy    *uint          `json:"invited_by"`
	LastLoginAt  *time.Time     `json:"last_login_at"`
	LastLoginIP  string         `gorm:"size:50" json:"last_login_ip"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type UserCredits struct {
	ID             uint    `gorm:"primaryKey" json:"id"`
	UserID         uint    `gorm:"uniqueIndex" json:"user_id"`
	Balance        float64 `gorm:"default:0" json:"balance"`
	TotalRecharged float64 `gorm:"default:0" json:"total_recharged"`
	TotalConsumed  float64 `gorm:"default:0" json:"total_consumed"`
}

// UserOAuthBinding stores third-party OAuth bindings (one user can have multiple)
type UserOAuthBinding struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	Provider  string    `gorm:"size:20;index" json:"provider"` // wechat, weibo, qq
	OpenID    string    `gorm:"size:200" json:"open_id"`
	UnionID   string    `gorm:"size:200" json:"union_id"`
	Nickname  string    `gorm:"size:100" json:"nickname"`
	Avatar    string    `gorm:"size:500" json:"avatar"`
	CreatedAt time.Time `json:"created_at"`
}

type CreditLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	Type      string    `gorm:"size:20" json:"type"` // recharge, consume, gift, invite, sign_in
	Amount    float64   `json:"amount"`
	Balance   float64   `json:"balance"` // balance after this transaction
	Model     string    `gorm:"size:50" json:"model"`
	Detail    string    `gorm:"size:500" json:"detail"`
	CreatedAt time.Time `json:"created_at"`
}
