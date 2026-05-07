package main

import (
	"log"

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

	templates := []model.PromptTemplate{
		// 商品图
		{Category: "商品图", Title: "白底电商主图", Prompt: "高端商品展示图，纯白色背景，专业摄影灯光，产品居中，柔和阴影，超高清细节，电商风格", Tags: "电商,白底,产品", Sort: 1},
		{Category: "商品图", Title: "场景化商品图", Prompt: "商品自然场景展示，温馨家居环境，柔和自然光，浅景深，产品作为视觉焦点，生活化氛围", Tags: "场景,家居,生活", Sort: 2},
		{Category: "商品图", Title: "悬浮商品展示", Prompt: "商品悬浮在空中，渐变色背景，动态光影效果，微距视角，科技感十足，金属质感高光", Tags: "悬浮,科技,高级", Sort: 3},
		{Category: "商品图", Title: "极简奢华风格", Prompt: "极简主义商品摄影，大理石台面，金色点缀，侧光照明，高级质感，杂志广告风格", Tags: "极简,奢华,杂志", Sort: 4},
		{Category: "商品图", Title: "美食商品图", Prompt: "精致美食摆盘，俯拍视角，新鲜食材搭配，暖色调灯光，高饱和度色彩，令人食欲大开", Tags: "美食,俯拍,暖色调", Sort: 5},

		// 人像
		{Category: "人像", Title: "商务职业肖像", Prompt: "专业商务人像照，正装着装，浅灰色背景，伦勃朗布光，自然微笑，高清肤质细节", Tags: "商务,职业,肖像", Sort: 1},
		{Category: "人像", Title: "时尚杂志大片", Prompt: "高端时尚杂志封面风格，戏剧化灯光，高对比度，模特姿态优雅，色彩鲜明的服装搭配", Tags: "时尚,杂志,戏剧化", Sort: 2},
		{Category: "人像", Title: "清新日系写真", Prompt: "日系小清新写真风格，自然柔和光线，浅色系服装，户外花园场景，胶片色调，温暖治愈感", Tags: "日系,清新,胶片", Sort: 3},
		{Category: "人像", Title: "赛博朋克肖像", Prompt: "赛博朋克风格人像，霓虹灯光，蓝紫色调，未来科技元素，面部特写，冷色调高光", Tags: "赛博朋克,霓虹,科幻", Sort: 4},
		{Category: "人像", Title: "复古胶片风格", Prompt: "复古胶片人像，颗粒感质感，暖黄色调，怀旧氛围，自然随性的姿态，柔焦效果", Tags: "复古,胶片,怀旧", Sort: 5},

		// 风景
		{Category: "风景", Title: "唯美日落风景", Prompt: "壮丽海边日落，金色和橙色天空渐变，波光粼粼的海面，剪影式前景，广角构图，超高清", Tags: "日落,海边,金色", Sort: 1},
		{Category: "风景", Title: "山水水墨画", Prompt: "中国传统水墨画风格山水，层峦叠嶂，云雾缭绕，远山近水，留白意境，黑白灰色调", Tags: "水墨,山水,中国风", Sort: 2},
		{Category: "风景", Title: "北欧极光", Prompt: "北欧极光夜空，绿色和紫色极光带，雪地反射，星空璀璨，前景有木屋和松树，冷色调", Tags: "极光,北欧,夜空", Sort: 3},
		{Category: "风景", Title: "春日花海", Prompt: "漫山遍野的花海，蓝天白云，远处有小山丘，薰衣草和向日葵混搭，暖色阳光，清新自然", Tags: "花海,春天,清新", Sort: 4},
		{Category: "风景", Title: "都市夜景全景", Prompt: "现代都市夜景，摩天大楼灯火辉煌，俯瞰角度，车流光轨，蓝色调天际线，高清全景", Tags: "都市,夜景,全景", Sort: 5},

		// 创意
		{Category: "创意", Title: "超现实梦境", Prompt: "超现实主义梦境场景，漂浮的岛屿，倒置的瀑布，鲸鱼在空中游弋，紫色和青色色调，奇幻氛围", Tags: "超现实,梦境,奇幻", Sort: 1},
		{Category: "创意", Title: "微缩模型世界", Prompt: "微缩移轴摄影效果，城市俯瞰变成玩具模型，浅景深，鲜艳饱和色彩，可爱的比例感", Tags: "微缩,移轴,可爱", Sort: 2},
		{Category: "创意", Title: "液态金属艺术", Prompt: "液态金属流动效果，银色和金色金属质感，流体动态造型，高光反射，抽象雕塑，黑色背景", Tags: "金属,流体,抽象", Sort: 3},
		{Category: "创意", Title: "几何抽象构成", Prompt: "极简几何抽象艺术，大色块碰撞，圆形三角形方形组合，孟菲斯风格配色，干净利落", Tags: "几何,抽象,孟菲斯", Sort: 4},
		{Category: "创意", Title: "玻璃质感设计", Prompt: "半透明玻璃材质效果，彩色光线折射，磨砂质感，3D渲染风格，柔和渐变背景，高级感", Tags: "玻璃,透明,3D", Sort: 5},

		// 建筑
		{Category: "建筑", Title: "未来主义建筑", Prompt: "未来主义建筑设计，流线型曲面结构，玻璃幕墙，绿植垂直花园，蓝天映衬，建筑摄影", Tags: "未来,流线,绿色建筑", Sort: 1},
		{Category: "建筑", Title: "中式古建筑", Prompt: "中国传统古建筑，飞檐翘角，红色柱廊，庭院深深，晨曦光线，对称构图，古韵悠长", Tags: "中式,古建筑,传统", Sort: 2},
		{Category: "建筑", Title: "极简室内空间", Prompt: "北欧极简主义室内设计，大面积白色空间，木质元素点缀，自然光透过大落地窗，温馨雅致", Tags: "北欧,极简,室内", Sort: 3},

		// 插画
		{Category: "插画", Title: "手绘水彩插画", Prompt: "手绘水彩风格插画，柔和的色彩晕染，细腻笔触，童话故事般的温馨场景，浅色系配色", Tags: "水彩,手绘,童话", Sort: 1},
		{Category: "插画", Title: "扁平矢量插画", Prompt: "现代扁平风格矢量插画，简洁几何造型，明快配色，无描边设计，适用于UI界面和网页", Tags: "扁平,矢量,UI", Sort: 2},
		{Category: "插画", Title: "国潮风格插画", Prompt: "国潮风格插画，中国传统元素与现代潮流结合，锦鲤祥云龙凤图案，大红配金色，潮流感十足", Tags: "国潮,中国风,潮流", Sort: 3},
		{Category: "插画", Title: "赛博科幻插画", Prompt: "赛博朋克科幻插画，霓虹城市街景，机械改造人物，紫色蓝色霓虹光，雨夜氛围，未来世界", Tags: "赛博朋克,科幻,霓虹", Sort: 4},
		{Category: "插画", Title: "可爱Q版角色", Prompt: "Q版可爱角色设计，大头小身比例，圆润造型，明快糖果色系，简洁背景，表情生动有趣", Tags: "Q版,可爱,角色", Sort: 5},
	}

	for _, t := range templates {
		t.Status = "active"
		var existing model.PromptTemplate
		if db.Where("category = ? AND title = ?", t.Category, t.Title).First(&existing).Error == nil {
			db.Model(&existing).Updates(map[string]interface{}{
				"prompt": t.Prompt,
				"tags":   t.Tags,
				"sort":   t.Sort,
			})
			log.Printf("Updated: [%s] %s", t.Category, t.Title)
		} else {
			db.Create(&t)
			log.Printf("Created: [%s] %s", t.Category, t.Title)
		}
	}

	log.Printf("Done! Seeded %d prompt templates.", len(templates))
}
