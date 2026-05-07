package service

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

func getReferralSettingFromDB(db *gorm.DB, key string) string {
	var s model.SystemSetting
	if err := db.Where("setting_group = ? AND setting_key = ?", "referral", key).First(&s).Error; err != nil {
		return ""
	}
	return s.Value
}

// PayResult holds the result of creating a payment
type PayResult struct {
	PayURL    string `json:"pay_url"`    // QR code URL for scanning
	PrepayID  string `json:"prepay_id"`  // upstream prepay ID
	ExpireAt  string `json:"expire_at"`  // payment expiration time
}

// PaymentProvider abstracts a payment channel (wechat, alipay, mock)
type PaymentProvider interface {
	// CreatePayment creates an upstream payment order, returns QR URL
	CreatePayment(order *model.Order) (*PayResult, error)
	// QueryPayment queries upstream payment status, returns true if paid
	QueryPayment(orderNo string) (bool, error)
	// HandleNotify parses the raw callback body, returns orderNo and whether it's paid
	HandleNotify(body []byte) (orderNo string, paid bool, err error)
	// Name returns provider name
	Name() string
}

// PaymentService orchestrates payment flow
type PaymentService struct {
	DB        *gorm.DB
	Providers map[string]PaymentProvider // keyed by "wechat", "alipay"
}

// NewPaymentService creates the service based on config
func NewPaymentService(db *gorm.DB, cfg *config.Config) *PaymentService {
	providers := make(map[string]PaymentProvider)

	if cfg.Payment.Mock {
		mock := &MockPaymentProvider{}
		providers["wechat"] = mock
		providers["alipay"] = mock
		log.Println("[Payment] Running in MOCK mode")
	} else if cfg.Payment.Tianque.OrgID != "" {
		// Tianque aggregated payment handles both wechat and alipay
		tq, err := NewTianquePaymentProvider(cfg.Payment.Tianque)
		if err != nil {
			log.Printf("[Payment] WARNING: Tianque init failed: %v", err)
		} else {
			providers["wechat"] = tq
			providers["alipay"] = tq
			providers["tianque"] = tq
			log.Printf("[Payment] Tianque provider enabled (orgId=%s, mno=%s)", cfg.Payment.Tianque.OrgID, cfg.Payment.Tianque.Mno)
		}
	} else {
		if cfg.Payment.Wechat.MchID != "" {
			providers["wechat"] = &WechatPaymentProvider{Cfg: cfg.Payment.Wechat}
		}
		if cfg.Payment.Alipay.AppID != "" {
			providers["alipay"] = &AlipayPaymentProvider{Cfg: cfg.Payment.Alipay}
		}
	}

	return &PaymentService{DB: db, Providers: providers}
}

// GetProvider returns the provider for the payment method
func (s *PaymentService) GetProvider(method string) (PaymentProvider, error) {
	p, ok := s.Providers[method]
	if !ok {
		return nil, fmt.Errorf("unsupported payment method: %s", method)
	}
	return p, nil
}

// CompleteOrder marks an order as paid and adds credits to the user
func (s *PaymentService) CompleteOrder(orderNo string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		var order model.Order
		if err := tx.Where("order_no = ? AND status = ?", orderNo, "pending").First(&order).Error; err != nil {
			return fmt.Errorf("order not found or already processed: %w", err)
		}

		now := time.Now()
		order.Status = "paid"
		order.PaidAt = &now
		order.PaidAmount = order.Amount
		if err := tx.Save(&order).Error; err != nil {
			return fmt.Errorf("update order: %w", err)
		}

		// Add credits
		if order.Credits > 0 {
			if err := tx.Exec(
				"UPDATE user_credits SET balance = balance + ?, total_recharged = total_recharged + ? WHERE user_id = ?",
				order.Credits, order.Credits, order.UserID,
			).Error; err != nil {
				return fmt.Errorf("add credits: %w", err)
			}

			// Get current balance for log
			var uc model.UserCredits
			tx.Where("user_id = ?", order.UserID).First(&uc)

			creditLog := model.CreditLog{
				UserID:    order.UserID,
				Type:      "recharge",
				Amount:    order.Credits,
				Balance:   uc.Balance,
				Detail:    fmt.Sprintf("订单 %s 充值 %.0f 积分", order.OrderNo, order.Credits),
				CreatedAt: now,
			}
			if err := tx.Create(&creditLog).Error; err != nil {
				return fmt.Errorf("create credit log: %w", err)
			}
		}

		log.Printf("[Payment] Order %s completed, user %d +%.0f credits", orderNo, order.UserID, order.Credits)

		// Referral commission: read settings from DB
		commissionEnabled := getReferralSettingFromDB(s.DB, "commission_enabled")
		if commissionEnabled != "false" {
			var payer model.User
			if err := tx.First(&payer, order.UserID).Error; err == nil && payer.InvitedBy != nil {
				validDays := 365
				if v, err := strconv.Atoi(getReferralSettingFromDB(s.DB, "commission_valid_days")); err == nil && v > 0 {
					validDays = v
				}
				if time.Since(payer.CreatedAt) < time.Duration(validDays)*24*time.Hour {
					commissionRate := 0.10
					if v, err := strconv.ParseFloat(getReferralSettingFromDB(s.DB, "commission_rate"), 64); err == nil && v > 0 {
						commissionRate = v / 100.0
					}
					commissionAmount := order.PaidAmount * commissionRate
					if commissionAmount > 0 {
						commission := model.Commission{
							UserID:      *payer.InvitedBy,
							InviteeID:   order.UserID,
							OrderID:     order.ID,
							OrderNo:     order.OrderNo,
							OrderAmount: order.PaidAmount,
							Rate:        commissionRate,
							Amount:      commissionAmount,
							Status:      "pending",
							CreatedAt:   now,
						}
						tx.Create(&commission)
						log.Printf("[Commission] Order %s: %.2f -> user %d", orderNo, commissionAmount, *payer.InvitedBy)
					}
				}
			}
		}

		return nil
	})
}

// ---------- Mock Provider ----------

type MockPaymentProvider struct{}

func (m *MockPaymentProvider) Name() string { return "mock" }

func (m *MockPaymentProvider) CreatePayment(order *model.Order) (*PayResult, error) {
	// Generate a fake QR URL
	b := make([]byte, 16)
	rand.Read(b)
	token := hex.EncodeToString(b)

	return &PayResult{
		PayURL:   fmt.Sprintf("https://mock-pay.example.com/pay?order=%s&token=%s", order.OrderNo, token),
		PrepayID: "mock_" + token[:16],
		ExpireAt: time.Now().Add(30 * time.Minute).Format(time.RFC3339),
	}, nil
}

func (m *MockPaymentProvider) QueryPayment(orderNo string) (bool, error) {
	// In mock mode, always return paid
	return true, nil
}

func (m *MockPaymentProvider) HandleNotify(body []byte) (string, bool, error) {
	return "", false, fmt.Errorf("mock provider does not handle real notifications")
}

// ---------- Wechat Provider (skeleton) ----------

type WechatPaymentProvider struct {
	Cfg config.WechatConfig
}

func (w *WechatPaymentProvider) Name() string { return "wechat" }

func (w *WechatPaymentProvider) CreatePayment(order *model.Order) (*PayResult, error) {
	// TODO: Integrate with Wechat Pay V3 API
	// POST https://api.mch.weixin.qq.com/v3/pay/transactions/native
	return nil, fmt.Errorf("wechat pay not yet configured, set payment.mock=true for testing")
}

func (w *WechatPaymentProvider) QueryPayment(orderNo string) (bool, error) {
	// TODO: GET /v3/pay/transactions/out-trade-no/{out_trade_no}
	return false, fmt.Errorf("wechat pay query not implemented")
}

func (w *WechatPaymentProvider) HandleNotify(body []byte) (string, bool, error) {
	// TODO: Parse and verify wechat pay notification
	return "", false, fmt.Errorf("wechat pay notify not implemented")
}

// ---------- Alipay Provider (skeleton) ----------

type AlipayPaymentProvider struct {
	Cfg config.AlipayConfig
}

func (a *AlipayPaymentProvider) Name() string { return "alipay" }

func (a *AlipayPaymentProvider) CreatePayment(order *model.Order) (*PayResult, error) {
	// TODO: Integrate with Alipay SDK
	return nil, fmt.Errorf("alipay not yet configured, set payment.mock=true for testing")
}

func (a *AlipayPaymentProvider) QueryPayment(orderNo string) (bool, error) {
	// TODO: alipay.trade.query
	return false, fmt.Errorf("alipay query not implemented")
}

func (a *AlipayPaymentProvider) HandleNotify(body []byte) (string, bool, error) {
	// TODO: Parse and verify alipay notification
	return "", false, fmt.Errorf("alipay notify not implemented")
}
