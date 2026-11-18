# 2026-11 大模型权威 Benchmark 核实报告与选型依据

> **方法论说明**：2026 年下半年起，旧版 `SWE-bench Verified`、`Aider Polyglot`（2025-10 冻结）、`BFCL V4`（2026-04 冻结）及 `AIME` 已趋于饱和，主流实验室已转向长程工程与自主智能体基准：**`SWE-bench Pro`、`Terminal-Bench 4.0 / 2.1`、`DeepSWE v1.1`、`FrontierSWE v2`、`LOCA-Bench 256K`、`WebDev Arena` 与 `Roboflow Vision`**。
>
> 本表严格区分 **官方模型卡/独立实测数据（Measured）** 与第三方推算值（Estimated，不做选型依据）；部分公开基准为早期历史选型沉淀，现行 Antigravity 角色映射见第二节。

---

## 一、历史公开基准横向参考（已核实实测数据）

| 模型家族与精确型号 | 代码修复与工程重构<br>(`DeepSWE v1.1` / `SWE-bench Pro`) | 终端自主执行<br>(`Terminal-Bench 4.0 / 2.1`) | 前端与视觉能力<br>(`WebDev Arena` / `Roboflow Vision`) | 长上下文与数学推理<br>(`GraphWalks` / `LOCA` / `GPQA`) | 典型网关吞吐与首字延迟 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`Claude Opus 5.5`**<br>(`claude-opus-5-5`) | • **SWE-bench Pro：89.9%（全网第 1）**<br>• DeepSWE v1.1：74.2%<br>• CursorBench 4.0：57.8%（第 1） | • **TB 4.0：66.4%（xhigh，第 1）**<br>• TB 4.0（Claude Code max）：64.8% | • **WebDev Arena：1814（第 1）**<br>• LMArena Coding：1546 Elo（第 1）<br>• Startrise 前端盲评：80.2（第 1） | • SWE-bench Multilingual：93.9%<br>• HLE (w/ tools)：67.7% | ~120–260 tok/s<br>（`xhigh` 易耗尽 128K 输出，推荐 `high`/`medium`） |
| **`Claude Sonnet 5.5`**<br>(`claude-sonnet-5-5`) | • **SWE-bench Pro：81.3%（第 2）**<br>• FrontierSWE v2：61.9%（第 3） | • **TB 4.0：70.6%（bare+safeguards）**<br>• TB 4.0（公开榜）：61.8%（第 2） | • Startrise 前端盲评：75.9 | • GPQA Diamond (Epoch)：95.6%<br>• Chartography (w/ tools)：90.2% | 比 Opus 5.5 快 ~1.5×，单次成本约 1/2 |
| **`GPT-6-Astra`**<br>(`gpt-6-astra`) | • DeepSWE v1.1：74.1%<br>• **FrontierSWE v2：65.5%（第 1）** | • TB 4.0：57.9%（high）<br>• TB 2.1：87.3%（Vals） | • Startrise 前端盲评：79.9（第 2，Token 消耗仅为 Opus 1/4） | • **GPQA Diamond：96.0%**<br>• FrontierMath Tier 4：97.6% | 54–72 tok/s，high 首字 ~107s；倾向大范围改写 |
| **`GPT-6.1-Sol`**<br>(`gpt-6.1-sol`) | • **DeepSWE v1.1：75.2%（反超 Astra，成本仅 1/5）** | • TB 4.0：58.2%（Codex/max） | • Startrise 前端盲评：78.6（第 3，源码最干净） | • **GPQA Diamond：95.4%**<br>• **FrontierMath Tier 4：100%**<br>• **MultiChallenge 指令遵循：82.0%（第 1）** | 48–87 tok/s，TTFT ~8s；审查与防御性编码极稳 |
| **`Gemini 4 Argon`**<br>(`gemini-4-argon`) | • **DeepSWE v1.1：77.9%**<br>• Vibe Code Bench：91.9%<br>• FrontierSWE v2：55.0% | • TB 4.0：57.4% | • WebDev Arena：1683 Elo（React 1702）<br>• **Roboflow Vision：87.5%（OCR 88.0%）** | • **GraphWalks 128K：99.7%**<br>• **LMArena 总榜 1530 / 数学 1542 / 中文 1603**<br>• GPQA (Epoch)：96.4% | ~82–88 tok/s，TTFT 15–20s |
| **`Gemini 3.8 Flash`**<br>(`gemini-3.8-flash`) | • DeepSWE v1.1：73.7%<br>• SWE-bench Verified (Vals)：80.0% | • **TB 2.1：89.4%**<br>• TB 4.0：19.1%（长程终端弱） | • WebDev Arena：1583<br>• **LMArena Vision (Chinese/Diagrams)：第 1** | • LiveCodeBench (Vals)：89.5%<br>• 1M 原生上下文 | **120–143 tok/s**，TTFT 7–9s |
| **`DeepSeek-V4.1-Flash`**<br>(`deepseek-v4.1-flash`) | • **DeepSWE v1.1：74.2%（1017 版 77.0%）**<br>• CyberGym：88.1% | • **TB 2.1：90.6%**<br>• TB 4.0：31.2% → 42.3%（1017 版） | • 原生多模态输入<br>• Chartography：78.9% | • GPQA Diamond：90.9%<br>• Codeforces：3471<br>• C-Eval：92.1% | **185–212 tok/s**，TTFT 1–4s |
| **`MiniMax-M3.1-Flash`**<br>(`MiniMax-M3.1-Flash`) | • DeepSWE v1.1：73.7%<br>• CyberGym：82.2% | • TB 4.0：38.1%<br>• **Automation-Bench：62.8%**<br>• **BankerToolBench：76.2%** | • BabyVision (w/ tools)：91.0%<br>• 205K–1M 稀疏注意力 | • **LOCA-Bench 256K：60.3%**<br>• **524K 最大输出** | **166 tok/s**，TTFT ~6s |

---

## 二、Antigravity 现行模型分工原则

迁移至 Google Antigravity 原生插件架构后，日常工程模型配置进一步收敛为清晰的三层分工（早期 Hermes × Magpie 轮询方案见 [legacy-hermes.md](./legacy-hermes.md)）：

1. **主脑与日常执行统一走 `Gemini 4 Hydrogen (High)`**（`gemini-4-hydrogen-high`）：
   - 负责 Plan / Execute 双阶段统筹、两版架构骨架设计（`architect`）、核心耦合改动，以及 `research` / `scout` / `self` 子智能体执行，减少跨模型上下文切换摩擦。
2. **推前独立终审切至 `Gemini 4 Carbon (High)`**（`gemini-4-carbon-high`）：
   - 通过 `swarm` 挂载 `agents/reviewer.md`（不建 `monitor`，出结论即销毁；不可用时退回 `invoke_subagent(TypeName="reviewer", Model="pro")`），只传入需求边界、`git diff` 与测试输出，在零聊天上下文干扰下完成 4 维审校。
3. **死锁急救锁定 `Claude Opus 5.5`（`high`/`medium`）**：
   - CodeRabbit 在 Signal 真实 PR 集上测得 Opus 5.5 能抓出 **76.9%（10/13）** 的隐蔽并发竞态缺陷，但 `xhigh` 档容易把 128K 输出全耗在思考上。因此不挂在主窗口长跑，仅在两轮修复失败后作单回合根因急救。
