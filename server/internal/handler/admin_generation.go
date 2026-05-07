package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type AdminGenerationHandler struct {
	DB *gorm.DB
}

func (h *AdminGenerationHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	genType := c.Query("type")
	status := c.Query("status")
	userID := c.Query("user_id")

	// Unscoped: admin can see soft-deleted records
	query := h.DB.Unscoped().Model(&model.Generation{})
	if genType != "" {
		query = query.Where("type = ?", genType)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	var total int64
	query.Count(&total)

	var generations []model.Generation
	query.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&generations)

	// Batch load user nicknames
	userIDs := make([]uint, len(generations))
	for i, g := range generations {
		userIDs[i] = g.UserID
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

	type genRow struct {
		model.Generation
		Nickname string `json:"nickname"`
	}
	rows := make([]genRow, len(generations))
	for i, g := range generations {
		rows[i] = genRow{Generation: g, Nickname: nickMap[g.UserID]}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      rows,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *AdminGenerationHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var gen model.Generation
	if err := h.DB.Unscoped().First(&gen, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "generation not found"})
		return
	}
	c.JSON(http.StatusOK, gen)
}
