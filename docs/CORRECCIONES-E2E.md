---
contentType: Reference
title: Correcciones realizadas — análisis E2E — ConstructERP Guatemala
---

# Correcciones realizadas — análisis E2E — ConstructERP Guatemala

Date: October 26, 2026  
Analyst: QA Automation Engineer + Development Team  
Status: Completed and verified

## Executive summary

Critical corrections identified in the E2E analysis were implemented to improve the quality, security, and functionality of the ConstructERP Guatemala system.

Problems identified: 10  
Corrections implemented: 10  
Verification status: TypeScript (no errors), Tests (36 of 36 passing), ESLint (no errors)

## Corrections implemented

### 1. Critical: AuthDialog not showing automatically

**Problem:** The application showed "Loading..." indefinitely without showing the AuthDialog when there was no authenticated user.

**Solution:**

- Added `useEffect` in `components/MainApp.tsx` that shows AuthDialog automatically when `authStatus === 'unauthenticated'`
- Exception: Does not show if there is an invitation link in the URL

**Modified file:** `components/MainApp.tsx` (lines 256 to 261)

**Impact:** Users can now log in immediately when accessing the app.

### 2. High: Firebase subscription error handling

**Problem:** Firebase subscriptions only did `console.error` without notifying the user.

**Solution:**

- Improved `handleFirestoreError` in `lib/firebaseService.ts`
- Added error type detection (permissions, network, auth)
- Added toast notifications to the user with specific messages
- Dynamic import of `react-hot-toast` to avoid SSR problems

**Modified file:** `lib/firebaseService.ts` (lines 132 to 196)

**Impact:** Users now receive clear feedback when there are connection errors.

### 3. High: Automatic progressPercent calculation

**Problem:** `Project.progressPercent` was not calculated automatically based on tasks/milestones.

**Solution:**

- Created `lib/projectCalculations.ts` with calculation functions
- Added `useEffect` in `lib/hooks/useProjectData.ts` that recalculates progress when `scheduleTasks` or `scheduleMilestones` change
