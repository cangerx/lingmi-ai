package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type TemplateHandler struct {
	DB *gorm.DB
}

// List returns active templates with rich filtering
func (h *TemplateHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "24"))
	category := c.Query("category")
	scene := c.Query("scene")
	usage := c.Query("usage")
	industry := c.Query("industry")
	style := c.Query("style")
	color := c.Query("color")
	layout := c.Query("layout")
	search := c.Query("search")
	sortBy := c.DefaultQuery("sort_by", "default") // default, newest, downloads

	query := h.DB.Model(&model.Template{}).Where("status = ?", "active")

	if category != "" && category != "全部" {
		query = query.Where("category = ?", category)
	}
	if scene != "" && scene != "全部" {
		query = query.Where("scene = ?", scene)
	}
	if usage != "" && usage != "全部" {
		query = query.Where("\"usage\" = ?", usage)
	}
	if industry != "" && industry != "全部" {
		query = query.Where("industry = ?", industry)
	}
	if style != "" && style != "全部" {
		query = query.Where("style = ?", style)
	}
	if color != "" && color != "全部" {
		query = query.Where("color = ?", color)
	}
	if layout != "" && layout != "全部" {
		query = query.Where("layout = ?", layout)
	}
	if search != "" {
		query = query.Where("title ILIKE ? OR description ILIKE ? OR tags ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	switch sortBy {
	case "newest":
		query = query.Order("created_at DESC")
	case "downloads":
		query = query.Order("downloads DESC")
	default:
		query = query.Order("featured DESC, sort ASC, downloads DESC, created_at DESC")
	}

	var items []model.Template
	query.Offset((page - 1) * pageSize).Limit(pageSize).Find(&items)

	c.JSON(http.StatusOK, gin.H{
		"data":      items,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// Filters returns all distinct filter values for the template center
func (h *TemplateHandler) Filters(c *gin.Context) {
	q := h.DB.Model(&model.Template{}).Where("status = ?", "active")

	pluck := func(col string) []string {
		var vals []string
		q.Distinct(col).Where(col+" != ''").Pluck(col, &vals)
		return vals
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"categories": pluck("category"),
			"scenes":     pluck("scene"),
			"usages":     pluck("\"usage\""),
			"industries": pluck("industry"),
			"styles":     pluck("style"),
			"colors":     pluck("color"),
			"layouts":    pluck("layout"),
		},
	})
}
