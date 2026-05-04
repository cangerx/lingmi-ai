package model

import "time"

// SensitiveWord stores banned/sensitive words for content filtering
type SensitiveWord struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Word      string    `gorm:"size:200;uniqueIndex" json:"word"`
	Category  string    `gorm:"size:50" json:"category"`            // porn, politics, violence, ad, custom
	Level     string    `gorm:"size:20;default:block" json:"level"` // block(直接拦截), review(送审)
	Status    string    `gorm:"size:20;default:active" json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// ModerationLog records each content moderation event
type ModerationLog struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	UserID       uint       `gorm:"index" json:"user_id"`
	ContentType  string     `gorm:"size:20" json:"content_type"` // text, image
	Source       string     `gorm:"size:30" json:"source"`       // chat, image_gen, profile, prompt
	OriginalText string     `gorm:"type:text" json:"original_text"`
	ImageURL     string     `gorm:"size:1000" json:"image_url"`
	RefID        uint       `json:"ref_id"`                               // Generation.ID / Message.ID
	HitWords     JSON       `gorm:"type:jsonb" json:"hit_words"`          // matched sensitive words
	AIResult     string     `gorm:"type:text" json:"ai_result"`           // LLM review response
	RiskLevel    string     `gorm:"size:20" json:"risk_level"`            // safe, suspect, block
	Status       string     `gorm:"size:20;default:pending" json:"status"` // pending, approved, rejected
	ReviewedBy   uint       `json:"reviewed_by"`
	ReviewedAt   *time.Time `json:"reviewed_at"`
	CreatedAt    time.Time  `json:"created_at"`
}
