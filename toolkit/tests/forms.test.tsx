import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CompetitorForm } from "@/components/forms/competitor-form";
import { FeedbackForm } from "@/components/forms/feedback-form";
import { PrdForm } from "@/components/forms/prd-form";
import { competitorInputSchema } from "@/tools/schemas";

describe("CompetitorForm", () => {
  it("填写合法后提交，payload 通过 schema", async () => {
    const onSubmit = vi.fn();
    render(<CompetitorForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("分析目的"), "为 Q4 选择差异化方向");
    await userEvent.type(screen.getByLabelText("我方产品"), "随手记账：大学生极简记账小程序");
    await userEvent.type(screen.getByLabelText("竞品名称"), "钱迹");
    await userEvent.click(screen.getByRole("button", { name: "生成报告" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(competitorInputSchema.safeParse(onSubmit.mock.calls[0][0]).success).toBe(true);
  });
  it("目的为空提交显示错误且不触发 onSubmit", async () => {
    const onSubmit = vi.fn();
    render(<CompetitorForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("我方产品"), "随手记账：大学生极简记账小程序");
    await userEvent.type(screen.getByLabelText("竞品名称"), "钱迹");
    await userEvent.click(screen.getByRole("button", { name: "生成报告" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/请写清分析目的/)).toBeInTheDocument();
  });
});

describe("FeedbackForm", () => {
  it("多行文本按行切分为 feedbacks（过滤空行）", async () => {
    const onSubmit = vi.fn();
    render(<FeedbackForm onSubmit={onSubmit} />);
    await userEvent.type(
      screen.getByLabelText("反馈列表"),
      "等了十分钟没人接单\n司机爽约了\n界面很好看\n支付总是失败\n想要包月套餐\n客服不理人",
    );
    await userEvent.click(screen.getByRole("button", { name: "开始分析" }));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.feedbacks).toHaveLength(6);
    expect(payload.feedbacks[0]).toContain("等了十分钟");
  });
  it("少于 5 条显示错误不提交", async () => {
    const onSubmit = vi.fn();
    render(<FeedbackForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("反馈列表"), "只有一条反馈\n第二条\n第三条\n第四条");
    await userEvent.click(screen.getByRole("button", { name: "开始分析" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/至少 5 条/)).toBeInTheDocument();
  });
});

describe("PrdForm", () => {
  it("填写完整后提交", async () => {
    const onSubmit = vi.fn();
    render(<PrdForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("产品/模块"), "随手记账");
    await userEvent.type(screen.getByLabelText("需求名称"), "月度报告导出 PDF");
    await userEvent.type(screen.getByLabelText("背景描述"), "用户只能截图分享报告，排版差");
    await userEvent.type(screen.getByLabelText("目标用户与场景"), "大学生月底分享报告给家人");
    await userEvent.click(screen.getByRole("button", { name: "生成 PRD 草稿" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
