#!/usr/bin/env bash
set -euo pipefail

# Universal installer for the Antigravity workflow plugin and its 33 bundled skills.
# Usage:
#   bash scripts/install-skills.sh                       # Default: Antigravity (~/.gemini/config/plugins/workflow)
#   bash scripts/install-skills.sh --target antigravity  # Installs full plugin (plugin.json, hooks.json, scripts/guard-hook.mjs, agents/, skills/; preserves existing rules/AGENTS.md unless FORCE_RULES=1)
#   bash scripts/install-skills.sh --target claude       # Installs 33 skills to ~/.claude/skills
#   bash scripts/install-skills.sh --target cursor       # Installs 33 skills to ~/.cursor/skills
#   bash scripts/install-skills.sh --target agents       # Installs 33 skills to ~/.agents/skills
#   bash scripts/install-skills.sh --target hermes       # Installs 33 skills to $HERMES_HOME/skills

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_SKILLS="$REPO_DIR/skills"
TARGET="${1:---target}"
MODE="${2:-antigravity}"

if [[ "$TARGET" != "--target" ]]; then
  MODE="$TARGET"
fi

copy_skills() {
  local dest="$1"
  local count=0
  mkdir -p "$dest"
  for skill_dir in "$SRC_SKILLS"/*; do
    [[ -d "$skill_dir" && -f "$skill_dir/SKILL.md" ]] || continue
    local name
    name="$(basename "$skill_dir")"
    rm -rf "$dest/$name"
    cp -R "$skill_dir" "$dest/$name"
    count=$((count + 1))
  done
  echo "$count"
}

case "$MODE" in
  antigravity)
    DEST="${ANTIGRAVITY_PLUGIN_DIR:-$HOME/.gemini/config/plugins/workflow}"
    mkdir -p "$DEST/skills" "$DEST/agents" "$DEST/rules" "$DEST/scripts"
    cp "$REPO_DIR/plugin.json" "$DEST/plugin.json"
    cp "$REPO_DIR/README.md" "$DEST/README.md"
    cp "$REPO_DIR/hooks.json" "$DEST/hooks.json"
    cp "$REPO_DIR/scripts/guard-hook.mjs" "$DEST/scripts/guard-hook.mjs"
    cp "$REPO_DIR/agents/"*.md "$DEST/agents/"
    if [[ ! -f "$DEST/rules/AGENTS.md" || "${FORCE_RULES:-0}" == "1" ]]; then
      cp "$REPO_DIR/rules/AGENTS.md" "$DEST/rules/AGENTS.md"
    else
      echo "Preserved existing $DEST/rules/AGENTS.md (set FORCE_RULES=1 to overwrite)."
    fi
    COUNT="$(copy_skills "$DEST/skills")"
    echo "Installed Antigravity workflow plugin + hooks + $COUNT skills into: $DEST"
    ;;
  claude)
    DEST="$HOME/.claude/skills"
    COUNT="$(copy_skills "$DEST")"
    echo "Installed $COUNT skills into Claude Code: $DEST"
    ;;
  cursor)
    DEST="$HOME/.cursor/skills"
    COUNT="$(copy_skills "$DEST")"
    echo "Installed $COUNT skills into Cursor: $DEST"
    ;;
  agents)
    DEST="$HOME/.agents/skills"
    COUNT="$(copy_skills "$DEST")"
    echo "Installed $COUNT skills into .agents: $DEST"
    ;;
  hermes)
    DEST="${HERMES_HOME:-$HOME/.hermes}/skills"
    COUNT="$(copy_skills "$DEST")"
    echo "Installed $COUNT skills into Hermes: $DEST"
    ;;
  *)
    echo "Usage: bash scripts/install-skills.sh --target [antigravity|claude|cursor|agents|hermes]" >&2
    exit 1
    ;;
esac
