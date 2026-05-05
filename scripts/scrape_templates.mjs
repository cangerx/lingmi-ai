#!/usr/bin/env node
/**
 * 抓取 designkit.cn 模板中心的真实数据
 * 输出: scripts/templates_data.json
 *
 * 用法: node scripts/scrape_templates.mjs
 */
import puppeteer from "puppeteer";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, "templates_data.json");

// 场景分类页面
const SCENES = [
  { id: "00218", name: "电商" },
  { id: "00105", name: "社交媒体" },
  { id: "00106", name: "微信营销" },
  { id: "00985", name: "公众号" },
  { id: "00219", name: "行政办公/教育" },
  { id: "001457", name: "生活娱乐" },
  { id: "002130", name: "PPT" },
];

async function scrapeScene(browser, scene) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const url = `https://www.designkit.cn/templates/scene/${scene.id}`;
  console.log(`→ 抓取 ${scene.name}: ${url}`);

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    // 等待模板卡片加载
    await page.waitForSelector("img", { timeout: 10000 }).catch(() => {});
    // 滚动加载更多
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise((r) => setTimeout(r, 1500));
    }

    // 拦截网络请求中的 API 响应（检查已有数据）
    const templates = await page.evaluate((sceneName) => {
      const cards = [];
      // 尝试获取模板卡片
      const items = document.querySelectorAll("[class*='template'], [class*='card'], [class*='item']");
      items.forEach((el) => {
        const img = el.querySelector("img");
        const titleEl = el.querySelector("[class*='title'], [class*='name'], h3, h4, p");
        if (img && img.src && img.src.startsWith("http")) {
          cards.push({
            title: titleEl?.textContent?.trim() || "",
            image_url: img.src,
            scene: sceneName,
          });
        }
      });

      // 如果上面没抓到，尝试所有 img
      if (cards.length === 0) {
        const allImgs = document.querySelectorAll("img[src*='http']");
        allImgs.forEach((img) => {
          const src = img.src;
          // 过滤掉 logo、icon 等小图
          if (src.includes("template") || src.includes("design") || src.includes("cdn") ||
              (img.naturalWidth > 200 && img.naturalHeight > 200) ||
              (img.width > 150 && img.height > 150)) {
            const parent = img.closest("a, div, li");
            const titleEl = parent?.querySelector("[class*='title'], [class*='name'], span, p");
            cards.push({
              title: titleEl?.textContent?.trim() || "",
              image_url: src,
              scene: sceneName,
            });
          }
        });
      }

      return cards;
    }, scene.name);

    console.log(`  ✓ 抓到 ${templates.length} 个模板`);
    await page.close();
    return templates;
  } catch (err) {
    console.log(`  ✗ 失败: ${err.message}`);
    await page.close();
    return [];
  }
}

// 同时尝试拦截 API 请求获取结构化数据
async function scrapeWithApiIntercept(browser, scene) {
  const page = await browser.newPage();
  const apiData = [];

  // 拦截 XHR/fetch 响应
  page.on("response", async (response) => {
    const url = response.url();
    if ((url.includes("/api/") || url.includes("/mtop/") || url.includes("/gw/")) &&
        response.headers()["content-type"]?.includes("json")) {
      try {
        const json = await response.json();
        // 递归查找包含 template 数据的数组
        const findArrays = (obj, depth = 0) => {
          if (depth > 5) return;
          if (Array.isArray(obj) && obj.length > 0 && obj[0]?.id) {
            obj.forEach((item) => {
              if (item.thumb_url || item.image_url || item.cover_url || item.preview_url) {
                apiData.push({
                  title: item.title || item.name || "",
                  description: item.description || item.desc || "",
                  image_url: item.thumb_url || item.image_url || item.cover_url || item.preview_url || "",
                  scene: scene.name,
                  width: item.width || 0,
                  height: item.height || 0,
                  source_id: String(item.id || ""),
                });
              }
            });
          } else if (typeof obj === "object" && obj !== null) {
            Object.values(obj).forEach((v) => findArrays(v, depth + 1));
          }
        };
        findArrays(json);
      } catch {}
    }
  });

  const url = `https://www.designkit.cn/templates/scene/${scene.id}`;
  console.log(`→ API 拦截 ${scene.name}: ${url}`);

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    // 滚动触发更多请求
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise((r) => setTimeout(r, 2000));
    }
    console.log(`  ✓ API 拦截到 ${apiData.length} 条数据`);
  } catch (err) {
    console.log(`  ✗ 失败: ${err.message}`);
  }

  await page.close();
  return apiData;
}

async function main() {
  console.log("启动浏览器...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let allTemplates = [];

  // 方式1: API 拦截
  for (const scene of SCENES) {
    const apiItems = await scrapeWithApiIntercept(browser, scene);
    if (apiItems.length > 0) {
      allTemplates.push(...apiItems);
    } else {
      // 方式2: DOM 抓取
      const domItems = await scrapeScene(browser, scene);
      allTemplates.push(...domItems);
    }
  }

  await browser.close();

  // 去重 (by image_url)
  const seen = new Set();
  allTemplates = allTemplates.filter((t) => {
    if (!t.image_url || seen.has(t.image_url)) return false;
    seen.add(t.image_url);
    return true;
  });

  console.log(`\n总计抓到 ${allTemplates.length} 个模板`);
  writeFileSync(OUTPUT, JSON.stringify(allTemplates, null, 2), "utf-8");
  console.log(`✓ 已保存到 ${OUTPUT}`);
}

main().catch(console.error);
