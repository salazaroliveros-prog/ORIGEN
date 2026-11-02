# 📚 Ejemplos Prácticos: CRUD en ORIGEN

## 1. CRUD DE PROYECTOS

### Crear Proyecto

```typescript
import { useProjectData } from '@/lib/hooks/useProjectData';

export function ProjectForm() {
  const { createProject } = useProjectData(companyId, userId, role);

  async function handleSubmit(data: ProjectFormValues) {
    const success = await createProject(data);
    if (success) {
      console.log('Proyecto creado');
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(formData);
    }}>
      {/* Formulario aquí */}
    </form>
  );
}
```

### Leer Proyectos (Tiempo Real)

```typescript
import { useProjectData } from '@/lib/hooks/useProjectData';

export function ProjectsList() {
  const { projects, loading } = useProjectData(companyId, userId, role);

  if (loading) return <div>Cargando...</div>;

  return (
    <ul>
      {projects.map(project => (
        <li key={project.id}>{project.name}</li>
      ))}
    </ul>
  );
}
```

### Actualizar Proyecto

```typescript
async function handleUpdate(projectId: string, updates: Partial<ProjectFormValues>) {
  const { updateProject } = useProjectData(companyId, userId, role);
  const success = await updateProject(projectId, updates);
  
  if (success) {
    console.log('Proyecto actualizado');
  }
}
```

### Eliminar Proyecto (Archivar)

```typescript
async function handleDelete(projectId: string) {
  const { archiveProject } = useProjectData(companyId, userId, role);
  const success = await archiveProject(projectId);
  
  if (success) {
    console.log('Proyecto archivado');
  }
}
```

---

## 2. CRUD DE GASTOS

### Crear Gasto

```typescript
import { useProjectData } from '@/lib/hooks/useProjectData';
import type { ExpenseRecord } from '@/lib/types';

export function ExpenseForm() {
  const { addExpense } = useProjectData(companyId, userId, role);

  async function handleSubmit(expense: ExpenseRecord) {
    const success = await addExpense(expense);
    if (success) {
      console.log('Gasto registrado');
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(expenseData);
    }}>
      <input name="description" placeholder="Descripción" />
      <input name="amount" type="number" placeholder="Monto" />
      <input name="date" type="date" />
      <button type="submit">Registrar Gasto</button>
    </form>
  );
}
```

### Leer Gastos

```typescript
export function ExpensesList() {
  const { expenses } = useProjectData(companyId, userId, role);

  return (
    <table>
      <tbody>
        {expenses.map(expense => (
          <tr key={expense.id}>
            <td>{expense.description}</td>
            <td>${expense.amount}</td>
            <td>{expense.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Actualizar Gasto

```typescript
async function handleUpdateExpense(expense: ExpenseRecord) {
  const { updateExpense } = useProjectData(companyId, userId, role);
  const success = await updateExpense(expense);
  
  if (success) {
    console.log('Gasto actualizado');
  }
}
```

### Eliminar Gasto

```typescript
async function handleDeleteExpense(expenseId: string) {
  const { deleteExpense } = useProjectData(companyId, userId, role);
  const success = await deleteExpense(expenseId);
  
  if (success) {
    console.log('Gasto eliminado');
  }
}
```

---

## 3. ALMACENAMIENTO LOCAL (Offline)

### Guardar Datos Localmente

```typescript
import { saveOfflineData, loadOfflineData } from '@/lib/offlineStorage';

// Guardar
const myProjects = [
  { id: '1', name: 'Proyecto A' },
  { id: '2', name: 'Proyecto B' }
];
saveOfflineData('projects', myProjects);

// Cargar
const projects = loadOfflineData('projects', []);
console.log(projects); // [{ id: '1', name: 'Proyecto A' }, ...]
```

### Cola de Sincronización Offline

```typescript
import { 
  addOfflineAction, 
  getOfflineQueue, 
  processOfflineQueue,
  removeOfflineAction 
} from '@/lib/offlineStorage';

// Cuando usuario está OFFLINE y crea un proyecto
addOfflineAction(
  'progress', // tipo de acción
  { projectId: 'proj-123', complete: 50 }, // datos
  'Actualizar progreso a 50%' // descripción
);

// Ver acciones pendientes
const queue = getOfflineQueue();
console.log(queue);
// [
//   {
//     id: 'queue-1234567-abc',
//     type: 'progress',
//     timestamp: '2024-01-15 14:30:45',
//     description: 'Actualizar progreso a 50%',
//     payload: { projectId: 'proj-123', complete: 50 },
//     synced: false
//   }
// ]

// Cuando vuelve ONLINE, procesar cola
processOfflineQueue(async (item) => {
  try {
    // Sincronizar cada acción a Firebase
    if (item.type === 'progress') {
      const success = await updateProjectProgress(item.payload);
      return success;
    }
    return false;
  } catch (err) {
    console.error('Error sincronizando:', err);
    return false;
  }
}).then(({ processed, remaining }) => {
  console.log(`Sincronizados: ${processed}, Pendientes: ${remaining}`);
});

// Remover una acción específica
removeOfflineAction('queue-1234567-abc');
```

---

## 4. CRUD ASISTENCIA

### Crear Asistencia

```typescript
import { useProjectData } from '@/lib/hooks/useProjectData';
import type { AttendanceRecord } from '@/lib/types';

async function recordAttendance(attendance: AttendanceRecord) {
  const { addAttendance } = useProjectData(companyId, userId, role);
  const success = await addAttendance(attendance);
  
  if (success) {
    console.log('Asistencia registrada');
  }
}
```

### Leer Asistencia

```typescript
export function AttendanceList() {
  const { attendance } = useProjectData(companyId, userId, role);

  return (
    <div>
      {attendance.map(record => (
        <div key={record.id}>
          {record.employeeName} - {record.date}
        </div>
      ))}
    </div>
  );
}
```

### Eliminar Asistencia

```typescript
async function handleDeleteAttendance(attendanceId: string) {
  const { deleteAttendance } = useProjectData(companyId, userId, role);
  const success = await deleteAttendance(attendanceId);
  
  if (success) {
    console.log('Registro de asistencia eliminado');
  }
}
```

---

## 5. CRUD EMPLEADOS

### Crear Empleado

```typescript
import { useProjectData } from '@/lib/hooks/useProjectData';
import type { Employee } from '@/lib/types';

async function addNewEmployee(employee: Employee) {
  const { addEmployee } = useProjectData(companyId, userId, role);
  const success = await addEmployee(employee);
  
  if (success) {
    console.log('Empleado registrado');
  }
}
```

### Leer Empleados

```typescript
export function EmployeeList() {
  const { employees } = useProjectData(companyId, userId, role);

  return (
    <ul>
      {(employees as Employee[]).map(emp => (
        <li key={emp.id}>{emp.name} - {emp.position}</li>
      ))}
    </ul>
  );
}
```

---

## 6. CRUD COTIZACIONES

### Crear Cotización

```typescript
import { useProjectData } from '@/lib/hooks/useProjectData';
import type { QuoteRecord } from '@/lib/types';

async function createQuote(quote: QuoteRecord) {
  const { addQuote } = useProjectData(companyId, userId, role);
  const success = await addQuote(quote);
  
  if (success) {
    console.log('Cotización guardada');
  }
}
```

### Actualizar Estado de Cotización

```typescript
async function updateQuoteStatus(quoteId: string, newStatus: QuoteRecord['status']) {
  const { updateQuoteStatus } = useProjectData(companyId, userId, role);
  const success = await updateQuoteStatus(quoteId, newStatus);
  
  if (success) {
    console.log('Estado actualizado');
  }
}
```

---

## 7. CRUD APU (Presupuestos)

### Guardar Partidas APU

```typescript
import { useProjectData } from '@/lib/hooks/useProjectData';
import type { APUItem } from '@/lib/types';

async function saveAPUBudget(items: APUItem[], projectId: string) {
  const { saveAPUItems } = useProjectData(companyId, userId, role);
  const success = await saveAPUItems(items, projectId);
  
  if (success) {
    console.log('APU guardado');
  }
}
```

### Leer APU

```typescript
export function APUView() {
  const { apuItems, apuItemsLoading } = useProjectData(companyId, userId, role);

  if (apuItemsLoading) return <div>Cargando...</div>;

  return (
    <table>
      <tbody>
        {apuItems.map(item => (
          <tr key={item.id}>
            <td>{item.description}</td>
            <td>{item.unitPrice}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Eliminar Partida APU

```typescript
async function deleteAPUItem(itemId: string) {
  const { deleteAPUItem } = useProjectData(companyId, userId, role);
  const success = await deleteAPUItem(itemId);
  
  if (success) {
    console.log('Partida eliminada');
  }
}
```

---

## 8. CRUD VISITAS DE CAMPO

### Crear Visita

```typescript
import { useProjectData } from '@/lib/hooks/useProjectData';
import type { FieldVisit } from '@/lib/types';

async function recordFieldVisit(visit: FieldVisit) {
  // Usar firebaseService directamente ya que no hay función en useProjectData
  const success = await saveFieldVisitToFirestore(visit, companyId, userId);
  
  if (success) {
    console.log('Visita registrada');
  }
}
```

### Leer Visitas

```typescript
export function FieldVisitsLog() {
  const { fieldVisits } = useProjectData(companyId, userId, role);

  return (
    <ul>
      {fieldVisits.map(visit => (
        <li key={visit.id}>{visit.projectId} - {visit.date}</li>
      ))}
    </ul>
  );
}
```

---

## 9. CRUD CONFIGURACIÓN DE EMPRESA

### Guardar Configuración

```typescript
import { useProjectData } from '@/lib/hooks/useProjectData';
import type { CompanySettings } from '@/lib/types';

async function updateCompanySettings(settings: CompanySettings) {
  const { saveCompanySettings } = useProjectData(companyId, userId, role);
  const success = await saveCompanySettings(settings);
  
  if (success) {
    console.log('Configuración actualizada');
  }
}
```

### Leer Configuración

```typescript
export function CompanySettingsView() {
  const { company } = useProjectData(companyId, userId, role);

  return (
    <div>
      <h2>{company?.name}</h2>
      <p>{company?.email}</p>
    </div>
  );
}
```

---

## 🔌 Uso de Firebase Service Directamente

```typescript
import {
  saveProjectToFirestore,
  subscribeProjects,
  deleteExpenseFromFirestore,
  // ... más funciones
} from '@/lib/firebaseService';

// Guardar proyecto
const success = await saveProjectToFirestore(project, companyId, userId);

// Suscribirse a cambios en tiempo real
const unsubscribe = subscribeProjects(companyId, (projects) => {
  console.log('Proyectos actualizados:', projects);
});

// Dejar de escuchar
unsubscribe();

// Eliminar gasto
const deleted = await deleteExpenseFromFirestore(expenseId);
```

---

## ✅ Resumen de Funciones Disponibles

| Operación | Firebase | Local | Automático |
|-----------|----------|-------|-----------|
| Crear | ✅ `save*ToFirestore()` | ✅ `saveOfflineData()` | ✅ Si online |
| Leer | ✅ `subscribe*()` | ✅ `loadOfflineData()` | ✅ Tiempo real |
| Actualizar | ✅ `update*ToFirestore()` | ✅ `saveOfflineData()` | ✅ Si online |
| Eliminar | ✅ `delete*FromFirestore()` | ✅ `removeOfflineAction()` | ✅ Si online |
| Sincronizar | ✅ Automático | ✅ Cola offline | ✅ Online detection |

---

**Conclusión:** Todo el CRUD está implementado y disponible. El usuario puede usarlo automáticamente con `useProjectData()` hook o directamente con `firebaseService.ts` y `offlineStorage.ts`.
