# 📱 Device Testing Guide - Multi-Model Feature

## Problem
The multi-model selector is not appearing on the Android device, even after clearing cache.

## Root Cause Analysis

The issue can be caused by:
1. **Old APK installed** - APK was built before latest changes
2. **Service worker caching** - Old JavaScript files cached (should be disabled for Android)
3. **Build command error** - Used `npm run build` instead of `npm run build:android`
4. **Incomplete uninstall** - Old app data not fully cleared

## Solution Steps

### Step 1: Verify Latest Code
Check that your local code has the latest changes:
```powershell
cd 7_farm_visit
git status
git log --oneline -5
```

You should see:
- `ChatDrawer.tsx` with model selector dropdown
- `FieldVisit.tsx` with `allVisits` array
- `LLMProvider.ts` with full visit history in prompts

### Step 2: Clean Build (Automated)
Use the automated script:
```powershell
cd apps/web
.\build-and-install.ps1
```

This script:
- ✅ Cleans all build artifacts
- ✅ Builds with `npm run build:android` (disables service worker)
- ✅ Verifies no service worker files
- ✅ Syncs Capacitor
- ✅ Builds APK
- ✅ Clears app data and uninstalls old app
- ✅ Installs new APK

### Step 3: Verify Build Contents
After build, check:
```powershell
# Should NOT exist:
ls dist/sw.js          # Should fail (file not found)
ls dist/registerSW.js  # Should fail (file not found)

# Should exist:
ls dist/index.html     # Should succeed
ls dist/assets/*.js    # Should show JavaScript bundles
```

### Step 4: Manual Verification (If Automated Script Fails)

#### 4a. Clean Everything
```powershell
cd apps/web
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android/app/src/main/assets -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android/app/build -ErrorAction SilentlyContinue
cd android
.\gradlew.bat clean
cd ..
```

#### 4b. Build for Android
```powershell
# CRITICAL: Use build:android, NOT build
npm run build:android
```

#### 4c. Verify Build
```powershell
# Check that service worker files DON'T exist
if (Test-Path "dist\sw.js") {
    Write-Host "ERROR: Service worker found! Wrong build command used."
    exit 1
}

# Check that index.html exists
if (-not (Test-Path "dist\index.html")) {
    Write-Host "ERROR: index.html not found!"
    exit 1
}
```

#### 4d. Sync Capacitor
```powershell
npx cap sync android
```

#### 4e. Build APK
```powershell
cd android
.\gradlew.bat assembleDebug
cd ..
```

#### 4f. Uninstall Old App
```powershell
adb shell pm clear com.farmvisit.app
adb uninstall com.farmvisit.app
```

#### 4g. Install New APK
```powershell
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

### Step 5: Verify on Device

1. **Open the app** on your device
2. **Tap the "Chat" button** (top right)
3. **Look at the top of the chat drawer** - you should see:
   - A dropdown menu with options:
     - 🤖 Auto (Best Available)
     - 📱 Nano (Offline)
     - ☁️ ChatGPT 4o mini
     - 🦙 Llama Small (Offline)
4. **Check browser console** (if using Chrome DevTools):
   - Connect device via USB
   - Open `chrome://inspect`
   - Look for console logs:
     - `[ChatDrawer] Component loaded - Version: v1.0.8-fix`
     - `[ChatDrawer] Model selector available: true`

## Troubleshooting

### Still seeing old interface?

**Check 1: Build Command**
```powershell
# Did you use the correct command?
npm run build:android  # ✅ Correct
npm run build          # ❌ Wrong (includes service worker)
```

**Check 2: Service Worker Files**
```powershell
# These should NOT exist after build:
Test-Path dist/sw.js           # Should return False
Test-Path dist/registerSW.js   # Should return False
```

**Check 3: App Version**
Open the app and check console logs:
- Should see: `[ChatDrawer] Component loaded - Version: v1.0.8-fix`
- If you see old version, the build is outdated

**Check 4: Uninstall Status**
```powershell
# Make sure app is fully uninstalled:
adb shell pm list packages | Select-String "farmvisit"
# Should return nothing (app not installed)

# If app is still installed:
adb uninstall com.farmvisit.app
```

**Check 5: Build Date**
Check the APK build date:
```powershell
# APK should be recent (built today)
Get-Item android\app\build\outputs\apk\debug\app-debug.apk | Select-Object LastWriteTime
```

### Model Selector Not Visible?

**Possible causes:**
1. **CSS issue** - Selector might be hidden by CSS
2. **React not rendering** - Component might not be mounting
3. **JavaScript error** - Check browser console for errors

**Debug steps:**
1. Open Chrome DevTools (connect device via USB)
2. Check console for errors
3. Inspect the chat drawer element
4. Look for `data-testid="model-selector"` attribute
5. Check if `select` element exists in DOM

## Success Criteria

✅ Model selector dropdown is visible in chat drawer  
✅ All 4 model options are available  
✅ Console shows version v1.0.8-fix  
✅ No service worker files in build  
✅ App data was cleared before install  

## Next Steps

Once verified:
1. Test each model selection
2. Verify full visit history is accessible
3. Test photo analysis with multiple visits
4. Commit changes to GitHub









