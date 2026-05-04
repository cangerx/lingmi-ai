package handler

import (
	"bufio"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"github.com/lingmiai/server/internal/service"
	"gorm.io/gorm"
)

type AdminModerationHandler struct {
	DB         *gorm.DB
	Moderation *service.ModerationService
}

// ---------------------------------------------------------------------------
// Moderation Logs
// ---------------------------------------------------------------------------

// ListModerationLogs returns paginated moderation log list
func (h *AdminModerationHandler) ListLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}

	q := h.DB.Model(&model.ModerationLog{})

	if v := c.Query("risk_level"); v != "" {
		q = q.Where("risk_level = ?", v)
	}
	if v := c.Query("status"); v != "" {
		q = q.Where("status = ?", v)
	}
	if v := c.Query("content_type"); v != "" {
		q = q.Where("content_type = ?", v)
	}
	if v := c.Query("source"); v != "" {
		q = q.Where("source = ?", v)
	}
	if v := c.Query("user_id"); v != "" {
		q = q.Where("user_id = ?", v)
	}

	var total int64
	q.Count(&total)

	var logs []model.ModerationLog
	q.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&logs)

	c.JSON(http.StatusOK, gin.H{"data": logs, "total": total})
}

// ReviewModeration handles admin approve/reject
func (h *AdminModerationHandler) Review(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Action string `json:"action" binding:"required"` // approve / reject
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status := "approved"
	if req.Action == "reject" {
		status = "rejected"
	}

	adminID := c.GetUint("user_id")
	now := time.Now()

	result := h.DB.Model(&model.ModerationLog{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":      status,
		"reviewed_by": adminID,
		"reviewed_at": &now,
	})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "记录不存在"})
		return
	}

	// If reviewing an image generation, update the generation's moderation_status too
	var logEntry model.ModerationLog
	if h.DB.First(&logEntry, id).Error == nil && logEntry.ContentType == "image" && logEntry.RefID > 0 {
		h.DB.Model(&model.Generation{}).Where("id = ?", logEntry.RefID).Update("moderation_status", status)
	}

	c.JSON(http.StatusOK, gin.H{"message": "审核完成"})
}

// GetModerationStats returns overview statistics
func (h *AdminModerationHandler) Stats(c *gin.Context) {
	today := time.Now().Format("2006-01-02")

	var todayBlocked int64
	h.DB.Model(&model.ModerationLog{}).Where("risk_level = 'block' AND created_at >= ?", today).Count(&todayBlocked)

	var pending int64
	h.DB.Model(&model.ModerationLog{}).Where("status = 'pending'").Count(&pending)

	var totalApproved int64
	h.DB.Model(&model.ModerationLog{}).Where("status = 'approved'").Count(&totalApproved)

	var totalRejected int64
	h.DB.Model(&model.ModerationLog{}).Where("status = 'rejected'").Count(&totalRejected)

	// Category distribution (top categories)
	type CatStat struct {
		Source string `json:"source"`
		Count  int64  `json:"count"`
	}
	var catStats []CatStat
	h.DB.Model(&model.ModerationLog{}).Select("source, count(*) as count").Group("source").Order("count DESC").Limit(10).Scan(&catStats)

	c.JSON(http.StatusOK, gin.H{
		"today_blocked":  todayBlocked,
		"pending":        pending,
		"total_approved": totalApproved,
		"total_rejected": totalRejected,
		"source_stats":   catStats,
	})
}

// ---------------------------------------------------------------------------
// Sensitive Words CRUD
// ---------------------------------------------------------------------------

// ListWords returns paginated sensitive word list
func (h *AdminModerationHandler) ListWords(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}

	q := h.DB.Model(&model.SensitiveWord{})
	if v := c.Query("keyword"); v != "" {
		q = q.Where("word ILIKE ?", "%"+v+"%")
	}
	if v := c.Query("category"); v != "" {
		q = q.Where("category = ?", v)
	}
	if v := c.Query("level"); v != "" {
		q = q.Where("level = ?", v)
	}

	var total int64
	q.Count(&total)

	var words []model.SensitiveWord
	q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&words)

	c.JSON(http.StatusOK, gin.H{"data": words, "total": total})
}

// CreateWord adds a single sensitive word
func (h *AdminModerationHandler) CreateWord(c *gin.Context) {
	var req struct {
		Word     string `json:"word" binding:"required"`
		Category string `json:"category"`
		Level    string `json:"level"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Category == "" {
		req.Category = "custom"
	}
	if req.Level == "" {
		req.Level = "block"
	}

	word := model.SensitiveWord{
		Word:     strings.TrimSpace(req.Word),
		Category: req.Category,
		Level:    req.Level,
		Status:   "active",
	}
	if err := h.DB.Create(&word).Error; err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			c.JSON(http.StatusConflict, gin.H{"error": "该词条已存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建失败"})
		return
	}

	// Refresh in-memory matcher
	if h.Moderation != nil {
		h.Moderation.RefreshWords()
	}

	c.JSON(http.StatusCreated, word)
}

// UpdateWord edits an existing sensitive word
func (h *AdminModerationHandler) UpdateWord(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Word     string `json:"word"`
		Category string `json:"category"`
		Level    string `json:"level"`
		Status   string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Word != "" {
		updates["word"] = strings.TrimSpace(req.Word)
	}
	if req.Category != "" {
		updates["category"] = req.Category
	}
	if req.Level != "" {
		updates["level"] = req.Level
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}

	result := h.DB.Model(&model.SensitiveWord{}).Where("id = ?", id).Updates(updates)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "词条不存在"})
		return
	}

	if h.Moderation != nil {
		h.Moderation.RefreshWords()
	}
	c.JSON(http.StatusOK, gin.H{"message": "更新成功"})
}

// DeleteWord removes a sensitive word
func (h *AdminModerationHandler) DeleteWord(c *gin.Context) {
	id := c.Param("id")

	result := h.DB.Where("id = ?", id).Delete(&model.SensitiveWord{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "词条不存在"})
		return
	}

	if h.Moderation != nil {
		h.Moderation.RefreshWords()
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// ImportWords batch-imports words from text (one word per line)
func (h *AdminModerationHandler) ImportWords(c *gin.Context) {
	var req struct {
		Text     string `json:"text" binding:"required"`
		Category string `json:"category"`
		Level    string `json:"level"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Category == "" {
		req.Category = "custom"
	}
	if req.Level == "" {
		req.Level = "block"
	}

	scanner := bufio.NewScanner(strings.NewReader(req.Text))
	added := 0
	skipped := 0
	for scanner.Scan() {
		w := strings.TrimSpace(scanner.Text())
		if w == "" {
			continue
		}
		word := model.SensitiveWord{
			Word:     w,
			Category: req.Category,
			Level:    req.Level,
			Status:   "active",
		}
		if err := h.DB.Create(&word).Error; err != nil {
			skipped++
		} else {
			added++
		}
	}

	if h.Moderation != nil {
		h.Moderation.RefreshWords()
	}

	c.JSON(http.StatusOK, gin.H{"added": added, "skipped": skipped})
}
