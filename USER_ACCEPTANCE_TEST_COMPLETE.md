---
contentType: Reference
title: User acceptance test (UAT) — ConstructERP Guatemala
---

# User acceptance test (UAT) — ConstructERP Guatemala

Complete user flow simulation — final

User role: Project administrator  
Company: ConstructERP Guatemala  
Session: Complete CRUD testing suite  
Date: May 16, 2025

## Step 1: Access to the application

### Initial state

| Field     | Value                                          |
| --------- | ---------------------------------------------- |
| User      | Cuenta de pruebas autenticada (registro histórico) |
| Role      | Owner/Admin                                    |
| Company   | ConstructERP Guatemala                         |
| Workspace | Active                                         |
| Status    | Authenticated                                  |

### UI verified

- Header: Logo and company name
- Navbar: Sidebar with 13 tabs
- Dashboard: Project widgets
- Mobile: Responsive design
- PWA: Install prompt visible

### Main buttons available

- Create project (Dashboard)
- New activity (Gantt)
- New milestone (Gantt)
- Brand configuration
- Sign out

## Step 2: Create project

### Action: Create new project

Route: Projects and Digital Signatures → "New Project" button

Form completed:

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Project name | Torre Residencial Vista Hermosa IV |
| Type         | Residential                        |
| Location     | Guatemala, Guatemala               |
| Responsible  | Ing. Mario Gonzalez                |
| Budget (Q)   | Q 2,500,000.00                     |
| Start date   | 2025-06-01                         |
| End date     | 2026-03-31                         |
| Status       | Active                             |
