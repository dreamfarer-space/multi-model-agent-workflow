# 历史迁移说明：从 Hermes × Magpie 到 Antigravity 原生插件

> **状态归档**：本仓库早期的 `Hermes Agent × Magpie`（`gemini-4-argon` 主脑 + `group/work` 三族轮询 + `codex/gpt-6.1-sol` 盲审 + `rigorous-dev` 单体 Skill）已于 2026-11 全面迁移至 **Google Antigravity 原生 `workflow` 插件架构**。本文件仅作历史路由参考保留。

## 一、架构对照映射

| 旧版（Hermes × Magpie） | 现行（Google Antigravity Native） | 演进原因 |
| :--- | :--- | :--- |
| 单体主线 `rigorous-dev` + `improve-codebase-architecture` | Stage 0–4 五阶段硬门禁（`rules/AGENTS.md`）+ 拆分为 `how`、`why`、`architect`、`correct`、`test-value`、`interrogate` | 避免开局一次性加载巨型 Skill 消耗数万 Token，改用按阶段按需路由（Hub-and-Spoke）。 |
| `group/work`（`DeepSeek-V4.1` / `MiniMax-M3.1` / `Gemini-3.8-Flash` 三族轮询） | 原生 `invoke_subagent`（`research` / `scout` / `self`）+ `run_workflow` Python 编排 | Antigravity 工具层原生隔离权限与 Worktree（`Workspace="share" \| "branch"`），无需维护外置轮询网关。 |
| `simplify-code` / `subagent-driven-development` | `simplify-codebase` + `interrogate` + 原生 `invoke_subagent` | 删除靠“猜没人用”的精简，改为调用链消费者证据驱动 + 实跑击穿测试。 |
| `codex/gpt-6.1-sol:high` 盲审 | `swarm` 单名只读审校员（`gemini-4-carbon-high` + `agents/reviewer.md`，回退 `invoke_subagent(TypeName="reviewer", Model="pro")`） | 直接绑定 `agents/reviewer.md` 四维审核契约，避免跨网关格式转译差异。 |
| `antigravity/gemini-4-argon` 主脑 | `Gemini 4 Hydrogen (High)` 主脑 + 常规子智能体；`Claude Opus 5.5` 保留为死锁单回合急救 | 主脑与执行统一在 `Hydrogen` 上，降低跨模型思维切换延迟。 |

## 二、历史 Hermes × Magpie 参考片段

如果仍在 CLI / Pi / Hermes 环境使用本地 Magpie 网关（`http://127.0.0.1:3425/v1`），可参考以下核心参数：

```bash
# Magpie 三族并发子任务池（历史参考）
magpie group add work \
  models=workbuddy/deepseek-v4.1-flash:high,minimax-code/MiniMax-M3.1-Flash:high,antigravity/gemini-3.8-flash:high \
  routing=rotate stays=turn

# Hermes 并发与防熔断参数
hermes config set delegation.max_concurrent_children 5
hermes config set delegation.independent_completions true
hermes config set delegation.prefix_stagger_seconds 8
hermes config set delegation.max_summary_chars 8000
hermes config set tool_loop_guardrails.hard_stop_enabled true
```
