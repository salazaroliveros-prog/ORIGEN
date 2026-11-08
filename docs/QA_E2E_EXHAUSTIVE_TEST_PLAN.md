# Plan de Pruebas End-to-End Exhaustivo — ORIGEN ERP

**QA Engineer:** Senior QA  
**Fecha:** 2026-11-08  
**Aplicación:** ORIGEN ERP — ConstructERP Guatemala  
**URL base:** http://localhost:3000  
**Usuario de prueba:** salazaroliveros@gmail.com / Origen2026!Secure  
**Objetivo:** Validación del 100% de la aplicación, flujo de usuario real, todos los módulos y submenús

---

## Tabla de Contenidos

1. [Metodología y Alcance](#metodología-y-alcance)
2. [Entorno de Pruebas](#entorno-de-pruebas)
3. [Credenciales y Usuarios de Prueba](#credenciales-y-usuarios-de-prueba)
4. [Plan de Pruebas por Módulo](#plan-de-pruebas-por-módulo)
   - 4.1. Autenticación (Login)
   - 4.2. Navegación Global y Menú Principal
   - 4.3. Tablero / Dashboard
   - 4.4. Proyectos y Firmas Digitales
   - 4.5. Presupuestos APU
   - 4.6. Cotizaciones
   - 4.7. Gastos y Facturas
   - 4.8. Maquinaria
   - 4.9. Personal & IGSS (Cuadrillas, Asistencia)
   - 4.10. Planillas Guate
   - 4.11. Reportes
   - 4.12. Asistente IA (Gemini)
   - 4.13. Correo y Avisos (Gmail)
   - 4.14. Equipo de la Empresa
   - 4.15. Configuración y Branding
   - 4.16. Profundidad: Submenús y Módulos Anidados
   - 4.17. Casos de Borde y Validación de Formularios
5. [Criterios de Éxito y Salida](#criterios-de-éxito-y-salida)
6. [Matriz de Cobertura](#matriz-de-cobertura)

---

## 1. Metodología y Alcance

Este plan de pruebas E2E simula el comportamiento de un usuario real que:

1. Accede a la aplicación por primera vez
2. Se autentica con diferentes escenarios (válidos, inválidos, borde)
3. Navega por todos los módulos del menú principal
4. Ejecuta cada proceso de negocio completo (CRUD)
5. Explora submenús, módulos anidados y capas profundas
6. Valida formularios, botones, validaciones y mensajes de error
7. Verifica persistencia de datos (recarga de página)
8. Verifica navegación entre módulos y propagación de datos

**Metodología:** Pruebas funcionales E2E con Playwright, flujo secuencial, datos de prueba únicos por ejecución (timestamps), limpieza implícita mediante IDs únicos.

---

## 2. Entorno de Pruebas

| Elemento             | Valor                                            |
| -------------------- | ------------------------------------------------ |
| URL base             | http://localhost:3000                            |
| Navegadores          | Chromium, Firefox, WebKit (playwright.config.ts) |
| Dispositivos móviles | Pixel 5, iPhone 12                               |
| Variables de entorno | `.env.local` con credenciales Firebase           |
| Servidor local       | `npm run dev` en puerto 3000                     |
| Firebase             | Emulator o producción (origen-erp-guatemala)     |

---

## 3. Credenciales y Usuarios de Prueba

| Usuario           | Rol              | Email                     | Password          | Acceso            |
| ----------------- | ---------------- | ------------------------- | ----------------- | ----------------- |
| Administrador     | Owner/Admin      | salazaroliveros@gmail.com | Origen2026!Secure | Todos los módulos |
| Usuario de prueba | Usuario temporal | ui-e2e@test.com           | SecurePass123!    | Registro y login  |

---

## 4. Plan de Pruebas por Módulo

### 4.1. Autenticación (Login)

| ID       | Caso de Prueba                        | Precondición        | Paso                                                      | Resultado Esperado                                            |
| -------- | ------------------------------------- | ------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| AUTH-001 | Login con credenciales válidas        | Usuario registrado  | Llenar email y password correctos → Clic "Iniciar Sesión" | Redirección a Tablero, sesión activa, email visible en navbar |
| AUTH-002 | Login con email inválido              | Página de login     | Escribir email sin formato → Clic submit                  | Error de validación: "Ingresa un correo válido"               |
| AUTH-003 | Login con contraseña corta            | Página de login     | Escribir contraseña < 6 caracteres → Clic submit          | Error: "La contraseña debe tener al menos 6 caracteres"       |
| AUTH-004 | Login con credenciales incorrectas    | Usuario no existe   | Email válido + contraseña incorrecta → Clic submit        | Error: "Correo o contraseña incorrectos"                      |
| AUTH-005 | Rate limiting — 5 intentos fallidos   | Página de login     | 5 intentos con contraseña incorrecta                      | Cuenta bloqueada por 15 minutos, timer visible                |
| AUTH-006 | Registro con contraseña débil         | Página de registro  | Contraseña sin mayúscula/número/carácter especial         | Error de validación específico                                |
| AUTH-007 | Registro con contraseñas no coinciden | Página de registro  | Contraseña y confirmar diferente                          | Error: "Las contraseñas no coinciden"                         |
| AUTH-008 | Registro exitoso                      | Página de registro  | Todos los campos válidos → Clic "Crear cuenta"            | Cuenta creada, redirección a dashboard                        |
| AUTH-009 | Recuperación de contraseña            | Página de login     | Clic "¿Olvidaste tu contraseña?" → Email → Enviar         | Toast: "Correo de reseteo enviado"                            |
| AUTH-010 | Recordarme persiste sesión            | Página de login     | Marcar "Recuérdame" → Iniciar → Cerrar navegador → Abrir  | Sesión aún activa                                             |
| AUTH-011 | Cierre de sesión                      | Usuario autenticado | Clic en "Cerrar sesión"                                   | Redirección a login, sesión borrada                           |
| AUTH-012 | Acceso sin autenticación              | Sin sesión activa   | Intentar acceder a /dashboard directamente                | Redirección a login                                           |
| AUTH-013 | Auto-auth (si habilitado)             | Usuario configurado | Cargar página /                                           | Entrada directa sin pantalla de login                         |

### 4.2. Navegación Global y Menú Principal

| ID      | Caso de Prueba                              | Precondición        | Paso                             | Resultado Esperado                        |
| ------- | ------------------------------------------- | ------------------- | -------------------------------- | ----------------------------------------- |
| NAV-001 | Botón Tablero navega correctamente          | Usuario autenticado | Clic en "Tablero"                | URL muestra Tablero, dashboard visible    |
| NAV-002 | Botón Proyectos & Firmas abre sección       | Usuario autenticado | Clic en "Proyectos & Firmas"     | Lista de proyectos o estado vacío visible |
| NAV-003 | Botón Presupuestos APU abre sección         | Usuario autenticado | Clic en "Presupuestos APU"       | Vista de presupuestos APU visible         |
| NAV-004 | Botón Cotizaciones abre sección             | Usuario autenticado | Clic en "Cotizaciones"           | Lista de cotizaciones visible             |
| NAV-005 | Botón Gastos & Facturas abre sección        | Usuario autenticado | Clic en "Gastos & Facturas"      | Formulario de gasto visible               |
| NAV-006 | Botón Maquinaria abre sección               | Usuario autenticado | Clic en "Maquinaria"             | Lista de maquinaria visible               |
| NAV-007 | Botón Personal & IGSS abre sección          | Usuario autenticado | Clic en "Personal & IGSS"        | Menú de cuadrillas y asistencia visible   |
| NAV-008 | Botón Planillas Guate abre sección          | Usuario autenticado | Clic en "Planillas Guate"        | Vista de planillas visible                |
| NAV-009 | Botón Reportes abre sección                 | Usuario autenticado | Clic en "Reportes"               | Vista de reportes y exportación visible   |
| NAV-010 | Botón IA / Asistente abre sección           | Usuario autenticado | Clic en "Asistente IA"           | Chat de IA visible                        |
| NAV-011 | Botón Correo / Gmail abre sección           | Usuario autenticado | Clic en "Correo"                 | Interfaz de correo visible                |
| NAV-012 | Botón Equipo de la empresa abre sección     | Usuario autenticado | Clic en "Equipo de la empresa"   | Gestión de empleados visible              |
| NAV-013 | Botón Configuración / Branding abre sección | Usuario autenticado | Clic en "Configuración"          | Formulario de configuración visible       |
| NAV-014 | Menú móvil (drawer) se abre y cierra        | Vista móvil         | Clic en hamburguesa → Clic fuera | Drawer se abre y cierra                   |
| NAV-015 | Bottom navigation móvil funciona            | Vista móvil         | Clic en pestañas bottom nav      | Navegación entre secciones                |

### 4.3. Tablero / Dashboard

| ID       | Caso de Prueba                                     | Precondición                | Paso                       | Resultado Esperado                       |
| -------- | -------------------------------------------------- | --------------------------- | -------------------------- | ---------------------------------------- |
| DASH-001 | KPI "Presupuesto Total" muestra suma correcta      | Múltiples proyectos creados | Ir a Tablero               | KPI muestra suma de presupuestos activos |
| DASH-002 | KPI "Gasto Real Acumulado" muestra total           | Gastos registrados          | Ir a Tablero               | KPI muestra suma de todos los gastos     |
| DASH-003 | KPI "Ingresos por Cotizaciones" muestra total      | Cotizaciones aceptadas      | Ir a Tablero               | KPI muestra suma de montos aceptados     |
| DASH-004 | Barra de avance refleja porcentaje                 | Proyecto con avance 60%     | Ver proyecto               | Barra muestra 60%, texto "60%" visible   |
| DASH-005 | Tarjetas KPI se actualizan tras crear gasto        | Tablero abierto             | Registrar gasto Q12,000    | KPI de gasto aumenta en Q12,000          |
| DASH-006 | Tarjetas KPI se actualizan tras aceptar cotización | Tablero abierto             | Aceptar cotización Q25,000 | KPI de ingresos aumenta en Q25,000       |
| DASH-007 | Gráfica de progreso por proyecto renderiza         | Múltiples proyectos         | Ir a Tablero               | Gráfica muestra barras proporcionales    |
| DASH-008 | Gráfica de gastos por categoría renderiza          | Gastos en categorías        | Ir a Reportes              | Gráfica distribución por categoría       |
| DASH-009 | KPIs persisten tras recarga                        | Datos en Firestore          | Recargar Tablero           | KPIs muestran mismos valores             |
| DASH-010 | Visualización con datos vacíos                     | Sin proyectos               | Ir a Tablero               | KPIs muestran 0, no errores JS           |

### 4.4. Proyectos y Firmas Digitales

| ID       | Caso de Prueba                              | Precondición                    | Paso                                                          | Resultado Esperado                                                |
| -------- | ------------------------------------------- | ------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| PROJ-001 | Crear proyecto completo                     | Usuario admin                   | Navbar → Proyectos → Nuevo → llenar campos → Crear            | Proyecto aparece con código, nombre, cliente, presupuesto, avance |
| PROJ-002 | Editar proyecto                             | Proyecto existente              | Clic "Editar" → cambiar nombre/presupuesto → Actualizar       | Cambios persisten tras recarga                                    |
| PROJ-003 | Archivar y restaurar proyecto               | Proyecto activo                 | Archivar → filtro "Archivados" → Restaurar → filtro "Activos" | Proyecto desaparece de activos, aparece en archivados, vuelve     |
| PROJ-004 | Campos obligatorios del formulario          | Modal Nuevo Proyecto            | Dejar campos requeridos vacíos → Crear                        | Errores de validación por campo                                   |
| PROJ-005 | Código de proyecto único                    | Proyecto existente              | Intentar crear con código duplicado                           | Error de duplicado                                                |
| PROJ-006 | Presupuesto mayor a 0 para estado Ejecución | Proyecto sin presupuesto        | Cambiar estado a "En Ejecución" → Actualizar                  | Error: debe tener presupuesto                                     |
| PROJ-007 | Fecha de fin posterior a fecha de inicio    | Formulario proyecto             | Fecha fin < fecha inicio                                      | Error de validación de fechas                                     |
| PROJ-008 | Avance entre 0 y 100                        | Formulario proyecto             | Avance = 150 o -10                                            | Error de validación de rango                                      |
| PROJ-009 | Listado paginado                            | Más de 10 proyectos             | Ver lista                                                     | Paginación visible, 10 por página                                 |
| PROJ-010 | Filtro por estado                           | Proyectos en diferentes estados | Cambiar filtro a "Archivados"                                 | Solo archivados visibles                                          |

### 4.5. Presupuestos APU

| ID      | Caso de Prueba               | Precondición                                  | Paso                                                          | Resultado Esperado                        |
| ------- | ---------------------------- | --------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| APU-001 | Crear renglón APU manual     | Proyecto con avance > 0                       | Navbar → Presupuestos APU → Renglón Manual → llenar → Guardar | Renglón APU guardado y asociado           |
| APU-002 | Cálculo de total unitario    | Renglón con materiales, mano de obra, equipos | Ver cálculo                                                   | Total = suma de componentes               |
| APU-003 | Cálculo de precio total      | Renglón con cantidad y total unitario         | Ver precio total                                              | Total = unitario × cantidad               |
| APU-004 | Validación de cantidad > 0   | Formulario APU                                | Cantidad = 0 o negativa                                       | Error de validación                       |
| APU-005 | Validación de costo unitario | Formulario APU                                | Costo unitario vacío o negativo                               | Error de validación                       |
| APU-006 | Asociación a proyecto        | Renglón APU creado                            | Ver en lista de proyecto                                      | Renglón aparece bajo el proyecto correcto |
| APU-007 | Recalcular por departamento  | Renglón existente                             | Cambiar departamento → Recalcular                             | Precios ajustados por factor de flete     |

### 4.6. Cotizaciones

| ID        | Caso de Prueba                      | Precondición                | Paso                                                      | Resultado Esperado                               |
| --------- | ----------------------------------- | --------------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| QUOTE-001 | Crear cotización rápida             | Proyecto creado             | Navbar → Cotizaciones → Nueva → llenar → Guardar Borrador | Cotización en estado Borrador                    |
| QUOTE-002 | Marcar como aceptada                | Cotización en Borrador      | Cambiar estado a Aceptada                                 | Cotización muestra "Aceptada", monto en ingresos |
| QUOTE-003 | Validación de descuento ≤ 50%       | Formulario cotización       | Descuento = 60%                                           | Error: máximo 50%                                |
| QUOTE-004 | Cálculo de subtotal                 | Ítems con cantidad y precio | Ver subtotal                                              | Subtotal = Σ(cantidad × precio unitario)         |
| QUOTE-005 | Cálculo de total con impuesto       | Subtotal e impuesto         | Ver total                                                 | Total = imponible + impuesto                     |
| QUOTE-006 | Generar PDF con logo                | Cotización generada         | Clic "Exportar PDF"                                       | Se descarga PDF con datos                        |
| QUOTE-007 | Advertencia de vencimiento (3 días) | Cotización próxima a vencer | Ver cotización                                            | Advertencia visible                              |

### 4.7. Gastos y Facturas

| ID      | Caso de Prueba                | Precondición       | Paso                                           | Resultado Esperado                  |
| ------- | ----------------------------- | ------------------ | ---------------------------------------------- | ----------------------------------- |
| EXP-001 | Registrar gasto con categoría | Proyecto creado    | Navbar → Gastos → Registrar → llenar → Guardar | Gasto aparece en lista y en tablero |
| EXP-002 | Duplicado detection           | Gasto existente    | Intentar registrar gasto duplicado             | Advertencia de duplicado            |
| EXP-003 | Exportar a CSV                | Gastos registrados | Clic "Exportar CSV"                            | Se descarga archivo CSV             |
| EXP-004 | Preview de foto de recibo     | Formulario gasto   | Subir foto                                     | Preview visible en formulario       |
| EXP-005 | Validación de monto > 0       | Formulario gasto   | Monto = 0                                      | Error de validación                 |
| EXP-006 | Propagación a tablero         | Gasto registrado   | Ver tablero                                    | KPI de gasto actualizado            |
| EXP-007 | Filtrar por categoría         | Múltiples gastos   | Cambiar filtro de categoría                    | Solo gastos de esa categoría        |

### 4.8. Maquinaria

| ID       | Caso de Prueba          | Precondición                | Paso                                               | Resultado Esperado                          |
| -------- | ----------------------- | --------------------------- | -------------------------------------------------- | ------------------------------------------- |
| MACH-001 | Registrar maquinaria    | Sección Maquinaria          | Navbar → Maquinaria → Registrar → llenar → Guardar | Maquinaria en lista con estado "Disponible" |
| MACH-002 | Cambiar a mantenimiento | Maquinaria disponible       | Clic "Enviar a mantenimiento"                      | Estado cambia a "Mantenimiento"             |
| MACH-003 | Marcar disponible       | Maquinaria en mantenimiento | Clic "Marcar disponible"                           | Estado vuelve a "Disponible"                |
| MACH-004 | Registrar horas de uso  | Maquinaria en obra          | Registro de horas y horómetro                      | Horas acumuladas actualizadas               |
| MACH-005 | Calcular costo por hora | Maquinaria con tarifa       | Ver registro de uso                                | Costo = horas × tarifa                      |

### 4.9. Personal & IGSS (Cuadrillas, Asistencia)

| ID        | Caso de Prueba               | Precondición           | Paso                                                           | Resultado Esperado                    |
| --------- | ---------------------------- | ---------------------- | -------------------------------------------------------------- | ------------------------------------- |
| STAFF-001 | Registrar empleado           | Sección Personal       | Navbar → Personal → Cuadrillas → Nuevo → llenar → Guardar      | Empleado en lista                     |
| STAFF-002 | Validar jornal diario        | Formulario empleado    | Jornal vacío o negativo                                        | Error de validación                   |
| STAFF-003 | Registrar asistencia con GPS | Empleado registrado    | Navbar → Asistencia → seleccionar empleado → En Obra → Guardar | Registro guardado con coordenadas GPS |
| STAFF-004 | Validar horas extra ≤ 12     | Registro de asistencia | Horas extra > 12                                               | Error de validación                   |
| STAFF-005 | Cambiar estado de empleado   | Empleado registrado    | Cambiar entre "En Obra", "Descanso", etc.                      | Estado actualizado                    |
| STAFF-006 | Vista calendario vs lista    | Sección asistencia     | Toggle entre vistas                                            | Vista cambia correctamente            |

### 4.10. Planillas Guate

| ID      | Caso de Prueba             | Precondición                 | Paso                      | Resultado Esperado                    |
| ------- | -------------------------- | ---------------------------- | ------------------------- | ------------------------------------- |
| PAY-001 | Calcular planilla con IGSS | Empleado con salario         | Ver planilla              | IGSS empleado 4.83%, empleador 12.67% |
| PAY-002 | Calcular IRTRA             | Empleado con salario         | Ver planilla              | IRTRA 0.125%                          |
| PAY-003 | Calcular ISR escalonado    | Salario en diferentes rangos | Ver planilla              | Impuesto según escalones (5% al 20%)  |
| PAY-004 | Bono 14 (diciembre)        | Empleado con antigüedad      | Ver planilla de diciembre | Bono 14 calculado                     |
| PAY-005 | Aguinaldo                  | Empleado con antigüedad      | Ver planilla de diciembre | Aguinaldo calculado                   |
| PAY-006 | Exportar planillas         | Planillas generadas          | Clic "Exportar"           | Archivo con datos de planillas        |

### 4.11. Reportes

| ID      | Caso de Prueba               | Precondición        | Paso                                    | Resultado Esperado           |
| ------- | ---------------------------- | ------------------- | --------------------------------------- | ---------------------------- |
| REP-001 | Generar reporte de proyectos | Datos en sistema    | Navbar → Reportes → Seleccionar reporte | Reporte generado con datos   |
| REP-002 | Exportar reporte a PDF       | Reporte generado    | Clic "Exportar PDF"                     | Archivo PDF descargado       |
| REP-003 | Filtro por fecha             | Reportes con fechas | Seleccionar rango de fechas             | Reporte filtra por fechas    |
| REP-004 | Filtro por proyecto          | Múltiples proyectos | Seleccionar proyecto específico         | Reporte solo de ese proyecto |

### 4.12. Asistente IA (Gemini)

| ID     | Caso de Prueba          | Precondición              | Paso                                | Resultado Esperado                  |
| ------ | ----------------------- | ------------------------- | ----------------------------------- | ----------------------------------- |
| IA-001 | Enviar consulta técnica | Asistente IA disponible   | Escribir pregunta → Enviar          | Respuesta de IA relevante           |
| IA-002 | Contexto de proyecto    | Proyecto activo           | Preguntar sobre proyecto específico | Respuesta con contexto del proyecto |
| IA-003 | Manejo de error de IA   | Servicio IA no disponible | Enviar consulta cuando IA falla     | Mensaje de error amigable           |

### 4.13. Correo y Avisos (Gmail)

| ID       | Caso de Prueba          | Precondición        | Paso              | Resultado Esperado         |
| -------- | ----------------------- | ------------------- | ----------------- | -------------------------- |
| MAIL-001 | Abrir sección de correo | Usuario autenticado | Clic en "Correo"  | Interfaz de correo visible |
| MAIL-002 | Enviar notificación     | Sección de correo   | Redactar → Enviar | Notificación enviada       |
| MAIL-003 | Leer avisos             | Avisos disponibles  | Clic en aviso     | Detalle del aviso visible  |

### 4.14. Equipo de la Empresa

| ID       | Caso de Prueba          | Precondición      | Paso                                   | Resultado Esperado        |
| -------- | ----------------------- | ----------------- | -------------------------------------- | ------------------------- |
| TEAM-001 | Ver miembros del equipo | Rol permite       | Clic en "Equipo de la empresa"         | Lista de miembros visible |
| TEAM-002 | Invitar nuevo miembro   | Rol admin         | Clic "Invitar" → llenar email → Enviar | Invitación enviada        |
| TEAM-003 | Cambiar rol de miembro  | Miembro existente | Cambiar rol → Guardar                  | Rol actualizado           |

### 4.15. Configuración y Branding

| ID      | Caso de Prueba            | Precondición  | Paso                                   | Resultado Esperado           |
| ------- | ------------------------- | ------------- | -------------------------------------- | ---------------------------- |
| SET-001 | Subir logo de empresa     | Configuración | Clic "Subir logo" → seleccionar imagen | Logo visible en header       |
| SET-002 | Actualizar tipo de cambio | Configuración | Cambiar tasa USD/GTQ → Guardar         | Tasa actualizada en cálculos |
| SET-003 | Configurar notificaciones | Configuración | Cambiar preferencias → Guardar         | Preferencias guardadas       |

### 4.16. Profundidad: Submenús y Módulos Anidados

| ID       | Caso de Prueba                            | Precondición        | Paso                                             | Resultado Esperado               |
| -------- | ----------------------------------------- | ------------------- | ------------------------------------------------ | -------------------------------- |
| DEEP-001 | Personal → Cuadrillas → Nuevo Empleado    | Usuario admin       | Navegar 3 niveles → Crear empleado               | Empleado creado y visible        |
| DEEP-002 | Personal → Asistencia → Registro GPS      | Empleado registrado | Navegar 3 niveles → Registrar asistencia         | Asistencia guardada con GPS      |
| DEEP-003 | Proyectos → Editar → Cambiar estado       | Proyecto existente  | Navegar → Cambiar a "En Ejecución"               | Estado persiste                  |
| DEEP-004 | Gastos → Registrar → Seleccionar proyecto | Proyecto creado     | Navegar → Seleccionar proyecto → Registrar gasto | Gasto asociado al proyecto       |
| DEEP-005 | Cotizaciones → Crear → Vincular proyecto  | Proyecto creado     | Navegar → Crear cotización → Vincular            | Cotización vinculada al proyecto |
| DEEP-006 | Reportes → Filtrar → Exportar             | Datos en sistema    | Navegar → Aplicar filtros → Exportar PDF         | PDF con datos filtrados          |

### 4.17. Casos de Borde y Validación de Formularios

| ID       | Caso de Prueba                           | Precondición              | Paso                              | Resultado Esperado                       |
| -------- | ---------------------------------------- | ------------------------- | --------------------------------- | ---------------------------------------- |
| EDGE-001 | Envío de formulario vacío                | Cualquier formulario      | Clic submit sin llenar            | Errores en todos los campos requeridos   |
| EDGE-002 | Caracteres especiales en campos de texto | Formulario de proyecto    | Ingresar caracteres especiales    | Campos aceptan o sanitizan correctamente |
| EDGE-003 | Números muy grandes                      | Campos monetarios         | Ingresar 999,999,999              | Sistema maneja sin desbordamiento        |
| EDGE-004 | Sesión expirada                          | Sesión antigua            | Intentar acción que requiere auth | Redirección a login o toast de error     |
| EDGE-005 | Doble clic en botón de submit            | Formulario de creación    | Clic dos veces rápido             | No se duplica el registro                |
| EDGE-006 | Navegación atrás del navegador           | Después de crear proyecto | Clic en "Atrás" del navegador     | No se recrea el proyecto                 |
| EDGE-007 | Recarga de página en medio de flujo      | En formulario de proyecto | Recargar página                   | Datos no se pierden (o se advierte)      |
| EDGE-008 | Conexión lenta/interrumpida              | Red lenta                 | Intentar operación                | Manejo graceful de error de red          |

---

## 5. Criterios de Éxito y Salida

### Criterios de Salida por Módulo

| Módulo        | Criterio de Salida                        |
| ------------- | ----------------------------------------- |
| Autenticación | 0 fallos críticos; rate limiting funciona |
| Navegación    | Todos los botones del menú funcionan      |
| Dashboard     | KPIs precisos; gráficas renderizan        |
| Proyectos     | CRUD completo; persistencia verificada    |
| APU           | Cálculos precisos; validaciones funcionan |
| Cotizaciones  | Estados correctos; totales precisos       |
| Gastos        | CRUD completo; propagación a tablero      |
| Maquinaria    | Estados correctos; costo por hora         |
| Personal      | Empleados y asistencia correctos          |
| Planillas     | Cálculos IGSS/ISR correctos               |
| Reportes      | Generación y exportación funcionan        |
| IA            | Respuestas relevantes; manejo de errores  |
| Correo        | Envío y recepción funcionan               |
| Equipo        | Gestión de miembros funciona              |
| Configuración | Cambios persisten                         |

### Criterios Globales de Salida (Go/No-Go para Producción)

- [ ] 0 defectos críticos (Severity 1) abiertos
- [ ] 0 defectos altos (Severity 2) abiertos
- [ ] 100% de pruebas E2E pasando en Chromium, Firefox, WebKit
- [ ] Pruebas en móvil (Pixel 5, iPhone 12) pasando
- [ ] Build de producción exitoso (`npm run build`)
- [ ] Pruebas de unidad pasando (1078 tests, 48 archivos)
- [ ] CI de GitHub Actions verde

---

## 6. Matriz de Cobertura

| Módulo         | Pruebas Existentes                                         | Pruebas Nuevas Necesarias | Cobertura |
| -------------- | ---------------------------------------------------------- | ------------------------- | --------- |
| Autenticación  | auth.spec.ts (4)                                           | AUTH-002 a AUTH-013       | 75%       |
| Navegación     | navigation.spec.ts (6)                                     | NAV-014 a NAV-015         | 80%       |
| Dashboard      | qa-complete-platform (1)                                   | DASH-001 a DASH-010       | 60%       |
| Proyectos      | projects.spec.ts (5), ui-ux (9), system-crud (1)           | PROJ-004 a PROJ-010       | 85%       |
| APU            | ui-ux (0), system-crud (parcial)                           | APU-001 a APU-007         | 40%       |
| Cotizaciones   | ui-ux (2), qa-project-lifecycle (1)                        | QUOTE-003 a QUOTE-007     | 60%       |
| Gastos         | financial.spec.ts (3), ui-ux (1), qa-project-lifecycle (1) | EXP-003 a EXP-007         | 70%       |
| Maquinaria     | ui-ux (3), qa-project-lifecycle (1)                        | MACH-004, MACH-005        | 60%       |
| Personal       | payroll.spec.ts (4), ui-ux (2), qa-project-lifecycle (1)   | STAFF-004, STAFF-006      | 75%       |
| Planillas      | qa-project-lifecycle (1)                                   | PAY-001 a PAY-006         | 20%       |
| Reportes       | qa-complete-platform (1)                                   | REP-001 a REP-004         | 25%       |
| IA             | qa-complete-platform (1)                                   | IA-002, IA-003            | 50%       |
| Correo         | qa-complete-platform (1)                                   | MAIL-001 a MAIL-003       | 33%       |
| Equipo         | qa-complete-platform (1)                                   | TEAM-001 a TEAM-003       | 33%       |
| Configuración  | Ninguna                                                    | SET-001 a SET-003         | 0%        |
| Profundidad    | Parcial en system-crud                                     | DEEP-001 a DEEP-006       | 40%       |
| Casos de borde | ui-ux (UI-021 a UI-025)                                    | EDGE-001 a EDGE-008       | 40%       |

**Cobertura general estimada: 55% → Objetivo: 90%+**

---

## 7. Ejecución

### Comandos

```bash
# Todas las pruebas E2E (5 navegadores)
npx playwright test

# Solo Chromium (rápido)
npx playwright test --project=chromium

# Solo móvil
npx playwright test --project="Mobile Chrome" --project="Mobile Safari"

# QA completo (config QA)
npx playwright test e2e/qa-complete-platform.spec.ts --config playwright.qa.config.ts

# Ver reporte HTML
npx playwright show-report

# Específico: auth + navegación + proyectos
npx playwright test e2e/auth.spec.ts e2e/navigation.spec.ts e2e/projects.spec.ts

# Con UI (modo headed)
npx playwright test --headed
```

---

_Fin del Plan de Pruebas E2E — ORIGEN ERP_
