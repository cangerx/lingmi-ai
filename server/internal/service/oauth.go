package service

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type OAuthService struct {
	DB *gorm.DB
}

func NewOAuthService(db *gorm.DB) *OAuthService {
	return &OAuthService{DB: db}
}

// HandleCallback handles OAuth code exchange and user binding for all providers
func (s *OAuthService) HandleCallback(provider, code string, cfg *config.Config) (*model.User, error) {
	// Get OAuth config from DB settings
	getKey := func(key string) string {
		var setting model.SystemSetting
		if err := s.DB.Where("setting_group = ? AND setting_key = ?", "oauth", key).First(&setting).Error; err != nil {
			return ""
		}
		return setting.Value
	}

	var openID, unionID, nickname, avatar string
	var err error

	switch provider {
	case "wechat":
		openID, unionID, nickname, avatar, err = s.wechatLogin(code, getKey("wechat_app_id"), getKey("wechat_app_secret"))
	case "weibo":
		openID, nickname, avatar, err = s.weiboLogin(code, getKey("weibo_app_key"), getKey("weibo_app_secret"), getKey("weibo_redirect_uri"))
		unionID = openID
	case "qq":
		openID, nickname, avatar, err = s.qqLogin(code, getKey("qq_app_id"), getKey("qq_app_key"), getKey("qq_redirect_uri"))
		unionID = openID
	default:
		return nil, fmt.Errorf("不支持的登录方式: %s", provider)
	}

	if err != nil {
		return nil, err
	}

	// Find existing binding
	var binding model.UserOAuthBinding
	if err := s.DB.Where("provider = ? AND open_id = ?", provider, openID).First(&binding).Error; err == nil {
		// User already bound, update info and return
		s.DB.Model(&binding).Updates(map[string]interface{}{"nickname": nickname, "avatar": avatar})
		var user model.User
		if err := s.DB.First(&user, binding.UserID).Error; err != nil {
			return nil, fmt.Errorf("用户不存在")
		}
		return &user, nil
	}

	// Create new user + binding
	invCode := generateOAuthInviteCode()
	emailPlaceholder := fmt.Sprintf("%s_%s@oauth.local", provider, openID[:8])
	phonePlaceholder := fmt.Sprintf("o_%s", invCode)

	user := model.User{
		Email:      emailPlaceholder,
		Phone:      phonePlaceholder,
		Nickname:   nickname,
		Avatar:     avatar,
		InviteCode: invCode,
		Role:       "user",
		Status:     "active",
	}
	if err := s.DB.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("创建用户失败")
	}

	// Create binding
	s.DB.Create(&model.UserOAuthBinding{
		UserID:   user.ID,
		Provider: provider,
		OpenID:   openID,
		UnionID:  unionID,
		Nickname: nickname,
		Avatar:   avatar,
	})

	// Credits bonus
	s.DB.Create(&model.UserCredits{UserID: user.ID, Balance: 100})
	s.DB.Create(&model.CreditLog{UserID: user.ID, Type: "gift", Amount: 100, Balance: 100, Detail: "registration bonus"})

	return &user, nil
}

// ── WeChat ──────────────────────────────────────
func (s *OAuthService) wechatLogin(code, appID, appSecret string) (openID, unionID, nickname, avatar string, err error) {
	if appID == "" || appSecret == "" {
		return "", "", "", "", fmt.Errorf("微信登录未配置")
	}

	// Exchange code for access_token
	tokenURL := fmt.Sprintf("https://api.weixin.qq.com/sns/oauth2/access_token?appid=%s&secret=%s&code=%s&grant_type=authorization_code", appID, appSecret, code)
	resp, err := http.Get(tokenURL)
	if err != nil {
		return "", "", "", "", fmt.Errorf("微信授权失败")
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		OpenID      string `json:"openid"`
		UnionID     string `json:"unionid"`
		ErrCode     int    `json:"errcode"`
		ErrMsg      string `json:"errmsg"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil || tokenResp.ErrCode != 0 {
		return "", "", "", "", fmt.Errorf("微信授权失败: %s", tokenResp.ErrMsg)
	}

	// Get user info
	infoURL := fmt.Sprintf("https://api.weixin.qq.com/sns/userinfo?access_token=%s&openid=%s", tokenResp.AccessToken, tokenResp.OpenID)
	infoResp, err := http.Get(infoURL)
	if err != nil {
		return "", "", "", "", fmt.Errorf("获取微信用户信息失败")
	}
	defer infoResp.Body.Close()

	var userInfo struct {
		Nickname string `json:"nickname"`
		HeadImg  string `json:"headimgurl"`
		OpenID   string `json:"openid"`
		UnionID  string `json:"unionid"`
	}
	json.NewDecoder(infoResp.Body).Decode(&userInfo)

	return userInfo.OpenID, userInfo.UnionID, userInfo.Nickname, userInfo.HeadImg, nil
}

// ── Weibo ──────────────────────────────────────
func (s *OAuthService) weiboLogin(code, appKey, appSecret, redirectURI string) (openID, nickname, avatar string, err error) {
	if appKey == "" || appSecret == "" {
		return "", "", "", fmt.Errorf("微博登录未配置")
	}

	// Exchange code for access_token
	tokenURL := "https://api.weibo.com/oauth2/access_token"
	resp, err := http.PostForm(tokenURL, url.Values{
		"client_id":     {appKey},
		"client_secret": {appSecret},
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {redirectURI},
	})
	if err != nil {
		return "", "", "", fmt.Errorf("微博授权失败")
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		UID         string `json:"uid"`
	}
	json.NewDecoder(resp.Body).Decode(&tokenResp)
	if tokenResp.AccessToken == "" {
		return "", "", "", fmt.Errorf("微博授权失败")
	}

	// Get user info
	infoURL := fmt.Sprintf("https://api.weibo.com/2/users/show.json?access_token=%s&uid=%s", tokenResp.AccessToken, tokenResp.UID)
	infoResp, err := http.Get(infoURL)
	if err != nil {
		return "", "", "", fmt.Errorf("获取微博用户信息失败")
	}
	defer infoResp.Body.Close()

	var userInfo struct {
		ID       int64  `json:"id"`
		Name     string `json:"screen_name"`
		Avatar   string `json:"avatar_large"`
	}
	json.NewDecoder(infoResp.Body).Decode(&userInfo)

	return tokenResp.UID, userInfo.Name, userInfo.Avatar, nil
}

// ── QQ ──────────────────────────────────────────
func (s *OAuthService) qqLogin(code, appID, appKey, redirectURI string) (openID, nickname, avatar string, err error) {
	if appID == "" || appKey == "" {
		return "", "", "", fmt.Errorf("QQ登录未配置")
	}

	// Exchange code for access_token
	tokenURL := fmt.Sprintf("https://graph.qq.com/oauth2.0/token?grant_type=authorization_code&client_id=%s&client_secret=%s&code=%s&redirect_uri=%s&fmt=json",
		appID, appKey, code, url.QueryEscape(redirectURI))
	resp, err := http.Get(tokenURL)
	if err != nil {
		return "", "", "", fmt.Errorf("QQ授权失败")
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		Error       int    `json:"error"`
	}
	json.NewDecoder(resp.Body).Decode(&tokenResp)
	if tokenResp.AccessToken == "" {
		return "", "", "", fmt.Errorf("QQ授权失败")
	}

	// Get OpenID
	meURL := fmt.Sprintf("https://graph.qq.com/oauth2.0/me?access_token=%s&fmt=json", tokenResp.AccessToken)
	meResp, err := http.Get(meURL)
	if err != nil {
		return "", "", "", fmt.Errorf("获取QQ OpenID失败")
	}
	defer meResp.Body.Close()

	var meInfo struct {
		OpenID string `json:"openid"`
	}
	json.NewDecoder(meResp.Body).Decode(&meInfo)

	// Get user info
	infoURL := fmt.Sprintf("https://graph.qq.com/user/get_user_info?access_token=%s&oauth_consumer_key=%s&openid=%s",
		tokenResp.AccessToken, appID, meInfo.OpenID)
	infoResp, err := http.Get(infoURL)
	if err != nil {
		return "", "", "", fmt.Errorf("获取QQ用户信息失败")
	}
	defer infoResp.Body.Close()
	body, _ := io.ReadAll(infoResp.Body)

	var userInfo struct {
		Nickname string `json:"nickname"`
		Avatar   string `json:"figureurl_qq_2"`
	}
	json.Unmarshal(body, &userInfo)

	return meInfo.OpenID, userInfo.Nickname, userInfo.Avatar, nil
}

func generateOAuthInviteCode() string {
	b := make([]byte, 4)
	rand.Read(b)
	return hex.EncodeToString(b)
}
