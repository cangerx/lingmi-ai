package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type AdminSettingHandler struct {
	DB *gorm.DB
}

// ListByGroup returns all settings in a group (e.g. "payment")
func (h *AdminSettingHandler) ListByGroup(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "group is required"})
		return
	}

	var settings []model.SystemSetting
	h.DB.Where("setting_group = ?", group).Order("id ASC").Find(&settings)

	c.JSON(http.StatusOK, gin.H{"data": settings})
}

// BatchUpdate upserts multiple settings at once
func (h *AdminSettingHandler) BatchUpdate(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "group is required"})
		return
	}

	var req []struct {
		Key    string `json:"key" binding:"required"`
		Value  string `json:"value"`
		Label  string `json:"label"`
		Type   string `json:"type"`
		Remark string `json:"remark"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for _, item := range req {
		setting := model.SystemSetting{
			Group:  group,
			Key:    item.Key,
			Value:  item.Value,
			Label:  item.Label,
			Type:   item.Type,
			Remark: item.Remark,
		}
		h.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "setting_group"}, {Name: "setting_key"}},
			DoUpdates: clause.AssignmentColumns([]string{"setting_value", "label", "setting_type", "remark", "updated_at"}),
		}).Create(&setting)
	}

	c.JSON(http.StatusOK, gin.H{"message": "保存成功"})
}

// SeedAllSettings seeds all default settings groups
func SeedAllSettings(db *gorm.DB) {
	SeedPaymentSettings(db)
	SeedStorageSettings(db)
	SeedAppModuleSettings(db)
	SeedSmsSettings(db)
	SeedOAuthSettings(db)
	SeedLoginSettings(db)
	SeedSiteSettings(db)
	SeedModerationSettings(db)
	SeedReferralSettings(db)
}

// SeedStorageSettings ensures default storage settings exist
func SeedStorageSettings(db *gorm.DB) {
	defaults := []model.SystemSetting{
		{Group: "storage", Key: "driver", Value: "local", Label: "存储驱动", Type: "select", Remark: "local=本地, oss=阿里云OSS, cos=腾讯云COS, r2=Cloudflare R2"},
		{Group: "storage", Key: "local_dir", Value: "./uploads", Label: "本地存储目录", Type: "text", Remark: "本地存储文件目录路径"},
		{Group: "storage", Key: "local_domain", Value: "http://localhost:8080", Label: "本地访问域名", Type: "text", Remark: "用于拼接文件公开URL"},
		{Group: "storage", Key: "oss_endpoint", Value: "", Label: "OSS Endpoint", Type: "text", Remark: "如 oss-cn-hangzhou.aliyuncs.com"},
		{Group: "storage", Key: "oss_bucket", Value: "", Label: "OSS Bucket", Type: "text", Remark: "Bucket 名称"},
		{Group: "storage", Key: "oss_access_key_id", Value: "", Label: "OSS AccessKey ID", Type: "text", Remark: ""},
		{Group: "storage", Key: "oss_access_key_secret", Value: "", Label: "OSS AccessKey Secret", Type: "password", Remark: ""},
		{Group: "storage", Key: "oss_domain", Value: "", Label: "OSS 自定义域名", Type: "text", Remark: "CDN 或自定义域名，用于拼接公开URL"},
		{Group: "storage", Key: "cos_region", Value: "", Label: "COS Region", Type: "text", Remark: "如 ap-guangzhou"},
		{Group: "storage", Key: "cos_bucket", Value: "", Label: "COS Bucket", Type: "text", Remark: "Bucket 名称"},
		{Group: "storage", Key: "cos_secret_id", Value: "", Label: "COS SecretId", Type: "text", Remark: ""},
		{Group: "storage", Key: "cos_secret_key", Value: "", Label: "COS SecretKey", Type: "password", Remark: ""},
		{Group: "storage", Key: "cos_domain", Value: "", Label: "COS 自定义域名", Type: "text", Remark: "CDN 或自定义域名"},
		{Group: "storage", Key: "r2_account_id", Value: "", Label: "R2 Account ID", Type: "text", Remark: "Cloudflare Account ID"},
		{Group: "storage", Key: "r2_bucket", Value: "", Label: "R2 Bucket", Type: "text", Remark: "R2 Bucket 名称"},
		{Group: "storage", Key: "r2_access_key_id", Value: "", Label: "R2 Access Key ID", Type: "text", Remark: ""},
		{Group: "storage", Key: "r2_secret_access_key", Value: "", Label: "R2 Secret Access Key", Type: "password", Remark: ""},
		{Group: "storage", Key: "r2_domain", Value: "", Label: "R2 自定义域名", Type: "text", Remark: "Public R2 域名或自定义域名"},
	}

	for _, s := range defaults {
		var existing model.SystemSetting
		if err := db.Where("setting_group = ? AND setting_key = ?", s.Group, s.Key).First(&existing).Error; err != nil {
			db.Create(&s)
		}
	}
}

// SeedAppModuleSettings ensures default app module toggles exist
func SeedAppModuleSettings(db *gorm.DB) {
	defaults := []model.SystemSetting{
		{Group: "app_modules", Key: "chat", Value: "true", Label: "AI 对话", Type: "switch", Remark: "智能对话功能"},
		{Group: "app_modules", Key: "image_generate", Value: "true", Label: "图片生成", Type: "switch", Remark: "文生图功能（首页）"},
		{Group: "app_modules", Key: "product_photo", Value: "true", Label: "AI 商品图", Type: "switch", Remark: "商品场景图生成"},
		{Group: "app_modules", Key: "cutout", Value: "true", Label: "智能抠图", Type: "switch", Remark: "AI 去除背景"},
		{Group: "app_modules", Key: "eraser", Value: "true", Label: "AI 消除", Type: "switch", Remark: "一键消除物体"},
		{Group: "app_modules", Key: "expand", Value: "true", Label: "AI 扩图", Type: "switch", Remark: "智能延展画面"},
		{Group: "app_modules", Key: "upscale", Value: "true", Label: "变清晰", Type: "switch", Remark: "AI 超分辨率增强"},
		{Group: "app_modules", Key: "poster", Value: "true", Label: "AI 海报", Type: "switch", Remark: "一键生成海报"},
		{Group: "app_modules", Key: "video", Value: "false", Label: "AI 视频", Type: "switch", Remark: "视频生成（暂未开放）"},
		{Group: "app_modules", Key: "music", Value: "false", Label: "AI 音乐", Type: "switch", Remark: "音乐生成（暂未开放）"},
	}

	for _, s := range defaults {
		var existing model.SystemSetting
		if err := db.Where("setting_group = ? AND setting_key = ?", s.Group, s.Key).First(&existing).Error; err != nil {
			db.Create(&s)
		}
	}
}

// AppModules returns enabled/disabled state for each app module (public API)
func (h *AdminSettingHandler) AppModules(c *gin.Context) {
	var settings []model.SystemSetting
	h.DB.Where("setting_group = ?", "app_modules").Find(&settings)

	result := make(map[string]bool)
	for _, s := range settings {
		result[s.Key] = s.Value == "true"
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// LoginMethods returns enabled login methods (public API)
func (h *AdminSettingHandler) LoginMethods(c *gin.Context) {
	var settings []model.SystemSetting
	h.DB.Where("setting_group = ?", "login_methods").Find(&settings)

	result := make(map[string]bool)
	for _, s := range settings {
		result[s.Key] = s.Value == "true"
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// SeedSmsSettings ensures default SMS settings exist
func SeedSmsSettings(db *gorm.DB) {
	defaults := []model.SystemSetting{
		{Group: "sms", Key: "mock_enabled", Value: "true", Label: "模拟模式", Type: "switch", Remark: "开启后不发真实短信，验证码固定为666666"},
		{Group: "sms", Key: "aliyun_access_key_id", Value: "", Label: "阿里云 AccessKey ID", Type: "text", Remark: ""},
		{Group: "sms", Key: "aliyun_access_key_secret", Value: "", Label: "阿里云 AccessKey Secret", Type: "password", Remark: ""},
		{Group: "sms", Key: "aliyun_sign_name", Value: "", Label: "短信签名", Type: "text", Remark: "如：灵觅AI"},
		{Group: "sms", Key: "aliyun_template_code", Value: "", Label: "模板编号", Type: "text", Remark: "如：SMS_123456"},
	}
	for _, s := range defaults {
		var existing model.SystemSetting
		if err := db.Where("setting_group = ? AND setting_key = ?", s.Group, s.Key).First(&existing).Error; err != nil {
			db.Create(&s)
		}
	}
}

// SeedOAuthSettings ensures default OAuth settings exist
func SeedOAuthSettings(db *gorm.DB) {
	defaults := []model.SystemSetting{
		{Group: "oauth", Key: "wechat_app_id", Value: "", Label: "微信 AppID", Type: "text", Remark: "微信开放平台应用ID"},
		{Group: "oauth", Key: "wechat_app_secret", Value: "", Label: "微信 AppSecret", Type: "password", Remark: ""},
		{Group: "oauth", Key: "weibo_app_key", Value: "", Label: "微博 App Key", Type: "text", Remark: ""},
		{Group: "oauth", Key: "weibo_app_secret", Value: "", Label: "微博 App Secret", Type: "password", Remark: ""},
		{Group: "oauth", Key: "weibo_redirect_uri", Value: "", Label: "微博回调地址", Type: "text", Remark: ""},
		{Group: "oauth", Key: "qq_app_id", Value: "", Label: "QQ AppID", Type: "text", Remark: ""},
		{Group: "oauth", Key: "qq_app_key", Value: "", Label: "QQ AppKey", Type: "password", Remark: ""},
		{Group: "oauth", Key: "qq_redirect_uri", Value: "", Label: "QQ回调地址", Type: "text", Remark: ""},
	}
	for _, s := range defaults {
		var existing model.SystemSetting
		if err := db.Where("setting_group = ? AND setting_key = ?", s.Group, s.Key).First(&existing).Error; err != nil {
			db.Create(&s)
		}
	}
}

// SeedLoginSettings ensures default login method toggles exist
func SeedLoginSettings(db *gorm.DB) {
	defaults := []model.SystemSetting{
		{Group: "login_methods", Key: "email_password", Value: "true", Label: "邮箱密码登录", Type: "switch", Remark: ""},
		{Group: "login_methods", Key: "phone_sms", Value: "true", Label: "手机验证码登录", Type: "switch", Remark: ""},
		{Group: "login_methods", Key: "wechat", Value: "false", Label: "微信登录", Type: "switch", Remark: ""},
		{Group: "login_methods", Key: "weibo", Value: "false", Label: "微博登录", Type: "switch", Remark: ""},
		{Group: "login_methods", Key: "qq", Value: "false", Label: "QQ登录", Type: "switch", Remark: ""},
	}
	for _, s := range defaults {
		var existing model.SystemSetting
		if err := db.Where("setting_group = ? AND setting_key = ?", s.Group, s.Key).First(&existing).Error; err != nil {
			db.Create(&s)
		}
	}
}

// SeedSiteSettings ensures default site/SEO settings exist
func SeedSiteSettings(db *gorm.DB) {
	defaults := []model.SystemSetting{
		{Group: "site", Key: "site_name", Value: "灵秘 AI", Label: "网站名称", Type: "text", Remark: "显示在浏览器标签和页面标题中"},
		{Group: "site", Key: "site_description", Value: "AI 聊天、生图、修图、视频、音乐，一站式智能创作平台", Label: "Meta 描述", Type: "text", Remark: "用于搜索引擎展示的网站描述"},
		{Group: "site", Key: "site_keywords", Value: "AI,人工智能,AI绘画,AI聊天,智能创作", Label: "Meta 关键词", Type: "text", Remark: "英文逗号分隔的SEO关键词"},
		{Group: "site", Key: "site_logo", Value: "/logo-full.svg", Label: "网站 Logo", Type: "text", Remark: "网站 Logo 图片URL（深色背景用）"},
		{Group: "site", Key: "site_logo_dark", Value: "/logo-dark.svg", Label: "深色 Logo", Type: "text", Remark: "浅色背景使用的深色 Logo"},
		{Group: "site", Key: "site_favicon", Value: "/logo-icon.svg", Label: "Favicon", Type: "text", Remark: "浏览器标签图标URL"},
		{Group: "site", Key: "site_copyright", Value: "© 2024 灵秘 AI. All rights reserved.", Label: "版权信息", Type: "text", Remark: "页面底部版权文字"},
		{Group: "site", Key: "site_icp", Value: "", Label: "ICP 备案号", Type: "text", Remark: "如：京ICP备xxxxxxxx号"},
		{Group: "site", Key: "site_og_image", Value: "", Label: "OG 分享图", Type: "text", Remark: "社交平台分享时展示的封面图片URL"},
		{Group: "site", Key: "site_og_type", Value: "website", Label: "OG 类型", Type: "text", Remark: "Open Graph 类型，一般为 website"},
		{Group: "site", Key: "site_twitter_card", Value: "summary_large_image", Label: "Twitter Card", Type: "text", Remark: "Twitter 卡片类型：summary / summary_large_image"},
		{Group: "site", Key: "site_canonical_url", Value: "", Label: "规范化 URL", Type: "text", Remark: "网站主域名，如 https://example.com"},
		{Group: "site", Key: "site_analytics_id", Value: "", Label: "统计代码 ID", Type: "text", Remark: "百度统计或 Google Analytics ID"},
	}
	for _, s := range defaults {
		var existing model.SystemSetting
		if err := db.Where("setting_group = ? AND setting_key = ?", s.Group, s.Key).First(&existing).Error; err != nil {
			db.Create(&s)
		}
	}
}

// SiteConfig returns public site configuration (name, logo, SEO, copyright)
func (h *AdminSettingHandler) SiteConfig(c *gin.Context) {
	var settings []model.SystemSetting
	h.DB.Where("setting_group = ?", "site").Find(&settings)

	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// SeedModerationSettings ensures default content moderation settings exist
func SeedModerationSettings(db *gorm.DB) {
	defaults := []model.SystemSetting{
		{Group: "content_moderation", Key: "moderation_enabled", Value: "false", Label: "内容审核总开关", Type: "switch", Remark: "开启后对用户内容进行安全审核"},
		{Group: "content_moderation", Key: "moderation_text_enabled", Value: "true", Label: "文本审核", Type: "switch", Remark: "对聊天消息、提示词、昵称等文本内容进行审核"},
		{Group: "content_moderation", Key: "moderation_image_enabled", Value: "true", Label: "图片审核", Type: "switch", Remark: "对AI生成的图片进行安全审核"},
		{Group: "content_moderation", Key: "moderation_ai_review_enabled", Value: "true", Label: "AI 二次审核", Type: "switch", Remark: "对可疑内容调用LLM进行二次判断"},
		{Group: "content_moderation", Key: "moderation_ai_model", Value: "", Label: "审核用模型", Type: "text", Remark: "指定用于内容审核的模型名称，留空则自动选择"},
		{Group: "prompt", Key: "prompt_optimize_model", Value: "", Label: "提示词优化模型", Type: "text", Remark: "用于优化用户提示词的 chat 模型，留空则自动选择第一个可用模型"},
	}

	for _, s := range defaults {
		var existing model.SystemSetting
		if err := db.Where("setting_group = ? AND setting_key = ?", s.Group, s.Key).First(&existing).Error; err != nil {
			db.Create(&s)
		}
	}

	// Seed default sensitive words
	SeedDefaultSensitiveWords(db)
}

// SeedDefaultSensitiveWords inserts a baseline set of common sensitive words
func SeedDefaultSensitiveWords(db *gorm.DB) {
	type wordDef struct {
		word     string
		category string
		level    string
	}
	seeds := []wordDef{
		// ==================== 色情 porn (block) ====================
		{"色情", "porn", "block"}, {"裸体", "porn", "block"}, {"性爱", "porn", "block"},
		{"做爱", "porn", "block"}, {"卖淫", "porn", "block"}, {"嫖娼", "porn", "block"},
		{"淫秽", "porn", "block"}, {"色情片", "porn", "block"}, {"情色", "porn", "block"},
		{"AV女优", "porn", "block"}, {"约炮", "porn", "block"}, {"一夜情", "porn", "block"},
		{"裸照", "porn", "block"}, {"成人视频", "porn", "block"}, {"黄色网站", "porn", "block"},
		{"黄片", "porn", "block"}, {"三级片", "porn", "block"}, {"A片", "porn", "block"},
		{"性交", "porn", "block"}, {"口交", "porn", "block"}, {"肛交", "porn", "block"},
		{"手淫", "porn", "block"}, {"自慰", "porn", "block"}, {"乱伦", "porn", "block"},
		{"强奸", "porn", "block"}, {"轮奸", "porn", "block"}, {"迷奸", "porn", "block"},
		{"性虐待", "porn", "block"}, {"SM调教", "porn", "block"}, {"援交", "porn", "block"},
		{"包养", "porn", "block"}, {"找小姐", "porn", "block"}, {"全套服务", "porn", "block"},
		{"上门服务", "porn", "block"}, {"楼凤", "porn", "block"}, {"站街女", "porn", "block"},
		{"无码", "porn", "block"}, {"有码", "porn", "block"}, {"中出", "porn", "block"},
		{"颜射", "porn", "block"}, {"潮吹", "porn", "block"}, {"内射", "porn", "block"},
		{"春宫图", "porn", "block"}, {"成人用品", "porn", "block"}, {"飞机杯", "porn", "block"},
		// 英文色情
		{"porn", "porn", "block"}, {"nsfw", "porn", "block"}, {"nude", "porn", "block"},
		{"naked", "porn", "block"}, {"xxx", "porn", "block"}, {"hentai", "porn", "block"},
		{"blowjob", "porn", "block"}, {"handjob", "porn", "block"}, {"orgasm", "porn", "block"},
		{"pussy", "porn", "block"}, {"cock", "porn", "block"}, {"boobs", "porn", "block"},
		{"milf", "porn", "block"}, {"dildo", "porn", "block"}, {"masturbate", "porn", "block"},
		{"erotic", "porn", "block"}, {"bondage", "porn", "block"}, {"fetish", "porn", "block"},
		{"stripper", "porn", "block"}, {"gangbang", "porn", "block"}, {"threesome", "porn", "block"},
		{"creampie", "porn", "block"}, {"deepthroat", "porn", "block"}, {"camgirl", "porn", "block"},
		{"onlyfans", "porn", "block"}, {"topless", "porn", "block"}, {"uncensored", "porn", "block"},
		{"sexy", "porn", "review"}, {"sexual", "porn", "review"},

		// ==================== 暴力 violence (block) ====================
		{"杀人", "violence", "block"}, {"自杀方法", "violence", "block"}, {"炸弹制作", "violence", "block"},
		{"恐怖袭击", "violence", "block"}, {"血腥", "violence", "block"}, {"砍人", "violence", "block"},
		{"枪击", "violence", "block"}, {"爆炸物", "violence", "block"}, {"投毒", "violence", "block"},
		{"虐待", "violence", "block"}, {"屠杀", "violence", "block"}, {"分尸", "violence", "block"},
		{"肢解", "violence", "block"}, {"活埋", "violence", "block"}, {"割喉", "violence", "block"},
		{"纵火", "violence", "block"}, {"绑架", "violence", "block"}, {"劫持", "violence", "block"},
		{"酷刑", "violence", "block"}, {"虐杀", "violence", "block"}, {"私刑", "violence", "block"},
		{"斩首", "violence", "block"}, {"暴力袭击", "violence", "block"},
		{"自杀教程", "violence", "block"}, {"割腕教程", "violence", "block"},
		{"上吊方法", "violence", "block"}, {"服毒自杀", "violence", "block"},
		{"枪支买卖", "violence", "block"}, {"管制刀具", "violence", "block"},
		{"火药配方", "violence", "block"}, {"雷管", "violence", "block"},
		// 英文暴力
		{"murder", "violence", "block"}, {"suicide method", "violence", "block"},
		{"bomb making", "violence", "block"}, {"terrorist", "violence", "block"},
		{"massacre", "violence", "block"}, {"beheading", "violence", "block"},
		{"torture", "violence", "block"}, {"gore", "violence", "block"},
		{"dismember", "violence", "block"}, {"how to kill", "violence", "block"},
		{"snuff", "violence", "block"}, {"stabbing", "violence", "block"},

		// ==================== 政治敏感 politics (review) ====================
		{"翻墙", "politics", "review"}, {"VPN", "politics", "review"},
		{"六四", "politics", "review"}, {"天安门事件", "politics", "review"},
		{"法轮功", "politics", "review"}, {"藏独", "politics", "review"},
		{"台独", "politics", "review"}, {"疆独", "politics", "review"},
		{"颠覆政权", "politics", "block"}, {"推翻政府", "politics", "block"},
		{"民主运动", "politics", "review"}, {"达赖喇嘛", "politics", "review"},
		{"流亡政府", "politics", "review"}, {"独立运动", "politics", "review"},
		{"邪教", "politics", "block"}, {"全能神", "politics", "block"},
		{"东突", "politics", "review"}, {"天安门大屠杀", "politics", "block"},
		{"言论自由", "politics", "review"}, {"新闻自由", "politics", "review"},

		// ==================== 毒品 drugs → violence (block) ====================
		{"贩毒", "violence", "block"}, {"吸毒", "violence", "block"}, {"制毒", "violence", "block"},
		{"冰毒", "violence", "block"}, {"海洛因", "violence", "block"}, {"大麻", "violence", "block"},
		{"可卡因", "violence", "block"}, {"摇头丸", "violence", "block"}, {"K粉", "violence", "block"},
		{"氯胺酮", "violence", "block"}, {"麻古", "violence", "block"}, {"鸦片", "violence", "block"},
		{"安非他命", "violence", "block"}, {"致幻剂", "violence", "block"}, {"笑气", "violence", "review"},
		{"迷药", "violence", "block"}, {"迷幻蘑菇", "violence", "block"}, {"毒品交易", "violence", "block"},
		{"drug dealer", "violence", "block"}, {"cocaine", "violence", "block"},
		{"heroin", "violence", "block"}, {"methamphetamine", "violence", "block"},
		{"marijuana", "violence", "review"}, {"ecstasy", "violence", "block"},
		{"LSD", "violence", "block"}, {"fentanyl", "violence", "block"},

		// ==================== 赌博 gambling → ad (block) ====================
		{"赌博网站", "ad", "block"}, {"网络赌博", "ad", "block"}, {"在线赌场", "ad", "block"},
		{"百家乐", "ad", "block"}, {"澳门赌场", "ad", "block"}, {"赌球", "ad", "block"},
		{"赌马", "ad", "block"}, {"外围赌球", "ad", "block"}, {"六合彩", "ad", "block"},
		{"时时彩", "ad", "block"}, {"北京赛车", "ad", "block"}, {"幸运飞艇", "ad", "block"},
		{"黑彩", "ad", "block"}, {"私彩", "ad", "block"}, {"博彩平台", "ad", "block"},
		{"赌博代理", "ad", "block"}, {"棋牌赌博", "ad", "block"},

		// ==================== 诈骗/广告 ad (review) ====================
		{"刷单", "ad", "review"}, {"兼职日结", "ad", "review"}, {"代开发票", "ad", "review"},
		{"网赚", "ad", "review"}, {"高仿", "ad", "review"}, {"代购假货", "ad", "review"},
		{"代孕", "ad", "block"}, {"办假证", "ad", "block"}, {"假文凭", "ad", "block"},
		{"代写论文", "ad", "review"}, {"信用卡套现", "ad", "block"}, {"洗钱", "ad", "block"},
		{"传销", "ad", "block"}, {"庞氏骗局", "ad", "block"}, {"杀猪盘", "ad", "block"},
		{"网络诈骗", "ad", "block"}, {"钓鱼网站", "ad", "block"}, {"短信诈骗", "ad", "block"},
		{"电信诈骗", "ad", "block"}, {"刷信誉", "ad", "review"}, {"加微信赚钱", "ad", "review"},
		{"免费领取", "ad", "review"}, {"日赚千元", "ad", "review"}, {"躺赚", "ad", "review"},
	}

	for _, s := range seeds {
		var existing model.SensitiveWord
		if err := db.Where("word = ?", s.word).First(&existing).Error; err != nil {
			db.Create(&model.SensitiveWord{
				Word:     s.word,
				Category: s.category,
				Level:    s.level,
				Status:   "active",
			})
		}
	}
}

// SeedReferralSettings ensures default referral/invitation reward settings exist
func SeedReferralSettings(db *gorm.DB) {
	defaults := []model.SystemSetting{
		{Group: "referral", Key: "enabled", Value: "true", Label: "邀请功能开关", Type: "switch", Remark: "关闭后前端不展示邀请入口"},
		{Group: "referral", Key: "registration_bonus", Value: "200", Label: "注册奖励积分", Type: "text", Remark: "被邀请人成功注册后，双方各获得的积分数量"},
		{Group: "referral", Key: "commission_enabled", Value: "true", Label: "分佣功能开关", Type: "switch", Remark: "开启后被邀请人消费时给邀请人分佣"},
		{Group: "referral", Key: "commission_rate", Value: "10", Label: "佣金比例 (%)", Type: "text", Remark: "被邀请人支付金额的分佣比例，如 10 表示 10%"},
		{Group: "referral", Key: "commission_valid_days", Value: "365", Label: "分佣有效期 (天)", Type: "text", Remark: "被邀请人注册后多少天内消费可产生佣金"},
		{Group: "referral", Key: "min_withdraw_amount", Value: "10", Label: "最低提现金额 (元)", Type: "text", Remark: "佣金累计达到此金额后可申请提现"},
	}
	for _, s := range defaults {
		var existing model.SystemSetting
		if err := db.Where("setting_group = ? AND setting_key = ?", s.Group, s.Key).First(&existing).Error; err != nil {
			db.Create(&s)
		}
	}
}

// SeedPaymentSettings ensures default payment settings exist
func SeedPaymentSettings(db *gorm.DB) {
	defaults := []model.SystemSetting{
		{Group: "payment", Key: "mock_enabled", Value: "true", Label: "模拟支付模式", Type: "switch", Remark: "开启后使用模拟支付，无需真实支付渠道"},
		{Group: "payment", Key: "wechat_app_id", Value: "", Label: "微信 AppID", Type: "text", Remark: "微信支付应用 ID"},
		{Group: "payment", Key: "wechat_mch_id", Value: "", Label: "微信商户号", Type: "text", Remark: "微信支付商户号"},
		{Group: "payment", Key: "wechat_api_key_v3", Value: "", Label: "微信 API V3 密钥", Type: "password", Remark: "微信支付 API V3 密钥"},
		{Group: "payment", Key: "wechat_serial_no", Value: "", Label: "微信证书序列号", Type: "text", Remark: "微信支付证书序列号"},
		{Group: "payment", Key: "wechat_notify_url", Value: "http://localhost:8080/api/v1/payment/wechat/notify", Label: "微信回调地址", Type: "text", Remark: "微信支付异步通知地址"},
		{Group: "payment", Key: "alipay_app_id", Value: "", Label: "支付宝 AppID", Type: "text", Remark: "支付宝应用 ID"},
		{Group: "payment", Key: "alipay_private_key", Value: "", Label: "支付宝私钥", Type: "password", Remark: "支付宝应用私钥"},
		{Group: "payment", Key: "alipay_public_key", Value: "", Label: "支付宝公钥", Type: "password", Remark: "支付宝公钥"},
		{Group: "payment", Key: "alipay_notify_url", Value: "http://localhost:8080/api/v1/payment/alipay/notify", Label: "支付宝回调地址", Type: "text", Remark: "支付宝异步通知地址"},
		{Group: "payment", Key: "alipay_sandbox", Value: "true", Label: "支付宝沙箱模式", Type: "switch", Remark: "开启后使用支付宝沙箱环境"},
	}

	for _, s := range defaults {
		var existing model.SystemSetting
		if err := db.Where("setting_group = ? AND setting_key = ?", s.Group, s.Key).First(&existing).Error; err != nil {
			db.Create(&s)
		}
	}
}
