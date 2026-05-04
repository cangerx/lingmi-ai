package model

import "time"

type Order struct {
	ID            uint       `gorm:"primaryKey" json:"id"`
	OrderNo       string     `gorm:"size:50;uniqueIndex" json:"order_no"`
	UserID        uint       `gorm:"index" json:"user_id"`
	Type          string     `gorm:"size:20" json:"type"` // recharge, subscribe
	Amount        float64    `json:"amount"`               // total amount in CNY
	PaidAmount    float64    `json:"paid_amount"`
	Credits       float64    `json:"credits"`               // credits to add
	PaymentMethod string     `gorm:"size:20" json:"payment_method"` // wechat, alipay
	Status        string     `gorm:"size:20;default:pending" json:"status"` // pending, paid, refunded, expired
	PaidAt        *time.Time `json:"paid_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type Package struct {
	ID              uint    `gorm:"primaryKey" json:"id"`
	Name            string  `gorm:"size:50" json:"name"`
	Type            string  `gorm:"size:20" json:"type"` // monthly, quarterly, yearly
	OriginalPrice   float64 `json:"original_price"`
	Price           float64 `json:"price"`
	Credits         float64 `json:"credits"`
	DailyFreeChat   int     `json:"daily_free_chat"`
	DailyFreeImage  int     `json:"daily_free_image"`
	Features        JSON    `gorm:"type:jsonb" json:"features"`
	Description     string  `gorm:"size:500" json:"description"`
	Sort            int     `gorm:"default:0" json:"sort"`
	Status          string  `gorm:"size:20;default:active" json:"status"` // active, inactive
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type RedeemCode struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	Code      string     `gorm:"size:50;uniqueIndex" json:"code"`
	Type      string     `gorm:"size:20;default:credits" json:"type"` // credits, package
	Credits   float64    `json:"credits"`
	PackageID *uint      `json:"package_id"`
	Prefix    string     `gorm:"size:10" json:"prefix"`
	Status    string     `gorm:"size:20;default:unused" json:"status"` // unused, used, expired, disabled
	MaxUses   int        `gorm:"default:1" json:"max_uses"`
	UsedCount int        `gorm:"default:0" json:"used_count"`
	ExpiresAt *time.Time `json:"expires_at"`
	Remark    string     `gorm:"size:200" json:"remark"`
	CreatedAt time.Time  `json:"created_at"`
}

type RedeemLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	CodeID     uint      `gorm:"index" json:"code_id"`
	UserID     uint      `gorm:"index" json:"user_id"`
	Credits    float64   `json:"credits"`
	IP         string    `gorm:"size:50" json:"ip"`
	RedeemedAt time.Time `json:"redeemed_at"`
}
