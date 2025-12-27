# 🚀 Quick Start Guide

## For Cloud Models (OpenAI, Anthropic)

### Option 1: Double-Click Script (Easiest)
1. Double-click: `start-both.bat`
   - Starts both dev server AND test server
   - Opens browser automatically

### Option 2: Manual Start
1. Open terminal in `apps/web` folder
2. Run: `node test-server.js`
3. Wait for: "✅ Test Server Running on port 3000"
4. Keep terminal open

### Option 3: PowerShell Script
```powershell
cd apps/web
.\START_SERVER.ps1
```

---

## For Local Models (Offline - No Server Needed!)

### Gemini Nano (Android 14+)
- Works completely offline
- No server needed
- No API key needed
- Just select "📱 Nano" in chat

### Llama Local (Android 7+)
- Works completely offline
- No server needed
- No API key needed
- Just select "🦙 Llama Small" in chat

---

## Troubleshooting

### "API Server Not Running" Error
- **For Cloud models**: Start test server (see above)
- **For Local models**: No server needed! Just select Nano or Llama

### "API Key Required" Error
- Click 🔑 button in chat
- Enter your OpenAI or Anthropic API key
- Only needed for Cloud models

### "Offline Mode" Message
- You're offline
- Use local models (Nano/Llama) - they work offline!
- Or connect to internet for Cloud models

---

## Quick Test

1. **Test Local (if on Android)**:
   - Select "📱 Nano" or "🦙 Llama Small"
   - Chat should work offline

2. **Test Cloud**:
   - Start server: `node test-server.js`
   - Set API key: Click 🔑 button
   - Select "☁️ ChatGPT" or "🤖 Claude Code"
   - Chat should work

---

## Summary

| Model | Server Needed? | API Key Needed? | Works Offline? |
|-------|---------------|------------------|----------------|
| Nano | ❌ No | ❌ No | ✅ Yes |
| Llama | ❌ No | ❌ No | ✅ Yes |
| ChatGPT | ✅ Yes (dev) | ✅ Yes | ❌ No |
| Claude | ✅ Yes (dev) | ✅ Yes | ❌ No |



