import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest globals:false 时无自动 cleanup，需手动（否则跨用例重复渲染）
afterEach(() => {
  cleanup();
});
