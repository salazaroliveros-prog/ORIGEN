---
contentType: Reference
title: Guía de validación mejorada de inputs — ORIGEN ERP
---

# Guía de validación mejorada de inputs — ORIGEN ERP

## Cambios implementados

### 1. Validación estricta para nuevos datos

Todos los formularios validan antes de guardar:

```typescript
// Correcto — valida en tiempo real
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

  // 3. Enviar solo si es válido
  await onSave(validation.data);
};
```

## Campos requeridos por tipo de dato

### Proyectos

| Campo                       | Tipo   | Requerido | Validación                                                         |
| --------------------------- | ------ | --------- | ------------------------------------------------------------------ |
| code                        | string | Sí        | 3-20 caracteres, mayúsculas y números                              |
| name                        | string | Sí        | 5-100 caracteres                                                   |
| client                      | string | Sí        | 3-100 caracteres                                                   |
| location                    | string | Sí        | 5-200 caracteres                                                   |
| municipality                | string | Sí        | 2-50 caracteres                                                    |
| department                  | string | Sí        | 2-50 caracteres                                                    |
| budgetTotal                 | number | Sí        | >= 0, <= 999,999,999                                               |
| spentTotal                  | number | Sí        | >= 0 (por defecto: 0)                                              |
| progressPercent             | number | Sí        | 0-100 (por defecto: 0)                                             |
| startDate                   | date   | Sí        | Formato YYYY-MM-DD                                                 |
| endDate                     | date   | Sí        | >= startDate                                                       |
| status                      | enum   | Sí        | En Ejecución / Planificación / Finalizado / Suspendido / Archivado |
| lat                         | number | Sí        | -90 a 90                                                           |
| lng                         | number | Sí        | -180 a 180                                                         |
| expectedProfitMarginPercent | number | No        | 0-100 o null                                                       |

### Gastos

| Campo     | Tipo   | Requerido | Validación         |
| --------- | ------ | --------- | ------------------ |
| projectId | string | Sí        | Debe existir       |
| date      | date   | Sí        | Formato YYYY-MM-DD |
| category  | string | Sí        | Categoría válida   |
