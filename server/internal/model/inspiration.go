package model

import "time"

type Inspiration struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	UserID       uint      `gorm:"index" json:"user_id"`
	GenerationID uint      `gorm:"index" json:"generation_id"`
	Title        string    `gorm:"size:200" json:"title"`
	Description  string    `gorm:"size:1000" json:"description"`
	ImageURL     string    `gorm:"size:500" json:"image_url"`
	Tag          string    `gorm:"size:50;index" json:"tag"`
	Author       string    `gorm:"size:100" json:"author"`
	AuthorAvatar string   `gorm:"size:500" json:"author_avatar"`
	Likes       int       `gorm:"default:0" json:"likes"`
	Views       int       `gorm:"default:0" json:"views"`
	Prompt      string    `gorm:"type:text" json:"prompt"`
	ModelUsed   string    `gorm:"size:100" json:"model_used"`
	Width       int       `gorm:"default:0" json:"width"`
	Height      int       `gorm:"default:0" json:"height"`
	Featured    bool      `gorm:"default:false;index" json:"featured"`
	Sort        int       `gorm:"default:0" json:"sort"`
	Status      string    `gorm:"size:20;default:pending;index" json:"status"` // pending, approved, rejected, disabled
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
