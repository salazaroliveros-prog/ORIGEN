# Diagnóstico de arquitectura y mejoras de ORIGEN

## Alcance y estado

Diagnóstico del código presente en el repositorio, sus pantallas, conexiones de datos y reglas de Firestore. No certifica una instalación productiva ni sustituye pruebas con cuentas reales, configuración OAuth o revisión profesional de obligaciones de Guatemala.

**Estado:** ORIGEN ya tiene un núcleo ERP conectado a Firebase con autenticación, datos por empresa, roles, operaciones de construcción, cotizaciones, presupuestos, maquinaria y reportes. Se implementaron archivado reversible, selector de empresas, cobertura de membresías y controles de permisos más coherentes. No debe considerarse todavía un ERP integral terminado: procesos financieros/laborales y varias integraciones requieren definición, automatización y validación externa.

## Arquitectura observada

```text
Next.js App Router
└── MainApp (navegación y composición de módulos)
    ├── useAuthSession ─ Firebase Authentication
    ├── useCompanyWorkspace ─ membresía, empresa e invitaciones
    └── useProjectData(companyId, userId)
        ├── suscripciones Firestore por companyId
        ├── operaciones de lectura/escritura
        └── firestore.rules (autorización y validación del servidor)

Rutas API de Next.js
├── Gemini: asistente, bitácora y recibos
├── Firebase config
└── alertas meteorológicas de seguridad

Integraciones externas: Google OAuth/Gmail, Firebase, Gemini y proveedor de hosting.
```

`MainApp` funciona como shell de navegación. La carga de datos transaccionales está centralizada en `useProjectData`, que delega persistencia y suscripciones a `lib/firebaseService.ts`. `useCompanyWorkspace` resuelve la empresa antes de activar esas suscripciones. Las reglas de Firestore constituyen el control efectivo de acceso; los permisos de interfaz complementan esa protección y no deben reemplazarla.

## Módulos, flujo y estado

| Módulo                 | Pantalla / datos principales                                     | Flujo y estado comprobable                                                                                                                                          | Brecha o límite                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Autenticación          | `AuthDialog`, Firebase Auth                                      | Correo/contraseña, creación de cuenta, recuperación y Google; errores visibles y carga de sesión.                                                                   | OAuth de Google y dominios autorizados requieren configuración externa. Verificación de correo afecta la aceptación de invitaciones. |
| Empresa y equipo       | `CompanyTeamManager`; `companies/{id}`, `members`, `invitations` | Roles, enlaces de invitación con vencimiento, aceptación autenticada/verificada y revocación; selector persistente por usuario en escritorio y móvil.               | No envía correo automáticamente.                                                                                                     |
| Tablero                | `DashboardView`; proyectos, gastos, asistencia, personal e hitos | Resumen derivado de datos operativos suscritos por empresa.                                                                                                         | No es una fuente canónica; debe definirse la semántica de indicadores y el comportamiento con datos incompletos.                     |
| Proyectos              | `ProjectsView`; `projects`                                       | Crear, actualizar, archivar y restaurar; cronograma en proyecto. El archivado conserva relaciones y excluye el proyecto de selectores/métricas activas.             | No se expone borrado permanente. Definir retención antes de cualquier política de eliminación.                                       |
| Cronograma             | Gantt; tareas, hitos y recordatorios del proyecto                | Persiste cambios mediante `saveProjectScheduleToFirestore`.                                                                                                         | Recordatorios son datos en la aplicación; no equivalen a notificaciones programadas/entregadas.                                      |
| APU y presupuestos     | `BudgetView`; `apuItems`, gastos y cotizaciones                  | Partidas por empresa/proyecto, permisos financieros y referencias de costos; IA opcional.                                                                           | Estimaciones IA/locales no son cotizaciones de proveedor; se requiere aprobación y trazabilidad de cambios.                          |
| Cotizaciones           | `CotizacionesView`; `quotes`                                     | Guardado y estados borrador/enviada/aceptada/rechazada.                                                                                                             | No hay en el alcance observado un circuito completo de firma, orden de compra, facturación y cobranza enlazado.                      |
| Gastos                 | `ExpensesView`; `expenses`                                       | Registro y consulta por empresa/proyecto, reglas por rol y moneda GTQ/USD.                                                                                          | Faltan flujos contables formales de aprobación, conciliación, cierre y tratamiento fiscal validado.                                  |
| Personal y asistencia  | `StaffView`; `employees`, `employeeDirectory`, `attendance`      | Ficha completa restringida a `owner/admin/finance`; `project_manager/field_worker` reciben un directorio de nombre/puesto; `viewer` no recibe fichas ni asistencia. | No es gestión integral de RR. HH.; validar la carga inicial del directorio legado antes de habilitar cuadrillas existentes.          |
| Planillas              | `PayrollEstimateView`; personal y asistencia                     | Estimación derivada y ajustes de tasas en configuración.                                                                                                            | No calcularla o presentarla como nómina oficial, cálculo legal certificado o presentación IGSS.                                      |
| Maquinaria             | `MachineryManager`; `machinery`, `machineryLogs`, gastos         | Activos, disponibilidad, horómetro y uso; el uso puede originar gasto interno pendiente.                                                                            | No se observa un sistema completo de mantenimiento, órdenes de trabajo, combustible conciliado ni telemetría.                        |
| Visitas de obra        | `ProjectsAndVisits` / `FieldVisit`; `fieldVisits`                | Registro operativo asociado a proyecto y empresa.                                                                                                                   | Falta comprobar un flujo completo de evidencias, aprobaciones y auditoría de cambios.                                                |
| Reportes y exportación | `ReportsView`; datos operativos; CSV, impresión y Excel          | Proyección/descarga a partir de datos; Excel usa ExcelJS.                                                                                                           | No es almacenamiento documental ni firma digital; verificar límites de volumen, formato y consistencia de los totales.               |
| Asistente IA           | `AiAssistantView`, `AiAssistantModal`; rutas Gemini              | Consultas y apoyo a tareas; algunas funciones tienen fuente local alternativa identificada.                                                                         | Verificar privacidad/minimización de datos, límites de consumo, trazabilidad, calidad técnica y validación humana.                   |
| Correo y avisos        | `GmailManager`; Gmail API                                        | Autorización Google separada y envío individual con token temporal.                                                                                                 | Depende de consentimiento OAuth y del permiso `gmail.send`; no equivale a una cola fiable de notificaciones.                         |
| Alertas meteorológicas | `/api/weather/safety-alerts`                                     | Ruta API orientada a seguridad climática.                                                                                                                           | Confirmar proveedor, cobertura por ubicación, límites, vigencia y fallback antes de usarla para decisiones de seguridad.             |
| Errores                | boundaries de Next, toasts, errores de servicios                 | Existen límites globales y de página y avisos en acciones clave.                                                                                                    | Estandarizar códigos/mensajes, telemetría sin datos sensibles, reintentos y correlación entre UI/API/Firestore.                      |

### Persistencia observada

Colecciones principales: `projects`, `fieldVisits`, `expenses`, `attendance`, `employees`, `employeeDirectory`, `companySettings`, `quotes`, `apuItems`, `machinery`, `machineryLogs`, `companies/{companyId}/members` e `invitations`, además de tokens de notificación y alertas de usuario.

La mayoría de entidades operativas se enlaza con `companyId`; APU, cotizaciones, gastos, visitas, asistencia y maquinaria también usan `projectId` cuando corresponde. La migración de datos heredados asigna el `companyId` del propietario y registra `dataSchemaVersion` en la empresa. Antes de una migración productiva se necesita copia de seguridad y una estrategia de ensayo/rollback.

## Hallazgos priorizados

### P0 — Integridad y despliegue

1. **Reglas publicadas:** ejecutar y revisar `firestore.rules` y `firestore.indexes.json` en Firebase antes de producción. Las reglas locales/emuladas no modifican el proyecto desplegado.
2. **Integridad posterior a archivado:** revisar por muestreo APU, cotizaciones, asistencia, gastos y maquinaria asociados al archivar/restaurar; la suite local confirma la conservación de un registro relacionado, no certifica toda la migración de datos productivos.
3. **Permisos coherentes en cada rol:** se alinearon en la interfaz la edición de proyectos, gastos, personal, asistencia, tarifas de planilla y configuración. La suite de reglas prueba acceso a ficha privada/directorio/atención; ampliar pruebas de UI por rol para todas las pantallas.

### P1 — Operación multiempresa y datos

1. **Selector persistente de empresa:** la empresa activa se guarda por usuario en el navegador y se valida de nuevo al cargar. Probar en E2E la persistencia tras recargar, la revocación concurrente y almacenamiento restringido.
2. **Modelo de ciclo financiero:** especificar aprobación de gastos, historial/auditoría, órdenes de compra, pagos, facturación, conciliación y cierres antes de afirmar cobertura contable completa.
3. **Migración controlada:** convertir la migración heredada en proceso observable por lotes, con reporte de avance, reanudación, validación posterior y plan de rollback.
4. **Errores y observabilidad:** aplicar un contrato compartido para errores recuperables/no recuperables y medir fallas de Auth, permisos, cuotas y rutas externas sin exponer tokens ni información personal.
5. **Privacidad de personal:** el directorio mínimo se crea al guardar fichas nuevas y se completa en segundo plano al cargar fichas heredadas con una cuenta privilegiada. Revisar el estado y el conteo del directorio legado en cada empresa antes de que el personal de campo use la asistencia.

### P2 — Calidad de producto

1. **Pruebas de flujos por rol:** las pruebas de reglas cubren APU, lectura propia de membresías, invitaciones y archivado con preservación de registros; ampliar pruebas CRUD por rol y agregar E2E de autenticación, invitaciones, selector de empresas y navegación en móvil.
2. **Integraciones externas:** pruebas de contrato/mocks para Gmail, Gemini y alertas, más configuración documentada por entorno y límites/costos.
3. **Documentos y firma:** persistir entregables con versiones, metadatos, permisos y firmas auditables si se requieren como documentos contractuales.
4. **Rendimiento:** paginar colecciones grandes, revisar índices/consultas, límites de exportación y cargas en pantallas con suscripciones concurrentes.
5. **Accesibilidad/responsive:** probar teclado, lector de pantalla, foco del diálogo de acceso, estados vacíos y uso real en dispositivos pequeños.

## Configuración externa necesaria

- Firebase Authentication: habilitar correo/contraseña y Google; agregar dominios autorizados y revisar el cliente OAuth.
- Firestore: desplegar reglas e índices revisados y configurar producción separada del emulador.
- Gemini: guardar `GEMINI_API_KEY` en el entorno servidor; no exponerla como variable `NEXT_PUBLIC_*`.
- Gmail: configurar consentimiento OAuth, usuarios de prueba/publicación y alcance `gmail.send`.
- Hosting: configurar variables `NEXT_PUBLIC_FIREBASE_*`, URL pública y secretos de servidor en cada entorno.
- Notificaciones: configurar VAPID si se habilita FCM.

## Verificación local

```bash
npm test
npm run test:rules
npx tsc --noEmit
npm run lint
npm audit --audit-level=moderate
npm run build
```

`npm test` no requiere emulador. `npm run test:rules` inicia Firestore Emulator por medio de Firebase CLI. Las pruebas locales no acreditan autenticación con proveedores reales ni autorización de Gmail/Gemini en producción.
