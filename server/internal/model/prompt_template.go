package model

import "time"

// PromptTemplate stores curated prompt templates for quick-start generation.
type PromptTemplate struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Category  string    `gorm:"size:50;index" json:"category"` // 商品图|人像|风景|创意|建筑|插画
	Title     string    `gorm:"size:100" json:"title"`
	Prompt    string    `gorm:"type:text" json:"prompt"`
	Tags      string    `gorm:"size:200" json:"tags"` // comma-separated
	ImageURL  string    `gorm:"size:1000" json:"image_url"`
	Sort      int       `gorm:"default:0" json:"sort"`
	Status    string    `gorm:"size:20;default:active;index" json:"status"`
	CreatedAt time.Time `json:"created_at"`
}
