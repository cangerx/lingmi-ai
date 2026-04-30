package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type AdminUserHandler struct {
	DB *gorm.DB
}

func (h *AdminUserHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	keyword := c.Query("keyword")

	var users []model.User
	var total int64

	query := h.DB.Model(&model.User{})
	if keyword != "" {
		query = query.Where("nickname LIKE ? OR email LIKE ? OR phone LIKE ?",
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	query.Count(&total)
	query.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&users)

	c.JSON(http.StatusOK, gin.H{
		"data":      users,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *AdminUserHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var user model.User
	if err := h.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var credits model.UserCredits
	h.DB.Where("user_id = ?", user.ID).First(&credits)

	c.JSON(http.StatusOK, gin.H{"user": user, "credits": credits})
}

func (h *AdminUserHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := h.DB.Model(&model.User{}).Where("id = ?", id).Update("status", req.Status)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func (h *AdminUserHandler) AdjustCredits(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Amount float64 `json:"amount" binding:"required"`
		Remark string  `json:"remark"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var credits model.UserCredits
	if err := h.DB.Where("user_id = ?", id).First(&credits).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user credits not found"})
		return
	}

	h.DB.Model(&credits).Update("balance", gorm.Expr("balance + ?", req.Amount))

	userID, _ := strconv.ParseUint(id, 10, 64)
	h.DB.Create(&model.CreditLog{
		UserID:  uint(userID),
		Type:    "gift",
		Amount:  req.Amount,
		Balance: credits.Balance + req.Amount,
		Detail:  "admin adjust: " + req.Remark,
	})

	c.JSON(http.StatusOK, gin.H{"message": "credits adjusted"})
}
