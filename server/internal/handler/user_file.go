package handler

import (
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"github.com/lingmiai/server/internal/storage"
	"gorm.io/gorm"
)

type SpaceHandler struct {
	DB      *gorm.DB
	Storage storage.Storage
}

// ── Quota ──────────────────────────────────────────────

func (h *SpaceHandler) GetQuota(c *gin.Context) {
	userID := c.GetUint("user_id")

	var quota model.UserStorageQuota
	if err := h.DB.Where("user_id = ?", userID).First(&quota).Error; err != nil {
		// Create default quota on first access
		quota = model.UserStorageQuota{UserID: userID, UsedBytes: 0, MaxBytes: 100 * 1024 * 1024}
		h.DB.Create(&quota)
	}

	// Count files
	var fileCount int64
	h.DB.Model(&model.UserFile{}).Where("user_id = ?", userID).Count(&fileCount)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"used_bytes": quota.UsedBytes,
			"max_bytes":  quota.MaxBytes,
			"file_count": fileCount,
		},
	})
}

// ── Folders ────────────────────────────────────────────

func (h *SpaceHandler) ListFolders(c *gin.Context) {
	userID := c.GetUint("user_id")

	var folders []model.UserFolder
	h.DB.Where("user_id = ?", userID).Order("sort ASC, id ASC").Find(&folders)

	// Count files per folder
	type folderCount struct {
		FolderID  uint  `json:"folder_id"`
		FileCount int64 `json:"file_count"`
	}
	var counts []folderCount
	h.DB.Model(&model.UserFile{}).
		Select("folder_id, COUNT(*) as file_count").
		Where("user_id = ? AND folder_id IS NOT NULL", userID).
		Group("folder_id").Find(&counts)

	countMap := make(map[uint]int64)
	for _, fc := range counts {
		countMap[fc.FolderID] = fc.FileCount
	}

	type folderResp struct {
		model.UserFolder
		FileCount int64 `json:"file_count"`
	}
	result := make([]folderResp, len(folders))
	for i, f := range folders {
		result[i] = folderResp{UserFolder: f, FileCount: countMap[f.ID]}
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (h *SpaceHandler) CreateFolder(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件夹名称不能为空"})
		return
	}

	folder := model.UserFolder{UserID: userID, Name: strings.TrimSpace(req.Name)}
	if err := h.DB.Create(&folder).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": folder})
}

func (h *SpaceHandler) UpdateFolder(c *gin.Context) {
	userID := c.GetUint("user_id")
	folderID := c.Param("id")

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := h.DB.Model(&model.UserFolder{}).Where("id = ? AND user_id = ?", folderID, userID).Update("name", strings.TrimSpace(req.Name))
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "文件夹不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "已更新"})
}

func (h *SpaceHandler) DeleteFolder(c *gin.Context) {
	userID := c.GetUint("user_id")
	folderID := c.Param("id")

	// Get all files in this folder to reclaim storage
	var files []model.UserFile
	h.DB.Where("user_id = ? AND folder_id = ?", userID, folderID).Find(&files)

	var totalSize int64
	for _, f := range files {
		totalSize += f.Size
		_ = h.Storage.Delete(f.Path)
	}

	// Delete files in folder
	h.DB.Where("user_id = ? AND folder_id = ?", userID, folderID).Delete(&model.UserFile{})

	// Delete folder
	result := h.DB.Where("id = ? AND user_id = ?", folderID, userID).Delete(&model.UserFolder{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "文件夹不存在"})
		return
	}

	// Reclaim storage
	if totalSize > 0 {
		h.DB.Model(&model.UserStorageQuota{}).Where("user_id = ?", userID).
			Update("used_bytes", gorm.Expr("GREATEST(used_bytes - ?, 0)", totalSize))
	}

	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}

// ── Files ──────────────────────────────────────────────

func (h *SpaceHandler) ListFiles(c *gin.Context) {
	userID := c.GetUint("user_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	folderIDStr := c.Query("folder_id")

	query := h.DB.Model(&model.UserFile{}).Where("user_id = ?", userID)
	if folderIDStr != "" {
		if folderIDStr == "root" {
			query = query.Where("folder_id IS NULL")
		} else {
			query = query.Where("folder_id = ?", folderIDStr)
		}
	}

	var total int64
	query.Count(&total)

	var files []model.UserFile
	query.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&files)

	c.JSON(http.StatusOK, gin.H{
		"data":      files,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

var allowedSpaceExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".gif": true,
	".webp": true, ".bmp": true, ".svg": true, ".tiff": true,
	".pdf": true,
}

const maxSpaceFileSize = 10 << 20 // 10MB per file

func (h *SpaceHandler) UploadFile(c *gin.Context) {
	userID := c.GetUint("user_id")

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请上传文件"})
		return
	}

	if file.Size > maxSpaceFileSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "单个文件不能超过10MB"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedSpaceExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不支持的文件格式"})
		return
	}

	// Check quota
	var quota model.UserStorageQuota
	if err := h.DB.Where("user_id = ?", userID).First(&quota).Error; err != nil {
		quota = model.UserStorageQuota{UserID: userID, UsedBytes: 0, MaxBytes: 100 * 1024 * 1024}
		h.DB.Create(&quota)
	}
	if quota.UsedBytes+file.Size > quota.MaxBytes {
		c.JSON(http.StatusForbidden, gin.H{"error": "空间不足，请清理文件或升级空间"})
		return
	}

	// Upload to storage
	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "读取文件失败"})
		return
	}
	defer f.Close()

	url, path, err := h.Storage.Upload(f, file.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存文件失败"})
		return
	}

	// Detect image dimensions
	var w, h2 int
	if strings.HasPrefix(http.DetectContentType([]byte{}), "image") || ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" || ext == ".webp" || ext == ".bmp" {
		f2, _ := file.Open()
		if f2 != nil {
			if cfg, _, err := image.DecodeConfig(f2); err == nil {
				w = cfg.Width
				h2 = cfg.Height
			}
			f2.Close()
		}
	}

	// Parse folder ID
	var folderID *uint
	if fid := c.PostForm("folder_id"); fid != "" {
		if id, err := strconv.ParseUint(fid, 10, 32); err == nil {
			uid := uint(id)
			folderID = &uid
		}
	}

	mimeType := file.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	userFile := model.UserFile{
		UserID:   userID,
		FolderID: folderID,
		Name:     file.Filename,
		URL:      url,
		Path:     path,
		Size:     file.Size,
		MimeType: mimeType,
		Width:    w,
		Height:   h2,
	}
	h.DB.Create(&userFile)

	// Update quota
	h.DB.Model(&quota).Update("used_bytes", gorm.Expr("used_bytes + ?", file.Size))

	c.JSON(http.StatusCreated, gin.H{"data": userFile})
}

func (h *SpaceHandler) UpdateFile(c *gin.Context) {
	userID := c.GetUint("user_id")
	fileID := c.Param("id")

	var req struct {
		Name     *string `json:"name"`
		FolderID *int    `json:"folder_id"` // 0 or null = move to root
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = strings.TrimSpace(*req.Name)
	}
	if req.FolderID != nil {
		if *req.FolderID == 0 {
			updates["folder_id"] = nil
		} else {
			fid := uint(*req.FolderID)
			updates["folder_id"] = &fid
		}
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "没有要更新的内容"})
		return
	}

	result := h.DB.Model(&model.UserFile{}).Where("id = ? AND user_id = ?", fileID, userID).Updates(updates)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "已更新"})
}

func (h *SpaceHandler) DeleteFile(c *gin.Context) {
	userID := c.GetUint("user_id")
	fileID := c.Param("id")

	var file model.UserFile
	if err := h.DB.Where("id = ? AND user_id = ?", fileID, userID).First(&file).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在"})
		return
	}

	// Delete from storage
	_ = h.Storage.Delete(file.Path)

	// Delete DB record
	h.DB.Delete(&file)

	// Reclaim storage
	h.DB.Model(&model.UserStorageQuota{}).Where("user_id = ?", userID).
		Update("used_bytes", gorm.Expr("GREATEST(used_bytes - ?, 0)", file.Size))

	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}
