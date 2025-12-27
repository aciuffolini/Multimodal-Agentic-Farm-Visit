# ⚡ Quick Commit Guide

## 🚨 Current Problem

You have **50+ modified files** and **15+ untracked files** that need to be committed. The repository has too many temporary documentation files cluttering the root directory.

## ✅ Quick Fix (5 Steps)

### Step 1: Run Analysis Script
```powershell
cd 7_farm_visit
.\cleanup-and-commit.ps1
```

### Step 2: Commit Claude Code Feature (Most Important)
```powershell
git add apps/web/src/lib/llm/LLMProvider.ts
git add apps/web/src/lib/api.ts
git add apps/web/src/components/ChatDrawer.tsx
git add apps/web/test-server.js
git commit -m "feat(llm): add Claude Code model support"
```

### Step 3: Commit Documentation Cleanup
```powershell
# First, manually move files to docs/ folder (see COMMIT_DIAGNOSIS_AND_ACTION_PLAN.md)
git add docs/
git commit -m "docs: reorganize documentation structure"
```

### Step 4: Commit Configuration
```powershell
git add apps/web/package.json .gitignore
git commit -m "chore(config): update dependencies and gitignore"
```

### Step 5: Push to GitHub
```powershell
git push origin main
```

## 📋 Commit Message Format

Use this format: `<type>(<scope>): <subject>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `chore`: Maintenance

**Examples**:
```bash
feat(llm): add Claude Code model support
fix(deployment): resolve GitHub Pages build failures
docs(readme): update installation instructions
```

## 🎯 Best Practices

1. **One feature per commit** - Don't mix unrelated changes
2. **Small commits** - Easier to review and revert
3. **Clear messages** - Describe what and why
4. **Test before commit** - Don't commit broken code
5. **Use feature branches** - Don't commit directly to main

## 📚 Full Details

See `COMMIT_DIAGNOSIS_AND_ACTION_PLAN.md` for complete analysis and detailed action plan.



