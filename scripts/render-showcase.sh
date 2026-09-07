#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/lanshu-animated-architecture-diagram" >&2
  exit 2
fi

lanshu_skill_dir="$1"
renderer="$lanshu_skill_dir/scripts/render_animated_diagram.py"

if [[ ! -f "$renderer" ]]; then
  echo "Renderer not found: $renderer" >&2
  exit 1
fi

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

python3 "$renderer" \
  --spec "$repo_dir/assets/ask-park-video-flow.spec.json" \
  --outdir "$repo_dir/assets" \
  --basename ask-park-video-flow \
  --verify \
  --check
