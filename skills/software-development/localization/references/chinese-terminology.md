# Chinese terminology conventions

Glossary decided for this user's Chinese localization work. Applies per target
catalog; keep Simplified and Traditional rows in lockstep. Extend the table when
a new contested source word appears — do not improvise a second rendering.

| English source | zh-Hans | zh-Hant | Note |
|---|---|---|---|
| thread (also "conversation") | 对话 | 對話 | Never 线程/讨论串/執行緒/對話串 — those are programming- or forum-flavored |
| installation(s) (a deployed instance) | 安装实例 | 安裝實例 | Never 工作区 |
| workspace (source says workspace) | 工作区 | 工作區 | Legitimate second term — keep distinct from installation |
| server(s) | 服务器 | 伺服器 | |
| default | 默认 | 預設 | zh: never 缺省 |
| preset(s) | 预设 | 預設集 | Keep distinct from "default" in Traditional (預設 collision) |
| bot(s) | 机器人 | 機器人 | Never 项目/項目 |
| honorific | 你 | 你 | Never 您, in either variant |
| quotes | “...” | 「...」 | Simplified: mainland double quotes; Traditional: corner brackets |

Variant-vocabulary cleanup in Simplified text (Traditional-only forms that
creep in): 纪录→记录, 帐户→账户, 设置档→配置, 软体→软件, 网路→网络,
资料→数据 (only when the source means data), 档案→文件 (careful: 档案夹→文件夹).

Application rules:

- Map by SOURCE word, not by key name (key names lie).
- When a sentence contains two different source words that now share one target
  term (e.g. "delete this thread and its conversation"), hand-rewrite it so the
  duplication disappears — do not ship 对话对话.
- Role/product names left in English in the source stay in English.
- Multiword compounds follow the head term: "parallel threads"→并行对话/並行對話,
  "thread limit"→对话上限/對話上限.
