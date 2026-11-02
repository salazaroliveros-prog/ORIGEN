# 🧹 GUÍA DE LIMPIEZA Y CORRECCIÓN DE ERRORES DE VALIDACIÓN

## ❌ Problema Identificado

```
Error: No se pudo archivar el proyecto:
ZodError: Invalid input: expected string, received undefined
```

**Causa:** Hay datos legacy en Firebase con campos `undefined` que la validación rechaza.

---

## ✅ SOLUCIÓN PASO A PASO

### Paso 1: Limpiar Firebase (Opción A - Recomendada)

**Si deseas resetear la base de datos a estado inicial:**

```bash
# 1. Descargar la clave de servicio de Firebase
#    - Ir a Firebase Console → Project Settings → Service Accounts
#    - Descargar JSON
#    - Guardar como: ./firebase-admin-key.json

# 2. Ejecutar script de limpieza
npx ts-node scripts/cleanup-firebase.ts

# 3. Confirmar escribiendo "SI" cuando se pida
```

**¿Qué se eliminará?**

```
✅ Proyectos
✅ Tareas/Hitos
✅ Gastos
✅ Empleados
✅ Maquinaria
✅ APUs
✅ Cotizaciones
✅ Visitas de campo
✅ Registros de asistencia

❌ NO se elimina:
  - Configuración de empresa
  - Datos de usuarios
  - Configuración
```

---

### Paso 2: Validación Mejorada (Implementada)

Se han actualizado las validaciones en `lib/validation/project.schema.ts`:

**Tipos de validación:**

1. **Para datos NUEVOS (formularios):**
   - `validateProjectForm()` - Requiere TODOS los campos
   - Rechaza valores undefined

2. **Para datos EXISTENTES (Firebase):**
   - `validateAndFixProjectData()` - Tolera campos faltantes
   - Aplica valores por defecto
   - Corrige automáticamente

---

### Paso 3: Usar la Nueva Validación

```typescript
// Para CREAR proyectos (en formularios)
const result = validateProjectForm(formData);
if (!result.success) {
  // Mostrar errores al usuario
}

// Para CORREGIR proyectos existentes
try {
  const fixed = validateAndFixProjectData(projectFromFirebase);
  // Ahora tiene todos los campos necesarios
} catch (error) {
  // Proyecto inválido, requiere intervención
}
```

---

## 🚀 COMANDO RÁPIDO DE LIMPIEZA

```bash
# Todo en uno (asume que tienes firebase-admin-key.json)
npx ts-node scripts/cleanup-firebase.ts
```

---

## ⚠️ ANTES DE LIMPIAR

1. **Backup de datos** (Opcional):

   ```bash
   # Exportar datos desde Firebase Console
   # Firebase Console → Firestore Database → Backup & Restore
   ```

2. **Confirmar URL de proyecto:**

   ```bash
   # Verificar en .env.local
   echo $NEXT_PUBLIC_FIREBASE_PROJECT_ID
   ```

3. **Descargar Service Account Key:**
   - Firebase Console → ⚙️ Project Settings
   - Service Accounts tab
   - Generate new private key
   - Guardar como `firebase-admin-key.json` en raíz del proyecto

---

## 🔍 VERIFICAR DESPUÉS DE LIMPIAR

```bash
# 1. Reiniciar aplicación
npm run dev

# 2. Crear nuevo proyecto (sin datos legacy)
# - Click "Nuevo Proyecto"
# - Llenar formulario
# - Guardar

# 3. Verificar en Firebase Console
# - Firestore Database
# - Ver colección 'projects'
# - Debe haber 1 documento nuevo

# 4. No debe haber errores de validación
```

---

## 📋 ESTRUCTURAS DE DATOS CORRECTAS

### Proyecto (Requerido)

```json
{
  "id": "proj-123",
  "code": "OBRA-2026-01",
  "name": "Torre Residencial Vista Hermosa",
  "client": "Desarrollador XYZ",
  "location": "Zona 1, Guatemala",
  "municipality": "Guatemala",
  "department": "Guatemala",
  "budgetTotal": 500000,
  "spentTotal": 0,
  "progressPercent": 0,
  "startDate": "2026-01-15",
  "endDate": "2026-06-15",
  "status": "En Ejecución",
  "lat": 14.6133,
  "lng": -90.4875,
  "expectedProfitMarginPercent": null,
  "companyId": "company-123",
  "ownerId": "user-123"
}
```

### Gasto (Requerido)

```json
{
  "id": "exp-123",
  "projectId": "proj-123",
  "date": "2026-01-20",
  "category": "Materiales (Cementos, Hierro)",
  "description": "Cemento Tipo I - 50 bolsas",
  "supplier": "Proveedor A",
  "nitSupplier": "123456789",
  "facturaNumber": "FAC-001",
  "amount": 5000,
  "currency": "GTQ",
  "paymentMethod": "Efectivo",
  "companyId": "company-123",
  "authorId": "user-123"
}
```

### Empleado (Requerido)

```json
{
  "id": "emp-123",
  "name": "Juan Pérez",
  "role": "Capataz",
  "dailyRateGTQ": 350,
  "igssAffiliated": true,
  "companyId": "company-123"
}
```

---

## 🛠️ TROUBLESHOOTING

### Error: "firebase-admin-key.json not found"

```bash
# Descargar desde Firebase Console:
# 1. Ir a Project Settings
# 2. Service Accounts tab
# 3. Click "Generate New Private Key"
# 4. Guardar en raíz del proyecto como: firebase-admin-key.json
```

### Error: "Permission denied"

```bash
# Verificar Firestore Security Rules
# Firebase Console → Firestore → Rules
# Deben permitir lectura/escritura para testing:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Desarrollo/Testing
    allow read, write: if true;  // ⚠️ SOLO PARA TESTING
  }
}
```

### Error: "DEADLINE_EXCEEDED"

```bash
# Firestore tiene limites de escritura
# Si hay muchos documentos:
# 1. Aumentar batchSize en cleanup-firebase.ts
# 2. Ejecutar nuevamente
# 3. Puede tomar varios minutos
```

---

## 📊 CHECKLIST POST-LIMPIEZA

- [ ] Firebase vacío (excepto companySettings y users)
- [ ] Aplicación carga sin errores
- [ ] Puedo crear nuevo proyecto
- [ ] Proyecto se guarda correctamente
- [ ] No hay errores de validación en console
- [ ] Todos los campos requeridos se aceptan
- [ ] Base de datos lista para datos reales

---

## 🚀 PRÓXIMOS PASOS

1. **Crear datos iniciales reales:**

   ```
   - Crear 1 proyecto nuevo
   - Agregar 3-5 tareas
   - Crear gastos de prueba
   - Validar sincronización
   ```

2. **Testing completo:**

   ```bash
   npm test  # Ejecutar suite de tests
   ```

3. **Verificar en producción:**
   ```
   - Visitar https://origen-one-kohl.vercel.app
   - Confirmar que datos se sincronizan
   ```

---

## 📞 SOPORTE

Si encuentras problemas:

1. **Verificar logs:**

   ```bash
   # Browser DevTools → Console
   # Buscar mensajes de error
   ```

2. **Revisar Firebase:**

   ```
   Firebase Console → Firestore Database
   - Ver documentos
   - Revisar missing fields
   ```

3. **Ejecutar validación manual:**
   ```typescript
   import { validateAndFixProjectData } from '@/lib/validation/project.schema';

   const fixed = validateAndFixProjectData(problematicData);
   console.log('Fixed:', fixed);
   ```

---

**Documento actualizado:** 2025-05-16  
**Versión:** 1.0  
**Status:** Ready
