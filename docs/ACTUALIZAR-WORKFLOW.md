---
contentType: Guide
title: Instructions to update CI workflow — ORIGEN ERP
---

# Instructions to update CI workflow — ORIGEN ERP

## GitHub is rejecting automatic push

GitHub does not allow an OAuth app to modify workflows without the `workflow` permission. You have two options:

## Option 1: Modify workflow manually (recommended)

### Step 1: Go to workflow file

1. Navigate to: https://github.com/salazaroliveros-prog/ORIGEN/blob/main/.github/workflows/ci.yml
2. Click the pencil icon to edit

### Step 2: Add permissions

In the `permissions` section, change to:

```yaml
permissions:
  contents: read
  actions: read
```

### Step 3: Add environment variables to build

In the "Build" step, replace:

```yaml
- name: Build
  run: npm run build
```

With:

```yaml
- name: Build
  env:
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
    NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
    NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID }}
    NEXT_PUBLIC_FIRESTORE_DATABASE_ID: ${{ secrets.NEXT_PUBLIC_FIRESTORE_DATABASE_ID }}
  run: npm run build
```

### Step 4: Commit

1. Click "Commit changes"
2. Select "Commit directly to the main branch"
3. Click "Commit changes"

## Option 2: Add workflow permission to GitHub token

If you prefer automatic push in the future:

1. Go to: https://github.com/settings/tokens
2. Regenerate your GitHub token
3. Add the `workflow` scope
4. Update the token in your git config
5. Try the push again

## After updating the workflow
