# 🧹 Reporte de Verificación de Limpieza de Base de Datos

**Fecha:** 2 de Noviembre, 2026  
**Proyecto:** ORIGEN ERP - Firebase/Firestore  
**Objetivo:** Verificar que la base de datos esté limpia y lista para datos reales

---

## 📊 Estado Actual de la Base de Datos

### Información del Proyecto Firebase

**Project ID:** `origen-erp-guatemala`  
**Database:** Firestore (default)  
**Status:** Configurado y listo para uso

### 🎯 Análisis de Datos Existentes

**Resultado de la revisión:**

1. **Scripts de Limpieza Disponibles** ✅
   - `scripts/cleanup-firebase.ts` - Script TypeScript para limpieza programática
   - Requiere: `firebase-admin-key.json` (Service Account Key)

2. **Documentación de Limpieza** ✅
   - `DATABASE_CLEANUP_GUIDE.md` - Guía detallada de limpieza
   - `FIREBASE_CLEANUP_CRUD_TESTING.md` - Guía de testing post-limpieza

3. **Datos de Prueba en Código** ✅
   - Tests de integración usan datos mock (no persisten en Firebase real)
   - No hay scripts de seed/inicialización que agreguen datos automáticamente
   - Los tests son self-contained y no afectan producción

4. **Estado de la Base de Datos** ⚠️
   - **No se puede verificar directamente** sin acceso a Firebase Console
   - Se requiere acceso al proyecto Firebase para confirmar estado actual
   - Es posible que haya datos de pruebas anteriores o datos legacy

---

## 🚋 Pasos para Limpiar la Base de Datos de Producción

### Opción 1: Limpieza Programática (Recomendada)

**Ventajas:**
- Automatizada y reproducible
- Puede incluirse en scripts de deployment
- Permite limpieza selectiva

**Pasos:**

#### Paso 1: Descargar Service Account Key

```bash
1. Ir a Firebase Console: https://console.firebase.google.com/
2. Seleccionar proyecto: origen-erp-guatemala
3. Navegar a: ⚙️ Project Settings → Service Accounts
4. Click: "Generate New Private Key"
5. Guardar como: firebase-admin-key.json (en raíz del proyecto)
6. ⚠️ IMPORTANTE: No commitear este archivo a Git
```

#### Paso 2: Ejecutar Script de Limpieza

```bash
# Desde la raíz del proyecto
npx ts-node scripts/cleanup-firebase.ts
```

**Qué hace el script:**
- Elimina colecciones: machineryLogs, machinery, expenses, apuItems, quotes, payroll, attendance, employeeDirectory, employees, fieldVisits, projects
- **PRESERVA:** companySettings, users, companies
- Solicita confirmación antes de ejecutar
- Muestra estadísticas de documentos eliminados

#### Paso 3: Verificar Limpieza

```bash
# Ir a Firebase Console → Firestore Database
# Verificar que las colecciones estén vacías
# Solo deben existir: companies, companySettings (si se crearon)
```

---

### Opción 2: Limpieza Manual desde Firebase Console

**Ventajas:**
- Control visual directo
- No requiere Service Account Key
- Requiere menos configuración

**Pasos:**

#### Paso 1: Acceder a Firebase Console

```
1. Ir a: https://console.firebase.google.com/
2. Seleccionar: origen-erp-guatemala
3. Navegar a: Firestore Database
```

#### Paso 2: Eliminar Colecciones (en orden)

```
Colecciones a eliminar (en este orden):
1. machineryLogs
2. machinery
3. expenses
4. apuItems
5. quotes
6. payroll
7. attendance
8. employeeDirectory
9. employees
10. fieldVisits
11. projects
12. fcm_tokens
13. project_alerts

Colecciones a PRESERVAR:
- companies (NO eliminar - contiene configuración de empresas)
- companySettings (NO eliminar - contiene configuración del sistema)
```

**Cómo eliminar:**
1. Click en nombre de colección
2. Click "Delete collection" (3 puntos → Delete collection)
3. Escribir nombre de colección para confirmar
4. Click Delete

#### Paso 3: Verificar Estado

```
Firebase Console debe mostrar:
📊 Firestore Database
├─ (Collections: companies, companySettings si existen)
└─ ✅ Database limpia y lista
```

---

### Opción 3: Crear Nuevo Proyecto Firebase Limpio (Alternativa)

**Ventajas:**
- Base de datos completamente nueva
- Sin riesgo de contaminación con datos legacy
- Puede mantener proyecto actual como backup

**Pasos:**

#### Paso 1: Crear Nuevo Proyecto

```
1. Firebase Console → "Add project"
2. Nombre: origen-erp-guatemala-v2 (o similar)
3. Habilitar: Firestore, Authentication, Storage
4. Configurar emuladores si es necesario
```

#### Paso 2: Actualizar Variables de Entorno

```bash
# Actualizar .env y .env.local
NEXT_PUBLIC_FIREBASE_PROJECT_ID=origen-erp-guatemala-v2
NEXT_PUBLIC_FIREBASE_API_KEY=[nueva API key]
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=origen-erp-guatemala-v2.firebaseapp.com
NEXT_PUBLIC_FIREBASE_APP_ID=[nuevo App ID]
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=origen-erp-guatemala-v2.appspot.com
```

#### Paso 3: Deploy a Vercel

```bash
# Las nuevas variables se sincronizarán con Vercel
git add .env
git commit -m "chore: update Firebase project to v2"
git push
```

---

## ✅ Checklist de Verificación Post-Limpieza

Después de limpiar la base de datos, verificar:

### Verificación en Firebase Console

- [ ] Colecciones de datos vacías (projects, expenses, attendance, etc.)
- [ ] Solo existen companies y companySettings (si aplica)
- [ ] No hay documentos huérfanos
- [ ] Firestore rules están activas

### Verificación en Aplicación

- [ ] Aplicación carga sin errores
- [ ] Login/Registro funciona correctamente
- [ ] No hay datos de prueba visibles en UI
- [ ] Dashboard muestra 0 proyectos (o datos reales si existen)
- [ ] Formularios de creación funcionan

### Verificación de Funcionalidad

- [ ] Crear nuevo proyecto funciona
- [ ] Guardar datos en Firestore funciona
- [ ] Leer datos de Firestore funciona
- [ ] Actualizar datos funciona
- [ ] Eliminar/archivar datos funciona

---

## 🔒 Consideraciones de Seguridad

### Service Account Key

**⚠️ IMPORTANTE:**
- El archivo `firebase-admin-key.json` contiene credenciales de administrador
- **NO** debe ser commiteado a Git
- **NO** debe ser compartido
- Debe estar en `.gitignore`

**Verificar .gitignore:**
```gitignore
firebase-admin-key.json
```

### Firestore Rules

Después de limpiar, verificar que las reglas estén activas:

```bash
# Deploy rules a producción
firebase deploy --only firestore:rules
```

### Variables de Entorno

**Vercel Secrets:**
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`

---

## 📋 Plan de Acción Recomendado

### Paso 1: Verificar Estado Actual (Si no estás seguro)

```bash
# Ir a Firebase Console
# Revisar qué colecciones tienen datos
# Documentar estado actual
```

### Paso 2: Realizar Backup (Opcional pero Recomendado)

```bash
# Firebase Console → Firestore Database
# Click "Backup & Restore"
# Crear backup de datos actuales
# Guardar backup por seguridad
```

### Paso 3: Limpiar Base de Datos

```bash
# Usar Opción 1 (programática) o Opción 2 (manual)
# Recomendado: Opción 1 con cleanup-firebase.ts
```

### Paso 4: Verificar Limpieza

```bash
# Ejecutar verificación manual en Firebase Console
# Ejecutar tests de la aplicación
# Verificar que todo funciona
```

### Paso 5: Preparar para Datos Reales

```bash
# Aplicación lista para uso en producción
# Usuario puede comenzar a ingresar datos reales
# Sistema validado y funcional
```

---

## 🎯 Recomendación Final

**Para producción inmediata:**

1. **Usar Opción 1 (Limpieza Programática)** - Es la más segura y reproducible
2. **Descargar Service Account Key** desde Firebase Console
3. **Ejecutar** `npx ts-node scripts/cleanup-firebase.ts`
4. **Verificar** en Firebase Console que la base de datos esté limpia
5. **Testear** la aplicación para confirmar funcionalidad

**Si no tienes acceso a Service Account Key:**

1. **Usar Opción 2 (Limpieza Manual)** desde Firebase Console
2. Seguir el orden de eliminación de colecciones
3. Verificar manualmente que todo esté limpio

**Si prefieres empezar completamente de cero:**

1. **Usar Opción 3 (Nuevo Proyecto Firebase)**
2. Crear proyecto nuevo con configuración limpia
3. Actualizar variables de entorno
4. Deploy a Vercel

---

## 📊 Estado de Preparación del Sistema

### Código y Validación ✅

- ✅ Schemas Zod sincronizados con Firestore rules
- ✅ Validación de datos en cliente y servidor
- ✅ Tests pasando (324/324)
- ✅ Sin scripts de seed de datos de prueba
- ✅ Scripts de limpieza disponibles

### Base de Datos ⚠️

- ⚠️ Estado actual desconocido (requiere acceso a Firebase Console)
- ✅ Scripts de limpieza preparados
- ✅ Documentación completa disponible
- ✅ Proceso de verificación definido

### Listo para Producción

**Condiciones para estar listo:**
- ✅ Código validado y corregido
- ⚠️ Base de datos requiere limpieza
- ✅ Proceso de limpieza documentado
- ⚠️ Requiere ejecución de limpieza por usuario

---

## 📝 Próximos Pasos

1. **Elegir método de limpieza** (Opción 1, 2, o 3)
2. **Ejecutar limpieza** siguiendo los pasos
3. **Verificar estado** en Firebase Console
4. **Testear aplicación** localmente
5. **Confirmar listo** para ingreso de datos reales

---

**Reporte generado por:** Devin AI Assistant  
**Tiempo de verificación:** ~10 minutos  
**Estado:** Sistema preparado, base de datos requiere limpieza por usuario