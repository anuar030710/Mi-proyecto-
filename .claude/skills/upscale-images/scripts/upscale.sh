#!/usr/bin/env bash
# Upscale an image or a folder of images with upscayl-bin.
# Usage: upscale.sh INPUT OUTPUT [-n model] [-s 2|3|4] [-w width] [-f png|jpg|webp]
#                   [-c 0-100] [-t tile] [-g gpu] [-x]
set -euo pipefail

UPSCAYL_HOME="${UPSCAYL_HOME:-$HOME/.cache/upscayl-skill}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() { sed -n '2,4p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2; }
[ $# -ge 2 ] || usage
INPUT="$1"; OUTPUT="$2"; shift 2

MODEL="upscayl-standard-4x"; SCALE=4; WIDTH=""; FORMAT=""; COMPRESS=0
TILE=""; GPU=""; TTA=""
while getopts "n:s:w:f:c:t:g:x" opt; do
  case "$opt" in
    n) MODEL="$OPTARG" ;;  s) SCALE="$OPTARG" ;;  w) WIDTH="$OPTARG" ;;
    f) FORMAT="$OPTARG" ;; c) COMPRESS="$OPTARG" ;; t) TILE="$OPTARG" ;;
    g) GPU="$OPTARG" ;;    x) TTA=1 ;;            *) usage ;;
  esac
done

case "$(uname -s)" in
  Linux*) BIN="$UPSCAYL_HOME/resources/linux/bin/upscayl-bin" ;;
  Darwin*) BIN="$UPSCAYL_HOME/resources/mac/bin/upscayl-bin" ;;
  *) BIN="$UPSCAYL_HOME/resources/win/bin/upscayl-bin.exe" ;;
esac
MODELS="$UPSCAYL_HOME/resources/models"

if [ ! -f "$BIN" ]; then
  echo "Engine not installed; running setup..." >&2
  bash "$SCRIPT_DIR/setup.sh"
fi
[ -e "$INPUT" ] || { echo "Input not found: $INPUT" >&2; exit 1; }
[ -f "$MODELS/$MODEL.param" ] || {
  echo "Unknown model '$MODEL'. Available:" >&2
  ls "$MODELS" | sed -n 's/\.param$//p' | sed 's/^/  /' >&2; exit 1; }
case "$SCALE" in 2|3|4) ;; *) echo "-s must be 2, 3 or 4" >&2; exit 1 ;; esac

if [ -z "$FORMAT" ]; then
  if [ -d "$INPUT" ]; then FORMAT=png; else
    ext="${OUTPUT##*.}"; ext="$(printf '%s' "$ext" | tr 'A-Z' 'a-z')"
    case "$ext" in jpg|jpeg) FORMAT=jpg ;; webp) FORMAT=webp ;; *) FORMAT=png ;; esac
  fi
fi
if [ -d "$INPUT" ]; then mkdir -p "$OUTPUT"; else mkdir -p "$(dirname "$OUTPUT")"; fi

# Model scale comes from the "-4x"/"-x4" suffix; pass -s only when it differs.
MODEL_SCALE=4
[[ "$MODEL" =~ -x?([234])x?$ ]] && MODEL_SCALE="${BASH_REMATCH[1]}"

ARGS=(-i "$INPUT" -o "$OUTPUT" -m "$MODELS" -n "$MODEL" -z "$MODEL_SCALE" -f "$FORMAT" -c "$COMPRESS")
if [ -n "$WIDTH" ]; then ARGS+=(-w "$WIDTH")
elif [ "$SCALE" != "$MODEL_SCALE" ]; then ARGS+=(-s "$SCALE"); fi
[ -n "$TILE" ] && ARGS+=(-t "$TILE")
[ -n "$GPU" ]  && ARGS+=(-g "$GPU")
[ -n "$TTA" ]  && ARGS+=(-x)

echo "upscayl-bin ${ARGS[*]}" >&2
"$BIN" "${ARGS[@]}"
echo "Done: $OUTPUT" >&2
