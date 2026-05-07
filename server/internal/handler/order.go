package handler

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"github.com/lingmiai/server/internal/service"
	"gorm.io/gorm"
)

type OrderHandler struct {
	DB      *gorm.DB
	Payment *service.PaymentService
}

func (h *OrderHandler) Create(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		PackageID     uint   `json:"package_id"`
		Type          string `json:"type" binding:"required"`
		PaymentMethod string `json:"payment_method" binding:"required"`
		Amount        float64 `json:"amount"`
		Credits       float64 `json:"credits"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Type != "recharge" && req.Type != "subscribe" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be recharge or subscribe"})
		return
	}

	if req.PaymentMethod != "wechat" && req.PaymentMethod != "alipay" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment_method must be wechat or alipay"})
		return
	}

	amount := req.Amount
	credits := req.Credits

	// Validate amount for non-package orders
	if req.PackageID == 0 {
		if amount <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "金额必须大于0"})
			return
		}
		if credits <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "积分必须大于0"})
			return
		}
	}

	// If subscribing to a package, get package details
	if req.PackageID > 0 {
		var pkg model.Package
		if err := h.DB.First(&pkg, req.PackageID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "package not found"})
			return
		}
		if pkg.Status != "active" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "package is not available"})
			return
		}
		amount = pkg.Price
		credits = pkg.Credits
	}

	order := model.Order{
		OrderNo:       generateOrderNo(),
		UserID:        userID,
		Type:          req.Type,
		Amount:        amount,
		Credits:       credits,
		PaymentMethod: req.PaymentMethod,
		Status:        "pending",
	}

	if err := h.DB.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create order"})
		return
	}

	// Create upstream payment
	provider, err := h.Payment.GetProvider(req.PaymentMethod)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	payResult, err := provider.CreatePayment(&order)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建支付失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"order":    order,
			"pay_url":  payResult.PayURL,
			"expire_at": payResult.ExpireAt,
		},
	})
}

// PayStatus checks if the order has been paid (polling endpoint)
func (h *OrderHandler) PayStatus(c *gin.Context) {
	userID := c.GetUint("user_id")
	orderNo := c.Param("order_no")

	var order model.Order
	if err := h.DB.Where("order_no = ? AND user_id = ?", orderNo, userID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"order_no": order.OrderNo,
			"status":   order.Status,
			"paid_at":  order.PaidAt,
		},
	})
}

// MockPay simulates payment completion (only available when payment.mock=true)
func (h *OrderHandler) MockPay(c *gin.Context) {
	orderNo := c.Param("order_no")

	if err := h.Payment.CompleteOrder(orderNo); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "模拟支付成功", "order_no": orderNo})
}

func (h *OrderHandler) List(c *gin.Context) {
	userID := c.GetUint("user_id")

	var orders []model.Order
	h.DB.Where("user_id = ?", userID).Order("id DESC").Limit(50).Find(&orders)

	c.JSON(http.StatusOK, gin.H{"data": orders})
}

func (h *OrderHandler) Get(c *gin.Context) {
	userID := c.GetUint("user_id")
	id := c.Param("id")

	var order model.Order
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": order})
}

func generateOrderNo() string {
	b := make([]byte, 8)
	rand.Read(b)
	return fmt.Sprintf("LM%s%s", time.Now().Format("20060102150405"), hex.EncodeToString(b)[:8])
}
