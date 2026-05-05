#!/usr/bin/env node
/**
 * 读取 templates_data.json，生成标题/描述，输出 SQL seed 文件
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT = resolve(__dirname, "templates_data.json");
const OUTPUT = resolve(__dirname, "seed_templates.sql");

const raw = JSON.parse(readFileSync(INPUT, "utf-8"));

// 过滤有效模板图片
const templates = raw.filter((t) => {
  const url = t.image_url || "";
  if (!url.includes("meitudata.com") && !url.includes("meitu.com")) return false;
  if (url.includes(".svg") || url.includes("icon") || url.includes("widget") || url.includes("meidou")) return false;
  return true;
});

// 每场景自动生成标题
const SCENE_TITLES = {
  "电商": [
    "618大促爆款主图", "双11狂欢购物节", "新品上市促销图", "限时秒杀海报",
    "满减优惠活动图", "直通车推广主图", "店铺首页横幅", "详情页头图",
    "产品展示白底图", "促销活动海报", "年货节主图", "品牌日活动图",
    "跨境电商主图", "春季新品推广", "秋冬换季促销", "会员日专享",
    "拼团活动海报", "好评返现卡", "买家秀征集", "清仓大甩卖",
    "百亿补贴主图", "超值预售海报", "复购优惠图", "爆品推荐主图",
    "品牌故事图", "产品对比图", "功效说明图", "用户评价图",
    "物流包装图", "售后服务图", "直播预告图", "尖货专场图",
    "开学季促销", "七夕礼物推荐", "国庆特惠活动", "母亲节感恩价",
    "圣诞节限定", "元旦新年特价", "情人节礼盒", "儿童节亲子图",
    "运动户外促销", "家纺床品推荐", "美妆个护特卖", "食品零食主图",
  ],
  "社交媒体": [
    "小红书美食探店", "ins风穿搭日记", "旅行打卡攻略", "健身运动记录",
    "好物测评分享", "护肤心得笔记", "宠物日常分享", "家居改造记录",
    "读书笔记打卡", "咖啡探店日记", "摄影作品展示", "手账拼贴模板",
    "每日穿搭推荐", "妆容教程分享", "美甲灵感合集", "发型推荐对比",
    "减脂餐食谱", "旅行行李清单", "电影推荐清单", "书单推荐模板",
    "学习打卡记录", "理财干货分享", "收纳整理技巧", "DIY手工教程",
    "职场穿搭指南", "约会穿搭推荐", "运动穿搭合集", "四季穿搭模板",
    "美食食谱教程", "甜品制作分享", "居家好物推荐", "效率工具推荐",
    "周末出游攻略", "博物馆打卡", "音乐节现场", "露营装备推荐",
    "春日赏花指南", "秋季穿搭灵感", "冬日温暖推荐", "夏日清凉特辑",
    "亲子活动推荐", "情侣旅行攻略", "闺蜜下午茶", "独居生活记录",
    "毕业季纪念", "生日派对记录", "节日仪式感", "年度总结回顾",
    "新年flag清单", "圣诞礼物清单", "双11购物清单", "618必买清单",
    "开箱测评视频", "vlog封面模板", "数码产品评测", "App推荐模板",
    "租房改造before", "厨房收纳攻略", "浴室好物推荐", "客厅改造灵感",
  ],
  "微信营销": [
    "朋友圈产品宣传", "社群裂变海报", "节日祝福贺卡", "活动邀请函",
    "早安问候日签", "晚安治愈语录", "每日正能量", "心灵鸡汤日签",
    "开业活动海报", "周年庆宣传图", "新店开张海报", "促销活动海报",
    "会员招募海报", "拼团活动海报", "优惠券推广图", "积分兑换活动",
    "中秋节祝福", "春节拜年贺卡", "元宵节贺图", "端午节祝福",
    "母亲节贺卡", "父亲节贺卡", "教师节感恩", "国庆节祝福",
    "生日祝福贺卡", "结婚纪念日", "乔迁之喜", "升学祝贺",
    "企业文化宣传", "团队风采展示", "产品功能介绍", "客户案例分享",
    "行业报告摘要", "品牌故事传播", "公益活动宣传", "招聘信息发布",
    "培训课程推广", "讲座直播预告",
  ],
  "公众号": [
    "科技资讯首图", "美食推荐首图", "教育培训首图", "旅游攻略首图",
    "职场干货首图", "健康科普首图", "财经分析首图", "情感文章首图",
    "热点解读首图", "深度报道首图", "产品评测首图", "行业趋势首图",
    "生活方式首图", "文化艺术首图", "音乐推荐首图", "电影推荐首图",
    "读书笔记首图", "心理健康首图", "法律知识首图", "历史故事首图",
  ],
  "行政办公/教育": [
    "工作汇报PPT", "项目方案封面", "会议通知公告", "培训课件封面",
    "招聘海报模板", "企业文化展板", "年终总结封面", "季度报告封面",
    "通知公告模板", "考勤打卡提醒", "部门组织架构", "流程图模板",
    "数据报表模板", "工作计划表格", "绩效考核模板", "制度公告模板",
    "校园招聘海报", "实习招聘海报", "社会招聘海报", "内推推荐卡",
    "毕业设计封面", "论文答辩PPT", "课程表模板", "学生手册封面",
    "教学计划封面", "期末考试通知", "成绩单模板", "班级通知模板",
    "家长会邀请函", "运动会海报", "元旦晚会海报", "毕业典礼邀请",
    "社团招新海报", "志愿者招募", "讲座通知海报", "图书推荐展板",
    "安全教育展板", "防疫知识海报", "垃圾分类海报", "节能环保海报",
  ],
  "生活娱乐": [
    "生日派对邀请函", "婚礼电子请柬", "满月酒邀请函", "乔迁邀请函",
    "聚会活动邀请", "宠物相册封面", "旅行纪念册", "美食日记封面",
    "年度影集封面", "家庭相册封面", "宝宝成长记录", "情侣纪念日",
    "毕业纪念册", "同学聚会邀请", "KTV聚会邀请", "烧烤派对邀请",
    "游戏战绩分享", "追剧清单分享", "年度歌单封面", "podcast封面",
    "手机壁纸设计", "表情包制作", "头像框设计", "个性签名图",
    "节日贺卡设计", "感恩卡片制作", "道歉卡片设计", "表白卡片",
    "新年愿望清单", "旅行计划表", "减肥打卡记录", "习惯养成表",
    "心愿墙模板", "时间胶囊信", "给未来的信", "回忆录封面",
    "音乐节门票", "电影票根收藏", "展览打卡记录", "市集活动海报",
  ],
  "PPT": [
    "年终总结PPT", "产品发布会PPT", "教育课件PPT", "创意方案PPT",
    "商业计划书PPT", "融资路演PPT", "品牌介绍PPT", "项目汇报PPT",
    "市场分析PPT", "竞品分析PPT", "用户调研PPT", "数据分析PPT",
    "培训课件PPT", "入职培训PPT", "技能提升PPT", "管理培训PPT",
    "述职报告PPT", "季度总结PPT", "月度汇报PPT", "周报模板PPT",
    "团队介绍PPT", "个人简历PPT", "作品集PPT", "毕业答辩PPT",
    "学术报告PPT", "科研汇报PPT", "论文开题PPT", "课题研究PPT",
    "活动策划PPT", "婚礼策划PPT", "旅行分享PPT", "读书分享PPT",
    "公司介绍PPT", "企业文化PPT", "员工手册PPT", "规章制度PPT",
    "年会颁奖PPT", "晚会策划PPT", "社团介绍PPT", "志愿活动PPT",
    "医疗健康PPT", "环保主题PPT", "科技风格PPT", "中国风PPT",
    "极简风格PPT", "商务高端PPT", "可爱卡通PPT", "清新自然PPT",
    "渐变色彩PPT", "几何图形PPT", "摄影风格PPT", "杂志风PPT",
    "科幻未来PPT", "复古怀旧PPT", "水彩手绘PPT", "扁平插画PPT",
    "暗黑风格PPT", "莫兰迪色PPT", "撞色活力PPT", "金属质感PPT",
  ],
};

const SCENE_DESCS = {
  "电商": "高转化电商营销素材，助力店铺销量提升",
  "社交媒体": "精美社交媒体图文模板，一键排版",
  "微信营销": "微信朋友圈、社群营销必备模板",
  "公众号": "公众号文章配图首图模板",
  "行政办公/教育": "高效办公教育场景模板",
  "生活娱乐": "生活社交场景模板，记录美好时刻",
  "PPT": "高质量演示文稿模板，适用各种场景",
};

const CATEGORIES = ["常规模板", "常规模板", "常规模板", "同款复刻"];
const USAGES = ["营销带货", "交流分享", "宣传推广", "干货科普", "祝福问候", "晒照分享"];
const INDUSTRIES = ["通用", "餐饮美食", "鞋服箱包", "教育培训", "美发护肤", "休闲娱乐", "数码家电", "家居家装"];
const STYLES = ["简约", "时尚", "国潮", "科技", "温馨", "商务", "清新", "活力", "极简", "卡通"];
const COLORS = ["红色", "蓝色", "绿色", "黑色", "白色", "紫色", "橙色", "粉色", "金色"];
const LAYOUTS = ["竖版", "横版", "方形"];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const sceneCounters = {};
const sqlLines = [`-- Auto-generated template seed data from designkit.cn`, `DELETE FROM templates;`, ``];
let id = 0;

for (const t of templates) {
  const scene = t.scene;
  if (!sceneCounters[scene]) sceneCounters[scene] = 0;
  const titles = SCENE_TITLES[scene] || SCENE_TITLES["电商"];
  const title = titles[sceneCounters[scene] % titles.length];
  sceneCounters[scene]++;
  id++;

  const featured = id <= 10 ? "true" : "false";
  const sort = id <= 10 ? id : 0;
  const downloads = randInt(200, 8000);
  const views = downloads * randInt(3, 8);

  const esc = (s) => s.replace(/'/g, "''");
  const desc = `${SCENE_DESCS[scene] || "精选设计模板"}`;
  
  sqlLines.push(
    `INSERT INTO templates (title, description, image_url, category, scene, "usage", industry, tags, style, color, layout, width, height, downloads, views, featured, sort, status, created_at, updated_at) VALUES ('${esc(title)}', '${esc(desc)}', '${esc(t.image_url)}', '${pick(CATEGORIES)}', '${scene}', '${pick(USAGES)}', '${pick(INDUSTRIES)}', '', '${pick(STYLES)}', '${pick(COLORS)}', '${pick(LAYOUTS)}', ${randInt(600, 1920)}, ${randInt(600, 1920)}, ${downloads}, ${views}, ${featured}, ${sort}, 'active', NOW() - interval '${randInt(1, 180)} days', NOW() - interval '${randInt(1, 180)} days');`
  );
}

writeFileSync(OUTPUT, sqlLines.join("\n") + "\n", "utf-8");
console.log(`✓ 生成 ${id} 条 SQL → ${OUTPUT}`);
