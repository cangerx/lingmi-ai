package model

import "time"

type Generation struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"index" json:"user_id"`
	Type        string    `gorm:"size:20" json:"type"` // image, video, music
	Model       string    `gorm:"size:50" json:"model"`
	Prompt      string    `gorm:"type:text" json:"prompt"`
	Params      JSON      `gorm:"type:jsonb" json:"params"`
	ResultURL   string    `gorm:"size:1000" json:"result_url"`
	Status      string    `gorm:"size:20;default:pending" json:"status"` // pending, processing, completed, failed
	CreditsCost float64   `json:"credits_cost"`
	ErrorMsg    string    `gorm:"size:500" json:"error_msg"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
