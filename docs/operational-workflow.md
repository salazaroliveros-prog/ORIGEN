# ORIGEN - Flujo operativo vigente

Este documento describe el flujo soportado actualmente por la aplicación. Los registros operativos se guardan en Firestore bajo el espacio de trabajo activo y se filtran por `companyId`.

## 1. Acceso y espacio de trabajo

1. La persona inicia sesión con correo y contraseña o con Google desde **Iniciar sesión**.
2. La sesión autenticada consulta sus membresías en `companies/{companyId}/members`.
3. Si todavía no tiene membresía, se crea una empresa propia y se establece el rol `owner`; los datos heredados compatibles se migran añadiendo `companyId`.
4. Si llega con un enlace de invitación, debe autenticarse con la dirección invitada, verificarla y aceptar el enlace antes de cargar el espacio de trabajo.
5. Si tiene acceso a varias empresas, puede elegir el espacio activo en el selector del menú; se reinician la navegación operativa y el proyecto activo al cambiar.

La invitación se comparte mediante enlace; no se envía automáticamente por correo.

## 2. Configuración y equipo

- `owner` y `admin` actualizan los datos de empresa y administran miembros.
- Las invitaciones tienen un rol asignado, vencen en siete días y solo pueden aceptarse una vez.
- La aceptación crea la membresía y cambia el estado de la invitación en un mismo batch de Firestore.
- La autorización de Gmail es independiente de Firebase Authentication y requiere el permiso de envío de Google.

## 3. Ciclo de proyecto y obra

1. Un `owner`, `admin` o `project_manager` crea un proyecto.
2. El tablero agrega indicadores a partir de proyectos, gastos, asistencia, personal y hitos guardados en el proyecto; no es una fuente de datos independiente.
3. El cronograma y los hitos se guardan en el documento del proyecto.
4. Las visitas, asistencia, gastos y registros de maquinaria se vinculan con el proyecto y la empresa.
5. APU y cotizaciones mantienen sus documentos en colecciones independientes con `companyId` y `projectId`.
6. Al cerrar o retirar una obra, archívala: queda fuera de los selectores y métricas operativas, se mantiene en el historial y puede restaurarse. Los gastos, visitas, asistencias, APU, cotizaciones y logs vinculados no se borran.

## 4. Finanzas, personal y entregables

- Los gastos y las partidas APU alimentan vistas de presupuesto y reportes; las cotizaciones tienen estados `Borrador`, `Enviada`, `Aceptada` y `Rechazada`.
- Personal y asistencia sirven para la estimación de planillas. La estimación no es nómina oficial ni reemplaza validaciones laborales, tributarias o profesionales.
- Reportes pueden exportarse como CSV o imprimirse. Las actas se generan como borradores: no se firman ni se persisten como documento legal.
- Excel es un formato de exportación contable, no un sistema de contabilidad ni de conciliación.

## 5. Límites de datos que deben tenerse presentes

- El archivado es reversible y no borra relaciones. No se ofrece eliminación permanente de proyectos; si se solicita, debe diseñarse como acción administrativa explícita, auditada y con políticas de retención.
- La IA requiere una clave de Gemini del lado servidor. Sus estimaciones son auxiliares y pueden usar fuentes locales; deben mostrarse identificadas y validarse antes de tomar decisiones.
- El envío de correo requiere OAuth de Google, permiso `gmail.send`, consentimiento y autorización vigente.
- Firebase Auth, dominios autorizados, proveedor Google, reglas e índices deben configurarse en Firebase para producción. El emulador solo verifica el comportamiento local.
