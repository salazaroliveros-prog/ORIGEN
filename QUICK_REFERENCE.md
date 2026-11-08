---
contentType: Reference
title: Quick reference guide — ORIGEN ERP
---

# Quick reference guide — ORIGEN ERP

## Components overview

### 1. Authentication (`AuthContainer.tsx`)

```typescript
import { AuthContainer } from '@/components/auth/AuthContainer';

// Use in your app
<AuthContainer onLogin={(credentials) => {
  console.log('User logged in:', credentials);
}} />
```

Features:

- Rate limiting: 5 failed attempts → 15-min lockout
- Password visibility toggle
- localStorage-based attack tracking

### 2. Dashboard (`DashboardOverview.tsx`)

```typescript
import { DashboardOverview } from '@/components/DashboardOverview';

<DashboardOverview
  projectId={projectId}
  onProjectSelect={(id) => navigate(`/projects/${id}`)}
/>
```

Features:

- Loading skeleton animation
- KPI cards with memoization
- Empty state handling
- Real-time calculations

### 3. Projects (`ProjectsList.tsx`)

```typescript
import { ProjectsList } from '@/components/ProjectsList';

<ProjectsList
  onCreateNew={() => setShowForm(true)}
  onSelectProject={(id) => navigate(`/projects/${id}`)}
/>
```

Features:

- Sticky create button (responsive)
- Delete confirmation (archives data)
- Sort preferences saved
- Pagination (10 per page)

### 4. Budget and APU (`APUItemsList.tsx`)

```typescript
import { APUItemsList } from '@/components/BudgetAndAPU/APUItemsList';

<APUItemsList
  projectId={projectId}
  items={apuItems}
  onUpdateBudget={(summary) => setBudgetSummary(summary)}
/>
```

Features:

- Responsive table and cards
- Real-time updates
- Quantity validation (greater than 0, max 10,000)
- Currency conversion (GTQ/USD)

### 5. Expenses (`ExpensesView.tsx`)

```typescript
import { ExpensesView } from '@/components/ExpensesView';

<ExpensesView projectId={projectId} />
```

Features:

- 6 category colors
- Receipt photo preview
- CSV export with filters
- Amount formatting
- Duplicate detection

### 6. Personnel (`PersonnelView.tsx`)

```typescript
import { PersonnelView } from '@/components/PersonnelView';

<PersonnelView projectId={projectId} />
```

Features:

- Calendar and list toggle
- Overtime validation (max 12h)
- Attendance tracking
- Touch-friendly interface

### 7. Payroll (`PayrollView.tsx`)

```typescript
import { PayrollView } from '@/components/PayrollView';

<PayrollView projectId={projectId} />
```

Features:

- Sticky net pay column
- Bono 14 preview
- ISR 2024 calculation (Guatemala)
- IGSS export validation

### 8. Quotations (`QuotationsView.tsx`)

```typescript
import { QuotationsView } from '@/components/QuotationsView';

<QuotationsView projectId={projectId} />
```

Features:

- Line items count
- PDF with logo
- Expiry warnings (3 days)
- Discount validation (max 50 percent)

### 9. Reports (`ReportsView.tsx`)

```typescript
import { ReportsView } from '@/components/ReportsView';

<ReportsView projectId={projectId} />
```

Features:

- Simplified date picker
- Filter state persistence
- Excel export

### 10. Settings (`SettingsView.tsx`)

```typescript
import { SettingsView } from '@/components/SettingsView';

<SettingsView />
```

Features:

- Logo upload and optimization
- Exchange rate updates (API)
- User invitations
- Role descriptions

## Mobile utilities

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

## Accessibility

### AccessibleInput

```typescript
import { AccessibleInput } from '@/lib/components/Accessibility';

<AccessibleInput
  label="Email"
  placeholder="user@example.com"
  required
  error={errors.email}
  hint="We will never share your email"
/>
```

### Color contrast check

```typescript
import { getContrastRatio, isWCAGAACompliant } from '@/lib/components/Accessibility';

const ratio = getContrastRatio('#FFFFFF', '#000000');
console.log(isWCAGAACompliant(ratio)); // true (4.5:1)
```

### Keyboard navigation

```typescript
import { useKeyboardNavigation } from '@/lib/components/Accessibility';

const { selectedIndex, containerRef } = useKeyboardNavigation(
  ['Option 1', 'Option 2', 'Option 3'],
  (index) => selectOption(index)
);
```

## Testing

### Run tests

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

### Example test

```typescript
describe('MyComponent', () => {
  it('should validate input', () => {
    const isValid = validateEmail('user@example.com');
    expect(isValid).toBe(true);
  });
});
```

## Styling conventions

### Tailwind classes used

| Category    | Classes                                            |
| ----------- | -------------------------------------------------- |
| Layout      | `flex`, `grid`, `space-y-`, `gap-`                 |
| Colors      | `bg-blue-50`, `text-slate-900`, `border-slate-200` |
| Responsive  | `sm:`, `md:`, `lg:`, `hidden sm:block`             |
| Spacing     | `p-4`, `px-3`, `py-2`, `mb-1`                      |
| Interactive | `hover:`, `focus:`, `active:`, `disabled:`         |
| Animations  | `animate-pulse`, `transition-all`                  |

### Color palette

| Role    | Classes                            |
| ------- | ---------------------------------- |
| Primary | `bg-blue-600`, `hover:bg-blue-700` |
| Success | `bg-green-50`, `text-green-700`    |
| Warning | `bg-yellow-50`, `text-yellow-700`  |
| Error   | `bg-red-50`, `text-red-700`        |
| Neutral | `bg-slate-100`, `border-slate-200` |

## Form validation pattern

```typescript
// 1. Define form state
const [formData, setFormData] = useState({
  email: '',
  amount: '',
  date: '',
});
const [errors, setErrors] = useState<FormErrors>({});

// 2. Validate
const validateForm = (): boolean => {
  const errors: FormErrors = {};

  if (!formData.email) errors.email = 'Required';
  if (!formData.amount || parseFloat(formData.amount) <= 0) {
    errors.amount = 'Must be greater than 0';
  }

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

## Real-time updates pattern

```typescript
// Always include all dependencies
useEffect(() => {
  const calculate = () => {
    const summary = calculateBudget(items, expenses);
    onUpdateBudget?.(summary);
  };

  calculate();
}, [items, expenses, onUpdateBudget]); // All dependencies
```

## Calculation helpers

### Budget calculation

```typescript
import { calculateBudgetSummary } from '@/lib/utils/calculations';

const summary = calculateBudgetSummary(apuItems, totalExpenses);
// Returns: { allocated, spent, remaining, utilizationPercent, utilization }
```

### Payroll calculation

```typescript
import { calculatePayroll } from '@/lib/utils/calculations';

const payroll = calculatePayroll({
  baseSalary: 10000,
  hoursWorked: 160,
  bonuses: 500,
});
// Returns: { gross, igss, isr, netPay }
```

### ISR 2024 (Guatemala)

Automatically calculated in PayrollView.

Ranges:

- Q0–Q6,750: 0 percent
- Q6,750–Q33,750: 15 percent
- Q33,750–Q65,000: 20 percent
- Q65,000–Q120,000: 25 percent
- Q120,000+: 27 percent

## Security best practices

1. Never store passwords — always hash server-side
2. Rate limiting — 5 attempts → 15-min lockout
3. Input validation — validate on both client and server
4. Type safety — use TypeScript for all data
5. Error handling — do not expose sensitive data
6. localStorage — only store non-sensitive data

## Responsive breakpoints

| Breakpoint | Value   | Use                        |
| ---------- | ------- | -------------------------- |
| sm         | 640 px  | Small (mobile)             |
| md         | 768 px  | Medium (tablet)            |
| lg         | 1024 px | Large (desktop)            |
| xl         | 1280 px | Extra-large (wide desktop) |

Usage:

- `hidden sm:block` — hidden on mobile, visible on tablet and up
- `sm:hidden` — visible on mobile, hidden on tablet and up
- `grid-cols-1 md:grid-cols-2` — 1 column on mobile, 2 columns on tablet and up

## Common tasks

### Add a new expense

```typescript
const newExpense: ExpenseRecord = {
  id: `exp-${Date.now()}`,
  projectId,
  date: new Date().toISOString().split('T')[0],
  category: 'Materiales (Cementos, Hierro)',
  description: 'Cemento y arena',
  supplier: 'Cementos Progreso',
  amount: 25000,
  currency: 'GTQ',
};

setExpenses((prev) => [...prev, newExpense]);
```

### Add a new project

```typescript
const newProject: ProjectRecord = {
  id: `proj-${Date.now()}`,
  name: 'Nuevo Proyecto',
  clientName: 'Cliente A',
  budget: 500000,
  status: 'active',
};

setProjects((prev) => [...prev, newProject]);
```

### Filter data

```typescript
const filtered = items.filter((item) => {
  const dateMatch = item.date >= startDate && item.date <= endDate;
  const categoryMatch = !category || item.category === category;
  return dateMatch && categoryMatch;
});
```

### Export to CSV

```typescript
const csv = [['Header1', 'Header2'], ...data.map((item) => [item.field1, item.field2])]
  .map((row) => row.map((cell) => `"${cell}"`).join(','))
  .join('\n');

const blob = new Blob([csv], { type: 'text/csv' });
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = `export_${new Date().toISOString().split('T')[0]}.csv`;
link.click();
```

## Common pitfalls

### Missing dependencies in useEffect

```typescript
// Bad — missing dependency
useEffect(() => {
  calculate(items);
}, []); // Items not included!

// Good
useEffect(() => {
  calculate(items);
}, [items]);
```

### Forgetting to clear errors

```typescript
// Clear error when user types
onChange={(e) => {
  setFormData({ ...formData, email: e.target.value });
  if (errors.email) setErrors({ ...errors, email: '' });
}}
```

### Not validating before submit

```typescript
// Always validate first
const handleSubmit = (e) => {
  e.preventDefault();
  if (!validateForm()) return; // Stop here
  submitData();
};
```

### Not handling loading states

```typescript
// Show feedback while loading
{loading ? <Skeleton /> : <Content />}
```

## Support

For issues or questions:

1. Check `IMPLEMENTATION_COMPLETE.md` for full documentation
2. Review the test files for usage examples
3. Check component JSDoc comments for API details
4. Review git history for recent changes

Version: 2.0.0  
Last updated: January 15, 2024  
Status: Production ready
