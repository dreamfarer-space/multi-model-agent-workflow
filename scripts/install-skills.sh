#!/usr/bin/env bash
set -euo pipefail

# Universal installer for the 20 bundled skills in this repository.
# Usage:
#   bash scripts/install-skills.sh                  # Auto-detects Hermes ($HERMES_HOME or ~/.hermes)
#   bash scripts/install-skills.sh --target hermes  # Installs to $HERMES_HOME/skills (categorized)
#   bash scripts/install-skills.sh --target claude  # Installs to ~/.claude/skills (flat)
#   bash scripts/install-skills.sh --target cursor  # Installs to ~/.cursor/skills (flat)
#   bash scripts/install-skills.sh --target agents  # Installs to ~/.agents/skills (flat)

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_SKILLS="$REPO_DIR/skills"
TARGET="${1:---target}"
MODE="${2:-hermes}"

if [[ "$TARGET" != "--target" ]]; then
  MODE="$TARGET"
fi

case "$MODE" in
  hermes)
    DEST="${HERMES_HOME:-$HOME/.hermes}/skills"
    mkdir -p "$DEST"
    cp -R "$SRC_SKILLS/"* "$DEST/"
    echo "Installed 20 skills (with categories) into Hermes: $DEST"
    ;;
  claude)
    DEST="$HOME/.claude/skills"
    mkdir -p "$DEST"
    for cat_dir in "$SRC_SKILLS"/*; do
      [[ -d "$cat_dir" ]] || continue
      for skill_dir in "$cat_dir"/*; do
        [[ -d "$skill_dir" ]] || continue
        cp -R "$skill_dir" "$DEST/$(basename "$skill_dir")"
      done
    done
    echo "Installed 20 skills into Claude Code: $DEST"
    ;;
  cursor)
    DEST="$HOME/.cursor/skills"
    mkdir -p "$DEST"
    for cat_dir in "$SRC_SKILLS"/*; do
      [[ -d "$cat_dir" ]] || continue
      for skill_dir in "$cat_dir"/*; do
        [[ -d "$skill_dir" ]] || continue
        cp -R "$skill_dir" "$DEST/$(basename "$skill_dir")"
      done
    done
    echo "Installed 20 skills into Cursor: $DEST"
    ;;
  agents)
    DEST="$HOME/.agents/skills"
    mkdir -p "$DEST"
    for cat_dir in "$SRC_SKILLS"/*; do
      [[ -d "$cat_dir" ]] || continue
      for skill_dir in "$cat_dir"/*; do
        [[ -d "$skill_dir" ]] || continue
        cp -R "$skill_dir" "$DEST/$(basename "$skill_dir")"
      done
    done
    echo "Installed 20 skills into .agents: $DEST"
    ;;
  *)
    echo "Usage: bash scripts/install-skills.sh --target [hermes|claude|cursor|agents]" >&2
    exit 1
    ;;
esac
