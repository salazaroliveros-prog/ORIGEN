# ORIGEN ERP - Deployment Checklist & Secrets Setup

## 🔑 Required GitHub Secrets

Configure these secrets in **Settings → Secrets and variables → Actions**:

### Authentication & Deployment

- [ ] `VERCEL_TOKEN` - Personal Vercel authentication token
  - Get from: https://vercel.com/account/tokens
  - Scope: `deployment` and `project:read`

- [ ] `VERCEL_ORG_ID` - Your Vercel organization ID
  - Find in: https://vercel.com/account/stores

- [ ] `VERCEL_PROJECT_ID` - Production project ID
  - Find in: `vercel.json` or Vercel dashboard

- [ ] `VERCEL_PROJECT_ID_STAGING` - Staging project ID (optional)
  - For preview deployments

- [ ] `SLACK_WEBHOOK_URL` - Slack notification webhook (optional)
  - Get from: https://api.slack.com/messaging/webhooks

### Firebase Configuration

- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
  - Value: `origen-erp-guatemala`

- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase API key
  - From: Firebase console → Settings → Project settings

- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
  - Value: `origen-erp-guatemala.firebaseapp.com`

- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID
  - Value: `1:893831571998:web:4e38903eeb0dff05011c0f`

- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
  - Value: `origen-erp-guatemala.firebasestorage.app`

- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase sender ID
  - Value: `893831571998`

- [ ] `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` - Google Analytics ID
  - Value: `G-EBE081ELJT`

- [ ] `NEXT_PUBLIC_FIREBASE_VAPID_KEY` - VAPID key for FCM
  - From: Firebase console → Cloud Messaging → Web credentials

- [ ] `NEXT_PUBLIC_FIRESTORE_DATABASE_ID` - Firestore database ID
  - Value: `(default)`

### Application Configuration

- [ ] `NEXT_PUBLIC_APP_URL` - Production application URL
  - Value: `https://origen-one-kohl.vercel.app`

- [ ] `PRIMARY_ADMIN_EMAIL` - Primary admin email
  - Value: `salazaroliveros@gmail.com`

- [ ] `GEMINI_API_KEY` - Google Gemini API key
  - From: Google AI Studio → API keys

---

## 🚀 Pre-Deployment Checklist

### Code Quality

- [ ] All linting checks pass (`npm run lint`)
- [ ] TypeScript type checking passes (`npm run type-check`)
- [ ] Code formatting is correct (`npm run format:check`)
- [ ] No console.log statements left in production code
- [ ] Security vulnerabilities checked (`npm audit`)

### Testing

- [ ] Unit tests pass (`npm run test`)
- [ ] Firebase emulator tests pass (`npm run test:firebase`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Visual regression tests pass (`npm run test:visual`)
- [ ] No failing tests in test report

### Build Verification

- [ ] Next.js build succeeds (`npm run build`)
- [ ] No build warnings or errors
- [ ] `.next/` folder generated correctly
- [ ] PWA manifest validated (`npm run pwa:validate-manifest`)
- [ ] All environment variables are set

### Security

- [ ] No sensitive data in code or environment files
- [ ] Security headers are configured in `vercel.json`
- [ ] CORS properly configured
- [ ] Authentication is secure (Firebase Auth rules checked)
- [ ] API endpoints are protected

### Performance

- [ ] Next.js bundle size is acceptable
- [ ] All pages load in < 3 seconds
- [ ] No memory leaks in browser console
- [ ] Service Worker caching is configured
- [ ] Images are optimized

---

## 📋 Deployment Steps

### 1. Local Testing

```bash
# Install dependencies
npm ci

# Run all checks
npm run lint
npm run type-check
npm run format:check

# Run tests
npm run test
npm run test:firebase
npm run test:e2e

# Build
npm run build
```

### 2. Git Operations

```bash
# Stage changes
git add .

# Commit with conventional commit
git commit -m "feat: your feature description"

# Push to main or develop
git push origin main
```

### 3. GitHub Actions

- Monitor workflow at: https://github.com/salazaroliveros-prog/ORIGEN/actions
- Expected duration: ~15-20 minutes
- Check all jobs pass: lint, security, build, test, e2e, deploy

### 4. Vercel Deployment

- Automatic deployment via GitHub Actions
- Monitor at: https://vercel.com
- Check production URL: https://origen-one-kohl.vercel.app

### 5. Post-Deployment

- [ ] Check application loads in browser
- [ ] Test main features work
- [ ] Check browser console for errors
- [ ] Verify security headers with curl:
  ```bash
  curl -I https://origen-one-kohl.vercel.app | grep -E "X-Frame|HSTS|Content-Type"
  ```
- [ ] Monitor error tracking (Sentry)
- [ ] Check database connectivity

---

## ⚠️ Common Deployment Issues

### Issue: Build Fails with "Module not found"

**Solution:**

1. Check all imports have correct paths
2. Run `npm ci` locally
3. Verify `.env` variables are set
4. Clear `.next/` and rebuild

### Issue: Vercel Deployment Failed

**Solution:**

1. Check GitHub Actions workflow logs
2. Verify all secrets are configured
3. Check Node.js version compatibility
4. Review Vercel deployment logs

### Issue: Health Checks Fail After Deployment

**Solution:**

1. Wait 30-60 seconds for cold start
2. Check Firebase connectivity
3. Verify environment variables in Vercel
4. Check application logs in Vercel

### Issue: "Too many requests" or Rate Limiting

**Solution:**

1. Check API rate limits
2. Verify Firebase quotas
3. Check Gemini API usage
4. Implement request caching

---

## 🔍 Verification Commands

```bash
# Check deployment status
curl -I https://origen-one-kohl.vercel.app

# Check security headers
curl -I https://origen-one-kohl.vercel.app | grep -E "X-Frame|HSTS"

# Check specific header
curl -I https://origen-one-kohl.vercel.app | grep "X-Content-Type-Options"

# Check response time
time curl https://origen-one-kohl.vercel.app > /dev/null

# Check SSL certificate
openssl s_client -connect origen-one-kohl.vercel.app:443 -servername origen-one-kohl.vercel.app
```

---

## 📞 Support & Rollback

### Rollback Procedure

1. Go to Vercel dashboard: https://vercel.com
2. Find deployment that worked
3. Click "Promote to Production"
4. Verify deployment is working

### Emergency Contact

- **GitHub Issues:** Report issues with detailed logs
- **Vercel Support:** https://vercel.com/support
- **Firebase Support:** https://firebase.google.com/support

---

## 📊 Monitoring

### Production Monitoring Links

- **Vercel Deployments:** https://vercel.com/dashboard
- **GitHub Actions:** https://github.com/salazaroliveros-prog/ORIGEN/actions
- **Firebase Console:** https://console.firebase.google.com
- **Application Health:** https://origen-one-kohl.vercel.app

---

## ✅ Sign-Off

Deployment Date: _________________
Deployed By: _________________
Verification: ✅ All checks passed

**Last Updated:** 2024
**Workflow Files:**

- `.github/workflows/main.yml` - CI/CD Pipeline
- `.github/workflows/ci.yml` - Build & Test
- `.github/workflows/visual-tests.yml` - Visual Tests
