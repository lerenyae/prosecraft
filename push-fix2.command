#!/bin/bash
cd "$(dirname "$0")"
git add -A
git commit -m "Fix: use React.use() for async params in Next.js 16"
git push origin main
echo ""
echo "=== Fix pushed! Vercel will auto-deploy in ~30s. ==="
read -n 1
