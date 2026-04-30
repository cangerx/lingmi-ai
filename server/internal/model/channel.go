package model

import (
	"time"

	"gorm.io/gorm"
)

type Channel struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:100" json:"name"`
	Type      string         `gorm:"size:30" json:"type"` // official, proxy, self_hosted
	APIKey    string         `gorm:"size:500" json:"-"`
	BaseURL   string         `gorm:"size:500" json:"base_url"`
	Models    JSON           `gorm:"type:jsonb" json:"models"` // supported model names
	Priority  int            `gorm:"default:0" json:"priority"`
	Weight    int            `gorm:"default:1" json:"weight"`
	Status    string         `gorm:"size:20;default:enabled" json:"status"` // enabled, disabled, error
	RPMLimit  int            `gorm:"default:0" json:"rpm_limit"`
	TPMLimit  int            `gorm:"default:0" json:"tpm_limit"`
	Timeout   int            `gorm:"default:60" json:"timeout"` // seconds
	Remark    string         `gorm:"size:500" json:"remark"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Model struct {
	ID           uint   `gorm:"primaryKey" json:"id"`
	Name         string `gorm:"size:100;uniqueIndex" json:"name"` // e.g. gpt-4o
	DisplayName  string `gorm:"size:100" json:"display_name"`
	Type         string `gorm:"size:20" json:"type"` // chat, image, video, music, voice
	Icon         string `gorm:"size:500" json:"icon"`
	Description  string `gorm:"size:500" json:"description"`
	PricingMode  string `gorm:"size:20" json:"pricing_mode"` // per_token, per_call
	PriceInput   float64 `json:"price_input"`   // credits per 1K input tokens
	PriceOutput  float64 `json:"price_output"`  // credits per 1K output tokens
	PricePerCall float64 `json:"price_per_call"` // credits per call
	Sort         int    `gorm:"default:0" json:"sort"`
	Status       string `gorm:"size:20;default:active" json:"status"` // active, inactive
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
