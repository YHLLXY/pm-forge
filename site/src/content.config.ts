import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const caseStudies = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/case-studies" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDatetime: z.date(),
    modDatetime: z.date().optional().nullable(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default([]),
    projectRole: z.string(),
    stack: z.array(z.string()).default([]),
    links: z
      .object({
        live: z.string().url().optional(),
        repo: z.string().url().optional(),
      })
      .default({}),
    metrics: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
          note: z.string().optional(),
        })
      )
      .default([]),
    resultsNote: z.string().optional(),
    ogImage: z.string().optional(),
  }),
});

const analysis = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/analysis" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDatetime: z.date(),
    modDatetime: z.date().optional().nullable(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default([]),
    dataset: z.string(),
    reportUrl: z.string().optional(),
  }),
});

const toolkitReports = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/toolkit-reports" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDatetime: z.date(),
    draft: z.boolean().optional(),
    toolId: z.enum(["competitor-analysis", "feedback-insights", "prd-draft", "evals"]),
    toolName: z.string(),
    promptVersion: z.string(),
    inputSummary: z.string(),
    generatedBy: z.string(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    canonicalURL: z.string().optional(),
  }),
});

// A1 AI 产品拆解板块：报告 md（每产品一篇）+ 评测记录 JSON（每条实测一条）
// 记录 schema = spec §9.2 接缝的 operable 化；交叉不变量由 scripts/check-dissections.mjs 兜底
const dissections = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/dissections" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDatetime: z.date(),
    modDatetime: z.date().optional().nullable(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default([]),
    product: z.enum(["doubao", "kimi", "deepseek"]),
    productName: z.string(),
    depth: z.enum(["主评", "对照评"]),
    accountType: z.string(),
    evalWindow: z.string(),
    versionNote: z.string(),
    charterVersion: z.string(),
    tasksetRef: z.string(),
  }),
});

const dissectionRecordShape = z
  .object({
    id: z.string(),
    product: z.enum(["doubao", "kimi", "deepseek"]),
    group: z.enum(["写作", "检索", "结构化产出", "边界探测"]),
    task: z.string(),
    inputExcerpt: z.string(),
    outputExcerpt: z.string(),
    // 铁律 3：日期 + 版本标注是每条结论的硬前置（缺 = 构建失败）
    evalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    versionNote: z.string().min(1),
    accountType: z.string().min(1),
    scores: z.object({
      factuality: z.number().int().min(1).max(5).nullable(),
      structure: z.number().int().min(1).max(5).nullable(),
      actionability: z.number().int().min(1).max(5).nullable(),
      instruction: z.number().int().min(1).max(5).nullable(),
    }),
    productMetrics: z.object({
      latencyTier: z.enum(["快", "中", "慢"]),
      paywallHit: z.boolean(),
      uxNotes: z.string().nullable(),
    }),
    verdict: z.enum(["成功", "部分", "失败"]),
    failureAnalysis: z.string().nullable(),
    screenshot: z.string().nullable(),
  })
  // verdict ≠ 成功 必须给出归因（zod 层先拦一道，check-dissections 再兜底）
  .superRefine((rec, ctx) => {
    if (rec.verdict !== "成功" && !(rec.failureAnalysis ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["failureAnalysis"],
        message: `记录 ${rec.id}：verdict=${rec.verdict} 但缺少 failureAnalysis（章程 §4）`,
      });
    }
  });

const dissectionRecords = defineCollection({
  loader: glob({ pattern: "**/[^_]*.json", base: "./src/content/dissection-records" }),
  schema: dissectionRecordShape,
});

export const collections = { caseStudies, analysis, toolkitReports, pages, dissections, dissectionRecords };
