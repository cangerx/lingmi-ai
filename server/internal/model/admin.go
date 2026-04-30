package model

import "time"

type AdminUser struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	Username     string     `gorm:"size:50;uniqueIndex" json:"username"`
	PasswordHash string     `gorm:"size:255" json:"-"`
	RoleID       uint       `json:"role_id"`
	Role         *Role      `gorm:"foreignKey:RoleID" json:"role,omitempty"`
	Status       string     `gorm:"size:20;default:active" json:"status"`
	LastLoginAt  *time.Time `json:"last_login_at"`
	LastLoginIP  string     `gorm:"size:50" json:"last_login_ip"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type Role struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Name        string `gorm:"size:50;uniqueIndex" json:"name"`
	Description string `gorm:"size:200" json:"description"`
	Permissions JSON   `gorm:"type:jsonb" json:"permissions"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type AdminLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	AdminID   uint      `gorm:"index" json:"admin_id"`
	Action    string    `gorm:"size:50" json:"action"`
	Detail    string    `gorm:"type:text" json:"detail"`
	IP        string    `gorm:"size:50" json:"ip"`
	CreatedAt time.Time `json:"created_at"`
}

type Notification struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Title     string    `gorm:"size:200" json:"title"`
	Content   string    `gorm:"type:text" json:"content"`
	Type      string    `gorm:"size:20" json:"type"` // system, activity, maintenance
	Target    string    `gorm:"size:20" json:"target"` // all, vip, free
	Status    string    `gorm:"size:20;default:draft" json:"status"` // draft, published
	ShowPopup bool      `gorm:"default:false" json:"show_popup"`
	StartAt   *time.Time `json:"start_at"`
	EndAt     *time.Time `json:"end_at"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}
