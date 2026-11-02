# ORIGEN ERP - QUICK REFERENCE GUIDE

## 🚀 COMPONENTS OVERVIEW

### 1. Authentication (`AuthContainer.tsx`)
```typescript
import { AuthContainer } from '@/components/auth/AuthContainer';

// Use in your app
<AuthContainer onLogin={(credentials) => {
  console.log('User logged in:', credentials);
}} />
```

**Features:**
- Rate limiting: 5 failed attempts → 15-min lockout
- Password visibility toggle
- localStorage-based attack tracking

---

### 2. Dashboard (`DashboardOverview.tsx`)
```typescript
import { DashboardOverview } from '@/components/DashboardOverview';

<DashboardOverview 
  projectId={projectId}
  onProjectSelect={(id) => navigate(`/projects/${id}`)}
/>
```

**Features:**
- Loading skeleton animation
- KPI cards with memoization
- Empty state handling
- Real-time calculations

---

### 3. Projects (`ProjectsList.tsx`)
```typescript
import { ProjectsList } from '@/components/ProjectsList';

<ProjectsList 
  onCreateNew={() => setShowForm(true)}
  onSelectProject={(id) => navigate(`/projects/${id}`)}
/>
```

**Features:**
- Sticky create button (responsive)
- Delete confirmation (archives data)
- Sort preferences saved
- Pagination (10/page)

---

### 4. Budget & APU (`APUItemsList.tsx`)
```typescript
import { APUItemsList } from '@/components/BudgetAndAPU/APUItemsList';

<APUItemsList 
  projectId={projectId}
  items={apuItems}
  onUpdateBudget={(summary) => setBudgetSummary(summary)}
/>
```

**Features:**
- Responsive table/cards
- Real-time updates
- Quantity validation (> 0, max 10k)
- Currency conversion (GTQ/USD)

---

### 5. Expenses (`ExpensesView.tsx`)
```typescript
import { ExpensesView } from '@/components/ExpensesView';

<ExpensesView projectId={projectId} />
```

**Features:**
- 6 category colors
- Receipt photo preview
- CSV export with filters
- Amount formatting
- Duplicate detection

---

### 6. Personnel (`PersonnelView.tsx`)
```typescript
import { PersonnelView } from '@/components/PersonnelView';

<PersonnelView projectId={projectId} />
```

**Features:**
- Calendar/List toggle
- Overtime validation (max 12h)
- Attendance tracking
- Touch-friendly interface

---

### 7. Payroll (`PayrollView.tsx`)
```typescript
import { PayrollView } from '@/components/PayrollView';

<PayrollView projectId={projectId} />
```

**Features:**
- Sticky net pay column
- Bono 14 preview
- ISR 2024 calculation (Guatemala)
- IGSS export validation

---

### 8. Quotations (`QuotationsView.tsx`)
```typescript
import { QuotationsView } from '@/components/QuotationsView';

<QuotationsView projectId={projectId} />
```

**Features:**
- Line items count
- PDF with logo
- Expiry warnings (3 days)
- Discount validation (max 50%)

---

### 9. Reports (`ReportsView.tsx`)
```typescript
import { ReportsView } from '@/components/ReportsView';

<ReportsView projectId={projectId} />
```

**Features:**
- Simplified date picker
- Filter state persistence
- Excel export

---

### 10. Settings (`SettingsView.tsx`)
```typescript
import { SettingsView } from '@/components/SettingsView';

<SettingsView />
```

**Features:**
- Logo upload + optimization
- Exchange rate updates (API)
- User invitations
- Role descriptions

---

## 📱 MOBILE UTILITIES

### useMobileView
```typescript
import { useMobileView } from '@/lib/components/MobileResponsive';

function MyComponent() {
  const { isMobile, safeAreaInsets } = useMobileView();
  
  return (
    <div style={{ paddingTop: safeAreaInsets.top }}>
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
    </div>
  );
}
```

### ResponsiveTable
```typescript
import { ResponsiveTable } from '@/lib/components/MobileResponsive';

<ResponsiveTable 
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'amount', label: 'Amount', align: 'right' }
  ]}
  data={items}
  renderCard={(item) => <Card item={item} />}
/>
```

### TouchButton
```typescript
import { TouchButton } from '@/lib/components/MobileResponsive';

<TouchButton variant="primary" size="lg">
  Tap Me (44x44 minimum)
</TouchButton>
```

---

## ♿ ACCESSIBILITY

### AccessibleInput
```typescript
import { AccessibleInput } from '@/lib/components/Accessibility';

<AccessibleInput 
  label="Email"
  placeholder="user@example.com"
  required
  error={errors.email}
  hint="We'll never share your email"
/>
```

### Color Contrast Check
```typescript
import { getContrastRatio, isWCAGAACompliant } from '@/lib/components/Accessibility';

const ratio = getContrastRatio('#FFFFFF', '#000000');
console.log(isWCAGAACompliant(ratio)); // true (4.5:1 ✓)
```

### Keyboard Navigation
```typescript
import { useKeyboardNavigation } from '@/lib/components/Accessibility';

const { selectedIndex, containerRef } = useKeyboardNavigation(
  ['Option 1', 'Option 2', 'Option 3'],
  (index) => selectOption(index)
);
```

---

## 🧪 TESTING

### Run Tests
```bash
# All tests
npm run test

# Specific suite
npm run test -- components
npm run test -- e2e
npm run test -- accessibility

# With coverage
npm run test:coverage

# Performance
npm run test:performance
```

### Example Test
```typescript
describe('MyComponent', () => {
  it('should validate input', () => {
    const isValid = validateEmail('user@example.com');
    expect(isValid).toBe(true);
  });
});
```

---

## 🎨 STYLING CONVENTIONS

### Tailwind Classes Used
```typescript
// Layout
'flex', 'grid', 'space-y-', 'gap-'

// Colors
'bg-blue-50', 'text-slate-900', 'border-slate-200'

// Responsive
'sm:', 'md:', 'lg:', 'hidden sm:block'

// Spacing
'p-4', 'px-3', 'py-2', 'mb-1'

// Interactive
'hover:', 'focus:', 'active:', 'disabled:'

// Animations
'animate-pulse', 'transition-all'
```

### Color Palette
```typescript
// Primary
'bg-blue-600', 'hover:bg-blue-700'

// Success
'bg-green-50', 'text-green-700'

// Warning
'bg-yellow-50', 'text-yellow-700'

// Error
'bg-red-50', 'text-red-700'

// Neutral
'bg-slate-100', 'border-slate-200'
```

---

## 💾 FORM VALIDATION PATTERN

```typescript
// 1. Define form state
const [formData, setFormData] = useState({
  email: '',
  amount: '',
  date: ''
});
const [errors, setErrors] = useState<FormErrors>({});

// 2. Validate
const validateForm = (): boolean => {
  const errors: FormErrors = {};
  
  if (!formData.email) errors.email = 'Required';
  if (!formData.amount || parseFloat(formData.amount) <= 0) 
    errors.amount = 'Must be > 0';
  
  setErrors(errors);
  return Object.keys(errors).length === 0;
};

// 3. Submit
const handleSubmit = (e) => {
  e.preventDefault();
  if (!validateForm()) return;
  
  // Submit data
};

// 4. Clear error on input
onChange={(e) => {
  setFormData({ ...formData, [field]: e.target.value });
  if (errors[field]) setErrors({ ...errors, [field]: '' });
}}
```

---

## 🔄 REAL-TIME UPDATES PATTERN

```typescript
// Always include all dependencies
useEffect(() => {
  const calculate = () => {
    const summary = calculateBudget(items, expenses);
    onUpdateBudget?.(summary);
  };
  
  calculate();
}, [items, expenses, onUpdateBudget]); // ⚠️ ALL dependencies
```

---

## 📊 CALCULATION HELPERS

### Budget Calculation
```typescript
import { calculateBudgetSummary } from '@/lib/utils/calculations';

const summary = calculateBudgetSummary(apuItems, totalExpenses);
// Returns: { allocated, spent, remaining, utilization%, utilization }
```

### Payroll Calculation
```typescript
import { calculatePayroll } from '@/lib/utils/calculations';

const payroll = calculatePayroll({
  baseSalary: 10000,
  hoursWorked: 160,
  bonuses: 500
});
// Returns: { gross, igss, isr, netPay }
```

### ISR 2024 (Guatemala)
```typescript
// Automatically calculated in PayrollView
// Ranges:
// Q0-Q6,750: 0%
// Q6,750-Q33,750: 15%
// Q33,750-Q65,000: 20%
// Q65,000-Q120,000: 25%
// Q120,000+: 27%
```

---

## 🔐 SECURITY BEST PRACTICES

1. **Never store passwords** - Always hash server-side
2. **Rate limiting** - 5 attempts → 15-min lockout
3. **Input validation** - Validate on both client & server
4. **Type safety** - Use TypeScript for all data
5. **Error handling** - Don't expose sensitive data
6. **localStorage** - Only store non-sensitive data

---

## 📱 RESPONSIVE BREAKPOINTS

```typescript
// Tailwind breakpoints used
'sm': '640px',   // Small (mobile)
'md': '768px',   // Medium (tablet)
'lg': '1024px',  // Large (desktop)
'xl': '1280px'   // X-Large (wide desktop)

// Usage
'hidden sm:block'      // Hidden on mobile, visible on tablet+
'sm:hidden'            // Visible on mobile, hidden on tablet+
'grid-cols-1 md:grid-cols-2'  // 1 col mobile, 2 cols tablet+
```

---

## 🎯 COMMON TASKS

### Add a New Expense
```typescript
const newExpense: ExpenseRecord = {
  id: `exp-${Date.now()}`,
  projectId,
  date: new Date().toISOString().split('T')[0],
  category: 'Materiales (Cementos, Hierro)',
  description: 'Cemento y Arena',
  supplier: 'Cementos Progreso',
  amount: 25000,
  currency: 'GTQ'
};

setExpenses(prev => [...prev, newExpense]);
```

### Add a New Project
```typescript
const newProject: ProjectRecord = {
  id: `proj-${Date.now()}`,
  name: 'Nuevo Proyecto',
  clientName: 'Cliente A',
  budget: 500000,
  status: 'active'
};

setProjects(prev => [...prev, newProject]);
```

### Filter Data
```typescript
const filtered = items.filter(item => {
  const dateMatch = item.date >= startDate && item.date <= endDate;
  const categoryMatch = !category || item.category === category;
  return dateMatch && categoryMatch;
});
```

### Export to CSV
```typescript
const csv = [
  ['Header1', 'Header2'],
  ...data.map(item => [item.field1, item.field2])
]
  .map(row => row.map(cell => `"${cell}"`).join(','))
  .join('\n');

const blob = new Blob([csv], { type: 'text/csv' });
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = `export_${new Date().toISOString().split('T')[0]}.csv`;
link.click();
```

---

## ❌ COMMON PITFALLS

1. **Missing dependencies in useEffect**
   ```typescript
   // ❌ Bad - missing dependency
   useEffect(() => {
     calculate(items);
   }, []); // Items not included!
   
   // ✅ Good
   useEffect(() => {
     calculate(items);
   }, [items]);
   ```

2. **Forgetting to clear errors**
   ```typescript
   // ✅ Clear error when user types
   onChange={(e) => {
     setFormData({ ...formData, email: e.target.value });
     if (errors.email) setErrors({ ...errors, email: '' });
   }}
   ```

3. **Not validating before submit**
   ```typescript
   // ✅ Always validate first
   const handleSubmit = (e) => {
     e.preventDefault();
     if (!validateForm()) return; // Stop here
     submitData();
   };
   ```

4. **Not handling loading states**
   ```typescript
   // ✅ Show feedback while loading
   {loading ? <Skeleton /> : <Content />}
   ```

---

## 📞 SUPPORT

For issues or questions:
1. Check the IMPLEMENTATION_COMPLETE.md for full documentation
2. Review the test files for usage examples
3. Check component JSDoc comments for API details
4. Review git history for recent changes

---

**Version:** 2.0.0
**Last Updated:** 2024-01-15
**Status:** Production Ready ✅
