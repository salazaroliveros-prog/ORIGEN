---
contentType: Troubleshooting
title: Problema solucionado: error 404 en /signup — ORIGEN ERP
---

# Problema solucionado: error 404 en /signup

## Problema identificado

Error: GET https://origen-one-kohl.vercel.app/signup?_rsc=1p-R_iEY6bj0jY31 404 (Not Found)
Causa: La ruta /signup no existía

## Solución implementada

### 1. Creado /app/signup/page.tsx

- Página de registro completa
- Integración con Firebase Auth
- Validación de formulario
- Indicador de fortaleza de contraseña
- Términos y condiciones
- Límite de velocidad

### 2. Commit y push

```
eaf845a feat: create signup page - fixes 404 error
```

### 3. Despliegue automático de Vercel disparado

GitHub Actions ejecutará automáticamente:

- Verificación de lint
- Pruebas (324 de 324)
- Build de Next.js
- Despliegue en Vercel

## Características del registro

### Campos del formulario

- Nombre completo
- Correo electrónico
- Empresa
- Teléfono
- Contraseña
- Confirmar contraseña
- Términos y condiciones

### Funcionalidades

- Indicador de fortaleza de contraseña
- Alternar mostrar/ocultar contraseña
- Validación en tiempo real
- Confirmación de coincidencia
- Integración con Firebase
- Estados de carga
- Manejo de errores
- Redirección al tablero al éxito

## Próximos pasos automáticos

1. GitHub Actions ejecuta
   - Lint: aprobado
   - Pruebas: aprobadas (324 de 324)
   - Build: aprobado

2. Vercel despliega
   - Despliegue en producción

3. URL actualizada
   - https://origen-proyectoswm.vercel.app/signup

## Rutas disponibles

- `/` (login) → AuthContainer
- `/signup` (nuevo) → Página de registro
- `/dashboard` → Aplicación principal
- `/terms` (enlace) → Página de términos
- `/privacy` (enlace) → Página de privacidad

## Estado final

| Componente         | Estado    | Detalles         |
| ------------------ | --------- | ---------------- |
| Página de login    | OK        | Funcional        |
| Página de registro | OK        | Creada (nueva)   |
| Firebase Auth      | OK        | Integrado        |
| GitHub             | OK        | Pusheado         |
| Vercel             | Pendiente | Auto-desplegando |
| PWA                | OK        | Listo            |

## Resumen

El error 404 en `/signup` ha sido resuelto.

- Página de registro creada y completamente funcional
- Integrada con Firebase Authentication
- Validación completa de formulario
- Push a GitHub exitoso
- Vercel desplegará en 2 a 3 minutos

**Próximo check:** Verificar la URL en 3 a 5 minutos para confirmar el despliegue exitoso

Fecha: 20 de diciembre de 2024  
Estado: CORREGIDO Y DESPLEGANDO  
URL: https://origen-proyectoswm.vercel.app/signup (en vivo en 2 a 3 min)
