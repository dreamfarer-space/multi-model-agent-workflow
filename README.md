# Multi-Model Agent Workflow (`Hermes` × `Magpie`)

[English](./README.en.md) | **简体中文**

这套配置和技能包，是我自己写全栈 TypeScript、React Native (Expo)、iOS (Swift) 和嵌入式项目时踩了一堆坑之后攒出来的。

我之前遇到过两个很蠢但很常见的问题：
1. **模型配额乱烧，响应还慢**。把最贵的模型挂在主窗口一路 `grep` 翻文件，或者把所有子智能体都塞进同一个免费慢模型排队。结果要么半天就把稀缺额度烧光，要么 4 个子任务排在单通道里卡死。
2. **多智能体并发改代码，改出一团乱麻**。有一次修前端交互，我一口气开了 7 个子智能体同时改相互接线的组件和 7 国语言包，两边状态对不上，最后只能整分支回滚重来。

所以我把路由和工作流重做了一遍：**让擅长全局推理和看图的模型坐镇主窗口，让三个不同厂家的快模型轮询跑只读侦察，让异血统模型只看 `git diff` 做盲审**；同时把社区里真正管用的 20 个工程技能打包进仓库，克隆下来一行脚本就能装进 Hermes Agent、Claude Code 或 Cursor。

![多模型路由与配额隔离架构](./assets/model-routing.svg)

---

## 一分钟装好（开箱即用）

仓库的 `skills/` 目录已经内置了整理、去重并通过安全检查的 **20 个开源技能**（全部保留上游 MIT / Apache-2.0 版权声明，见 [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)）。不需要挨个联网拉取，克隆仓库后直接跑安装脚本就行：

```bash
git clone https://github.com/dreamfarer-space/multi-model-agent-workflow.git
cd multi-model-agent-workflow

# 1. 一键安装全部 20 个技能（支持 hermes / claude / cursor / agents 四种目标目录）
bash scripts/install-skills.sh --target hermes
# 如果你用 Claude Code: bash scripts/install-skills.sh --target claude
# 如果你用 Cursor:      bash scripts/install-skills.sh --target cursor

# 2. 如果你用 Magpie 网关管理多账号，一键建好 4 个路由组
bash scripts/setup-magpie-groups.sh

# 3. 在 Hermes 中绑定对应角色（参考 configs/hermes-config.example.yaml）
hermes config set model.default antigravity/gemini-4-argon
hermes config set delegation.model group/work
hermes config set auxiliary.compression.model minimax-code/MiniMax-M3.1-Flash
hermes config set auxiliary.review.model codex/gpt-6.1-sol
hermes config set auxiliary.background_review.model codex/gpt-6.1-sol
hermes config set auxiliary.background_review.reasoning_effort high
```

---

## 五个岗位怎么分工

各模型的详细公开测试数据（区分官方实测与第三方推算值）整理在 [`docs/benchmarks-2026-11.md`](./docs/benchmarks-2026-11.md)。实际用下来，每个模型的脾气差得很远：

| 岗位 | 绑定模型 / 路由 | 核心公开基准 | 为什么放这个位置 |
| :--- | :--- | :--- | :--- |
| **1. 主窗口总工长** | `antigravity/gemini-4-argon`<br>(`model.default`) | DeepSWE v1.1 `77.9%`<br>GraphWalks 128K `99.7%`<br>Roboflow 视觉 `87.5%` | 跨文件调用链记忆和看图查 UI 对齐最准，数学与控制理论推导也稳。缺点是首字思考要 15–20 秒，所以别让它干翻文件、跑腿查日志的活，只让它拍板方案和集中改耦合代码。走 Google AI Ultra 池（每 5 小时重置）。 |
| **2. 并行子智能体** | `group/work`<br>(`routing=rotate, stays=turn`) | DeepSeek-V4.1-Flash (`190 tok/s`)<br>MiniMax-M3.1-Flash (`166 tok/s`)<br>Gemini-3.8-Flash (`130 tok/s`) | 派 3–5 个子任务出去时，按轮询分发到腾讯 WorkBuddy、MiniMax 和 Google Pro 三条独立通道，不撞单账号并发墙。`stays=turn` 保证同一个子智能体在多轮工具调用中途不会换模型。`workbuddy/hy4free` 放在 `fallback_providers` 兜底。 |
| **3. 多语言与文案** | `antigravity/gemini-3.8-flash`<br>(`group/edit`) | LMArena 中文视觉第 1<br>LiveCodeBench `89.5%` | 在 Magpie 里把这个模型锁死在 Google AI Pro 账号池，完全不占 Ultra 池的 Argon 额度。专门负责单任务一次性同步多国语言字典（`locales/*.ts`）和写 PR 说明。 |
| **4. 上下文压缩** | `minimax-code/MiniMax-M3.1-Flash`<br>(`auxiliary.compression`) | LOCA-Bench 256K `60.3%`（长程检索第 1）<br>最大输出 `524K` | 长会话触发自动压缩时由它接手，最不容易把前面查出来的 `file:line` 和已经证伪的死胡同弄丢。 |
| **5. 盲审与急救** | 盲审：`codex/gpt-6.1-sol:high`<br>急救：`claude-opus-5-5` | Sol：DeepSWE `75.2%`、指令遵循 `82.0%`<br>Opus 5.5：SWE-bench Pro `89.9%` | 写代码用 Gemini/DeepSeek，审代码换 OpenAI 血统的 Sol，只看需求单、`git diff` 和测试输出。Opus 5.5 额度少，严禁挂在主窗口跑长链路，只在主模型连改两轮还不过时切过去做单回合手术。 |

---

## 日常干活的五步流程

![五步工程流水线](./assets/pipeline.svg)

这套流程吸收了 Boris Cherny、Jesse Vincent (`superpowers`)、Garry Tan (`gstack`)、Matt Pocock (`grill-me`)、Emil Kowalski 以及 Lauren Tan (`cursor/pstack`) 的做法，背景拆解见 [`docs/power-user-patterns.md`](./docs/power-user-patterns.md)。

### 1. 先探路、问清楚边界，再动手写码
- 主窗口不自己翻大仓库，直接派 3–5 个 `group/work` 子智能体只读勘察，要求每个子任务只回传 **50 行以内的结论 + 精确 `file:line`**，别把几千行原始代码塞进主窗口。
- 凡是有设计分支的地方，先用 `grill-me` 提 2–3 道带推荐项的选择题把分支定死，顺手列明 `Out of Scope`（这次绝不碰哪些文件）。源码里能查到的事实自己查，不问用户。

### 2. 耦合代码一个人改，连错两轮立刻停手
- 相互接线的 UI 组件、Store 状态和路由导航，由主窗口 `Argon` 一个人从头改到尾。多国语言包改完中文主文件后，只派 1 个 `Gemini 3.8 Flash` 子智能体一次性对齐其余语言，绝不拆成七八个并发写任务。
- 写 TypeScript 按 `typescript-best-practices` 走：用可辨识联合（Discriminated Unions）代替散落的布尔变量，在边界做一次 Zod 解析（`z.infer`），状态迁移和重试必须幂等（先读当前状态，只补差额）。
- 写注释只写 `// WHY:`（解释平台特殊坑或协议不变量，防止后面的模型手欠删掉保命逻辑），不写复述代码表面意思的废话注释。
- **两轮重置规则（Two-Strike Reset）**：同一个问题如果连续改了两轮还没过测试，立刻停手，不准叠第三层补丁。先把“哪条假设走不通”记下来，退回根因重想，或者切 `/model opus` 看一眼核心文件。

### 3. 三层机器验证（别靠肉眼猜）
1. **先跑无头状态机或 TLA+ `statechart`**：遇到断线重连、选中态回写、轮询竞态、审批流，先把状态机抽出来跑随机乱序测试；或者用内置的 `statechart` 技能调用 TLC，把 `.tla` 规范直接编译成 Mermaid 状态图（`chart.mmd`）和最短反例路径。
2. **再跑构建、测试与 `blast-radius` 证据梯**：跑通目标包的 `check` 和 `test` 后，用 `blast-radius` 找出“这次跨模块改动之所以安全，唯一依赖的那一个前提事实”，写个小脚本或单测跑一下真实代码证明它；没跑过的调用方老老实实标 `UNPROVEN`。如果汇报性能提升，先过一遍 `benchmark-checklist` 的 7 个问题。
3. **最后喂脏数据、算几何坐标、看截图**：先用 `break-ui` 里的极限真实数据（30 字符无空格德语长词、65 字符长邮箱、单字母短名、`0 / 1 / 1000` 行列表）测一遍会不会爆框；再用 Android `uiautomator dump` 的 `bounds` 或浏览器 `getBoundingClientRect` 核对坐标，最后截明/暗主题图给 `Argon` 检查（截图里严禁露出个人用户名或本地路径）。

### 4. 代码瘦身 + 异血统两阶段盲审
- 改动较大时先跑 `simplify-code`，分四路检查有没有现成工具函数可复用、有没有多余状态和未释放句柄。
- 提交前交给 `GPT-6.1-Sol (high)` 盲审。不传聊天记录，只给任务说明、真实 `git diff` 和测试输出：
  - **第一关查规格合规**：有没有漏做（`Missing`）、有没有计划外顺手乱改的私货（`Extra`）。有私货直接打回。
  - **第二关查代码质量与并发安全**：查连接代次泄漏、竞态和异常兜底。

### 5. 修完一个典型坑，加一条静态检查（Lint-as-Memory）
- 写进文档的规矩模型早晚会忘，写进 `check` 脚本的规矩它想犯都过不了构建。每修完一类容易重犯的错（比如手写裸 `#hex` 颜色、双层 `KeyboardInset` 嵌套、语言包 key 缺失），顺手往检查脚本里加一条拦截规则。
- 重要的架构演进或公式推导，用 `llm-wiki` 归档到知识库的 `index.md` 里，下次开新窗口读一页索引就能接着干。

---

## 仓库内置的 20 个技能与开源协议

所有内置技能均放在 [`skills/`](./skills) 下，完整版权声明与修改记录见 [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)：

| 分类 | 技能目录 | 作用 | 上游来源与协议 |
| :--- | :--- | :--- | :--- |
| **工程主线与架构** | `rigorous-dev` | 串起前置拷问、两轮重置、无头验证、几何测量与盲审的主工作流 | MIT (`Nous Research` / 本仓库扩展) |
| | `grill-me` | 写码前按决策树拷问未知分支，带推荐选项 | MIT (`mattpocock/skills`) |
| | `improve-codebase-architecture` | 找出浅模块并拦截 AI 易踩的 3 类架构红旗 (`design-red-flags.md`) | MIT (`mattpocock/skills` + `cursor/pstack`) |
| | `typescript-best-practices` | 可辨识联合、Branded Types、Zod 边界解析与穷尽检查 | MIT (`cursor/plugins/pstack`) |
| | `blast-radius` | 跨模块改动影响面审计与 5 级运行态证据梯 | MIT (`cursor/plugins/pstack`) |
| | `statechart` | 调用 SANY + TLC 将 TLA+ 规范编译为 Mermaid 状态图与最短反例（已适配 Windows/POSIX） | MIT (`cursor/plugins/pstack`) |
| | `benchmark-checklist` | 汇报性能与容量数据前的 7 问核查单 | MIT (`cursor/plugins/pstack`) |
| | `simplify-code` | 从复用、质量、性能、抽象层级四路清理近期代码改动 | MIT (`Nous Research`) |
| | `subagent-driven-development` | 子智能体执行与两阶段（规格 → 质量）独立审查 | MIT (`obra/superpowers`) |
| | `agent-merge-conflict-arbiter` | 基于双边提交意图与测试验证的中立合并冲突仲裁 | MIT (`Nous Research`) |
| **UI、动效与多端** | `vercel-react-native-skills` | React Native 与 Expo 列表、布局、原生模块 58 条规范 | MIT (`vercel-labs/agent-skills`) |
| | `animate-expo` | Expo / Reanimated 4 动效频率门禁（高频操作禁动画）与 UI 线程手势 | MIT (`emilkowalski/skills`) |
| | `break-ui` | 用真实极限脏数据（长德语词、长邮箱、0/1/1000 列表）压测 UI 布局 | MIT (`emilkowalski/skills`) |
| | `mobile-native` | 修复移动端网页/WebView 的 `:hover` 粘滞、`100dvh`、输入框放大等 10 个破绽 | MIT (`emilkowalski/skills`) |
| | `write-swift` | Swift 6.3/6.4 值类型建模与 Approachable Concurrency 递进并发规范 | MIT (`emilkowalski/skills`) |
| | `emil-design-eng` | Emil Kowalski 的 UI 细节与 `<300ms ease-out` 动效判断标准 | MIT (`emilkowalski/skills`) |
| | `impeccable` | 覆盖排版、色彩对比、层次与反 AI 模板化的前端设计规范 | Apache-2.0 (`pbakaus/impeccable`) |
| | `frontend-design` | 构建有辨识度的前端视觉方向与排版选择 | Apache-2.0 (`anthropics/skills`) |
| **写作与知识库** | `humanizer` | 对照 34 类常见 AI 写作套路，洗掉空话与机械句式 | MIT (`blader/humanizer`) |
| | `llm-wiki` | 用 `raw/` + `concepts/` + `index.md` 维护可持续演进的 Markdown 知识库 | MIT (`Nous Research`) |

---

## 目录结构

```text
.
├── README.md                          # 中文说明
├── README.en.md                       # 英文说明 (English README)
├── LICENSE                            # 仓库自有内容 MIT 协议
├── THIRD_PARTY_NOTICES.md             # 20 个内置技能的完整上游版权、修改说明与 MIT / Apache-2.0 协议全文
├── assets/
│   ├── model-routing.svg              # 五角色模型路由与配额隔离架构图
│   └── pipeline.svg                   # 五步工程验证与两轮重置流程图
├── configs/
│   └── hermes-config.example.yaml     # Hermes 模型、子智能体轮询与防死循环配置模板
├── scripts/
│   ├── install-skills.sh              # 一键安装 20 个技能到 Hermes / Claude Code / Cursor / .agents
│   └── setup-magpie-groups.sh         # 一键配置 Magpie 路由组 (work / edit / review / duty)
├── skills/                            # 开箱即用的 20 个分类技能包（含各自脚本、参考文档与 LICENSE）
│   ├── autonomous-ai-agents/
│   ├── creative/
│   ├── research/
│   └── software-development/
└── docs/
    ├── benchmarks-2026-11.md          # 2026-11 主力模型实测基准对比表
    └── power-user-patterns.md         # 工程护栏与视觉验收方法拆解
```

## License

本仓库自有配置、脚本、图表与文档采用 [MIT License](./LICENSE)。`skills/` 下内置的第三方开源技能各自遵循其上游的 **MIT License** 或 **Apache License 2.0**，详见每个技能目录内的 `LICENSE` 文件及根目录 [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)。
