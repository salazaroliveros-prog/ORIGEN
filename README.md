# ORIGEN

Sistema de gestión para control total de proyectos de construcción.

## Stack
- Next.js
- TypeScript
- Firebase Auth
- Firestore
- Gemini AI (opcional)

## Requisitos
- Node.js 18+
- npm o pnpm
- Firebase project
- Vercel account (o cualquier hosting compatible con Next.js)

## Instalación
```bash
npm install
cp .env.example .env.local
```

Completa las variables de entorno con tus credenciales reales de Firebase y Gemini.

## Desarrollo
```bash
npm run dev
```

## Producción
```bash
npm run build
npm run start
```

## Estructura principal
- app/
- components/
- features/
- lib/
  - config.ts
  - types.ts
  - firebaseService.ts
  - hooks/
  - domain/
  - services/

## Módulos
- Dashboard
- Projects
- Budget
- Staff
- Reports
- AI Assistant

## Colecciones Firestore esperadas
- projects
- expenses
- attendance
- fieldVisits
- companySettings
- users

## Seguridad
- Usa Firebase Auth real
- Protege rutas por rol
- Revisa permisos en Firestore
- Nunca expongas claves privadas en el frontend

## Deploy
Recomendado:
- Vercel para frontend
- Firebase para Auth + Firestore
