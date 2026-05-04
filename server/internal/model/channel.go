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
	ID              uint      `gorm:"primaryKey" json:"id"`
	Name            string    `gorm:"size:100;uniqueIndex" json:"name"` // e.g. gpt-4o, openai/gpt-4o
	DisplayName     string    `gorm:"size:100" json:"display_name"`
	Type            string    `gorm:"size:20" json:"type"` // chat, image, video, music, voice
	Icon            string    `gorm:"size:500" json:"icon"`
	Description     string    `gorm:"size:500" json:"description"`
	Provider        string    `gorm:"size:50" json:"provider"`                // openai, google, deepseek, etc.
	ContextLength   int       `gorm:"default:0" json:"context_length"`        // max context window
	MaxOutputTokens int       `gorm:"default:0" json:"max_output_tokens"`     // max output tokens
	InputModalities JSON      `gorm:"type:jsonb" json:"input_modalities"`     // ["text","image","file"]
	OutputModalities JSON     `gorm:"type:jsonb" json:"output_modalities"`    // ["text","image"]
	SupportedParams JSON      `gorm:"type:jsonb" json:"supported_params"`     // ["temperature","tools",...]
	PricingMode     string    `gorm:"size:20" json:"pricing_mode"` // per_token, per_call
	PriceInput      float64   `json:"price_input"`                 // credits per 1K input tokens
	PriceOutput     float64   `json:"price_output"`                // credits per 1K output tokens
	PricePerCall    float64   `json:"price_per_call"`              // credits per call
	Badge           string    `gorm:"size:20" json:"badge"`                  // PRO, New, ""
	Tags            JSON      `gorm:"type:jsonb" json:"tags"`                 // ["上新","推荐","仅图片","可编辑"]
	VipOnly         bool      `gorm:"default:false" json:"vip_only"`          // require VIP membership
	Versions        JSON      `gorm:"type:jsonb" json:"versions"`              // [{"name":"2.0","model":"gpt-image-2"},{"name":"1.0","model":"gpt-image-1","tag":"旧版"}]
	Sort            int       `gorm:"default:0" json:"sort"`
	Status          string    `gorm:"size:20;default:active" json:"status"` // active, inactive
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// ModelConfig stores per-model parameter configuration (one row per param_key per model).
// param_key values: resolutions, ratios, qualities, max_count, formats, backgrounds
type ModelConfig struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	ModelName   string    `gorm:"size:100;uniqueIndex:idx_model_param" json:"model_name"`
	ParamKey    string    `gorm:"size:50;uniqueIndex:idx_model_param" json:"param_key"`
	ParamValues JSON      `gorm:"type:jsonb" json:"param_values"` // ["1K","2K","4K"]
	DefaultVal  string    `gorm:"size:100" json:"default_value"`
	SortOrder   int       `gorm:"default:0" json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
