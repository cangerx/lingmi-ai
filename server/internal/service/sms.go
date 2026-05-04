package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"time"

	openapi "github.com/alibabacloud-go/darabonba-openapi/v2/client"
	dysmsapi "github.com/alibabacloud-go/dysmsapi-20170525/v3/client"
	"github.com/alibabacloud-go/tea/tea"
	"github.com/lingmiai/server/internal/cache"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type SMSService struct {
	DB *gorm.DB
}

func NewSMSService(db *gorm.DB) *SMSService {
	return &SMSService{DB: db}
}

// GenerateCode creates a 6-digit code
func GenerateCode() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(900000))
	return fmt.Sprintf("%06d", n.Int64()+100000)
}

// getSetting reads a single setting value
func (s *SMSService) getSetting(key string) string {
	var setting model.SystemSetting
	if err := s.DB.Where("setting_group = ? AND setting_key = ?", "sms", key).First(&setting).Error; err != nil {
		return ""
	}
	return setting.Value
}

// SendCode sends a verification code to the phone number
func (s *SMSService) SendCode(phone string) error {
	ctx := context.Background()

	// Rate limit: 60s per phone
	limitKey := fmt.Sprintf("sms:limit:%s", phone)
	if cache.Exists(ctx, limitKey) {
		return fmt.Errorf("请60秒后再试")
	}

	code := GenerateCode()
	mockEnabled := s.getSetting("mock_enabled")

	if mockEnabled == "true" {
		// Mock mode: use fixed code 666666
		code = "666666"
		log.Printf("[SMS Mock] Phone=%s Code=%s", phone, code)
	} else {
		// Real Aliyun SMS
		accessKeyID := s.getSetting("aliyun_access_key_id")
		accessKeySecret := s.getSetting("aliyun_access_key_secret")
		signName := s.getSetting("aliyun_sign_name")
		templateCode := s.getSetting("aliyun_template_code")

		if accessKeyID == "" || accessKeySecret == "" {
			return fmt.Errorf("短信服务未配置")
		}

		cfg := &openapi.Config{
			AccessKeyId:     tea.String(accessKeyID),
			AccessKeySecret: tea.String(accessKeySecret),
			Endpoint:        tea.String("dysmsapi.aliyuncs.com"),
		}
		client, err := dysmsapi.NewClient(cfg)
		if err != nil {
			return fmt.Errorf("短信服务初始化失败: %w", err)
		}

		req := &dysmsapi.SendSmsRequest{
			PhoneNumbers:  tea.String(phone),
			SignName:      tea.String(signName),
			TemplateCode:  tea.String(templateCode),
			TemplateParam: tea.String(fmt.Sprintf(`{"code":"%s"}`, code)),
		}

		resp, err := client.SendSms(req)
		if err != nil {
			return fmt.Errorf("短信发送失败: %w", err)
		}
		if *resp.Body.Code != "OK" {
			return fmt.Errorf("短信发送失败: %s", *resp.Body.Message)
		}
	}

	// Store code in Redis (5 min TTL)
	codeKey := fmt.Sprintf("sms:code:%s", phone)
	if err := cache.Set(ctx, codeKey, code, 5*time.Minute); err != nil {
		return fmt.Errorf("验证码存储失败")
	}

	// Set rate limit (60s)
	cache.Set(ctx, limitKey, "1", 60*time.Second)

	return nil
}

// VerifyCode checks the code and deletes it if valid
func (s *SMSService) VerifyCode(phone, code string) bool {
	ctx := context.Background()
	codeKey := fmt.Sprintf("sms:code:%s", phone)

	var stored string
	if err := cache.Get(ctx, codeKey, &stored); err != nil {
		return false
	}

	if stored != code {
		return false
	}

	// Delete code after successful verification
	cache.Del(ctx, codeKey)
	return true
}
