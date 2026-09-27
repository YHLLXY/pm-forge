import { expect, test } from "@playwright/test";

// mock 模式（MOCK_LLM=1）下三工具端到端：M2 验收①的端到端证据

test("竞品分析：填写→流式输出→可导出", async ({ page }) => {
  await page.goto("/tools/competitor-analysis");
  await page.getByLabel("分析目的").fill("为 Q4 迭代选择差异化方向");
  await page
    .getByLabel("我方产品")
    .fill("随手记账：面向大学生的极简记账小程序，主打 10 秒记一笔");
  await page.getByLabel("竞品名称").fill("钱迹");
  await page.getByRole("button", { name: "生成报告" }).click();
  await expect(page.getByTestId("tool-output")).toContainText("差异化与机会点", {
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: /下载/ })).toBeVisible();
});

test("用户反馈洞察：6 条反馈→主题卡与优先级矩阵", async ({ page }) => {
  await page.goto("/tools/feedback-insights");
  const lines = [
    "等了十分钟没人接单",
    "司机爽约了",
    "界面很好看",
    "支付总是失败",
    "想要包月套餐",
    "客服不理人",
  ];
  await page.getByLabel("反馈列表").fill(lines.join("\n"));
  await page.getByRole("button", { name: "开始分析" }).click();
  await expect(page.getByText("叫车匹配慢")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("priority-matrix")).toBeVisible();
});

test("PRD 草稿：填写→六章结构输出", async ({ page }) => {
  await page.goto("/tools/prd-draft");
  await page.getByLabel("产品/模块").fill("随手记账");
  await page.getByLabel("需求名称").fill("月度报告导出 PDF");
  await page.getByLabel("背景描述").fill("用户只能截图分享月度报告，排版差");
  await page
    .getByLabel("目标用户与场景")
    .fill("大学生月底查看并分享消费报告给家人");
  await page.getByRole("button", { name: "生成 PRD 草稿" }).click();
  await expect(page.getByTestId("tool-output")).toContainText("六、风险与开放问题", {
    timeout: 30_000,
  });
});
