package handler

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type AdminRedeemHandler struct {
	DB *gorm.DB
}

func (h *AdminRedeemHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")
	prefix := c.Query("prefix")
	keyword := c.Query("keyword")

	query := h.DB.Model(&model.RedeemCode{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if prefix != "" {
		query = query.Where("prefix = ?", prefix)
	}
	if keyword != "" {
		query = query.Where("code LIKE ? OR remark LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	var total int64
	query.Count(&total)

	var codes []model.RedeemCode
	query.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&codes)

	// Join package names for package-type codes
	pkgIDs := []uint{}
	for _, c := range codes {
		if c.PackageID != nil && *c.PackageID > 0 {
			pkgIDs = append(pkgIDs, *c.PackageID)
		}
	}
	pkgNameMap := map[uint]string{}
	if len(pkgIDs) > 0 {
		var pkgs []model.Package
		h.DB.Select("id, name").Where("id IN ?", pkgIDs).Find(&pkgs)
		for _, p := range pkgs {
			pkgNameMap[p.ID] = p.Name
		}
	}

	type codeRow struct {
		model.RedeemCode
		PackageName string `json:"package_name"`
	}
	rows := make([]codeRow, len(codes))
	for i, c := range codes {
		pn := ""
		if c.PackageID != nil {
			pn = pkgNameMap[*c.PackageID]
		}
		rows[i] = codeRow{RedeemCode: c, PackageName: pn}
	}

	// Summary stats
	var totalCodes int64
	var unusedCodes int64
	var usedCodes int64
	var totalCredits float64
	h.DB.Model(&model.RedeemCode{}).Count(&totalCodes)
	h.DB.Model(&model.RedeemCode{}).Where("status = ?", "unused").Count(&unusedCodes)
	h.DB.Model(&model.RedeemCode{}).Where("status = ?", "used").Count(&usedCodes)
	h.DB.Model(&model.RedeemCode{}).Select("COALESCE(SUM(credits), 0)").Scan(&totalCredits)

	c.JSON(http.StatusOK, gin.H{
		"data":          rows,
		"total":         total,
		"page":          page,
		"page_size":     pageSize,
		"total_codes":   totalCodes,
		"unused_codes":  unusedCodes,
		"used_codes":    usedCodes,
		"total_credits": totalCredits,
	})
}

func (h *AdminRedeemHandler) BatchCreate(c *gin.Context) {
	var req struct {
		Type      string   `json:"type"`       // credits or package
		Prefix    string   `json:"prefix"`
		Credits   float64  `json:"credits"`
		PackageID *uint    `json:"package_id"`
		Count     int      `json:"count" binding:"required"`
		MaxUses   int      `json:"max_uses"`
		ExpiresAt *string  `json:"expires_at"`
		Remark    string   `json:"remark"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Type == "" {
		req.Type = "credits"
	}
	if req.Type != "credits" && req.Type != "package" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be credits or package"})
		return
	}
	if req.Type == "credits" && req.Credits <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "credits must be > 0"})
		return
	}
	if req.Type == "package" {
		if req.PackageID == nil || *req.PackageID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "package_id is required for package type"})
			return
		}
		var pkg model.Package
		if err := h.DB.First(&pkg, *req.PackageID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "套餐不存在"})
			return
		}
		req.Credits = pkg.Credits
	}

	if req.Count < 1 || req.Count > 1000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "count must be 1-1000"})
		return
	}
	if req.MaxUses <= 0 {
		req.MaxUses = 1
	}

	var expiresAt *time.Time
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse("2006-01-02", *req.ExpiresAt)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid expires_at format, use YYYY-MM-DD"})
			return
		}
		expiresAt = &t
	}

	prefix := strings.ToUpper(req.Prefix)
	if prefix == "" {
		prefix = "LM"
	}

	codes := make([]model.RedeemCode, 0, req.Count)
	for i := 0; i < req.Count; i++ {
		code := generateCode(prefix)
		codes = append(codes, model.RedeemCode{
			Code:      code,
			Type:      req.Type,
			Credits:   req.Credits,
			PackageID: req.PackageID,
			Prefix:    prefix,
			Status:    "unused",
			MaxUses:   req.MaxUses,
			ExpiresAt: expiresAt,
			Remark:    req.Remark,
		})
	}

	if err := h.DB.CreateInBatches(codes, 100).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create codes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("created %d codes", len(codes)),
		"codes":   codes,
	})
}

func (h *AdminRedeemHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Status != "unused" && req.Status != "disabled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status must be unused or disabled"})
		return
	}

	result := h.DB.Model(&model.RedeemCode{}).Where("id = ?", id).Update("status", req.Status)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "code not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func (h *AdminRedeemHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	result := h.DB.Delete(&model.RedeemCode{}, id)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "code not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *AdminRedeemHandler) Logs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	codeID := c.Query("code_id")

	query := h.DB.Model(&model.RedeemLog{})
	if codeID != "" {
		query = query.Where("code_id = ?", codeID)
	}

	var total int64
	query.Count(&total)

	var logs []model.RedeemLog
	query.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&logs)

	// Batch load user nicknames and code strings
	userIDs := make([]uint, len(logs))
	codeIDs := make([]uint, len(logs))
	for i, l := range logs {
		userIDs[i] = l.UserID
		codeIDs[i] = l.CodeID
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

	var codes []model.RedeemCode
	h.DB.Select("id, code").Where("id IN ?", codeIDs).Find(&codes)
	codeMap := map[uint]string{}
	for _, c := range codes {
		codeMap[c.ID] = c.Code
	}

	type logRow struct {
		model.RedeemLog
		Nickname string `json:"nickname"`
		Code     string `json:"code"`
	}
	rows := make([]logRow, len(logs))
	for i, l := range logs {
		rows[i] = logRow{RedeemLog: l, Nickname: nickMap[l.UserID], Code: codeMap[l.CodeID]}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      rows,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func generateCode(prefix string) string {
	b := make([]byte, 6)
	rand.Read(b)
	return prefix + "-" + strings.ToUpper(hex.EncodeToString(b))
}
