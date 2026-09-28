# site · 作品集站点（M3）

Astro 7 作品集站，基座为 [AstroPaper](https://github.com/satnaing/astro-paper) v6.1.0
（MIT，上游 commit `35cfa7fbe0b897306d27670d3819e55d5205f3dd`，复制于 2026-09-28，保留 LICENSE，未 fork 上游历史）。

## 改造清单（相对上游）

- 内容集合：posts → case-studies / analysis / toolkit-reports（见 `src/content.config.ts`）
- 路由：`/` `/case-studies/` `/analysis/` `/toolbox/` `/about/`；删除 tags/archives/search/动态 OG
- 字体：去 Google Fonts（国内构建必挂，见 40-经验教训 2026-09-27 Geist 教训），用系统 CJK 字体栈
- 搜索：去 pagefind；OG：静态 `og-default.png`（`scripts/og-template.html` 生成）
- UI 文案中文：`src/i18n/lang/zh.ts`
- 构建：`astro check && astro build` + 内容检查（四段式）+ 死链检查

## 命令

```bash
npm install        # npmmirror 源
npm run dev        # 本地开发 http://localhost:4321
npm run build      # astro check + 构建 + 内容检查 + 死链检查
npm run lh         # Lighthouse 移动端四类 ≥90 验收
```

## 写一篇案例

在 `src/content/case-studies/` 新建 `.md`：frontmatter 含 title/description/pubDatetime/projectRole/stack/metrics（或 resultsNote），正文按四段式 H2（背景与问题/我的角色/过程与关键取舍/结果与量化/复盘与反思）。`npm run build` 会自动校验结构，缺四段式或无量化结果直接构建失败。
