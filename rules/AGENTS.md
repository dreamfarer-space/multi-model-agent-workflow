# Global Engineering Workflow Rules (Antigravity Plugin Template)

## 1. 沟通与表达规则
- 默认使用简体中文回复（除非目标任务或用户切换为其他语言）。
- 保持冷静、客观、重事实；拒绝空洞的抽象对比表和长篇铺垫，直接给出具体场景和编号可执行步骤（1、2、3）。
- 绝不虚构命令输出或未验证的状态；交付前必须先核实真实运行证据。

## 2. 架构分工与子智能体规范
- **主脑（Plan / Execute 双阶段）**：由当前会话主模型（推荐 `Gemini 4 Hydrogen (High)`）负责需求收敛、架构定稿、强耦合核心代码修改与最终验收；复杂规划、对抗式需求收敛、深度攻坚与多智能体协作分别对齐内置 `/plan`、`/grill-me`、`/boost`、`/teamwork`。
- **只读检索与历史勘察（`research` / `scout`）**：
  - 纯源码静态阅读与跨目录符号检索：调用 `invoke_subagent(TypeName="research", Role="...", Prompt="...")`（只读无网络无终端沙盒）。
  - 需执行 `git log`、`gh`、最小失败复现或只读诊断命令的勘察：调用 `invoke_subagent(TypeName="scout", Role="...", Prompt="...")`（仅授予 `read_file`、`run_command`、`manage_task`、`search_web`，工具层物理剥离写文件权限）。
- **独立模块施工与并行验证（`self` / `run_workflow`）**：独立模块编码、回归测试编写（遵循 `test-value`）与多语言包同步优先调用 `invoke_subagent(TypeName="self", Role="...", Prompt="...", Workspace="inherit"|"share"|"branch")`（共享仓库并行改动时使用 `Workspace="share"` 或 `"branch"` 隔离；单批并发 ≤5 路；多阶段或大规模分片流水线使用 `run_workflow`）。每次派发必须写明目录/文件收敛边界与返回契约（≤25 次工具调用、≤8 个目标文件、≤50 行摘要附 `file:line` 真实证据），禁止全仓盲目遍历或主会话单枪匹马连续超过 30 次文件读写。
- **禁止空转轮询与轻量调研滥用 `swarm`**：派发 `invoke_subagent`、后台 `run_command` 或 `swarm` 后直接结束本轮等待系统唤醒，严禁循环调用 `manage_task("list"/"status")`、`manage_subagents("list")` 或连续 `schedule` 轮询；轻量只读调研一律使用 `research`/`scout`，不要为只读检索拉起多成员 `swarm`。
- **SSH / 远程命令防挂死规范**：
  - 调用远程 `ssh` 时默认带 `-n -o BatchMode=yes`（无需 stdin 时关闭标准输入，防止远端进程读 stdin 永久阻塞）；**避免单轮并发多条 `ssh` 挤占同一代理通道**。
  - **禁止在 Windows PowerShell 中直接把含引号、`|` 或 `&` 的复杂命令拼进 `ssh` 参数**（PowerShell 5.1 会剥离单引号内双引号导致远端命令被拆断挂死）；统一先写无 BOM LF `.sh` 上传执行，或以 UTF-8 Base64 传入 `echo <b64> | base64 -d | timeout -k 10 <秒> bash -s`。
  - 远端长耗时或无头 GUI 命令（如 `xvfb-run` / Electron / 浏览器测试）**必须外包 `timeout -k 10 <秒>`**，防止未捕获异常或错误弹窗导致进程永不退出。
  - 若外部/SSH 命令转入后台，可挂**单次**带 `TimerCondition=<taskId>` 的宽裕兜底定时器防静默死等（禁止循环定时，且任务先完成后不要重复 `manage_task("kill")` 已被自动取消的定时器）。
- **技术顾问 / 方案参谋（`advisor`）**：遇到非平凡架构选型、高风险状态机/协议/并发方案第二意见、或**连续两轮排查未定界 / 主会话将触及 30 次文件读写预算仍未锁定根因**时，立即停手并通过 `swarm(action="add", name="advisor-r1", model="gemini-4-neon-high", workspace="inherit", brief=...)` 启动单名只读顾问（后续轮次递增 `advisor-r2`…，因 `swarm` 不可复用已 `kill` 成员名；不建 `monitor`，**`brief` 首行必须显式要求其先 `read_file` `agents/advisor.md` 并严格遵守只读禁令与输出契约**，出结论后即 `swarm(action="kill", name="advisor-rN")`）；仅当 `swarm` 或对应模型不可用/受限时退回 `invoke_subagent(TypeName="advisor", Role="Technical Advisor", Model="pro", Prompt="...")`。
- **推前独立终审（`reviewer`）**：优先通过 `swarm(action="add", name="reviewer-r1", model="gemini-4-neon-high", workspace="inherit", brief=...)` 启动单名只读审校员（同会话复审递增 `reviewer-r2`/`reviewer-r3`…，禁止复用已 `kill` 名称；不建 `monitor`，**`brief` 首行必须显式要求其先 `read_file` `agents/reviewer.md` 并严格遵守只读禁令与 4 维审校契约**，出结论后即 `swarm(action="kill", name="reviewer-rN")`）；若当前主会话本身运行在 `Gemini 4 Neon (High)` 且任务涉及高风险并发/安全/架构大改，终审优先切换异构模型（如 `claude-opus-5-5-high` 或 `gemini-4-hydrogen-high`）避免同源盲区；仅当 `swarm` 或目标模型不可用/受限时退回 `invoke_subagent(TypeName="reviewer", Role="Independent Pre-Push Reviewer", Model="pro", Prompt="...")`。
- **极端死锁单回合急救**：连续 2 轮修复同一问题仍未通过时立即停手，记录已证伪假设并重新规划或单回合切换至 `claude-opus-5-5` 定点排查。

## 3. 开发与 PR 强制工作流（分级快车道 + 5 阶段硬卡点）

**任务分级快车道（S / M / L）**：
- **S 级（单文件文档/配置/拼写，无逻辑与安全面变化）**：免 `worktree`（个人仓允许当前分支直改）、免 `architect`/`interrogate`/`reviewer`，跑最简格式/语法校验即可。
- **M 级（常规 Bug/单包小功能，2–5 文件）**：独立 `worktree` + 最小复现 + 局部检查 + `reviewer` 终审。
- **L 级（跨模块/状态机/权限/安全/协议/IPC/UI 改版）**：全量执行下列 Stage 0–4（含 `how`/`why`/`architect`/`advisor`/`interrogate`/`reviewer`）。

1. **阶段 0 · 接单立界**：
   - 先核对目标仓库 `AGENTS.md` / `CONTRIBUTING.md`、当前分支与 `upstream/main`（或 `origin/main`）基线；M/L 级任务**禁止直接在主工作区切开发分支**，新建独立 `git worktree` 或用隔离工作区再动手。
   - 陌生模块先跑 **`how`** 梳理调用链；改旧逻辑或防错保护前先跑 **`why`** 查清历史 PR/设计意图，避免误删刻意保护；非平凡跨模块设计先跑 **`architect`**（出两版骨架再定稿，大型需求拆分为可独立合入的小 PR）；需求或术语存在分叉时先用 **`grill-me`**（配合 `ask_question` 或 `/grill-me`）锁死边界。
   - 明确**单 PR 单目标**与 `Out of Scope`（禁止把无关 UI 美化、功能重构或未要求的新开关捆进同一 PR）。
2. **阶段 1 · 定位与施工**：
   - 修 Bug 先建最小失败复现（`systematic-debugging`）；未知可行性先做一次性实验（`spike`）；写测试遵循 `test-value`（保护真实行为、不测纯 mock；**严禁在测试引入 `node:vm` / `eval` / `new Function`**，内联脚本逻辑必须抽离导出纯函数直测）。
   - 安全敏感或跨边界改动对照 `security-best-practices`；大块结构精简用 `simplify-codebase`；遇反复犯的同类错时用 **`correct`** 按“架构 → 类型 → Lint/Hook → 行为测试 → 文档”最高有效层级固化防呆；跨模块排查或独立子任务优先用 `invoke_subagent`（`research` / `scout` / `self`），不超过 5 路并发。
3. **阶段 2 · 本地门禁与独立审核（Push 前硬闸门）**：
   - 先完成上游基线同步（`git fetch && git rebase`）与产物重编，再串行跑通目标仓库本地门禁与受影响测试；高风险并发/权限/协议改动加跑 **`interrogate`** 做实证破坏测试。
   - **强制独立审核**：凡改动 **≥2 个源码文件** 或涉及 **状态机 / 权限 / 安全 / 协议 / IPC / 日志脱敏**，push 或建 PR 前**必须**按第 2 节 `reviewer` 路由规范执行独立终审，传入需求边界、完整 `git diff` 与本地测试输出，核查：**① 是否偏离维护者/用户边界（未擅自加功能或扩散改动面） ② 安全、脱敏、竞态与边界漏洞 ③ 是否残留废话注释、注释死代码或无正当外因的 `@ts-ignore` / `@ts-expect-error` / `eslint-disable` 绕过标记**。未过审不得 push；涉及逻辑/安全/状态机的 rebase 或审核后改动必须重跑受影响检查并递增名称（`reviewer-r2`…）复审；同 PR 已过审后的纯 UI 样式/文案小微调（不触及状态机、权限、安全、协议、IPC 或业务逻辑）可仅跑受影响检查与单测，免每次微调重开全量异构终审。
4. **阶段 3 · 规范提 PR**：
   - 若目标仓库有专属贡献/PR 规范（`CONTRIBUTING.md`、`AGENTS.md` 或专用 Skill）优先遵守；其余仓库走 **`yeet`**（通用 issue/仓库/release/auth 查 **`github`**）。
   - 通用红线（已由插件根 `hooks.json` + `scripts/guard-hook.mjs` 在 `PreToolUse` 硬拦截）：仓库 `user.email` 保持一致；匹配目标仓库主要语言；严禁添加 AI `Co-Authored-By`；严禁擅自触发 `@codex review` 等自动审查机器人；严禁裸 `git push --force`/`-f`；PR 正文、Issue 评论与 `gh api -F body=@file` 载荷一律以 `write_file` 新建或 Node `fs.writeFileSync(..., 'utf8')` 写为**无 BOM UTF-8**（**严禁使用 PowerShell `>` 重定向产生 UTF-16LE 或双引号 here-string `@"..."@` 转义 Markdown 反引号**）。
5. **阶段 4 · 推后巡检与评论闭环**：
   - 推送后立刻检查 `gh pr view --json mergeStateStatus`（若为 `DIRTY` 立即解冲突 rebase 重推，防止跳过 CI）与 `gh pr checks`（失败按 **`gh-fix-ci`** 拉日志定修），同时确认未误触阻塞标签。
   - 收到维护者或 CI 审查评论后强制走 **`gh-address-comments`** 闭环：拉全普通评论/reviews/review threads → 修复并重走阶段 2/3 → **在原 thread 写清无 BOM UTF-8 回复并显式执行 GraphQL `resolveReviewThread`**。
   - PR 合入后优先使用 `--delete-branch` 清理特性分支，并核对关闭关联 Issue。

## 4. 隐私与安全红线
- **截图红线**：绝不向外部或 PR 展示包含本机用户名、个人绝对路径、Token 或未脱敏登录/配对二维码的截图；涉及路径校验时优先使用文字断言。
- **PR 媒体红线**：调试/验收截图禁止提交进仓库源码主干或 Issue；若仓库有独立资源分支规范则按其执行，其余仓库仅上传为 PR 描述框原生附件。
