#!/usr/bin/env bash
# Copies Thoth's market engine (packages/market-engine/src) into vendor/market-engine at a pinned commit.
# Usage: scripts/sync-engine.sh <thoth-commit> [path-to-thoth-checkout]
set -euo pipefail
sha="${1:?usage: scripts/sync-engine.sh <thoth-commit> [path-to-thoth]}"
thoth="${2:-../Thoth}"
dest="$(cd "$(dirname "$0")/.." && pwd)/vendor/market-engine"
git -C "$thoth" fetch -q origin 2>/dev/null || true
full="$(git -C "$thoth" rev-parse "$sha^{commit}")"
files="$(git -C "$thoth" ls-tree --name-only "$full" packages/market-engine/src/)"
rm -rf "$dest" && mkdir -p "$dest"
for f in $files; do git -C "$thoth" show "$full:$f" > "$dest/$(basename "$f")"; done
printf 'priyanshuj0410-code/Thoth %s packages/market-engine/src\n' "$full" > "$dest/VERSION"
echo "vendored $(echo "$files" | wc -l | tr -d ' ') files from Thoth $full"
