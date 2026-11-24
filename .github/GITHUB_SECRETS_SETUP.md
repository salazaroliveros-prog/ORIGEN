# 🔐 GitHub Secrets Setup Guide - ORIGEN ERP

## Overview

This guide walks through configuring GitHub Secrets needed for full CI/CD automation and Vercel deployment.

## Required Secrets

### 1. Vercel Integration Secrets

```
VERCEL_TOKEN           - Personal access token from Vercel
VERCEL_ORG_ID          - Organization ID from Vercel
VERCEL_PROJECT_ID      - Project ID from Vercel (production)
VERCEL_PROJECT_ID_STAGING - Project ID from Vercel (staging, optional)
```

### 2. Firebase Configuration Secrets

```
NEXT_PUBLIC_FIREBASE_PROJECT_ID        - Firebase project ID
NEXT_PUBLIC_FIREBASE_API_KEY           - Firebase API key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN       - Firebase auth domain
NEXT_PUBLIC_FIREBASE_APP_ID            - Firebase app ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET    - Firebase storage bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID - Firebase sender ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID    - Firebase measurement ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY         - Firebase VAPID key
NEXT_PUBLIC_FIRESTORE_DATABASE_ID      - Firestore database ID
NEXT_PUBLIC_APP_URL                    - Application URL
```

### 3. AI & Services Secrets

```
GEMINI_API_KEY         - Google Gemini API key
PRIMARY_ADMIN_EMAIL    - Primary admin email
```

### 4. Slack Integration (Optional)

```
SLACK_WEBHOOK_URL      - Slack webhook for notifications
```

## How to Add Secrets to GitHub

### Step 1: Access Repository Settings

1. Go to: `https://github.com/salazaroliveros-prog/ORIGEN`
2. Click on **Settings** tab
3. Left sidebar → **Secrets and variables** → **Actions**

### Step 2: Create New Secret

1. Click **New repository secret**
2. Name: `VERCEL_TOKEN`
3. Value: (paste your Vercel token)
4. Click **Add secret**

### Step 3: Get Vercel Credentials

1. Go to: https://vercel.com/account/tokens
2. Create new token (copy it)
3. Add as `VERCEL_TOKEN` in GitHub

### Step 4: Get Vercel Project IDs

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Project ID will be shown in vercel.json or:
vercel projects list
```

### Step 5: Get Firebase Credentials

1. Go to: https://console.firebase.google.com
2. Project Settings → Service Accounts
3. Copy each credential to GitHub Secrets

## Secret Values Reference

### From Vercel Dashboard

```
Settings → Account → Tokens → Create
```

### From Firebase Console

```
Project Settings → General → Scroll down for Web API keys
```

### From Google Cloud Console

```
APIs & Services → Credentials → API Keys
```

## Verification

After adding all secrets, verify they're accessible in GitHub Actions:

```yaml
# This will be shown in workflow logs if secrets are configured
- name: Verify Secrets
  run: |
    echo "✅ Vercel Token: $([ -n "${{ secrets.VERCEL_TOKEN }}" ] && echo 'SET' || echo 'NOT SET')"
    echo "✅ Firebase Config: $([ -n "${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}" ] && echo 'SET' || echo 'NOT SET')"
```

## Security Best Practices

1. **Never commit secrets** to repository
2. **Rotate tokens regularly** (monthly recommended)
3. **Use fine-grained tokens** when possible
4. **Review secret access logs** quarterly
5. **Delete unused secrets** immediately

## Troubleshooting

### Workflow Still Fails After Adding Secrets

1. Check secret names match exactly (case-sensitive)
2. Verify no trailing spaces in values
3. Wait 1-2 minutes for GitHub cache to update
4. Re-run workflow if needed

### Build Passes Locally But Fails in GitHub Actions

1. Verify all NEXT_PUBLIC_* vars are added
2. Check Firebase credentials are correct
3. Verify Vercel project ID is correct

### Vercel Deployment Not Triggering

1. Check VERCEL_TOKEN is valid
2. Verify VERCEL_ORG_ID and VERCEL_PROJECT_ID
3. Ensure workflow has `needs: [build, test, e2e]`

## Next Steps

After configuring secrets:

1. **Verify CI/CD Pipeline**

   ```bash
   git push origin main
   # Watch GitHub Actions tab
   ```

2. **Monitor First Deployment**
   - Check GitHub Actions logs
   - Verify Vercel deployment
   - Check production URL

3. **Enable Branch Protection**
   - Settings → Branches → Add rule
   - Require status checks to pass
   - Require PR reviews

4. **Configure Auto-Deploy**
   - Settings → Vercel → Auto-deploy enabled
   - Branch: main (production)
   - Branch: develop (staging, if setup)

## Support

For issues:

1. Check GitHub Actions logs: https://github.com/salazaroliveros-prog/ORIGEN/actions
2. Check Vercel deployment logs: https://vercel.com/proyectoswm/origen
3. Verify secrets configuration again

---

**Last Updated:** November 24, 2026
**Status:** ✅ Ready for Implementation
