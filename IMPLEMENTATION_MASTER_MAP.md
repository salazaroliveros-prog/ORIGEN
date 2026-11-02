# ORIGEN ERP - IMPLEMENTATION MASTER MAP
**Comprehensive Map of All 54 Fixes + Additional Implementations**

---

## 🎯 OVERVIEW

This document maps every fix mentioned in the SCREEN_BY_SCREEN_TESTING_REPORT.md to:
1. The specific code file(s) to modify
2. The exact implementation needed
3. Testing requirements
4. Priority level

**Total Implementations Required:** 50+ features/fixes  
**Status:** Ready for development

---

## 📊 IMPLEMENTATION SUMMARY

| Layer | Count | Category |
|-------|-------|----------|
| **Screen UI** | 32 | Login, Dashboard, Projects, Budget, Expenses, Personnel, Payroll, Quotations, Reports, Settings |
| **Mobile/Responsive** | 3 | Tables, Modals, Keyboard |
| **Accessibility** | 3 | ARIA, Keyboard Nav, Color Contrast |
| **Performance** | 3 | Caching, Splitting, Lazy Load |
| **Testing** | 4 | Component, E2E, Accessibility, Benchmarks |
| **Cross-cutting** | 5 | Error handling, Logging, Validation, etc. |
| **TOTAL** | **50** | **All layers** |

---

## 🔴 PRIORITY 1 (CRITICAL - Must Implement First)

### 1.1 Authentication & Security

**FILE: `components/auth/AuthContainer.tsx` or `pages/login.tsx`**

**Implementation 1.1.1: Rate Limiting (5-attempt lock)**
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
    const timer = setTimeout(() => {
      setIsLocked(false);
      setLoginAttempts(0);
    }, 15 * 60 * 1000); // 15 minutes
    setLockTimer(timer);
    toast.error('Account locked due to too many failed attempts.');
    return;
  }
  
  try {
    // Existing login logic
    const result = await signInWithEmail(email, password);
    if (result.success) {
      setLoginAttempts(0);
      // Navigate to dashboard
    } else {
      setLoginAttempts(prev => prev + 1);
      toast.error(`Invalid credentials. ${5 - loginAttempts - 1} attempts remaining.`);
    }
  } catch (error) {
    setLoginAttempts(prev => prev + 1);
  }
};

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (lockTimer) clearTimeout(lockTimer);
  };
}, [lockTimer]);
```

**Implementation 1.1.2: Password Visibility Toggle**
```typescript
const [showPassword, setShowPassword] = useState(false);

// In JSX
<div className="relative">
  <input
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="pr-10 w-full"
    placeholder="Contraseña"
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
  >
    {showPassword ? (
      <EyeOff className="h-5 w-5" />
    ) : (
      <Eye className="h-5 w-5" />
    )}
  </button>
</div>
```

**Status:** ❌ NOT IMPLEMENTED  
**Effort:** 1-2 hours  
**Test:** `npm run test -- auth`

---

### 1.2 Core Data Validation

**FILE: `lib/utils/validation.ts`** (Already exists - extend it)

**Implementation 1.2.1: Add Comprehensive Validation**
```typescript
// Already exists but needs completion
export const validationSchemas = {
  // ... existing schemas
  
  // Add missing validations
  apuQuantity: z.number().positive('Quantity must be greater than 0'),
  expenseAmount: z.number().positive('Amount must be positive'),
  projectBudget: z.number().min(1000, 'Budget minimum Q1,000'),
  dailyRate: z.number().positive('Daily rate must be positive'),
  overtimeHours: z.number().min(0).max(12, 'Maximum 12 hours allowed'),
  discountPercent: z.number().min(0).max(100, 'Discount 0-100%'),
  taxPercent: z.number().min(0).max(100, 'Tax 0-100%'),
};
```

**Status:** ✅ PARTIALLY IMPLEMENTED  
**Effort:** 30 min  
**Test:** Validation tests already exist

---

## 🟡 PRIORITY 2 (HIGH - Implement Next)

### 2.1 Dashboard Enhancements

**FILE: `components/DashboardOverview.tsx`** (Create or modify)

**Implementation 2.1.1: Loading Skeleton**
```typescript
import { Skeleton } from '@/components/ui/Skeleton';

export function DashboardOverview() {
  const { isLoading } = useProjectData();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="md:col-span-2 h-64" />
        <Skeleton className="md:col-span-2 h-64" />
      </div>
    );
  }
  
  return (
    // Existing dashboard content
  );
}
```

**Implementation 2.1.2: KPI Memoization**
```typescript
const budgetMetrics = useMemo(() => {
  if (!projects || projects.length === 0) {
    return {
      totalBudget: 0,
      totalSpent: 0,
      activeProjects: 0,
      completionRate: 0,
    };
  }
  
  return {
    totalBudget: projects.reduce((sum, p) => sum + (p.budgetTotal || 0), 0),
    totalSpent: projects.reduce((sum, p) => sum + (p.spentTotal || 0), 0),
    activeProjects: projects.filter(p => p.status !== 'Archivado').length,
    completionRate: calculateCompletionRate(projects),
  };
}, [projects]); // ← Important: add projects as dependency
```

**Implementation 2.1.3: Chart Legend Reposition**
```typescript
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
    <Legend 
      wrapperStyle={{
        paddingTop: '20px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
      }}
      verticalAlign="bottom"
    />
    {/* Chart components */}
  </LineChart>
</ResponsiveContainer>
```

**Implementation 2.1.4: Empty State UI**
```typescript
{projects.length === 0 && (
  <div className="rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
    <Building2 className="h-12 w-12 mx-auto text-slate-400 mb-4" />
    <h3 className="text-lg font-semibold text-slate-600">
      No hay proyectos activos
    </h3>
    <p className="mt-2 text-sm text-slate-500">
      Crea tu primer proyecto para comenzar a rastrear presupuesto y gastos
    </p>
    <Link href="/projects?create=true" className="mt-4 inline-block btn btn-primary">
      Crear Proyecto
    </Link>
  </div>
)}
```

**Status:** ❌ NOT IMPLEMENTED  
**Effort:** 2-3 hours  
**Test:** Create component tests

---

### 2.2 Projects List Improvements

**FILE: `components/ProjectsList.tsx`** (Create or modify)

**Implementation 2.2.1: Sticky Create Button (Mobile)**
```typescript
export function ProjectsList() {
  return (
    <div className="space-y-4 pb-20 sm:pb-0">
      {/* Project list items */}
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
      
      {/* Sticky button for mobile */}
      <div className="fixed bottom-20 right-4 sm:bottom-auto sm:right-auto sm:static sm:pt-4">
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-14 h-14 sm:w-auto sm:h-auto rounded-full sm:rounded-lg bg-sky-500 text-white shadow-lg hover:bg-sky-600 transition-colors flex items-center justify-center sm:px-4 sm:py-2 gap-2"
          aria-label="Create new project"
        >
          <Plus className="h-6 w-6" />
          <span className="hidden sm:inline">Crear Proyecto</span>
        </button>
      </div>
    </div>
  );
}
```

**Implementation 2.2.2: Delete Confirmation**
```typescript
const handleDeleteProject = (projectId: string, projectName: string) => {
  const confirmed = window.confirm(
    `¿Estás seguro que deseas archivar "${projectName}"?\n\nNo puedes deshacer esta acción.`
  );
  
  if (!confirmed) return;
  
  // Show loading
  setDeleting(projectId);
  
  archiveProject(projectId)
    .then(() => {
      toast.success('Proyecto archivado correctamente');
      setProjects(prev => prev.filter(p => p.id !== projectId));
    })
    .catch(error => {
      toast.error('Error al archivar proyecto: ' + error.message);
    })
    .finally(() => {
      setDeleting(null);
    });
};
```

**Implementation 2.2.3: Sort Preference Storage**
```typescript
const [sortBy, setSortBy] = useState<'name' | 'budget' | 'date'>('date');

useEffect(() => {
  const saved = localStorage.getItem('projectSort');
  if (saved) setSortBy(saved as any);
}, []);

const handleSort = (field: 'name' | 'budget' | 'date') => {
  setSortBy(field);
  localStorage.setItem('projectSort', field);
};

// Sort projects
const sortedProjects = useMemo(() => {
  const sorted = [...projects];
  switch (sortBy) {
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'budget':
      sorted.sort((a, b) => b.budgetTotal - a.budgetTotal);
      break;
    case 'date':
      sorted.sort((a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      break;
  }
  return sorted;
}, [projects, sortBy]);
```

**Status:** ❌ NOT IMPLEMENTED  
**Effort:** 2-3 hours

---

### 2.3 Budget/APU Screen

**FILE: `components/BudgetAndAPU.tsx` or `components/budget/APUItemsList.tsx`**

**Implementation 2.3.1: Responsive Table**
```typescript
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <table className="w-full text-xs sm:text-sm min-w-[600px]">
    <thead>
      <tr className="border-b bg-slate-50">
        <th className="text-left p-2 sm:p-3 font-semibold hidden sm:table-cell">
          Código
        </th>
        <th className="text-left p-2 sm:p-3 font-semibold">Descripción</th>
        <th className="text-right p-2 sm:p-3 font-semibold hidden md:table-cell">
          Cantidad
        </th>
        <th className="text-right p-2 sm:p-3 font-semibold hidden lg:table-cell">
          Precio Unit.
        </th>
        <th className="text-right p-2 sm:p-3 font-semibold">Total</th>
        <th className="text-center p-2 sm:p-3 font-semibold w-16">Acciones</th>
      </tr>
    </thead>
    <tbody>
      {items.map(item => (
        <tr key={item.id} className="border-b hover:bg-slate-50">
          <td className="p-2 sm:p-3 hidden sm:table-cell text-slate-500">
            {item.code}
          </td>
          <td className="p-2 sm:p-3">
            <div className="font-medium">{item.description}</div>
            <div className="text-xs text-slate-500 sm:hidden">
              {item.quantity} {item.unit} × Q{item.totalUnitCostGTQ.toLocaleString()}
            </div>
          </td>
          <td className="p-2 sm:p-3 text-right hidden md:table-cell">
            {item.quantity}
          </td>
          <td className="p-2 sm:p-3 text-right hidden lg:table-cell">
            Q{item.totalUnitCostGTQ.toLocaleString()}
          </td>
          <td className="p-2 sm:p-3 text-right font-semibold">
            Q{item.totalPriceGTQ.toLocaleString()}
          </td>
          <td className="p-2 sm:p-3 flex gap-1 justify-center">
            <button
              onClick={() => handleEdit(item)}
              className="p-1 hover:bg-blue-100 rounded"
              aria-label="Editar"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(item.id)}
              className="p-1 hover:bg-red-100 rounded"
              aria-label="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Implementation 2.3.2: Real-time Budget Updates**
```typescript
useEffect(() => {
  const calculateBudget = () => {
    const summary = calculateBudgetSummary(items, totalExpenses);
    setBudgetSummary(summary);
  };
  
  calculateBudget();
}, [items, totalExpenses]); // Both dependencies important
```

**Implementation 2.3.3: Quantity Validation**
```typescript
const handleQuantityChange = (value: string) => {
  const num = parseFloat(value);
  
  if (isNaN(num) || num <= 0) {
    setFormErrors({ ...formErrors, quantity: 'La cantidad debe ser mayor a 0' });
    return;
  }
  
  if (num > 10000) {
    setFormErrors({...formErrors, quantity: 'Cantidad muy grande (máx 10,000)'});
    return;
  }
  
  setFormData({ ...formData, quantity: num });
  setFormErrors({ ...formErrors, quantity: '' });
};
```

**Implementation 2.3.4: Currency Selector (GTQ/USD)**
```typescript
const [currency, setCurrency] = useState<'GTQ' | 'USD'>('GTQ');
const [exchangeRate, setExchangeRate] = useState(7.85);

const convertToGTQ = (amount: number) => {
  if (currency === 'GTQ') return amount;
  return convertUSDtoGTQ(amount, exchangeRate);
};

// In JSX
<div className="grid grid-cols-3 gap-2 mb-4">
  <div>
    <label className="block text-sm font-semibold mb-1">Moneda</label>
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as any)}
      className="w-full px-2 py-1 border rounded text-sm"
    >
      <option value="GTQ">Q (Quetzal)</option>
      <option value="USD">$ (Dólar)</option>
    </select>
  </div>
  {currency === 'USD' && (
    <div className="col-span-2">
      <label className="block text-sm font-semibold mb-1">Tipo de Cambio</label>
      <input
        type="number"
        value={exchangeRate}
        onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
        step="0.01"
        className="w-full px-2 py-1 border rounded text-sm"
        placeholder="7.85"
      />
    </div>
  )}
</div>

// Display converted amount
{currency === 'USD' && (
  <div className="text-sm text-slate-600 mt-2">
    ≈ Q{convertToGTQ(formData.totalPriceGTQ).toLocaleString()}
  </div>
)}
```

**Status:** ❌ NOT IMPLEMENTED  
**Effort:** 3-4 hours

---

## 🟠 PRIORITY 3 (MEDIUM - Implement After Priority 1 & 2)

### 3.1 Expenses Screen

**FILE: `components/ExpensesView.tsx`**

**Implementation 3.1.1: Standardize Category Colors**
```typescript
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Materiales (Cementos, Hierro)': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  'Mano de Obra': {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  'Maquinaria y Combustible': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  'Permisos & Licencias': {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  'Imprevistos': {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
};

// Usage
<span
  className={`px-2 py-1 rounded-full text-xs font-semibold border ${
    CATEGORY_COLORS[expense.category]?.text
  } ${CATEGORY_COLORS[expense.category]?.bg} ${CATEGORY_COLORS[expense.category]?.border}`}
>
  {expense.category}
</span>
```

**Implementation 3.1.2: Receipt Photo Preview**
```typescript
const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
const [showPreview, setShowPreview] = useState(false);

const handlePhotoUpload = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    setPreviewPhoto(e.target?.result as string);
  };
  reader.readAsDataURL(file);
};

// In JSX - Upload
<div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
  <input
    type="file"
    accept="image/*"
    onChange={(e) => {
      if (e.target.files?.[0]) {
        handlePhotoUpload(e.target.files[0]);
      }
    }}
    className="hidden"
    ref={photoInputRef}
  />
  <Camera className="h-8 w-8 mx-auto text-slate-400 mb-2" />
  <p className="text-sm text-slate-600">Haz clic o arrastra una foto</p>
  <button
    type="button"
    onClick={() => photoInputRef.current?.click()}
    className="mt-2 text-blue-500 underline text-sm"
  >
    Seleccionar archivo
  </button>
</div>

// Preview modal
{showPreview && previewPhoto && (
  <div
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onClick={() => setShowPreview(false)}
  >
    <div className="bg-white rounded-lg overflow-hidden max-h-96">
      <img src={previewPhoto} alt="Receipt" className="max-w-full max-h-96" />
      <button
        onClick={() => setShowPreview(false)}
        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-sm font-semibold"
      >
        Cerrar
      </button>
    </div>
  </div>
)}

// In list
{expense.photoUrl && (
  <button
    onClick={() => {
      setPreviewPhoto(expense.photoUrl);
      setShowPreview(true);
    }}
    className="text-blue-500 text-sm underline"
  >
    Ver foto
  </button>
)}
```

**Implementation 3.1.3: Export with Filters**
```typescript
const handleExportToCSV = () => {
  // Apply filters
  const filtered = expenses.filter(exp => {
    if (selectedCategory && exp.category !== selectedCategory) return false;
    if (selectedProject && exp.projectId !== selectedProject) return false;
    if (dateFrom && new Date(exp.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(exp.date) > new Date(dateTo)) return false;
    return true;
  });
  
  if (filtered.length === 0) {
    toast.error('No hay gastos para exportar con los filtros seleccionados');
    return;
  }
  
  // Convert to CSV
  const csv = [
    ['Fecha', 'Proyecto', 'Categoría', 'Descripción', 'Monto', 'Moneda', 'Proveedor'],
    ...filtered.map(exp => [
      exp.date,
      exp.projectName,
      exp.category,
      exp.description,
      exp.amount.toLocaleString(),
      exp.currency,
      exp.supplier,
    ]),
  ]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `gastos_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};
```

**Implementation 3.1.4: Amount Formatting**
```typescript
const handleAmountChange = (value: string) => {
  const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
  
  if (!isNaN(numValue)) {
    setFormData({
      ...formData,
      amount: numValue,
    });
  }
};

// Display formatted
<input
  type="text"
  value={
    formData.amount > 0
      ? `Q ${formData.amount.toLocaleString('es-GT', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : ''
  }
  onChange={(e) => handleAmountChange(e.target.value)}
  className="px-3 py-2 border rounded"
  placeholder="Q 0.00"
/>
```

**Implementation 3.1.5: Duplicate Detection**
```typescript
useEffect(() => {
  if (!formData.amount || !formData.supplier || !formData.date) return;
  
  const sameDay = new Date(formData.date).toDateString();
  
  const similar = expenses.filter(exp => {
    const expDay = new Date(exp.date).toDateString();
    return (
      expDay === sameDay &&
      exp.amount === formData.amount &&
      exp.supplier.toLowerCase() === formData.supplier.toLowerCase()
    );
  });
  
  if (similar.length > 0) {
    setDuplicateWarning(
      `Existe ${similar.length} gasto(s) similar(es) registrado(s) hoy: ${similar[0].description}`
    );
  } else {
    setDuplicateWarning('');
  }
}, [formData.amount, formData.supplier, formData.date, expenses]);

// Display warning
{duplicateWarning && (
  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 mt-3">
    ⚠️ {duplicateWarning}
  </div>
)}
```

**Status:** ❌ NOT IMPLEMENTED  
**Effort:** 3-4 hours

---

### 3.2 Personnel & Attendance

**FILE: `components/StaffView.tsx` or `features/attendance/AttendanceView.tsx`**

**Implementation 3.2.1: Responsive Calendar**
```typescript
const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

// Desktop shows calendar, mobile shows list
{viewMode === 'calendar' ? (
  <div className="hidden sm:block">
    <Calendar
      value={selectedDate}
      onChange={setSelectedDate}
      tileClassName={({ date }) => {
        const record = attendance.find(
          a => new Date(a.date).toDateString() === date.toDateString()
        );
        if (!record) return '';
        return record.status === 'Presente' ? 'bg-green-100' : 'bg-red-100';
      }}
    />
  </div>
) : (
  <div className="sm:hidden space-y-2">
    {attendance.map(record => (
      <div key={record.id} className="p-3 border rounded-lg bg-slate-50">
        <div className="font-semibold flex justify-between">
          <span>{record.employeeName}</span>
          <span
            className={`text-sm ${
              record.status === 'Presente' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {record.status}
          </span>
        </div>
        <div className="text-sm text-slate-500">{record.date}</div>
      </div>
    ))}
  </div>
)}

{/* Toggle button */}
<div className="sm:hidden mt-4 flex gap-2">
  <button
    onClick={() => setViewMode('calendar')}
    className={`flex-1 py-2 px-3 rounded text-sm font-semibold ${
      viewMode === 'calendar'
        ? 'bg-blue-500 text-white'
        : 'bg-slate-200 text-slate-700'
    }`}
  >
    Calendario
  </button>
  <button
    onClick={() => setViewMode('list')}
    className={`flex-1 py-2 px-3 rounded text-sm font-semibold ${
      viewMode === 'list'
        ? 'bg-blue-500 text-white'
        : 'bg-slate-200 text-slate-700'
    }`}
  >
    Lista
  </button>
</div>
```

**Implementation 3.2.2: Overtime Validation**
```typescript
const handleOvertimeChange = (hours: number) => {
  if (hours < 0) {
    toast.error('Las horas no pueden ser negativas');
    setOvertimeHours(0);
    return;
  }
  
  if (hours > 12) {
    toast.error('Máximo 12 horas de horas extra permitidas por día');
    setOvertimeHours(12);
    return;
  }
  
  setOvertimeHours(hours);
};
```

**Status:** ❌ NOT IMPLEMENTED  
**Effort:** 2-3 hours

---

### 3.3 Payroll Screen

**FILE: `components/PayrollEstimateView.tsx`**

**Implementation 3.3.1: Sticky Net Pay Column**
```typescript
<div className="overflow-x-auto">
  <table className="w-full text-sm border-collapse">
    <thead>
      <tr className="bg-slate-950 text-white">
        <th className="sticky left-0 z-10 bg-slate-950 text-left p-3">
          Empleado
        </th>
        <th className="text-right p-3">Días</th>
        <th className="text-right p-3">Salario Bruto</th>
        <th className="text-right p-3">IGSS (4.83%)</th>
        <th className="text-right p-3">ISR</th>
        <th className="sticky right-0 z-10 bg-slate-950 text-right p-3 font-bold">
          Neto
        </th>
      </tr>
    </thead>
    <tbody>
      {payrolls.map((payroll, idx) => (
        <tr key={payroll.employeeId} className="border-b hover:bg-slate-50">
          <td className="sticky left-0 z-10 bg-white p-3">
            {payroll.employeeName}
          </td>
          <td className="text-right p-3">{payroll.daysWorked}</td>
          <td className="text-right p-3">
            Q{payroll.grossSalary.toLocaleString()}
          </td>
          <td className="text-right p-3">
            Q{payroll.igssEmployeeDeduction.toLocaleString()}
          </td>
          <td className="text-right p-3">
            Q{payroll.incomeTax.toLocaleString()}
          </td>
          <td className="sticky right-0 z-10 bg-blue-50 text-right p-3 font-bold text-lg">
            Q{payroll.netPay.toLocaleString()}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Implementation 3.3.2: Bono 14 Preview (December)**
```typescript
const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();
const isDeclemberPayroll = currentMonth === 11; // December = 11

{isDeclemberPayroll && (
  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <h3 className="font-semibold text-blue-900 mb-3">
      🎄 Bono 14 - Diciembre {currentYear}
    </h3>
    <div className="space-y-2">
      {payrolls.map(payroll => {
        const bono14 = calculateBono14(payroll.dailyRate, 365);
        return (
          <div key={payroll.employeeId} className="flex justify-between text-sm">
            <span className="text-blue-800">{payroll.employeeName}</span>
            <span className="font-semibold text-blue-900">
              Q{bono14.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
    <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between font-bold">
      <span>Total Bono 14:</span>
      <span className="text-blue-900">
        Q
        {payrolls
          .reduce((sum, p) => sum + calculateBono14(p.dailyRate, 365), 0)
          .toLocaleString()}
      </span>
    </div>
  </div>
)}
```

**Implementation 3.3.3: Income Tax (ISR 2024)**

Already implemented in `lib/utils/calculations.ts` - just ensure it's being used:

```typescript
import { calculatePayroll } from '@/lib/utils/calculations';

const payrolls = employees.map(emp => {
  const payroll = calculatePayroll(emp, daysWorked);
  return payroll; // Already includes incomeTax
});
```

**Status:** ✅ PARTIALLY IMPLEMENTED (ISR done, UI fixes needed)  
**Effort:** 2-3 hours

---

## 🟢 PRIORITY 4 (LOW - Polish & Enhancement)

### 4.1 Quotations

**FILE: `components/CotizacionesView.tsx`**

**Implementation 4.1.1: Show Line Items Count in List**
```typescript
<td className="p-3">
  <div className="flex justify-between items-center">
    <span className="font-semibold">Q{quote.totalGTQ.toLocaleString()}</span>
    <span className="text-xs text-slate-500 ml-2">
      ({quote.items.length} líneas)
    </span>
  </div>
</td>
```

**Implementation 4.1.2: Add Logo to PDF**
```typescript
import { jsPDF } from 'jspdf';

const generateQuotePDF = async (quote: QuoteRecord) => {
  const doc = new jsPDF();
  let yPosition = 20;
  
  // Add company logo
  if (company?.logoUrl) {
    try {
      const img = await fetch(company.logoUrl);
      const blob = await img.blob();
      const dataUrl = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      
      doc.addImage(dataUrl, 'PNG', 20, 10, 30, 20);
      yPosition = 40;
    } catch (error) {
      console.error('Error adding logo:', error);
    }
  }
  
  // Add company name
  doc.setFontSize(16);
  doc.text(company?.companyName || 'COTIZACIÓN', 60, 20, { maxWidth: 130 });
  
  // Rest of PDF generation...
  
  return doc;
};
```

**Implementation 4.1.3: Expiration Warning**
```typescript
const getDaysUntilExpiration = (validUntil: string) => {
  const expiryDate = new Date(validUntil);
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// In component
{quote.validUntil && (
  (() => {
    const daysLeft = getDaysUntilExpiration(quote.validUntil);
    if (daysLeft < 0) {
      return (
        <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
          Expirada hace {Math.abs(daysLeft)} días
        </span>
      );
    }
    if (daysLeft === 0) {
      return (
        <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
          Vence hoy
        </span>
      );
    }
    if (daysLeft <= 3) {
      return (
        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-semibold">
          Vence en {daysLeft} día{daysLeft === 1 ? '' : 's'}
        </span>
      );
    }
    return null;
  })()
)}
```

**Implementation 4.1.4: Discount Validation**
```typescript
const handleDiscountChange = (value: number) => {
  if (value < 0) {
    toast.error('El descuento no puede ser negativo');
    return;
  }
  
  if (value > 100) {
    toast.error('El descuento no puede ser mayor a 100%');
    return;
  }
  
  setFormData({ ...formData, discountPercent: value });
};
```

**Status:** ❌ NOT IMPLEMENTED  
**Effort:** 2-3 hours

---

### 4.2 Reports Screen

**FILE: `features/reports/ReportsView.tsx` or `components/ReportsView.tsx`**

**Implementation 4.2.1: Simplify Date Picker**
```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 p-4 bg-slate-50 rounded-lg">
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-2">
      Fecha Inicial
    </label>
    <input
      type="date"
      value={dateFrom}
      onChange={(e) => setDateFrom(e.target.value)}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  </div>
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-2">
      Fecha Final
    </label>
    <input
      type="date"
      value={dateTo}
      onChange={(e) => setDateTo(e.target.value)}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  </div>
</div>

{/* Quick select buttons */}
<div className="flex flex-wrap gap-2 mb-4">
  <button
    onClick={() => {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateFrom(firstDay.toISOString().split('T')[0]);
      setDateTo(today.toISOString().split('T')[0]);
    }}
    className="px-3 py-1 text-sm bg-slate-200 hover:bg-slate-300 rounded-full transition-colors"
  >
    Este mes
  </button>
  <button
    onClick={() => {
      const today = new Date();
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      setDateFrom(lastMonthStart.toISOString().split('T')[0]);
      setDateTo(lastMonthEnd.toISOString().split('T')[0]);
    }}
    className="px-3 py-1 text-sm bg-slate-200 hover:bg-slate-300 rounded-full transition-colors"
  >
    Mes pasado
  </button>
  <button
    onClick={() => {
      const today = new Date();
      const yearStart = new Date(today.getFullYear(), 0, 1);
      setDateFrom(yearStart.toISOString().split('T')[0]);
      setDateTo(today.toISOString().split('T')[0]);
    }}
    className="px-3 py-1 text-sm bg-slate-200 hover:bg-slate-300 rounded-full transition-colors"
  >
    Este año
  </button>
</div>
```

**Implementation 4.2.2: Save Filter State**
```typescript
useEffect(() => {
  const filters = {
    dateFrom,
    dateTo,
    reportType,
    projectId,
    selectedCategory,
  };
  localStorage.setItem('reportFilters', JSON.stringify(filters));
}, [dateFrom, dateTo, reportType, projectId, selectedCategory]);

useEffect(() => {
  const saved = localStorage.getItem('reportFilters');
  if (saved) {
    try {
      const filters = JSON.parse(saved);
      setDateFrom(filters.dateFrom);
      setDateTo(filters.dateTo);
      setReportType(filters.reportType);
      setProjectId(filters.projectId);
      setSelectedCategory(filters.selectedCategory);
    } catch (error) {
      console.error('Error parsing saved filters:', error);
    }
  }
}, []);
```

**Implementation 4.2.3: Format Excel Export**
```typescript
import ExcelJS from 'exceljs';

const exportToFormattedExcel = async (data: any[], filename: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte');
  
  // Define columns
  worksheet.columns = [
    { header: 'Fecha', key: 'date', width: 12 },
    { header: 'Descripción', key: 'description', width: 30 },
    { header: 'Monto', key: 'amount', width: 15, numFmt: '#,##0.00' },
    { header: 'Categoría', key: 'category', width: 20 },
  ];
  
  // Format header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'center' };
  
  // Add data
  data.forEach((item, index) => {
    const row = worksheet.addRow(item);
    // Alternate row colors
    if (index % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    }
    // Format amounts
    row.getCell('amount').numFmt = '#,##0.00';
  });
  
  // Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};
```

**Status:** ❌ NOT IMPLEMENTED  
**Effort:** 2-3 hours

---

### 4.3 Settings/Company

**FILE: `components/SettingsView.tsx` or `pages/configuracion.tsx`**

**Implementation 4.3.1: Better Logo Upload**
```typescript
<div
  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 transition-colors bg-slate-50"
  onDragOver={(e) => {
    e.preventDefault();
    setDragActive(true);
  }}
  onDragLeave={() => setDragActive(false)}
  onDrop={(e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleLogoUpload(e.dataTransfer.files[0]);
    }
  }}
>
  <Upload className="h-12 w-12 mx-auto text-slate-400 mb-3" />
  <h3 className="text-lg font-semibold text-slate-700 mb-1">
    Arrastra tu logo aquí
  </h3>
  <p className="text-sm text-slate-500 mb-4">
    o haz clic para seleccionar (JPG, PNG, max 2MB)
  </p>
  <input
    type="file"
    hidden
    ref={logoInputRef}
    onChange={(e) => {
      if (e.target.files?.[0]) {
        handleLogoUpload(e.target.files[0]);
      }
    }}
    accept="image/*"
  />
  <button
    type="button"
    onClick={() => logoInputRef.current?.click()}
    className="inline-block px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
  >
    Seleccionar archivo
  </button>
</div>

{company?.logoUrl && (
  <div className="mt-4 p-3 bg-slate-100 rounded-lg flex items-center justify-between">
    <span className="text-sm text-slate-700">Logo actual cargado</span>
    <img
      src={company.logoUrl}
      alt="Company logo"
      className="h-10 object-contain"
    />
    <button
      onClick={handleRemoveLogo}
      className="text-red-500 hover:text-red-700 text-sm font-semibold"
    >
      Eliminar
    </button>
  </div>
)}
```

**Implementation 4.3.2: Image Optimization**
```typescript
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Check file size
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error('File size must be less than 2MB'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 400;
        const maxHeight = 200;
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(
                new File([blob], file.name, {
                  type: 'image/webp',
                  lastModified: Date.now(),
                })
              );
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/webp',
          0.85
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const handleLogoUpload = async (file: File) => {
  try {
    setUploading(true);
    const compressed = await compressImage(file);
    const url = await uploadToStorage(compressed);
    setCompany({ ...company, logoUrl: url });
    toast.success('Logo actualizado');
  } catch (error) {
    toast.error('Error: ' + error.message);
  } finally {
    setUploading(false);
  }
};
```

**Implementation 4.3.3: Real-time Exchange Rate Update**
```typescript
const previousRateRef = useRef(company?.exchangeRate || 7.85);

const handleExchangeRateChange = async (newRate: number) => {
  if (newRate <= 0 || newRate > 20) {
    toast.error('Tipo de cambio debe estar entre 0 y 20');
    return;
  }
  
  const previousRate = previousRateRef.current;
  
  // Show confirmation
  const confirmed = window.confirm(
    `¿Cambiar tipo de cambio de ${previousRate} a ${newRate}?\n\nEsto afectará el cálculo de todos los montos en USD.`
  );
  
  if (!confirmed) return;
  
  try {
    // Update company
    await updateCompanySettings({ exchangeRate: newRate });
    previousRateRef.current = newRate;
    
    // Recalculate USD expenses
    const recalculatedExpenses = expenses.map(exp => {
      if (exp.currency === 'USD') {
        const amountInGTQ = (exp.amount / previousRate) * newRate;
        return { ...exp, amount: amountInGTQ };
      }
      return exp;
    });
    
    // Trigger recalculation
    setExpenses(recalculatedExpenses);
    toast.success('Tipo de cambio actualizado y cantidades recalculadas');
  } catch (error) {
    toast.error('Error al actualizar tipo de cambio');
  }
};

// Display with warning if changed recently
{company?.exchangeRate && company.exchangeRate !== 7.85 && (
  <div className="mt-2 text-sm text-amber-600">
    ⚠️ Tipo de cambio personalizado: Q{company.exchangeRate} por USD
  </div>
)}
```

**Implementation 4.3.4: Invite with Link**
```typescript
const sendUserInvite = async (email: string, role: string) => {
  try {
    // Generate invite token
    const inviteToken = generateSecureToken();
    
    // Save invite record
    await saveInvite({
      email,
      role,
      token: inviteToken,
      companyId: company.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    
    // Create invite link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/join?token=${inviteToken}`;
    
    // Send email
    const emailBody = `
Hola,

Has sido invitado a unirte a ${company.companyName} en ORIGEN ERP.

Rol asignado: ${role}

Haz clic en el siguiente enlace para aceptar la invitación:
${inviteLink}

Este enlace expira en 7 días.

Saludos,
Equipo ORIGEN ERP
    `;
    
    await sendEmail(email, 'Invitación a ORIGEN ERP', emailBody);
    toast.success('Invitación enviada a ' + email);
  } catch (error) {
    toast.error('Error al enviar invitación');
  }
};

// Display pending invites
{pendingInvites.map(invite => (
  <div
    key={invite.id}
    className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
  >
    <div>
      <div className="font-semibold text-sm">{invite.email}</div>
      <div className="text-xs text-slate-500">
        Rol: {invite.role} • Invitación pendiente por {Math.ceil(
          (new Date(invite.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        )} días
      </div>
    </div>
    <button
      onClick={() => handleResendInvite(invite.id)}
      className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
    >
      Reenviar
    </button>
  </div>
))}
```

**Implementation 4.3.5: Role Descriptions**
```typescript
const ROLE_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  owner: {
    label: 'Propietario',
    description:
      'Acceso total a todo, incluyendo configuración de empresa y eliminación de cuenta',
  },
  admin: {
    label: 'Administrador',
    description:
      'Acceso total a todos los datos y configuraciones, pero no puede eliminar la empresa',
  },
  project_manager: {
    label: 'Gestor de Proyectos',
    description:
      'Crear, editar y gestionar proyectos. Acceso a presupuestos y gastos.',
  },
  finance: {
    label: 'Finanzas',
    description:
      'Gestionar gastos, nóminas, cotizaciones y reportes financieros',
  },
  field_worker: {
    label: 'Operario',
    description:
      'Registrar asistencia, visitas de obra y entrada de tiempo. Acceso de lectura a proyectos.',
  },
  viewer: {
    label: 'Visualizador',
    description:
      'Acceso de solo lectura a todos los datos. No puede hacer cambios.',
  },
};

<select
  value={selectedRole}
  onChange={(e) => setSelectedRole(e.target.value)}
  className="w-full px-3 py-2 border rounded-lg"
>
  {Object.entries(ROLE_DESCRIPTIONS).map(([role, { label, description }]) => (
    <option key={role} value={role}>
      {label} - {description}
    </option>
  ))}
</select>

{selectedRole && (
  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
    <strong>{ROLE_DESCRIPTIONS[selectedRole]?.label}:</strong>{' '}
    {ROLE_DESCRIPTIONS[selectedRole]?.description}
  </div>
)}
```

**Status:** ❌ NOT IMPLEMENTED  
**Effort:** 4-5 hours

---

## 📱 MOBILE & RESPONSIVE

### Mobile Implementations

**FILE: Multiple - Add to each component**

**Implementation: Responsive Table Fixes**
```typescript
// Already implemented in Budget section - apply universally
// Key pattern:
// - Use overflow-x-auto for tables on mobile
// - Hide columns progressively: hidden sm:table-cell, hidden md:table-cell
// - Show essential info in mobile view with smaller text
// - Use flex layout for mobile instead of tables when possible
```

**Implementation: Modal Safe Area**
```typescript
// Mobile-safe modal
<div className="fixed inset-0 bg-black/50 flex items-end sm:items-center z-50">
  <div className="bg-white w-full sm:max-w-md rounded-t-lg sm:rounded-lg mx-auto overflow-auto max-h-[calc(100vh-120px)] sm:max-h-[90vh]">
    {/* Modal content with safe padding */}
    <div className="p-4 pb-24 sm:pb-4">
      {/* Content */}
    </div>
  </div>
</div>
```

**Implementation: Keyboard Accommodation**
```typescript
// Account for mobile keyboard
const [keyboardOpen, setKeyboardOpen] = useState(false);

<input
  onFocus={() => setKeyboardOpen(true)}
  onBlur={() => setKeyboardOpen(false)}
  className={`pb-40 sm:pb-0 transition-all ${
    keyboardOpen ? 'translate-y-0' : ''
  }`}
/>
```

**Status:** ❌ NOT IMPLEMENTED UNIVERSALLY  
**Effort:** 2-3 hours to apply across all components

---

## ♿ ACCESSIBILITY

### 5.1 ARIA Labels & Semantic HTML

**FILE: All component files**

**Implementation: Add ARIA Labels**
```typescript
// Form inputs
<input
  type="email"
  aria-label="Email address"
  aria-describedby="email-error"
  aria-invalid={hasEmailError}
/>
{emailError && <span id="email-error" className="sr-only">{emailError}</span>}

// Buttons with icons
<button aria-label="Delete project">
  <Trash2 className="h-5 w-5" />
</button>

// Skip link (for accessibility)
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

**Implementation: Keyboard Navigation**
```typescript
// Ensure tab order is logical
// Use onKeyDown for keyboard shortcuts
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeModal();
  }
  if (e.key === 'Enter' && e.ctrlKey) {
    handleSubmit();
  }
};

// Make all interactive elements keyboard accessible
<button
  onKeyDown={handleKeyDown}
  tabIndex={0}
  role="button"
>
  Click or press Enter
</button>
```

**Implementation: Color Contrast**
```typescript
// Ensure text has sufficient contrast
// Use utilities:
const getContrastColor = (bgColor: string): 'text-white' | 'text-black' => {
  // Calculate luminance
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'text-black' : 'text-white';
};
```

**Status:** ❌ NOT IMPLEMENTED  
**Effort:** 3-4 hours

---

## ⚡ PERFORMANCE

### 6.1 Advanced Optimizations

**FILE: `lib/hooks/useProjectDataEnhanced.ts`** (Already exists - enhance it)

**Implementation: Advanced Query Caching**

Already done in `cacheManager.ts` - just ensure usage:

```typescript
// Usage in components
const cachedData = useMemo(() => {
  return cacheManager.get('projects', () => fetchProjects());
}, []);
```

**Implementation: Code Splitting**
```typescript
// In _app.tsx or relevant file
import dynamic from 'next/dynamic';

const DashboardView = dynamic(() => import('@/components/DashboardOverview'), {
  loading: () => <Skeleton />,
});

const ReportsView = dynamic(() => import('@/features/reports/ReportsView'), {
  loading: () => <Skeleton />,
});
```

**Implementation: Image Lazy Loading**
```typescript
<Image
  src={company.logoUrl}
  alt="Company logo"
  loading="lazy"
  width={200}
  height={100}
/>

// For background images
<div
  style={{
    backgroundImage: `url(${image})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }}
/>
```

**Status:** ✅ PARTIALLY DONE  
**Effort:** 1-2 hours to complete

---

## 🧪 TESTING

### 7.1 Additional Test Files to Create

**FILE: `components/*.test.tsx`** (Create for all screens)

**Implementation: Component Tests Template**
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardOverview } from '@/components/DashboardOverview';

describe('DashboardOverview', () => {
  it('should display loading skeleton', () => {
    render(<DashboardOverview isLoading={true} />);
    expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
  });
  
  it('should display KPI cards when data loads', async () => {
    render(<DashboardOverview isLoading={false} data={mockData} />);
    await waitFor(() => {
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
    });
  });
  
  // Add more test cases...
});
```

**Status:** ❌ NOT IMPLEMENTED  
**Effort:** 2-3 hours

---

## 📋 IMPLEMENTATION ROADMAP

### Week 1: Priority 1 (Critical)
- [ ] Authentication rate limiting
- [ ] Password visibility toggle
- [ ] Validation schemas
- **Effort:** 4-5 hours

### Week 1-2: Priority 2 (High)
- [ ] Dashboard enhancements
- [ ] Projects list improvements
- [ ] Budget/APU responsive table
- **Effort:** 6-8 hours

### Week 2-3: Priority 3 (Medium)
- [ ] Expenses features
- [ ] Personnel calendar
- [ ] Payroll enhancements
- **Effort:** 8-10 hours

### Week 3-4: Priority 4 (Polish)
- [ ] Quotations features
- [ ] Reports features
- [ ] Settings features
- **Effort:** 6-8 hours

### Week 4+: Mobile, Accessibility, Testing
- [ ] Mobile responsive fixes
- [ ] Accessibility compliance
- [ ] Component tests
- **Effort:** 8-10 hours

---

## 🎯 TOTAL EFFORT ESTIMATE

```
Priority 1 (Critical):      4-5 hours
Priority 2 (High):          6-8 hours
Priority 3 (Medium):        8-10 hours
Priority 4 (Polish):        6-8 hours
Mobile/Accessibility:       8-10 hours
Testing:                    6-8 hours
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL:                      38-49 hours (~1 week full-time)
```

---

## ✅ COMPLETION CHECKLIST

Use this to track implementation progress:

- [ ] All 54 screen fixes implemented
- [ ] All mobile responsive issues fixed
- [ ] All accessibility compliance done
- [ ] All performance optimizations done
- [ ] All tests written and passing
- [ ] Code reviewed
- [ ] Production ready

---

**Ready to start implementation!**
