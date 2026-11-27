# ORIGEN ERP — Estado vigente de preparación para producción

**Fecha de corte:** 26 de noviembre de 2026  
**Decisión de salida:** **GO — desplegado en producción**  
**Rama desplegada:** `main` · **Dominio canónico:** `https://origen-one-kohl.vercel.app`  
**Verificación:** 1615 tests unitarios, 49/49 tests de reglas Firestore, E2E móvil 2/2, build de producción correcto.

> **Actualización:** el contenido anterior de este documento (NO GO, rama `audit/fix-ci-and-setup-scripts`, PR #5) quedó superado. El sistema fue reconciliado con `origin/main`, desplegado en Vercel y verificado en vivo: los 3 alias de producción apuntan al mismo deployment y el dominio canónico sirve la versión actualizada. El resto del documento se conserva como registro histórico de las correcciones aplicadas en esa rama.

## 1. Resumen ejecutivo

Se han aplicado correcciones reales en la rama de auditoría para navegación E2E, accesibilidad del cierre de proyectos, acceso a configuración de marca, exactitud monetaria en pagos de subcontratos y seguridad/consistencia del control de maquinaria.

**Todavía no hay evidencia suficiente para declarar el ERP 100 % validado ni listo para producción.** La última ejecución CI del commit `f010014312b8eec43828bec99bbd899b642fdd9d` está en curso; la validación E2E completa para ese commit no ha terminado. Vercel sigue devolviendo el fallo de límite de compilaciones del equipo. Tampoco se han verificado contra el proyecto Firebase de producción los valores reales, App Check, dominios autorizados, respaldos ni restauración.

No se realizaron escrituras de prueba en la base de datos productiva.

## 2. Correcciones aplicadas en la rama de auditoría

### Navegación, accesibilidad y pruebas de navegador

- Se actualizaron selectores E2E para que los módulos del menú lateral se identifiquen como botones, no como enlaces; se conservó el tratamiento separado para el enlace real de Facturas FEL.
- Se corrigió la asociación accesible de las etiquetas y campos del formulario de cierre de proyecto, incluyendo observaciones y saldo final.
- Se corrigió el texto esperado por la prueba de saldo final para que coincida con la etiqueta real del formulario.
- Se ajustó la prueba de Planillas Guate para hacer clic en el módulo antes de verificar que está activo y que se muestra su vista.
- Se añadió acceso a Configuración de Marca desde el menú lateral de escritorio para los roles con permiso de administración de empresa, enlazando el callback ya existente. La prueba abre y cierra el diálogo.
- Se sustituyó una prueba que contaba clics sin validar el resultado por una comprobación del estado activo de cada módulo crítico y de la región principal.
- Se agregó concurrencia al workflow para cancelar validaciones obsoletas del mismo PR y evitar ejecuciones duplicadas.

### Pagos de subcontratos y exactitud monetaria

- Se agregó normalización de montos GTQ a dos decimales antes de calcular saldo, persistir pago y crear el egreso asociado.
- Se corrigió la comparación de reintentos/idempotencia para comparar el monto normalizado tanto en pago como en egreso.
- Las reglas de Firestore ahora rechazan valores de pago con fracciones de centavo.
- Se añadió una prueba de emulador que intenta escribir directamente un pago y su egreso con tres decimales; debe ser rechazada.

### Maquinaria, horómetros y trazabilidad

- Las lecturas no numéricas, negativas o inconsistentes entre horómetro actual y último servicio ya no se convierten silenciosamente en cero ni se presentan como estado correcto; generan alerta y bloquean el registro de uso hasta revisión.
- La lógica de dominio también rechaza equipos en mantenimiento y cambios de proyecto sin finalizar primero el uso anterior.
- El registro de uso cambió de un lote basado en datos potencialmente obsoletos a una transacción Firestore que vuelve a leer el equipo desde la base de datos.
- La transacción verifica pertenencia a empresa, estado, horómetro vigente y existencia previa de los IDs de bitácora y gasto. Actualiza horómetro, proyecto, estado, referencia de bitácora, bitácora y egreso como una sola operación.
- Se agregó `lastMachineryLogId` al modelo y su esquema de validación.
- Las reglas vinculan el avance del horómetro a una bitácora nueva de la misma maquinaria, proyecto y empresa; también impiden reutilizar el último ID de bitácora para volver a sumar sus horas.
- Se añadieron pruebas de emulador para operaciones atómicas, lecturas obsoletas, duplicados y escrituras directas no autorizadas del horómetro.

**Nota:** las correcciones anteriores están implementadas en la rama; la ejecución CI del último commit aún debe confirmarlas.

## 3. Estado de verificación observado

| Control                                    | Evidencia disponible                                                                                                               | Estado al corte                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Instalación de dependencias y lint         | Aprobados en ejecuciones recientes de la rama antes de los últimos cambios de reglas/maquinaria                                    | Parcial; requiere repetir en el último commit |
| Validación Service Worker y manifiesto PWA | Aprobadas en ejecuciones recientes                                                                                                 | Parcial; requiere repetir en el último commit |
| TypeScript y pruebas unitarias             | Aprobados en ejecuciones recientes                                                                                                 | Parcial; requiere repetir en el último commit |
| Firebase Emulator / reglas                 | Aprobado en una ejecución previa con las correcciones de centavos; los nuevos controles de horómetro aún esperan ejecución íntegra | Pendiente                                     |
| Build Next.js                              | Aprobado en el commit `428708e`; las ejecuciones posteriores fueron canceladas al avanzar la rama                                  | Pendiente de repetir en el último commit      |
| Playwright E2E completo                    | La última ejecución que alcanzó esta etapa fue cancelada al entrar nuevos commits; no hay aprobación integral del head actual      | Pendiente                                     |
| Vercel Preview del head actual             | El check de Vercel devuelve `build-rate-limit`; no se pudo confirmar un deployment Preview accesible desde el conector             | Bloqueado externamente                        |
| Producción Firebase                        | No se verificó configuración real, App Check, dominios, backups ni restore                                                         | Pendiente de acceso/validación                |
| Aceptación funcional en campo              | No hay acta de UAT firmada para todos los roles y módulos                                                                          | Pendiente                                     |

La ejecución debe revisarse por SHA, no mezclando resultados de commits anteriores. La ejecución asociada al commit `f010014312b8eec43828bec99bbd899b642fdd9d` es:
[GitHub Actions — rama de auditoría](https://github.com/salazaroliveros-prog/ORIGEN/actions).

El PR continúa en borrador y no debe fusionarse a `main` hasta cerrar todas las puertas de salida.

## 4. Limitaciones funcionales conocidas que siguen abiertas

### Compras e inventario

- Las órdenes de compra admiten actualmente un máximo de **dos renglones únicos**. La validación de dominio, la interfaz, las reglas y las pruebas comparten esa restricción. No se debe aumentar el límite cambiando solo la interfaz o quitando una condición; una ampliación segura requiere un modelo escalable (por ejemplo, subcolección de renglones), migración y reglas/pruebas equivalentes.
- Existe registro de proveedores, órdenes, recepción y movimientos de inventario, pero no se ha demostrado un flujo completo de cuentas por pagar para facturas de proveedor, abonos, pagos parciales, conciliación de saldo, retenciones y prevención de contabilización doble a partir de facturas reales.
- Existe registro transaccional de existencias iniciales/ajustes, pero no se ha validado una importación desde Excel con prevalidación, detección de duplicados, revisión de errores, conciliación y reversión controlada.

### Operación sin conexión

- Firestore tiene caché local persistente cuando IndexedDB está disponible, con fallback a memoria.
- La cola propia de acciones offline cubre solo un conjunto limitado (asistencia, avance/progreso y visitas de campo).
- El Service Worker no conserva el HTML autenticado de toda la aplicación. Compras, inventario y otras transacciones requieren conectividad.
- Por lo anterior, **no debe anunciarse el ERP como completamente operativo offline**. Hace falta diseñar, implementar y probar el ciclo offline completo por módulo, incluyendo reintentos idempotentes y reconciliación al reconectar.

### Maquinaria y activos

- Se reforzó el registro de operación, horómetro, costo, mantenimiento preventivo y trazabilidad de bitácoras.
- No está demostrado un registro patrimonial completo de herramientas/equipos propios: alta de activos, propiedad/valor, responsable asignado, entrega y devolución, mantenimiento histórico, pérdida/daño, baja y auditoría.

### Nómina y normativa

- La pantalla de planillas indica que es una **estimación no oficial**. No debe utilizarse como liquidación legal ni presentarse como cálculo oficial de IGSS/ISR sin verificación vigente de tasas, topes, obligaciones y revisión profesional en Guatemala.

## 5. Requisitos obligatorios antes de producción

1. **CI del último SHA:** ejecutar sin cancelaciones lint, PWA, TypeScript, pruebas unitarias, Firebase Emulator, build y toda la suite Playwright. Corregir y volver a ejecutar cualquier fallo.
2. **Vercel Preview:** el propietario del equipo debe resolver el límite de builds o habilitar el acceso/proyecto correcto. Después comprobar que el Preview corresponde al SHA exacto aprobado, que compila y que supera smoke tests.
3. **Firebase productivo:** confirmar proyecto y bases correctas, reglas desplegadas, App Check y proveedores configurados, dominios autorizados, índices, Storage, cuentas de servicio/secretos y separación estricta de entornos.
4. **Respaldo y recuperación:** ejecutar y documentar backup real, restauración en entorno aislado, consistencia y procedimiento de rollback.
5. **Seguridad:** revisar reglas completas por colección y rol, secretos y claves expuestas, tokens de depuración, endpoints, límites, auditoría y permisos. Ejecutar pruebas negativas entre empresas y roles.
6. **UAT de negocio:** recorrer login/onboarding, proyectos, presupuestos/APU, cotizaciones, compras, recepción, movimientos, gastos, subcontratos, asistencia, nómina estimada, maquinaria, cierre, reportes/PDF y permisos con propietario, administración, finanzas, supervisor y campo.
7. **Dispositivos y conectividad:** probar escritorio y móvil reales, conectividad intermitente, operación sin conexión documentada por función, reconexión, conflictos y duplicados.
8. **Datos y contabilidad:** importar datos de prueba representativos, conciliar saldos, IVA, totales, inventarios, pagos y cierres por proyecto, sin modificar datos reales hasta aprobación.
9. **Aprobación de salida:** obtener aceptación del responsable de negocio y liberar primero con un plan de reversión y monitoreo.

## 6. Decisión y política de release

**NO GO.** No fusionar el PR a `main`, no desplegar este head a producción y no cargar datos operativos reales mientras estén pendientes las verificaciones anteriores.

El límite de Vercel es externo al código de esta rama y requiere intervención en la cuenta/equipo de Vercel. Las validaciones de Firebase productivo y UAT requieren acceso y aprobación del propietario de esos entornos. No es correcto reemplazarlas con suposiciones ni con resultados del emulador.

## 7. Reportes históricos

Los documentos `COMPREHENSIVE_SYSTEM_VALIDATION_REPORT.md`, `DEPLOYMENT_FINAL_REPORT.md`, `FINAL_COMPLETION_REPORT.txt` y `GO_LIVE_FINAL_REPORT.md` describen estados y fechas anteriores. Sus frases de “100 % completo”, “producción lista” o porcentajes de pruebas no acreditan el estado vigente de noviembre de 2026. Deben leerse como histórico y no como autorización de despliegue.

---

**Mantenimiento del documento:** actualizar fecha, SHA, resultados exactos de CI/Vercel y lista de bloqueos cada vez que cambie el head del PR o se complete una puerta de salida.
