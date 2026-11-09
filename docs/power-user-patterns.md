# 顶尖 AI 工程师工作流与自动化验收模式精粹

本文整理自 Boris Cherny（Claude Code 创始人）、Jesse Vincent（`obra/superpowers`）、Garry Tan（`garrytan/gstack`）、Matt Pocock（`mattpocock/skills`）、Andrej Karpathy、Simon Willison 及 AI-Native 游戏/移动端工程团队的公开实践。

---

## 一、写码前硬门禁（Pre-Implementation Hard Gates）

### 1. 决策树前沿轮次拷问（`grill-me` / Frontier Rounds）
- **原则**：“查清代码事实是 Agent 的天职，权衡业务取舍是用户的特权。”
- **执行**：
  1. 严禁向用户提问任何通过 `search_files` / `read_file` 能查到的事实。
  2. 将未知决策建模为有向依赖树（Design Tree），每一轮只提问前置条件已定死的“前沿节点（Frontier）”，并为每个问题附上推荐选项与一句话理由。
  3. 清空所有未知分支、明确列出 **`Out of Scope`（禁止触碰的文件与模块）** 后，才准进入编码阶段。

### 2. 两轮不过立即掀桌（Two-Strike Reset Rule）
- 当模型连续 2 轮修改仍未修好同一个 Bug 时，当前会话上下文已被错误假设污染（Context Poisoning）。
- **硬动作**：立即停止在原地叠加第 3 层补丁，记录 5 行交接摘要（当前分支、**已证伪的假设/死胡同**、剩余报错），回退到根因重新规划或单回合升级模型处理。

---

## 二、上下文卫生与子智能体隔离（Context Hygiene）

1. **主线只留决策，搜索全走子智能体**：
   - 全仓库探索、长日志排查、多模块只读审计一律派发给全新上下文的子智能体（`delegate_task`）。
   - **回传预算**：强制每个子智能体只回传 **≤50 行的浓缩结论 + 精确 `file:line`**，严禁将几万行原始代码或日志倒进主会话。
2. **耦合代码单人主刀，拒绝碎裂并发写**：
   - 相互接线的 UI 组件、Store 状态与路由导航必须由主会话同一写作者完成。
   - 多国语言文件（如 `locales/*.ts`）由单子智能体一次性对齐，单批子智能体并发严格锁死在 **≤5 路**（`delegation.max_concurrent_children: 5`），严禁拆成 5 个以上并发写任务互相踩踏。
3. **独立回调、错峰热缓存与摘要限流（防 30 分钟长尾阻塞与上下文雪崩）**：
   - 开启 `delegation.independent_completions: true`，让先完成的子智能体立即回调，避免整批任务被最慢的单个子智能体拖住半小时。
   - 开启 `delegation.prefix_stagger_seconds: 8`，让并发批次的首个子智能体先行预热 Prompt Cache 并错开请求峰值，防止瞬间并发打爆网关触发 `429` 掉入免费慢速兜底池。
   - 将 `delegation.max_summary_chars` 收紧至 `8000` 并开启 `child_timeout_seconds: 1800`，防止单次超长回调直接把主会话顶进 60 秒同步压缩导致状态失忆。
4. **子智能体 Worktree 自动归档生命周期与防拒写铁律**：
   - 开启 `delegation.worktree_isolation: true` 时，子智能体在 `<repo>/.worktrees/subagent-<id>` 中运行，但**一旦子智能体结束退出，Hermes 会自动将该物理目录归档（至 `refs/hermes/archive/...`）并从磁盘移除**。父智能体收到回调后**严禁执行 `cd .worktrees/subagent-*`**，而应直接通过保留的分支 `hermes-subagent/subagent-<id>`（`git log/diff/merge`）或 `hermes worktree restore` 整合改动。
   - 修改已存在文件一律优先使用 `patch`；若必须用 `write_file` 覆盖已有文件，当前会话必须先完整 `read_file` 全文（不可仅分页读局部），消除 `Refusing to overwrite` 报错。
5. **跨会话账本与 `LLM Wiki`**：
   - 长期知识不靠翻聊天记录，而是用 `raw/`（只读源）+ `concepts/` + `index.md` 维护结构化 Wiki；新会话启动先读 `index.md`。

---

## 三、异血统两阶段交叉盲审（Two-Stage Cross-Family Review）

为什么写代码的模型不能自己审自己？因为同家族模型共享相同的盲区，且长会话中的推导过程会让审查者产生确认偏误（Confirmation Bias）。

- **输入隔离**：只向异家族审查模型（如 `GPT-6.1-Sol (high)`）提供 **自包含需求说明 + 真实 `git diff` + 测试命令输出**，绝不传入聊天历史，绝不采信开发者的文字自评。
- **阶段 1：规格合规审查（Spec Compliance First）**
  - 检查 `Missing`（漏做）、`Extra`（计划外擅自顺手改的私货）、`Misunderstood`（方向错误）。
  - **一票否决**：只要存在未授权的 `Extra` 私货，直接打回，不进入代码质量审查。
- **阶段 2：代码质量与并发安全审查（Code Quality Second）**
  - 检查连接代次泄漏、异步写回死锁、未释放锁与边界异常；必要时配合 `simplify-code` 并发清理冗余代码。

---

## 四、移动端与 Web 视觉反馈闭环（Visual Feedback Loop）

> **核心分层：结构树 = 事实，几何坐标 = 度量，截图 = 最终证据。**

1. **Token 单一来源与动效频率门禁（Tokens & Frequency Gate）**：
   - 颜色、字号、圆角、间距必须取自 `theme.ts` / `DESIGN.md` 语义 Token，禁止在业务组件中手写 `#hex` 颜色或魔法数字。
   - **Emil Kowalski 频率门禁（`emil-design-eng` / `animate-expo`）**：100+ 次/天的高频操作（切 Tab、开关软键盘、命令面板）**严禁加动画（`animation: 'none'`）**；其余 UI 动效控制在 300ms 内，进入/退出一律用强 `ease-out`（严禁 `ease-in` 与 `scale(0)`），React Native 手势与动效必须留在 UI Worklet 线程（禁止在 `onUpdate` 中每帧调 `setState` 或 `scheduleOnRN`）。
   - **移动端 Web 原生体感（`mobile-native`）**：所有 `:hover` 必须包在 `@media (hover: hover) and (pointer: fine)` 中（消除触屏假悬停粘滞），输入框字号 ≥16px（防止 iOS 自动放大页面），全屏容器使用 `100dvh` 替代 `100vh`。
2. **四步递进验证**：
   - **Step 1（无头状态机 / TLA+）**：将重连、选中态同步、审批流从 UI 剥离，先用无头脚本随机跑几百次乱序操作序列（或 TLA+ 模型检验），验证无死锁。
   - **Step 2（`break-ui` 极限脏数据压测）**：向组件注入真实世界最坏情况夹具（30 字符无空格德语复合词、65 字符长邮箱、单字母短名、`0 / 1 / 1,000+` 条集合、动态跳变数字 `tabular-nums`），提前暴露 Flex 挤压（缺 `min-width: 0` / `flex-shrink: 0`）与爆框。
   - **Step 3（结构树与几何测量）**：
     - Android：通过 `adb exec-out uiautomator dump /dev/tty` 解析节点 `bounds=[x1,y1][x2,y2]`，断言控件对齐、无越界裁切、软键盘弹出后输入框仍在可见区域内（避免 Android `adjustResize` 与内层 `KeyboardInset` 双倍叠加）。
     - Web：通过 DOM `getBoundingClientRect()` 与 `scrollWidth > clientWidth` 检查横向溢出与文本截断。
   - **Step 4（静止态截图比对）**：在动画静止后截取明/暗主题画面，做最终视觉验收。

---

## 五、AI-Native 复利工程：把软提示变成硬卡口

1. **Lint-as-Memory（每修一个 Bug 就加一条静态检查）**：
   - 每当发现一类重复出现的 AI 错误（如非 Token 裸色值、嵌套 `KeyboardInset`、客户端模块引用服务端包、语言包 key 缺失），立即在项目的 `check` 脚本或单测中新增一条静态拦截规则，使违规代码在 `check` 阶段直接非零退出。
2. **文件路径即上下文（Filepath Constraints）**：
   - 用清晰的文件命名或目录边界标记运行环境与性能约束（如客户端纯内存投影、嵌入式高频渲染循环 `.hot`），并通过构建脚本禁止在其中分配垃圾内存或调用阻塞 API。
3. **`// WHY:` 护栏注释原则**：
   - 禁止写解释“代码在干什么（What）”的 AI 废话注释；强制在反直觉的平台兼容代码或协议边界处写明 `// WHY:` 注释，防止后续智能体将其误判为冗余代码删掉。
4. **Cursor `pstack` 六大硬核原则蒸馏（不装 24 个碎片技能，直接内化为纪律）**：
   - **`build-the-lever`（造杠杆而非手糊）**：非平凡的修复或验证必须留下可重跑的脚本（`scripts/verify-*.mjs`）；没有脚本留存等于未验证。
   - **`make-operations-idempotent`（操作幂等与崩溃可恢复）**：状态迁移、凭证刷新、配对提交与重试必须先读当前状态、只补差额，且能安全识别并接管上次中断残留。
   - **`test-behavior-not-implementation`（双向行为测试门禁）**：「改坏外部可观测行为 → 测试必挂」且「只重构内部实现不改行为 → 测试必过」，严禁写绑死源码字符串的脆弱测试。
   - **`typescript-best-practices`（让非法状态在类型层无法表示）**：用可辨识联合取代多个布尔变量；边界处一次性 Zod 解析（`z.infer`）；ID 用 Branded Types 守卫而非 `as` 断言。
   - **`blast-radius`（5 级爆破半径证据梯）**：找出“本次跨包改动之所以安全，唯一依赖的那个前提事实”，并用第 4/5 级真实代码运行去证明它；未实跑的调用方必须标为 `UNPROVEN`。
   - **AI 贡献者三大架构红旗（`design-red-flags`）**：消灭 `Importable Internals`（内部私有辅助函数被导出，诱导只看单文件的 AI 绕过模块边界）、`Two Ways to Do One Task`（新旧接口并存未删，诱导 AI 抄错旧范式）与 `Hand-Synced Lists`（靠人工约定同步的两处列表）。
