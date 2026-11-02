#!/bin/zsh
# Upload After Effects files to GitHub if they changed.
# Usage: tools/sync-ae.sh
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.local/bin"
cd "$(dirname "$0")/.." || exit 1
git add ae/*.aep ae/build.jsx renders/*.mp4 2>/dev/null
if git diff --cached --quiet; then echo "Tidak ada perubahan file AE."; exit 0; fi
files=$(git diff --cached --name-only | tr '\n' ' ')
git commit -q -m "AE update $(date '+%Y-%m-%d %H:%M'): $files"
git push -q && echo "Ter-upload: $files"
