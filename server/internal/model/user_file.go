package model

import "time"

// UserFolder represents a one-level folder in the user's asset space.
type UserFolder struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	Name      string    `gorm:"size:100" json:"name"`
	Sort      int       `gorm:"default:0" json:"sort"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// UserFile represents a file uploaded to the user's asset space.
type UserFile struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	FolderID  *uint     `gorm:"index" json:"folder_id"` // nil = root
	Name      string    `gorm:"size:255" json:"name"`
	URL       string    `gorm:"size:1000" json:"url"`
	Path      string    `gorm:"size:1000" json:"-"` // storage path for deletion
	Size      int64     `json:"size"`               // bytes
	MimeType  string    `gorm:"size:50" json:"mime_type"`
	Width     int       `json:"width"`
	Height    int       `json:"height"`
	AssetType string    `gorm:"size:20;default:general;index" json:"asset_type"` // general|logo|brand_asset|reference
	CreatedAt time.Time `json:"created_at"`
}

// UserStorageQuota tracks per-user storage usage and limits.
type UserStorageQuota struct {
	ID        uint  `gorm:"primaryKey" json:"id"`
	UserID    uint  `gorm:"uniqueIndex" json:"user_id"`
	UsedBytes int64 `gorm:"default:0" json:"used_bytes"`
	MaxBytes  int64 `gorm:"default:104857600" json:"max_bytes"` // 100 MB
}
