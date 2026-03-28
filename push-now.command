#!/bin/bash
cd "$(dirname "$0")"
git config --global credential.helper osxkeychain
git remote remove origin 2>/dev/null
git remote add origin https://github.com/lerenyae/prosecraft.git
git branch -M main
git push -u origin main --force
echo ""
echo "=== Push complete! ==="
echo "Press any key to close..."
read -n 1
