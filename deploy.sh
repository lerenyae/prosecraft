#!/bin/bash
echo "Installing dependencies..."
npm install
echo ""
echo "Deploying to Vercel..."
echo "Follow the prompts - hit Enter for all defaults."
echo ""
npx vercel
echo ""
echo "Now setting your API key..."
echo "Paste your Anthropic API key when prompted."
echo "Select: Production, Preview, and Development (all three)."
echo ""
npx vercel env add ANTHROPIC_API_KEY
echo ""
echo "Redeploying to production with API key..."
npx vercel --prod
echo ""
echo "Done! Your app is live."
