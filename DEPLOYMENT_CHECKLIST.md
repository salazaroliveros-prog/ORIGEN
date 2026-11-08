---
contentType: Checklist
title: Checklist de despliegue — ORIGEN ERP
---

# Checklist de despliegue — ORIGEN ERP

Este checklist asegura que todos los pasos necesarios se completen antes de desplegar a producción.

## Antes del despliegue

### 1. Validación de código

- Todos los tests de integración pasan: `npm test`
- Linting pasa: `npm run lint`
- Formato correcto: `npm run format:check`
- Type check pasa: `npm run type-check`
- No hay `console.log` en producción
- No hay código comentado sin usar

### 2. Validación de funcionalidad

- El login funciona correctamente
- El registro funciona correctamente
- La recuperación de contraseña funciona
- La creación de proyectos funciona
- La edición de proyectos funciona
- La eliminación de proyectos funciona
- La gestión financiera funciona
- La nómina funciona
- Los reportes se generan correctamente
- La exportación funciona

### 3. Validación de seguridad

- Variables de entorno configuradas en Vercel
- No hay secretos en el código
- Las reglas de Firebase están configuradas
- Los encabezados de seguridad están configurados
- HTTPS está habilitado
- El límite de velocidad está configurado

### 4. Validación de rendimiento

- El tamaño del bundle es aceptable
- Las imágenes están optimizadas
- La carga diferida está configurada
- El caché está configurado
- La CDN está configurada

### 5. Validación de accesibilidad

- Las etiquetas ARIA están presentes
- El contraste de color cumple WCAG AA
- La navegación con teclado funciona
- Es compatible con lectores de pantalla
- La gestión de enfoque funciona

### 6. Validación E2E

- Las pruebas E2E pasan en Chromium
- Las pruebas E2E pasan en Firefox
- Las pruebas E2E pasan en WebKit
- Las pruebas E2E pasan en móvil
- Los reportes de E2E se generan

### 7. Validación de base de datos

- Las reglas de Firebase están desplegadas
- Los índices están creados
- Los datos de prueba están limpios
- Las copias de seguridad están configuradas
