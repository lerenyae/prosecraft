#!/bin/bash
# Self-contained script to push ProseCraft to GitHub
cd "$(dirname "$0")"

echo "=== Pushing ProseCraft to GitHub ==="

# Configure git
git init
git config user.email "lerenyae.watkins@gmail.com"
git config user.name "LeRenyae"

# Add all files
git add -A

# Commit
git commit -m "Initial commit: ProseCraft AI writing studio"

# Set remote and push
git remote add origin https://github.com/lerenyae/prosecraft.git
git branch -M main
git push -u origin main --force

echo ""
echo "=== Done! Code pushed to GitHub. ==="
echo "Press any key to close..."
read -n 1
