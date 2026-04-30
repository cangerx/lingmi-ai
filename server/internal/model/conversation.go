package model

import (
	"time"

	"gorm.io/gorm"
)

type Conversation struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	UserID       uint           `gorm:"index" json:"user_id"`
	Title        string         `gorm:"size:200" json:"title"`
	Model        string         `gorm:"size:50" json:"model"`
	MessageCount int            `gorm:"default:0" json:"message_count"`
	Pinned       bool           `gorm:"default:false" json:"pinned"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type Message struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	ConversationID uint      `gorm:"index" json:"conversation_id"`
	Role           string    `gorm:"size:20" json:"role"` // user, assistant, system
	Content        string    `gorm:"type:text" json:"content"`
	Model          string    `gorm:"size:50" json:"model"`
	TokensUsed     int       `json:"tokens_used"`
	Attachments    JSON      `gorm:"type:jsonb" json:"attachments"`
	CreatedAt      time.Time `json:"created_at"`
}
