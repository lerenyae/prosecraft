#!/bin/bash
cd "$(dirname "$0")"
git config --global credential.helper osxkeychain
git add -A
git commit -m "Fix: localStorage wrappers were recursively calling themselves instead of localStorage"
git push origin main
echo ""
echo "=== Fix pushed! Vercel will auto-deploy. ==="
read -n 1
