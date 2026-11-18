#!/usr/bin/env bash
set -euo pipefail

# Universal installer for the bundled skills (and Antigravity workflow plugin).
# Usage:
#   bash scripts/install-skills.sh                       # Auto-detects Hermes ($HERMES_HOME or ~/.hermes)
#   bash scripts/install-skills.sh --target antigravity  # Installs plugin + flat skills into ~/.gemini/config/plugins/workflow
#   bash scripts/install-skills.sh --target hermes       # Installs to $HERMES_HOME/skills (categorized)
#   bash scripts/install-skills.sh --target claude       # Installs to ~/.claude/skills (flat)
#   bash scripts/install-skills.sh --target cursor       # Installs to ~/.cursor/skills (flat)
#   bash scripts/install-skills.sh --target agents       # Installs to ~/.agents/skills (flat)

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_SKILLS="$REPO_DIR/skills"
SRC_PLUGIN="$REPO_DIR/plugins/workflow"
TARGET="${1:---target}"
MODE="${2:-hermes}"

if [[ "$TARGET" != "--target" ]]; then
  MODE="$TARGET"
fi

install_flat_skills() {
  local dest="$1"
  local count=0
  mkdir -p "$dest"
  for cat_dir in "$SRC_SKILLS"/*; do
    [[ -d "$cat_dir" ]] || continue
    for skill_dir in "$cat_dir"/*; do
      [[ -d "$skill_dir" ]] || continue
      rm -rf "$dest/$(basename "$skill_dir")"
      cp -R "$skill_dir" "$dest/$(basename "$skill_dir")"
      count=$((count + 1))
    done
  done
  echo "$count"
}

case "$MODE" in
  antigravity)
    DEST="${ANTIGRAVITY_PLUGIN_DIR:-$HOME/.gemini/config/plugins/workflow}"
    mkdir -p "$DEST/skills" "$DEST/agents" "$DEST/rules"
    cp "$SRC_PLUGIN/plugin.json" "$DEST/plugin.json"
    cp "$SRC_PLUGIN/README.md" "$DEST/README.md"
    cp "$SRC_PLUGIN/agents/"*.md "$DEST/agents/"
    cp "$SRC_PLUGIN/rules/AGENTS.md" "$DEST/rules/AGENTS.md"
    COUNT="$(install_flat_skills "$DEST/skills")"
    echo "Installed Antigravity workflow plugin + $COUNT skills into: $DEST"
    ;;
  hermes)
    DEST="${HERMES_HOME:-$HOME/.hermes}/skills"
    mkdir -p "$DEST"
    cp -R "$SRC_SKILLS/"* "$DEST/"
    COUNT=$(find "$SRC_SKILLS" -mindepth 2 -maxdepth 2 -type d | wc -l | tr -d ' ')
    echo "Installed $COUNT skills (with categories) into Hermes: $DEST"
    ;;
  claude)
    DEST="$HOME/.claude/skills"
    COUNT="$(install_flat_skills "$DEST")"
    echo "Installed $COUNT skills into Claude Code: $DEST"
    ;;
  cursor)
    DEST="$HOME/.cursor/skills"
    COUNT="$(install_flat_skills "$DEST")"
    echo "Installed $COUNT skills into Cursor: $DEST"
    ;;
  agents)
    DEST="$HOME/.agents/skills"
    COUNT="$(install_flat_skills "$DEST")"
    echo "Installed $COUNT skills into .agents: $DEST"
    ;;
  *)
    echo "Usage: bash scripts/install-skills.sh --target [antigravity|hermes|claude|cursor|agents]" >&2
    exit 1
    ;;
esac
