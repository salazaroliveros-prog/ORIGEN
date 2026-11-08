---
contentType: Reference
title: E2E QA analysis report — ConstructERP Guatemala
---

# E2E QA analysis report — ConstructERP Guatemala

Date: October 26, 2026  
Analyst: QA Automation Engineer  
Environment: Production (https://origen-one-kohl.vercel.app)  
Method: Static code analysis and data flow verification

## Identified modules

### 1. Dashboard (control panel)

View: `features/dashboard/DashboardView.tsx`

Required props:

- `projects: Project[]`
- `expenses: ExpenseRecord[]`
- `company: CompanySettings`
- `activeProjectId: string`
- `milestones: Milestone[]`
- `employees: Employee[]`
- `attendance: AttendanceRecord[]`

Data dependencies:

- Projects — necessary for KPIs
- Expenses — necessary for financial charts
- Company — necessary for currency formats
- Milestones — necessary for projections
- Employees and Attendance — necessary for productivity

Implemented widgets:

- Cash Flow Projection
- Labor Costs and Productivity
- Progress Comparison
- Stacked Budget
- Expenses Histogram
- Budget Utilization (D3)
- Project Breakdown

### 2. Projects and Digital Signatures

View: `features/projects/ProjectsView.tsx`

Required props:

- `company: CompanySettings`
- `projects: Project[]`
- `expenses: ExpenseRecord[]`
- `loading: boolean`
- CRUD functions: `onCreateProject`, `onUpdateProject`, `onArchiveProject`, `onRestoreProject`

Data dependencies:

- Projects (primary)
- Expenses — for expense calculation by project
- Company — for configuration
