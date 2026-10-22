# ORIGEN - Roles y permisos

## Roles
- admin
- manager
- supervisor
- worker

## Permisos por rol

### admin
- Crear, editar y eliminar proyectos
- Crear, editar y eliminar gastos
- Registrar asistencia
- Registrar visitas de obra
- Gestionar configuración general
- Acceder a todos los reportes
- Ver todos los datos de la empresa

### manager
- Crear y editar proyectos
- Crear y editar gastos
- Registrar asistencia
- Registrar visitas de obra
- Ver reportes generales
- No puede borrar config general ni cambiar settings globales

### supervisor
- Ver proyectos asignados
- Registrar visitas de obra
- Registrar asistencia de su área
- Ver reportes operativos
- No puede crear proyectos completos ni cambiar configuración

### worker
- Ver solo información relevante a su proyecto o turno
- Registrar asistencia propia
- No puede gestionar gastos ni proyectos
- No puede ver configuración general ni reportes completos

## Reglas de seguridad recomendadas
- Validar rol en el frontend para control UX
- Validar rol en Firestore security rules para control real
- Usar `ownerId` para aislar datos por empresa/usuario
- Cada colección debe tener permisos por rol real, no solo por UI

## Firestore security idea
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /companySettings/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /projects/{projectId} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager']
      );
    }

    match /expenses/{expenseId} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager']
      );
    }

    match /attendance/{attendanceId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager', 'supervisor']
      );
    }

    match /fieldVisits/{visitId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager', 'supervisor']
      );
    }
  }
}
```

## Recomendación final
- El frontend puede ocultar opciones por rol
- Firestore rules deben ser la última barrera real
- La empresa/usuario debe estar aislada con `ownerId`
