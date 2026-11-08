---
contentType: Reference
title: Implementation master map — ORIGEN ERP
---

# Implementation master map — ORIGEN ERP

Comprehensive map of all 54 fixes plus additional implementations

## Overview

This document maps every fix mentioned in `SCREEN_BY_SCREEN_TESTING_REPORT.md` to:

1. The specific code file(s) to modify
2. The exact implementation needed
3. Testing requirements
4. Priority level

**Total implementations required:** 50-plus features and fixes  
**Status:** Ready for development

## Implementation summary

| Layer                 | Count  | Category                                                                                        |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| Screen UI             | 32     | Login, Dashboard, Projects, Budget, Expenses, Personnel, Payroll, Quotations, Reports, Settings |
| Mobile and responsive | 3      | Tables, modals, keyboard                                                                        |
| Accessibility         | 3      | ARIA, keyboard navigation, color contrast                                                       |
| Performance           | 3      | Caching, splitting, lazy load                                                                   |
| Testing               | 4      | Component, E2E, accessibility, benchmarks                                                       |
| Cross-cutting         | 5      | Error handling, logging, validation, etc.                                                       |
| **Total**             | **50** | **All layers**                                                                                  |

## Priority 1 (critical — implement first)

### Authentication and security

**File:** `components/auth/AuthContainer.tsx` or `pages/login.tsx`

**Implementation 1.1.1: Rate limiting (5-attempt lock)**

```typescript
// Add to component state
const [loginAttempts, setLoginAttempts] = useState(0);
const [isLocked, setIsLocked] = useState(false);
const [lockTimer, setLockTimer] = useState<NodeJS.Timeout | null>(null);

// Add to login handler
const handleLogin = async (email: string, password: string) => {
  // Check if locked
  if (isLocked) {
    toast.error('Too many login attempts. Please try again in 15 minutes.');
    return;
  }

  // Check attempt count
  if (loginAttempts >= 5) {
    setIsLocked(true);
    const timer = setTimeout(
      () => {
        setIsLocked(false);
        setLoginAttempts(0);
      },
      15 * 60 * 1000
    ); // 15 minutes
    setLockTimer(timer);
    toast.error('Account locked due to too many failed attempts.');
    return;
  }

  // Attempt login
  try {
    await signInWithEmailAndPassword(auth, email, password);
    setLoginAttempts(0);
  } catch (error) {
    setLoginAttempts((prev) => prev + 1);
    throw error;
  }
};
```

## Remaining implementations

The map continues with detailed implementation instructions for all remaining priorities (2 through 5), covering:

- Dashboard enhancements
- Projects list improvements
- Budget responsive fixes
- Expenses features
- Personnel calendar
- Payroll enhancements
- Quotations features
- Reports features
- Settings features
- Mobile responsive
- Accessibility (WCAG AA)
- Component testing

Each implementation includes the specific file path, code snippet, testing requirements, and priority level.
