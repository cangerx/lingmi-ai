package service

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

// ChatMessage represents a single message in the chat.
// Content can be a plain string or []ContentPart for multimodal (vision) requests.
type ChatMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"`
}

// ContentPart represents a part of a multimodal message (OpenAI Vision format).
type ContentPart struct {
	Type     string    `json:"type"` // "text" | "image_url"
	Text     string    `json:"text,omitempty"`
	ImageURL *ImageURL `json:"image_url,omitempty"`
}

// ImageURL represents an image reference in a multimodal message.
type ImageURL struct {
	URL    string `json:"url"`
	Detail string `json:"detail,omitempty"` // "low" | "high" | "auto"
}

// ContentString extracts the text content from Content (handles both string and multimodal).
func (m ChatMessage) ContentString() string {
	if s, ok := m.Content.(string); ok {
		return s
	}
	// Try to extract from first text part if it's a slice
	if parts, ok := m.Content.([]interface{}); ok {
		for _, p := range parts {
			if pm, ok := p.(map[string]interface{}); ok {
				if pm["type"] == "text" {
					if t, ok := pm["text"].(string); ok {
						return t
					}
				}
			}
		}
	}
	return fmt.Sprintf("%v", m.Content)
}

// NewTextMessage creates a simple text ChatMessage.
func NewTextMessage(role, content string) ChatMessage {
	return ChatMessage{Role: role, Content: content}
}

// NewVisionMessage creates a multimodal message with text and image URL(s).
func NewVisionMessage(role, text string, imageURLs ...string) ChatMessage {
	parts := []ContentPart{{Type: "text", Text: text}}
	for _, url := range imageURLs {
		parts = append(parts, ContentPart{Type: "image_url", ImageURL: &ImageURL{URL: url, Detail: "auto"}})
	}
	return ChatMessage{Role: role, Content: parts}
}

// ChatRequest is the request payload from client
type ChatRequest struct {
	Model    string        `json:"model"`
	Messages []ChatMessage `json:"messages"`
	Stream   bool          `json:"stream"`
}

// ChatCompletionChoice is a single choice in the response
type ChatCompletionChoice struct {
	Index   int         `json:"index"`
	Message ChatMessage `json:"message"`
	Delta   ChatMessage `json:"delta,omitempty"`
}

// ChatCompletionUsage tracks token usage
type ChatCompletionUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// ChatCompletionResponse is the full response
type ChatCompletionResponse struct {
	ID      string                 `json:"id"`
	Object  string                 `json:"object"`
	Choices []ChatCompletionChoice `json:"choices"`
	Usage   ChatCompletionUsage    `json:"usage"`
}

// LLMService handles AI model routing and proxying
type LLMService struct {
	DB *gorm.DB
}

func NewLLMService(db *gorm.DB) *LLMService {
	return &LLMService{DB: db}
}

// SelectChannel picks the best available channel for a given model
func (s *LLMService) SelectChannel(modelName string) (*model.Channel, error) {
	var channels []model.Channel
	// Find enabled channels that support this model
	err := s.DB.Where("status = ?", "enabled").
		Where("models @> ?", fmt.Sprintf(`["%s"]`, modelName)).
		Order("priority DESC, weight DESC").
		Find(&channels).Error
	if err != nil {
		return nil, fmt.Errorf("query channels: %w", err)
	}

	if len(channels) == 0 {
		return nil, fmt.Errorf("no available channel for model: %s", modelName)
	}

	// Simple weighted selection: pick first by priority
	return &channels[0], nil
}

// ChatCompletion sends a non-streaming request to the upstream
func (s *LLMService) ChatCompletion(channel *model.Channel, req *ChatRequest) (*ChatCompletionResponse, error) {
	body, _ := json.Marshal(req)

	url := strings.TrimRight(channel.BaseURL, "/") + "/v1/chat/completions"
	httpReq, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+channel.APIKey)

	client := &http.Client{Timeout: time.Duration(channel.Timeout) * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("upstream request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("upstream error %d: %s", resp.StatusCode, string(respBody))
	}

	var result ChatCompletionResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &result, nil
}

// StreamResult holds the collected content and usage from a streaming response
type StreamResult struct {
	Content    string
	TotalTokens int
}

// StreamChatCompletion sends a streaming SSE request and writes chunks to the writer.
// Returns collected content and estimated token usage.
func (s *LLMService) StreamChatCompletion(channel *model.Channel, req *ChatRequest, w http.ResponseWriter, flusher http.Flusher) (*StreamResult, error) {
	req.Stream = true
	body, _ := json.Marshal(req)

	url := strings.TrimRight(channel.BaseURL, "/") + "/v1/chat/completions"
	httpReq, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+channel.APIKey)

	client := &http.Client{Timeout: time.Duration(channel.Timeout) * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("upstream request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("upstream error %d: %s", resp.StatusCode, string(respBody))
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	var contentBuilder strings.Builder
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}
		// Forward SSE data lines as-is
		fmt.Fprintf(w, "%s\n\n", line)
		flusher.Flush()

		// Check for [DONE]
		if strings.Contains(line, "[DONE]") {
			break
		}

		// Collect delta content
		if strings.HasPrefix(line, "data: ") {
			data := strings.TrimPrefix(line, "data: ")
			var chunk struct {
				Choices []struct {
					Delta struct {
						Content string `json:"content"`
					} `json:"delta"`
				} `json:"choices"`
				Usage *ChatCompletionUsage `json:"usage,omitempty"`
			}
			if json.Unmarshal([]byte(data), &chunk) == nil {
				if len(chunk.Choices) > 0 {
					contentBuilder.WriteString(chunk.Choices[0].Delta.Content)
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	content := contentBuilder.String()
	// Estimate tokens: ~4 chars per token for CJK, rough estimate
	estimatedTokens := len(content) / 2
	if estimatedTokens < 1 {
		estimatedTokens = 1
	}

	return &StreamResult{Content: content, TotalTokens: estimatedTokens}, nil
}
