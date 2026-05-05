package main

import (
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/database"
	"github.com/lingmiai/server/internal/model"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to migrate: %v", err)
	}

	// Check if templates already seeded
	var count int64
	db.Model(&model.Template{}).Count(&count)
	if count > 0 {
		fmt.Printf("→ Templates already seeded (%d records), skipping\n", count)
		return
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	templates := generateTemplates(rng)

	for i := range templates {
		if err := db.Create(&templates[i]).Error; err != nil {
			log.Printf("Failed to create template %d: %v", i, err)
		}
	}
	fmt.Printf("✓ Seeded %d templates\n", len(templates))
}

func generateTemplates(rng *rand.Rand) []model.Template {
	// Use picsum.photos for high-quality placeholder images
	img := func(id, w, h int) string {
		return fmt.Sprintf("https://picsum.photos/id/%d/%d/%d", id, w, h)
	}

	templates := []model.Template{
		// ═══ 电商 ═══
		{Title: "618大促主图直通车", Description: "红色喜庆618活动主图，高点击率", ImageURL: img(1, 800, 800), Category: "常规模板", Scene: "电商", Usage: "营销带货", Industry: "通用", Style: "喜庆", Color: "红色", Layout: "方形", Width: 800, Height: 800, Downloads: 3420, Views: 18200, Featured: true, Sort: 1, Status: "active"},
		{Title: "双11狂欢购物节海报", Description: "紫色渐变双11大促海报", ImageURL: img(10, 750, 1000), Category: "常规模板", Scene: "电商", Usage: "营销带货", Industry: "通用", Style: "时尚", Color: "紫色", Layout: "竖版", Width: 750, Height: 1000, Downloads: 2890, Views: 15600, Featured: true, Sort: 2, Status: "active"},
		{Title: "年货节食品促销", Description: "新年年货节食品零食促销主图", ImageURL: img(20, 800, 800), Category: "常规模板", Scene: "电商", Usage: "营销带货", Industry: "餐饮美食", Style: "国潮", Color: "红色", Layout: "方形", Width: 800, Height: 800, Downloads: 1560, Views: 9800, Status: "active"},
		{Title: "美妆护肤品详情页", Description: "清新风格护肤品详情页模板", ImageURL: img(30, 750, 1200), Category: "常规模板", Scene: "电商", Usage: "营销带货", Industry: "美发护肤", Style: "简约", Color: "白色", Layout: "竖版", Width: 750, Height: 1200, Downloads: 2100, Views: 12300, Status: "active"},
		{Title: "数码产品科技风主图", Description: "深色科技感数码产品主图", ImageURL: img(40, 800, 800), Category: "常规模板", Scene: "电商", Usage: "营销带货", Industry: "数码家电", Style: "科技", Color: "黑色", Layout: "方形", Width: 800, Height: 800, Downloads: 1870, Views: 10500, Status: "active"},
		{Title: "母婴用品温馨促销", Description: "粉色温馨母婴用品促销图", ImageURL: img(50, 800, 800), Category: "常规模板", Scene: "电商", Usage: "营销带货", Industry: "母婴亲子", Style: "温馨", Color: "粉色", Layout: "方形", Width: 800, Height: 800, Downloads: 1340, Views: 8900, Status: "active"},
		{Title: "服装新品上市banner", Description: "时尚简约服装新品横版banner", ImageURL: img(60, 1200, 500), Category: "常规模板", Scene: "电商", Usage: "营销带货", Industry: "鞋服箱包", Style: "时尚", Color: "黑色", Layout: "横版", Width: 1200, Height: 500, Downloads: 2560, Views: 14200, Status: "active"},
		{Title: "家居生活好物推荐", Description: "北欧风家居生活用品推荐图", ImageURL: img(70, 800, 800), Category: "常规模板", Scene: "电商", Usage: "营销带货", Industry: "家居家装", Style: "简约", Color: "白色", Layout: "方形", Width: 800, Height: 800, Downloads: 980, Views: 6700, Status: "active"},
		{Title: "生鲜水果限时抢购", Description: "绿色清新水果生鲜抢购主图", ImageURL: img(80, 800, 800), Category: "常规模板", Scene: "电商", Usage: "营销带货", Industry: "食品生鲜", Style: "清新", Color: "绿色", Layout: "方形", Width: 800, Height: 800, Downloads: 1120, Views: 7400, Status: "active"},
		{Title: "跨境电商英文主图", Description: "极简风格跨境电商产品主图", ImageURL: img(90, 800, 800), Category: "常规模板", Scene: "电商", Usage: "营销带货", Industry: "通用", Style: "极简", Color: "白色", Layout: "方形", Width: 800, Height: 800, Downloads: 760, Views: 5200, Status: "active"},

		// ═══ 社交媒体 ═══
		{Title: "小红书美食分享封面", Description: "粉色可爱美食探店封面图", ImageURL: img(100, 1080, 1440), Category: "常规模板", Scene: "社交媒体", Usage: "晒照分享", Industry: "餐饮美食", Style: "可爱", Color: "粉色", Layout: "竖版", Width: 1080, Height: 1440, Downloads: 4560, Views: 23400, Featured: true, Sort: 3, Status: "active"},
		{Title: "旅行打卡九宫格", Description: "文艺风旅行打卡拼图模板", ImageURL: img(110, 1080, 1080), Category: "常规模板", Scene: "社交媒体", Usage: "晒照分享", Industry: "旅游出行", Style: "文艺", Color: "蓝色", Layout: "方形", Width: 1080, Height: 1080, Downloads: 3200, Views: 18700, Status: "active"},
		{Title: "好物测评对比图", Description: "清新对比测评图文模板", ImageURL: img(120, 1080, 1440), Category: "常规模板", Scene: "社交媒体", Usage: "干货科普", Industry: "通用", Style: "清新", Color: "绿色", Layout: "竖版", Width: 1080, Height: 1440, Downloads: 2340, Views: 14500, Status: "active"},
		{Title: "ins风穿搭日记", Description: "极简ins风穿搭分享模板", ImageURL: img(130, 1080, 1350), Category: "常规模板", Scene: "社交媒体", Usage: "晒照分享", Industry: "鞋服箱包", Style: "极简", Color: "白色", Layout: "竖版", Width: 1080, Height: 1350, Downloads: 1980, Views: 12600, Status: "active"},
		{Title: "健身打卡记录", Description: "运动健身打卡记录模板", ImageURL: img(140, 1080, 1080), Category: "常规模板", Scene: "社交媒体", Usage: "晒照分享", Industry: "休闲娱乐", Style: "活力", Color: "橙色", Layout: "方形", Width: 1080, Height: 1080, Downloads: 1560, Views: 9800, Status: "active"},

		// ═══ 微信营销 ═══
		{Title: "朋友圈产品宣传图", Description: "高端大气朋友圈产品宣传", ImageURL: img(150, 1080, 1920), Category: "常规模板", Scene: "微信营销", Usage: "宣传推广", Industry: "通用", Style: "商务", Color: "蓝色", Layout: "竖版", Width: 1080, Height: 1920, Downloads: 3450, Views: 19800, Featured: true, Sort: 4, Status: "active"},
		{Title: "微信群裂变海报", Description: "社群裂变引流活动海报", ImageURL: img(160, 750, 1334), Category: "常规模板", Scene: "微信营销", Usage: "宣传推广", Industry: "通用", Style: "时尚", Color: "红色", Layout: "竖版", Width: 750, Height: 1334, Downloads: 2780, Views: 16400, Status: "active"},
		{Title: "节日祝福贺卡", Description: "温馨节日祝福电子贺卡", ImageURL: img(170, 1080, 1080), Category: "常规模板", Scene: "微信营销", Usage: "祝福问候", Industry: "通用", Style: "温馨", Color: "红色", Layout: "方形", Width: 1080, Height: 1080, Downloads: 5670, Views: 32100, Status: "active"},
		{Title: "中秋团圆祝福", Description: "中秋节团圆祝福贺卡", ImageURL: img(180, 1080, 1080), Category: "常规模板", Scene: "微信营销", Usage: "祝福问候", Industry: "通用", Style: "国潮", Color: "金色", Layout: "方形", Width: 1080, Height: 1080, Downloads: 4230, Views: 25600, Status: "active"},
		{Title: "春节拜年贺卡", Description: "红色喜庆春节拜年贺卡", ImageURL: img(190, 1080, 1920), Category: "常规模板", Scene: "微信营销", Usage: "祝福问候", Industry: "通用", Style: "喜庆", Color: "红色", Layout: "竖版", Width: 1080, Height: 1920, Downloads: 6780, Views: 41200, Status: "active"},
		{Title: "餐饮开业活动", Description: "餐饮店铺开业活动宣传图", ImageURL: img(200, 750, 1334), Category: "常规模板", Scene: "微信营销", Usage: "宣传推广", Industry: "餐饮美食", Style: "活力", Color: "橙色", Layout: "竖版", Width: 750, Height: 1334, Downloads: 1890, Views: 11200, Status: "active"},

		// ═══ 公众号 ═══
		{Title: "公众号首图科技风", Description: "科技资讯公众号文章首图", ImageURL: img(210, 900, 383), Category: "常规模板", Scene: "公众号", Usage: "干货科普", Industry: "通用", Style: "科技", Color: "蓝色", Layout: "横版", Width: 900, Height: 383, Downloads: 2340, Views: 15600, Status: "active"},
		{Title: "美食推荐公众号首图", Description: "美食分享公众号文章首图", ImageURL: img(220, 900, 383), Category: "常规模板", Scene: "公众号", Usage: "交流分享", Industry: "餐饮美食", Style: "温馨", Color: "橙色", Layout: "横版", Width: 900, Height: 383, Downloads: 1780, Views: 11400, Status: "active"},
		{Title: "教育培训招生", Description: "教育机构招生宣传首图", ImageURL: img(230, 900, 500), Category: "常规模板", Scene: "公众号", Usage: "宣传推广", Industry: "教育培训", Style: "商务", Color: "蓝色", Layout: "横版", Width: 900, Height: 500, Downloads: 1450, Views: 9800, Status: "active"},
		{Title: "心灵鸡汤日签", Description: "文艺励志每日签到图", ImageURL: img(240, 1080, 1920), Category: "常规模板", Scene: "公众号", Usage: "交流分享", Industry: "通用", Style: "文艺", Color: "白色", Layout: "竖版", Width: 1080, Height: 1920, Downloads: 3120, Views: 20300, Status: "active"},

		// ═══ 行政办公/教育 ═══
		{Title: "工作汇报PPT封面", Description: "商务风工作汇报PPT封面", ImageURL: img(250, 1920, 1080), Category: "常规模板", Scene: "行政办公/教育", Usage: "通知公告", Industry: "通用", Style: "商务", Color: "蓝色", Layout: "横版", Width: 1920, Height: 1080, Downloads: 4560, Views: 28900, Featured: true, Sort: 5, Status: "active"},
		{Title: "培训课件封面", Description: "企业内训课件封面模板", ImageURL: img(260, 1920, 1080), Category: "常规模板", Scene: "行政办公/教育", Usage: "干货科普", Industry: "教育培训", Style: "商务", Color: "蓝色", Layout: "横版", Width: 1920, Height: 1080, Downloads: 2340, Views: 16700, Status: "active"},
		{Title: "会议通知公告", Description: "企业会议通知公告模板", ImageURL: img(270, 750, 1334), Category: "常规模板", Scene: "行政办公/教育", Usage: "通知公告", Industry: "通用", Style: "简约", Color: "蓝色", Layout: "竖版", Width: 750, Height: 1334, Downloads: 1890, Views: 12300, Status: "active"},
		{Title: "招聘海报简约版", Description: "互联网公司招聘海报", ImageURL: img(280, 750, 1334), Category: "常规模板", Scene: "行政办公/教育", Usage: "招聘招募", Industry: "通用", Style: "简约", Color: "蓝色", Layout: "竖版", Width: 750, Height: 1334, Downloads: 3670, Views: 22400, Status: "active"},
		{Title: "校园招聘宣传", Description: "校园秋季招聘宣传海报", ImageURL: img(290, 750, 1000), Category: "常规模板", Scene: "行政办公/教育", Usage: "招聘招募", Industry: "教育培训", Style: "活力", Color: "绿色", Layout: "竖版", Width: 750, Height: 1000, Downloads: 2100, Views: 14500, Status: "active"},

		// ═══ 生活娱乐 ═══
		{Title: "生日派对邀请函", Description: "童趣生日party邀请函", ImageURL: img(300, 1080, 1080), Category: "常规模板", Scene: "生活娱乐", Usage: "邀请函", Industry: "休闲娱乐", Style: "卡通", Color: "粉色", Layout: "方形", Width: 1080, Height: 1080, Downloads: 2340, Views: 15600, Status: "active"},
		{Title: "婚礼邀请函", Description: "高端简约婚礼电子邀请函", ImageURL: img(310, 750, 1334), Category: "常规模板", Scene: "生活娱乐", Usage: "邀请函", Industry: "通用", Style: "简约", Color: "金色", Layout: "竖版", Width: 750, Height: 1334, Downloads: 4560, Views: 28900, Status: "active"},
		{Title: "宠物相册分享", Description: "可爱宠物日常分享模板", ImageURL: img(320, 1080, 1080), Category: "常规模板", Scene: "生活娱乐", Usage: "晒照分享", Industry: "生活百货", Style: "可爱", Color: "黄色", Layout: "方形", Width: 1080, Height: 1080, Downloads: 1560, Views: 9800, Status: "active"},
		{Title: "读书笔记打卡", Description: "文艺读书笔记记录模板", ImageURL: img(330, 1080, 1440), Category: "常规模板", Scene: "生活娱乐", Usage: "交流分享", Industry: "通用", Style: "文艺", Color: "米色", Layout: "竖版", Width: 1080, Height: 1440, Downloads: 1230, Views: 8200, Status: "active"},

		// ═══ PPT ═══
		{Title: "年终总结PPT", Description: "商务大气年终总结汇报PPT", ImageURL: img(340, 1920, 1080), Category: "常规模板", Scene: "PPT", Usage: "通知公告", Industry: "通用", Style: "商务", Color: "蓝色", Layout: "横版", Width: 1920, Height: 1080, Downloads: 5670, Views: 34500, Featured: true, Sort: 6, Status: "active"},
		{Title: "产品发布会PPT", Description: "苹果风产品发布会PPT模板", ImageURL: img(350, 1920, 1080), Category: "常规模板", Scene: "PPT", Usage: "宣传推广", Industry: "数码家电", Style: "极简", Color: "黑色", Layout: "横版", Width: 1920, Height: 1080, Downloads: 3890, Views: 25600, Status: "active"},
		{Title: "教育课件PPT", Description: "清新风格教育培训课件", ImageURL: img(360, 1920, 1080), Category: "常规模板", Scene: "PPT", Usage: "干货科普", Industry: "教育培训", Style: "清新", Color: "绿色", Layout: "横版", Width: 1920, Height: 1080, Downloads: 2340, Views: 16700, Status: "active"},
		{Title: "创意方案PPT", Description: "创意广告方案提案PPT", ImageURL: img(370, 1920, 1080), Category: "常规模板", Scene: "PPT", Usage: "宣传推广", Industry: "通用", Style: "时尚", Color: "紫色", Layout: "横版", Width: 1920, Height: 1080, Downloads: 1890, Views: 12300, Status: "active"},

		// ═══ 同款复刻 ═══
		{Title: "瑞幸咖啡联名风", Description: "复刻瑞幸联名款宣传风格", ImageURL: img(380, 1080, 1080), Category: "同款复刻", Scene: "社交媒体", Usage: "营销带货", Industry: "餐饮美食", Style: "时尚", Color: "蓝色", Layout: "方形", Width: 1080, Height: 1080, Downloads: 3450, Views: 22100, Featured: true, Sort: 7, Status: "active"},
		{Title: "喜茶清新设计风", Description: "复刻喜茶品牌清新设计", ImageURL: img(390, 1080, 1440), Category: "同款复刻", Scene: "社交媒体", Usage: "营销带货", Industry: "餐饮美食", Style: "清新", Color: "绿色", Layout: "竖版", Width: 1080, Height: 1440, Downloads: 2780, Views: 18900, Status: "active"},
		{Title: "泡泡玛特潮玩风", Description: "复刻泡泡玛特潮流玩具风格", ImageURL: img(400, 1080, 1080), Category: "同款复刻", Scene: "电商", Usage: "营销带货", Industry: "休闲娱乐", Style: "潮流", Color: "粉色", Layout: "方形", Width: 1080, Height: 1080, Downloads: 2100, Views: 14500, Status: "active"},
		{Title: "完美日记美妆风", Description: "复刻完美日记品牌视觉", ImageURL: img(410, 750, 1000), Category: "同款复刻", Scene: "电商", Usage: "营销带货", Industry: "美发护肤", Style: "时尚", Color: "黑色", Layout: "竖版", Width: 750, Height: 1000, Downloads: 1890, Views: 12600, Status: "active"},
		{Title: "蜜雪冰城卡通风", Description: "复刻蜜雪冰城可爱卡通风", ImageURL: img(420, 1080, 1080), Category: "同款复刻", Scene: "微信营销", Usage: "宣传推广", Industry: "餐饮美食", Style: "卡通", Color: "红色", Layout: "方形", Width: 1080, Height: 1080, Downloads: 4560, Views: 29800, Status: "active"},

		// ═══ 更多电商 ═══
		{Title: "秋冬新品上市", Description: "秋冬季节服装新品上市图", ImageURL: img(430, 800, 800), Category: "常规模板", Scene: "电商", Usage: "营销带货", Industry: "鞋服箱包", Style: "温馨", Color: "棕色", Layout: "方形", Width: 800, Height: 800, Downloads: 1670, Views: 10500, Status: "active"},
		{Title: "厨房电器促销", Description: "厨房小家电活动促销主图", ImageURL: img(440, 800, 800), Category: "常规模板", Scene: "电商", Usage: "营销带货", Industry: "数码家电", Style: "简约", Color: "白色", Layout: "方形", Width: 800, Height: 800, Downloads: 890, Views: 6200, Status: "active"},
		{Title: "零食大礼包", Description: "零食大礼包满减促销图", ImageURL: img(450, 800, 800), Category: "常规模板", Scene: "电商", Usage: "营销带货", Industry: "食品生鲜", Style: "活力", Color: "黄色", Layout: "方形", Width: 800, Height: 800, Downloads: 1230, Views: 8100, Status: "active"},

		// ═══ 更多社交 ═══
		{Title: "甜品探店笔记", Description: "粉色甜品店探店笔记模板", ImageURL: img(460, 1080, 1440), Category: "常规模板", Scene: "社交媒体", Usage: "晒照分享", Industry: "餐饮美食", Style: "可爱", Color: "粉色", Layout: "竖版", Width: 1080, Height: 1440, Downloads: 2890, Views: 18200, Status: "active"},
		{Title: "护肤干货分享", Description: "护肤知识科普分享模板", ImageURL: img(470, 1080, 1440), Category: "常规模板", Scene: "社交媒体", Usage: "干货科普", Industry: "美发护肤", Style: "清新", Color: "白色", Layout: "竖版", Width: 1080, Height: 1440, Downloads: 2340, Views: 15600, Status: "active"},
		{Title: "家居好物清单", Description: "家居好物推荐清单模板", ImageURL: img(480, 1080, 1440), Category: "常规模板", Scene: "社交媒体", Usage: "干货科普", Industry: "家居家装", Style: "简约", Color: "米色", Layout: "竖版", Width: 1080, Height: 1440, Downloads: 1780, Views: 11200, Status: "active"},

		// ═══ 更多微信营销 ═══
		{Title: "美容院活动推广", Description: "美容院周年庆优惠活动", ImageURL: img(490, 750, 1334), Category: "常规模板", Scene: "微信营销", Usage: "宣传推广", Industry: "美容美业", Style: "时尚", Color: "紫色", Layout: "竖版", Width: 750, Height: 1334, Downloads: 1340, Views: 8900, Status: "active"},
		{Title: "健身房开业促销", Description: "健身房开业优惠推广海报", ImageURL: img(500, 750, 1334), Category: "常规模板", Scene: "微信营销", Usage: "宣传推广", Industry: "休闲娱乐", Style: "活力", Color: "橙色", Layout: "竖版", Width: 750, Height: 1334, Downloads: 1560, Views: 10200, Status: "active"},
		{Title: "早安问候图", Description: "清新早安每日问候图", ImageURL: img(510, 1080, 1080), Category: "常规模板", Scene: "微信营销", Usage: "祝福问候", Industry: "通用", Style: "清新", Color: "绿色", Layout: "方形", Width: 1080, Height: 1080, Downloads: 7890, Views: 45600, Status: "active"},
		{Title: "母亲节感恩贺卡", Description: "温馨母亲节感恩祝福贺卡", ImageURL: img(520, 1080, 1080), Category: "常规模板", Scene: "微信营销", Usage: "祝福问候", Industry: "通用", Style: "温馨", Color: "粉色", Layout: "方形", Width: 1080, Height: 1080, Downloads: 3450, Views: 21000, Status: "active"},

		// ═══ 更多公众号 ═══
		{Title: "旅游攻略首图", Description: "旅游出行攻略公众号首图", ImageURL: img(530, 900, 383), Category: "常规模板", Scene: "公众号", Usage: "干货科普", Industry: "旅游出行", Style: "清新", Color: "蓝色", Layout: "横版", Width: 900, Height: 383, Downloads: 1560, Views: 10500, Status: "active"},
		{Title: "职场干货分享", Description: "职场技能干货分享首图", ImageURL: img(540, 900, 383), Category: "常规模板", Scene: "公众号", Usage: "干货科普", Industry: "通用", Style: "商务", Color: "蓝色", Layout: "横版", Width: 900, Height: 383, Downloads: 2100, Views: 14200, Status: "active"},

		// ═══ 公益 ═══
		{Title: "环保公益宣传", Description: "保护环境公益宣传海报", ImageURL: img(550, 750, 1000), Category: "常规模板", Scene: "社交媒体", Usage: "公益宣传", Industry: "通用", Style: "简约", Color: "绿色", Layout: "竖版", Width: 750, Height: 1000, Downloads: 890, Views: 6200, Status: "active"},
		{Title: "关爱老人公益", Description: "关爱老年人公益宣传图", ImageURL: img(560, 1080, 1080), Category: "常规模板", Scene: "微信营销", Usage: "公益宣传", Industry: "通用", Style: "温馨", Color: "橙色", Layout: "方形", Width: 1080, Height: 1080, Downloads: 670, Views: 4500, Status: "active"},

		// ═══ 简介介绍 ═══
		{Title: "企业简介展示", Description: "商务风企业简介宣传图", ImageURL: img(570, 1200, 800), Category: "常规模板", Scene: "行政办公/教育", Usage: "简介介绍", Industry: "通用", Style: "商务", Color: "蓝色", Layout: "横版", Width: 1200, Height: 800, Downloads: 2340, Views: 15600, Status: "active"},
		{Title: "个人作品集封面", Description: "设计师个人作品集封面", ImageURL: img(580, 1080, 1080), Category: "常规模板", Scene: "社交媒体", Usage: "简介介绍", Industry: "通用", Style: "极简", Color: "黑色", Layout: "方形", Width: 1080, Height: 1080, Downloads: 1890, Views: 12300, Status: "active"},
	}

	// Randomize dates within the last 6 months
	now := time.Now()
	for i := range templates {
		daysAgo := rng.Intn(180)
		templates[i].CreatedAt = now.AddDate(0, 0, -daysAgo)
		templates[i].UpdatedAt = templates[i].CreatedAt
	}

	return templates
}
