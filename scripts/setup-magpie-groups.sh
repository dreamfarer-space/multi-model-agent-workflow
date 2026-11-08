#!/usr/bin/env bash
set -euo pipefail

MAGPIE_BIN="${MAGPIE_BIN:-magpie}"

echo "==> Configuring Magpie routing groups..."

# 1. group/work: 3-family fast rotation pool for parallel subagents (sticky per turn)
"$MAGPIE_BIN" group add work \
  models=workbuddy/deepseek-v4.1-flash:high,minimax-code/MiniMax-M3.1-Flash:high,antigravity/gemini-3.8-flash:high \
  routing=rotate \
  stays=turn
"$MAGPIE_BIN" group set work name="干活与编码"

# 2. group/edit: Multilingual localization & prose editing
"$MAGPIE_BIN" group add edit \
  models=antigravity/gemini-3.8-flash:high,workbuddy/deepseek-v4.1-flash:high \
  routing=order \
  stays=session
"$MAGPIE_BIN" group set edit name="文字编辑与多语言"

# 3. group/review: Cross-family high-effort code review
"$MAGPIE_BIN" group add review \
  models=codex/gpt-6.1-sol:high,antigravity/gemini-4-argon:high \
  routing=order \
  stays=session
"$MAGPIE_BIN" group set review name="独立代码审查"

# 4. group/duty: Lead architect & core development
"$MAGPIE_BIN" group add duty \
  models=antigravity/gemini-4-argon:high,antigravity/gemini-3.8-flash:high,workbuddy/deepseek-v4.1-flash:high \
  routing=order \
  stays=session
"$MAGPIE_BIN" group set duty name="主脑统筹与开发"

echo "==> Current Magpie groups:"
"$MAGPIE_BIN" groups
