package model

import "time"

// Commission records referral commissions from invitee payments
type Commission struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"index" json:"user_id"`       // the referrer (earner)
	InviteeID   uint      `gorm:"index" json:"invitee_id"`    // the invitee (payer)
	OrderID     uint      `gorm:"index" json:"order_id"`      // source order
	OrderNo     string    `gorm:"size:50" json:"order_no"`
	OrderAmount float64   `json:"order_amount"`                // the original order amount
	Rate        float64   `gorm:"default:0.1" json:"rate"`    // commission rate, e.g. 0.1 = 10%
	Amount      float64   `json:"amount"`                      // commission amount
	Status      string    `gorm:"size:20;default:pending" json:"status"` // pending, settled, cancelled
	SettledAt   *time.Time `json:"settled_at"`
	CreatedAt   time.Time `json:"created_at"`
}
