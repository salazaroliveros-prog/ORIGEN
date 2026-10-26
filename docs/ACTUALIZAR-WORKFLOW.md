# Instrucciones para Actualizar el Workflow de CI

## ⚠️ GitHub está rechazando el push automático

GitHub no permite que una OAuth App modifique workflows sin el permiso `workflow`. Tienes dos opciones:

## Opción 1: Modificar el workflow manualmente (Recomendado)

### Paso 1: Ir al archivo del workflow
1. Navega a: https://github.com/salazaroliveros-prog/ORIGEN/blob/main/.github/workflows/ci.yml
2. Haz clic en el lápiz (✏️) para editar

### Paso 2: Agregar permisos
En la sección `permissions`, cámbiala a:
```yaml
permissions:
  contents: read
  actions: read
```

### Paso 3: Agregar variables de entorno al build
En el step "Build", reemplaza:
```yaml
- name: Build
  run: npm run build
```

Con:
```yaml
- name: Build
  env:
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
    NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
    NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID }}
    NEXT_PUBLIC_FIRESTORE_DATABASE_ID: ${{ secrets.NEXT_PUBLIC_FIRESTORE_DATABASE_ID }}
  run: npm run build
```

### Paso 4: Commit
1. Haz clic en "Commit changes"
2. Selecciona "Commit directly to the main branch"
3. Haz clic en "Commit changes"

## Opción 2: Agregar permiso workflow al token de GitHub

Si prefieres que pueda hacer push automático en el futuro:

1. Ve a: https://github.com/settings/tokens
2. Regenera tu token de GitHub
3. Agrega el scope `workflow`
4. Actualiza el token en tu git config
5. Intenta el push nuevamente

## ✅ Después de actualizar el workflow

Una vez actualizado:
1. El CI se ejecutará automáticamente
2. Verificará que el build pase
3. Vercel desplegará automáticamente si el build pasa

## 📋 Archivo completo actualizado

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

permissions:
  contents: read
  actions: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v7

      - name: Set up Node.js
        uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci --no-audit --no-fund

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build
        env:
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID }}
          NEXT_PUBLIC_FIRESTORE_DATABASE_ID: ${{ secrets.NEXT_PUBLIC_FIRESTORE_DATABASE_ID }}
        run: npm run build
```
