# Antigravity 多模型工程工作流与五阶段硬门禁精粹

本文沉淀本插件（`rules/AGENTS.md` + `hooks.json` + `agents/{scout,advisor,reviewer}.md` + 33 个 `skills/`）背后的工程设计原则：**不靠“求模型别犯错”，而是靠 `PreToolUse` 硬拦截 Hook、工具权限物理剥离、独立工作区隔离、S/M/L 分级五阶段硬门禁与静态校验脚本，把 AI 协作跑稳。**

---

## 一、S/M/L 分级快车道与五阶段硬门禁（Stage 0 – Stage 4）

- **S 级（单文件文档/配置/拼写，无逻辑与安全面）**：免 `worktree`（个人仓允许当前分支直改）、免 `architect`/`interrogate`/`reviewer`，跑最简格式/语法校验即可。
- **M 级（常规 Bug/单包小功能，2–5 文件）**：独立 `worktree` + 最小复现 + 局部检查 + `reviewer` 终审。
- **L 级（跨模块/状态机/权限/安全/协议/IPC/UI 改版）**：走满下列 Stage 0–4 全链路。

### Stage 0 · 接单立界（Scope & Grounding）
1. **Worktree 基线隔离**：先核对目标仓库 `AGENTS.md` / `CONTRIBUTING.md`、当前分支与 `upstream/main`（或 `origin/main`）基线；**禁止直接在主工作区切开发分支**，新建独立 `git worktree` 或用 `Workspace="branch"` / `"share"` 再动手。
2. **`how` + `why` 先查后改**：
   - 陌生模块先跑 **`how`**（调 `research` / `scout`）梳理调用链与状态归属，拿到 onboarding 级心智模型。
   - 改动旧逻辑、重试/超时或防错保护前先跑 **`why`**（`git blame` / `git log` / `gh pr view`），严格区分“已验证事实”与“合理推断”，避免顺手删掉历史踩坑留下的刻意防御。
3. **`architect`（Design It Twice）+ `grill-me`（Frontier Rounds）**：
   - 非平凡跨模块改动先用 **`architect`** 写出**至少两套结构截然不同的骨架**（先写类型、签名与调用示例，`not implemented` 占位），过一遍 `design-red-flags` 再定稿；仅当从零设计全新并发锁、分布式状态机或多端协议时，可选用 **`statechart`** 在写码前用 TLA+/TLC 先验状态转移（日常开发不作必选）。如果施工中出现大量绕路、`any` 强转或意外锁，立刻停下推翻骨架重来，不在错误结构上堆补丁。
   - 需求或环境术语存在分叉时，用 **`grill-me`**（配合 `ask_question` 或 `/grill-me`）按依赖树只提问前置条件已定死的“前沿节点（Frontier）”，每题附带推荐答案与一句话理由；能从源码和命令查清的事实一律自己查，不打扰用户。
   - 开工前明确**单 PR 单目标**与 **`Out of Scope`（禁止触碰的文件与模块）**。

### Stage 1 · 定位、施工与防呆固化（Locate, Implement & Correct）
1. **先建最小失败复现（`systematic-debugging`）**：修 Bug 前必须先拿到一个“在当前故障上稳定挂掉、修好后稳定通过”的紧凑反馈命令；未完成 Phase 1 根因定位前严禁试探性改代码。拿不准技术可行性时，先用 **`spike`** 建一次性可抛弃原型验证风险最高的问题。
2. **两轮不过立刻掀桌（Two-Strike Reset Rule）**：同一 Bug 连修 2 轮测试仍未通过，当前会话上下文已被错误假设污染。立刻停手禁止叠加第 3 层补丁，总结已证伪假设，退回根因重规划或单回合切换 `Claude Opus 5.5` 外科定位。
3. **测试鉴别力与禁令（`test-value`）**：
   - 新增或修改测试前必须回答 3 问：① 什么具体错误会让该测试失败，它会给用户造成什么损失？② 等价重构内部实现会误伤该测试吗？③ 是否已有类型检查/现有测试覆盖了同一风险？
   - **严禁在测试中引入 `node:vm` / `eval` / `new Function`**：需要测试内联脚本逻辑时，必须将其抽离为导出的纯函数直接导入单测。
4. **遇错按最高有效层级固化防呆（`correct`）**：
   - 同类失误发生两次以上，按“**架构消除（唯一状态源/隐藏内部细节） → 类型系统让非法状态无法编译 → 带明确替代指引的 Lint/CI 检查 → 行为测试 → 文档/`AGENTS.md`（最后）**”的顺序彻底堵死；规则文档在压力下最容易被跳过。
5. **精简冗余（`simplify-codebase`）与安全核查（`security-best-practices`）**：大块改动或怀疑存在死代码/重复状态/过度抽象时，基于真实调用链与消费者证据做删除或合并，绝不靠“猜没人用”删代码。

### Stage 2 · 本地门禁与独立终审（Local Gates & Pre-Push Audit）
1. **同步基线与全量本地验证**：先 `git fetch && git rebase` 对齐上游基线、重编受影响产物，再**串行**跑通目标仓库 `check` / `typecheck` / `lint` / 受影响测试（严禁多个构建或原生 prebuild 并发争抢）。
2. **实证对抗与爆破半径前置门禁（`interrogate` / `blast-radius`）**：
   - 改动共享协议、序列化边界、加密/传输契约或跨包底层接口时，先过 **`blast-radius`**（至少推进至第 4 级：调用真实代码的最小实跑脚本验证核心安全假设）。
   - L 级涉及并发、权限、安全边界、锁、重连或状态机流转时，派出 `invoke_subagent(TypeName="self", Workspace="branch"|"share")` 跑 **`interrogate`** 对抗侦察尝试击穿改动——**只有真实执行命令或复现脚本跑出来的失败才算数**，无执行证据的猜测一律丢弃；实跑证据须随 diff 与测试输出一并交给 `reviewer`，缺实证证据不得 `PASS`。
3. **强制推前独立四维终审（`reviewer`）**：
   - 凡改动 **≥2 个源码文件**，或涉及 **状态机 / 权限 / 安全 / 协议 / IPC / 日志脱敏**，push 或开 PR 前**必须**由独立只读 `reviewer`（默认 `swarm` `gemini-4-neon-high`，主脑本身为 Neon High 的高风险改动切异构模型如 `claude-opus-5-5-high`；`brief` 首行必须显式要求先 `read_file` `agents/reviewer.md`；不可用时退回 `invoke_subagent(TypeName="reviewer", Model="pro")`）审查，输入**仅限需求边界 + 完整 `git diff` + 本地测试输出**（不传对话历史）：
     1. **边界与私货（Scope Drift）**：是否偷渡未要求的新功能、多余开关或顺手重构；
     2. **安全、脱敏与并发边界**：信任边界、路径/符号链接逃逸、密钥/个人路径脱敏、竞态与测试禁用检查；
     3. **测试鉴别力（`test-value`）**：断言是否真正绑定可观测行为，而非纯 mock 走过场；
     4. **注释与抑制标记清理**：清理复述代码“在做什么”的废话注释（仅留 `// WHY:` 护栏注释）、注释掉的死代码，以及无正当理由的 `@ts-ignore` / `@ts-expect-error` / `eslint-disable` / `# type: ignore`。
   - **未过审不得 push**；任何 rebase 或审核后修改，必须重跑受影响检查并复审。

### Stage 3 · 规范提 PR（PR Creation Discipline）
- 优先遵守目标仓库 `AGENTS.md` / `CONTRIBUTING.md`（例如 DCO `git commit -s`、模板分段、资产隔离分支）；通用仓库使用 **`yeet`** 与 **`github`**。
- **通用红线（`hooks.json` + `scripts/guard-hook.mjs` `PreToolUse` 硬拦截）**：保持仓库 `user.email` 一致；PR 标题与正文语言匹配目标仓库主语言；**严禁添加 AI `Co-Authored-By`**；**严禁擅自触发 `@codex review` 等自动 review bot**；**严禁裸 `git push --force`/`-f`**；PR 正文一律写为**无 BOM 的 UTF-8** 临时文件再传 `--body-file`（本地可选配 `.privacy-denylist.json` 拦截敏感标识外泄）。
- **隐私与媒体红线**：调试/验收截图严禁提交进源码主干或 Issue（仅作 PR 描述原生附件或推至仓库隔离资产分支），上传前确认无本机用户名、个人绝对路径、Token 或未脱敏二维码。

### Stage 4 · 推后巡检与评论闭环（Post-Push CI & Review Loop）
1. **防 `DIRTY` 静默跳过 CI**：Push 后立刻检查 `gh pr view --json mergeStateStatus`；若为 `DIRTY` 立刻解冲突 rebase 重推（否则 GitHub 会静默跳过 CI），再通过 `gh pr checks` 与 **`gh-fix-ci`** 跟进直到必过项全部变绿。
2. **评论与 Thread 闭环（`gh-address-comments`）**：拉齐普通评论、Review 与全部 Review Threads → 修复并重走 Stage 2/3 → 在原 thread 写清无 BOM UTF-8 回复并**显式执行 GraphQL `resolveReviewThread`**（否则 `isResolved=false` 仍会卡住合并）。
3. 合入后优先使用 `--delete-branch` 清理特性分支。

---

## 二、Antigravity 原生子智能体隔离与预算

1. **三类子智能体各司其职**：
   - **`research`（内置静态沙盒）**：纯源码静态阅读与跨目录符号检索，无网络无终端。
   - **`scout`（`agents/scout.md`）**：授予 `read_file`、`run_command`、`manage_task`、`search_web`，工具层**物理剥离 `edit_file` / `write_file`**，专门跑 `git log`/`gh` 考古与 Phase 1 复现。
   - **`self`（`Workspace="inherit"|"share"|"branch"`）与 `run_workflow`**：独立模块施工、回归测试、多语言同步或 Python 大规模分片流水线。
2. **严控预算与禁空转轮询**：
   - **主脑工具预算**：禁止主会话单枪匹马连续超过 30 次文件读写。
   - **并发与摘要封顶**：单批并发 **≤5 路**；每次派发必须写死目录/文件边界与返回契约（**≤50 行摘要附 `file:line` 真实证据**）。
   - **禁止轮询**：派发 `invoke_subagent`、后台命令或 `swarm` 后直接结束当前回合等待系统唤醒，严禁循环查状态或设定时器轮询；轻量只读调研禁止滥用 `swarm`。

---

## 三、移动端与 Web 视觉反馈闭环（Visual Feedback Loop）

> **核心分层：结构树 = 事实，几何坐标 = 度量，截图 = 最终证据。**

1. **Token 单一来源与动效频率门禁（`emil-design-eng` / `animate-expo` / `mobile-native`）**：
   - 颜色、字号、圆角、间距必须取自语义 Token，禁止业务组件手写 `#hex` 与魔法数字。
   - 100+ 次/天的高频操作（切 Tab、开关软键盘、命令面板）**严禁加动画**；其余动效 ≤300ms、用强 `ease-out`；RN 手势留在 UI Worklet 线程。
   - Web `:hover` 必须包在 `@media (hover: hover) and (pointer: fine)` 中，输入框字号 ≥16px，全屏用 `100dvh`。
2. **四步递进验证**：
   - **Step 1（无头状态脚本；重型协议可选 `statechart`）**：优先用轻量无头状态脚本跑通乱序事件与边界流转；仅在设计全新复杂多方协议或并发状态机时，可选用 **`statechart`**（SANY + TLC）生成 Mermaid 状态图与最短反例路径。
   - **Step 2（`break-ui` 极限脏数据）**：注入长德语词、超长邮箱、`0 / 1 / 1,000+` 条集合与 `tabular-nums`，提前暴露 Flex 溢出与折行崩坏。
   - **Step 3（结构树与几何坐标）**：Android 抓取 `uiautomator dump` 检查 `bounds`，Web 检查 `getBoundingClientRect()` 与 `scrollWidth > clientWidth`。
   - **Step 4（静止态截图验收）**：动画静止后截取明/暗色画面交主模型核验。

---

## 四、Skill 主从瘦身架构（Hub-and-Spoke）

- 主文件 `SKILL.md` 只保留核心铁律与按需路由表（Routing Table），细分排障、模板与语言细节全部下沉到 `references/*.md` 按需加载，避免开局一次性吞掉数万 Token 稀释主脑注意力。
- 长期架构推导与踩坑沉淀使用 **`llm-wiki`**（`raw/` + `concepts/` + `index.md`），新会话读一页 `index.md` 即可接续上下文。
- 早期 Hermes Agent × Magpie 配置归档见 [legacy-hermes.md](./legacy-hermes.md)。
