<div align="center">

<img src="./assets/hero.svg" alt="Multi-Model Agent Workflow" width="100%">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)
[![Bundled Skills](https://img.shields.io/badge/Skills-33%20Bundled-success.svg?style=flat-square)](./skills)
[![Works with](https://img.shields.io/badge/Works%20with-Google%20Antigravity-orange.svg?style=flat-square)](#最快上手)
[![Language](https://img.shields.io/badge/Language-English%20%7C%20%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-lightgrey.svg?style=flat-square)](./README.en.md)

<p>面向 <b>Google Antigravity</b> 的原生工程工作流插件：五阶段硬门禁、权限物理隔离的子智能体、Neon High 顾问参谋与推前盲审及 33 个精选工程技能。</p>

[English](./README.en.md) · **简体中文** · [模型选型基准](./docs/benchmarks-2026-11.md) · [五阶段工程模式](./docs/power-user-patterns.md) · [早期 Hermes 迁移归档](./docs/legacy-hermes.md)

</div>

---

写复杂项目时，只靠“在提示词里多写几句小心点”根本拦不住两类翻车：

一是**权限与上下文混在一起**。主窗口一边自己读几千行文件烧光上下文，一边又让多个子任务同时往同一个工作区写代码，最后冲突到只能整体回滚。

二是**同源模型自改自审**。写代码的模型和对话线程自己点通过，往往看不到漏做的边界、私货改动，或者只测了 mock 的空壳单测。

这个插件仓库直接把约束做进 Antigravity 的原生结构里：
1. **工具层物理隔离与子智能体边界**：主脑（`Gemini 4 Hydrogen (High)`）只管方案定稿与耦合核心；[`agents/scout.md`](./agents/scout.md) 物理剥离 `edit_file` / `write_file` 权限，专职 `git`/`gh` 考古与复现；独立施工使用 `Workspace="share" | "branch"` 隔离或 `run_workflow`，严禁主脑单枪匹马连续超过 30 次文件读写。
2. **五阶段硬门禁闭环（Stage 0 – Stage 4）**：先 `how` + `why` + `architect` 定界（高风险分叉或连修卡死时调只读 [`agents/advisor.md`](./agents/advisor.md) 提供第二意见），再 `systematic-debugging` + `test-value` + `correct` 施工，推前过 `interrogate` 实证对抗与只读 [`agents/reviewer.md`](./agents/reviewer.md)（两者均绑定 `Gemini 4 Neon (High)`）四维盲审，推后跟进 `mergeStateStatus` 防跳过 CI 与 GraphQL `resolveReviewThread`。
3. **开箱即用的 Antigravity 插件结构**：仓库根目录即完整插件包（[`plugin.json`](./plugin.json) + [`rules/AGENTS.md`](./rules/AGENTS.md) + [`agents/`](./agents) + 33 个扁平 [`skills/`](./skills)），直接克隆进插件目录即可生效。

<div align="center">
  <img src="./assets/model-routing.svg" alt="Antigravity 原生子智能体分工与权限隔离架构" width="100%">
</div>

---

## 最快上手

### 方式一：直接克隆为 Antigravity 全局插件（推荐）

仓库根目录就是标准 Antigravity 插件布局，直接克隆到 `~/.gemini/config/plugins/workflow` 即可被自动发现并启用：

```bash
git clone https://github.com/dreamfarer-space/multi-model-agent-workflow.git ~/.gemini/config/plugins/workflow
```

### 方式二：通过安装脚本同步（也支持导出技能到其他工具）

```bash
git clone https://github.com/dreamfarer-space/multi-model-agent-workflow.git
cd multi-model-agent-workflow

# 安装完整 Antigravity 插件（plugin.json + agents/ + rules/AGENTS.md + 33 个 skills/）
bash scripts/install-skills.sh --target antigravity

# 如需同时将 33 个扁平 Skill 同步到其他代理目录：
# bash scripts/install-skills.sh --target claude   # ~/.claude/skills
# bash scripts/install-skills.sh --target cursor   # ~/.cursor/skills
# bash scripts/install-skills.sh --target agents   # ~/.agents/skills
```

> 早期的 `Hermes Agent × Magpie` 多账号轮询方案已归档至 [`docs/legacy-hermes.md`](./docs/legacy-hermes.md)。

---

## Antigravity 模型与代理分工

| 角色 | 推荐模型 / 原生入口 | 核心职责与硬约束 |
| :--- | :--- | :--- |
| **主脑统筹（Plan / Execute）** | `Gemini 4 Hydrogen (High)`<br>`/plan` · `/grill-me` · `/boost` | 需求收敛、`architect` 两版骨架定稿、强耦合核心修改、最终验收；主会话禁止连续超过 30 次独自读写文件。 |
| **只读静态侦察** | `invoke_subagent(TypeName="research")` | 纯源码静态阅读与跨目录符号检索（无网络无终端沙盒），返回 `≤50` 行摘要附精确 `file:line`。 |
| **只读 + CLI 考古/复现** | `invoke_subagent(TypeName="scout")`<br>（[`agents/scout.md`](./agents/scout.md)） | 仅授予 `read_file`、`run_command`、`manage_task`、`search_web`，物理剥离写工具；用于 `why`、`how` 与 Phase 1 失败复现。 |
| **并行施工与分片流水线** | `invoke_subagent(TypeName="self", Workspace="share" \| "branch")`<br>`run_workflow` | 独立模块编码、回归测试与多语言包同步；单批并发 **≤5 路**，派发后等待系统唤醒，禁止循环轮询。 |
| **技术顾问 / 方案参谋** | `swarm` (`gemini-4-neon-high`)<br>回退：`invoke_subagent(TypeName="advisor", Model="pro")` | 执行 [`agents/advisor.md`](./agents/advisor.md)：严格只读，提供架构权衡、高风险方案第二意见与卡死重规划，出结论后立即 `swarm kill`。 |
| **推前独立四维盲审** | `swarm` (`gemini-4-neon-high`)<br>回退：`invoke_subagent(TypeName="reviewer", Model="pro")` | 执行 [`agents/reviewer.md`](./agents/reviewer.md)：不传聊天历史，只读完整 `git diff` 与测试输出，过 4 维审校出 `PASS` 才准 push，结论后立即 `swarm kill`。 |
| **极端死锁单回合急救** | `claude-opus-5-5` | 连续两轮修复同一 Bug 失败后立即停手，切过去单回合外科定位根因。 |

详细模型基准对照见 [2026-11 模型选型基准](./docs/benchmarks-2026-11.md)。

---

## 五阶段硬门禁工程流（Stage 0 – Stage 4）

<div align="center">
  <img src="./assets/pipeline.svg" alt="五阶段硬门禁工程流水线" width="100%">
</div>

规则已固化在 [`rules/AGENTS.md`](./rules/AGENTS.md) 中，深层实践见 [五阶段工程模式拆解](./docs/power-user-patterns.md)：

1. **Stage 0 · 接单立界**：核对目标仓 `AGENTS.md` 与上游基线，**禁止在主工作区直接切分支**（必建独立 `worktree`）；先跑 `how` 摸清调用链，改旧防御逻辑前跑 `why` 查 git/PR 历史意图，跨模块先用 `architect` 画两套骨架，分叉需求用 `grill-me`（配合 `ask_question`）锁死边界与 `Out of Scope`。
2. **Stage 1 · 定位与施工**：修 Bug 先跑 `systematic-debugging` 建最小失败复现，未知可行性先做一次性 `spike`；写测试遵守 `test-value`（答清“什么错会挂 / 会不会误伤重构 / 是否有重复覆盖”，**严禁在测试中引入 `node:vm` / `eval` / `new Function`**）；重复踩过的坑用 `correct` 按“架构 → 类型 → Lint → 行为测试 → 文档”最高层级固化；冗余代码用 `simplify-codebase` 按证据删减。
3. **Stage 2 · 本地门禁与独立终审**：先 `git fetch && git rebase` 对齐基线并重编产物，串行跑通 `check` 与测试；高风险并发/权限/协议改动加跑 `interrogate`（只保留真实命令复现出来的缺陷）；改动 **≥2 个源码文件**或触及 **状态机 / 权限 / 安全 / 协议 / IPC / 日志脱敏**，push 前强制调用 `reviewer` 过四维盲审（边界私货、安全与脱敏、`test-value` 鉴别力、废话注释与 `@ts-ignore`/`eslint-disable` 清理）。
4. **Stage 3 · 规范提 PR**：匹配目标仓库主语言与 PR 模板（`yeet` / `github`），正文一律写为**无 BOM UTF-8** `--body-file` 提交；严禁添加 AI `Co-Authored-By` 或擅自触发自动审查机器人；调试截图禁入源码主干且严禁暴露本机用户名与绝对路径。
5. **Stage 4 · 推后巡检与评论闭环**：push 后立刻查 `gh pr view --json mergeStateStatus`（遇 `DIRTY` 立即解冲突重推防跳过 CI）与 `gh pr checks`（失败走 `gh-fix-ci`）；收到评审意见走 `gh-address-comments` 在原 thread 回复并显式执行 GraphQL `resolveReviewThread`，合入后用 `--delete-branch` 清理分支。

---

<details>
<summary><b>展开查看 33 个内置 Antigravity 工程技能清单</b></summary>
<br>

所有技能平铺放置于 [`skills/`](./skills) 目录，保留上游许可证与修改记录见 [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)。

| 阶段 / 领域 | 技能目录 | 具体用途 | 来源与许可证 |
| :--- | :--- | :--- | :--- |
| **Stage 0 · 侦察与设计** | `how` | 变更陌生模块前梳理运行时数据流与归属心智模型 | MIT (Adapted) |
| | `why` | 动旧代码前查 git blame/log 与 PR/Issue 意图，区分实证与推断 | MIT (Adapted) |
| | `architect` | 写码前画两套截然不同的类型/签名骨架并筛除架构红旗 | MIT (Adapted) |
| | `grill-me` | 按依赖树前沿轮次拷问，对齐分支决策并附上推荐解 | MIT (`rafaumeu` / `mattpocock` / Hermes) |
| **Stage 1 · 施工、测试与防呆** | `systematic-debugging` | 四阶段根因定位：先建紧凑失败循环再动手修改 | MIT (`obra/superpowers` / Hermes) |
| | `spike` | 高风险方案敲定前的可抛弃式可行性实验与对比 | MIT (`gsd-build/get-shit-done`) |
| | `test-value` | 评估测试鉴别力与反馈成本，防止 AI 自写自测假绿 | MIT (`tt-a1i`) |
| | `correct` | 将反复发生的同类错误按架构→类型→Lint→测试→文档固化 | MIT (Adapted) |
| | `simplify-codebase` | 基于调用链证据移除死代码、重复状态与过度抽象（熵回收） | MIT (`simplify-codebase contributors`) |
| | `security-best-practices` | Python / JS / TS / Go 安全基线审查与漏洞修复 | Apache-2.0 (`OpenAI / Codex`) |
| | `typescript-best-practices` | 可辨识联合、名义类型、Zod 边界解析与穷尽匹配 | MIT (`cursor/plugins/pstack`) |
| | `codebase-inspection` | 使用 `pygount` 统计仓库代码行数、语言构成与注释占比 | MIT (`Nous Research`) |
| | `localization` | 多语言字典与 Android/iOS 资源生成、转义与对齐校验 | MIT (`Nous Research`, sanitized) |
| | `node-inspect-debugger` | 通过 `--inspect` 与 CDP CLI 调试 Node.js 运行时状态 | MIT (`Nous Research`) |
| | `python-debugpy` | 使用 `pdb` 与 `debugpy`（DAP）排查 Python 运行态问题 | MIT (`Nous Research`) |
| **Stage 2 · 实证与机器验证** | `interrogate` | 派出对抗探测子智能体实跑击穿改动，仅留有命令证据的缺陷 | MIT (Adapted) |
| | `blast-radius` | 评估跨模块修改爆破半径，建立运行期 5 级证据梯 | MIT (`cursor/plugins/pstack`) |
| | `statechart` | 用 SANY 与 TLC 将 TLA+ 规格编译为 Mermaid 状态图与反例链 | MIT (`cursor/plugins/pstack`) |
| | `benchmark-checklist` | 性能汇报前的 7 项防夸大与可复现基准核查清单 | MIT (`cursor/plugins/pstack`) |
| **Stage 3 & 4 · PR 与 CI 闭环** | `yeet` | 按目标仓库规范暂存、提交、推送并创建/更新 PR | Apache-2.0 (`OpenAI / Codex`, sanitized) |
| | `github` | `gh` CLI 通用运维中心（Issue、Review、Release、Auth） | MIT (`Nous Research`, sanitized) |
| | `gh-fix-ci` | 拉取 GitHub Actions 失败日志、定位根因并计划修复 | Apache-2.0 (`OpenAI / Codex`) |
| | `gh-address-comments` | 拉取 PR 全部评论与线程，修复回复并执行 `resolveReviewThread` | Apache-2.0 (`OpenAI / Codex`) |
| | `github-pr-assessment` | 综合评估目标 PR 改动范围、门禁状态与合并概率 | MIT (`Nous Research`, sanitized) |
| **界面交互与多端** | `react-native-skills` | React Native / Expo 列表渲染、布局与原生交互准则 | MIT (`vercel-labs/agent-skills`) |
| | `animate-expo` | Reanimated 动效门禁，高频操作防卡顿与 UI 线程手势 | MIT (`emilkowalski/skills`) |
| | `break-ui` | 注入长德语字符串、超长邮箱与空满数据压测 UI 边界 | MIT (`emilkowalski/skills`) |
| | `mobile-native` | 规避移动端 Web 的 `:hover` 粘滞、视口高度与表单缩放问题 | MIT (`emilkowalski/skills`) |
| | `emil-design-eng` | Emil Kowalski 的 UI 细节与过渡缓动时间标准 | MIT (`emilkowalski/skills`) |
| | `impeccable` | 排版、对比度、视觉层级与反 AI 模板化前端指引 | Apache-2.0 (`pbakaus/impeccable`) |
| | `gemini-frontend-design` | 面向网页与应用界面的结构、色彩、字体与动效设计指引 | Apache-2.0 (`Google Gemini`) |
| **文档与知识管理** | `humanizer` | 过滤 34 种典型大模型八股句式与虚假修饰词 | MIT (`blader/humanizer`, sanitized) |
| | `llm-wiki` | 依托 `raw/`、`concepts/` 和 `index.md` 维护增量知识库 | MIT (`Nous Research`) |

</details>

---

<details>
<summary><b>查看插件与仓库文件结构</b></summary>
<br>

```text
.
├── plugin.json                        # Antigravity 插件清单
├── rules/
│   └── AGENTS.md                      # 五阶段硬门禁全局规则（已脱敏）
├── agents/
│   ├── advisor.md                     # 严格只读技术顾问与方案参谋代理
│   ├── reviewer.md                    # 严格只读四维独立终审代理
│   └── scout.md                       # 物理剥离写工具的只读 + CLI 侦察代理
├── skills/                            # 33 个扁平化 Antigravity 工程技能
│   ├── architect/
│   ├── correct/
│   ├── gh-address-comments/
│   ├── how/
│   ├── interrogate/
│   ├── react-native-skills/
│   ├── test-value/
│   ├── why/
│   └── ...
├── scripts/
│   └── install-skills.sh              # 安装脚本（Antigravity / Claude / Cursor / .agents / Hermes）
├── docs/
│   ├── benchmarks-2026-11.md          # 模型选型基准与角色分工
│   ├── power-user-patterns.md         # 五阶段硬门禁与工程模式拆解
│   └── legacy-hermes.md               # 早期 Hermes × Magpie 配置迁移归档
├── assets/
│   ├── hero.svg
│   ├── model-routing.svg
│   └── pipeline.svg
├── README.md
├── README.en.md
├── LICENSE
└── THIRD_PARTY_NOTICES.md
```

</details>

---

## 协议

本仓库新增的插件配置、规则、图表与文档采用 [MIT 许可证](./LICENSE)。内置在 `skills/` 下的第三方开源项目各自遵循其原始的 **MIT** 或 **Apache 2.0** 许可证，详见各子目录及根目录的 [第三方版权声明文件](./THIRD_PARTY_NOTICES.md)。
