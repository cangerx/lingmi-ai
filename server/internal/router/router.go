package router

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/handler"
	"github.com/lingmiai/server/internal/middleware"
	"github.com/lingmiai/server/internal/service"
	"github.com/lingmiai/server/internal/storage"
	"gorm.io/gorm"
)

func Setup(cfg *config.Config, db *gorm.DB) *gin.Engine {
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	r.Use(middleware.CORS())

	// Storage & services
	store := storage.NewStorage(cfg)
	imageSvc := service.NewImageService(db, store)
	paymentSvc := service.NewPaymentService(db, cfg)

	// Static file serving for uploads
	r.Static("/uploads", store.BasePath())

	// Handlers
	smsSvc := service.NewSMSService(db)
	authHandler := &handler.AuthHandler{DB: db, Cfg: cfg, SMS: smsSvc}
	llmService := service.NewLLMService(db)
	moderationSvc := service.NewModerationService(db, llmService)
	userHandler := &handler.UserHandler{DB: db, Moderation: moderationSvc}
	chatHandler := &handler.ChatHandler{DB: db, Cfg: cfg, LLM: llmService, Moderation: moderationSvc}
	imageHandler := &handler.ImageHandler{DB: db, ImageSvc: imageSvc, LLM: llmService, Moderation: moderationSvc}
	uploadHandler := &handler.UploadHandler{Storage: store}
	packageHandler := &handler.PackageHandler{DB: db}
	orderHandler := &handler.OrderHandler{DB: db, Payment: paymentSvc}
	paymentNotifyHandler := &handler.PaymentNotifyHandler{Payment: paymentSvc}
	redeemHandler := &handler.RedeemHandler{DB: db}
	notifHandler := &handler.NotificationHandler{DB: db}
	adHandler := &handler.AdHandler{DB: db}
	modelHandler := &handler.ModelHandler{DB: db}
	spaceHandler := &handler.SpaceHandler{DB: db, Storage: store}

	// API v1
	v1 := r.Group("/api/v1")
	{
		// Public routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/send-code", authHandler.SendCode)
			auth.POST("/phone-login", authHandler.PhoneLogin)
			auth.POST("/oauth", authHandler.OAuthLogin)
		}

		// Health check
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		// Public data (cached 2 min)
		public := v1.Group("")
		public.Use(middleware.CacheResponse(2 * time.Minute))
		{
			public.GET("/packages", packageHandler.List)
			public.GET("/notifications", notifHandler.List)
			public.GET("/ads", adHandler.List)
			public.GET("/models", modelHandler.List)

			// Inspirations
			inspirationHandler := &handler.InspirationHandler{DB: db}
			public.GET("/inspirations", inspirationHandler.List)
			public.GET("/inspirations/tags", inspirationHandler.Tags)

			// Templates
			templateHandler := &handler.TemplateHandler{DB: db}
			public.GET("/templates", templateHandler.List)
			public.GET("/templates/filters", templateHandler.Filters)

			// Prompt templates
			promptTemplateHandler := &handler.PromptTemplateHandler{DB: db}
			public.GET("/prompt-templates", promptTemplateHandler.List)
			public.GET("/prompt-templates/categories", promptTemplateHandler.Categories)
		}

		// Settings-driven APIs (no cache, so admin changes take effect immediately)
		{
			appSettingHandler := &handler.AdminSettingHandler{DB: db}
			v1.GET("/app/modules", appSettingHandler.AppModules)
			v1.GET("/app/login-methods", appSettingHandler.LoginMethods)
			v1.GET("/app/site-config", appSettingHandler.SiteConfig)
		}

		// Payment callbacks (public, no auth)
		v1.POST("/payment/wechat/notify", paymentNotifyHandler.WechatNotify)
		v1.POST("/payment/alipay/notify", paymentNotifyHandler.AlipayNotify)
		v1.POST("/payment/tianque/notify", paymentNotifyHandler.TianqueNotify)

		// Protected routes (60 RPM per user)
		protected := v1.Group("")
		protected.Use(middleware.JWTAuth(cfg.JWT.Secret))
		protected.Use(middleware.RateLimit(60))
		{
			// Auth
			protected.GET("/auth/profile", authHandler.GetProfile)
			protected.POST("/auth/refresh", authHandler.RefreshToken)

			// User
			protected.GET("/user/credits", userHandler.GetCredits)
			protected.GET("/user/credit-logs", userHandler.GetCreditLogs)
			protected.GET("/user/usage-stats", userHandler.GetUsageStats)
			protected.PUT("/user/profile", userHandler.UpdateProfile)
			protected.PUT("/user/password", userHandler.ChangePassword)

			// Orders
			protected.GET("/orders", orderHandler.List)
			protected.POST("/orders", orderHandler.Create)
			protected.GET("/orders/:id", orderHandler.Get)
			protected.GET("/order-status/:order_no", orderHandler.PayStatus)

			// Redeem
			protected.POST("/redeem", redeemHandler.Redeem)

			// Conversations
			protected.GET("/conversations", chatHandler.ListConversations)
			protected.POST("/conversations", chatHandler.CreateConversation)
			protected.GET("/conversations/:id", chatHandler.GetConversation)
			protected.PUT("/conversations/:id", chatHandler.UpdateConversation)
			protected.DELETE("/conversations/:id", chatHandler.DeleteConversation)
			protected.POST("/conversations/:id/messages", middleware.ChatRateLimit(20), chatHandler.SendMessage)
			protected.POST("/conversations/:id/stream", middleware.ChatRateLimit(20), chatHandler.StreamMessage)

			// Upload
			protected.POST("/upload", uploadHandler.Upload)

			// Image AI (10 RPM for AI generation)
			image := protected.Group("/image")
			image.Use(middleware.ChatRateLimit(10))
			{
				image.POST("/product-photo", imageHandler.ProductPhoto)
				image.POST("/cutout", imageHandler.Cutout)
				image.POST("/eraser", imageHandler.Eraser)
				image.POST("/expand", imageHandler.Expand)
				image.POST("/upscale", imageHandler.Upscale)
				image.POST("/poster", imageHandler.Poster)
				image.POST("/generate", imageHandler.Generate)
				image.POST("/optimize-prompt", imageHandler.OptimizePrompt)
			}
			protected.GET("/generations", imageHandler.ListGenerations)
			protected.GET("/generations/:id", imageHandler.GetGeneration)
			protected.DELETE("/generations/:id", imageHandler.DeleteGeneration)
			protected.POST("/inspirations/publish", imageHandler.PublishToInspiration)

			// Brand Kit (multi-brand)
			brandKitHandler := &handler.BrandKitHandler{DB: db, Storage: store, LLM: llmService}
			protected.GET("/brand-kits", brandKitHandler.List)
			protected.GET("/brand-kits/:id", brandKitHandler.Get)
			protected.POST("/brand-kits", brandKitHandler.Create)
			protected.PUT("/brand-kits/:id", brandKitHandler.Update)
			protected.DELETE("/brand-kits/:id", brandKitHandler.Delete)
			protected.PUT("/brand-kits/:id/default", brandKitHandler.SetDefault)
			protected.POST("/brand-kits/:id/parse-manual", brandKitHandler.ParseManual)

			// User asset space
			space := protected.Group("/space")
			{
				space.GET("/quota", spaceHandler.GetQuota)
				space.GET("/folders", spaceHandler.ListFolders)
				space.POST("/folders", spaceHandler.CreateFolder)
				space.PUT("/folders/:id", spaceHandler.UpdateFolder)
				space.DELETE("/folders/:id", spaceHandler.DeleteFolder)
				space.GET("/files", spaceHandler.ListFiles)
				space.POST("/files", spaceHandler.UploadFile)
				space.PUT("/files/:id", spaceHandler.UpdateFile)
				space.DELETE("/files/:id", spaceHandler.DeleteFile)
			}

			// Referral
			referralHandler := &handler.ReferralHandler{DB: db}
			protected.GET("/referral/stats", referralHandler.Stats)
			protected.GET("/referral/commissions", referralHandler.Commissions)
			protected.GET("/referral/invitees", referralHandler.Invitees)
		}

		// Public model config API (for user-facing app)
		publicModelHandler := &handler.AdminModelHandler{DB: db}
		v1.GET("/models/image-models", publicModelHandler.ListImageModels)

		// Admin auth (public)
		adminAuthHandler := &handler.AdminAuthHandler{DB: db, Cfg: cfg}
		v1.POST("/admin/auth/login", adminAuthHandler.Login)

		// Admin routes (protected)
		admin := v1.Group("/admin")
		admin.Use(middleware.JWTAuth(cfg.JWT.Secret))
		admin.Use(middleware.AdminAuth())
		{
			admin.GET("/health", func(c *gin.Context) {
				c.JSON(200, gin.H{"status": "admin ok"})
			})

			// Admin profile
			admin.GET("/auth/profile", adminAuthHandler.GetProfile)
			admin.PUT("/auth/password", adminAuthHandler.ChangePassword)

			// Dashboard
			dashboardHandler := &handler.AdminDashboardHandler{DB: db}
			admin.GET("/dashboard/stats", dashboardHandler.Stats)
			admin.GET("/dashboard/trends", dashboardHandler.Trends)

			// Users
			adminUserHandler := &handler.AdminUserHandler{DB: db}
			admin.GET("/users", adminUserHandler.List)
			admin.GET("/users/:id", adminUserHandler.Get)
			admin.PUT("/users/:id/status", adminUserHandler.UpdateStatus)
			admin.POST("/users/:id/credits", adminUserHandler.AdjustCredits)
			admin.GET("/users/:id/credit-logs", adminUserHandler.GetCreditLogs)
			admin.POST("/users/:id/recharge-package", adminUserHandler.RechargePackage)

			// Channels
			adminChannelHandler := &handler.AdminChannelHandler{DB: db}
			admin.GET("/channels", adminChannelHandler.List)
			admin.POST("/channels", adminChannelHandler.Create)
			admin.PUT("/channels/:id", adminChannelHandler.Update)
			admin.DELETE("/channels/:id", adminChannelHandler.Delete)
			admin.POST("/channels/fetch-models", adminChannelHandler.FetchModels)
			admin.POST("/channels/add-models", adminChannelHandler.AddModelsFromChannel)

			// Models
			adminModelHandler := &handler.AdminModelHandler{DB: db}
			admin.GET("/models", adminModelHandler.List)
			admin.POST("/models", adminModelHandler.Create)
			admin.PUT("/models/:id", adminModelHandler.Update)
			admin.DELETE("/models/:id", adminModelHandler.Delete)
			admin.POST("/models/probe", adminModelHandler.Probe)
			admin.GET("/models/unlinked", adminModelHandler.UnlinkedModels)
			admin.POST("/models/seed-image", adminModelHandler.SeedImageModels)
			admin.GET("/models/config/:name", adminModelHandler.GetConfig)
			admin.PUT("/models/config/:name", adminModelHandler.UpdateConfig)

			// Model sync
			adminModelSyncHandler := &handler.AdminModelSyncHandler{DB: db}
			admin.POST("/models/sync-openrouter", adminModelSyncHandler.SyncOpenRouter)

			// Orders
			adminOrderHandler := &handler.AdminOrderHandler{DB: db}
			admin.GET("/orders", adminOrderHandler.List)
			admin.GET("/orders/:id", adminOrderHandler.Get)
			admin.PUT("/orders/:id/status", adminOrderHandler.UpdateStatus)
			admin.POST("/orders/:id/refund", adminOrderHandler.Refund)

			// Packages
			adminPackageHandler := &handler.AdminPackageHandler{DB: db}
			admin.GET("/packages", adminPackageHandler.List)
			admin.POST("/packages", adminPackageHandler.Create)
			admin.PUT("/packages/:id", adminPackageHandler.Update)
			admin.DELETE("/packages/:id", adminPackageHandler.Delete)

			// Redeem codes
			adminRedeemHandler := &handler.AdminRedeemHandler{DB: db}
			admin.GET("/redeem-codes", adminRedeemHandler.List)
			admin.POST("/redeem-codes/batch", adminRedeemHandler.BatchCreate)
			admin.PUT("/redeem-codes/:id/status", adminRedeemHandler.UpdateStatus)
			admin.DELETE("/redeem-codes/:id", adminRedeemHandler.Delete)
			admin.GET("/redeem-codes/logs", adminRedeemHandler.Logs)

			// Notifications
			adminNotifHandler := &handler.AdminNotificationHandler{DB: db}
			admin.GET("/notifications", adminNotifHandler.List)
			admin.POST("/notifications", adminNotifHandler.Create)
			admin.PUT("/notifications/:id", adminNotifHandler.Update)
			admin.DELETE("/notifications/:id", adminNotifHandler.Delete)

			// Ads
			adminAdHandler := &handler.AdminAdHandler{DB: db}
			admin.GET("/ads", adminAdHandler.List)
			admin.POST("/ads", adminAdHandler.Create)
			admin.PUT("/ads/:id", adminAdHandler.Update)
			admin.DELETE("/ads/:id", adminAdHandler.Delete)
			admin.GET("/ads/:id/stats", adminAdHandler.Stats)

			// Generations
			adminGenHandler := &handler.AdminGenerationHandler{DB: db}
			admin.GET("/generations", adminGenHandler.List)
			admin.GET("/generations/:id", adminGenHandler.Get)

			// Settings
			adminSettingHandler := &handler.AdminSettingHandler{DB: db}
			admin.GET("/settings/:group", adminSettingHandler.ListByGroup)
			admin.PUT("/settings/:group", adminSettingHandler.BatchUpdate)

			// Upload (admin)
			admin.POST("/upload", uploadHandler.Upload)

			// Inspirations
			adminInspirationHandler := &handler.AdminInspirationHandler{DB: db}
			admin.GET("/inspirations", adminInspirationHandler.List)
			admin.POST("/inspirations", adminInspirationHandler.Create)
			admin.PUT("/inspirations/:id", adminInspirationHandler.Update)
			admin.DELETE("/inspirations/:id", adminInspirationHandler.Delete)
			admin.PUT("/inspirations/:id/status", adminInspirationHandler.UpdateStatus)
			admin.PUT("/inspirations/:id/featured", adminInspirationHandler.ToggleFeatured)

			// Moderation
			adminModerationHandler := &handler.AdminModerationHandler{DB: db, Moderation: moderationSvc}
			admin.GET("/moderation/logs", adminModerationHandler.ListLogs)
			admin.PUT("/moderation/:id/review", adminModerationHandler.Review)
			admin.GET("/moderation/stats", adminModerationHandler.Stats)
			admin.GET("/moderation/words", adminModerationHandler.ListWords)
			admin.POST("/moderation/words", adminModerationHandler.CreateWord)
			admin.PUT("/moderation/words/:id", adminModerationHandler.UpdateWord)
			admin.DELETE("/moderation/words/:id", adminModerationHandler.DeleteWord)
			admin.POST("/moderation/words/import", adminModerationHandler.ImportWords)

			// Logs
			adminLogHandler := &handler.AdminLogHandler{DB: db}
			admin.GET("/logs", adminLogHandler.List)
		}
	}

	// Mock payment endpoint (testing only)
	if cfg.Payment.Mock {
		v1.POST("/payment/mock-pay/:order_no", orderHandler.MockPay)
	}

	return r
}
