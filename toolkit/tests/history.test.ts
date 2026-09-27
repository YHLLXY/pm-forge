import { beforeEach, describe, expect, it } from "vitest";
import { clearRuns, deleteRun, listRuns, saveRun } from "@/lib/history";

beforeEach(() => {
  localStorage.clear();
});

describe("history（localStorage 最近 10 次）", () => {
  it("保存并可读出，新记录在前", () => {
    saveRun("prd-draft", { mode: "mock", input: { a: 1 }, output: "第一" });
    saveRun("prd-draft", { mode: "mock", input: { a: 2 }, output: "第二" });
    const runs = listRuns("prd-draft");
    expect(runs).toHaveLength(2);
    expect(runs[0].output).toBe("第二");
    expect(runs[0].id).toBeTruthy();
    expect(typeof runs[0].ts).toBe("number");
  });
  it("超过 10 条截断保留最新", () => {
    for (let i = 0; i < 12; i++) {
      saveRun("prd-draft", { mode: "mock", input: i, output: `o${i}` });
    }
    const runs = listRuns("prd-draft");
    expect(runs).toHaveLength(10);
    expect(runs[0].output).toBe("o11");
  });
  it("按工具隔离存储", () => {
    saveRun("prd-draft", { mode: "mock", input: 1, output: "a" });
    saveRun("competitor-analysis", { mode: "mock", input: 1, output: "b" });
    expect(listRuns("prd-draft")).toHaveLength(1);
    expect(listRuns("competitor-analysis")).toHaveLength(1);
  });
  it("deleteRun 与 clearRuns", () => {
    const e = saveRun("prd-draft", { mode: "mock", input: 1, output: "a" });
    saveRun("prd-draft", { mode: "mock", input: 2, output: "b" });
    deleteRun("prd-draft", e.id);
    expect(listRuns("prd-draft")).toHaveLength(1);
    clearRuns("prd-draft");
    expect(listRuns("prd-draft")).toHaveLength(0);
  });
});
