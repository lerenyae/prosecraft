#!/bin/bash
cd "$(dirname "$0")"
git remote remove origin 2>/dev/null
git remote add origin https://github.com/lerenyae/prosecraft.git
git branch -M main
echo ""
echo "When prompted, enter:"
echo "  Username: lerenyae"
echo "  Password: a Personal Access Token (NOT your GitHub password)"
echo ""
echo "If you don't have a token, get one at:"
echo "  https://github.com/settings/tokens"
echo "  (select 'repo' scope)"
echo ""
git push -u origin main --force
echo ""
echo "=== Done! ==="
read -n 1
