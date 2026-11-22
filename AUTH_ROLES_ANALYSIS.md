# Análisis del Sistema de Autenticación y Roles - ORIGEN ERP

**Fecha:** 2026-11-21  
**Analizado por:** Devin AI Assistant  
**Administrador Principal:** salazaroliveros@gmail.com

---

## 📋 Resumen Ejecutivo

El sistema ORIGEN ERP utiliza Firebase Authentication para la gestión de usuarios y Firestore para el almacenamiento de roles y permisos. El sistema está diseñado para:

1. **Administrador Principal**: `salazaroliveros@gmail.com` con acceso completo a todo el sistema
2. **Usuarios Delegados**: Correos autenticados o registrados que reciben roles específicos asignados por el administrador
3. **Sistema de Roles Granular**: 7 roles diferentes con permisos específicos por módulo

---

## 🔐 Configuración del Administrador Principal

### Configuración Actual

**Archivo:** `.env.local`

```bash
PRIMARY_ADMIN_EMAIL=salazaroliveros@gmail.com
```

**Función de Verificación:** `lib/firebaseAuth.ts` (líneas 155-159)

```typescript
export function isPrimaryAdministrator(email: string | null | undefined): boolean {
  const adminEmail = (process.env.PRIMARY_ADMIN_EMAIL || '').trim().toLowerCase();
  if (!adminEmail) return false;
  return email?.trim().toLowerCase() === adminEmail;
}
```

**Observaciones:**

- ✅ El email del administrador está configurado correctamente
- ✅ La función `isPrimaryAdministrator` realiza verificación case-insensitive
- ✅ Trimming de espacios en blanco para mayor robustez
- ⚠️ `PRIMARY_ADMIN_EMAIL` está en `.env.local` (desarrollo), debe configurarse en producción vía variable de entorno

---

## 👥 Sistema de Roles

### Roles Definidos

**Archivo:** `lib/types.ts` (líneas 59-60)

```typescript
export type CompanyRole =
  | 'owner'
  | 'admin'
  | 'project_manager'
  | 'finance'
  | 'field_worker'
  | 'warehouse_manager'
  | 'viewer';
```

### Descripción de Roles

| Rol                 | Etiqueta                           | Descripción                                         |
| ------------------- | ---------------------------------- | --------------------------------------------------- |
| `owner`             | Propietario                        | Acceso completo a la empresa, solo uno por compañía |
| `admin`             | Administrador                      | Acceso administrativo casi completo                 |
| `project_manager`   | Project Manager / Director de Obra | Gestión de proyectos y recursos de obra             |
| `finance`           | Finanzas                           | Gestión financiera, planillas y gastos              |
| `field_worker`      | Trabajador de Campo                | Registro de asistencia y maquinaria en obra         |
| `warehouse_manager` | Encargado de bodega                | Gestión de inventario y compras                     |
| `viewer`            | Consulta (solo lectura)            | Solo visualización de datos                         |

---

## 🔑 Matriz de Permisos por Rol

### Permisos en MainApp (UI)

**Archivo:** `components/main-app/MainApp.tsx` (líneas 159-192)

| Permiso              | owner | admin | project_manager | finance | field_worker | warehouse_manager | viewer |
| -------------------- | ----- | ----- | --------------- | ------- | ------------ | ----------------- | ------ |
| canManageProjects    | ✅    | ✅    | ✅              | ❌      | ❌           | ❌                | ❌     |
| canManageQuotes      | ✅    | ✅    | ✅              | ✅      | ❌           | ❌                | ❌     |
| canManageBudget      | ✅    | ✅    | ✅              | ✅      | ❌           | ❌                | ❌     |
| canManageMachinery   | ✅    | ✅    | ✅              | ❌      | ✅           | ❌                | ❌     |
| canManageExpenses    | ✅    | ✅    | ❌              | ✅      | ❌           | ❌                | ❌     |
| canViewExpenses      | ✅    | ✅    | ✅              | ✅      | ❌           | ❌                | ✅     |
| canManageEmployees   | ✅    | ✅    | ❌              | ✅      | ❌           | ❌                | ❌     |
| canManageAttendance  | ✅    | ✅    | ✅              | ❌      | ✅           | ❌                | ❌     |
| canViewPersonnel     | ✅    | ✅    | ✅              | ✅      | ✅           | ❌                | ✅     |
| canViewFullPersonnel | ✅    | ✅    | ❌              | ✅      | ❌           | ❌                | ❌     |
| canManageCompany     | ✅    | ✅    | ❌              | ❌      | ❌           | ❌                | ❌     |
| canViewInventory     | ✅    | ✅    | ✅              | ✅      | ❌           | ✅                | ✅     |
| canManageInventory   | ✅    | ✅    | ✅              | ❌      | ❌           | ✅                | ❌     |
| canViewPurchasing    | ✅    | ✅    | ✅              | ✅      | ❌           | ✅                | ✅     |
| canManagePurchasing  | ✅    | ✅    | ✅              | ✅      | ❌           | ❌                | ❌     |
| canViewSupplyChain   | ✅    | ✅    | ✅              | ✅      | ❌           | ✅                | ✅     |

### Permisos en lib/permissions.ts (Backend Logic)

**Archivo:** `lib/permissions.ts`

| Función                    | Roles Permitidos                                                  | Descripción                          |
| -------------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| `canReadFullPersonnel`     | owner, admin, finance                                             | Ver información completa de personal |
| `canReadEmployeeDirectory` | owner, admin, project_manager, finance, field_worker              | Ver directorio de empleados          |
| `canManagePersonnel`       | owner, admin, finance                                             | Gestionar personal                   |
| `canReadAttendance`        | owner, admin, project_manager, finance, field_worker              | Ver asistencia                       |
| `canReadInventory`         | owner, admin, project_manager, finance, warehouse_manager, viewer | Ver inventario                       |
| `canManageInventory`       | owner, admin, project_manager, warehouse_manager                  | Gestionar inventario                 |
| `canReadPurchasing`        | owner, admin, project_manager, finance, warehouse_manager, viewer | Ver compras                          |
| `canManagePurchasing`      | owner, admin, project_manager, finance                            | Gestionar compras                    |
| `canWriteExpenses`         | owner, admin, finance                                             | Escribir gastos                      |
| `canReadExpenses`          | owner, admin, project_manager, finance, viewer                    | Ver gastos                           |
| `canWriteFelInvoices`      | owner, admin, finance                                             | Emitir facturas FEL                  |

---

## 🏗️ Estructura de Membresía y Workspace

### CompanyMembership

**Archivo:** `lib/types.ts` (líneas 94-107)

```typescript
export interface CompanyMembership {
  companyId: string;
  uid: string;
  email: string;
  role: CompanyRole;
  joinedAt: string;
  invitationId?: string;
}
```

### CompanyInvitation

**Archivo:** `lib/types.ts` (líneas 113-132)

```typescript
export interface CompanyInvitation {
  id: string;
  companyId: string;
  email: string;
  role: Exclude<CompanyRole, 'owner'>; // No se puede invitar como owner
  status: 'pending' | 'accepted';
  createdBy: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  acceptedBy?: string;
}
```

**Observaciones:**

- ✅ Los roles se asignan por membership (por compañía)
- ✅ El rol `owner` no puede ser invitado (se asigna manualmente)
- ✅ Las invitaciones tienen expiración
- ✅ Se rastrea quién creó y quién aceptó la invitación

---

## 🔍 Flujo de Autenticación y Delegación de Roles

### 1. Registro/Autenticación de Usuario

**Archivos Relevantes:**

- `lib/firebaseAuth.ts` - Funciones de autenticación
- `components/LoginForm.tsx` - UI de login (debe existir)

**Proceso:**

1. Usuario se registra o inicia sesión con email/password
2. Firebase Auth autentica al usuario
3. El usuario puede tener 0+ memberships en diferentes compañías
4. Si no tiene memberships, puede aceptar invitaciones pendientes

### 2. Delegación de Roles por Administrador

**Roles Invitables:**

- admin
- project_manager
- finance
- field_worker
- warehouse_manager
- viewer

**Proceso:**

1. El administrador (owner/admin) crea una invitación
2. Especifica el email del usuario y el rol a asignar
3. El usuario recibe notificación (debe implementarse)
4. El usuario acepta la invitación
5. Se crea la membership con el rol asignado

---

## ✅ Estado Actual del Sistema

### Configuración del Administrador Principal

| Aspecto                       | Estado | Observaciones                               |
| ----------------------------- | ------ | ------------------------------------------- |
| Email configurado             | ✅     | `salazaroliveros@gmail.com` en `.env.local` |
| Función de verificación       | ✅     | `isPrimaryAdministrator()` implementada     |
| Verificación case-insensitive | ✅     | Normaliza a lowercase                       |
| Trimming de espacios          | ✅     | Elimina espacios en blanco                  |
| Configuración producción      | ⚠️     | Debe configurarse en variables de entorno   |

### Sistema de Roles

| Aspecto                 | Estado | Observaciones                                      |
| ----------------------- | ------ | -------------------------------------------------- |
| Roles definidos         | ✅     | 7 roles con etiquetas claras                       |
| Permisos UI             | ✅     | Matriz de permisos en MainApp                      |
| Permisos backend        | ✅     | Funciones en lib/permissions.ts                    |
| Consistencia            | ⚠️     | Ligera discrepancia entre UI y backend (ver notas) |
| Roles invitables        | ✅     | 6 roles (excluye owner)                            |
| Sistema de invitaciones | ✅     | CompanyInvitation con expiración                   |

### Inconsistencias Detectadas

**Nota Importante:** Hay una ligera discrepancia entre los permisos en MainApp y lib/permissions.ts:

1. **canManageMachinery** en MainApp incluye `field_worker`, pero no hay función equivalente en lib/permissions.ts
2. **canManageAttendance** en MainApp incluye `field_worker`, pero lib/permissions.ts usa `canReadAttendance` que es solo lectura
3. **canViewFullPersonnel** en MainApp es igual a `canReadFullPersonnel` en lib/permissions.ts (correcto)

**Recomendación:** Alinear completamente los permisos de UI con las funciones de backend para evitar confusión.

---

## 🎯 Requisitos del Usuario vs Estado Actual

### Requisito 1: Administrador con acceso completo

**Requisito:** `salazaroliveros@gmail.com` debe tener acceso a todo en producción y localmente

**Estado Actual:**

- ✅ Email configurado en `.env.local`
- ✅ Función `isPrimaryAdministrator()` verifica el email
- ⚠️ **Pendiente:** Verificar que el rol `owner` se asigne automáticamente al administrador principal en el sistema de memberships

**Acción Requerida:**

1. Verificar que cuando `salazaroliveros@gmail.com` se registre, se asigne automáticamente el rol `owner`
2. Asegurar que en producción la variable de entorno `PRIMARY_ADMIN_EMAIL` esté configurada
3. Implementar verificación en el backend para que el administrador principal tenga acceso irrestricto

### Requisito 2: Delegación de roles por administrador

**Requisito:** El resto de correos que se autentiquen o registren deben recibir roles delegados por el administrador

**Estado Actual:**

- ✅ Sistema de invitaciones implementado
- ✅ Roles invitables definidos (6 roles)
- ✅ El rol `owner` no puede ser invitado (protección)
- ⚠️ **Pendiente:** Verificar que nuevos usuarios sin invitación no tengan acceso a ninguna compañía por defecto

**Acción Requerida:**

1. Asegurar que usuarios nuevos sin membership sean redirigidos a una página de "esperando invitación"
2. Implementar UI para que el administrador pueda crear invitaciones
3. Implementar notificaciones de invitación (email o en-app)

---

## 📝 Recomendaciones

### 1. Asegurar Acceso Completo del Administrador Principal

```typescript
// Sugerencia: Agregar en lib/firebaseAuth.ts o en un middleware
export function getPrimaryAdminRole(): CompanyRole {
  return 'owner';
}

// En el componente de registro/membership
if (isPrimaryAdministrator(user.email)) {
  // Asignar automáticamente rol owner en la compañía principal
  const membership: CompanyMembership = {
    companyId: primaryCompanyId,
    uid: user.uid,
    email: user.email,
    role: 'owner',
    joinedAt: new Date().toISOString(),
  };
  // Guardar en Firestore
}
```

### 2. Alinear Permisos UI con Backend

```typescript
// Agregar en lib/permissions.ts
export function canManageMachinery(role?: CompanyRole | null): boolean {
  return role != null && ['owner', 'admin', 'project_manager', 'field_worker'].includes(role);
}

export function canManageAttendance(role?: CompanyRole | null): boolean {
  return role != null && ['owner', 'admin', 'project_manager', 'field_worker'].includes(role);
}
```

### 3. Implementar UI de Gestión de Invitaciones

**Componente necesario:** `components/InvitationManager.tsx`

Funcionalidades:

- Crear invitación con email y rol
- Ver invitaciones pendientes
- Cancelar invitaciones
- Ver historial de invitaciones aceptadas

### 4. Implementar Pantalla de Bienvenida para Nuevos Usuarios

**Componente necesario:** `components/WelcomeScreen.tsx`

Funcionalidades:

- Mostrar al usuario que no tiene acceso a ninguna compañía
- Indicar que debe esperar una invitación del administrador
- Opcional: permitir crear una nueva compañía (si el usuario es el primer registro)

### 5. Configuración de Producción

**Variables de entorno requeridas:**

```bash
# En Vercel/producción
PRIMARY_ADMIN_EMAIL=salazaroliveros@gmail.com
```

---

## 🔒 Seguridad

### Medidas Actuales

1. ✅ Firebase Authentication maneja la autenticación
2. ✅ Firestore Security Rules (deben verificarse)
3. ✅ Roles almacenados en Firestore (no en el cliente)
4. ✅ Permisos verificados en backend (lib/permissions.ts)
5. ✅ El rol `owner` no puede ser invitado

### Medidas Recomendadas

1. ⚠️ Verificar Firestore Security Rules para asegurar que:
   - Solo usuarios con membership puedan acceder a datos de la compañía
   - Las escrituras respeten los permisos de rol
   - El administrador principal tenga acceso irrestricto

2. ⚠️ Implementar logging de auditoría para:
   - Cambios de roles
   - Creación de invitaciones
   - Aceptación de invitaciones
   - Acceso a datos sensibles

---

## 📊 Matriz de Acceso por Módulo

### Módulos y Roles con Acceso

| Módulo                   | owner       | admin       | project_manager | finance     | field_worker | warehouse_manager | viewer    |
| ------------------------ | ----------- | ----------- | --------------- | ----------- | ------------ | ----------------- | --------- |
| Tablero                  | ✅          | ✅          | ✅              | ✅          | ✅           | ✅                | ✅        |
| Proyectos                | ✅ (manage) | ✅ (manage) | ✅ (manage)     | ❌          | ❌           | ❌                | ❌        |
| Presupuestos             | ✅ (manage) | ✅ (manage) | ✅ (manage)     | ✅ (manage) | ❌           | ❌                | ❌        |
| Personal                 | ✅ (full)   | ✅ (full)   | ✅ (view)       | ✅ (full)   | ✅ (view)    | ❌                | ✅ (view) |
| Asistencia               | ✅ (manage) | ✅ (manage) | ✅ (manage)     | ❌          | ✅ (manage)  | ❌                | ❌        |
| Gastos                   | ✅ (manage) | ✅ (manage) | ✅ (view)       | ✅ (manage) | ❌           | ❌                | ✅ (view) |
| Inventario               | ✅ (manage) | ✅ (manage) | ✅ (manage)     | ✅ (view)   | ❌           | ✅ (manage)       | ✅ (view) |
| Compras                  | ✅ (manage) | ✅ (manage) | ✅ (manage)     | ✅ (manage) | ❌           | ✅ (view)         | ✅ (view) |
| Maquinaria               | ✅ (manage) | ✅ (manage) | ✅ (manage)     | ❌          | ✅ (manage)  | ❌                | ❌        |
| Planillas                | ✅ (manage) | ✅ (manage) | ❌              | ✅ (manage) | ❌           | ❌                | ❌        |
| Configuración de Empresa | ✅ (manage) | ✅ (manage) | ❌              | ❌          | ❌           | ❌                | ❌        |

**Leyenda:**

- ✅ (manage) - Acceso completo (lectura + escritura)
- ✅ (view) - Solo lectura
- ✅ (full) - Acceso completo a información sensible (salarios, etc.)
- ❌ - Sin acceso

---

## 🧪 Plan de Pruebas Recomendado

### 1. Prueba de Administrador Principal

**Pasos:**

1. Iniciar sesión con `salazaroliveros@gmail.com`
2. Verificar que tenga acceso a todos los módulos
3. Verificar que pueda crear/editar/borrar en todos los módulos
4. Verificar que pueda ver configuración de empresa
5. Verificar que pueda gestionar usuarios y roles

**Resultado Esperado:** ✅ Acceso completo a todo el sistema

### 2. Prueba de Usuario Nuevo Sin Invitación

**Pasos:**

1. Registrar un nuevo usuario (ej: test@example.com)
2. Verificar que no tenga acceso a ninguna compañía
3. Verificar que sea redirigido a pantalla de bienvenida/espera

**Resultado Esperado:** ✅ Sin acceso hasta recibir invitación

### 3. Prueba de Delegación de Roles

**Pasos:**

1. Como administrador, crear invitación para test@example.com con rol `viewer`
2. Aceptar invitación como test@example.com
3. Verificar que solo tenga acceso de lectura
4. Cambiar rol a `project_manager`
5. Verificar que tenga acceso de gestión de proyectos

**Resultado Esperado:** ✅ Permisos actualizados según rol asignado

### 4. Prueba de Cada Rol

**Pasos:**

1. Crear usuarios para cada rol
2. Verificar acceso según matriz de permisos
3. Intentar acciones no permitidas (deben fallar)

**Resultado Esperado:** ✅ Cada rol con permisos correctos

---

## 📌 Conclusiones

### Estado General

El sistema de autenticación y roles de ORIGEN ERP está **bien diseñado** con:

- ✅ Sistema de roles granular y claro
- ✅ Matriz de permisos bien definida
- ✅ Sistema de invitaciones con expiración
- ✅ Protección del rol `owner`
- ✅ Separación de permisos UI y backend

### Pendientes Críticos

1. ⚠️ Verificar que el administrador principal tenga rol `owner` automático
2. ⚠️ Alinear completamente permisos UI con backend
3. ⚠️ Implementar UI de gestión de invitaciones
4. ⚠️ Implementar pantalla de bienvenida para usuarios nuevos
5. ⚠️ Configurar `PRIMARY_ADMIN_EMAIL` en producción
6. ⚠️ Verificar Firestore Security Rules

### Recomendación de Prioridad

**Alta Prioridad:**

1. Asegurar acceso completo del administrador principal
2. Alinear permisos UI con backend
3. Configurar variables de entorno de producción

**Media Prioridad:** 4. Implementar UI de gestión de invitaciones 5. Implementar pantalla de bienvenida 6. Verificar Firestore Security Rules

**Baja Prioridad:** 7. Implementar logging de auditoría 8. Implementar notificaciones de invitación

---

## 📚 Referencias

**Archivos Clave:**

- `lib/firebaseAuth.ts` - Autenticación y verificación de administrador
- `lib/types.ts` - Definición de tipos (CompanyRole, CompanyMembership, CompanyInvitation)
- `lib/permissions.ts` - Funciones de permisos de backend
- `components/main-app/MainApp.tsx` - Permisos de UI
- `.env.local` - Configuración de administrador principal

**Documentación:**

- Firestore Security Rules (pendiente de revisión)
- Firebase Authentication (documentación oficial)
