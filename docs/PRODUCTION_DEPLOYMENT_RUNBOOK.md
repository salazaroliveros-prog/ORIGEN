# ORIGEN — Runbook de preparación para producción

## Estado de la plataforma

Este documento es una guía de configuración y salida a producción, no una certificación de disponibilidad. No ejecutar el bootstrap ni ingresar datos reales hasta que CI, pruebas de reglas, E2E y el despliegue Preview estén aprobados.

## Variables de entorno de Vercel

Configurar en **Vercel → Project → Settings → Environment Variables**. Usar Production y Preview según corresponda.

### Firebase Web SDK

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` — ID del proyecto Firebase real.
- `NEXT_PUBLIC_FIREBASE_API_KEY` — API key web de Firebase. Es pública por diseño; restringirla en Google Cloud a las APIs necesarias y a los dominios autorizados.
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` — dominio de Authentication.
- `NEXT_PUBLIC_FIREBASE_APP_ID` — ID de la aplicación web.
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` — bucket de Storage.
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` — sender ID.
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` — opcional, si se usa Analytics.
- `NEXT_PUBLIC_FIRESTORE_DATABASE_ID` — usar `(default)` si se utiliza la base predeterminada.
- `NEXT_PUBLIC_FIREBASE_APP_CHECK_RECAPTCHA_KEY` — clave pública del proveedor App Check, si está habilitado.
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` — VAPID público para notificaciones web, si se activa FCM.
- `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` — **false** en Preview/Production; nunca apuntar el despliegue real a localhost.

### Servicios del servidor

- `GEMINI_API_KEY` — secreto del servidor para funciones de IA. No usar prefijo `NEXT_PUBLIC_`.
- `ALLOWED_ORIGINS` — orígenes exactos autorizados, separados por coma; incluir el dominio Preview/producción real.

No copiar claves privadas, contraseñas ni tokens de depuración a variables públicas.

## Bootstrap inicial del administrador

El bootstrap debe ejecutarse una sola vez desde una máquina confiable o Google Cloud Shell, nunca desde el navegador ni desde un endpoint público.

Variables locales requeridas en `.env.local` o en el entorno seguro:

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `SETUP_ADMIN_EMAIL`
- `SETUP_ADMIN_PASSWORD` — mínimo 12 caracteres, generado y guardado en un gestor de contraseñas.
- `SETUP_COMPANY_ID` — identificador nuevo, único y con letras/números/guion/guion bajo.
- `SETUP_COMPANY_NAME` — nombre comercial inicial.
- `CONFIRM_FIREBASE_SETUP=YES` — confirmación explícita.
- `FIREBASE_SERVICE_ACCOUNT_KEY` o Application Default Credentials con permisos mínimos para Firebase Authentication y Firestore.
- `SETUP_EXCHANGE_RATE_GTQ_PER_USD` — opcional; dejar sin definir si todavía no se usará USD. El valor inicial permanece en cero hasta que el administrador lo configure.

Ejecutar:

```bash
npm ci
npm run setup:complete
```

El instalador crea la cuenta sin marcar el correo como verificado, crea empresa y membresía de propietario, deja los datos fiscales sin completar y **no crea proyectos, clientes ni gastos ficticios**. Si el identificador de empresa ya pertenece a otro usuario, se detiene sin sobrescribir la empresa.

Después del bootstrap, completar verificación de correo, iniciar sesión y terminar los datos legales/fiscales de la empresa desde la aplicación. No pegar secretos en tickets, chat, documentación o Git.

## Configuración obligatoria en Firebase Console

1. Habilitar Email/Password en Authentication y agregar los dominios exactos de Preview y producción a Authorized domains.
2. Crear/confirmar Firestore y Storage en el proyecto correcto.
3. Revisar y desplegar `firestore.rules`, `storage.rules` e índices.
4. Configurar App Check para el dominio real. Los debug tokens son únicamente para desarrollo; revocar los que hayan sido expuestos.
5. Restringir la API key web a las APIs necesarias y a los referers permitidos.
6. Configurar presupuesto/alertas de uso para Gemini, Storage y Firebase.
7. Activar copias de seguridad y definir retención/recuperación antes de cargar datos operativos.

## Puertas de salida a producción

- [ ] CI verde: lint, TypeScript, pruebas unitarias, pruebas Firestore/Storage en emuladores y build.
- [ ] Revisión manual de reglas y aislamiento entre empresas.
- [ ] E2E completo en Preview: login, onboarding, proyectos, APU, gastos, cotizaciones, personal, maquinaria, reportes, permisos y sesión.
- [ ] Validación móvil y de escritorio.
- [ ] Verificación de persistencia, backup y recuperación.
- [ ] Revisión de URLs/token de descarga de Storage: los download-token URLs funcionan como enlaces portadores y requieren protección adicional si las fotos son confidenciales.
- [ ] Inventario/bodegas, órdenes de compra/proveedores, subcontratos y herramientas/activos implementados y probados antes de declarar completo el ERP.
- [ ] Sincronización offline transaccional probada con conflictos y reintentos.
- [ ] Dominio, variables de entorno, App Check y monitoreo configurados en Vercel.

## Situación de Vercel

Al revisar el equipo conectado no se encontró un proyecto ORIGEN accesible. Antes de desplegar, crear/vincular el proyecto Vercel al repositorio y verificar que las variables anteriores estén configuradas. No se ha realizado ningún despliegue de producción desde esta auditoría.
