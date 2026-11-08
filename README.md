# Multi-Model Agent Workflow (`Hermes` × `Magpie`)

[English](./README.en.md) | **简体中文**

一套面向 **Hermes Agent / Claude Code / Codex** 的生产级多模型协同与防翻车软件工程工作流。

核心目标只有两个：
1. **把每个模型的真实 Benchmark 强项与配额池特性榨干**：用每 5 小时重置的旗舰池做架构与主刀，用每日数亿免费 Token 的高吞吐多家族池跑并发子智能体，用异血统推理模型做盲审，用稀疏注意力模型做长上下文压缩。
2. **用确定性的工程护栏消灭“多智能体乱改一气、死循环卡死、返工回滚”**：吸收 Boris Cherny、Jesse Vincent (`superpowers`)、Garry Tan (`gstack`)、Matt Pocock (`grill-me`)、Andrej Karpathy 与 AI-Native 工程实践，将软提示升级为硬门禁。

---

## 一、五人模型团队编制（按 Benchmark 与配额池隔离设计）

```text
                       ┌──────────────────────────────────────────────┐
                       │          主会话总工长 (Lead Architect)        │
                       │         antigravity/gemini-4-argon           │
                       │  • 需求决策树拷问 (grill-me) 与 Out-of-Scope  │
                       │  • 核心耦合组件/状态机主刀 (禁止碎裂并发写)   │
                       │  • 像素级 UI 截图验收 / 数学与控制理论推导     │
                       └──────────────────────┬───────────────────────┘
                                              │
            ┌─────────────────────────────────┼─────────────────────────────────┐
            ▼                                 ▼                                 ▼
┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
│   三族并发子智能体轮询池    │   │     多语言与文案专员       │   │     长文记忆压缩专员       │
│  group/work (rotate/turn) │   │    group/edit (order)     │   │   auxiliary.compression   │
│ 1. DeepSeek-V4.1-Flash    │   │  Gemini-3.8-Flash (Pro池) │   │   MiniMax-M3.1-Flash      │
│ 2. MiniMax-M3.1-Flash     │   │ • 1人全包多语言字典对齐   │   │ • LOCA-Bench 256K 榜首    │
│ 3. Gemini-3.8-Flash       │   │ • PR 描述 / 视觉初筛      │   │ • 524K 最大输出，高保真摘要│
│ (Fallback: Hy4 Free)      │   └───────────────────────────┘   └───────────────────────────┘
│ • 3~5路并发只读勘察       │
│ • 强制回传 ≤50行 file:line│
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                    异血统两阶段盲审官 & 极端死锁急救                          │
│ • 终审 (auxiliary.review): codex/gpt-6.1-sol (high) — 只读 Spec + git diff    │
│   Stage 1: 规格合规 (Missing / Extra 私货 / Misunderstood) → Stage 2: 质量安全│
│ • 压箱底急救 (/model opus): antigravity/claude-opus-5-5 — 仅限两轮不过单回合救场│
└───────────────────────────────────────────────────────────────────────────────┘
```

### 为什么这么排兵布阵？（2026-11 核心基准依据）

详细基准数据与来源见 [`docs/benchmarks-2026-11.md`](./docs/benchmarks-2026-11.md)。

| 岗位角色 | 绑定模型 / 路由 | 核心公开 Benchmark 实绩 | 工程脾气与配额池隔离策略 |
| :--- | :--- | :--- | :--- |
| **1. 主窗口总工长** | `antigravity/gemini-4-argon`<br>(`model.default`) | • **DeepSWE v1.1：77.9%**（高于 Opus 5.5 的 74.2% 与 Sol 的 75.2%）<br>• **GraphWalks 128K：99.7%**（跨文件调用链记忆第 1）<br>• **Roboflow Vision：87.5%**（视觉总榜第 1，OCR 88.0%）<br>• **LMArena 总榜 1530 / 数学 1542 / 中文 1603 第 1** | **强项**：全仓库理解、React 前端（1702 Elo）、看截图查对齐、数学/控制理论推导。<br>**短板**：首字思考慢（TTFT 15~20s）、Terminal-Bench 4.0 偏弱（57.4%）。因此**不让它干零碎翻文件的跑腿活**，专心做决策与核心改码。<br>**配额**：独立绑定 Google AI Ultra 账号池（每 5 小时重置）。 |
| **2. 并行子智能体团** | `group/work`<br>(`routing=rotate, stays=turn`) | • **DeepSeek-V4.1-Flash**：DeepSWE **77.0%**、Terminal-Bench 2.1 **90.6%**（本机 190 tok/s，TTFT 4s）<br>• **MiniMax-M3.1-Flash**：LOCA-Bench 256K **60.3%**、Automation-Bench **62.8%**（166 tok/s）<br>• **Gemini-3.8-Flash**：LiveCodeBench **89.5%**、Terminal-Bench 2.1 **89.4%**（130 tok/s） | **三族轮询优势**：4 个并发子智能体同时走腾讯 WorkBuddy、MiniMax、Google Pro 三条独立通道，**不撞单账号并发限流**；且三家模型盲区互补（DeepSeek 抓逻辑、MiniMax 扫大文件、Gemini 查 UI 与多语言）。<br>**粘性保证**：`stays=turn` 确保每个子智能体内部的多轮工具调用固定在同一模型上，不串台。<br>**兜底**：0 积分消耗的 `workbuddy/hy4free`（DeepSWE 74.9%）放在 `fallback_providers`。 |
| **3. 多语言与文案官** | `antigravity/gemini-3.8-flash`<br>(`group/edit`) | • **LMArena Vision (Chinese/Diagrams)：第 1**<br>• **130 tok/s 高吞吐 + 原生多语种地道表达** | **配额隔离**：在 Magpie 的 `accountModels` 中将 `gemini-3.8-flash` 限制在 Google AI Pro 账号池运行，**0% 消耗 Ultra 账号的 Argon 额度**。专职单任务一次性对齐多国语言包（`locales/*.ts`）、写 PR 描述与定时任务。 |
| **4. 长文压缩官** | `minimax-code/MiniMax-M3.1-Flash`<br>(`auxiliary.compression`) | • **LOCA-Bench 256K 长程检索：60.3%（第 1，领先 Kimi K3 / GLM-5.3 约 10 分）**<br>• **1M 输入窗口 / 524K 最大输出** | 会话触发上下文压缩时，由它生成结构化摘要，最不容易丢失关键 `file:line` 与已证伪假设。 |
| **5. 独立盲审官** | `codex/gpt-6.1-sol:high`<br>(`auxiliary.review`) | • **DeepSWE v1.1：75.2%**（成本仅为 Astra 的 1/5）<br>• **MultiChallenge 多轮指令遵循：82.0%（第 1）**<br>• **FrontierMath Tier 4：100%** | 与写代码的 Gemini / DeepSeek 属于**不同模型血统**。只看冷冰冰的 `git diff` 与测试输出，专抓并发竞态、未释放锁与越界修改。 |
| **6. 压箱底重锤** | `antigravity/claude-opus-5-5`<br>(`/model opus`)<br>平替：`workbuddy/kimi-k3.1-pro` | • **Opus 5.5**：SWE-bench Pro **89.9%（第 1）**、Terminal-Bench 4.0 **66.4%（第 1）**、CodeRabbit 并发 Bug 捕获 **76.9%**<br>• **Kimi K3.1 Pro**：Terminal-Bench 4.0 **65.7%（国产第 1）** | `Opus 5.5` 额度稀缺，**严禁挂在主会话跑长工具链**。仅当主脑连修 2 轮未过时，喂入已定位的 2 个核心文件做 **1 回合单刀手术**，改完立即切回。日常中等难度前端可由 `kimi-k3.1-pro` 顶替。 |

---

## 二、五步防翻车工程流水线（Standard Operating Pipeline）

完整方法论来源见 [`docs/power-user-patterns.md`](./docs/power-user-patterns.md)，可执行技能文件见 [`skills/rigorous-dev/SKILL.md`](./skills/rigorous-dev/SKILL.md)。

### 第 1 步：侦察 + 立规矩（写码前硬门禁 `<HARD-GATE>`）
1. **子智能体探路，主线保持干净**：
   - 主窗口 `Argon` 不自己一轮轮零碎翻文件（避免每轮 15~20s 首字延迟累加，也避免几万行源码塞满主窗口）。
   - 直接派 3~5 个 `group/work` 子智能体并行只读勘察，**强制每个子智能体只回传 ≤50 行的浓缩结论 + 精确 `file:line`**。
2. **`grill-me` 决策树拷问**：
   - 查证事实是 Agent 的工作（**严禁向用户提问读源码能查清的事实**）；权衡取舍是用户的工作。
   - 复杂或存在分支的需求，先按前沿轮次（Frontier Rounds）向用户提出 2~3 道带推荐选项的选择题，清空未知分支前严禁写业务代码。
3. **锁死 `Out of Scope` 与容量预算**：
   - 明确声明本次允许修改的文件白名单、禁止触碰的模块，以及包体积/内存/行数硬上限。

### 第 2 步：集中操刀写代码（防乱改、防死循环）
1. **耦合代码 1 人主刀，严禁碎裂并发写**：
   - 相互接线的 UI 组件、Store 状态同步、路由导航，**必须由主窗口 `Argon` 自己一刀改完**（完全独立的模块最多派 1~2 个带 `worktree_isolation: true` 的子智能体）。
   - 多国语言字典（如 7 个 `locales/*.ts`）由 `Argon` 改好主语言后，**只派 1 个 `Gemini 3.8 Flash` 子智能体一次性同步其余语言**，严禁拆成多个并发写任务。
2. **设计 Token 铁律与 `// WHY:` 注释规范**：
   - 前端/React Native 严格遵循 `vercel-react-native-skills` 与 `impeccable`：只准引用 `theme.ts` / `DESIGN.md` 中的语义 Token，禁止手写 `#hex` 颜色与魔法数字。
   - **禁止写复述代码表面意思的废话注释**（如 `// 更新状态`）；**强制保留解释平台特殊坑或协议边界的 `// WHY:` 护栏注释**（防止后续智能体误删保命逻辑）。
3. **两轮不过立即掀桌（Two-Strike Reset Rule）**：
   - 同一个 Bug 如果连续修改 **2 轮** 仍未通过测试，**立即停止原地叠第 3 层补丁**！
   - 记录“已证伪的假设（哪条路走不通）”，回到根因重新规划，或单回合调用 `Opus 5.5` 救场。

### 第 3 步：三层机器自检闭环（不靠肉眼猜）
1. **第 1 层：无头状态机乱序模拟 / TLA+ 验算（先于模拟器）**
   - 涉及断线重连、选中态回写、轮询竞态、权限审批，先将状态转换抽离为纯逻辑，跑无头随机序列测试（如乱序组合 `连上 → 断网 → 切会话 → 删除 → 迟到响应`）或 TLA+ 模型检验，1 秒内验证状态不变量。
2. **第 2 层：构建、类型与目标回归**
   - 运行目标包的 `check`、`test` 与构建产物校验脚本，必须取得真实 Exit Code 0 输出。
3. **第 3 层：UI 几何结构树算坐标 → 最终截图**
   - **结构树 = 事实，几何 = 度量，截图 = 证据**：先通过 Android `uiautomator dump` 检查控件 `bounds=[x1,y1][x2,y2]`（或 Web DOM `getBoundingClientRect`），确认无横向溢出、无文字截断、软键盘弹出后输入框仍在可见区域内；
   - 几何校验通过后，再截出明/暗主题画面由 `Argon` 视觉把关（严禁在截图中暴露个人用户名或本地私密路径）。

### 第 4 步：代码瘦身 + 异血统两阶段盲审
1. **四路并发清理（`simplify-code`）**：
   - 针对本次 diff 并发检查：复用现有工具函数（Reuse）、消除冗余状态（Quality）、修复性能/未清理句柄（Efficiency）、拒绝浅层创可贴补丁（Altitude）。
2. **`GPT-6.1-Sol (high)` 两阶段交叉盲审**：
   - 只向审查者提供**自包含任务单 + 真实 `git diff` + 测试命令输出**（不传聊天记录，不信开发者自评）：
     - **Stage 1（规格合规优先）**：查 `Missing`（漏做）、`Extra`（计划外顺手乱改的私货）、`Misunderstood`。存在 `Extra` 私货直接打回，不进入下一关。
     - **Stage 2（代码质量与并发安全）**：查竞态条件、连接代次泄漏、边界容错。

### 第 5 步：「Lint 即记忆」复利收尾（Lint-as-Memory）
1. **把典型 Bug 转化为静态检查规则**：
   - 写进文档的规矩模型会忘，写进 `check` 脚本的规矩模型不敢犯。每修完一类典型缺陷（如双层 `KeyboardInset` 嵌套、语言包 key 不对齐、客户端包混入服务端依赖），顺手在静态检查或单测里加一条拦截规则。
2. **知识沉淀（`llm-wiki`）**：
   - 将架构决策、协议边界与理论推导按 `raw/`（只读源）+ `concepts/` + `index.md` 归档，新会话只需读 1 页 `index.md` 即可接上完整上下文。

---

## 三、快速落地配置

### 1. 一键配置 Magpie 路由组
运行 [`scripts/setup-magpie-groups.sh`](./scripts/setup-magpie-groups.sh)，自动创建并验证 `group/work`（三族 `rotate/turn`）、`group/edit`、`group/review` 与 `group/duty`：

```bash
bash scripts/setup-magpie-groups.sh
```

### 2. 对齐 Hermes 配置
参考 [`configs/hermes-config.example.yaml`](./configs/hermes-config.example.yaml)，使用 `hermes config set` 更新对应键值（切勿手改正在运行的 `config.yaml` 缩进）：

```bash
hermes config set model.default antigravity/gemini-4-argon
hermes config set delegation.model group/work
hermes config set auxiliary.compression.model minimax-code/MiniMax-M3.1-Flash
hermes config set auxiliary.review.model codex/gpt-6.1-sol
hermes config set auxiliary.background_review.model codex/gpt-6.1-sol
hermes config set auxiliary.background_review.reasoning_effort high
```

### 3. 配套核心技能清单
将 [`skills/rigorous-dev/SKILL.md`](./skills/rigorous-dev/SKILL.md) 放入 `$HERMES_HOME/skills/software-development/rigorous-dev/SKILL.md`，并推荐搭配以下开源技能：

```bash
# Hermes 内置可选技能启用
hermes skills repair-official --restore -y grill-me
hermes skills repair-official --restore -y agent-merge-conflict-arbiter
hermes skills repair-official --restore -y subagent-driven-development

# 社区顶流技能安装
hermes skills install -y --category software-development vercel-labs/agent-skills/skills/react-native-skills
hermes skills install -y --category software-development mattpocock/skills/skills/engineering/improve-codebase-architecture
hermes skills install -y --category creative pbakaus/impeccable/.hermes/skills/impeccable
hermes skills install -y --category creative anthropics/skills/skills/frontend-design
```

---

## 四、仓库结构

```text
.
├── README.md                          # 中文主文档（五人团队 + 五步流水线 + 快速配置）
├── README.en.md                       # 英文文档 (English Documentation)
├── LICENSE                            # MIT 开源许可
├── configs/
│   └── hermes-config.example.yaml     # 脱敏版 Hermes 核心路由、子智能体与防死循环配置
├── scripts/
│   └── setup-magpie-groups.sh         # Magpie 路由组一键配置与冒烟测试脚本
├── skills/
│   └── rigorous-dev/
│       └── SKILL.md                   # 集成全部高手护栏的 /rigorous-dev 技能定义
└── docs/
    ├── benchmarks-2026-11.md          # 2026-11 海外与国产主力大模型 Benchmark 核实报告
    └── power-user-patterns.md         # 顶尖 AI 工程师工作流与 UI 视觉闭环深度拆解
```

## License

MIT License
