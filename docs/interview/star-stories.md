# STAR 面试故事库

按考点组织，每个故事四段（情境/任务/行动/结果）+ 证据指针。使用规则：数字必须与仓库一致，讲述时不新增仓库里没有的细节；隐私红线（家庭/成绩/他人姓名）不出现。

## S1「假绿提交」：构建门禁的信任崩塌与重建（考点：工程判断）

- **S**：B 线实施第一晚，Task 1 提交前跑 `npm run build | grep …; echo $?`，`$?` 显示 0，照常提交。
- **T**：构建门禁本该真实拦截失败，而不是给我假信心。
- **A**：事后发现那次构建实际 OOM——`$?` 取到的是管道末尾 grep 的退出码。修复：PIPESTATUS/链尾直取 + 以「看到完成标记」（pagefind 输出）为通过依据；教训写入 lessons-learned 与协作者长期记忆。
- **R**：此后提交零假绿，「验证要看链尾完成标记」成为项目级提交前检查项并进入协作者长期记忆。
- **证据**：docs/lessons-learned.md「B 线执行复盘」；提交前检查纪律在后续 STATUS 补记的验证段可见。

## S2 astro check 稳定 OOM 的根因定位（考点：工程判断）

- **S**：本地 `astro check` 稳定 OOM（8GB 堆也不够），但 Vercel 构建一直正常——矛盾。
- **T**：找根因，不做「加内存」式绕过。
- **A**：临时文件移动 + git stash 二分：public/ 大文件移走后 check 通过，锁定 tsconfig `include:["**/*"]` 把 34MB wasm 扫进语言服务 → `exclude: ["dist", "public"]` 整目录根治；矛盾闭合（Vercel 不跑 astro check）。
- **R**：check 从爆堆到秒级通过；根因解释写进 STATUS 偏差清单。
- **证据**：docs/STATUS.md 2026-10-06「对计划的偏差」；site/tsconfig.json。

## S3 DuckDB 跨端时区分叉（考点：数据分析口径）

- **S**：同一条 SQL，Python 预生成与浏览器 WASM 查询的小时分布对不上——「读者复算」主张的底线被击穿。
- **T**：两端必须逐值一致。
- **A**：根因是 `to_timestamp` 返回 TIMESTAMPTZ、`strftime` 按会话时区渲染（本机 Asia/Shanghai vs WASM UTC）。放弃依赖时区设定，改纯整数墙钟运算（`(ts+28800)//86400` 取日、`%86400//3600` 取时）；同时补确定性 ORDER BY（含并列值 dim 平局裁决），幂等重生成 diff-to-zero 验证。
- **R**：Python/浏览器/pandas 三端 10 问逐值一致，口径差异从「环境依赖」降为「零」。
- **证据**：analysis/src/pmforge_analysis/precompute_story.py；check_story_presets.py；docs/STATUS.md 2026-10-06 偏差清单。

## S4 叙事数字漂移：发布后复检抓出三处（考点：模型评估诚实度）

- **S**：B 线发布后复检发现页面叙事 89.4% 是截断（真值 89.48%→应写 89.5%）、「用户级抽样」措辞错误（实为行级 reservoir）、周末结论以偏概全（第一个周末与工作日持平）。
- **T**：叙事数字必须与数据工件逐值可对账，不能靠印象写。
- **A**：三处修正 + 把人工核对升级为可重跑资产：pandas 交叉验证入库（check_story_presets.py）、门禁反向自检内置（--reverse）、并立项 check-dissections 第七条门禁把「报告数字↔记录集合」机械化。
- **R**：该类错误从「靠审查抓」变成「靠构建拦」。
- **证据**：docs/STATUS.md「2026-10-06 深夜」补记；site/scripts/check-dissections.mjs ⑦。

## S5 评测驱动的第一次产品迭代（考点：AI 落地与评测）

- **S**：工具箱上线后，「质量」还只是感觉，没有回归手段。
- **T**：建测量体系，把「变好了」变成数字。
- **A**：66 例三工具评测集 + 结构检查器 + LLM-as-judge 四维评分（温度 0）+ 基线 run；基线抓到 4 例契约违例 → 三分类归因（2 真缺陷/1 契约过严/1 检查器级联误报）→ prompt v1.1 + 服务端校验重试 + 契约放松 → 复测 66 例结构检查 100%。
- **R**：产品迭代有了可回归的基线；全程报告化发布（两步式：staging → 代行终审 → 发布）。
- **证据**：evals/baseline/baseline.json；site 两篇 evals 报告。

## S6 门禁反向验证：测试的测试（考点：工程判断）

- **S**：门禁写了没人证明「该红时真的红」，等于没写——绿灯可能只是门禁坏了。
- **T**：每条门禁的有效性必须可一键复现。
- **A**：体积门禁临时限 1MB 必红；story 双门禁注入重资源必红（后内置 `--reverse` 自检）；第七条门禁三重反向验证（claims 改错/正文改错/假 ID 必红）。
- **R**：全部门禁有效性可复现，「质量是流程」从口号变成机制。
- **证据**：site/scripts/story-gates.mjs（--reverse）；本计划 Task 2 Step 3-5（实施计划 docs/plans/2026-10-06-pm-forge-门禁第七条与求职包装-实施计划.md）。
