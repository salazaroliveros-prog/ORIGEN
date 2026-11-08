---
contentType: Reference
title: Reporte completo de análisis del sistema — ORIGEN ERP
---

# Reporte completo de análisis del sistema — ORIGEN ERP

Fecha: 2 de noviembre de 2026  
Proyecto: ConstructERP Guatemala (ORIGEN ERP)  
Versión: 0.1.0  
Tecnología: Next.js 15.4.9, React 19.2.1, Firebase 12.19.0

## Resumen ejecutivo

El sistema ORIGEN ERP es una aplicación web completa para gestión de proyectos de construcción en Guatemala. El análisis revela una arquitectura sólida con separación clara de responsabilidades, tests exhaustivos y una suite de características bien organizada.

### Estado general: saludable

- Tests unitarios: 324 de 324 pasando (100 por ciento)
- Tests de integración: 34 de 34 pasando (100 por ciento)
- Tests de componentes: 44 de 44 pasando (100 por ciento)
- Archivos de configuración: completos
- Documentación: extensa
- Dependencias: actualizadas

## Arquitectura del sistema

### Estructura de features

El proyecto sigue una arquitectura modular con features bien organizadas:

```
features/
├── ai/              — Asistente técnico con IA (Gemini)
├── budget/          — Gestión de presupuestos APU
├── dashboard/       — Tablero con KPIs y gráficos
├── projects/        — Gestión de proyectos y firmas digitales
├── reports/         — Reportes y exportación PDF
└── staff/           — Gestión de personal y asistencia
```

Observaciones:

- Cada feature es un módulo independiente
- Separación clara entre UI y lógica de negocio
- Componentes reutilizables en `/components`
- Servicios centralizados en `/lib`

### Servicios de Firebase y Firestore

Configuración:

- Project ID: origen-erp-guatemala
- Database: Firestore (default)
- Auth: Firebase Authentication
- Storage: Firebase Storage
- Emulators: Configurados para desarrollo (localhost:8080, 9099, 9199)

Características implementadas:

- Autenticación con email y contraseña
- Gestión de espacios de trabajo por empresa
- Sistema de invitaciones y roles
- Validación de datos con Zod antes de guardar
- Manejo de errores con mensajes en español
- Sincronización en tiempo real con onSnapshot
- Soporte para emuladores en desarrollo

Servicios principales:

- `firebaseService.ts` — Operaciones CRUD en Firestore
- `firebaseAuth.ts` — Autenticación de usuarios
- `companyWorkspace.ts` — Gestión de espacios de trabajo
- `companyInvitations.ts` — Sistema de invitaciones

### Hooks personalizados

Hooks implementados:

- `useAuthSession` — Gestión de sesión de autenticación
- `useCompanyWorkspace` — Gestión de espacios de trabajo
