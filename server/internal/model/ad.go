package model

import "time"

type Ad struct {
	ID                  uint       `gorm:"primaryKey" json:"id"`
	Name                string     `gorm:"size:100" json:"name"`
	Slot                string     `gorm:"size:30" json:"slot"` // banner, sidebar, popup, chat_card, create_bottom
	ImageURL            string     `gorm:"size:500" json:"image_url"`
	VideoURL            string     `gorm:"size:500" json:"video_url"`
	Title               string     `gorm:"size:100" json:"title"`
	Description         string     `gorm:"size:500" json:"description"`
	Link                string     `gorm:"size:500" json:"link"`
	LinkType            string     `gorm:"size:20" json:"link_type"` // internal, external
	TargetUsers         string     `gorm:"size:20;default:all" json:"target_users"` // all, free, vip
	StartAt             *time.Time `json:"start_at"`
	EndAt               *time.Time `json:"end_at"`
	DailyMaxImpressions int        `gorm:"default:0" json:"daily_max_impressions"` // 0 = unlimited
	Sort                int        `gorm:"default:0" json:"sort"`
	Status              string     `gorm:"size:20;default:enabled" json:"status"` // enabled, disabled
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

type AdSlot struct {
	ID         uint   `gorm:"primaryKey" json:"id"`
	Name       string `gorm:"size:50" json:"name"`
	Identifier string `gorm:"size:30;uniqueIndex" json:"identifier"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
	Enabled    bool   `gorm:"default:true" json:"enabled"`
	VIPFree    bool   `gorm:"default:true" json:"vip_free"`
}

type AdStat struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	AdID        uint      `gorm:"index" json:"ad_id"`
	Date        time.Time `gorm:"type:date;index" json:"date"`
	Impressions int       `gorm:"default:0" json:"impressions"`
	Clicks      int       `gorm:"default:0" json:"clicks"`
	Closes      int       `gorm:"default:0" json:"closes"`
}
