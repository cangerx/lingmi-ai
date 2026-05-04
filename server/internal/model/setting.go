package model

import "time"

type SystemSetting struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Group     string    `gorm:"column:setting_group;size:50;index:idx_group_key,unique" json:"group"` // payment, storage, site, etc.
	Key       string    `gorm:"column:setting_key;size:100;index:idx_group_key,unique" json:"key"`
	Value     string    `gorm:"column:setting_value;type:text" json:"value"`
	Label     string    `gorm:"size:200" json:"label"`
	Type      string    `gorm:"column:setting_type;size:20;default:text" json:"type"` // text, password, switch, select
	Remark    string    `gorm:"size:500" json:"remark"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
