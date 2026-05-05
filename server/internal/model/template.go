package model

import "time"

// Template represents a design template in the template center.
type Template struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"size:200" json:"title"`
	Description string    `gorm:"size:500" json:"description"`
	ImageURL    string    `gorm:"size:1000" json:"image_url"`
	Category    string    `gorm:"size:50;index" json:"category"`  // 常规模板, 同款复刻
	Scene       string    `gorm:"size:50;index" json:"scene"`     // 电商, 社交媒体, 微信营销, 公众号, etc.
	Usage       string    `gorm:"size:50;index" json:"usage"`     // 营销带货, 交流分享, 祝福问候, etc.
	Industry    string    `gorm:"size:50;index" json:"industry"`  // 通用, 餐饮美食, 鞋服箱包, etc.
	Tags        string    `gorm:"size:500" json:"tags"`           // comma-separated
	Prompt      string    `gorm:"type:text" json:"prompt"`        // AI generation prompt
	PromptEn    string    `gorm:"type:text" json:"prompt_en"`     // English prompt
	ModelUsed   string    `gorm:"size:100" json:"model_used"`     // e.g. flux-pro, midjourney
	Style       string    `gorm:"size:50" json:"style"`           // 简约, 国潮, 卡通, 商务, etc.
	Color       string    `gorm:"size:50" json:"color"`           // 红色, 蓝色, 绿色, etc.
	Layout      string    `gorm:"size:50" json:"layout"`          // 竖版, 横版, 方形
	Width       int       `json:"width"`
	Height      int       `json:"height"`
	Downloads   int       `gorm:"default:0" json:"downloads"`
	Views       int       `gorm:"default:0" json:"views"`
	Featured    bool      `gorm:"default:false;index" json:"featured"`
	Sort        int       `gorm:"default:0" json:"sort"`
	Status      string    `gorm:"size:20;default:active;index" json:"status"` // active, disabled
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
