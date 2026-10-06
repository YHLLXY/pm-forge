# lessons-learned.md

> 项目专属经验（vault AGENTS.md 第十六节）：每次 commit 后自问"有没有值得记录的经验"；有则按 问题描述→根因→解决方案→如何避免 格式追加，并双写 vault `40-经验教训/`。

（暂无条目）

## 2026-09-26 pre-commit 拉取钩子仓库被墙

- **问题**：`pre-commit run` 卡在 `unable to access 'https://github.com/astral-sh/ruff-pre-commit/'`（GitHub HTTPS 443 超时）。
- **根因**：pre-commit 底层用 `git clone` 拉取钩子仓库，走 GitHub HTTPS，与 vault AGENTS.md 记录的"GitHub 不稳定"同源。
- **解决方案**：git URL 重写走镜像——`git config --local url."https://gh-proxy.com/https://github.com/".insteadOf "https://github.com/"`（仅本仓生效，SSH 推送不受影响）。会话级临时方案可用 `GIT_CONFIG_COUNT=1` 环境变量注入。
- **如何避免**：凡 `git clone`/工具内部克隆 GitHub HTTPS 的场景（pre-commit、uv 缓存、模板下载），一律配 insteadOf 镜像；配置写进新仓库的初始化清单。

## 2026-09-29 evals 门禁：通过率分母口径与 judge 盲区

- **问题**：①基线报告里 must_include 通过率显示 18%，人工复核四条案例明明全部命中；②judge 把反馈工具的"忠实汇总 6 条重复反馈"判成幻觉（6 条数量无来源），竞品报告一处真正的凭空断言反而是 judge 抓到的。
- **根因**：①不同案例的检查项集合不同（must_include 只在 4 个案例上存在），聚合却除以了全部 ok 案例数——分母口径错误稀释了真实通过率；②judge 提示词的 rubric 锚点按 Markdown 证据链报告写，且只看输出不看输入——对 JSON 契约工具系统性误伤（锚点错位），对"忠实去重合并"类行为无法归因（无输入上下文）。
- **解决方案**：①聚合改为按检查项存在口径（分母=该检查出现的案例数），并抽出 `_summarize`/`rebuild_summary`——原始 results.jsonl 是唯一事实源，修口径后从原始行重建 summary，不用重跑真实评测；②rubric 按工具定制锚点 + judge 输入一并送上（v2 已立项记录）；judge 偶发畸形 JSON（evidence 内英文双引号破坏 JSON）用"提示词禁止 + JudgeError 带更正提示重试一次"双保险兜住。
- **如何避免**：任何"通过率/均分"聚合动手前先问"这个统计项在每个被统计对象上都存在吗"；LLM 评分必须做盲评校准——**分歧的模式比一致率数字更重要**，它定位的是评分器的错位而非被评者的问题；评分链路里 LLM 的输出永远是"可能畸形的"，解析层必须有重试与显式失败路径。

## 2026-10-02 E 包：Vite 动态导入占位符 / 导航溢出 / sitemap 取反

- **问题**：①搜索页 `import("/pagefind/pagefind.js")` 源码能跑、产物必炸（被 catch 吞成"索引不可用"）；②header 加第 6 个文字导航项后所有链接文字竖排换行（无任何报错）；③改 sitemap filter 时把原布尔逻辑取反，会让 showArchives=false 时整个 sitemap 清空（自查抓住未上线）。
- **根因**：①Astro 转译丢掉 `@vite-ignore`，Vite 把动态导入包进预加载助手且产物留下未替换的 `__VITE_PRELOAD__` 占位符→运行时 ReferenceError；②AstroPaper 导航链接无 nowrap，flex 收缩越过后中文折行——量变布局回归只有观感没有报错；③布尔逻辑手工德摩根变换改真值表。
- **解决方案**：①运行时注入 module script（`window.__pagefind` + ready 事件 + onerror + 超时三兜底），打包器零接触；②搜索改图标入口（上游惯例），几何实测全链接 h=32 单行、抽屉 7 行偏移 0px；③铁律"原表达式原样保留、外层追加新条件"。
- **如何避免**：加载构建后才存在的运行时资产（pagefind/WASM）一律 script 注入；客户端加载逻辑必须在 `astro preview` 的构建产物上验证，dev 能跑证明不了任何事；布局改动用 getBoundingClientRect 量数字而非目测；双写 vault `40-经验教训/前端架构/2026-10-02-搜索复活踩坑-Vite动态导入占位符与导航溢出.md`。

## 2026-10-03 A1 审查：Astro 表达式容器禁语句（二次踩坑）

- **问题**：RecordCard 截图块重写时把 `const shotKey = ...; const dims = ...` 写进模板表达式容器，`astro check` 报 12 个错误，且错误从声明处向下游级联（后续合法的中文文本、模板字符串全被判 Unexpected token）。
- **根因**：Astro 表达式容器 `{...}` 只接受**表达式**，不接受语句；解析器在非法 token 处错位后，把其后所有内容按错误路径解析——报错位置远离真实病灶。这是本分支第二次踩同一坑（T6 首次以"内联"规避，重写时又忘了）。
- **解决方案**：把派生值计算全部提到 frontmatter（`const shotDims = record.screenshot ? (SHOT_DIMS[...] ?? null) : null;`），模板容器里只留 `shotDims && (...)` 纯表达式。
- **如何避免**：模板里出现"先算一个中间值再用"的需求时，条件反射去 frontmatter 开变量；`astro check` 的级联报错先看**最靠前的第一个**错误，它才是病灶。
