# ORIGEN - Flujo real de operación

## 1. Creación de proyecto

### Objetivo
Crear un proyecto con datos reales de obra, presupuesto, ubicación y responsable.

### Campos recomendados
- id
- name
- client
- status
- budgetTotal
- spentTotal
- expectedProfitMarginPercent
- location
- startDate
- endDate
- ownerId
- createdAt

### Regla de negocio
- Solo `admin` o `manager` pueden crear proyectos
- Cada proyecto debe quedar ligado a `ownerId`
- El `status` debe iniciar en `active` o `paused`

### Ejemplo de documento
```json
{
  "id": "project-001",
  "name": "Residencial Los Pinos",
  "client": "Inmobiliaria Sol",
  "status": "active",
  "budgetTotal": 2500000,
  "spentTotal": 1450000,
  "expectedProfitMarginPercent": 18,
  "location": "Zapopan, Jalisco",
  "startDate": "2026-01-10",
  "endDate": "2027-01-10",
  "ownerId": "uid_empresa",
  "createdAt": "2026-10-22T10:00:00Z"
}
```

## 2. Registro de gasto

### Objetivo
Registrar costo real del proyecto.

### Campos recomendados
- id
- projectId
- category
- description
- amount
- date
- createdAt
- authorId

### Regla de negocio
- Solo `admin` o `manager` pueden registrar gastos
- El gasto siempre debe asociarse a un proyecto válido
- El monto debe ser positivo

### Ejemplo
```json
{
  "id": "expense-001",
  "projectId": "project-001",
  "category": "materiales",
  "description": "Cemento para estructura",
  "amount": 25000,
  "date": "2026-10-22",
  "createdAt": "2026-10-22T10:15:00Z",
  "authorId": "uid_usuario"
}
```

## 3. Registro de asistencia

### Objetivo
Controlar asistencia de personal por obra y fecha.

### Campos recomendados
- id
- workerId
- projectId
- date
- status
- authorId

### Estado válido
- present
- late
- absent
- holiday

### Regla de negocio
- `supervisor` o `manager` pueden registrar asistencia
- `worker` solo puede registrar su propia asistencia
- debe existir un proyecto válido

### Ejemplo
```json
{
  "id": "attendance-001",
  "workerId": "worker-001",
  "projectId": "project-001",
  "date": "2026-10-22",
  "status": "present",
  "authorId": "uid_supervisor"
}
```

## 4. Visita de obra

### Objetivo
Registrar inspecciones o visitas técnicas del proyecto.

### Campos recomendados
- id
- projectId
- date
- notes
- status
- authorId

### Estados válidos
- scheduled
- done
- delayed

### Regla de negocio
- `supervisor`, `manager` o `admin` pueden registrar visitas
- el texto de la visita debe describir avances o incidencias

### Ejemplo
```json
{
  "id": "visit-001",
  "projectId": "project-001",
  "date": "2026-10-22",
  "notes": "Se revisó la base y se confirmó avance del 64%",
  "status": "done",
  "authorId": "uid_supervisor"
}
```

## 5. Asignación de usuario a proyecto

### Objetivo
Definir quién participa en cada proyecto.

### Estructura recomendada
```json
{
  "projectId": "project-001",
  "userId": "uid_usuario",
  "roleInProject": "manager",
  "assignedAt": "2026-10-22T10:00:00Z"
}
```

### Recomendación
Crear una colección separada llamada `projectMembers` para controlar accesos específicos por proyecto.

## 6. Política de seguridad recomendada

- `ownerId` en cada colección principal para aislar los datos por empresa
- `projectMembers` para controlar acceso por proyecto
- Validar permisos en Firestore Rules
- Ocultar acciones según el rol en la UI
- No confiar solo en el frontend para permisos

## 7. Reglas operativas finales

- Los proyectos y gastos siempre deben pertenecer a una empresa o dueño
- La asistencia debe estar validada por proyecto y fecha
- Las visitas deben tener seguimiento y status claro
- Cada cambio debe quedar asociado a un autor
- Los reportes deben calcularse a partir de los datos reales del proyecto
