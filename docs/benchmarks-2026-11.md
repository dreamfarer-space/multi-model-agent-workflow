# 2026-11 大模型权威 Benchmark 核实报告与选型依据

> **方法论说明**：2026 年下半年起，旧版 `SWE-bench Verified`、`Aider Polyglot`（2025-10 冻结）、`BFCL V4`（2026-04 冻结）及 `AIME` 已趋于饱和，主流实验室（OpenAI、Anthropic、DeepMind、xAI、DeepSeek、腾讯、阿里、月之暗面、MiniMax、智谱）已转向长程工程与自主智能体基准：**`SWE-bench Pro`、`Terminal-Bench 4.0 / 2.1`、`DeepSWE v1.1`、`FrontierSWE v2`、`LOCA-Bench 256K`、`WebDev Arena` 与 `Roboflow Vision`**。
>
> 本表严格区分 **官方模型卡/独立实测数据（Measured）** 与第三方聚合站的 **模型推算值（Estimated，不做选型依据）**。

---

## 一、核心工程基准横向总表（已核实实测数据）

| 模型家族与精确型号 | 代码修复与工程重构<br>(`DeepSWE v1.1` / `SWE-bench Pro`) | 终端自主执行<br>(`Terminal-Bench 4.0 / 2.1`) | 前端与视觉能力<br>(`WebDev Arena` / `Roboflow Vision`) | 长上下文与数学推理<br>(`GraphWalks` / `LOCA` / `GPQA`) | 典型网关吞吐与首字延迟 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`Claude Opus 5.5`**<br>(`claude-opus-5-5`) | • **SWE-bench Pro：89.9%（全网第 1）**<br>• DeepSWE v1.1：74.2%<br>• CursorBench 4.0：57.8%（第 1） | • **TB 4.0：66.4%（xhigh，第 1）**<br>• TB 4.0（Claude Code max）：64.8% | • **WebDev Arena：1814（第 1）**<br>• LMArena Coding：1546 Elo（第 1）<br>• Startrise 前端盲评：80.2（第 1） | • SWE-bench Multilingual：93.9%<br>• HLE (w/ tools)：67.7% | ~120–260 tok/s<br>（`xhigh` 易耗尽 128K 输出，推荐 `high`/`medium`） |
| **`Claude Sonnet 5.5`**<br>(`claude-sonnet-5-5`) | • **SWE-bench Pro：81.3%（第 2）**<br>• FrontierSWE v2：61.9%（第 3） | • **TB 4.0：70.6%（bare+safeguards）**<br>• TB 4.0（公开榜）：61.8%（第 2） | • Startrise 前端盲评：75.9 | • GPQA Diamond (Epoch)：95.6%<br>• Chartography (w/ tools)：90.2% | 比 Opus 5.5 快 ~1.5×，单次成本约 1/2 |
| **`GPT-6-Astra`**<br>(`gpt-6-astra`) | • DeepSWE v1.1：74.1%<br>• **FrontierSWE v2：65.5%（第 1）** | • TB 4.0：57.9%（high）<br>• TB 2.1：87.3%（Vals） | • Startrise 前端盲评：79.9（第 2，Token 消耗仅为 Opus 1/4） | • **GPQA Diamond：96.0%**<br>• FrontierMath Tier 4：97.6% | 54–72 tok/s，high 首字 ~107s；倾向大范围改写 |
| **`GPT-6.1-Sol`**<br>(`gpt-6.1-sol`) | • **DeepSWE v1.1：75.2%（反超 Astra，成本仅 1/5）** | • TB 4.0：58.2%（Codex/max） | • Startrise 前端盲评：78.6（第 3，源码最干净、成本仅 $1.66） | • **GPQA Diamond：95.4%**<br>• **FrontierMath Tier 4：100%**<br>• **MultiChallenge 指令遵循：82.0%（第 1）** | 48–87 tok/s，TTFT ~8s；审查与防御性编码极稳 |
| **`Gemini 4 Argon`**<br>(`gemini-4-argon`) | • **DeepSWE v1.1：77.9%（全表最高）**<br>• Vibe Code Bench：91.9%<br>• FrontierSWE v2：55.0% | • TB 4.0：57.4% | • WebDev Arena：1683 Elo（React 1702）<br>• **Roboflow Vision：87.5%（总榜第 1，OCR 88.0%）** | • **GraphWalks 128K：99.7%**<br>• **LMArena 总榜 1530 / 数学 1542 / 中文 1603 第 1**<br>• GPQA (Epoch)：96.4% | ~82–88 tok/s，TTFT 15–20s |
| **`Gemini 3.8 Flash`**<br>(`gemini-3.8-flash`) | • DeepSWE v1.1：73.7%<br>• SWE-bench Verified (Vals)：80.0% | • **TB 2.1：89.4%**<br>• TB 4.0：19.1%（长程终端弱） | • WebDev Arena：1583<br>• **LMArena Vision (Chinese/Diagrams)：第 1** | • LiveCodeBench (Vals)：89.5%<br>• 1M 原生上下文 | **120–143 tok/s**，TTFT 7–9s |
| **`DeepSeek-V4.1-Flash`**<br>(`deepseek-v4.1-flash`) | • **DeepSWE v1.1：74.2%（1017 版 77.0%）**<br>• CyberGym：88.1% | • **TB 2.1：90.6%（同级第 1）**<br>• TB 4.0：31.2% → 42.3%（1017 版） | • 原生多模态输入<br>• Chartography：78.9% | • GPQA Diamond：90.9%<br>• Codeforces：3471<br>• C-Eval：92.1%（SimpleQA 42.3% 偏弱） | **185–212 tok/s**，TTFT 1–4s |
| **`MiniMax-M3.1-Flash`**<br>(`MiniMax-M3.1-Flash`) | • DeepSWE v1.1：73.7%<br>• CyberGym：82.2% | • TB 4.0：38.1%<br>• **Automation-Bench：62.8%（第 1）**<br>• **BankerToolBench：76.2%（并列第 1）** | • BabyVision (w/ tools)：91.0%<br>• 205K–1M 稀疏注意力 | • **LOCA-Bench 256K：60.3%（长程检索第 1，领先 Kimi K3 / GLM-5.3 约 10 分）**<br>• **524K 最大输出** | **166 tok/s**，TTFT ~6s |
| **`Kimi-K3.1-Pro`**<br>(`kimi-k3.1-pro`) | • **DeepSWE v1.1：75.5%**<br>• Kimi Code Bench 3.0：61.2% | • **TB 4.0：65.7%（国产第 1）**<br>• OSWorld v2.1：79.6% | • DECK-Arena：1456 Elo<br>• BenchCAD：92.7% | • **BrowseComp：92.1%**<br>• HLE (w/ tools)：70.0%<br>• 1M 上下文 | 2.8T MoE，长程强但延迟较高 |
| **`混元 Hy4`**<br>(`hy4` / `hy4free`) | • **DeepSWE v1.1：74.9%**<br>• SWE-Marathon v1.1：43.8% | • TB 4.0：44.4%<br>• **APEX-Agents v1.1：75.2%** | • OSWorld 2.1：78.9%<br>• MMMU-Pro：78.6% | • FiT 中文金融评测：3.04/4（开源第 1）<br>• 搜索专项幻觉率降至 5.45% | ~86–99 tok/s，TTFT 5–6s |
| **`Qwen3.8-Max`**<br>(`qmodel_38max`) | • SWE-bench Pro：67.7%<br>• FrontierSWE：73.5% | • TB 2.1：86.6%<br>• Toolathlon Verified：72.5% | • OSWorld-Verified：86.1%<br>• MMMU-Pro：82.3% | • **PaperBench：93.0%**<br>• **IFBench 指令遵循：82.8%**<br>• GPQA Diamond：92.6% | 31–47 tok/s，偏慢 |
| **`Grok 4.7`**<br>(`grok-4.7`) | • DeepSWE v1.1：71.0%<br>• CursorBench 4.0：46.3% | • TB 4.0：37.6% | • WebDev Frontend：1660 Elo<br>• LMArena Vision：1231（视觉偏弱） | • OTIS Mock AIME：98.1%<br>• 原生 X Firehose 实时检索 | xhigh 单任务输出达 81K token，耗时较长 |

---

## 二、关键实战洞察（为什么单靠一个模型必翻车？）

1. **`Gemini 4 Argon` 是“最强大脑 + 最准眼睛”，但不能当“跑腿苦力”**：
   - 它的 `DeepSWE v1.1`（77.9%）、`GraphWalks 128K`（99.7%）和 `Roboflow Vision`（87.5%）全是一线顶尖，意味着它看截图查 UI 对齐、跨多文件做状态同步、推导复杂数学公式极准。
   - 但它的首字延迟（15~20s）和 `Terminal-Bench 4.0`（57.4%）决定了：如果让它在主会话里连续跑 30 轮 `grep`/`read_file`，光等首字就要耗掉近 10 分钟。把搜索跑腿剥离给 `group/work` 子智能体后，主脑的短板被完全规避。
2. **`Claude Opus 5.5` 审查并发极强，但不能无脑开 `xhigh`**：
   - CodeRabbit 在 Signal 真实 PR 集上实测，Opus 5.5 抓出 **76.9%（10/13）** 的隐蔽并发竞态缺陷（如双任务同时读 `retryCount=0` 导致计数覆盖）；但在 Startrise 前端盲测中，`xhigh` 档位会导致 3/12 的任务把 128K 输出上限全部耗在思考上而返回空结果。使用 `high` 或 `medium` 档位最稳。
3. **`GPT-6.1-Sol` 是性价比最高的“冷面质检员”**：
   - 在 `DeepSWE v1.1` 上拿到 75.2%（反超旗舰 Astra 的 74.1%），`MultiChallenge` 多轮指令遵循 82.0% 榜首，且不会像 Astra 那样把 3 个测试自作主张扩写成 15 个。与 Gemini / DeepSeek 跨家族搭配做两阶段盲审，互补效果最佳。
4. **`DeepSeek-V4.1-Flash` + `MiniMax-M3.1-Flash` + `Gemini-3.8-Flash` 组成“三族快马轮询池”**：
   - 速度全部在 **130 ~ 210 tok/s** 区间，通过 Magpie 的 `routing=rotate, stays=turn` 分流，4 路并发子智能体可在 3 分钟内完成全仓库只读审计，且兼具 DeepSeek 的代码逻辑、MiniMax 的 256K 长程检索（LOCA-Bench 60.3% 第 1）与 Gemini 的多语言/前端敏感度。
