package handler

import (
	"io"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/service"
)

type PaymentNotifyHandler struct {
	Payment *service.PaymentService
}

// WechatNotify handles wechat pay callback
func (h *PaymentNotifyHandler) WechatNotify(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "FAIL", "message": "read body error"})
		return
	}

	provider, err := h.Payment.GetProvider("wechat")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "FAIL", "message": "no wechat provider"})
		return
	}

	orderNo, paid, err := provider.HandleNotify(body)
	if err != nil {
		log.Printf("[Payment] wechat notify error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"code": "FAIL", "message": err.Error()})
		return
	}

	if paid && orderNo != "" {
		if err := h.Payment.CompleteOrder(orderNo); err != nil {
			log.Printf("[Payment] complete order %s error: %v", orderNo, err)
		}
	}

	// Wechat expects {"code": "SUCCESS", "message": "OK"}
	c.JSON(http.StatusOK, gin.H{"code": "SUCCESS", "message": "OK"})
}

// AlipayNotify handles alipay callback
func (h *PaymentNotifyHandler) AlipayNotify(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.String(http.StatusBadRequest, "fail")
		return
	}

	provider, err := h.Payment.GetProvider("alipay")
	if err != nil {
		c.String(http.StatusBadRequest, "fail")
		return
	}

	orderNo, paid, err := provider.HandleNotify(body)
	if err != nil {
		log.Printf("[Payment] alipay notify error: %v", err)
		c.String(http.StatusBadRequest, "fail")
		return
	}

	if paid && orderNo != "" {
		if err := h.Payment.CompleteOrder(orderNo); err != nil {
			log.Printf("[Payment] complete order %s error: %v", orderNo, err)
		}
	}

	// Alipay expects "success"
	c.String(http.StatusOK, "success")
}

// TianqueNotify handles 随行付 callback
func (h *PaymentNotifyHandler) TianqueNotify(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "FAIL", "msg": "read body error"})
		return
	}

	provider, err := h.Payment.GetProvider("tianque")
	if err != nil {
		// Fallback: try wechat provider (tianque is registered under both)
		provider, err = h.Payment.GetProvider("wechat")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"code": "FAIL", "msg": "no tianque provider"})
			return
		}
	}

	orderNo, paid, err := provider.HandleNotify(body)
	if err != nil {
		log.Printf("[Payment] tianque notify error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"code": "FAIL", "msg": err.Error()})
		return
	}

	if paid && orderNo != "" {
		if err := h.Payment.CompleteOrder(orderNo); err != nil {
			log.Printf("[Payment] complete order %s error: %v", orderNo, err)
		}
	}

	// 随行付 expects {"code": "0000", "msg": "success"}
	c.JSON(http.StatusOK, gin.H{"code": "0000", "msg": "success"})
}
