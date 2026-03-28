#!/bin/bash
# Self-contained script to push ProseCraft to GitHub
cd "$(dirname "$0")"

echo "=== Pushing ProseCraft to GitHub ==="

# Configure git credential helper to use macOS Keychain
git config --global credential.helper osxkeychain

# Configure git
git config user.email "lerenyae.watkins@gmail.com"
git config user.name "LeRenyae"

# Re-init if needed (idempotent)
git init
git add -A
git commit -m "Initial commit: ProseCraft AI writing studio" --allow-empty

# Set remote and push
git remote remove origin 2>/dev/null
git remote add origin https://github.com/lerenyae/prosecraft.git
git branch -M main

echo ""
echo "Pushing to GitHub... (if a browser window opens, please authorize)"
echo ""

# Try push - if it fails, try using GitHub CLI
if ! git push -u origin main --force 2>&1; then
  echo ""
  echo "HTTPS push needs auth. Trying GitHub CLI..."
  if command -v gh &> /dev/null; then
    gh auth login --web
    git push -u origin main --force
  else
    echo ""
    echo "Please enter your GitHub username and Personal Access Token when prompted."
    echo "(Get a token at: https://github.com/settings/tokens)"
    git push -u origin main --force
  fi
fi

echo ""
echo "=== Done! Code pushed to GitHub. ==="
echo "Press any key to close..."
read -n 1
