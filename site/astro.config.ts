import { defineConfig, envField, svgoOptimizer } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import rehypeCallouts from "rehype-callouts";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import config from "./astro-paper.config";

export default defineConfig({
  site: config.site.url,
  integrations: [
    mdx(),
    sitemap({
      filter: page =>
        // 工具页（搜索）不进 sitemap，对 SEO 无意义；archives 关闭时不收录（原逻辑保持）
        (config.features?.showArchives !== false ||
          !page.endsWith("/archives/")) &&
        !page.endsWith("/search/"),
    }),
  ],
  i18n: {
    locales: ["zh"],
    defaultLocale: "zh",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    // 中文正文里 smartypants 会把直引号 "…" 错误转成两个右引号 ”…”（不认中文上下文），
    // 2026-09-30 全站根治：关闭 smartypants，正文引号统一写全角 “”（scripts/fix-quotes.mjs 已转换存量）
    smartypants: false,
    processor: unified({
      // 曾经挂过 remarkToc + remarkCollapse：它们会在正文里匹配 '## Contents' / '## TOC'
      // 自动生成一份「正文内目录」并包进英文 details/summary（summary 文案是英文
      // "Open Table of contents"，中文站里很突兀），与详情页右栏目录重复。
      // 实测 19 个内容文件 / 109 个标题，命中 0，纯惰性；2026-10-12 随右栏目录一起移除。
      remarkPlugins: [],
      rehypePlugins: [rehypeCallouts],
    }),
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  // ClientRouter 默认就会打开 prefetch 且 prefetchAll: true
  // （config.d.ts:1904 与 :1924；实现见 astro/components/ClientRouter.astro:151-152 → init({ prefetchAll: true })）。
  // 这里显式写出来，避免「隐式默认」在某次 Astro 升级里被悄悄改掉。
  // 明确不改的两个方向：不改 viewport（移动端一进页面就预取全部可见链接，流量开销明显）；
  // 不改 false（prefetch 是 ClientRouter「体感快」的主要来源）。单个链接要关就加 data-astro-prefetch="false"。
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover", // "tap" | "hover" | "viewport" | "load"
  },
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
});
