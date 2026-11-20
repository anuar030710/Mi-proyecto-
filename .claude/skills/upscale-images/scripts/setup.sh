#!/usr/bin/env bash
# Downloads the Upscayl engine (upscayl-bin) and its models into a cache folder
# outside the project. Safe to re-run: it updates to the latest version.
set -euo pipefail

UPSCAYL_HOME="${UPSCAYL_HOME:-$HOME/.cache/upscayl-skill}"
REPO_URL="https://github.com/upscayl/upscayl.git"

case "$(uname -s)" in
  Linux*)               PLATFORM=linux; BIN=upscayl-bin ;;
  Darwin*)              PLATFORM=mac;   BIN=upscayl-bin ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM=win;   BIN=upscayl-bin.exe ;;
  *) echo "Unsupported OS: $(uname -s)" >&2; exit 1 ;;
esac

command -v git >/dev/null || { echo "git is required" >&2; exit 1; }

if [ -d "$UPSCAYL_HOME/.git" ]; then
  echo "Updating Upscayl resources in $UPSCAYL_HOME ..."
  git -C "$UPSCAYL_HOME" fetch --depth 1 origin main
  git -C "$UPSCAYL_HOME" reset --hard FETCH_HEAD
else
  echo "Downloading Upscayl resources into $UPSCAYL_HOME (~350 MB) ..."
  mkdir -p "$(dirname "$UPSCAYL_HOME")"
  git clone --depth 1 --filter=blob:none --sparse "$REPO_URL" "$UPSCAYL_HOME"
fi

git -C "$UPSCAYL_HOME" sparse-checkout set "resources/models" "resources/$PLATFORM/bin"

BIN_PATH="$UPSCAYL_HOME/resources/$PLATFORM/bin/$BIN"
[ -f "$BIN_PATH" ] || { echo "Binary not found at $BIN_PATH" >&2; exit 1; }
chmod +x "$BIN_PATH" 2>/dev/null || true
if [ "$PLATFORM" = mac ]; then
  xattr -dr com.apple.quarantine "$UPSCAYL_HOME/resources/mac/bin" 2>/dev/null || true
fi

echo
echo "Engine: $BIN_PATH"
echo "Models:"
ls "$UPSCAYL_HOME/resources/models" | sed -n 's/\.param$//p' | sed 's/^/  /'
