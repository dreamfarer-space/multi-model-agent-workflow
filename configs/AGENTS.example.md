# Global Engineering Workflow Rules (Pi / Claude Code / Magpie Example)

> Copy to `~/.pi/agent/AGENTS.md` or `~/.claude/CLAUDE.md` and adjust gateway URL (`http://127.0.0.1:3425/v1`) or repository routing rules for your environment.

## 1. 沟通与表达规则
- 全程使用简体中文回复（除非用户切到其他语言）。
- 保持冷静、客观、重事实；拒绝空洞的抽象对比表和长篇铺垫，直接给出具体场景和编号可执行步骤（1、2、3）。
- 绝不虚构命令输出或未验证的状态；交付前必须先核实真实运行证据。

## 2. 模型分工与子智能体规范
- **主脑 / 子智能体（`subagent`：`scout` / `worker`）/ 辅助模型（压缩、视觉、标题、MCP）**：统一使用 `antigravity/gemini-4-hydrogen`（本机 Magpie 网关 `http://127.0.0.1:3425/v1`，thinking `high`）。
- **独立审核 / 复核（`/review`、代码审计伙伴、`subagent(agent="reviewer")`）**：使用 `antigravity/gemini-4-carbon`（`thinking="high"`；若上游链路报不支持 `thinking`/`reasoning_effort`，则省略该参数或改用 `/review`）。
- **极端死锁单回合急救**：`antigravity/claude-opus-5-5`。

## 3. 开发与 PR 强制工作流（5 阶段硬卡点）

1. **阶段 0 · 接单立界**：
   - 先核对目标仓库 `AGENTS.md` / `CONTRIBUTING.md`、当前分支与 `upstream/main`（或 `origin/main`）基线；新建独立分支或 worktree 再动手。
   - 陌生模块先跑 **`how`** 梳理调用链；改旧逻辑或防错保护前先跑 **`why`** 查清历史 PR/设计意图，避免误删刻意保护；非平凡跨模块设计先跑 **`architect`**（出两版骨架再定稿）；需求存在分叉时用 **`grill-me`** 锁死边界。
   - 明确**单 PR 单目标**与 `Out of Scope`（禁止把无关 UI 美化、功能重构或未要求的新开关捆进同一 PR）。
2. **阶段 1 · 定位与施工**：
   - 修 Bug 先建最小失败复现（`systematic-debugging`）；未知可行性先做一次性实验（`spike`）；写测试遵循 `test-value`（保护真实行为、不测纯 mock；**严禁在测试引入 `node:vm` / `eval` / `new Function`**，内联脚本逻辑必须抽离导出纯函数直测）。
   - 安全敏感或跨边界改动对照 `security-best-practices`；大块结构精简用 `simplify-codebase`；遇反复犯的同类错时用 **`correct`** 按“架构 → 类型 → Lint → 行为测试 → 文档”最高有效层级固化防呆；跨模块排查或独立子任务优先用原生 `subagent`（`antigravity/gemini-4-hydrogen`），不超过 5 路并发（单子智能体 ≤25 次工具调用、≤8 个文件、≤50 行摘要附 `file:line`）。
3. **阶段 2 · 本地门禁与独立审核（Push 前硬闸门）**：
   - 先串行跑通目标仓库本地门禁与受影响测试；高风险并发/权限/协议改动加跑 **`interrogate`** 做实证破坏测试。
   - **强制独立审核**：凡改动 **≥2 个源码文件** 或涉及 **状态机 / 权限 / 安全 / 协议 / IPC / 日志脱敏**，push 或建 PR 前**必须**调用 `subagent(agent="reviewer", model="antigravity/gemini-4-carbon")` 或 `/review`，传入完整 `git diff` 与本地测试输出，核查：**① 是否偏离维护者/用户边界（未擅自加功能） ② 安全、脱敏、竞态与边界漏洞 ③ 是否残留废话注释、注释死代码或无正当外因的 `@ts-ignore` / `@ts-expect-error` / `eslint-disable` 绕过标记**。未过审不得 push。
4. **阶段 3 · 规范提 PR**：
   - 遵循目标仓库 PR 规范或使用 **`yeet`**（通用 issue/仓库/release/auth 查 **`github`**）。
   - 通用红线：仓库 `user.email` 保持一致；匹配目标仓库语言；严禁添加 AI `Co-Authored-By`；严禁触发未经授权的 review bot；PR 正文一律写**无 BOM UTF-8** 临时文件并用 `--body-file` 提交。
5. **阶段 4 · 推后巡检与评论闭环**：
   - 推送后立刻检查 `gh pr view --json mergeStateStatus`（若为 `DIRTY` 立即解冲突 rebase 重推，防止跳过 CI）与 `gh pr checks`（失败按 **`gh-fix-ci`** 拉日志定修）。
   - 收到维护者或 CI 评论后强制走 **`gh-address-comments`** 闭环：拉全普通评论/reviews/review threads → 修复并重走阶段 2/3 → **在原 thread 写清回复并显式执行 GraphQL `resolveReviewThread`**。
   - PR 合入后优先使用 `--delete-branch` 清理特性分支，并核对关闭关联 Issue。

## 4. 隐私与安全红线
- **截图红线**：绝不向外部或 PR 展示包含本机用户名、个人路径、Token 或未脱敏配对码的截图；涉及路径时只用文字断言验证。
- **PR 媒体红线**：PR 截图禁止提交进仓库源码主干或 Issue；仅上传为 PR 描述框附件或推至仓库指定的隔离资产分支。
