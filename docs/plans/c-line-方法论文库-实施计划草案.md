# pm-forge C 线（vault → 公开方法论文库）实施计划草案

> **状态：草案**（2026-10-07 由 11 月窗口包 Task 7 落盘，寒假 2027-01 执行）。
> REQUIRED SUB-SKILL: superpowers:executing-plans。本稿是 writing-plans 全格式草案，
> **执行前必须先做 Task 0 刷新**——距执行约 3 个月，vault-tools 命令面、site 集合结构、
> vault 笔记位置都会演进，本稿引用的路径/命令/结构以 Task 0 重核结果为准，不照抄。

**Goal:** 按 spec §6 把 vault 中干净的方法论笔记经安全管线发布到公开站：vault-tools 新增
`publish` 子命令（白名单 → 自动脱敏扫描 → wikilink 重写 → frontmatter 转换 → 输出 out/），
site 侧新增 methods 集合，试点发布《键控消歧设计》。**宁缺毋滥：试点过审前不谈规模。**

**Architecture:** 管线五步单向（vault → out/ → 人工通读 → site/content/methods/ → 构建校验），
`publish` 永不直写 site、更不写 vault（沿 vault-tools 两步式交付铁律：`--out` 指向 vault 内
会被拒绝）。脱敏扫描器是独立模块（可单测），publish 只做编排。site 侧照 pages 集合模式
最小实现，不引入新框架能力。

**Tech Stack:** vault-tools Python（stdlib + pytest，沿 M4 先例零新依赖）；site Astro 7 +
content collections（零新依赖）。

**Spec:** docs/specs/2026-09-29-pm-forge-二期评测线与交互报告设计.md §6（管线五步、扫描器
词表、试点篇目、C 验收四条定死）。

## Global Constraints（隐私红线复述——C 线的存在理由）

- **vault 个人档案永不上公开站**（家庭/成绩/情感/真实他人姓名/内部域名）。publish 管线是
  唯一出口，出口处必须有机器扫描 + 人工通读双闸。
- **情感/家庭类词表命中即硬 fail**（exit 非 0、不产文件），其余类别命中人工复核后放行。
- **白名单机制**：不在白名单里的文件即使误操作也进不了管线——这条必须有测试证明（C 验收③）。
- 两步式发布：publish 只写 `vault-tools/out/publish/`（gitignore）→ 人工通读 → **显式拷贝**
  site/content/methods/ → vault 原文 diff 终检 → 显式 `git add <路径>` 提交。
- git：显式 add（禁 add -A）；commit 前缀 feat:/fix:/docs:；每 commit 必 push；vault 与
  pm-forge 是两个仓库，发布动作的 commit 各自落库。
- 公开站零第三方运行时资源；C 线不新增任何 npm/pip 依赖。

## Task 0: 执行前刷新（不通过不得开工）

- [ ] 重核 vault-tools 命令面：`python -m vault_tools --help` 实跑，确认 orphans/indexdiff/report
      仍在、参数形状（--vault/--out 语义）未变；若有破坏性演进，本稿 Task 2/3 的集成点重写。
- [ ] 重核试点文章在位且内容未大改：`40-经验教训/Obsidian知识库/2026-09-28-vault只读巡检
      三件套的键控消歧设计.md`（2026-10-07 实查在位，frontmatter date/tags/source: claude/area）；
      若 vault 重组导致路径变化，更新本稿所有引用。
- [ ] 重核 site 集合结构：src/content.config.ts 的 pages 集合定义（methods 照此模式）、
      src/pages/ 路由组织、构建校验入口（npm run build）。
- [ ] 重读 spec §6 与 A1 章程隐私红线，确认 C 验收四条未被后续修订改动。
- [ ] `git -C "E:\knowledge home" status` 干净（vault 仓库基线确认）。
- [ ] 刷新本稿：把 Task 0 发现的差异直接改进卡片（行号/路径/命令），再开始 Task 1。

## Task 1: 脱敏扫描器（先做——它是 publish 的硬闸）

**Files:**
- Create: `vault-tools/src/vault_tools/redact.py`（扫描器模块，独立于 CLI 可单测）
- Create: `vault-tools/redact-words.toml`（词表配置：六类分档，见下）
- Modify: `vault-tools/tests/`（正/负夹具 + pytest）

**Interfaces:**
- `scan_file(path: Path, words: RedactWords) -> list[Finding]`；
  `Finding = {category, line_no, severity: "hard"|"review", snippet(截断≤40字)}`。
- 任一 `hard` 命中 → 调用方必须整体拒绝（publish 不产该文件）；`review` 命中 → 人工逐条拍板。

**词表六类（spec §6）：**
1. `real_names`（真实人名，review）——用户维护，含家人/同学/同事；
2. `school_class`（学校/班级/学号，review）；
3. `grades`（成绩数字模式，review——正则：绩点/排名/分数语境）；
4. `emotion_family`（情感/家庭语境词，**hard**——命中即 fail，宁可误杀）；
5. `internal_domains`（内部域名/内网地址，hard）；
6. `id_patterns`（手机号/身份证号/学号正则，hard）。

- [ ] Step 1: 词表 TOML schema + 加载函数 + 注释写明"词表是用户隐私的守门清单，提交前自查
      词表本身不含真实隐私值"（词表入 git，但只放模式与代称，不放真人名——真人名由用户在
      本地补充进 gitignore 的 `redact-words.local.toml`，加载时合并）。
- [ ] Step 2: `scan_file` 实现（逐行扫；剥代码围栏块与行内码后再扫——照 M4 scan.py 剥围栏
      先例，防"反引号里的词表词误报"）。
- [ ] Step 3: pytest 正/负夹具：正夹具六类各至少 1 命中且 severity 正确；负夹具干净文章 0 命中；
      代码块内出现词表词不误报；hard 类命中时 publish 拒绝语义的单测。
- [ ] Step 4: pytest 全绿（M4 存量 37 + 新增）→ commit + push。

## Task 2: vault-tools `publish` 子命令（编排，只写 out/）

**Files:**
- Modify: `vault-tools/src/vault_tools/cli.py`（新增 sub.add_parser("publish")）
- Create: `vault-tools/src/vault_tools/publish.py`
- Create: `vault-tools/publish-whitelist.toml`（白名单：条目 = vault 相对路径 + 目标 slug）
- Modify: `vault-tools/tests/`（publish 编排测试：tmp vault 夹具）

**管线五步（spec §6，publish 内部顺序）：**
1. 白名单加载：不在白名单的路径直接拒绝（`exit 3`，报"不在白名单"）；
2. 脱敏扫描：调 Task 1 `scan_file`；hard → `exit 4` 不产文件；review → 列出命中行等人工
   `--allow-review` 显式放行（放行动作记录进 out/publish/manifest.json）；
3. wikilink 重写（Task 3）；
4. frontmatter 转换：vault 的 date/tags/source/area → site methods 集合 schema 所需字段
   （保留 `source: claude`，补 `methodDate` 等，以 Task 4 定的 schema 为准）；
5. 输出 `vault-tools/out/publish/<slug>.md` + `manifest.json`（源路径/扫描结论/重写统计）。
   **绝不写 site/ 与 vault/**；`--out` 指向 vault 内拒绝（沿 M4 铁律，exit 2）。

- [ ] Step 1: publish-whitelist.toml 加载 + 白名单外拒绝测试（tmp vault 夹具：白名单外文件
      即使存在于 vault 也进不了管线——C 验收③的测试证明）。
- [ ] Step 2: 五步编排 + exit code 语义（0 成功 / 2 out 越界 / 3 不在白名单 / 4 hard 命中）。
- [ ] Step 3: pytest 编排夹具全绿 → commit + push。

## Task 3: wikilink 重写器

**Files:**
- Create: `vault-tools/src/vault_tools/wikilink.py`（并入 Task 2 的 publish 编排）
- Modify: `vault-tools/tests/`

**规则（spec §6：vault 内链 → 移除或改"相关方法论"占位）：**
- `[[wiki链接]]`：解析出目标后**移除**（链接目标在公开站无对应物）；若是方法论间互链且目标
  已在白名单 → 改写为站内 `/methods/<slug>/` 链接（试点期通常为空，占位保留）。
- `[文本](http(s)://…)` 外链：**保留**（试点文章含真实仓库链接，是可核验性的一部分）。
- `[文本](obsidian://…)` 或 vault 相对路径 md 链接：移除链接保文本。
- 代码围栏块/行内码内的一切不改（剥围栏先例）。
- 重写统计（改了几处内链/移除几个 wikilink）写进 manifest.json，供人工通读核对。

- [ ] Step 1: 三类链接各写正/负单测（含"代码块里的 [[x]] 不动"）。
- [ ] Step 2: 与 publish 编排联通测试 → commit + push。

## Task 4: site 侧 methods 集合（最小实现）

**Files:**
- Modify: `site/src/content.config.ts`（新增 methods 集合：methodDate/tags/source + body）
- Create: `site/src/content/methods/`（空集合，.gitkeep）
- Create: `site/src/pages/methods/index.astro`（列表页，照 pages 列表模式）
- Create: `site/src/pages/methods/[...slug].astro`（单篇页，文章渲染照案例页模式）
- Modify: `site/src/pages/index.astro`（首页板块行加"方法论"入口——若首页结构已演进，按
  当时的板块结构插入，不硬编码位置）

- [ ] Step 1: 集合 schema + 列表/单篇页（零新依赖，样式沿用站内 token）。
- [ ] Step 2: `npm run build` 绿（空集合也要能构建）+ lh 跑一遍新页 → commit + push。

## Task 5: 试点发布《键控消歧设计》（两步式全流程首演）

- [ ] Step 1: `python -m vault_tools publish --vault "E:\knowledge home" --entry 2026-09-28-
      vault只读巡检三件套的键控消歧设计`（确切参数以 Task 0 刷新为准）→ out/publish/ 产物。
- [ ] Step 2: **人工通读**（用户 + AI 各一遍）：对照 manifest.json 的扫描结论与重写统计逐项核；
      review 类命中逐条拍板；这一步不过，后续全停。
- [ ] Step 3: 显式拷贝 `out/publish/<slug>.md` → `site/src/content/methods/`；
      `npm run build` + 公开站内链零悬空检查（grep 产物链接逐个 curl/本地路由核对）。
- [ ] Step 4: vault 原文 diff 终检：`diff <vault 原文> <published>` 确认差异仅 = wikilink 重写 +
      frontmatter 转换（无内容增删——防"发布版悄悄改写方法论结论"）。
- [ ] Step 5: pm-forge `git add site/src/content/methods/...` + commit + push；Vercel 部署后
      线上抽查（页 200 / 搜索收录 / 首页入口）；vault 仓库若有词表本地文件改动单独 commit。

## Task 6: C 验收四条核验 + 收账

- [ ] ① 试点文章上线且公开站内链零悬空（Task 5 Step 3 的证据链接到这里）；
- [ ] ② 脱敏扫描器 pytest 全绿（正/负用例夹具）；
- [ ] ③ 白名单外内容进不了管线（Task 2 Step 1 的测试证明）；
- [ ] ④ 发布前人工通读 + 对照 vault 原文 diff 终检（Task 5 Step 2/4 记录）。
- [ ] README changelog + STATUS 记账（vault 双写：vault AGENTS.md 若需记录词表本地文件约定，
      由用户在 vault 侧落笔）。

## 验收清单（= spec §6 C 验收四条，定死不改）

- [ ] 试点文章上线，站内链零悬空
- [ ] 脱敏扫描器 pytest 全绿（正/负夹具）
- [ ] 白名单外内容进不了管线（测试证明）
- [ ] 人工通读 + vault 原文 diff 终检留痕

## 已知取舍与风险（诚实记录）

- **试点期白名单只有 1 篇**：宁缺毋滥是 spec 铁律；扩白名单是未来动作，不在本稿。
- **词表冷启动**：2026-10-07 起草时词表为空壳——真实词表由用户在本地文件补充（gitignore），
  Task 1 的夹具用虚构词演示，**夹具词必须是编造的**（防夹具本身泄隐私）。
- **草案不带逐字代码**：与正式实施计划的区别——写计划（寒假）时按 Task 0 刷新结果重写
  实现级细节；本稿的接口签名/exit code 语义是设计承诺，不是实现事实。
- **评分/搜索/RSS 集成不做**：methods 先进站内既有 pagefind 与 RSS 通路（若集合配置自动
  收录则零改动；不自动收录也不在本稿扩）。
- **vault 是用户隐私重地**：所有 vault-tools 命令保持只读 vault 纪律（M4 铁律），publish 的
  唯一写目标是 out/（gitignore）。
