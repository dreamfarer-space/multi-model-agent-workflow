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
   - 多国语言文件（如 `locales/*.ts`）由单子智能体一次性对齐，严禁拆成 5 个以上并发写任务互相踩踏。
3. **跨会话账本与 `LLM Wiki`**：
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

1. **Token 单一来源（Tokens are Law）**：
   - 颜色、字号、圆角、间距必须取自 `theme.ts` / `DESIGN.md` 语义 Token，禁止在业务组件中手写 `#hex` 颜色或魔法数字。
2. **三步递进验证**：
   - **Step 1（无头状态机 / TLA+）**：将重连、选中态同步、审批流从 UI 剥离，先用无头脚本随机跑几百次乱序操作序列（或 TLA+ 模型检验），验证无死锁。
   - **Step 2（结构树与几何测量）**：
     - Android：通过 `adb exec-out uiautomator dump /dev/tty` 解析节点 `bounds=[x1,y1][x2,y2]`，断言控件对齐、无越界裁切、软键盘弹出后输入框仍在可见区域内（避免 Android `adjustResize` 与内层 `KeyboardInset` 双倍叠加）。
     - Web：通过 DOM `getBoundingClientRect()` 与 `scrollWidth > clientWidth` 检查横向溢出与文本截断。
   - **Step 3（静止态截图比对）**：在动画静止后截取明/暗主题画面，做最终视觉验收。

---

## 五、AI-Native 复利工程：把软提示变成硬卡口

1. **Lint-as-Memory（每修一个 Bug 就加一条静态检查）**：
   - 每当发现一类重复出现的 AI 错误（如非 Token 裸色值、嵌套 `KeyboardInset`、客户端模块引用服务端包、语言包 key 缺失），立即在项目的 `check` 脚本或单测中新增一条静态拦截规则，使违规代码在 `check` 阶段直接非零退出。
2. **文件路径即上下文（Filepath Constraints）**：
   - 用清晰的文件命名或目录边界标记运行环境与性能约束（如客户端纯内存投影、嵌入式高频渲染循环 `.hot`），并通过构建脚本禁止在其中分配垃圾内存或调用阻塞 API。
3. **`// WHY:` 护栏注释原则**：
   - 禁止写解释“代码在干什么（What）”的 AI 废话注释；强制在反直觉的平台兼容代码或协议边界处写明 `// WHY:` 注释，防止后续智能体将其误判为冗余代码删掉。
