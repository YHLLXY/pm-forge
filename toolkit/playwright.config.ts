import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:3100" },
  webServer: {
    command: "npm run dev -- --port 3100",
    port: 3100,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      MOCK_LLM: "1",
      NEXT_TELEMETRY_DISABLED: "1",
      // e2e 跑在 3100 端口，不在默认白名单（toolbox 域 + localhost:3000）——
      // bfb825f 落地同源校验时 e2e 未同步，存量断裂由 Next 16 专项全量回归暴露
      ALLOWED_ORIGINS: "http://localhost:3100",
    },
  },
});
