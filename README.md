<div align="center">

<br />

<img src="web/public/logo.svg" alt="Lingmi AI" width="64" />

<br />
<br />

# 灵觅 AI ✦ Lingmi AI

**让创意触手可及的 AI 智能创作平台**

*Where creativity meets intelligence.*

<br />

[![Go](https://img.shields.io/badge/Go-1.26-00ADD8?style=flat-square&logo=go&logoColor=white)](https://go.dev)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-A78BFA?style=flat-square)](LICENSE)

<br />

<p align="center">
  <sub>
    <strong>AI 生图</strong> · <strong>智能抠图</strong> · <strong>AI 消除</strong> · <strong>超清放大</strong> · <strong>AI 海报</strong> · <strong>商品场景图</strong> · <strong>A+ 详情页</strong> · <strong>AI 对话</strong>
  </sub>
</p>

<br />

---

</div>

<br />

## ✨ 产品理念

> 我们相信，每一个创意都值得被看见。
>
> 灵觅 AI 不只是一个工具 —— 它是你的创意伙伴。无论你是电商卖家、设计师还是内容创作者，只需一句话、一张图，灵觅便能将你的想法变为现实。

<br />

## 🎨 核心能力

<table>
<tr>
<td width="50%">

### 🖼️ AI 图片创作
从文字到图像，支持多款顶级模型。GPT-Image-2、万相 2.7、Gemini 3.1 Pro、即梦 5.0 等，一键切换，风格自由。

- **文生图** — 描述即创作，支持多比例、多分辨率
- **AI 海报** — 电商促销、社交媒体、节日主题一键生成
- **商品场景图** — 上传白底图，AI 自动换场景
- **A+ 详情页** — 跨平台详情页模块化生成

</td>
<td width="50%">

### 🛠️ 智能图像处理
专业级图像编辑，三秒出片。

- **智能抠图** — AI 识别主体，精准去背景
- **AI 消除** — 画笔涂抹，瑕疵无痕消失
- **AI 扩图** — 四向延展，画面无限延伸
- **超清放大** — 2x / 4x / 8x 无损增强
- **证件照** — 换底色、改尺寸、排版打印

</td>
</tr>
<tr>
<td width="50%">

### 💬 AI 智能对话
接入主流大语言模型，多轮对话、上下文理解，助力文案创作与知识问答。

</td>
<td width="50%">

### 🎬 AI 视频（即将推出）
文字/图片一键生成短视频，电商带货视频自动化生产。

</td>
</tr>
</table>

<br />

## 🏛️ 技术架构

```
lingmi-ai/
├── server/          → Go + Gin + GORM      后端 API 服务
├── web/             → Next.js 16 + React 19  用户前端
└── admin/           → Vben Admin (Vue 3)     运营管理后台
```

| 层级 | 技术栈 |
|------|--------|
| **前端** | Next.js 16 · React 19 · TailwindCSS 4 · Framer Motion · Zustand |
| **后端** | Go · Gin · GORM · Redis · 阿里云 SMS · 多模型网关 |
| **数据** | PostgreSQL / MySQL · Redis 缓存 · OSS 对象存储 |
| **AI** | OpenAI · Google Gemini · 通义万相 · 字节即梦 · 多渠道路由 |
| **管理** | Vben Admin · Ant Design Vue · 权限管理 · 数据看板 |

<br />

## 🚀 快速开始

### 后端

```bash
cd server
cp config.yaml.example config.yaml   # 编辑配置
go run cmd/server/main.go
```

### 前端

```bash
cd web
npm install
npm run dev
```

### 管理后台

```bash
cd admin
pnpm install
pnpm run dev:antd
```

<br />

## 📐 项目特性

- **多模型路由** — 智能调度多个 AI 供应商渠道，自动容灾切换
- **积分体系** — 灵活的按次/按量计费，支持套餐与充值
- **会员系统** — VIP 专属模型、优先队列、更高配额
- **推广裂变** — 邀请注册奖励 + 消费佣金分成，自动结算
- **内容审核** — 提示词 + 图片双重审核，敏感词过滤
- **异步生成** — 任务队列化处理，轮询获取结果，不阻塞体验
- **响应式 UI** — 桌面端精心适配，移动端平滑降级

<br />

## 🗂️ 目录总览

```
server/
├── cmd/server/        启动入口
├── internal/
│   ├── config/        配置加载
│   ├── database/      数据库初始化
│   ├── handler/       HTTP 处理器（用户端 + Admin）
│   ├── middleware/     JWT 鉴权 · 限流 · 缓存
│   ├── model/         数据模型定义
│   ├── router/        路由注册
│   ├── service/       业务逻辑（支付·审核·短信·OAuth）
│   └── storage/       对象存储抽象
web/
├── src/app/           Next.js App Router 页面
├── src/components/    可复用 UI 组件
├── src/hooks/         自定义 React Hooks
├── src/lib/           API 客户端 · 工具函数
└── src/store/         Zustand 全局状态
admin/
└── apps/web-antd/     Vben Admin 管理后台
```

<br />

<div align="center">

---

<br />

<sub>

**灵觅 AI** — 用 AI 重新定义创作的边界。

*Built with obsessive attention to detail.*

</sub>

<br />
<br />

</div>
