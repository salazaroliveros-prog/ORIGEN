# Vercel Deployment Troubleshooting Guide - ORIGEN ERP

## 🚨 Common Errors & Solutions

### 1. Build Error: "Cannot find module..."

**Symptoms:**

- Build fails with `Module not found: Can't resolve '...'`
- Error during `npm run build`

**Causes:**

- Missing dependency installation
- Incorrect import path
- Node modules not properly installed

**Solutions:**

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm ci

# Verify imports are correct
# Check file exists at the specified path

# Build locally to test
npm run build

# If error persists, check vercel.json
# Ensure installCommand is set to: npm install
```

---

### 2. Build Error: "Cannot find required env variables"

**Symptoms:**

- Build fails: `Error: NEXT_PUBLIC_FIREBASE_API_KEY is not defined`
- Variables are undefined in production build

**Causes:**

- Secrets not configured in GitHub Actions
- Variables not passed to Vercel
- Missing environment variables in vercel.json

**Solutions:**

1. **Check GitHub Secrets:**
   - Go to: Settings → Secrets and variables → Actions
   - Verify all required secrets are listed
   - Check secret values are correct

2. **Update GitHub Workflow:**

   ```yaml
   - name: Build
     env:
       NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
       NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
       # ... all other variables
     run: npm run build
   ```

3. **Set Vercel Environment Variables:**
   - Go to: Vercel Dashboard → Settings → Environment Variables
   - Add all required variables
   - Set for production environment

---

### 3. Build Error: "ENOSP: no space left on device"

**Symptoms:**

- Build fails with disk space error
- Error: `ENOSPC`

**Causes:**

- Vercel build environment has limited disk space
- Unused dependencies or large files

**Solutions:**

```bash
# Check dependencies for unused packages
npm ls --all

# Remove unused dependencies
npm prune

# Check for large files
find . -type f -size +100M

# Optimize build
npm run build:analyze

# Clear Vercel cache
# Go to: Vercel Dashboard → Settings → Git → Clear Build Cache
```

---

### 4. Build Warning: "ESLint errors detected"

**Symptoms:**

- Build succeeds but shows warnings
- Vercel continues despite errors

**Causes:**

- Eslint rules not passed
- Code quality issues

**Solutions:**

```bash
# Check locally
npm run lint

# Fix issues
npm run lint:fix

# Commit and push
git add .
git commit -m "fix: resolve linting issues"
git push
```

---

### 5. Deployment Error: "Health check failed"

**Symptoms:**

- Deployment succeeds but app is unreachable
- Error: `GET / HTTP/1.1" 500 Internal Server Error`

**Causes:**

- Application crashes on startup
- Incorrect build output
- Database/API connectivity issues

**Solutions:**

1. **Check Vercel logs:**
   - Go to: Vercel Dashboard → Project → Deployments
   - Click deployment → View Function Logs
   - Check for startup errors

2. **Test build locally:**

   ```bash
   npm run build
   npm run start
   # Navigate to http://localhost:3000
   ```

3. **Check Firebase connectivity:**
   - Verify Firebase credentials
   - Check firestore rules
   - Test authentication

4. **Review environment variables:**
   - All required variables must be set
   - Check for typos
   - Verify values are correct

---

### 6. Performance Error: "Build timeout (900s exceeded)"

**Symptoms:**

- Build takes longer than 15 minutes
- Error: `Build script timed out`

**Causes:**

- Large dependencies
- Slow type checking
- E2E tests in build

**Solutions:**

```bash
# Check build performance
npm run build:analyze

# Optimize build
# 1. Remove unused dependencies
npm prune

# 2. Update package.json scripts
# Remove heavy tests from build script
"build": "next build"  # Not: "npm test && next build"

# 3. Clear Next.js cache
rm -rf .next

# 4. Update vercel.json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install"
}
```

---

### 7. Deployment Error: "CORS error from API"

**Symptoms:**

- API requests fail with CORS error
- Error: `Access to XMLHttpRequest has been blocked by CORS policy`

**Causes:**

- Origin not allowed in backend
- Missing CORS headers
- Backend firewall rules

**Solutions:**

```json
// Update vercel.json headers
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Credentials",
          "value": "true"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

**Or update backend CORS:**

```javascript
// If using Express/Node backend
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true,
  })
);
```

---

### 8. Deployment Error: "Database connection failed"

**Symptoms:**

- App loads but database operations fail
- Error: `Connection timeout` or `Authentication failed`

**Causes:**

- Firestore not accessible
- Credentials are invalid
- IP whitelist restrictions

**Solutions:**

1. **Check Firebase credentials:**
   - Go to Firebase Console → Service Accounts
   - Verify credentials are correct
   - Re-download if needed

2. **Check Firestore rules:**

   ```javascript
   // Allow authenticated users
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

3. **Verify network access:**
   - Ensure Vercel region can access Firebase
   - Check firewall rules
   - Test locally with Firebase emulator

---

### 9. Deployment Error: "Memory limit exceeded"

**Symptoms:**

- Functions run out of memory
- Error: `JavaScript heap out of memory`

**Causes:**

- Large data processing
- Memory leak in code
- Inefficient algorithms

**Solutions:**

```bash
# Monitor memory usage
npm run build --profile

# Check for memory leaks
npm run test:coverage

# Optimize code
# 1. Stream large data instead of loading all
# 2. Use pagination for database queries
# 3. Implement caching
```

---

### 10. Deployment Error: "Firebase initialization failed"

**Symptoms:**

- Error: `Firebase app initialization error`
- Authentication not working

**Causes:**

- Missing VAPID key
- Firebase credentials expired
- Incorrect Firebase configuration

**Solutions:**

1. **Verify `.env.vercel.production`:**

   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY="your-key"
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-domain"
   # All variables must be set
   ```

2. **Regenerate VAPID key:**
   - Firebase Console → Cloud Messaging → Web
   - Generate new key pair
   - Update `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

3. **Test locally:**
   ```bash
   npm run dev:emulated
   ```

---

## 🔧 Diagnostic Tools

### Check Build Logs

```bash
# View Vercel logs locally
vercel logs --tail

# Or check GitHub Actions logs
# Go to: https://github.com/salazaroliveros-prog/ORIGEN/actions
```

### Test Build Locally

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Build locally
vercel build

# Test locally
npm run start
```

### Monitor Performance

```bash
# Check Next.js build output
npm run build:analyze

# Check bundle size
npm run build -- --analyze

# Check type check performance
time npm run type-check
```

---

## 📝 Deployment Report Template

**When reporting deployment issues:**

1. **Error Message:** Copy full error text
2. **Build Logs:** Attach build output
3. **Environment:** Node version, npm version
4. **Steps to Reproduce:**
   - What you did
   - What happened
   - What you expected

5. **Environment Variables:** Confirm all are set
6. **Local Test:** Did it work locally?
7. **GitHub Actions Status:** Check if CI passed

---

## ✅ Verification Checklist After Deployment

- [ ] Application loads at: https://origen-one-kohl.vercel.app
- [ ] No console errors (F12 → Console)
- [ ] Authentication works
- [ ] Database queries succeed
- [ ] API endpoints respond
- [ ] Images load correctly
- [ ] Security headers present
- [ ] SSL certificate valid
- [ ] Response time < 2s
- [ ] All features work as expected

---

## 🎯 Quick Fix Recipes

### Fix: "build command failed"

```bash
npm ci
npm run lint:fix
npm run build
git add .
git commit -m "fix: resolve build errors"
git push
```

### Fix: "Health check failed"

```bash
npm run build
npm run start
# Test locally
# Then push fixes
```

### Fix: "Environment variables missing"

1. Go to GitHub Secrets
2. Add all missing secrets
3. Trigger new deployment

### Fix: "Deployment timeout"

```bash
# Optimize build
npm prune
rm -rf .next node_modules
npm ci
npm run build
```

---

**Last Updated:** 2024
**For Issues:** Create GitHub issue with diagnostic info
**For Help:** Check Vercel docs: https://vercel.com/docs
