# 🚀 Quick Start - Run Both Servers

## Option 1: Double-Click (Easiest) ✅

**Just double-click:** `start-both.bat`

This will:
- Start dev server (port 5173) in one window
- Start test server (port 3000) in another window
- Open browser to http://localhost:5173

---

## Option 2: Manual (Two Terminals)

**Terminal 1 - Dev Server:**
```bash
cd apps/web
npm run dev
```

**Terminal 2 - Test Server:**
```bash
cd apps/web
node test-server.js
```

---

## Option 3: PowerShell Script

```powershell
cd apps/web
.\start-both.bat
```

---

## ✅ Verify Both Are Running

1. **Dev Server:** http://localhost:5173 (should show app)
2. **Test Server:** http://localhost:3000/health (should show `{"ok":true}`)

---

## 🐛 Troubleshooting

**Port already in use?**
- Kill process on port 5173 or 3000
- Or change ports in `vite.config.ts` and `test-server.js`

**Servers not starting?**
- Check Node.js is installed: `node --version`
- Check you're in `apps/web` directory
- Check `package.json` exists

---

## 💡 Tip

Keep both servers running while developing. The dev server auto-reloads on code changes!



