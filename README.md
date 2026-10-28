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

- Conectados a datos de empresa en Firestore: proyectos, visitas, gastos, asistencia, personal, cotizaciones, maquinaria y partidas APU.
- Presupuestos APU: partidas manuales, estimación asistida y ajuste de costos de referencia por departamento. Las estimaciones generadas deben verificarse antes de aprobar o contratar.
- Planillas: cálculo estimado para revisión; no es una nómina oficial ni sustituye la validación profesional, laboral o tributaria.
- Reportes: exportación CSV e impresión; el acta es un borrador, no se firma ni persiste en el sistema.
- Correo: envío individual mediante Gmail, sujeto a la autorización de Google y al permiso `gmail.send`.
- IA: requiere `GEMINI_API_KEY` para Gemini; si no está disponible, algunas funciones de APU/asistente usan estimaciones locales identificadas en pantalla.
- Equipo: propietarios y administradores pueden crear invitaciones con vencimiento, asignar roles, compartir el enlace y revocarlo. La aceptación requiere autenticación con el correo invitado verificado. El enlace se comparte manualmente; el sistema no envía invitaciones automáticamente.
- Espacios de trabajo: las cuentas con varias membresías pueden cambiar de empresa desde el selector del menú, tanto en escritorio como en móvil.
- Proyectos: archivar conserva el proyecto y sus relaciones; se puede filtrar por activos/archivados y restaurar el estado operativo anterior. El archivo no es eliminación permanente.

## Colecciones Firestore esperadas

- projects
- expenses
- attendance
- fieldVisits
- employees
- quotes
- machinery
- machineryLogs
- apuItems
- companySettings
- companies/{companyId}/members
- companies/{companyId}/invitations
- employeeDirectory (directorio operativo mínimo para asistencia)

## Seguridad

- Usa Firebase Auth real
- Las reglas de Firestore limitan el acceso a miembros autenticados de la empresa y aplican permisos por rol.
- Las fichas completas de personal (teléfono, jornal e información IGSS) se limitan a `owner`, `admin` y `finance`; `project_manager` y `field_worker` consultan un directorio mínimo. El rol `viewer` no accede a datos de personal ni asistencia.
- Configura y publica `firestore.rules` en el proyecto Firebase antes de habilitar el acceso a datos.
- Ejecuta `npm test` para pruebas unitarias y `npm run test:rules` para las reglas con el emulador Firestore.
- Ejecuta `npm run test:emulator` para probar el servicio de Firestore junto al emulador local de Authentication; usa el proyecto aislado `demo-origen-e2e` y datos sintéticos.
- Nunca expongas claves privadas en el frontend

## Acceso a la aplicación

En escritorio, usa **Iniciar sesión** en la barra superior. En móvil, abre **Más** y elige **Iniciar sesión**. La ventana permite acceder o crear una cuenta con correo y contraseña y recuperar la contraseña.

En Firebase Console, habilita el proveedor **Correo electrónico/contraseña** en Authentication, agrega el dominio de la aplicación (incluido `localhost` para desarrollo) a los dominios autorizados y confirma que la verificación de correo esté activa para el flujo de registro. La integración de Google se usa solo para funciones extra como Gmail, no como acceso principal a ORIGEN.

Para conectar Gmail, el usuario debe autorizar el permiso de envío solicitado por separado. Revisa que el proyecto OAuth y la pantalla de consentimiento estén configurados para los dominios y usuarios esperados. La autorización es temporal y se solicita de nuevo cuando vence.

## Deploy

Recomendado:

- Vercel para frontend
- Firebase para Auth + Firestore
