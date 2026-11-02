#!/bin/zsh
# Usage: tools/add-progress.sh <image> "<judul>" ["<keterangan>"]
# Menyalin screenshot ke progress/, menambah entri di progress.json, lalu commit + push.
set -e
cd "$(dirname "$0")/.."
img="$1"; title="$2"; caption="${3:-}"
[ -f "$img" ] && [ -n "$title" ] || { echo "Usage: $0 <image> \"<judul>\" [\"<keterangan>\"]"; exit 1; }
d=$(date +%Y-%m-%d); ext="${img##*.}"
slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g' | cut -c1-40)
dest="progress/$d-$(date +%H%M%S)-$slug.$ext"
cp "$img" "$dest"
python3 -I - "$d" "$title" "$caption" "$dest" <<'PY'
import json,sys
d,t,c,i=sys.argv[1:]
p="progress/progress.json"; a=json.load(open(p))
a.append({"date":d,"title":t,"caption":c,"image":i})
json.dump(a,open(p,"w"),ensure_ascii=False,indent=2)
PY
git add "$dest" progress/progress.json
git commit -q -m "Progress: $title"
git push -q
echo "Pushed $dest — muncul di page dalam ±1 menit."
