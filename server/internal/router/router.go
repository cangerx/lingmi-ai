package router

import (
	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/handler"
	"github.com/lingmiai/server/internal/middleware"
	"github.com/lingmiai/server/internal/service"
	"gorm.io/gorm"
)

func Setup(cfg *config.Config, db *gorm.DB) *gin.Engine {
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	r.Use(middleware.CORS())

	// Handlers
	authHandler := &handler.AuthHandler{DB: db, Cfg: cfg}
	userHandler := &handler.UserHandler{DB: db}
	llmService := service.NewLLMService(db)
	chatHandler := &handler.ChatHandler{DB: db, Cfg: cfg, LLM: llmService}
	imageHandler := &handler.ImageHandler{DB: db}

	// API v1
	v1 := r.Group("/api/v1")
	{
		// Public routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// Health check
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		// Protected routes
		protected := v1.Group("")
		protected.Use(middleware.JWTAuth(cfg.JWT.Secret))
		{
			// Auth
			protected.GET("/auth/profile", authHandler.GetProfile)
			protected.POST("/auth/refresh", authHandler.RefreshToken)

			// User
			protected.GET("/user/credits", userHandler.GetCredits)
			protected.GET("/user/credit-logs", userHandler.GetCreditLogs)
			protected.PUT("/user/profile", userHandler.UpdateProfile)

			// Conversations
			protected.GET("/conversations", chatHandler.ListConversations)
			protected.POST("/conversations", chatHandler.CreateConversation)
			protected.GET("/conversations/:id", chatHandler.GetConversation)
			protected.PUT("/conversations/:id", chatHandler.UpdateConversation)
			protected.DELETE("/conversations/:id", chatHandler.DeleteConversation)
			protected.POST("/conversations/:id/messages", chatHandler.SendMessage)
			protected.POST("/conversations/:id/stream", chatHandler.StreamMessage)

			// Image AI
			image := protected.Group("/image")
			{
				image.POST("/product-photo", imageHandler.ProductPhoto)
				image.POST("/cutout", imageHandler.Cutout)
				image.POST("/eraser", imageHandler.Eraser)
				image.POST("/expand", imageHandler.Expand)
				image.POST("/upscale", imageHandler.Upscale)
				image.POST("/poster", imageHandler.Poster)
				image.POST("/generate", imageHandler.Generate)
			}
			protected.GET("/generations", imageHandler.ListGenerations)
		}

		// Admin routes
		admin := v1.Group("/admin")
		admin.Use(middleware.JWTAuth(cfg.JWT.Secret))
		admin.Use(middleware.AdminAuth())
		{
			admin.GET("/health", func(c *gin.Context) {
				c.JSON(200, gin.H{"status": "admin ok"})
			})

			// Users
			adminUserHandler := &handler.AdminUserHandler{DB: db}
			admin.GET("/users", adminUserHandler.List)
			admin.GET("/users/:id", adminUserHandler.Get)
			admin.PUT("/users/:id/status", adminUserHandler.UpdateStatus)
			admin.POST("/users/:id/credits", adminUserHandler.AdjustCredits)

			// Channels
			adminChannelHandler := &handler.AdminChannelHandler{DB: db}
			admin.GET("/channels", adminChannelHandler.List)
			admin.POST("/channels", adminChannelHandler.Create)
			admin.PUT("/channels/:id", adminChannelHandler.Update)
			admin.DELETE("/channels/:id", adminChannelHandler.Delete)

			// Models
			adminModelHandler := &handler.AdminModelHandler{DB: db}
			admin.GET("/models", adminModelHandler.List)
			admin.POST("/models", adminModelHandler.Create)
			admin.PUT("/models/:id", adminModelHandler.Update)
			admin.DELETE("/models/:id", adminModelHandler.Delete)
		}
	}

	return r
}
