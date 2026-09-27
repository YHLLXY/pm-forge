import { z } from "zod";

export const competitorInputSchema = z.object({
  purpose: z.string().min(5, "请写清分析目的（为了什么决策）").max(500),
  myProduct: z.string().min(10, "请描述你的产品：名称、定位、现状").max(3000),
  competitors: z
    .array(
      z.object({
        name: z.string().min(1, "竞品名称必填").max(100),
        notes: z.string().max(2000).default(""),
      }),
    )
    .min(1, "至少填 1 个竞品")
    .max(5, "竞品不超过 5 个"),
  materials: z.string().max(8000).default(""),
});
export type CompetitorInput = z.infer<typeof competitorInputSchema>;

export const feedbackInputSchema = z.object({
  productContext: z.string().max(500).default(""),
  feedbacks: z
    .array(z.string().min(2, "单条反馈至少 2 个字符").max(500))
    .min(5, "至少 5 条反馈才有聚类意义")
    .max(200, "反馈最多 200 条，请分批分析"),
});
export type FeedbackInput = z.infer<typeof feedbackInputSchema>;

export const prdInputSchema = z.object({
  moduleName: z.string().min(2, "产品/模块名必填").max(100),
  requirementName: z.string().min(2, "需求名称必填").max(100),
  background: z.string().min(10, "请写背景：问题、机会、为什么现在做").max(4000),
  users: z.string().min(5, "请描述目标用户与核心场景").max(2000),
  constraints: z.string().max(2000).default(""),
  materials: z.string().max(8000).default(""),
});
export type PrdInput = z.infer<typeof prdInputSchema>;
