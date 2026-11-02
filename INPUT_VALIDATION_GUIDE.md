# ✅ GUÍA DE VALIDACIÓN MEJORADA DE INPUTS

## 📋 Cambios Implementados

### 1. Validación Estricta para Nuevos Datos

Todos los formularios ahora validan ANTES de guardar:

```typescript
// ✅ CORRECTO - Valida en tiempo real
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // 1. Validar estructura
  const validation = validateProjectForm(formData);
  if (!validation.success) {
    // 2. Mostrar errores específicos por campo
    validation.error.issues.forEach((issue) => {
      const field = issue.path[0];
      setErrors({ ...errors, [field]: issue.message });
    });
    return;
  }

  // 3. Enviar solo si válido
  await onSave(validation.data);
};
```

---

## 🎯 Campos Requeridos por Tipo de Dato

### Proyectos

| Campo                       | Tipo   | Requerido | Validación                                                         |
| --------------------------- | ------ | --------- | ------------------------------------------------------------------ |
| code                        | string | ✅        | 3-20 caracteres, mayúsculas/números                                |
| name                        | string | ✅        | 5-100 caracteres                                                   |
| client                      | string | ✅        | 3-100 caracteres                                                   |
| location                    | string | ✅        | 5-200 caracteres                                                   |
| municipality                | string | ✅        | 2-50 caracteres                                                    |
| department                  | string | ✅        | 2-50 caracteres                                                    |
| budgetTotal                 | number | ✅        | >= 0, <= 999,999,999                                               |
| spentTotal                  | number | ✅        | >= 0 (default: 0)                                                  |
| progressPercent             | number | ✅        | 0-100 (default: 0)                                                 |
| startDate                   | date   | ✅        | Formato YYYY-MM-DD                                                 |
| endDate                     | date   | ✅        | >= startDate                                                       |
| status                      | enum   | ✅        | En Ejecución / Planificación / Finalizado / Suspendido / Archivado |
| lat                         | number | ✅        | -90 a 90                                                           |
| lng                         | number | ✅        | -180 a 180                                                         |
| expectedProfitMarginPercent | number | ❌        | 0-100 o null                                                       |

### Gastos

| Campo         | Tipo   | Requerido | Validación           |
| ------------- | ------ | --------- | -------------------- |
| projectId     | string | ✅        | Debe existir         |
| date          | date   | ✅        | Formato YYYY-MM-DD   |
| category      | string | ✅        | Categoría válida     |
| description   | string | ✅        | 1-500 caracteres     |
| amount        | number | ✅        | >= 0.01              |
| currency      | enum   | ✅        | GTQ / USD            |
| supplier      | string | ❌        | Nombre del proveedor |
| nitSupplier   | string | ❌        | NIT del proveedor    |
| facturaNumber | string | ❌        | Número de factura    |

### Empleados

| Campo          | Tipo    | Requerido | Validación    |
| -------------- | ------- | --------- | ------------- |
| name           | string  | ✅        | 3+ caracteres |
| role           | enum    | ✅        | Rol válido    |
| dailyRateGTQ   | number  | ✅        | >= 0          |
| igssAffiliated | boolean | ❌        | true/false    |

---

## 🚨 Mensajes de Error Mejorados

### Antes (Confuso)

```
Error: Invalid input: expected string, received undefined
```

### Después (Claro)

```
Error: Datos de proyecto inválidos:
  code: El código debe tener al menos 3 caracteres
  name: El nombre del proyecto debe tener al menos 5 caracteres
  budgetTotal: El presupuesto debe ser mayor a 0
```

---

## 💡 Ejemplos de Validación

### Crear Proyecto Válido ✅

```typescript
const validProject = {
  code: 'OBRA-2026-01',
  name: 'Torre Residencial Vista Hermosa',
  client: 'Desarrollador XYZ',
  location: 'Avenida La Reforma, Zona 1, Guatemala',
  municipality: 'Guatemala',
  department: 'Guatemala',
  budgetTotal: 500000,
  spentTotal: 0,
  progressPercent: 0,
  startDate: '2026-01-15',
  endDate: '2026-06-15',
  status: 'En Ejecución',
  lat: 14.6133,
  lng: -90.4875,
};

// ✅ Se aceptará
const result = validateProjectForm(validProject);
console.log(result.success); // true
```

### Proyecto Inválido ❌

```typescript
const invalidProject = {
  code: 'AB', // ❌ Muy corto
  name: 'Torre', // ❌ Muy corto
  client: 'XYZ', // ✅ OK
  location: 'Zona 1', // ❌ Muy corto
  municipality: 'GTM', // ✅ OK
  department: 'GTM', // ✅ OK
  budgetTotal: -50000, // ❌ Negativo
  spentTotal: 0, // ✅ OK
  progressPercent: 150, // ❌ > 100
  startDate: '2026-01-15', // ✅ OK
  endDate: '2025-01-15', // ❌ Antes de start
  status: 'Desconocido', // ❌ Enum inválido
  lat: 150, // ❌ > 90
  lng: 200, // ❌ > 180
};

// ❌ Será rechazado con errores detallados
const result = validateProjectForm(invalidProject);
console.log(result.success); // false
console.log(result.error.issues); // Array de 9 errores
```

---

## 🔧 Cómo Corregir Errores Comunes

### Error: "El código debe tener al menos 3 caracteres"

**Solución:**

```
Campo: Código del Proyecto
Valor actual: "AB"
Corrección: Cambiar a "OBRA-2026-01" (mínimo 3 caracteres, mayúsculas/números)
```

### Error: "El nombre del proyecto debe tener al menos 5 caracteres"

**Solución:**

```
Campo: Nombre del Proyecto
Valor actual: "Torre"
Corrección: Cambiar a "Torre Residencial Vista Hermosa"
```

### Error: "El presupuesto debe ser mayor a 0"

**Solución:**

```
Campo: Presupuesto Total
Valor actual: 0 o -5000
Corrección: Ingresar valor > 0, ejemplo: 500000
```

### Error: "La fecha de finalización debe ser igual o posterior a la fecha de inicio"

**Solución:**

```
Campo: Fechas
Valor actual: Inicio: 2026-01-15, Fin: 2025-12-31
Corrección: Cambiar fin a 2026-06-15 (después de inicio)
```

### Error: "El avance debe estar entre 0 y 100"

**Solución:**

```
Campo: Avance (%)
Valor actual: 150
Corrección: Cambiar a 75 (entre 0 y 100)
```

---

## 🎨 Formato Correcto de Campos

### Fechas

```
Formato: YYYY-MM-DD
Ejemplos:
  ✅ 2026-01-15
  ✅ 2025-12-31
  ❌ 15/01/2026 (formato americano)
  ❌ 2026-1-15 (sin ceros)
```

### Montos de Dinero

```
Formato: Números enteros sin símbolos
Ejemplos:
  ✅ 500000 (500 mil quetzales)
  ✅ 2500 (2 mil 500 quetzales)
  ✅ 0 (cero)
  ❌ Q 500,000
  ❌ 500.000 (decimal europeo)
```

### Códigos

```
Formato: MAYÚSCULAS, números y guiones
Ejemplos:
  ✅ OBRA-2026-01
  ✅ TORRE-123
  ✅ REF-001-GTM
  ❌ Obra-2026-01 (minúsculas)
  ❌ obra-2026_01 (underscore)
```

### Ubicaciones

```
Formato: Dirección completa
Ejemplos:
  ✅ Avenida La Reforma, Zona 1, Guatemala
  ✅ Calzada Roosevelt, Zona 2, Mixco
  ❌ Zona 1 (muy corto)
  ❌ Z-1 (abreviado)
```

---

## 📱 Testing Manual

### Pasos para verificar que funciona:

1. **Abrir formulario de proyecto:**

   ```
   Click: "Nuevo Proyecto"
   ```

2. **Dejar campos vacíos:**

   ```
   Resultado esperado:
   - Botón "Crear" deshabilitado
   - Mensajes de error en rojo
   - Cada campo tiene su propio error
   ```

3. **Ingresar datos parciales:**

   ```
   Nombre: "Test"
   Cliente: "Cliente A"
   (dejar resto vacío)

   Resultado esperado:
   - Múltiples errores de validación
   - Solo muestra errores de campos vacíos
   ```

4. **Ingresar todos los datos correctos:**
   ```
   Todos los campos con valores válidos

   Resultado esperado:
   - Botón "Crear" habilitado
   - Sin mensajes de error
   - Click funciona y guarda
   ```

---

## 🔍 Debugging

Si recibe error aún después de llenar todos los campos:

1. **Abrir DevTools (F12)**

2. **Ir a pestaña Console**

3. **Buscar mensajes similares a:**

   ```
   "Project validation failed: ZodError"
   ```

4. **Revisar estructura en Network:**

   ```
   DevTools → Network → Última request POST
   → Preview o Response
   → Ver qué datos se enviaron
   ```

5. **Reportar con:**
   - Screenshot del formulario
   - Mensaje exacto del error
   - Datos que ingresó

---

## ✅ Verificación Final

Después de limpiar la base de datos y mejorar validaciones:

```bash
# 1. Reinicar app
npm run dev

# 2. Intentar crear proyecto con datos válidos
# Debe funcionar sin errores

# 3. Intentar crear con datos inválidos
# Debe mostrar errores específicos

# 4. Revisar console (F12)
# No debe haber "ZodError" ni "undefined"
```

---

**Documento:** Guía de Validación Mejorada  
**Versión:** 1.0  
**Fecha:** 2025-05-16
