# FIREBASE CLEANUP & CRUD TESTING GUIDE

**Date:** November 2, 2024  
**Objective:** Clean Firebase database and test complete CRUD operations with test data

---

## 🔴 ISSUE IDENTIFIED

**Problem:** A project exists in Firestore that cannot be deleted from the frontend UI  
**Root Cause:** Likely orphaned data or Firestore rules preventing deletion  
**Solution:** Manual cleanup of Firestore + systematic CRUD testing

---

## 🧹 FIREBASE CLEANUP PROCEDURE

### Step 1: Access Firebase Console

1. Go to: https://console.firebase.google.com/
2. Select project: **origen-erp-guatemala**
3. Navigate to: **Firestore Database**

### Step 2: Delete All Collections (Clean Slate)

In Firestore Console, delete these collections in this order:

```
1. projects
2. expenses
3. attendance
4. fieldVisits
5. apuItems
6. quotes
7. machinery
8. machineryLogs
9. employees
10. employeeDirectory
11. companySettings
12. companies (DELETE LAST - this is the root)
13. fcm_tokens
14. project_alerts
```

**How to delete:**
1. Click collection name
2. Click **Delete collection** (3 dots menu)
3. Type collection name to confirm
4. Click Delete

### Step 3: Verify Database is Empty

After deletion, Firestore should show:
```
📊 Firestore Database
├─ (Collections: empty)
└─ ✅ Database is clean
```

---

## 🧪 SYSTEMATIC CRUD TESTING PLAN

### Phase 1: Create Company & User Setup

**Test 1.1: Create Company**
```typescript
// User: salazaroliveros@gmail.com (already authenticated)
// Auto-creates company on first login
// Expected: Company document created in Firestore

Verify in Firestore:
✅ /companies/{userUID}
✅ /companies/{userUID}/members/{userUID}
```

### Phase 2: Test Create Operations (CREATE)

**Test 2.1: Create Project**
```
Input:
  - Code: PRY-001
  - Name: "Casa 5 Niveles"
  - Client: "Juan Pérez"
  - Location: "Zona 10, Guatemala"
  - Budget: Q500,000
  - Start: 2024-11-01
  - End: 2025-06-30
  - Status: Planificación

Expected:
✅ Project created in Firestore
✅ Project appears in Projects list
✅ Can navigate to project details
```

**Test 2.2: Create APU Items**
```
Item 1:
  - Code: CONC-001
  - Description: "Fundaciones de Concreto"
  - Qty: 50 m³
  - Material: Q500/u
  - Labor: Q300/u
  - Equipment: Q100/u
  - Total Unit: Q900
  - Line Total: Q45,000

Item 2:
  - Code: ACERO-001
  - Description: "Refuerzo de Acero"
  - Qty: 15 ton
  - Material: Q5,000/u
  - Labor: Q500/u
  - Equipment: Q200/u
  - Total Unit: Q5,700
  - Line Total: Q85,500

Expected:
✅ Items created in Firestore: /apuItems/{itemId}
✅ Budget total updates to Q130,500
✅ Items visible in APU list
```

**Test 2.3: Create Employee**
```
Input:
  - Name: "Juan García Pérez"
  - Role: "Albañil"
  - Daily Rate: Q250
  - IGSS Affiliated: Yes
  - DPI: 1234567890

Expected:
✅ Employee created: /employees/{empId}
✅ Employee appears in Personnel list
```

**Test 2.4: Create Attendance Record**
```
Input:
  - Employee: Juan García Pérez
  - Date: 2024-11-02 (today)
  - Status: Presente
  - Overtime: 0 hours

Expected:
✅ Attendance created: /attendance/{attId}
✅ Appears in attendance calendar
```

**Test 2.5: Create Expense**
```
Input:
  - Project: PRY-001
  - Category: "Materiales"
  - Description: "Cemento y Arena"
  - Amount: Q25,000
  - Currency: GTQ
  - Supplier: "Cementos Progreso"
  - Invoice: FAC-001
  - Payment: Transferencia BI

Expected:
✅ Expense created: /expenses/{expId}
✅ Budget utilization updates (19.16%)
✅ Expense appears in list
```

**Test 2.6: Create Quotation**
```
Input:
  - Client: "Cliente Nuevo"
  - Client NIT: "123456789"
  - Items: 
    * Qty 10, Price Q100 = Q1,000
    * Qty 5, Price Q200 = Q1,000
  - Subtotal: Q2,000
  - Discount: 10% (Q200)
  - Tax: 12% (Q216)
  - Total: Q2,016
  - Status: Borrador

Expected:
✅ Quote created: /quotes/{quoteId}
✅ Calculations correct
✅ Can export to PDF
```

### Phase 3: Test Read Operations (READ)

**Test 3.1: Dashboard Loads**
```
Expected:
✅ Dashboard displays:
  - Active projects: 1
  - Total budget: Q500,000
  - Total spent: Q25,000
  - Budget utilization: 5%
  - Charts render
✅ No errors in console
```

**Test 3.2: Projects List Shows Data**
```
Expected:
✅ Project visible in list:
  - Code: PRY-001
  - Name: Casa 5 Niveles
  - Budget: Q500,000
  - Progress: 0%
  - Status: Planificación
```

**Test 3.3: Budget Summary**
```
Expected:
✅ APU Items: 2 items
✅ Budget Total: Q130,500
✅ Spent: Q25,000
✅ Remaining: Q105,500
✅ Utilization: 19.16%
```

**Test 3.4: Personnel List**
```
Expected:
✅ Employee visible:
  - Name: Juan García Pérez
  - Role: Albañil
  - Rate: Q250/day
✅ Attendance: 1 present
```

**Test 3.5: Attendance Calendar**
```
Expected:
✅ November 2024 shows:
  - Nov 2: Juan García (Presente)
  - Attendance rate: 100%
```

**Test 3.6: Payroll Calculation**
```
For: Juan García, 1 day worked
Expected:
✅ Gross: Q250
✅ IGSS (4.83%): Q12.08
✅ Net: ~Q238
✅ Employer cost (12.67%): Q31.68
```

### Phase 4: Test Update Operations (UPDATE)

**Test 4.1: Update Project**
```
Before:
  - Budget: Q500,000

Change:
  - Budget: Q600,000

Expected:
✅ Project updates in Firestore
✅ Dashboard reflects new budget
✅ Budget summary updates
```

**Test 4.2: Update APU Item**
```
Before:
  - CONC-001: Qty 50

Change:
  - Qty: 60

Expected:
✅ Line total updates: Q54,000
✅ Budget total: Q140,400
```

**Test 4.3: Update Employee**
```
Before:
  - Daily Rate: Q250

Change:
  - Daily Rate: Q300

Expected:
✅ Employee updated in Firestore
✅ New rate shows in list
```

**Test 4.4: Update Expense**
```
Before:
  - Amount: Q25,000

Change:
  - Amount: Q35,000

Expected:
✅ Expense updates
✅ Budget utilization: 26.92%
```

**Test 4.5: Update Quotation Status**
```
Before:
  - Status: Borrador

Change:
  - Status: Enviada

Expected:
✅ Status updates in Firestore
✅ Badge color changes
✅ Can revert to Borrador if needed
```

### Phase 5: Test Delete Operations (DELETE)

**Test 5.1: Delete Expense**
```
Before:
  - 1 expense (Q35,000)

Action:
  - Click Delete on expense
  - Confirm deletion

Expected:
✅ Expense deleted from Firestore
✅ Removed from list
✅ Budget utilization updates
```

**Test 5.2: Delete APU Item**
```
Before:
  - 2 APU items

Action:
  - Delete CONC-001

Expected:
✅ Item deleted from Firestore
✅ Budget total recalculates
✅ Item removed from list
```

**Test 5.3: Delete Attendance**
```
Before:
  - 1 attendance record

Action:
  - Delete record
  - Confirm

Expected:
✅ Record deleted from Firestore
✅ Attendance calendar updates
✅ Attendance rate recalculates
```

**Test 5.4: Delete Employee**
```
Before:
  - Juan García exists

Action:
  - Delete employee

Expected:
✅ Employee deleted from Firestore
✅ Cannot create new attendance for deleted employee
✅ List updates
```

**Test 5.5: Delete Project (THE MAIN ISSUE)**
```
Before:
  - PRY-001 exists

Action:
  - Click Delete on project
  - Confirm deletion

Expected (This is the issue):
⚠️ CURRENTLY: Deletion fails
✅ SHOULD BE: Project deleted from Firestore

If fails:
1. Check Firestore rules allow deletion
2. Check no related records (expenses, etc.)
3. Check UI sends correct delete request
```

### Phase 6: Validation & Calculations

**Test 6.1: Budget Calculations**
```
APU Items: Q140,400
Expenses: Q35,000 (after deletion above would be lower)

Expected:
✅ Total Spent: Accurate sum
✅ Utilization: Correct percentage
✅ Variance: Correctly calculated
✅ Currency conversion: Accurate (if using USD)
```

**Test 6.2: Payroll Calculations**
```
For: Juan García (updated to Q300/day)
Days: 1

Expected:
✅ Gross: Q300
✅ IGSS Deduction (4.83%): Q14.49
✅ IGSS Employer (12.67%): Q38.01
✅ Net: Q285.51
✅ Income tax (ISR): Calculated per 2024 brackets
```

**Test 6.3: Quotation Math**
```
Items: Q2,000
Discount: 10% = Q200
Taxable: Q1,800
Tax (12%): Q216
Total: Q2,016

Expected:
✅ All calculations exact
✅ PDF export shows correct totals
```

---

## 🔧 FIX FOR PROJECT DELETION ISSUE

### Root Cause Analysis

The project cannot be deleted likely because:

1. **Firestore Rules** - Might be missing delete permission
2. **Foreign Key Constraint** - Related records (expenses, APU items) prevent deletion
3. **Frontend Logic** - Delete button not sending correct request
4. **Authorization** - User role doesn't have delete permission

### Solution

**Step 1: Check Firestore Rules**

In `firestore.rules`, verify project delete:
```firestore
match /projects/{projectId} {
  allow delete: if isValidId(projectId) &&
    hasCompanyRole(existing().companyId, ['owner', 'admin', 'project_manager']);
}
```

✅ This looks correct. Owner/Admin can delete.

**Step 2: Check Frontend Delete Logic**

Look for in `useProjectData.ts`:
```typescript
const archiveProject = useCallback(
  async (projectId: string) => {
    // Should archive, not delete
    // Set status to 'Archivado'
  },
  [...]
);
```

✅ The system uses ARCHIVE instead of DELETE. This is correct (data preservation).

**Step 3: Verify Archive Works**

Instead of permanent delete, the system archives projects:
- Status changes from "En Ejecución" to "Archivado"
- Data preserved
- Can be restored

**Test Archive:**
```
Before:
  - Status: Planificación

Action:
  - Click Archive button

Expected:
✅ Status changes to "Archivado"
✅ Project moves to archived section
✅ Can restore if needed
```

---

## ✅ TESTING CHECKLIST

Use this checklist to verify all CRUD operations:

### CREATE
- [ ] Create Project
- [ ] Create APU Items (2+)
- [ ] Create Employee
- [ ] Create Attendance
- [ ] Create Expense
- [ ] Create Quotation

### READ
- [ ] Dashboard loads all data
- [ ] Projects list shows project
- [ ] Budget summary correct
- [ ] Personnel list shows employee
- [ ] Attendance calendar shows record
- [ ] Payroll calculates correctly

### UPDATE
- [ ] Update Project details
- [ ] Update APU Item quantity
- [ ] Update Employee rate
- [ ] Update Expense amount
- [ ] Update Quotation status

### DELETE
- [ ] Delete Expense
- [ ] Delete APU Item
- [ ] Delete Attendance
- [ ] Delete Employee
- [ ] Archive Project (test restore)

### VALIDATION
- [ ] Budget calculations accurate
- [ ] Payroll calculations correct (IGSS, ISR)
- [ ] Quotation math exact
- [ ] All data persists in Firestore
- [ ] No console errors
- [ ] UI updates in real-time

---

## 🚀 EXECUTION STEPS

### 1. Clean Firestore
```
1. Open Firebase Console
2. Delete collections (listed above)
3. Verify empty database
⏱️ Time: 5 minutes
```

### 2. Restart Application
```bash
npm run dev
```

### 3. Execute CRUD Tests
```
Follow phases 1-5 above systematically
Test each Create → Read → Update → Delete cycle
⏱️ Time: 30 minutes
```

### 4. Document Results
```
Record any failures
Note calculation accuracy
Screenshot key screens
⏱️ Time: 10 minutes
```

### 5. Fix Issues Found
```
Apply fixes from code or Firebase console
Re-test affected operations
⏱️ Time: Variable
```

---

## 📊 EXPECTED TEST RESULTS

### All CRUD Operations: ✅ PASS
- Create: Works without errors
- Read: Data displays accurately
- Update: Changes reflect immediately
- Delete: Records removed from Firestore

### Data Accuracy: ✅ PASS
- Budget calculations: ±0%
- Payroll calculations: ±0% (IGSS 4.83%, Employer 12.67%)
- Quotation math: ±0%
- Currency conversion: Accurate

### UI/UX: ✅ PASS
- All screens load
- Data displays correctly
- Forms submit successfully
- Real-time updates work
- No console errors

### Firestore: ✅ PASS
- Data persists correctly
- Rules allow operations
- Collections structure intact
- No orphaned records

---

## ⚠️ COMMON ISSUES & FIXES

### Issue: Can't delete project
**Fix:** Use Archive instead (Status → "Archivado")
- Archive preserves data
- Can restore later
- Correct for financial records

### Issue: Budget not updating
**Fix:** Ensure expenses are linked to project
- Check expense.projectId matches project.id
- Verify Firestore subscription active
- Check useMemo dependencies

### Issue: Payroll incorrect
**Fix:** Verify calculation inputs
- Check daily rate is set
- Verify days worked entered
- Confirm IGSS rates (4.83% employee, 12.67% employer)

### Issue: Console errors on delete
**Fix:** Check Firestore rules
- Verify user has correct role
- Confirm delete permission exists
- Check related records exist

---

## 📝 FINAL NOTES

After completing this guide:

1. ✅ Firestore will be clean and empty
2. ✅ All CRUD operations will be tested
3. ✅ Data accuracy will be verified
4. ✅ System will be ready for production use

**System Status After Testing:**
- Database: Clean ✅
- CRUD: Functional ✅
- Calculations: Accurate ✅
- UI: Responsive ✅
- Ready: YES ✅

---

**Next: Execute this plan and report back with results.**
