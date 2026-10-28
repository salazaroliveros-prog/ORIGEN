# Diagnóstico de autenticación y Firebase

**Fecha:** 27 de octubre de 2026
**Alcance:** configuración local, flujo de autenticación y pruebas aisladas.

## Estado comprobado

- Las variables públicas requeridas de Firebase están presentes en el `.env` local y tienen el formato esperado. No se reproducen sus valores en este documento.
- La configuración local apunta al proyecto `origen-erp-guatemala` y a la base de datos `(default)`.
- La ruta `/api/firebase-config.js` devuelve una configuración válida en el navegador.
- La autenticación por correo y la consulta a Firestore se probaron contra los emuladores locales, no contra datos de producción.
- Se retiró Google como método de inicio de sesión; el acceso a la aplicación continúa protegido por Firebase Authentication mediante correo y contraseña.
- La autorización OAuth de Gmail para enviar correo es independiente del inicio de sesión y se conserva para esa función.
- Se alinearon los esquemas de validación de empleados, asistencia, gastos, cotizaciones y maquinaria con los datos que guardan los formularios.

## Hallazgos y correcciones

1. La prueba de configuración esperaba encontrar `window.firebase`, pero la aplicación no publica ese objeto global. Ahora valida la respuesta real de `/api/firebase-config.js`.
2. La prueba del servicio Firebase inicializaba el SDK con campos requeridos vacíos. Ahora define valores ficticios del proyecto de emulación antes de importar el servicio.
3. Se añadió una prueba aislada que crea una cuenta de prueba en Auth Emulator y comprueba una lectura permitida de Firestore.
4. Se retiraron registros de depuración que podían volcar instancias Firebase u objetos de error OAuth completos en la consola. Los mensajes de error de usuario siguen gestionándose por el hook de sesión.
5. Se quitó el botón y el flujo de inicio de sesión con Google, incluido su manejo de redirect y vinculación con credenciales de correo.

## Resultados de verificación

Verificación realizada el 27 de octubre de 2026:

- `npm test`: 41 pruebas aprobadas.
- `npm run test:rules`: 18 pruebas de reglas Firestore aprobadas.
- `npm run test:emulator`: 3 pruebas de integración aprobadas con Auth y Firestore Emulator, incluido el CRUD de APU a través del servicio.
- `npm run test:e2e:emulator`: una prueba Playwright aprobada. Registra una cuenta; crea, lee, edita, archiva y restaura un proyecto; crea y elimina un APU y un gasto; registra y lee empleado y asistencia, y elimina la asistencia; crea una cotización y cambia su estado; crea maquinaria y cambia su estado. Las peticiones Firebase del navegador se verifican como locales.
- `npm run type-check` y ESLint dirigido a los archivos modificados: aprobados.
- `npm run build`: compilación de producción aprobada. Persiste una advertencia de optimización de imagen por `<img>` en `components/ProjectPhotoDropzone.tsx`.

La cobertura comprueba operaciones representativas de esos módulos, no todas las pantallas ni todas las operaciones para cada tipo de entidad. El proyecto se archiva/restaura en vez de eliminarse; empleado y maquinaria no se borran en el recorrido E2E. No se hicieron escrituras en Firebase de producción. Para repetir el recorrido: `npm run test:e2e:emulator`.

## OAuth de Gmail

Google OAuth sigue presente únicamente para la función opcional de envío de Gmail, que solicita permiso separado. No se verificó el consentimiento OAuth ni las credenciales de cliente desde Google Cloud Console; esa función podría requerir ajustes de consola antes de utilizarla.

La prueba de emulador no sustituye esa comprobación ni valida conectividad con la base de datos de producción.
