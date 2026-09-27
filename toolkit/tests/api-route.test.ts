// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/tools/[tool]/route";
import { competitorInputSchema } from "@/tools/schemas";
import { getTool } from "@/tools/registry";

function req(tool: string, body: unknown) {
  return new Request(`http://localhost/api/tools/${tool}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const ctx = (tool: string) => ({ params: Promise.resolve({ tool }) });
const validInput = competitorInputSchema.parse({
  purpose: "为迭代选择差异化方向",
  myProduct: "随手记账：面向大学生的极简记账小程序",
  competitors: [{ name: "钱迹" }],
});

describe("POST /api/tools/[tool]", () => {
  it("未知工具 404", async () => {
    const res = await POST(req("nope", { input: {} }), ctx("nope"));
    expect(res.status).toBe(404);
  });
  it("非法输入 400 INVALID_INPUT", async () => {
    const res = await POST(req("competitor-analysis", { input: { purpose: "" } }), ctx("competitor-analysis"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("INVALID_INPUT");
  });
  it("mock 模式流式返回完整 fixture，带 X-PMForge-Mode: mock", async () => {
    const res = await POST(req("competitor-analysis", { input: validInput }), ctx("competitor-analysis"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-PMForge-Mode")).toBe("mock");
    expect(res.headers.get("Content-Type")).toContain("text/plain");
    expect(await res.text()).toBe(getTool("competitor-analysis")!.fixture);
  });
  it("超预算且未 force → 400 TOKEN_BUDGET（用极小的 max 模拟）", async () => {
    process.env.LLM_MAX_INPUT_TOKENS = "1";
    const res = await POST(req("competitor-analysis", { input: validInput }), ctx("competitor-analysis"));
    delete process.env.LLM_MAX_INPUT_TOKENS;
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("TOKEN_BUDGET");
  });
  it("超预算但 force=true → 放行", async () => {
    process.env.LLM_MAX_INPUT_TOKENS = "1";
    const res = await POST(req("competitor-analysis", { input: validInput, force: true }), ctx("competitor-analysis"));
    delete process.env.LLM_MAX_INPUT_TOKENS;
    expect(res.status).toBe(200);
  });
});
