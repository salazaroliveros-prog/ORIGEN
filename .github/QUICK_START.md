# ORIGEN ERP - Quick Deployment Guide (5 Minutes)

## ⚡ For Developers

### Before Your First Push

**Step 1: Local Testing (5 min)**

```bash
# Install & test
npm ci
npm run lint:fix
npm run format
npm run build
npm run start
# ✅ Check http://localhost:3000 works
```

**Step 2: Commit & Push**

```bash
git add .
git commit -m "feat: add new feature"
git push origin main  # or develop
```

**Step 3: Monitor Deployment**

- Go to: https://github.com/salazaroliveros-prog/ORIGEN/actions
- Watch workflow run (takes ~40-60 min)
- Check if all jobs pass ✅

**Step 4: Verify Production**

- Visit: https://origen-one-kohl.vercel.app
- Test your feature works

---

## 🔧 For DevOps / Deployment Engineers

### Setup (First Time Only)

**Step 1: Configure Secrets** (5 min)

1. Go to GitHub → Settings → Secrets and variables → Actions
2. Add all secrets from `DEPLOYMENT_CHECKLIST.md`

**Step 2: Test Locally** (10 min)

```bash
npm ci
npm run build
npm run start
# Should work without errors
```

**Step 3: Deploy to Staging** (Automated)

- Push to `develop` branch
- Workflow triggers automatically
- Check: https://origen-staging.vercel.app (after 30 min)

**Step 4: Deploy to Production** (Automated)

- Push to `main` branch
- Workflow triggers automatically
- Check: https://origen-one-kohl.vercel.app (after 30 min)

---

## 🆘 If Deployment Fails

### Quick Fixes

**Build Error?**

```bash
npm ci
npm run lint:fix
npm run build
git add . && git commit -m "fix: resolve build errors"
git push
```

**Missing Secrets?**

1. Check GitHub Secrets page
2. Add missing variables
3. Trigger new deployment

**Health Check Failed?**

1. Check Vercel logs
2. Verify Firebase credentials
3. Test locally first

---

## 📊 Deployment Status

| Environment | URL                                | Branch  | Status |
| ----------- | ---------------------------------- | ------- | ------ |
| Production  | https://origen-one-kohl.vercel.app | main    | ✅     |
| Staging     | https://origen-staging.vercel.app  | develop | ✅     |
| Local       | http://localhost:3000              | any     | 🔧     |

---

## 🚀 Common Commands

```bash
# Local development
npm run dev

# Testing before push
npm run lint
npm run type-check
npm run test
npm run build

# Fix issues
npm run lint:fix
npm run format

# Production build
npm run build
npm run start

# E2E testing
npm run test:e2e

# Firebase emulators
npm run emulators
```

---

## ⏱️ Timeline

After pushing to `main`:

- **0-5 min:** GitHub Actions starts
- **5-10 min:** Lint & Security checks
- **10-25 min:** Build & Tests
- **25-30 min:** Vercel deployment
- **30-35 min:** Health checks
- **35-40 min:** Complete ✅

**Total: ~40 minutes**

---

## 📝 Workflow Files

Located in `.github/workflows/`:

- `main.yml` - CI/CD pipeline (lint, build, deploy)
- `ci.yml` - Quick validation (lint, build, test)
- `visual-tests.yml` - Visual regression tests

---

## 🔗 Links

- **GitHub Repo:** https://github.com/salazaroliveros-prog/ORIGEN
- **GitHub Actions:** https://github.com/salazaroliveros-prog/ORIGEN/actions
- **Vercel Dashboard:** https://vercel.com
- **Full Guide:** `.github/DEPLOYMENT_GUIDE.md`
- **Troubleshooting:** `.github/VERCEL_TROUBLESHOOTING.md`
- **Checklist:** `.github/DEPLOYMENT_CHECKLIST.md`

---

## ✅ Final Checklist

Before pushing to main:

- [ ] Code lints locally (`npm run lint`)
- [ ] TypeScript passes (`npm run type-check`)
- [ ] Tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors
- [ ] Features work as expected

**Push when all ✅**

---

**Having issues?** Check `.github/VERCEL_TROUBLESHOOTING.md` or `.github/DEPLOYMENT_GUIDE.md`
