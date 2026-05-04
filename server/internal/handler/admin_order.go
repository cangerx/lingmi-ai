package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type AdminOrderHandler struct {
	DB *gorm.DB
}

func (h *AdminOrderHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")
	orderType := c.Query("type")
	keyword := c.Query("keyword")

	query := h.DB.Model(&model.Order{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if orderType != "" {
		query = query.Where("type = ?", orderType)
	}
	if keyword != "" {
		query = query.Where("order_no LIKE ? OR CAST(user_id AS TEXT) = ?", "%"+keyword+"%", keyword)
	}

	var total int64
	query.Count(&total)

	var orders []model.Order
	query.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&orders)

	// Batch load user nicknames
	userIDs := make([]uint, len(orders))
	for i, o := range orders {
		userIDs[i] = o.UserID
	}
	var users []model.User
	h.DB.Select("id, nickname, phone, email").Where("id IN ?", userIDs).Find(&users)
	nickMap := map[uint]string{}
	for _, u := range users {
		name := u.Nickname
		if name == "" {
			name = u.Phone
		}
		if name == "" {
			name = u.Email
		}
		nickMap[u.ID] = name
	}

	type orderRow struct {
		model.Order
		Nickname string `json:"nickname"`
	}
	rows := make([]orderRow, len(orders))
	for i, o := range orders {
		rows[i] = orderRow{Order: o, Nickname: nickMap[o.UserID]}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      rows,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *AdminOrderHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var order model.Order
	if err := h.DB.First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}
	c.JSON(http.StatusOK, order)
}

func (h *AdminOrderHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Status != "paid" && req.Status != "refunded" && req.Status != "expired" && req.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status"})
		return
	}

	result := h.DB.Model(&model.Order{}).Where("id = ?", id).Update("status", req.Status)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func (h *AdminOrderHandler) Refund(c *gin.Context) {
	id := c.Param("id")
	var order model.Order
	if err := h.DB.First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}
	if order.Status != "paid" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only paid orders can be refunded"})
		return
	}

	tx := h.DB.Begin()

	// Update order status
	tx.Model(&order).Update("status", "refunded")

	// Deduct credits if any were added
	if order.Credits > 0 {
		tx.Model(&model.UserCredits{}).Where("user_id = ?", order.UserID).
			Update("balance", gorm.Expr("GREATEST(balance - ?, 0)", order.Credits))

		tx.Create(&model.CreditLog{
			UserID: order.UserID,
			Type:   "refund",
			Amount: -order.Credits,
			Detail: "refund order: " + order.OrderNo,
		})
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "refunded"})
}
