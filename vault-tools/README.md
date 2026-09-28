# vault-tools

pm-forge M4：Obsidian vault **只读巡检三件套**——孤立节点检测（全路径消歧）、索引完整性双向 diff、体检报告。

- 规格：`docs/specs/2026-09-26-pm-forge-地基工程设计.md` §M4
- 实施计划（含 obsidiantools 实测记录）：`docs/plans/2026-09-28-pm-forge-m4-实施计划.md`
- 正确性法源：vault 仓库 `AGENTS.md` 十八节「链接纪律与知识网维护」（v2.4）

## 安装

```bash
cd vault-tools
python -m venv .venv
./.venv/Scripts/python -m pip install -e ".[dev,crosscheck]" -i https://pypi.tuna.tsinghua.edu.cn/simple
```

核心零运行时依赖（纯 stdlib）；`crosscheck` extra 才装 obsidiantools（其依赖 pandas，钉 `<3`，隔离在本 venv，不动系统 Python）。

## 三命令

```bash
# ① 孤立节点检测（JSON → stdout）
./.venv/Scripts/python -m vault_tools orphans --vault "E:\knowledge home"

# ② 索引完整性双向 diff（JSON → stdout）
./.venv/Scripts/python -m vault_tools indexdiff --vault "E:\knowledge home"

# ③ 体检报告（markdown 写到 --out，绝不写 vault；可加 --crosscheck 对照节）
./.venv/Scripts/python -m vault_tools report --vault "E:\knowledge home" --out out --crosscheck
```

默认 vault 为 `E:\knowledge home`，`--vault` 可省略。

## 安全契约（先读再跑）

1. **对 vault 永远只读**：代码只做 `rglob`/`read_text`；测试里有「运行前后整树 SHA-256 不变」断言兜底（`test_report_writes_file_outside_vault`）。
2. **报告两步式交付**：扫描只写 `--out`（默认 `vault-tools/out/`，已 gitignore）→ 人工通读 → 显式拷贝进 `vault/91-MOC/` → 在 vault 仓库显式 `git add <报告路径>` + commit。`--out` 指向 vault 内会被拒绝（exit 2）。
3. **公开仓库红线**：pm-forge 是公开仓库。真实 vault 的报告/JSON 只存在于 `out/` 与 vault 仓库内，**绝不 commit 进 pm-forge**；测试只用合成夹具 `tests/fixtures/demo-vault/`。
4. 报告 YAML frontmatter 带 `source: claude`，正文有来源行（spec 要求的标注）。

## 判定规则（映射 AGENTS.md 十八节）

| AGENTS 规则 | 实现 |
|---|---|
| ① 每篇笔记 ≥1 入链（挂 _Index/门户口/MOC） | `orphans`：入链数为 0 的笔记，豁免 glob 命中者分组列出不计孤儿 |
| ② 链接目标必须实际存在 | `indexdiff.dangling`：_Index 里解析不到目标的条目（含 folder 断链） |
| ③ 所属目录 _Index 逐篇 wikilink | `indexdiff.missing_from_index`：区内笔记未被本区任何 _Index（含子目录级）收录 |
| 同名文件按全路径消歧 | 解析分层：裸名 `[[X]]` 计入**全部**同名 X（顶包安全方向：宁可漏报孤儿，不冤枉已挂链笔记）；路径式 wikilink 试根路径→源相对→Obsidian 式子路径；md 链接是显式路径，相对优先不扩散。同名文件进 `duplicate_stems`，被裸名链接命中的进「消歧警示」 |
| 刻意不连（runs/、语料/、.tools/）须写明 | `indexdiff.undeclared_exempt`：在门户口/所有 _Index 原文里找类别字符串，未声明即警告 |

其他默认口径：排除目录（`.git/.obsidian/.trash/node_modules/90-模板` 等，模板假链接不进图谱）、豁免 glob（根元文件、`**/_Index.md`、`**/docs/runs/**`、`**/语料/**`、`**/.tools/**`）见 `src/vault_tools/config.py`，全部注释出处。

## 为什么主扫描器自研，obsidiantools 只当对照（2026-09-28 实测）

对真实 vault（501 篇 md）实测 obsidiantools 0.11.0：connect+gather 约 62 秒；`md_file_index` **按笔记名（basename）键控**——501 篇塌缩成 494 键（11 个 `_Index.md` 等同名文件互相「顶包」）；`nonexistent_notes` 报 435 个，其中大量是实际存在的路径式链接（如 `00-Inbox/_Index`）被主键模型误判。它的 `isolated_notes` / `backlinks_index` 可作交叉参照，但**不能裁决**。全路径消歧必须自研——这就是本工具核心为零依赖 stdlib 的原因。`--crosscheck` 会把对照数字与差异原因写进报告第七节。

## 测试

```bash
./.venv/Scripts/python -m pytest -q     # 33 passed（夹具 16 篇覆盖 8 类情形）
```

夹具覆盖：同名文件消歧（两个 README + 4 个 _Index）、真孤儿、豁免（刻意不连）、悬空索引条目、folder 链接、锚点/别名、URL 编码 md 链接、模板目录排除、媒体嵌入不算未解析。

## P2（spec 明确不做 / 延后）

- obsidian-local-rest-api MCP 接入（届时单独设计）
- `--fail-on-orphans` 退出码（CI 门禁用）
- 趋势对比（vs 上次体检报告）
- 全库悬空链接检查（当前只查 _Index 条目）
