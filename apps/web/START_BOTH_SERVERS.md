# 🚀 Quick Fix: Start Both Servers

## ✅ Root Cause Found

**Diagnostic Result:** Test server is NOT running (Condition 1 failed)

This is why you're seeing proxy errors. The solution is simple:

---

## 🎯 Solution: Start Both Servers

### Windows PowerShell (2 Terminals)

**Terminal 1 - Dev Server:**
```powershell
cd apps/web
npm run dev
```

**Terminal 2 - Test Server (API):**
```powershell
cd apps/web
node test-server.js
```

### Windows Batch File (Easier)

Create `start-both.bat`:
```batch
@echo off
echo Starting Farm Visit App Servers...
echo.

start "Dev Server" cmd /k "cd apps/web && npm run dev"
timeout /t 3 /nobreak >nul
start "Test Server" cmd /k "cd apps/web && node test-server.js"

echo.
echo Both servers starting in separate windows...
echo - Dev Server: http://localhost:5173
echo - Test Server: http://localhost:3000
echo.
pause
```

**Run:** Double-click `start-both.bat`

---

## ✅ Verify It's Working

After starting both servers, run diagnostic:
```powershell
cd apps/web
node test-proxy-conditions.js
```

**Expected:** All 4 conditions should pass ✅

---

## 📊 Diagnostic Summary

| Condition | Status | Result |
|-----------|--------|--------|
| 1. Test Server Running | ❌ | **ROOT CAUSE** - Not running |
| 2. Port Conflict | ✅ | Port 3000 available |
| 3. Network/Firewall | ✅ | No blocking |
| 4. Proxy Config | ✅ | Configuration correct |

**Conclusion:** Just start the test server and errors will disappear!

---

## 💡 Why This Works

- ✅ Vite dev server (port 5173) - handles frontend
- ✅ Test server (port 3000) - handles `/api/*` requests
- ✅ Proxy forwards `/api/*` → `http://localhost:3000`
- ✅ No server on 3000 = ECONNREFUSED errors
- ✅ Server on 3000 = No errors!






