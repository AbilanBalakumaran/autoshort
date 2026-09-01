#!/usr/bin/env sh
# The front-end is deployed twice: Cloudflare Pages serves pages/public (plus
# the API in pages/functions), GitHub Pages serves the copy at the repo root.
# pages/public is the source of truth; this mirrors it to the root.
#
#   ./sync-public.sh          copy pages/public -> repo root
#   ./sync-public.sh --check  exit 1 if the two copies have drifted
set -eu

cd "$(dirname "$0")"
FILES="index.html script.js style.css sw.js manifest.json icon.svg favicon-16.png favicon-32.png apple-touch-icon.png"
DIRS="fonts icons splash vendor"

if [ "${1:-}" = "--check" ]; then
  drift=0
  for f in $FILES; do
    cmp -s "pages/public/$f" "$f" || { echo "drift: $f"; drift=1; }
  done
  for d in $DIRS; do
    diff -rq "pages/public/$d" "$d" >/dev/null || { echo "drift: $d/"; drift=1; }
  done
  [ "$drift" -eq 0 ] && echo "root mirror is in sync" || exit 1
  exit 0
fi

for f in $FILES; do cp "pages/public/$f" "$f"; done
for d in $DIRS; do rm -rf "$d" && cp -R "pages/public/$d" "$d"; done
echo "root mirror updated from pages/public"
