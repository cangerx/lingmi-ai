package storage

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/lingmiai/server/internal/config"
)

// Storage is the interface for file storage backends
type Storage interface {
	Upload(reader io.Reader, filename string) (url string, path string, err error)
	Delete(path string) error
	BasePath() string
}

// NewStorage creates a storage backend from config
func NewStorage(cfg *config.Config) Storage {
	switch cfg.Storage.Driver {
	case "local":
		return &LocalStorage{
			Dir:    cfg.Storage.Local.Dir,
			Domain: cfg.Storage.Local.Domain,
		}
	default:
		return &LocalStorage{
			Dir:    cfg.Storage.Local.Dir,
			Domain: cfg.Storage.Local.Domain,
		}
	}
}

// LocalStorage stores files on the local filesystem
type LocalStorage struct {
	Dir    string
	Domain string
}

func (s *LocalStorage) Upload(reader io.Reader, filename string) (string, string, error) {
	// Generate date-based subdirectory
	now := time.Now()
	subDir := fmt.Sprintf("%d/%02d/%02d", now.Year(), now.Month(), now.Day())
	dirPath := filepath.Join(s.Dir, subDir)

	if err := os.MkdirAll(dirPath, 0755); err != nil {
		return "", "", fmt.Errorf("create directory: %w", err)
	}

	// Generate unique filename
	ext := filepath.Ext(filename)
	baseName := strings.TrimSuffix(filepath.Base(filename), ext)
	uniqueName := fmt.Sprintf("%s_%d%s", baseName, now.UnixNano(), ext)

	relPath := filepath.Join(subDir, uniqueName)
	fullPath := filepath.Join(s.Dir, relPath)

	f, err := os.Create(fullPath)
	if err != nil {
		return "", "", fmt.Errorf("create file: %w", err)
	}
	defer f.Close()

	if _, err := io.Copy(f, reader); err != nil {
		return "", "", fmt.Errorf("write file: %w", err)
	}

	// Build URL
	domain := strings.TrimRight(s.Domain, "/")
	url := fmt.Sprintf("%s/uploads/%s", domain, strings.ReplaceAll(relPath, "\\", "/"))

	return url, relPath, nil
}

func (s *LocalStorage) Delete(path string) error {
	fullPath := filepath.Join(s.Dir, path)
	return os.Remove(fullPath)
}

func (s *LocalStorage) BasePath() string {
	return s.Dir
}
