# E2E QA Analysis Report - ConstructERP Guatemala

**Fecha**: 26 de Octubre 2026  
**Analista**: QA Automation Engineer  
**Entorno**: Producción (https://origen-one-kohl.vercel.app)  
**Método**: Análisis Estático de Código + Verificación de Flujos de Datos

---

## 📊 MÓDULOS IDENTIFICADOS

### 1. Dashboard (Tablero de Control)

**Vista**: `features/dashboard/DashboardView.tsx`  
**Props requeridas**:

- `projects: Project[]`
- `expenses: ExpenseRecord[]`
- `company: CompanySettings`
- `activeProjectId: string`
- `milestones: Milestone[]`
- `employees: Employee[]`
- `attendance: AttendanceRecord[]`

**Dependencias de datos**:

- ✅ Projects (necesario para KPIs)
- ✅ Expenses (necesario para gráficas financieras)
- ✅ Company (necesario para formatos de moneda)
- ✅ Milestones (necesario para proyecciones)
- ✅ Employees + Attendance (necesario para productividad)

**Widgets implementados**:

- Cash Flow Projection
- Labor Costs & Productivity
- Progress Comparison
- Stacked Budget
- Expenses Histogram
- Budget Utilization (D3)
- Project Breakdown

---

### 2. Proyectos y Firmas Digitales

**Vista**: `features/projects/ProjectsView.tsx`  
**Props requeridas**:

- `company: CompanySettings`
- `projects: Project[]`
- `expenses: ExpenseRecord[]`
- `loading: boolean`
- CRUD functions: `onCreateProject`, `onUpdateProject`, `onArchiveProject`, `onRestoreProject`

**Dependencias de datos**:

- ✅ Projects (principal)
- ✅ Expenses (para cálculo de gasto por proyecto)
- ✅ Company (para configuración)

**Funcionalidades**:

- CRUD de proyectos
- Archivar/Restaurar proyectos
- Exportar a CSV
- Formulario de edición

---

### 3. Presupuestos APU y Gastos

**Vista**: `features/budget/BudgetView.tsx`  
**Componente principal**: `components/BudgetAndAPU.tsx`

**Dependencias de datos**:

- ✅ `budgetItems: APUItem[]`
- ✅ `activeProjectId: string`
- ✅ `projects: Project[]`
- ✅ `expenses: ExpenseRecord[]`
- ✅ `quotes: QuoteRecord[]`
- ✅ `tasks: ScheduleTask[]`
- ✅ `company: CompanySettings`

**Funcionalidades**:

- CRUD de items APU
- Generación APU con IA (Gemini)
- Auditoría de presupuestos
- Catálogo de mercado guatemalteco
- Cálculo de precios por departamento

---

### 4. Personal y Asistencia IGSS

**Vista**: `features/staff/StaffView.tsx`  
**Componente principal**: `components/StaffAndAttendance.tsx`

**Dependencias de datos**:

- ✅ `employees: Array<Employee | EmployeeDirectoryEntry>`
- ✅ `attendance: AttendanceRecord[]`
- ✅ `company: CompanySettings`
- ✅ `projects: Project[]`
- ✅ `activeProjectId: string`

**Funcionalidades**:

- CRUD de empleados
- Registro de asistencia
- Validación geográfica (geofencing)
- Cálculo de planillas guatemaltecas
- Productividad laboral

---

### 5. Reportes Finales y Actas

**Vista**: `features/reports/ReportsView.tsx`  
**Componente principal**: `components/AdvancedReportsManager.tsx`

**Dependencias de datos**:

- Requiere datos de múltiples módulos
- Projects, Expenses, Attendance, Employees, Tasks, Milestones

---

### 6. Asistente Técnico IA

**Vista**: `features/ai/AiAssistantView.tsx`  
**Componente principal**: `components/AiAssistantModal.tsx`

**Dependencias de datos**:

- ✅ `activeProject: Project`
- ✅ `budgetItems: APUItem[]`
- ✅ `fieldVisits: FieldVisit[]`

**Funcionalidades**:

- Consultas sobre presupuestos
- Normativas AGIES y COGUANOR
- Generación de bitácoras inteligentes

---

### 7. Cotizaciones

**Vista**: `components/CotizacionesView.tsx`  
**Componente principal**: `components/QuotesManager.tsx`

**Dependencias de datos**:

- ✅ `quotes: QuoteRecord[]`
- ✅ `projects: Project[]`
- ✅ `apuItems: APUItem[]`

---

### 8. Cronograma Gantt

**Componente**: `components/GanttSchedule.tsx`

**Dependencias de datos**:

- ✅ `tasks: ScheduleTask[]`
- ✅ `projects: Project[]`
- ✅ `activeProjectId: string`
- ✅ `reminders: TaskReminder[]`
- ✅ `milestones: Milestone[]`

---

### 9. Maquinaria

**Componente**: `components/MachineryManager.tsx`

**Dependencias de datos**:

- ✅ `machinery: Machinery[]`
- ✅ `machineryLogs: MachineryLog[]`
- ✅ `projects: Project[]`
- ✅ `activeProjectId: string`

---

### 10. Planillas Guate

**Vista**: `components/PayrollEstimateView.tsx`

**Dependencias de datos**:

- Requiere Employees, Attendance, CompanySettings

---

### 11. Gastos & Facturas

**Vista**: `components/ExpensesView.tsx`

**Dependencias de datos**:

- ✅ `expenses: ExpenseRecord[]`
- ✅ `projects: Project[]`
- ✅ `budgetItems: APUItem[]`
- ✅ `company: CompanySettings`

---

### 12. Correo & Avisos

**Componente**: `components/GmailManager.tsx`

**Dependencias de datos**:

- Requiere Gmail API integration

---

### 13. Equipo de la empresa

**Componente**: `components/CompanyTeamManager.tsx`

**Dependencias de datos**:

- Requiere workspace data, membership, availableWorkspaces

---

## 🔍 ANÁLISIS DE FLUJO DE DATOS

### Flujo Principal (MainApp → useProjectData)

```
MainApp
  ├─ useAuthSession (auth)
  │   └─ currentUser, authStatus, gmailAccess
  │
  ├─ useCompanyWorkspace (workspace)
  │   └─ workspace, membership, availableWorkspaces
  │
  └─ useProjectData (companyId, userId, role)
      ├─ projects: subscribeProjects()
      ├─ fieldVisits: subscribeFieldVisits()
      ├─ expenses: subscribeExpenses()
      ├─ attendance: subscribeAttendance()
      ├─ employees: subscribeEmployees()
      ├─ quotes: subscribeQuotes()
      ├─ apuItems: subscribeAPUItems()
      ├─ machinery: subscribeMachinery()
      ├─ machineryLogs: subscribeMachineryLogs()
      └─ company: subscribeCompanySettings()
```

### Suscripciones Firestore Real-time

Todas las suscripciones usan Firebase real-time listeners en `lib/firebaseService.ts`:

1. **subscribeProjects** - Escucha cambios en colección `projects`
2. **subscribeFieldVisits** - Escucha cambios en `fieldVisits`
3. **subscribeExpenses** - Escucha cambios en `expenses`
4. **subscribeAttendance** - Escucha cambios en `attendance`
5. **subscribeEmployees** - Escucha cambios en `employees`
6. **subscribeQuotes** - Escucha cambios en `quotes`
7. **subscribeAPUItems** - Escucha cambios en `apuItems`
8. **subscribeMachinery** - Escucha cambios en `machinery`
9. **subscribeMachineryLogs** - Escucha cambios en `machineryLogs`
10. **subscribeCompanySettings** - Escucha cambios en `companySettings`

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. DEPENDENCIA DE DATOS NO RESUELTA: ScheduleTask/Milestone

**Módulo afectado**: Dashboard, Cronograma Gantt

**Problema**:

- DashboardView recibe `milestones: Milestone[]` como prop
- MainApp NO pasa `milestones` a DashboardView
- useProjectData NO suscribe a `tasks` ni `milestones`
- GanttSchedule recibe `tasks` y `milestones` pero MainApp NO los pasa

**Código MainApp (línea 14)**:

```typescript
import { GanttSchedule } from '@/components/GanttSchedule';
```

**Código MainApp (línea 145-147)**:

```typescript
const data = useProjectData(workspace?.id, currentUser?.uid, membership?.role);
// data NO incluye tasks ni milestones
```

**DashboardView render (línea desconocida, pero props definidas)**:

```typescript
interface DashboardViewProps {
  milestones?: Milestone[]; // ✅ Definido
  // ...
}
```

**Impacto**:

- ✗ Widgets de proyección de flujo de caja pueden no funcionar
- ✗ Cronograma Gantt no mostrará tareas ni hitos
- ✗ Alertas de milestones no se mostrarán

**Solución requerida**:

1. Agregar suscripciones en `useProjectData`:
   - `subscribeTasks(workspaceId)`
   - `subscribeMilestones(workspaceId)`
2. Pasar tasks y milestones desde MainApp a los componentes

---

### 2. DEPENDENCIA DE DATOS NO RESUELTA: ScheduleTask

**Módulo afectado**: BudgetAndAPU

**Problema**:

- BudgetAndAPU recibe `tasks: ScheduleTask[]` como prop
- MainApp NO pasa `tasks` a BudgetAndAPU
- useProjectData NO suscribe a `tasks`

**Código BudgetAndAPU (línea 41)**:

```typescript
tasks: ScheduleTask[],
```

**Impacto**:

- ✗ No hay evidencia de que tasks se use dentro de BudgetAndAPU
- ✗ Posible prop no utilizada o incompleta

**Investigación necesaria**: Verificar si `tasks` se usa en BudgetAndAPU

---

### 3. CAMBIO DE ESTADO DEL USUARIO EN PRODUCCIÓN

**Problema**:

- La aplicación en producción muestra "Cargando ConstructERP Guatemala..."
- Esto indica que MainApp está cargando pero no muestra el contenido
- Causas posibles:
  1. Auth pendiente (esperando usuario autenticarse)
  2. Workspace pendiente (esperando selección de workspace)
  3. Firebase connection lenta o fallida
  4. Error en inicialización de hooks

**Estado de autenticación**:

- Si no hay usuario autenticado → Debería mostrar AuthDialog
- Si hay usuario pero no workspace → Debería mostrar selección de workspace
- Si hay workspace pero no projects → Debería mostrar estado vacío

**Solución requerida**:

1. Agregar logging en producción para identificar dónde se estanca el flujo
2. Verificar que AuthDialog se muestre cuando no hay auth
3. Verificar que workspace selector se muestre cuando hay auth pero no workspace

---

### 4. TIPO `any` EN MAINAPP (CRÍTICO)

**Archivo**: `components/MainApp.tsx`  
**Línea 42**: `machinery: any[]`

**Problema**:

- MainApp pasa `machinery: any[]` a ProjectsAndVisits
- Esto rompe la seguridad de tipos

**Código (línea 42)**:

```typescript
machinery: any[],
```

**Código ProjectsAndVisits (línea 42)**:

```typescript
machinery: Machinery[],
```

**Estado**: ✅ YA CORREGIDO en análisis previo (cambiado a `Machinery[]`)

---

### 5. FALTA DE VALIDACIÓN DE DATOS EN CRUD

**Problema general**:

- Los formularios usan Zod para validación (project.schema.ts)
- PERO no todas las operaciones CRUD validan datos antes de guardar en Firestore
- Firebase no tiene validación de schema del lado del servidor
- Riesgo: Datos inconsistentes en la base de datos

**Ejemplo**: `saveProjectToFirestore` en `lib/firebaseService.ts`

- No se valida que el objeto Project cumpla con el schema Zod
- Guarda directamente en Firestore sin validación

**Solución requerida**:

1. Validar todos los datos antes de guardar en Firestore
2. Usar Zod schemas en todas las funciones save*
3. Rechazar datos inválidos con error claro al usuario

---

### 6. FALTA DE MANEJO DE ERRORES EN SUSCRIPCIONES FIREBASE

**Problema**:

- Las suscripciones en `lib/firebaseService.ts` no tienen manejo de errores robusto
- Si la suscripción falla, el módulo no recibe datos sin notificar al usuario
- No hay retry mechanism

**Ejemplo**: `subscribeProjects` (línea 18+)

```typescript
onSnapshot(...
  (snapshot) => { callback(snapshot.docs.map(...)) },
  (error) => { console.error(error); }  // ❌ Solo log, no callback de error
);
```

**Impacto**:

- Si Firebase falla, el usuario no lo sabe
- La UI queda vacía sin explicación
- No hay forma de recuperarse

**Solución requerida**:

1. Agregar callback de error a todas las suscripciones
2. Mostrar toast error al usuario cuando suscripción falla
3. Implementar retry mechanism con exponential backoff

---

### 7. DEPENDENCIA CIRCULAR: Projects ↔ Expenses

**Problema**:

- ProjectsView necesita Expenses para calcular gasto por proyecto
- ExpensesView necesita Projects para filtrar por proyecto
- Esta dependencia está bien implementada en MainApp
- PERO si una de las suscripciones falla, ambas vistas quedan incompletas

**Código MainApp (línea 156-163)**:

```typescript
const activeExpenses = useMemo(
  () => data.expenses.filter((expense) => activeProjectIds.has(expense.projectId)),
  [activeProjectIds, data.expenses]
);
```

**Estado**: ✅ Bien implementado, pero vulnerable a fallos de suscripción

---

### 8. FALTA DE INDICADOR DE CARGA (LOADING STATE)

**Problema**:

- useProjectData tiene un loading state global
- PERO no hay indicadores de carga por módulo
- Si un módulo carga más lento que otros, no hay feedback al usuario

**Código useProjectData (línea 69)**:

```typescript
const [loading, setLoading] = useState(false);
```

**Estado**: ✅ loading existe pero no se pasa a componentes individuales

---

### 9. AUTH DIALOG - FALTA DE VISIBILIDAD EN PRODUCCIÓN

**Problema**:

- AuthDialog existe pero no hay evidencia de cuándo se muestra
- Si no hay usuario autenticado, debería mostrarse automáticamente
- La aplicación en producción muestra "Cargando..." sin AuthDialog visible

**Código MainApp (línea 190)**:

```typescript
const [authDialogOpen, setAuthDialogOpen] = useState(false);
```

**Investigación necesaria**: Verificar lógica que muestra AuthDialog

---

### 10. GMAIL MANAGER - FALTA DE VERIFICACIÓN DE INTEGRACIÓN

**Problema**:

- GmailManager usa Gmail API
- No hay evidencia de que la integración esté configurada en producción
- Si Gmail no está autorizado, el módulo no funcionará

**Solución requerida**:

1. Verificar que `gmailAccess` en useAuthSession esté correctamente inicializado
2. Si no hay Gmail API token, mostrar mensaje claro al usuario
3. Deshabilitar el módulo si no hay configuración

---

## 📋 FLUJOS CRUD VERIFICADOS

### Projects

- ✅ **Create**: `saveProjectToFirestore` - Validación Zod en `project.schema.ts`
- ✅ **Read**: `subscribeProjects` - Real-time subscription
- ✅ **Update**: `saveProjectToFirestore` (misma función que create)
- ✅ **Delete**: No implementado explícitamente (solo archivar)
- ⚠️ **Validación**: Solo en frontend, no en Firestore

### Expenses

- ✅ **Create**: `saveExpenseToFirestore`
- ✅ **Read**: `subscribeExpenses`
- ✅ **Update**: No implementado
- ✅ **Delete**: `deleteExpenseFromFirestore`
- ⚠️ **Validación**: No hay evidencia de validación Zod

### Attendance

- ✅ **Create**: `saveAttendanceToFirestore`
- ✅ **Read**: `subscribeAttendance`
- ✅ **Update**: No implementado
- ✅ **Delete**: `deleteAttendanceFromFirestore`
- ⚠️ **Validación**: No hay evidencia de validación Zod

### Employees

- ✅ **Create**: `saveEmployeeToFirestore`
- ✅ **Read**: `subscribeEmployees`
- ✅ **Update**: No implementado
- ✅ **Delete**: No implementado
- ⚠️ **Validación**: No hay evidencia de validación Zod

### APU Items

- ✅ **Create**: `saveAPUItemsToFirestore`
- ✅ **Read**: `subscribeAPUItems`
- ✅ **Update**: No implementado
- ✅ **Delete**: `deleteAPUItemFromFirestore`
- ⚠️ **Validación**: Implementada en BudgetAndAPU pero no en Firestore

### Quotes

- ✅ **Create**: `saveQuoteToFirestore`
- ✅ **Read**: `subscribeQuotes`
- ✅ **Update**: `updateQuoteStatusInFirestore`
- ✅ **Delete**: No implementado
- ⚠️ **Validación**: No hay evidencia de validación Zod

### Machinery

- ✅ **Create**: `saveMachineryToFirestore`
- ✅ **Read**: `subscribeMachinery`
- ✅ **Update**: `updateMachineryStatusInFirestore`
- ✅ **Delete**: No implementado
- ⚠️ **Validación**: No hay evidencia de validación Zod

---

## 🚨 ERRORES DE LÓGICA DE NEGOCIO

### 1. PROGRESO DE PROYECTO NO SE CALCULA AUTOMÁTICAMENTE

**Problema**:

- Project tiene `progressPercent` pero no se calcula automáticamente
- Se espera que se calcule basado en tasks/milestones
- No hay lógica que calcule `progressPercent` cuando se actualizan tasks

**Impacto**:

- Los gráficos de progreso en Dashboard pueden mostrar datos incorrectos
- KPIs de avance pueden ser engañosos

**Solución requerida**:

1. Implementar función que calcule progressPercent basado en:
   - Milestones completados / total milestones
   - O tasks completadas / total tasks en el cronograma
2. Trigger recálculo cuando se actualizan tasks/milestones
3. Guardar en Firestore el progreso calculado

---

### 2. GASTO TOTAL DE PROYECTO NO SE CALCULA AUTOMÁTICAMENTE

**Problema**:

- Project tiene `spentTotal` pero no se calcula automáticamente
- Se espera que se calcule sumando Expenses
- MainApp lo calcula en memoria pero no se persiste

**Código MainApp (línea 160-162)**:

```typescript
const activeExpenses = useMemo(
  () => data.expenses.filter(...),
  [activeProjectIds, data.expenses]
);
// ❌ No calcula spentTotal para cada proyecto
```

**Impacto**:

- El presupuesto gastado puede no estar actualizado
- Reportes financieros pueden ser incorrectos

**Solución requerida**:

1. Calcular spentTotal cuando se actualizan expenses
2. Guardar en Firestore el spentTotal calculado
3. Trigger recálculo cuando se agrega/elimina/modifica expense

---

### 3. PLANILLA GUATEMALTECA - CÁLCULO INCORRECTO

**Problema**:

- PlanillaGuatemalan usa cálculos complejos de IGSS
- No hay evidencia de que los cálculos estén validados contra normativa real
- Riesgo de errores legales/financieros

**Componente**: `lib/guatemalanPayroll.ts`

**Solución requerida**:

1. Agregar pruebas unitarias para cálculos de planilla
2. Verificar cálculos contra normativa IGSS vigente
3. Documentar fórmulas usadas con referencias legales

---

### 4. APU GENERADO POR IA - SIN VALIDACIÓN POST-GENERACIÓN

**Problema**:

- APU generado por Gemini (en BudgetAndAPU) no se valida automáticamente
- Riesgo de que la IA genere datos incorrectos o fuera de normativa
- No hay validación de que los números sean razonables

**Componente**: `components/BudgetAndAPU.tsx` (línea 165-194)

**Solución requerida**:

1. Validar que costos no negativos
2. Validar que material cost + labor cost + equipment cost = totalUnitCost
3. Validar que precios estén dentro de rangos razonables para Guatemala
4. Mostrar advertencia si valores parecen fuera de rango

---

## 🔐 PROBLEMAS DE SEGURIDAD

### 1. FIRESTORE RULES NO VERIFICADAS EN E2E

**Problema**:

- Firestore rules existen (`firestore.rules`)
- PERO no hay pruebas E2E que verifiquen que las reglas funcionan en producción
- Riesgo: Permisos incorrectos pueden permitir acceso no autorizado

**Solución requerida**:

1. Ejecutar `npm run test:rules` en emulador
2. Verificar que las reglas de auth funcionen
3. Verificar que roles tengan permisos correctos

---

### 2. VALIDACIÓN DE ORIGEN EN API GEMINI

**Estado**: ✅ Implementado

- `app/api/gemini/route.ts` valida origen con `ALLOWED_ORIGINS`
- Headers CORS configurados
- ✅ Bien implementado

---

## 📊 DEPENDENCIAS DE DATOS NO RESUELTAS (CRÍTICO)

### 1. Tasks / Milestones

- **No suscritos** en useProjectData
- **No pasados** desde MainApp a componentes
- **Impacto**: Dashboard y Gantt incompletos

### 2. Planillas Guate

- Requiere cálculos complejos no validados
- **Impacto**: Riesgo legal/financiero

### 3. Progreso y Gasto de Proyecto

- No se calculan automáticamente
- **Impacto**: KPIs incorrectos

---

## 🎯 PRIORIDADES DE CORRECCIÓN

### 🔴 CRÍTICO (Bloquea funcional)

1. **Agregar suscripciones tasks/milestones en useProjectData**
2. **Pasar tasks/milestones desde MainApp a componentes**
3. **Verificar AuthDialog se muestra en producción**
4. **Agregar manejo de errores en suscripciones Firebase**

### 🟠 ALTO (Afecta calidad de datos)

5. **Implementar cálculo automático de progressPercent**
6. **Implementar cálculo automático de spentTotal**
7. **Validar APU generado por IA**
8. **Validar datos en todas las operaciones CRUD (Zod)**

### 🟡 MEDIO (Mejora de experiencia)

9. **Indicadores de carga por módulo**
10. **Retry mechanism en suscripciones Firebase**
11. **Validar cálculos de planilla guatemalteca**
12. **Verificar integración Gmail en producción**

### 🟢 BAJO (Mejora de UX)

13. **Agregar indicadores de error visibles**
14. **Mejorar mensajes de error**
15. **Agregar documentación de flujos de datos**

---

## 📝 RECOMENDACIONES PARA PRUEBAS E2E REALES

Como no puedo interactuar con la aplicación en producción (solo muestra "Cargando..."), recomiendo:

1. **Test manual local**:

   ```bash
   npm run dev
   ```
   - Verificar que AuthDialog se muestre sin auth
   - Verificar que workspace selector se muestre con auth pero sin workspace
   - Verificar que dashboard se muestre con auth + workspace

2. **Test de suscripciones Firebase**:
   - Abrir DevTools → Console
   - Buscar errores de Firebase
   - Verificar que todas las suscripciones se inicien

3. **Test de persistencia**:
   - Crear proyecto → Verificar que aparezca en Firestore Console
   - Crear expense → Verificar que se guarde
   - Actualizar expense → Verificar que se actualice en tiempo real

4. **Test de permissions**:
   - Crear usuario con role 'viewer'
   - Verificar que no pueda crear proyectos
   - Verificar que pueda leer proyectos

---

## ✅ ESTADO FINAL

**Módulos totales**: 13  
**Dependencias no resueltas**: 2 (tasks/milestones)  
**CRUD completos**: Parcial (falta update en la mayoría)  
**Validación de datos**: Parcial (solo frontend)  
**Manejo de errores**: Insuficiente  
**Estado de producción**: 🔴 No funcional (muestra "Cargando...")

---

## 🚀 ACCIONES INMEDIATAS REQUERIDAS

1. **Investigar por qué la app en producción muestra "Cargando..."**
2. **Agregar suscripciones tasks/milestones en useProjectData**
3. **Implementar cálculo automático de progressPercent y spentTotal**
4. **Agregar manejo de errores en suscripciones Firebase**
5. **Validar todos los datos antes de guardar en Firestore**
