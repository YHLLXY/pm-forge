import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToolWorkbench } from "@/components/tool-workbench";
import { getTool } from "@/tools/registry";

const prdFixture = getTool("prd-draft")!.fixture;
const fbFixture = getTool("feedback-insights")!.fixture;

function stubFetch(kind: "stream" | "budget", fixture: string) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/health")) {
      return new Response(JSON.stringify({ mode: "mock", model: null }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (kind === "budget") {
      return new Response(
        JSON.stringify({ code: "TOKEN_BUDGET", estimated: 9000, max: 8000 }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      start(c) {
        for (let i = 0; i < fixture.length; i += 50) {
          c.enqueue(enc.encode(fixture.slice(i, i + 50)));
        }
        c.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-PMForge-Mode": "mock",
      },
    });
  });
}

async function fillPrdForm() {
  await userEvent.type(screen.getByLabelText("产品/模块"), "随手记账");
  await userEvent.type(screen.getByLabelText("需求名称"), "月度报告导出 PDF");
  await userEvent.type(screen.getByLabelText("背景描述"), "用户只能截图分享报告，排版差");
  await userEvent.type(screen.getByLabelText("目标用户与场景"), "大学生月底分享报告给家人");
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("ToolWorkbench", () => {
  it("PRD：流式输出 fixture 并写入历史", async () => {
    vi.stubGlobal("fetch", stubFetch("stream", prdFixture));
    render(<ToolWorkbench toolId="prd-draft" />);
    await fillPrdForm();
    await userEvent.click(screen.getByRole("button", { name: "生成 PRD 草稿" }));
    await waitFor(() =>
      expect(screen.getByTestId("tool-output")).toHaveTextContent("六、风险与开放问题"),
    );
    expect(screen.getByRole("button", { name: /下载/ })).toBeInTheDocument();
    const hist = JSON.parse(localStorage.getItem("pmforge:history:prd-draft") ?? "[]");
    expect(hist).toHaveLength(1);
    expect(hist[0].mode).toBe("mock");
  });

  it("反馈洞察：完成后显示主题卡与优先级矩阵", async () => {
    vi.stubGlobal("fetch", stubFetch("stream", fbFixture));
    render(<ToolWorkbench toolId="feedback-insights" />);
    await userEvent.type(
      screen.getByLabelText("反馈列表"),
      "等了十分钟没人接单\n司机爽约了\n界面很好看\n支付总是失败\n想要包月套餐\n客服不理人",
    );
    await userEvent.click(screen.getByRole("button", { name: "开始分析" }));
    await waitFor(() => expect(screen.getByText("叫车匹配慢")).toBeInTheDocument());
    expect(screen.getByTestId("priority-matrix")).toBeInTheDocument();
    expect(screen.queryByTestId("tool-output")).not.toBeInTheDocument();
  });

  it("超预算错误显示可读文案（含估值与上限）", async () => {
    vi.stubGlobal("fetch", stubFetch("budget", prdFixture));
    render(<ToolWorkbench toolId="prd-draft" />);
    await fillPrdForm();
    await userEvent.click(screen.getByRole("button", { name: "生成 PRD 草稿" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("超过单次上限 8000"),
    );
  });

  it("演示模式徽章可见", async () => {
    vi.stubGlobal("fetch", stubFetch("stream", prdFixture));
    render(<ToolWorkbench toolId="prd-draft" />);
    await waitFor(() =>
      expect(screen.getByTestId("mode-badge")).toHaveTextContent("演示模式"),
    );
  });

  it("历史记录可查看与返回", async () => {
    localStorage.setItem(
      "pmforge:history:prd-draft",
      JSON.stringify([
        { id: "x1", ts: 1758900000000, mode: "mock", input: {}, output: "# 历史输出" },
      ]),
    );
    vi.stubGlobal("fetch", stubFetch("stream", prdFixture));
    render(<ToolWorkbench toolId="prd-draft" />);
    await waitFor(() => expect(screen.getByTestId("history-panel")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /演示/ }));
    expect(screen.getByText("历史输出")).toBeInTheDocument();
    expect(screen.getByText(/正在查看/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "返回" }));
    expect(screen.queryByText(/正在查看/)).not.toBeInTheDocument();
  });
});
