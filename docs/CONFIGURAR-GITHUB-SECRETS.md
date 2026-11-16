---
contentType: Guide
title: Configurar GitHub Secrets para CI/CD — ORIGEN ERP
---

# Configurar GitHub Secrets para CI/CD — ORIGEN ERP

## Required environment variables

GitHub Actions CI needs the following Firebase environment variables for the build to pass correctly.

## Steps to configure

### 1. Go to GitHub Secrets

1. Navigate to the repository: https://github.com/salazaroliveros-prog/ORIGEN
2. Go to: **Settings** → **Secrets and variables** → **Actions**
3. Click on **New repository secret**

### 2. Add each variable

For each variable, add:

#### NEXT_PUBLIC_FIREBASE_PROJECT_ID

- **Name:** `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- **Value:** `<TU_FIREBASE_PROJECT_ID>`

#### NEXT_PUBLIC_FIREBASE_API_KEY

- **Name:** `NEXT_PUBLIC_FIREBASE_API_KEY`
- **Value:** `<TU_FIREBASE_API_KEY>`

#### NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN

- **Name:** `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- **Value:** `origen-erp-guatemala.firebaseapp.com`

#### NEXT_PUBLIC_FIREBASE_APP_ID

- **Name:** `NEXT_PUBLIC_FIREBASE_APP_ID`
- **Value:** `<TU_FIREBASE_APP_ID>`

#### NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

- **Name:** `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- **Value:** `origen-erp-guatemala.firebasestorage.app`

#### NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID

- **Name:** `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- **Value:** `<TU_FIREBASE_MESSAGING_SENDER_ID>`

#### NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

- **Name:** `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- **Value:** Leave empty

#### NEXT_PUBLIC_FIRESTORE_DATABASE_ID

- **Name:** `NEXT_PUBLIC_FIRESTORE_DATABASE_ID`
- **Value:** `(default)`

### 3. Verify

After adding all variables:

1. Go to the **Actions** tab
2. Search for the last workflow that failed
3. Click on **Re-run all jobs**

## Important note

Firebase credentials (`NEXT_PUBLIC_FIREBASE_*`) are public and designed to be used on the client. They are not sensitive secrets like private keys or service tokens.
