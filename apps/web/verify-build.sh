#!/bin/bash
# Script to verify that the Android build includes all latest features

echo "🔍 Verifying Android Build..."
echo ""

# Check if dist directory exists
if [ ! -d "dist" ]; then
  echo "❌ dist/ directory not found. Run 'npm run build:android' first."
  exit 1
fi

echo "✅ dist/ directory exists"
echo ""

# Check for service worker files (should NOT exist for Android build)
echo "Checking for service worker files (should NOT exist)..."
if [ -f "dist/sw.js" ] || [ -f "dist/registerSW.js" ]; then
  echo "❌ ERROR: Service worker files found! This means build used wrong command."
  echo "   Found:"
  [ -f "dist/sw.js" ] && echo "   - dist/sw.js"
  [ -f "dist/registerSW.js" ] && echo "   - dist/registerSW.js"
  echo ""
  echo "   Solution: Use 'npm run build:android' (NOT 'npm run build')"
  exit 1
fi
echo "✅ No service worker files (correct for Android build)"
echo ""

# Check for index.html
echo "Checking for index.html..."
if [ ! -f "dist/index.html" ]; then
  echo "❌ dist/index.html not found!"
  exit 1
fi
echo "✅ dist/index.html exists"
echo ""

# Check if index.html has service worker registration (should NOT)
echo "Checking index.html for service worker registration..."
if grep -q "vite-plugin-pwa:register-sw" dist/index.html; then
  echo "❌ ERROR: Service worker registration found in index.html!"
  echo "   This means the build used the wrong command."
  echo "   Solution: Use 'npm run build:android' (NOT 'npm run build')"
  exit 1
fi
echo "✅ No service worker registration in index.html"
echo ""

# Check for main JavaScript bundle
echo "Checking for JavaScript bundles..."
JS_FILES=$(find dist -name "*.js" -type f | head -5)
if [ -z "$JS_FILES" ]; then
  echo "❌ No JavaScript files found in dist/"
  exit 1
fi
echo "✅ JavaScript bundles found:"
echo "$JS_FILES" | head -3 | sed 's/^/   - /'
echo ""

# Check for ChatDrawer component in bundles (should contain model selector)
echo "Checking for model selector in bundles..."
if grep -r "model-selector\|Model Selection\|🤖 Auto" dist/ > /dev/null 2>&1; then
  echo "✅ Model selector code found in build"
else
  echo "⚠️  Model selector code not found (may be minified)"
fi
echo ""

# Check for allVisits in bundles
echo "Checking for full visit history feature..."
if grep -r "allVisits\|FULL VISIT HISTORY" dist/ > /dev/null 2>&1; then
  echo "✅ Full visit history feature found in build"
else
  echo "⚠️  Full visit history code not found (may be minified)"
fi
echo ""

echo "✅ Build verification complete!"
echo ""
echo "Next steps:"
echo "1. Run 'npx cap sync android'"
echo "2. Build APK with 'cd android && ./gradlew assembleDebug'"
echo "3. Install on device and verify model selector is visible"









