# ⚙️ CONFIGURACIÓN DE FIREBASE CON DATOS REALES - ORIGEN ConstructERP

Este documento te guía paso a paso para configurar Firebase con credenciales reales y poner el sistema en producción con datos reales (sin simulaciones).

## 📋 PASO 1: Crear Proyecto en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Clic en "Agregar proyecto"
3. Nombre: origen-erp-guatemala
4. Desactiva Google Analytics si no lo necesitas
5. Clic en Crear proyecto

## 📋 PASO 2: Habilitar Servicios de Firebase

En Firebase Console, ve a Build en el menú lateral y habilita:

### 2.1 Firebase Authentication
Ir a Authentication > Sign-in method
Habilitar Correo electrónico/contraseña
En Dominios autorizados, agregar:
- localhost (para desarrollo)
- Tu dominio de producción (ej: tu-app.vercel.app)

### 2.2 Cloud Firestore
Ir a Firestore Database > Crear base de datos
Seleccionar Modo de prueba (para desarrollo) o Modo bloqueado (para producción)
Seleccionar ubicación cercana a Guatemala (us-central1 o southamerica-east1)
IMPORTANTE: Después de crear, desplegar las reglas:
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes

### 2.3 Firebase Storage (opcional, para fotos de obra)
Ir a Storage > Comenzar
Configurar reglas de acceso

### 2.4 Cloud Messaging FCM (opcional, para notificaciones push)
Ir a Cloud Messaging
Generar par de claves VAPID para notificaciones web

## 📋 PASO 3: Obtener Credenciales de Firebase

En Firebase Console > Configuración del proyecto > General:

En la sección Tus aplicaciones, clic en </> (web) para registrar la aplicación:

```
apiKey: "AIzaSy..."
authDomain: "tu-proyecto.firebaseapp.com"
projectId: "tu-proyecto-id"
storageBucket: "tu-proyecto.appspot.com"
messagingSenderId: "123456789"
appId: "1:123456789:web:abcdef123456"
measurementId: "G-XXXXXXXXXX" (opcional)
```

## 📋 PASO 4: Configurar Variables de Entorno

Edita el archivo .env.local en la raíz del proyecto con los valores reales:

```bash
# Firebase - Reemplaza con tus valores reales de Firebase Console
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FIRESTORE_DATABASE_ID=(default)

# Gemini IA (opcional - para asistente técnico)
GEMINI_API_KEY=tu-api-key-de-gemini

# Seguridad
PRIMARY_ADMIN_EMAIL=tu-email@empresa.com
ALLOWED_ORIGINS=http://localhost:3000,https://tu-dominio.vercel.app

# Aplicación
NEXT_PUBLIC_APP_NAME=ORIGEN
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
NODE_ENV=production
PORT=3000
```

## 📋 PASO 5: Desplegar Reglas de Firestore

Las reglas de seguridad ya están definidas en firestore.rules. Despliegalas:

```bash
# Instalar Firebase CLI (si no lo tienes)
npm install -g firebase-tools

# Iniciar sesión en Firebase
firebase login

# Inicializar proyecto (ya está configurado en .firebaserc)
firebase init firestore

# Desplegar reglas e índices
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

## 📋 PASO 6: Verificar Configuración

Ejecuta el script de verificación:

```bash
node scripts/setup-firebase-check.js
```

O con variables de entorno cargadas:

```bash
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
export NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
# ... etc

node scripts/setup-firebase-check.js
```

## 📋 PASO 7: Ejecutar el Sistema

### Desarrollo:
```bash
npm run dev
```

### Producción:
```bash
npm run build
npm run start
```

## 🗄️ ESTRUCTURA DE COLECCIONES FIRESTORE

El sistema espera las siguientes colecciones en Firestore (ya definidas en firestore.rules):

| Colección | Descripción | Campos clave |
|-----------|-------------|--------------|
| companies | Empresas de construcción | id, ownerId, name, createdAt |
| companies/{id}/members | Miembros de empresa | uid, email, role, companyId |
| companies/{id}/invitations | Invitaciones pendientes | email, role, status, expiresAt |
| projects | Proyectos de obra | id, companyId, ownerId, code, name, budgetTotal, status |
| expenses | Gastos operativos | id, projectId, companyId, authorId, amount, category |
| attendance | Registros de asistencia | id, projectId, companyId, employeeId, status, date |
| fieldVisits | Visitas de obra/bitácoras | id, projectId, companyId, date, foremanName, status |
| employees | Fichas completas de personal | id, companyId, ownerId, name, role, dailyRateGTQ, igssAffiliated |
| employeeDirectory | Directorio mínimo de personal | id, companyId, name, role |
| quotes | Cotizaciones de clientes | id, companyId, projectId, clientName, totalGTQ, status |
| machinery | Maquinaria y equipos | id, companyId, name, status, hourlyRateGTQ, currentHorometer |
| machineryLogs | Registro de uso de maquinaria | id, companyId, machineryId, projectId, hoursWorked, costGTQ |
| apuItems | Partidas de presupuesto APU | id, companyId, projectId, code, description, totalPriceGTQ |
| companySettings | Configuración de empresa | id, companyId, ownerId, legalName, commercialName, exchangeRate |
| fcm_tokens | Tokens de notificaciones push | id, ownerId, token, active |
| project_alerts | Alertas de proyecto | id, ownerId, projectId, title, message, timestamp |

## 🔐 ROLES Y PERMISOS

| Rol | Puede hacer |
|-----|-------------|
| owner | Control total de la empresa, no se puede eliminar |
| admin | Administración completa, gestión de usuarios y configuración |
| project_manager | Gestión de proyectos, operaciones de campo, presupuestos |
| finance | Presupuestos, gastos, cotizaciones, datos de personal |
| field_worker | Operación de campo, asistencia, visitas, uso de maquinaria |
| viewer | Solo lectura de datos de la empresa |

## 🧪 PRUEBAS CON DATOS REALES (CRUD)

Una vez configurado Firebase con credenciales reales, el sistema soporta operaciones CRUD completas:

### Autenticación
- Registrar nueva cuenta (email + contraseña)
- Iniciar sesión
- Recuperar contraseña
- Verificar correo electrónico

### Proyectos (CRUD)
- Crear proyecto con datos reales
- Leer lista de proyectos de la empresa
- Actualizar proyecto (nombre, presupuesto, fechas, estado)
- Archivar proyecto (reversible)
- Restaurar proyecto archivado

### Gastos (CRUD)
- Registrar gasto con factura real
- Listar gastos por proyecto
- Actualizar gasto (monto, categoría, estado de aprobación)
- Eliminar gasto

### Personal (CRUD)
- Registrar empleado con datos IGSS
- Listar personal de la empresa
- Actualizar ficha de empleado
- Asistencia con geofence GPS

### Cotizaciones (CRUD)
- Crear cotización para cliente
- Cambiar estado (Borrador → Enviada → Aceptada/Rechazada)
- Generar PDF de cotización

### Maquinaria (CRUD)
- Registrar maquinaria con tarifa por hora
- Cambiar estado (Disponible → En Obra → Mantenimiento)
- Registrar horas de uso y horómetro

### Reportes
- Exportar gastos a CSV
- Imprimir acta de obra
- Dashboard con métricas financieras

## ✅ ESTADO DEL SISTEMA

| Componente | Estado |
|------------|--------|
| Firebase SDK | Instalado (v12.19.0) |
| Reglas Firestore | Definidas para todas las colecciones |
| Índices Firestore | 21 índices configurados |
| Validación Zod | Para todas las entidades |
| Manejo de errores | Con toast notifications |
| Cálculo automático | Progreso y gasto de proyectos |
| Service Worker | Para modo offline |
| FCM Push Notifications | Configurado |
| TypeScript | Compilación sin errores |
| Script de verificación | scripts/setup-firebase-check.js |

## 📞 PRÓXIMOS PASOS

1. Configurar Firebase Console con los pasos 1-3 de este documento
2. Completar .env.local con tus credenciales reales
3. Desplegar reglas de Firestore con Firebase CLI
4. Ejecutar npm run dev para probar con datos reales
5. Verificar con el script node scripts/setup-firebase-check.js

---

**Nota importante:** Nunca subas el archivo .env.local con credenciales reales a Git. Está excluido por .gitignore. Para producción (Vercel), configura las variables de entorno en Vercel Dashboard > Settings > Environment Variables.