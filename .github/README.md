# .github - GitHub Configuration & Documentation

This directory contains GitHub configuration, workflows, and deployment documentation for ORIGEN ERP Guatemala.

## 📁 Contents

### Workflows (`workflows/`)

#### `main.yml` - Full CI/CD Pipeline

- **Purpose:** Complete continuous integration and deployment pipeline
- **Trigger:** Push to `main` or `develop` branches
- **Jobs:** 8 jobs (lint, security, build, test, deploy, monitor)
- **Duration:** ~40-60 minutes
- **Key Features:**
  - Automatic deployment to Vercel
  - Health checks after deployment
  - Slack notifications
  - Post-deployment monitoring
  - Artifact storage

**When to Use:** Main deployment pipeline for production and staging

#### `ci.yml` - Quick Validation

- **Purpose:** Fast validation of code quality and builds
- **Trigger:** Push to any branch, PRs
- **Jobs:** Single comprehensive validation job
- **Duration:** ~20-30 minutes
- **Key Features:**
  - Lint checking
  - Type validation
  - Build verification
  - E2E testing
  - Test artifacts

**When to Use:** Quick feedback during development

#### `visual-tests.yml` - Visual Regression Testing

- **Purpose:** Detect visual changes in UI components
- **Trigger:** Push to `main` or `develop`
- **Jobs:** Visual testing with Playwright
- **Duration:** ~15-20 minutes
- **Key Features:**
  - Screenshot comparison
  - Cross-browser testing
  - Visual report generation
  - PR comments with results

**When to Use:** Ensuring UI consistency across deployments

---

### Documentation

#### 📘 `QUICK_START.md` - 5-Minute Setup Guide

**For:** Everyone  
**Length:** 3.5 KB  
**Topics:**

- Quick local testing (5 min)
- Deployment steps (3 steps)
- Quick fixes for common issues
- Expected timeline
- Useful links

**Use this:** When you want a quick overview

---

#### 📗 `DEPLOYMENT_GUIDE.md` - Complete Deployment Guide

**For:** DevOps engineers and senior developers  
**Length:** 14 KB  
**Topics:**

- Full architecture overview
- GitHub Secrets setup (step-by-step)
- Workflow execution process (5 jobs explained)
- Deployment checklist
- Monitoring procedures
- Performance metrics
- Security best practices
- Post-deployment verification
- Support resources

**Use this:** For complete understanding of the pipeline

---

#### 📕 `DEPLOYMENT_CHECKLIST.md` - Pre/Post Deployment Checklist

**For:** Deployment specialists  
**Length:** 7 KB  
**Topics:**

- All required GitHub Secrets (documented)
- Pre-deployment code quality checklist
- Pre-deployment testing checklist
- Pre-deployment security checklist
- Pre-deployment performance checklist
- Deployment steps
- Post-deployment verification
- Common deployment issues & solutions
- Verification commands
- Rollback procedure
- Monitoring links

**Use this:** Before and after deployments

---

#### 🔧 `VERCEL_TROUBLESHOOTING.md` - Troubleshooting Guide

**For:** Developers and DevOps  
**Length:** 9 KB  
**Topics:**

- 10 common deployment errors with solutions:
  1. Build Error: "Cannot find module..."
  2. Build Error: "Cannot find required env variables"
  3. Build Error: "ENOSP: no space left on device"
  4. Build Warning: "ESLint errors detected"
  5. Deployment Error: "Health check failed"
  6. Deployment Error: "Build timeout"
  7. Deployment Error: "CORS error from API"
  8. Deployment Error: "Database connection failed"
  9. Deployment Error: "Memory limit exceeded"
  10. Deployment Error: "Firebase initialization failed"
- Diagnostic tools section
- Verification checklist
- Quick fix recipes

**Use this:** When something goes wrong

---

#### 📄 `IMPLEMENTATION_SUMMARY.md` - What Was Done

**For:** Project stakeholders  
**Length:** 12 KB  
**Topics:**

- Completed tasks summary
- Updated workflows
- Enhanced Vercel configuration
- Created documentation
- Deployment process (automated)
- Security improvements
- Required secrets checklist
- Final verification checklist
- Available commands
- Next steps
- Expected results

**Use this:** To understand what was implemented

---

### Scripts (`scripts/`)

#### `validate-deployment.sh` - Pre-Deployment Validation

**Purpose:** Automated validation before deployment  
**Check Count:** 14 critical checks  
**Usage:**

```bash
./scripts/validate-deployment.sh
```

**Checks:**

1. Node.js 26.x installed
2. package-lock.json exists
3. .env.vercel.production exists
4. .env.example exists
5. vercel.json exists
6. Next.js config exists
7. GitHub workflows exist
8. Source code exists
9. Build script in package.json
10. TypeScript configured
11. ESLint configured
12. Prettier configured
13. .gitignore proper
14. Firebase configuration

---

## 🚀 Quick Reference

### For Developers

**Before Pushing:**

1. Read: `QUICK_START.md`
2. Run locally: `npm ci && npm run build`
3. Commit and push
4. Monitor: https://github.com/salazaroliveros-prog/ORIGEN/actions

**When Something Breaks:**

1. Check: `VERCEL_TROUBLESHOOTING.md`
2. Find your error type
3. Apply solution
4. Retry deployment

### For DevOps

**Initial Setup:**

1. Read: `DEPLOYMENT_GUIDE.md`
2. Configure: GitHub Secrets from `DEPLOYMENT_CHECKLIST.md`
3. Verify: Run `scripts/validate-deployment.sh`
4. Test: Push to develop branch first

**Before Production Deployment:**

1. Use: `DEPLOYMENT_CHECKLIST.md`
2. Run: Pre-deployment checks
3. Monitor: GitHub Actions
4. Verify: Post-deployment checks

**Troubleshooting:**

1. Check: `VERCEL_TROUBLESHOOTING.md`
2. Apply: Recommended solution
3. Monitor: Next deployment
4. Document: What fixed it

---

## 📊 Deployment Workflow

```
Push to main/develop
       ↓
GitHub Actions Triggers
       ↓
Lint & Quality Check (5 min)
       ↓
Security Scan (3 min)
       ↓
Build & Test (15 min)
       ├─ npm run build
       ├─ npm run test
       ├─ npm run test:firebase
       └─ npm run test:e2e
       ↓
All Pass? → Deploy to Vercel (5 min)
       ├─ Build on Vercel
       ├─ Wait for build
       └─ Deploy to production
       ↓
Health Checks (2 min)
       ├─ Application responds
       ├─ Security headers present
       └─ All endpoints working
       ↓
Monitoring (1 min)
       ├─ 60-second uptime check
       └─ Report results
       ↓
Notifications
       ├─ Slack message
       └─ GitHub status ✅

Total Time: ~40 minutes
Result: Live on production ✅
```

---

## 🔐 Secrets & Security

### Required GitHub Secrets (14 total)

**Vercel (3):**

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

**Firebase (8):**

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

**Application (3):**

- `NEXT_PUBLIC_APP_URL`
- `PRIMARY_ADMIN_EMAIL`
- `GEMINI_API_KEY`

**Optional (1):**

- `SLACK_WEBHOOK_URL`

---

## 📈 Performance Metrics

| Phase          | Expected Time |
| -------------- | ------------- |
| Lint & Quality | 2-5 min       |
| Security Scan  | 1-3 min       |
| Build          | 10-15 min     |
| Tests          | 5-10 min      |
| Vercel Deploy  | 2-5 min       |
| Health Checks  | 1-2 min       |
| **Total**      | **~40 min**   |

(First deployment may be slower due to cold start)

---

## 🆘 Getting Help

| Issue             | Resource                         |
| ----------------- | -------------------------------- |
| Quick setup       | `QUICK_START.md`                 |
| Full guide        | `DEPLOYMENT_GUIDE.md`            |
| Deployment failed | `VERCEL_TROUBLESHOOTING.md`      |
| Need checklist    | `DEPLOYMENT_CHECKLIST.md`        |
| Understand setup  | `IMPLEMENTATION_SUMMARY.md`      |
| Validate config   | `scripts/validate-deployment.sh` |

---

## 📝 File Organization

```
.github/
├── workflows/
│   ├── main.yml                 # Main CI/CD pipeline
│   ├── ci.yml                   # Quick validation
│   └── visual-tests.yml         # Visual regression tests
├── QUICK_START.md              # 5-minute guide ⚡
├── DEPLOYMENT_GUIDE.md         # Complete guide 📗
├── DEPLOYMENT_CHECKLIST.md     # Pre/post checks 📕
├── VERCEL_TROUBLESHOOTING.md   # Troubleshooting 🔧
├── IMPLEMENTATION_SUMMARY.md   # What was done 📄
├── README.md                   # This file 📖
├── agents/                      # AI agents (optional)
├── skills/                      # GitHub Actions skills
└── ...other files
```

---

## ✅ Maintenance

### Weekly

- [ ] Check workflow runs
- [ ] Monitor deployment times
- [ ] Review error logs

### Monthly

- [ ] Update dependencies
- [ ] Run security audit
- [ ] Review and update docs

### Quarterly

- [ ] Performance review
- [ ] Security audit
- [ ] Update CI/CD process
- [ ] Update documentation

---

## 🔗 External Resources

- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Firebase Docs:** https://firebase.google.com/docs

---

## 📞 Contact

For issues or questions:

1. Check the relevant documentation file
2. Run validation script
3. Create GitHub issue if needed
4. Contact DevOps team

---

**Last Updated:** 2024  
**Status:** ✅ Production Ready  
**Maintained by:** DevOps Team

---

## Quick Links

- 📘 Start here: `QUICK_START.md`
- 📗 Full guide: `DEPLOYMENT_GUIDE.md`
- 🔧 Troubleshooting: `VERCEL_TROUBLESHOOTING.md`
- 📋 Checklist: `DEPLOYMENT_CHECKLIST.md`
- 📊 Summary: `IMPLEMENTATION_SUMMARY.md`
- ✅ Validate: `scripts/validate-deployment.sh`
