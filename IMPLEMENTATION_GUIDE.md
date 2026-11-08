---
contentType: Guide
title: Implementation guide — code corrections and enhancements — ORIGEN ERP
---

# Implementation guide — code corrections and enhancements — ORIGEN ERP

Date: November 2, 2024

## Overview

This guide details all corrections and enhancements implemented based on the comprehensive system audit. The implementation follows the identified issues and best practices.

## What was implemented

### 1. Calculation utilities (`lib/utils/calculations.ts`)

**Purpose:** Centralize all business logic calculations

**Includes:**

- APU budget calculations with full validation
- Currency conversion (USD ↔ GTQ)
- Quotation totals with tax and discount
- Payroll calculations (Guatemala IGSS-compliant)
- Bono 14 and Aguinaldo calculations
- Attendance rate calculations
- Cash flow projections

**Key features:**

- Input validation with detailed error messages
- Precision handling (2 decimal places for currency)
- Guatemalan tax brackets (ISR 2024)
- IGSS deduction rates (4.83 percent employee, 12.67 percent employer)
- Comprehensive documentation

**Usage:**

```typescript
import { calculatePayroll, calculateBudgetSummary } from '@/lib/utils/calculations';

const payroll = calculatePayroll(employee, daysWorked);
const budget = calculateBudgetSummary(apuItems, totalSpent);
```

### 2. Test suite (`lib/utils/calculations.test.ts`)

**Purpose:** Comprehensive testing of all calculations

**Coverage:**

- 40-plus test cases
- APU calculations (unit cost, line total, validation)
- Budget summary calculations
- Currency conversion
- Quotation totals
- Payroll calculations (including tax brackets)
- Bonus calculations (Bono 14, Aguinaldo)
- Attendance rate calculations
- Cash flow projections
- Validation helpers

**Run tests:**

```bash
npm run test -- calculations
npm run test:coverage
```
