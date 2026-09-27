# toolkit · AI PM 工具箱

M2 模块：Next.js 15 + React 19 的 AI 产品经理工具站。三个工具：竞品分析 / 用户反馈洞察 / PRD 草稿。

- 提示词版本化在 `src/prompts/`，工具注册表在 `src/tools/registry.ts`，设计见 `../docs/specs/`
- 开发：`npm run dev`；测试：`npm test`（vitest）；端到端：`npm run test:e2e`（Playwright，mock 模式）
- 无 API Key 或 `MOCK_LLM=1` 时自动进入演示模式（固定样例输出）
- 配置：复制 `.env.example` 为 `.env`，填 `LLM_API_KEY`（默认 DeepSeek，国内直连）

任务进度见 `../docs/STATUS.md`。
