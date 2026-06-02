# 公差工具站

## 项目定位
面向中国机械工程师的免费在线公差查询工具站，SEO-first 架构。三个核心工具共享一个域名，互加链接提升搜索权重。

## 站点结构
```
/                  → SEO 首页（工具卡片 + FAQ + JSON-LD）
/fit/              → 公差配合查询（ISO 286 / GB/T 1800）
/form/             → 形状公差查询（GB/T 1184 直线度/平面度）
/keyway/           → 键槽查询（GB/T 1095，Canvas 2D 工程图）
/css/common.css    → 共享样式
/js/nav.js         → 共享导航脚本
/sitemap.xml       → SEO
/robots.txt        → SEO
```

## 技术栈
- 纯静态：HTML + CSS + JavaScript（无框架、无构建）
- 零外部依赖、零网络请求
- 部署：Vercel / Cloudflare Pages

## SEO 策略
- 首页 FAQ 区覆盖高频搜索词（公差配合、H7/g6、直线度公差等）
- JSON-LD 结构化数据：WebSite + FAQPage + ItemList + WebApplication
- 每个工具页有独立的 meta description、OG 标签、canonical URL
- 面向百度 + Google 双引擎优化

## 参考标准
- ISO 286-1/2 (= GB/T 1800.1/1800.2)
- GB/T 1184-1996 (形状公差)
- GB/T 1095-2003 (键槽)
- ISO 2768-2 (未注公差)

## Wiki 知识库
Path: F:\AI\claude-obsidian
当需要上下文时：先读 wiki/hot.md → wiki/index.md → 具体页面

## 开发流程
按 flows/ 目录下的 FLOW 文件执行。原始工具的 flow 文件保留在原位。

## 部署前待办
- [ ] 确定域名，全局替换 DOMAIN_PLACEHOLDER
- [ ] 部署到 Vercel / Cloudflare Pages
- [ ] 提交百度站长平台 sitemap
- [ ] 提交 Google Search Console sitemap
- [ ] 提交 Bing Webmaster Tools sitemap
