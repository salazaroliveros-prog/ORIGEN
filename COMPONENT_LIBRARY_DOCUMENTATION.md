---
contentType: Reference
title: ORIGEN ERP — component library and best practices
---

# ORIGEN ERP — component library and best practices

Complete documentation — professional grade

## Component library

### Core components

#### Projects list

Purpose: Display and manage project listings

Features:

- Sticky create button
- Sort by: name, budget, date, status
- Delete confirmation
- Responsive table and card views
- Pagination support

Usage:

```tsx
<ProjectsList />
```

Props: None (uses useProjectData hook)

Best practices:

- Use for project management views
- Ensure proper project data is loaded
- Handle large datasets with pagination

#### Dashboard overview

Purpose: Display KPI and financial overview

Features:

- KPI cards with memoization
- Trend charts (6-month)
- Project status distribution
- Budget utilization report

Usage:

```tsx
<DashboardOverview />
```

Best practices:

- Load on main dashboard
- Memoize expensive calculations
- Use for executive summary

#### Expenses view

Purpose: Expense tracking and categorization

Features:

- 6 category colors (centralized)
- CSV export
- Duplicate detection
- Photo receipt upload

Usage:

```tsx
<ExpensesView projectId={projectId} />
```

Best practices:

- Category colors use COLORS.expenseCategories
- Validate amounts before submit
- Show duplicate warnings

#### Personnel view

Purpose: Attendance and personnel management

Features:

- Calendar and list toggle views
- Overtime validation (max 12h)
- ISR 2024 calculations
- Touch targets 48x48px+

Usage:

```tsx
<PersonnelView projectId={projectId} />
```
