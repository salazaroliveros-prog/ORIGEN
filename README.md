# ORIGEN ERP

Sistema web de gestión para proyectos de construcción, con configuración orientada a operaciones en Guatemala (GTQ e IVA configurable, normalmente 12 %). La aplicación utiliza Next.js, React, TypeScript y Firebase.

> **Estado:** en desarrollo y validación. El repositorio contiene módulos funcionales y pruebas automatizadas, pero no debe considerarse listo para producción hasta completar las validaciones de CI, seguridad, operación real y despliegue.

## Módulos del sistema

- **Proyectos y tablero:** organización de obras, estado, avance y seguimiento.
- **Presupuestos y APU:** partidas, cantidades y costos de materiales, mano de obra y equipo.
- **Cotizaciones:** elaboración y seguimiento de propuestas.
- **Gastos y facturación:** registro de gastos y su relación con proyectos.
- **Personal y asistencia:** empleados, registros de asistencia y funciones de campo.
- **Planillas:** herramientas de cálculo de nómina para Guatemala.
- **Inventario y abastecimiento:** proveedores, artículos, bodegas, órdenes de compra, recepciones parciales y saldos por movimientos.
- **Operación de inventario:** inventarios iniciales, ajustes de entrada/salida, salidas a proyecto y traslados entre bodegas, sujetos a reglas de seguridad y transacciones.
- **Subcontratos:** contratos, pagos y controles de saldo.
- **Maquinaria y reportes:** seguimiento operativo y consultas de gestión.

La disponibilidad de cada acción depende del rol, empresa y proyecto activo. Las reglas de Firestore son parte del control de autorización; no se debe sustituir su validación por controles únicamente visuales del cliente.

## Requisitos

- Node.js 24 (versión utilizada por CI).
- npm.
- Proyecto Firebase para ejecutar la aplicación con servicios reales.
- Java 21 para ejecutar los emuladores de Firebase localmente.

## Instalación y desarrollo

Instala dependencias:

```bash
npm ci
```

Crea `.env.local` a partir de `.env.example` y configura únicamente las variables correspondientes al proyecto Firebase que tengas autorizado para desarrollo:

```bash
cp .env.example .env.local
```

Inicia el servidor:

```bash
npm run dev
```

No uses credenciales de producción en pruebas locales ni en los emuladores.

## Validaciones

Ejecuta las comprobaciones de forma separada para identificar con claridad cualquier fallo:

```bash
npm run lint
npm run type-check
npm test
npm run test:firebase
npm run build
npm run test:e2e
```

- `npm test`: pruebas unitarias y de integración no dependientes de emuladores.
- `npm run test:firebase`: reglas de Firestore y operaciones contra emuladores de Firebase.
- `npm run test:e2e`: flujos de navegador con una instancia aislada de la aplicación y Firebase Emulator.
- `npm run build`: compilación de producción; no realiza por sí sola una validación del despliegue.

Validaciones PWA:

```bash
node scripts/generate-service-worker.js
node scripts/pwa-manifest-validator.js
```

Los resultados válidos son los de la ejecución de CI asociada al commit que se pretende integrar. No deben reutilizarse porcentajes, cantidades de pruebas ni resultados de ejecuciones antiguas como métricas actuales.

## Firebase y seguridad

- Las operaciones deben ejecutarse con el contexto de empresa y permisos del usuario autenticado.
- El inventario se deriva de movimientos auditables; no se debe modificar una existencia directamente para eludir el historial.
- Las recepciones de compra, salidas, ajustes y traslados deben conservar su relación atómica con los movimientos y saldos.
- Usa emuladores y datos aislados para pruebas automatizadas.
- Antes de cambiar reglas, comprueba tanto los casos permitidos como los intentos no autorizados.

## Funcionamiento sin conexión

El soporte offline es **parcial**, no un modo offline completo del ERP. La aplicación utiliza persistencia local de Firestore para las operaciones compatibles con su SDK. La pantalla offline documenta como procesos de captura previstos asistencia, avance y visitas de obra. No se debe asumir que inventario, compras, finanzas ni todos los módulos pueden operar y sincronizarse sin conexión.

## Preparación para producción

Antes de un despliegue real se debe:

1. Obtener CI completamente verde en el commit exacto.
2. Revisar reglas de Firestore y Storage, autenticación, roles y aislamiento entre empresas.
3. Ejecutar pruebas E2E con datos de prueba y revisar los escenarios críticos de cada módulo.
4. Confirmar la configuración de Firebase y Vercel, dominios, variables, permisos y proyecto de destino.
5. Validar respaldos, recuperación, monitoreo y comportamiento operativo con datos controlados.
6. Verificar específicamente las limitaciones offline y los procesos financieros y de inventario de extremo a extremo.

Una compilación correcta o una vista previa de Vercel no equivalen a una aprobación para producción. Los cambios deben revisarse e integrarse mediante el flujo de Pull Request.

## Contribución y cambios

Mantén los cambios acotados, incorpora pruebas de regresión para cada corrección y no debilites las reglas de seguridad para hacer pasar una prueba. Las migraciones de datos, modificaciones de producción, integración de ramas y despliegues requieren una revisión separada.

## Licencia

Uso interno del sistema ORIGEN ERP.
