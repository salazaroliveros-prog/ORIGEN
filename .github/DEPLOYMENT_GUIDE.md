# ORIGEN ERP - Complete Deployment & CI/CD Guide

## 📋 Overview

This guide covers the complete CI/CD pipeline and deployment process for ORIGEN ERP Guatemala application.

**Repository:** https://github.com/salazaroliveros-prog/ORIGEN
**Production URL:** https://origen-one-kohl.vercel.app
**Deployment Platform:** Vercel
**CI/CD Platform:** GitHub Actions

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Repository (main)                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                     ┌─────────▼──────────┐
                     │ GitHub Actions CI  │
                     └────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
      ┌─────▼──────┐    ┌──────▼─────┐    ┌──────▼──────┐
      │   Lint &   │    │  Security  │    │   Build    │
      │   Quality  │    │    Scan    │    │   & Test   │
      └────────────┘    └────────────┘    └────────────┘
            │                  │                  │
            └──────────────────┼──────────────────┘
                               │
                        ┌──────▼─────────┐
                        │ All Checks OK? │
                        └────────┬───────┘
                                 │
                    ┌────────────┴────────────┐
                    │                        │
            ┌───────▼────────┐      ┌────────▼──────┐
            │  Deploy to     │      │  Deploy to    │
            │  Staging       │      │  Production   │
            │  (develop)     │      │  (main)       │
            └────────────────┘      └───────┬───────┘
                                            │
                                    ┌───────▼────────┐
                                    │ Vercel CDN     │
                                    │ Production App │
                                    └────────────────┘
```

---

## 🔐 GitHub Secrets Configuration

### Step 1: Generate Vercel Token

1. Go to: https://vercel.com/account/tokens
2. Click "Create" → Enter name → Select "Full Account" scope
3. Copy token (you'll only see it once!)
4. Store as `VERCEL_TOKEN` in GitHub Secrets

### Step 2: Get Vercel IDs

1. Go to: https://vercel.com/account/stores
2. Find your organization ID → Copy to `VERCEL_ORG_ID`
3. Go to your project dashboard
4. Project ID is in URL or settings → Copy to `VERCEL_PROJECT_ID`

### Step 3: Add Secrets to GitHub

1. Go to: GitHub → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add all required secrets:

| Secret Name                                | Value                                     | Source                   |
| ------------------------------------------ | ----------------------------------------- | ------------------------ |
| `VERCEL_TOKEN`                             | Your Vercel token                         | Vercel account           |
| `VERCEL_ORG_ID`                            | Vercel org ID                             | Vercel dashboard         |
| `VERCEL_PROJECT_ID`                        | Project ID                                | Vercel project           |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | origen-erp-guatemala                      | Firebase console         |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Your Firebase key                         | Firebase settings        |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | origen-erp-guatemala.firebaseapp.com      | Firebase                 |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | 1:893831571998:web:4e38903eeb0dff05011c0f | Firebase                 |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | origen-erp-guatemala.firebasestorage.app  | Firebase                 |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | 893831571998                              | Firebase                 |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`      | G-EBE081ELJT                              | Firebase                 |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY`           | Your VAPID key                            | Firebase Cloud Messaging |
| `NEXT_PUBLIC_FIRESTORE_DATABASE_ID`        | (default)                                 | Firebase                 |
| `NEXT_PUBLIC_APP_URL`                      | https://origen-one-kohl.vercel.app        | Your domain              |
| `PRIMARY_ADMIN_EMAIL`                      | salazaroliveros@gmail.com                 | Admin email              |
| `GEMINI_API_KEY`                           | Your Gemini key                           | Google AI Studio         |
| `SLACK_WEBHOOK_URL`                        | Your webhook (optional)                   | Slack API                |

---

## 🚀 Workflow Execution Process

### 1. Trigger Conditions

Workflows are triggered by:

- **Push to `main` branch** → Production deployment
- **Push to `develop` branch** → Staging deployment
- **Pull requests to `main`/`develop`** → Testing only (no deployment)

### 2. GitHub Actions Pipeline

#### Job 1: Lint & Code Quality (5 min)

```bash
npm ci --no-audit --no-fund
npm run lint           # ESLint checks
npm run type-check     # TypeScript validation
npm run format:check   # Prettier formatting
```

**Failure Actions:** ❌ Stop pipeline

#### Job 2: Security Scan (3 min)

```bash
npm audit --production --audit-level=high
```

**Failure Actions:** ⚠️ Warning (can continue)

#### Job 3: Build & Test (15 min)

```bash
npm ci --no-audit --no-fund
npm run build                  # Next.js build
npm run test                   # Unit tests
npm run test:firebase          # Firebase security tests
npm run test:e2e               # E2E tests (Chromium)
```

**Failure Actions:** ❌ Stop pipeline

#### Job 4: Deploy to Staging (5 min)

_Only if `develop` branch_

```
Deploy → Wait 30s → Health Checks → Slack Notification
```

#### Job 5: Deploy to Production (5 min)

_Only if `main` branch_

```
Deploy → Wait 30s → Health Checks → Security Headers Check → Monitoring
```

---

## 📝 Deployment Checklist

### Before Pushing to GitHub

```bash
# 1. Update dependencies (if needed)
npm ci

# 2. Fix linting issues
npm run lint:fix

# 3. Format code
npm run format

# 4. Run all tests locally
npm run test
npm run test:firebase
npm run test:e2e -- --project=chromium

# 5. Build locally
npm run build

# 6. Test production build
npm run start
# Navigate to http://localhost:3000 and test features

# 7. Check git status
git status

# 8. Commit changes
git add .
git commit -m "feat: your feature description"

# 9. Push to GitHub
git push origin main  # or develop for staging
```

### Automatic Checks (GitHub Actions)

The following checks happen automatically after push:

- ✅ Code linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Code formatting (Prettier)
- ✅ Security scanning (npm audit)
- ✅ Unit tests (Vitest)
- ✅ Firebase security tests
- ✅ E2E tests (Playwright)
- ✅ Build validation
- ✅ Vercel deployment
- ✅ Health checks
- ✅ Security headers verification

---

## 🔍 Monitoring Deployments

### GitHub Actions Dashboard

1. Go to: https://github.com/salazaroliveros-prog/ORIGEN/actions
2. View workflow runs
3. Click run to see detailed logs
4. Check job status (✅ passed, ❌ failed, ⚠️ warning)

### Vercel Dashboard

1. Go to: https://vercel.com
2. Select ORIGEN project
3. View deployments history
4. Check deployment status and logs

### Application Health

1. **Production:** https://origen-one-kohl.vercel.app
2. Check homepage loads
3. Test main features
4. Check browser console for errors
5. Verify database connectivity

---

## 🐛 Troubleshooting Common Issues

### Issue: Build Fails with "Module not found"

**Solution:**

```bash
# 1. Clear everything
rm -rf node_modules .next
npm ci

# 2. Check imports are correct
# Fix any import paths

# 3. Rebuild locally
npm run build

# 4. Push fix
git add . && git commit -m "fix: resolve import error"
git push
```

### Issue: "Cannot find required env variable"

**Solution:**

1. Go to GitHub Secrets
2. Verify all variables are set
3. Check variable names exactly match workflow file
4. Push empty commit to retrigger:
   ```bash
   git commit --allow-empty -m "trigger: redeploy"
   git push
   ```

### Issue: Health Check Failed

**Solution:**

1. Check Vercel deployment logs
2. Verify Firebase credentials
3. Check environment variables in Vercel
4. Test locally: `npm run build && npm run start`

### Issue: Deployment Takes Too Long

**Solution:**

```bash
# 1. Optimize dependencies
npm prune

# 2. Clear Next.js cache
rm -rf .next

# 3. Clear Vercel cache
# Go to Vercel → Settings → Git → Clear Build Cache

# 4. Rebuild
npm ci && npm run build
```

---

## 📊 Vercel Configuration Details

### vercel.json Breakdown

```json
{
  "version": 2, // Vercel Platforms API version
  "buildCommand": "npm run build", // Build command
  "installCommand": "npm install", // Installation command
  "framework": "nextjs", // Framework (optimized for Next.js)
  "nodeVersion": "26.x", // Node.js version
  "regions": ["iad1"], // Deploy region (US East)

  "headers": [
    // HTTP headers for all responses
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" }, // Prevent clickjacking
        { "key": "X-Content-Type-Options", "value": "nosniff" }, // Prevent MIME sniffing
        { "key": "Referrer-Policy", "value": "strict-origin" }, // Privacy
        {
          "key": "Strict-Transport-Security", // Force HTTPS
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    },
    {
      "source": "/_next/static/(.*)", // Cache static assets
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=86400, immutable" }]
    }
  ],

  "cleanUrls": true, // Remove .html extensions
  "trailingSlash": false // No trailing slashes
}
```

---

## 🔄 Deployment Flow Examples

### Example 1: Push to `main` (Production Deployment)

```
1. Developer pushes to main
   ↓
2. GitHub Actions triggers
   ├─ Lint & Quality (5 min)
   ├─ Security Scan (3 min)
   ├─ Build & Test (15 min)
   └─ All pass ✅
   ↓
3. Deploy to Production
   ├─ Build on Vercel (5 min)
   ├─ Wait 30 seconds
   ├─ Run health checks
   ├─ Verify security headers
   └─ All pass ✅
   ↓
4. Post-Deployment Monitoring
   ├─ Monitor for 60 seconds
   ├─ Check every 10 seconds
   └─ All healthy ✅
   ↓
5. Notifications
   ├─ Slack notification sent
   └─ GitHub status shows ✅
   ↓
6. Live on https://origen-one-kohl.vercel.app
```

### Example 2: Push to `develop` (Staging Deployment)

```
1. Developer pushes to develop
   ↓
2. GitHub Actions triggers
   ├─ Lint & Quality (5 min)
   ├─ Security Scan (3 min)
   ├─ Build & Test (15 min)
   └─ All pass ✅
   ↓
3. Deploy to Staging
   ├─ Build on Vercel (5 min)
   ├─ Wait 30 seconds
   ├─ Run health checks
   └─ All pass ✅
   ↓
4. Notifications
   ├─ Slack notification sent
   └─ GitHub status shows ✅
   ↓
5. Available at https://origen-staging.vercel.app
```

### Example 3: Pull Request (Testing Only)

```
1. Developer creates PR to main
   ↓
2. GitHub Actions triggers
   ├─ Lint & Quality (5 min)
   ├─ Security Scan (3 min)
   ├─ Build & Test (15 min)
   └─ Results shown on PR
   ↓
3. No deployment
   ↓
4. Developer can:
   ├─ Fix issues and push again
   └─ Or merge to main when all pass
```

---

## 📈 Performance Metrics

### Expected Build Times

- **Lint & Quality:** 2-5 minutes
- **Security Scan:** 1-3 minutes
- **Build:** 10-15 minutes
- **Tests:** 5-10 minutes
- **E2E Tests:** 5-15 minutes
- **Vercel Deployment:** 2-5 minutes
- **Health Checks:** 1-2 minutes

**Total:** ~40-60 minutes (first time longer)

### Expected Build Size

- **Next.js build:** ~200-300 MB
- **Function size:** ~50-100 MB
- **Vercel optimization:** Automatic compression

---

## 🔐 Security Best Practices

1. **Secrets Management**
   - Never commit secrets to git
   - Use GitHub Secrets for sensitive data
   - Rotate tokens regularly

2. **Environment Variables**
   - Public variables: `NEXT_PUBLIC_*`
   - Private variables: `GEMINI_API_KEY`, `PERSONAL_ACCESS_TOKEN`
   - Firebase keys: Restricted by domain

3. **Security Headers**
   - Configured in `vercel.json`
   - Prevents clickjacking (X-Frame-Options)
   - Forces HTTPS (Strict-Transport-Security)
   - Prevents MIME sniffing (X-Content-Type-Options)

4. **Deployment Protection**
   - Main branch protected (requires PR review)
   - Automatic checks before deployment
   - Deployment environment protection in Vercel

---

## ✅ Post-Deployment Verification

After each deployment, verify:

```bash
# 1. Application loads
curl -I https://origen-one-kohl.vercel.app

# 2. Security headers present
curl -I https://origen-one-kohl.vercel.app | grep -E "X-Frame|HSTS"

# 3. API endpoints work
curl https://origen-one-kohl.vercel.app/api/health

# 4. Response time acceptable
time curl https://origen-one-kohl.vercel.app > /dev/null

# 5. SSL certificate valid
openssl s_client -connect origen-one-kohl.vercel.app:443 -servername origen-one-kohl.vercel.app
```

---

## 📞 Support Resources

- **GitHub Issues:** https://github.com/salazaroliveros-prog/ORIGEN/issues
- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Firebase Docs:** https://firebase.google.com/docs
- **GitHub Actions:** https://docs.github.com/en/actions

---

**Last Updated:** 2024
**Maintained by:** ORIGEN Team
**Status:** Active & Production Ready
