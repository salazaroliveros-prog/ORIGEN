# 🔧 Advanced Troubleshooting Guide - ORIGEN ERP

## Common Issues & Solutions

---

## Build Issues

### Issue: Build Fails with "Memory exceeded"

**Symptoms:**

- Build times out after 15 minutes
- Error: "JavaScript heap out of memory"

**Solutions:**

```bash
# 1. Local fix - increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build

# 2. Check for large dependencies
npm ls --depth=0 | sort -k2 -rn | head -20

# 3. Remove unused dependencies
npm prune

# 4. If Vercel build is failing:
# → Go to Vercel → Settings → Build & Development → Increase Memory
```

### Issue: "Module not found" during build

**Symptoms:**

- Error: `Module "X" not found`
- Build fails at compilation

**Solutions:**

```bash
# 1. Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# 2. Check imports are correct
grep -r "from.*X" src/

# 3. Verify package is in package.json
npm ls X

# 4. If not, install it
npm install X --save
```

### Issue: Type checking fails

**Symptoms:**

- `npm run type-check` fails
- Errors in TypeScript compilation

**Solutions:**

```bash
# 1. Check specific file
npx tsc --noEmit app/page.tsx

# 2. Reset TypeScript cache
rm -rf .next
npm run build

# 3. Update types
npm install --save-dev @types/node@latest

# 4. Fix any type errors manually
npx tsc --noEmit 2>&1 | head -20
```

---

## Runtime Issues

### Issue: Application won't start locally

**Symptoms:**

- `npm run dev` fails to start
- Port already in use

**Solutions:**

```bash
# 1. Check if port is in use
lsof -i :3000

# 2. Kill process on port
kill -9 <PID>

# 3. Use different port
PORT=3001 npm run dev

# 4. Check for missing env variables
cat .env.local | grep NEXT_PUBLIC_

# 5. Regenerate .env.local
cp .env.example .env.local
# Then fill in real values
```

### Issue: "Cannot find Firebase configuration"

**Symptoms:**

- Error: `Firebase app not initialized`
- Error in `lib/firebase.ts`

**Solutions:**

```bash
# 1. Verify .env.local has Firebase vars
echo $NEXT_PUBLIC_FIREBASE_PROJECT_ID

# 2. Check Firebase config file
ls -la lib/firebase.ts

# 3. Verify Firebase credentials
cat lib/firebaseService.ts | grep PROJECT_ID

# 4. If using emulator, verify it's running
# Check port 8080, 9099, 8085
netstat -tuln | grep 8080
```

### Issue: Database operations timeout

**Symptoms:**

- Timeout after 10+ seconds
- Error: `Firestore operation timeout`

**Solutions:**

```bash
# 1. Check database connection
curl https://firestore.googleapis.com/v1/projects

# 2. Check network connectivity
ping firestore.googleapis.com

# 3. If local emulator, verify running
firebase emulators:list

# 4. Increase timeout in code
// In lib/firebaseService.ts
const settings = {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
};

# 5. Check Firebase quotas
# → Firebase Console → Firestore → Usage
```

---

## Deployment Issues

### Issue: Vercel deployment stuck

**Symptoms:**

- Deployment shows "Building..." for > 15 mins
- No progress in Vercel dashboard

**Solutions:**

```bash
# 1. Check build logs
vercel logs --tail

# 2. Cancel stuck deployment
vercel deployments list
# Then manually cancel in dashboard

# 3. Clear Vercel build cache
vercel env rm VERCEL_TOKEN
vercel link  # Re-link project

# 4. Manual deployment
vercel --prod --no-cache

# 5. If still failing, check for:
# - Large files being uploaded
# - Infinite loops in build
# - Missing environment variables
```

### Issue: "Environment variables not found" in Vercel

**Symptoms:**

- Build succeeds but app errors on NEXT_PUBLIC_ vars
- Error: `process.env.NEXT_PUBLIC_X is undefined`

**Solutions:**

```bash
# 1. Verify secrets in GitHub
# Settings → Secrets → Check all NEXT_PUBLIC_* exist

# 2. Verify they're in Vercel
# Project → Settings → Environment Variables

# 3. Add missing secrets
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID <value>

# 4. Redeploy
vercel --prod

# 5. Check deployment environment
# Vercel logs should show env vars being loaded
```

### Issue: "Build timeout - exceeded 60 minutes"

**Symptoms:**

- Vercel deployment stops after 60 minutes
- Partial build uploaded

**Solutions:**

```bash
# 1. Identify what's slow
# Check build log segments

# 2. Optimize build steps
# Remove unnecessary build steps in scripts/build.mjs

# 3. Upgrade Vercel plan
# Pro plan allows up to 15 minute functions

# 4. Use serverless function optimization
# Move heavy processing to background jobs

# 5. Split build into stages
# Pre-build processing
# Main build
# Post-build optimization
```

---

## Performance Issues

### Issue: Page loads slowly (> 3s)

**Symptoms:**

- LCP > 2.5s
- Users report slow loading

**Solutions:**

```bash
# 1. Check what's slow
# Vercel Analytics → Core Web Vitals
# Chrome DevTools → Performance tab

# 2. Common fixes:
# - Reduce JavaScript bundle
# npm run build:analyze

# - Optimize images
# Use next/image component
# Compress images before upload

# - Implement lazy loading
# import dynamic from 'next/dynamic'

# - Cache static assets
# Check next.config.ts for cache headers

# 3. Database query optimization
# Check if queries are indexed
# Firebase Console → Firestore → Indexes
```

### Issue: High CPU usage

**Symptoms:**

- Vercel function CPU usage near limit
- Functions slow down under load

**Solutions:**

```bash
# 1. Profile the code
# Add performance marks
performance.mark('operation-start')
// ... operation ...
performance.mark('operation-end')

# 2. Identify bottlenecks
# Sentry Performance tab
# → Identify slow transactions

# 3. Optimize hot paths
# Use caching
# Batch database queries
# Implement request debouncing

# 4. Database optimization
# Add indexes for frequently queried fields
# Composite indexes for multi-field queries
# Archive old data

# 5. Consider upgrading plan
# Pro plan provides more CPU
# Blaze plan on Firestore scales automatically
```

---

## Database Issues

### Issue: Firestore quota exceeded

**Symptoms:**

- Error: `Quota exceeded for quota metric 'reads'`
- Database read operations failing

**Solutions:**

```bash
# 1. Check current usage
# Firebase Console → Firestore → Usage

# 2. Identify heavy consumers
# Check which collections are read most
# Look for inefficient queries

# 3. Implement caching
# Redis or in-memory cache
# Reduce redundant reads

# 4. Optimize queries
# Use indexes
# Filter early
# Batch operations

# 5. Upgrade plan
# Spark (free): 50K reads/day
# Blaze: Pay-as-you-go
# → Recommended for production

# 6. Data retention policy
# Delete old records automatically
# Archive cold data
```

### Issue: Firestore indexes building

**Symptoms:**

- Queries slow on new composite indexes
- Error: `Composite index building`

**Solutions:**

```bash
# 1. Check index status
# Firebase Console → Firestore → Indexes

# 2. Wait for index to build
# Usually takes 5-30 minutes depending on data size

# 3. While waiting:
# Use temporary non-indexed queries
# Or implement client-side filtering

# 4. Optimize index design
# Only index what's queried
# Remove unused indexes

# 5. Best practices:
# Create indexes during low-traffic times
# Plan index strategy during design phase
```

---

## Authentication Issues

### Issue: "User not authenticated"

**Symptoms:**

- Error: `No user signed in`
- Auth redirects to login repeatedly

**Solutions:**

```bash
# 1. Check Firebase auth status
# Browser console: firebase.auth().currentUser

# 2. Verify token refresh
# Check localStorage for tokens
# localStorage.getItem('firebase:...')

# 3. Check CORS configuration
# Verify origin allowed in Firebase
# Firebase Console → Authentication → Settings

# 4. Clear browser cache and cookies
# DevTools → Application → Storage → Clear all

# 5. Test auth flow manually
# Go to login page
# Check network requests
# Verify token is returned

# 6. Check production auth domain
# Firebase Console → Authentication → Authorized domains
# Ensure origen-one-kohl.vercel.app is added
```

### Issue: Session expires too quickly

**Symptoms:**

- User logged out after few minutes
- Error: `Auth token expired`

**Solutions:**

```bash
# 1. Check token expiration settings
# Firebase Console → Authentication → Settings

# 2. Increase session timeout
# Change in lib/firebaseService.ts
// session persistence configuration

# 3. Implement token refresh
// Auto-refresh before expiration
firebase.auth().onIdTokenChanged(user => {
  // Handle token refresh
})

# 4. Check for auth errors
# Sentry → Errors → Look for auth-related issues

# 5. Test on production
# Verify auth works on https://origen-one-kohl.vercel.app
```

---

## Network Issues

### Issue: "Network request failed"

**Symptoms:**

- Error: `Failed to fetch`
- CORS errors in console

**Solutions:**

```bash
# 1. Check network connectivity
ping google.com
curl https://firestore.googleapis.com

# 2. Verify CORS headers
# Check response headers in DevTools
# Access-Control-Allow-Origin should match your origin

# 3. Check API endpoint
# Verify URL is correct
# Test with curl

# 4. Verify credentials
# Check API key in environment
# Check permissions in Firebase

# 5. Network issues:
# - Check firewall rules
# - Verify VPN connection
# - Try different network
# - Check DNS resolution
```

### Issue: Requests timeout

**Symptoms:**

- Error: `Request timeout`
- Takes > 30 seconds to respond

**Solutions:**

```bash
# 1. Check server status
curl -I https://origen-one-kohl.vercel.app

# 2. Identify slow endpoint
# Sentry Performance → Find slow transaction

# 3. Check database queries
# Add query logging
# Identify N+1 queries

# 4. Implement request timeout
// In API routes
const timeout = 30000; // 30 seconds
setTimeout(() => res.status(504).send('Timeout'), timeout)

# 5. Optimize response
# Return less data
# Implement pagination
# Cache responses
```

---

## Security Issues

### Issue: "Potential security vulnerability detected"

**Symptoms:**

- npm audit shows vulnerabilities
- Sentry reports security issues

**Solutions:**

```bash
# 1. Run security audit
npm audit

# 2. Fix vulnerabilities
npm audit fix
npm audit fix --force  # If needed

# 3. Update specific package
npm update package-name@latest

# 4. If vulnerability can't be fixed
# Document as accepted risk
# Plan upgrade path
# Implement workaround

# 5. Keep monitoring
# Regular audits (weekly)
# GitHub Dependabot enabled
# Sentry security monitoring
```

### Issue: "Sensitive data exposed"

**Symptoms:**

- API keys visible in client bundle
- Secrets in localStorage
- Credentials in git history

**Solutions:**

```bash
# 1. Immediate action
# Rotate all exposed keys
# Revoke compromised tokens

# 2. Remove from code
# Replace with environment variables
# Use NEXT_PUBLIC_ prefix only for public data

# 3. Check git history
git log --all --full-history -- <file>
# If exposed, rewrite history

# 4. Implement secret management
# Use environment variables
# Never commit .env files
# Use .env.example for template

# 5. Audit practices
# Code review for secrets
# Pre-commit hooks
# Scanning tools (git-secrets)
```

---

## Getting Help

**Resources:**

- GitHub Issues: https://github.com/salazaroliveros-prog/ORIGEN/issues
- Vercel Support: https://vercel.com/support
- Firebase Support: https://firebase.google.com/support
- Sentry Documentation: https://docs.sentry.io/

**When reporting issues include:**

- Error message (full stack trace)
- Steps to reproduce
- Environment (local/staging/production)
- Browser/Node version
- Recent changes (if any)
- Screenshots or logs

---

**Last Updated:** November 24, 2026
**Maintained by:** Development Team
