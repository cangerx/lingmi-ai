package service

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"github.com/lingmiai/server/internal/model"
	"github.com/lingmiai/server/internal/storage"
	"gorm.io/gorm"
)

// ImageGenerationRequest represents a text-to-image request
type ImageGenerationRequest struct {
	Model          string `json:"model"`
	Prompt         string `json:"prompt"`
	N              int    `json:"n,omitempty"`
	Size           string `json:"size,omitempty"`
	Quality        string `json:"quality,omitempty"`
	ResponseFormat string `json:"response_format,omitempty"`
}

// ImageEditRequest represents an image editing request
type ImageEditRequest struct {
	Model  string
	Prompt string
	Image  io.Reader
	ImageFilename string
	Mask   io.Reader
	MaskFilename  string
	Size   string
	N      int
}

// ImageResponse represents the OpenAI image API response
type ImageResponse struct {
	Created int64        `json:"created"`
	Data    []ImageData  `json:"data"`
}

// ImageData represents a single image in the response
type ImageData struct {
	URL           string `json:"url,omitempty"`
	B64JSON       string `json:"b64_json,omitempty"`
	RevisedPrompt string `json:"revised_prompt,omitempty"`
}

// ImageService handles AI image generation
type ImageService struct {
	DB      *gorm.DB
	Storage storage.Storage
}

// NewImageService creates a new ImageService
func NewImageService(db *gorm.DB, store storage.Storage) *ImageService {
	return &ImageService{DB: db, Storage: store}
}

// SelectImageChannel picks a channel that supports the given image model
func (s *ImageService) SelectImageChannel(modelName string) (*model.Channel, error) {
	var channels []model.Channel
	err := s.DB.Where("status = ?", "enabled").
		Where("models @> ?", fmt.Sprintf(`["%s"]`, modelName)).
		Order("priority DESC, weight DESC").
		Find(&channels).Error
	if err != nil {
		return nil, fmt.Errorf("query channels: %w", err)
	}

	if len(channels) == 0 {
		// Fallback: find any channel that supports image models
		err = s.DB.Where("status = ?", "enabled").
			Order("priority DESC, weight DESC").
			Find(&channels).Error
		if err != nil || len(channels) == 0 {
			return nil, fmt.Errorf("no available channel for image model: %s", modelName)
		}
	}

	return &channels[0], nil
}

// Generate creates images from text prompt using /v1/images/generations
func (s *ImageService) Generate(channel *model.Channel, req *ImageGenerationRequest) (*ImageResponse, error) {
	if req.ResponseFormat == "" {
		req.ResponseFormat = "b64_json"
	}
	if req.N == 0 {
		req.N = 1
	}
	if req.Size == "" {
		req.Size = "1024x1024"
	}

	body, _ := json.Marshal(req)

	url := strings.TrimRight(channel.BaseURL, "/") + "/v1/images/generations"
	httpReq, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+channel.APIKey)

	timeout := channel.Timeout
	if timeout < 120 {
		timeout = 120
	}
	client := &http.Client{Timeout: time.Duration(timeout) * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("upstream request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("upstream error %d: %s", resp.StatusCode, string(respBody))
	}

	var result ImageResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &result, nil
}

// Edit edits images using /v1/images/edits
func (s *ImageService) Edit(channel *model.Channel, req *ImageEditRequest) (*ImageResponse, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Add image file
	if req.Image != nil {
		part, err := writer.CreateFormFile("image", req.ImageFilename)
		if err != nil {
			return nil, err
		}
		if _, err := io.Copy(part, req.Image); err != nil {
			return nil, err
		}
	}

	// Add mask if provided
	if req.Mask != nil {
		part, err := writer.CreateFormFile("mask", req.MaskFilename)
		if err != nil {
			return nil, err
		}
		if _, err := io.Copy(part, req.Mask); err != nil {
			return nil, err
		}
	}

	writer.WriteField("prompt", req.Prompt)
	if req.Model != "" {
		writer.WriteField("model", req.Model)
	}
	if req.Size != "" {
		writer.WriteField("size", req.Size)
	}
	writer.WriteField("response_format", "b64_json")
	if req.N > 0 {
		writer.WriteField("n", fmt.Sprintf("%d", req.N))
	}
	writer.Close()

	url := strings.TrimRight(channel.BaseURL, "/") + "/v1/images/edits"
	httpReq, err := http.NewRequest("POST", url, &buf)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", writer.FormDataContentType())
	httpReq.Header.Set("Authorization", "Bearer "+channel.APIKey)

	timeout := channel.Timeout
	if timeout < 120 {
		timeout = 120
	}
	client := &http.Client{Timeout: time.Duration(timeout) * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("upstream request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("upstream error %d: %s", resp.StatusCode, string(respBody))
	}

	var result ImageResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &result, nil
}

// SaveResultToStorage downloads or decodes the image and saves it to storage
func (s *ImageService) SaveResultToStorage(data *ImageData, prefix string) (string, error) {
	var reader io.Reader
	var filename string

	if data.B64JSON != "" {
		decoded, err := base64.StdEncoding.DecodeString(data.B64JSON)
		if err != nil {
			return "", fmt.Errorf("decode base64: %w", err)
		}
		reader = bytes.NewReader(decoded)
		filename = prefix + ".png"
	} else if data.URL != "" {
		resp, err := http.Get(data.URL)
		if err != nil {
			return "", fmt.Errorf("download image: %w", err)
		}
		defer resp.Body.Close()
		reader = resp.Body

		ext := ".png"
		if strings.Contains(resp.Header.Get("Content-Type"), "jpeg") {
			ext = ".jpg"
		}
		filename = prefix + ext
	} else {
		return "", fmt.Errorf("no image data in response")
	}

	url, _, err := s.Storage.Upload(reader, filename)
	if err != nil {
		return "", fmt.Errorf("save to storage: %w", err)
	}

	return url, nil
}
