---
contentType: Reference
title: Plan de pruebas end-to-end — ConstructERP Guatemala
---

# Plan de pruebas end-to-end — ConstructERP Guatemala

Versión: 1.0  
Fecha: 2026-11-07  
Producto: ConstructERP Guatemala — Sistema de gestión de proyectos de construcción  
Entorno: Next.js 16 + Firebase (Firestore, Auth, Storage) + PWA + Playwright + Vitest  
URL de producción: https://origen-one-kohl.vercel.app  
URL de desarrollo: http://localhost:3000

## 1. Resumen ejecutivo

Este documento define la estrategia integral de pruebas end-to-end (E2E) para el sistema ConstructERP Guatemala. Cubre las seis categorías requeridas:

1. Visual analysis testing — Verificación de análisis visual y procesamiento de capturas de pantalla
2. System logic and process testing — Validación de flujos de trabajo core y procesos de backend
3. Data and database testing — Operaciones CRUD integradas con Firebase
4. UI/UX component testing — Pruebas funcionales de elementos interactivos (botones, formularios, navegación)
5. Data visualization testing — Validación de gráficos, gráficas y KPIs
6. Authentication testing — Pruebas rigurosas del proceso de login y acceso seguro

## 2. Infraestructura y herramientas

| Capa              | Herramienta             | Propósito                                   | Archivo de configuración  |
| ----------------- | ----------------------- | ------------------------------------------- | ------------------------- |
| Pruebas unitarias | Vitest                  | Pruebas unitarias de librerías y hooks      | `vitest.config.ts`        |
| Pruebas E2E       | Playwright              | Pruebas end-to-end en navegador             | `playwright.config.ts`    |
| E2E QA            | Playwright (QA config)  | Pruebas de producción en staging/producción | `playwright.qa.config.ts` |
| Emulador Firebase | Firebase Emulator Suite | Firestore + Auth locales para CI            | `firebase.json`           |
| Reportes          | Playwright HTML + JSON  | Reportes de ejecución                       | `test-results/`           |

**Comandos de prueba:**

- `npm test` — Pruebas unitarias (Vitest)
- `npx playwright test` — Pruebas E2E en 5 navegadores (Desktop Chrome, Firefox, Safari; Mobile Chrome, Safari)
- `npx playwright test e2e/qa-production.spec.ts --config playwright.qa.config.ts` — Validación de producción

## 3. Estrategia de pruebas por categoría

### Categoría 1: Visual analysis testing

**Objetivo:** Verificar que el sistema puede procesar, analizar y mostrar información visual (capturas de pantalla, imágenes de obras, diagramas de progreso) de forma correcta en todas las pantallas.

#### Área de cobertura

- Renderizado de componentes glassmorphism (backdrop-filter, blur, transparencias)
- Visualización de imágenes de proyectos (upload de fotos de obra)
- Procesamiento de capturas de pantalla para reporte de progreso
- Consistencia del tema oscuro (dark mode) en todas las pantallas
- Adaptabilidad móvil (responsive design en Pixel 5, iPhone 12)

#### Casos de prueba

| ID      | Caso de prueba                                  | Precondición              | Paso                                 | Resultado esperado                                                                           |
| ------- | ----------------------------------------------- | ------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
| VIS-001 | Renderizado correcto de la navbar glassmorphism | Usuario autenticado       | Navegar a cualquier página           | Navbar muestra backdrop-blur-xl, bordes translúcidos, sombras de vidrio                      |
| VIS-002 | Fondo ambiente mesh-gradient visible            | Página de login/carga     | Cargar `/`                           | Degradado radial visible detrás del panel de auth                                            |
| VIS-003 | Consistencia de colores en dark mode            | Todas las pantallas       | Recorrer menú completo               | Todos los componentes usan paleta dark (slate-950, bg-amber-500/20, etc.)                    |
| VIS-004 | Upload de imagen de obra                        | Proyecto creado           | Ir a Proyectos → Editar → Subir foto | Imagen se muestra en la vista del proyecto                                                   |
| VIS-005 | Responsive en móvil (Pixel 5)                   | Usuario autenticado       | Abrir en Mobile Chrome               | Elementos táctiles ≥44 px, texto legible, sin scroll horizontal                              |
| VIS-006 | Responsive en móvil (iPhone 12)                 | Usuario autenticado       | Abrir en Mobile Safari               | Menú móvil hamburguesa funcional, drawer lateral                                             |
| VIS-007 | Skeleton loaders durante carga de datos         | Navegar entre secciones   | Cambiar de Tablero a Proyectos       | Skeleton aparece hasta que datos cargan, sin parpadeo                                        |
| VIS-008 | ErrorState con iconos y estilos de vidrio       | Forzar error de API       | Navegar a ruta inexistente           | ErrorState muestra panel glass con AlertTriangle, colores ámbar/rojo                         |
| VIS-009 | Toaster notifications con estilo dark           | Acción que genera toast   | Cerrar sesión, crear proyecto        | Toast aparece en fondo oscuro con borde blanco/12 y backdrop-blur                            |
| VIS-010 | Focus visible y accesibilidad visual            | Navegar con teclado (Tab) | Recorrer todos los inputs y botones  | focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary |

### Categoría 2: System logic and process testing

**Objetivo:** Validar que todos los flujos de trabajo core y procesos de backend operan sin interrupciones, con integración correcta entre módulos.

#### Área de cobertura

- Flujo completo de proyecto (crear → editar → archivar → restaurar)
- Flujo de presupuesto APU (crear renglón → asociar proyecto → calcular totales)
- Flujo de gastos (registrar gasto → propagar a proyecto → actualizar tablero)
- Flujo de cotizaciones (crear → enviar → aceptar → reflejar como ingreso)
- Flujo de personal (registrar empleado → cuadrillas → asistencia con GPS)
- Flujo de maquinaria (registrar → mantener → disponibilidad)
- Procesos de backend (Firebase Functions, API routes, emulador)
- Integración entre módulos (datos fluyen correctamente de un módulo a otro)

#### Casos de prueba

| ID      | Caso de prueba                                         | Precondición              | Paso                                                                                                                              | Resultado esperado                                                                               |
| ------- | ------------------------------------------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| SYS-001 | Crear proyecto completo                                | Usuario admin autenticado | Navbar → Proyectos → Nuevo Proyecto → llenar todos los campos → Crear                                                             | Proyecto aparece en lista con código, nombre, cliente, presupuesto, avance                       |
| SYS-002 | Editar proyecto                                        | Proyecto existente        | Clic en "Editar proyecto" → cambiar nombre y presupuesto → Actualizar                                                             | Cambios persisten tras recarga de página                                                         |
| SYS-003 | Archivar y restaurar proyecto                          | Proyecto activo           | Archivar → cambiar filtro a "Archivados" → Restaurar → cambiar a "Activos"                                                        | Proyecto desaparece de activos, aparece en archivados, vuelve tras restaurar                     |
| SYS-004 | Crear renglón APU                                      | Proyecto con avance > 0   | Navbar → Presupuestos APU → Renglón Manual → llenar descripción, unidad, cantidad, precio unitario → Guardar                      | Renglón APU se guarda y aparece asociado al proyecto                                             |
| SYS-005 | Registrar gasto y propagar a tablero                   | Proyecto creado           | Navbar → Gastos → Registrar Gasto → llenar monto, proveedor, proyecto → Guardar                                                   | Gasto aparece en lista de gastos y en KPI "GASTO REAL ACUMULADO" del Tablero                     |
| SYS-006 | Crear cotización y marcar como aceptada                | Proyecto creado           | Navbar → Cotizaciones → Nueva Cotización Rápida → llenar cliente, descripción, monto → Guardar Borrador → Marcar como Aceptada    | Cotización aparece con estado "Aceptada" y monto refleja en ingresos del proyecto                |
| SYS-007 | Registrar empleado en cuadrilla                        | Sección Personal & IGSS   | Navbar → Personal & IGSS → Cuadrillas → Nuevo Empleado → llenar nombre, jornal, teléfono → Guardar                                | Empleado aparece en lista de cuadrillas                                                          |
| SYS-008 | Registrar asistencia con GPS                           | Empleado registrado       | Navbar → Personal & IGSS → Registro & Marcaje GPS → seleccionar empleado → En Obra → Guardar                                      | Registro de asistencia guardado con coordenadas GPS                                              |
| SYS-009 | Registrar maquinaria y cambiar estado                  | Sección Maquinaria        | Navbar → Maquinaria → Registrar Maquinaria → llenar nombre, modelo, tarifa → Guardar → Enviar a mantenimiento → Marcar disponible | Maquinaria cambia entre "Disponible" y "Mantenimiento"                                           |
| SYS-010 | Flujo completo proyecto → gasto → cotización → tablero | Usuario admin             | Ejecutar SYS-001, SYS-005, SYS-006 en secuencia                                                                                   | Tablero muestra KPIs consolidados: presupuesto total, gasto acumulado, ingresos por cotizaciones |

### Categoría 3: Data and database testing

**Objetivo:** Garantizar integridad de datos en operaciones CRUD con Firebase Firestore, sincronización en tiempo real y persistencia.

#### Área de cobertura

- Create: Crear documentos en colecciones de proyectos, gastos, empleados, maquinaria, cotizaciones
- Read: Leer documentos individuales y listas con filtros
- Update: Actualizar campos de documentos existentes
- Delete: Archivar (soft delete) y eliminar documentos
- Transacciones: Operaciones atómicas en Firebase
- Reglas de seguridad (Firestore Rules)
- Sincronización en tiempo real (onSnapshot)
- Datos huérfanos y limpieza
- Emulador Firebase para CI

#### Casos de prueba

| ID     | Caso de prueba                                | Precondición                      | Paso                                                 | Resultado esperado                                                                         |
| ------ | --------------------------------------------- | --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| DB-001 | Create project document                       | Firebase Emulator activo          | Crear proyecto vía UI                                | Documento creado en colección `proyectos` con ID generado automáticamente                  |
| DB-002 | Read project by ID                            | Proyecto creado                   | Navegar a detalle del proyecto                       | Datos del proyecto coinciden con lo creado                                                 |
| DB-003 | Update project budget                         | Proyecto con presupuesto Q100,000 | Editar presupuesto a Q150,000 → Actualizar           | Firestore refleja Q150,000; UI muestra 150,000 tras recarga                                |
| DB-004 | Soft delete (archive) project                 | Proyecto activo                   | Archivar proyecto                                    | Documento tiene campo `estado: 'archivado'`; no aparece en lista activa                    |
| DB-005 | Restore archived project                      | Proyecto archivado                | Cambiar filtro a "Archivados" → Restaurar            | Documento tiene `estado: 'activo'`; aparece en lista activa                                |
| DB-006 | Create expense with project reference         | Proyecto existente                | Registrar gasto asociado al proyecto                 | Documento en `gastos` tiene `projectId` referenciando al proyecto                          |
| DB-007 | Read expenses by project                      | Gastos existentes                 | Filtrar gastos por proyecto                          | Solo gastos del proyecto seleccionado aparecen                                             |
| DB-008 | Create employee record                        | Sección Personal                  | Registrar empleado                                   | Documento en `empleados` con nombre, jornal, teléfono, fecha de creación                   |
| DB-009 | Update employee daily wage                    | Empleado con jornal Q250          | Editar jornal a Q300 → Guardar                       | Firestore refleja Q300; UI muestra cambio inmediato                                        |
| DB-010 | Create machinery record                       | Sección Maquinaria                | Registrar maquinaria                                 | Documento en `maquinaria` con nombre, modelo, tarifa por hora, estado "Disponible"         |
| DB-011 | Delete machinery                              | Maquinaria registrada             | Eliminar maquinaria                                  | Documento removido de colección; UI ya no muestra la tarjeta                               |
| DB-012 | Firestore security rules — unauthorized write | Emulador con reglas activas       | Intentar escritura sin autenticación                 | Regla rechaza la operación (403/permisos denegados)                                        |
| DB-013 | Firestore security rules — authorized write   | Usuario autenticado               | Crear proyecto autenticado                           | Operación permitida                                                                        |
| DB-014 | Real-time sync (onSnapshot)                   | Dos pestañas abiertas             | Crear proyecto en pestaña A → verificar en pestaña B | Pestaña B muestra el nuevo proyecto sin recarga manual                                     |
| DB-015 | Orphan data cleanup                           | Proyecto con gastos asociados     | Archivar proyecto                                    | Gastos permanecen accesibles (no se borran en cascada automática) o se marca como inactivo |

### Categoría 4: UI/UX component testing

**Objetivo:** Validar que todos los elementos interactivos (botones, inputs, selectores, modales, navegación) desencadenan las acciones correctas.

#### Área de cobertura

- Todos los botones de navegación (Tablero, Proyectos, Presupuestos APU, Cotizaciones, Gastos, Maquinaria, Personal, Planillas, Reportes, IA, Gmail, Equipo)
- Botones de acción dentro de modales (Crear, Actualizar, Guardar, Cancelar, Archivar, Restaurar)
- Campos de input (texto, email, número, fecha, contraseña, teléfono)
- Selectores y dropdowns (estado de proyecto, rol de empleado, moneda)
- Modales y diálogos (abrir, cerrar con Escape, clic fuera)
- Checkboxes y toggles (términos y condiciones, recordar contraseña)
- Botones de estado (En Obra, En Mantenimiento, Disponible, Aceptada)
- Botones de navegación móvil (drawer, hamburguesa, bottom nav)
- Paginación y listas

#### Casos de prueba

| ID     | Caso de prueba                                          | Precondición                   | Paso                                                 | Resultado esperado                                                      |
| ------ | ------------------------------------------------------- | ------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| UI-001 | Botón "Tablero" navega correctamente                    | Usuario autenticado            | Clic en "Tablero"                                    | URL muestra Tablero, contenido de dashboard visible                     |
| UI-002 | Botón "Proyectos & Firmas" abre sección                 | Usuario autenticado            | Clic en "Proyectos & Firmas"                         | Lista de proyectos o estado vacío visible                               |
| UI-003 | Botón "Nuevo Proyecto" abre modal                       | Sección Proyectos              | Clic en "Nuevo Proyecto"                             | Modal "Nuevo Proyecto" visible con todos los campos                     |
| UI-004 | Botón "Crear Proyecto" guarda y cierra modal            | Modal abierto, campos llenos   | Llenar campos → Clic en "Crear Proyecto"             | Modal se cierra, proyecto aparece en lista                              |
| UI-005 | Botón "Cancelar" cierra modal sin guardar               | Modal abierto                  | Llenar campos parcialmente → Clic en "Cancelar"      | Modal se cierra, no se crea proyecto                                    |
| UI-006 | Botón "Editar proyecto" abre modal de edición           | Proyecto en lista              | Clic en "Editar proyecto {código}"                   | Modal "Editar Proyecto" visible con datos precargados                   |
| UI-007 | Botón "Actualizar" guarda cambios                       | Modal de edición abierto       | Cambiar campo → Clic en "Actualizar"                 | Cambios persisten, modal se cierra                                      |
| UI-008 | Botón "Archivar proyecto" cambia estado                 | Proyecto activo                | Clic en "Archivar proyecto {código}"                 | Proyecto pasa a estado archivado                                        |
| UI-009 | Botón "Restaurar proyecto" reactiva proyecto            | Proyecto archivado             | Cambiar filtro a "Archivados" → Clic en "Restaurar"  | Proyecto vuelve a estado activo                                         |
| UI-010 | Botón "Registrar Gasto / Factura" abre formulario       | Sección Gastos                 | Clic en botón                                        | Formulario de gasto visible con campos de descripción, monto, proveedor |
| UI-011 | Botón "Nueva Cotización Rápida" abre modal              | Sección Cotizaciones           | Clic en botón                                        | Modal de cotización visible con campos de cliente, descripción, monto   |
| UI-012 | Botón "Nuevo Empleado" abre formulario                  | Sección Personal               | Clic en botón                                        | Formulario de empleado visible con nombre, jornal, teléfono             |
| UI-013 | Botón "Nueva Maquinaria" abre formulario                | Sección Maquinaria             | Clic en botón                                        | Formulario de maquinaria visible con nombre, modelo, tarifa             |
| UI-014 | Botón "En Obra" registra asistencia                     | Registro de asistencia abierto | Seleccionar empleado → Clic en "En Obra"             | Estado del empleado cambia a "En Obra" con timestamp                    |
| UI-015 | Botón "Enviar a mantenimiento" cambia estado maquinaria | Maquinaria disponible          | Clic en "Enviar a mantenimiento"                     | Tarjeta muestra "Mantenimiento"                                         |
| UI-016 | Botón "Marcar disponible" restaura maquinaria           | Maquinaria en mantenimiento    | Clic en "Marcar disponible"                          | Tarjeta muestra "Disponible"                                            |
| UI-017 | Botón "Iniciar Sesión" autentica                        | Página de login visible        | Llenar email y contraseña → Clic en "Iniciar Sesión" | Sesión iniciada, redirección a Tablero                                  |
| UI-018 | Botón "Crear cuenta" registra usuario                   | Página de registro visible     | Llenar formulario → Clic en "Crear cuenta"           | Cuenta creada, redirección a dashboard                                  |
| UI-019 | Botón "Regístrate ahora" navega a registro              | Página de login visible        | Clic en "Regístrate ahora"                           | Página de registro visible                                              |
| UI-020 | Botón "Cerrar sesión" termina sesión                    | Usuario autenticado            | Clic en "Cerrar sesión"                              | Redirección a login, token borrado                                      |
| UI-021 | Clic fuera de modal cierra el diálogo                   | Modal abierto                  | Clic fuera del área del modal                        | Modal se cierra                                                         |
| UI-022 | Tecla Escape cierra modal                               | Modal abierto                  | Presionar Escape                                     | Modal se cierra                                                         |
| UI-023 | Input de email valida formato                           | Formulario de login            | Escribir "email-invalido" → Clic en submit           | Error de validación mostrado                                            |
| UI-024 | Input de contraseña oculta/muestra texto                | Formulario de login            | Clic en icono de ojo                                 | Contraseña alterna entre texto y puntos                                 |
| UI-025 | Select de estado de proyecto filtra correctamente       | Lista de proyectos             | Cambiar filtro a "Archivados"                        | Solo proyectos archivados visibles                                      |

### Categoría 5: Data visualization testing

**Objetivo:** Validar precisión y renderizado correcto de gráficos, gráficas y KPIs en el tablero y reportes.

#### Área de cobertura

- KPIs del tablero (presupuesto total, gasto acumulado, ingresos, proyectos activos, avance promedio)
- Gráficas de progreso por proyecto
- Gráficas de gastos por categoría
- Barras de avance (progress bars)
- Tarjetas de métricas (KPI cards)
- Actualización de visualizaciones tras cambios de datos
- Exportación de reportes (PDF, imagen)

#### Casos de prueba

| ID      | Caso de prueba                                     | Precondición                             | Paso                          | Resultado esperado                                                       |
| ------- | -------------------------------------------------- | ---------------------------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| DAT-001 | KPI "Presupuesto Total" muestra suma correcta      | Múltiples proyectos creados              | Ir a Tablero                  | KPI muestra suma de presupuestos de todos los proyectos activos          |
| DAT-002 | KPI "Gasto Real Acumulado" muestra total de gastos | Gastos registrados                       | Ir a Tablero                  | KPI muestra suma de todos los gastos                                     |
| DAT-003 | KPI "Ingresos por Cotizaciones" muestra total      | Cotizaciones aceptadas                   | Ir a Tablero                  | KPI muestra suma de montos de cotizaciones aceptadas                     |
| DAT-004 | Barra de avance de proyecto refleja porcentaje     | Proyecto con avance 60 %                 | Ver proyecto en lista         | Barra de progreso muestra 60 %, texto "60 %" visible                     |
| DAT-005 | Tarjetas KPI se actualizan tras crear gasto        | Tablero abierto                          | Registrar gasto de Q12,000    | KPI de gasto aumenta en Q12,000 inmediatamente                           |
| DAT-006 | Tarjetas KPI se actualizan tras aceptar cotización | Tablero abierto                          | Aceptar cotización de Q25,000 | KPI de ingresos aumenta en Q25,000                                       |
| DAT-007 | Gráfica de progreso por proyecto renderiza         | Múltiples proyectos con diferente avance | Ir a Tablero                  | Gráfica muestra barras proporcionales al avance de cada proyecto         |
| DAT-008 | Gráfica de gastos por categoría renderiza          | Gastos en diferentes categorías          | Ir a Reportes                 | Gráfica de barras/circular muestra distribución por categoría            |
| DAT-009 | KPIs persisten tras recarga de página              | Datos en Firestore                       | Recargar página de Tablero    | KPIs muestran los mismos valores que antes de recargar                   |
| DAT-010 | Exportar reporte a PDF                             | Reporte generado                         | Clic en "Exportar PDF"        | Se descarga archivo PDF con los datos del reporte                        |
| DAT-011 | Visualización no se rompe con datos vacíos         | Sin proyectos creados                    | Ir a Tablero                  | KPIs muestran 0 o "Sin datos", no errores de JavaScript                  |
| DAT-012 | Formato de moneda (GTQ) correcto                   | Montos en quetzales                      | Ver cualquier monto           | Montos muestran formato "Q 100,000" o "100,000" con separadores de miles |

### Categoría 6: Authentication testing

**Objetivo:** Validar rigurosamente el proceso de login, registro, manejo de sesiones, rate limiting y control de acceso.

#### Área de cobertura

- Login con credenciales válidas
- Login con credenciales inválidas (email/contraseña incorrectos)
- Rate limiting (bloqueo tras 5 intentos fallidos, 15 minutos)
- Registro de nueva cuenta con validación de contraseña
- Recuperación de contraseña (reset email)
- Recordarme (persistencia de sesión)
- Cierre de sesión
- Acceso sin autenticación (redirección a login)
- Protección de rutas (rutas privadas requieren auth)
- Manejo de sesión expirada
- Errores de Firebase Auth

#### Casos de prueba

| ID       | Caso de prueba                                      | Precondición                        | Paso                                                                     | Resultado esperado                                                        |
| -------- | --------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| AUTH-001 | Login con credenciales válidas                      | Usuario registrado en Firebase      | Llenar email y contraseña correctos → Clic en "Iniciar Sesión"           | Redirección a Tablero, sesión activa, email visible en navbar             |
| AUTH-002 | Login con email inválido                            | Página de login                     | Escribir email sin formato válido → Clic en submit                       | Error de validación: "Ingresa un correo válido"                           |
| AUTH-003 | Login con contraseña corta                          | Página de login                     | Escribir contraseña < 6 caracteres → Clic en submit                      | Error: "La contraseña debe tener al menos 6 caracteres"                   |
| AUTH-004 | Login con credenciales incorrectas                  | Usuario no existe o contraseña mal  | Llenar email válido + contraseña incorrecta → Clic en submit             | Error: "Correo o contraseña incorrectos"                                  |
| AUTH-005 | Rate limiting — 5 intentos fallidos bloquean cuenta | Página de login                     | 5 veces: email válido + contraseña incorrecta                            | Después del 5to intento: "Cuenta bloqueada por 15 minutos", timer visible |
| AUTH-006 | Rate limiting — timer de bloqueo                    | Cuenta bloqueada                    | Esperar o verificar timer                                                | Muestra minutos restantes para reintentar                                 |
| AUTH-007 | Registro con contraseña débil                       | Página de registro                  | Escribir contraseña sin mayúscula/número/carácter especial               | Error de validación específico (mayúscula, número, carácter especial)     |
| AUTH-008 | Registro con contraseñas no coinciden               | Página de registro                  | Llenar contraseña y confirmar diferente                                  | Error: "Las contraseñas no coinciden"                                     |
| AUTH-009 | Registro exitoso                                    | Página de registro                  | Llenar todos los campos válidos → Clic en "Crear cuenta"                 | Cuenta creada, redirección a dashboard, toast de éxito                    |
| AUTH-010 | Recuperación de contraseña                          | Página de login                     | Clic en "¿Olvidaste tu contraseña?" → Llenar email → Enviar              | Toast: "Correo de reseteo enviado"                                        |
| AUTH-011 | Recordarme persiste sesión                          | Página de login                     | Marcar "Recuérdame" → Iniciar sesión → Cerrar navegador → Abrir de nuevo | Sesión aún activa, no requiere login nuevamente                           |
| AUTH-012 | Cierre de sesión                                    | Usuario autenticado                 | Clic en "Cerrar sesión"                                                  | Redirección a login, sesión borrada                                       |
| AUTH-013 | Acceso sin autenticación redirige a login           | No hay sesión activa                | Intentar acceder a /dashboard directamente                               | Redirección a página de login o muestra formulario de auth                |
| AUTH-014 | Ruta protegida sin token                            | No autenticado                      | Acceder a API privada sin Authorization header                           | Respuesta 401/403                                                         |
| AUTH-015 | Sesión expirada manejo graceful                     | Sesión expirada en servidor         | Intentar acción que requiera auth                                        | Redirección a login o toast de error de sesión                            |
| AUTH-016 | Auto-auth (si está habilitado)                      | Usuario configurado para auto-login | Cargar página /                                                          | Sistema entra directamente sin pantalla de login                          |
| AUTH-017 | Contraseña visible/oculta toggle                    | Formulario de login/registro        | Clic en icono de ojo en campo de contraseña                              | Texto alterna entre oculto (puntos) y visible                             |

## 4. Plan de ejecución y cronograma

| Fase   | Actividad                                                         | Duración | Responsable | Criterio de salida                      |
| ------ | ----------------------------------------------------------------- | -------- | ----------- | --------------------------------------- |
| Fase 1 | Preparación de entorno (emulador Firebase, variables de entorno)  | 1 día    | QA Lead     | Emulador corriendo en localhost:8081    |
| Fase 2 | Ejecución de Authentication Testing (AUTH-001 a AUTH-017)         | 1 día    | QA Engineer | 0 fallas críticas en auth               |
| Fase 3 | Ejecución de UI/UX Component Testing (UI-001 a UI-025)            | 1 día    | QA Engineer | Todos los botones funcionan             |
| Fase 4 | Ejecución de Data and Database Testing (DB-001 a DB-015)          | 1.5 días | QA Engineer | CRUD completo sin errores               |
| Fase 5 | Ejecución de System Logic and Process Testing (SYS-001 a SYS-010) | 2 días   | QA Engineer | Flujos end-to-end verdes                |
| Fase 6 | Ejecución de Data Visualization Testing (DAT-001 a DAT-012)       | 1 día    | QA Engineer | KPIs y gráficas precisas                |
| Fase 7 | Ejecución de Visual Analysis Testing (VIS-001 a VIS-010)          | 1 día    | QA Engineer | UI consistente en todos los navegadores |
| Fase 8 | Reporte de defectos y retest                                      | 1 día    | QA Lead     | 0 defectos críticos abiertos            |
| Fase 9 | Despliegue a producción y smoke test                              | 0.5 día  | DevOps      | Aplicación live en Vercel               |

**Duración total estimada:** 10 días

## 5. Criterios de aceptación y salida

### Criterios de salida por categoría

| Categoría          | Criterio de salida                                                        |
| ------------------ | ------------------------------------------------------------------------- |
| Visual analysis    | 100 % de casos VIS pasados; sin regresiones visuales en 5 navegadores     |
| System logic       | 100 % de casos SYS pasados; flujos core completos sin interrupciones      |
| Data and database  | 100 % de casos DB pasados; CRUD completo; reglas de seguridad funcionando |
| UI/UX component    | 100 % de casos UI pasados; todos los botones desencadenan acción correcta |
| Data visualization | 100 % de casos DAT pasados; KPIs precisos; gráficas renderizan            |
| Authentication     | 100 % de casos AUTH pasados; rate limiting funciona; sesiones seguras     |

### Criterios globales de salida (Go/No-Go para producción)

- 0 defectos críticos (Severity 1) abiertos
- 0 defectos altos (Severity 2) abiertos
- Al menos 95 % de casos de prueba automatizados pasando
- Build de producción exitoso (`npm run build`)
- Pruebas de unidad pasando (1078 tests, 48 archivos)
- CI de GitHub Actions verde
- Despliegue en Vercel exitoso y verificable

## 6. Gestión de defectos

### Severidad y prioridad

| Severidad    | Definición                                                    | Tiempo de resolución        |
| ------------ | ------------------------------------------------------------- | --------------------------- |
| S1 — Crítico | Sistema no funciona, pérdida de datos, seguridad comprometida | Inmediato (bloquea release) |
| S2 — Alto    | Funcionalidad core rota, workaround no disponible             | 24 horas                    |
| S3 — Medio   | Funcionalidad afectada con workaround                         | 3 días                      |
| S4 — Bajo    | Cosmético, menor impacto                                      | Próximo release             |

### Flujo de defectos

1. QA detecta defecto → registra en sistema de tracking
2. Desarrollador asigna prioridad y lo corrige
3. QA ejecuta retest del caso afectado + casos relacionados (regresión)
4. Defecto cerrado si pasa; reabierto si falla

## 7. Reportes y métricas

### Métricas a reportar

| Métrica                             | Objetivo                     | Fuente              |
| ----------------------------------- | ---------------------------- | ------------------- |
| Cobertura de pruebas E2E            | ≥ 90 % de flujos core        | Playwright report   |
| Cobertura de pruebas unitarias      | ≥ 80 %                       | Vitest coverage     |
| Tasa de éxito de pruebas            | 100 % en categorías críticas | Playwright + Vitest |
| Tiempo de ejecución E2E             | < 15 minutos                 | Playwright report   |
| Defectos por severidad              | 0 críticos, 0 altos          | Sistema de tracking |
| Tiempo medio de recuperación (MTTR) | < 4 horas para S1            | Sistema de tracking |

### Reportes generados

- `test-results/playwright-report.html` — Reporte HTML de Playwright
- `test-results/playwright-report.json` — Datos JSON de Playwright
- `coverage/` — Cobertura de Vitest (v8)
- `test-results/` — Capturas de pantalla y videos de fallos

## 8. Riesgos y mitigaciones

| Riesgo                                          | Impacto                    | Mitigación                                                             |
| ----------------------------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| Firebase Emulator no disponible en CI           | Pruebas de DB fallan       | Usar variables de entorno para emular o mock de Firebase               |
| Datos de prueba contaminan producción           | Corrupción de datos        | Usar proyectos separados (demo-origen-e2e) para pruebas                |
| Flaky tests por tiempo de carga                 | Falsos positivos/negativos | Usar `waitForSelector` y `waitForTimeout` apropiados; reintentos en CI |
| Cambios en UI rompen selectores                 | Pruebas E2E fallan         | Usar selectores semánticos (role, label) en lugar de clases CSS        |
| Rate limiting bloquea pruebas de auth           | No se puede probar login   | Usar cuenta dedicada para pruebas; limpiar entre pruebas               |
| Navegadores móviles no soportan backdrop-filter | Pruebas visuales fallan    | Proporcionar fallback de fondo sólido en CSS                           |

## 9. Aprobaciones

| Rol           | Nombre | Firma | Fecha |
| ------------- | ------ | ----- | ----- |
| QA Lead       | —      | —     | —     |
| Tech Lead     | —      | —     | —     |
| Product Owner | —      | —     | —     |
| DevOps        | —      | —     | —     |

## 10. Apéndice: comandos de ejecución

Pruebas unitarias (Vitest):

```bash
npm test
```

Pruebas E2E en todos los navegadores (Playwright):

```bash
npx playwright test
```

Pruebas E2E solo en Chrome de escritorio:

```bash
npx playwright test --project=chromium
```

Pruebas E2E en móvil:

```bash
npx playwright test --project="Mobile Chrome"
```

Validación de producción (QA):

```bash
npx playwright test e2e/qa-production.spec.ts --config playwright.qa.config.ts
```

Ejecutar categoría específica (ej. auth):

```bash
npx playwright test e2e/auth.spec.ts
```

Ver reporte HTML:

```bash
npx playwright show-report
```

Build de producción:

```bash
npm run build
```

Type check:

```bash
npm run type-check
```

Lint:

```bash
npm run lint
```

Auditoría de vulnerabilidades:

```bash
npm audit
```
