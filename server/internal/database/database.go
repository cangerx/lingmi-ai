package database

import (
	"log"

	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg *config.Config) (*gorm.DB, error) {
	logLevel := logger.Info
	if cfg.Server.Mode == "release" {
		logLevel = logger.Warn
	}

	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	log.Println("Database connected")
	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&model.User{},
		&model.UserCredits{},
		&model.CreditLog{},
		&model.Channel{},
		&model.Model{},
		&model.Conversation{},
		&model.Message{},
		&model.Generation{},
		&model.Order{},
		&model.Package{},
		&model.RedeemCode{},
		&model.RedeemLog{},
		&model.Notification{},
		&model.AdminUser{},
		&model.Role{},
		&model.AdminLog{},
		&model.Ad{},
		&model.AdSlot{},
		&model.AdStat{},
	)
}
