# Guía de Configuración de Deployment Automático

## ❌ PROBLEMAS IDENTIFICADOS

### 1. Vercel Project Mapping
- **Problema:** El proyecto está registrado como `origen` → https://origen-proyectoswm.vercel.app
- **Esperado:** El proyecto debería estar en `origen-one-kohl` → https://origen-one-kohl.vercel.app
- **Solución:** Necesita actualizar el proyecto en Vercel o crear uno nuevo

### 2. GitHub Secrets No Configurados
- **Problema:** Los secrets de Vercel no están en GitHub Secrets
- **Requeridos para auto-deploy:**
  - `VERCEL_TOKEN` - Token de autenticación
  - `VERCEL_ORG_ID` - ID de la organización
  - `VERCEL_PROJECT_ID` - ID del proyecto

### 3. GitHub Actions Workflow
- ✅ `ci.yml` existe (lint, test, build)
- ❌ `deploy.yml` no estaba configurado (YA CREADO)

---

## ✅ PASOS PARA CORREGIR

### Paso 1: Obtener Vercel Token
```bash
vercel tokens create
# Copiar el token generado
```

### Paso 2: Agregar Secrets en GitHub
Ir a: https://github.com/salazaroliveros-prog/ORIGEN/settings/secrets/actions

Agregar estos secrets:
```
VERCEL_TOKEN = [token generado en paso 1]
VERCEL_ORG_ID = proyectoswm
VERCEL_PROJECT_ID = prj_QqnxSbQ9ljkBJRbWQD9ck6amlwL1
```

### Paso 3: Verificar Firebase Secrets
Deben existir en GitHub:
```
✓ NEXT_PUBLIC_FIREBASE_API_KEY
✓ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
✓ NEXT_PUBLIC_FIREBASE_PROJECT_ID
✓ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
✓ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
✓ NEXT_PUBLIC_FIREBASE_APP_ID
```

### Paso 4: Hacer Push con Deploy Workflow
```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add automatic Vercel deployment workflow"
git push origin main
```

---

## 🔍 INFORMACIÓN ACTUAL

### Vercel
- **Team:** proyectoswm
- **Project:** origen (prj_QqnxSbQ9ljkBJRbWQD9ck6amlwL1)
- **URL:** https://origen-proyectoswm.vercel.app
- **Node Version:** 24.x
- **Última actualización:** 2h atrás

### GitHub
- **Repo:** https://github.com/salazaroliveros-prog/ORIGEN
- **Branch:** main
- **Commits:** 65befc9 (latest)
- **Status:** ✅ CI passing (lint, tests, build)

---

## 📋 Checklist de Configuración

- [ ] Generar Vercel Token con `vercel tokens create`
- [ ] Agregar `VERCEL_TOKEN` a GitHub Secrets
- [ ] Agregar `VERCEL_ORG_ID` = `proyectoswm` a GitHub Secrets
- [ ] Agregar `VERCEL_PROJECT_ID` = `prj_QqnxSbQ9ljkBJRbWQD9ck6amlwL1` a GitHub Secrets
- [ ] Verificar que todos los secrets de Firebase existan
- [ ] Hacer push de deploy.yml
- [ ] Verificar que GitHub Actions ejecuta automáticamente
- [ ] Confirmar que Vercel recibe el deploy
- [ ] Verificar que la URL se actualiza

---

## 🚀 Flujo de Auto-Deployment (Después de configurar)

```
1. git push origin main
   ↓
2. GitHub Actions CI (ci.yml)
   - npm install
   - npm run lint ✅
   - npm test (324/324) ✅
   - npm run build ✅
   ↓
3. GitHub Actions Deploy (deploy.yml) - DESPUÉS DE CI PASS
   - Obtiene VERCEL_TOKEN de secrets
   - Ejecuta: vercel --prod
   - Deploya a Vercel
   ↓
4. Vercel Build
   - Compila Next.js
   - Ejecuta build command
   - Deploya a producción
   ↓
5. URL Lista
   - https://origen-proyectoswm.vercel.app actualizada
   - Status: ✅ Live
```

---

## ⚠️ Notas Importantes

1. **No elimines** `.vercel/project.json` - contiene la configuración local
2. **Mantén** `vercel.json` para configuración de build
3. **Los secrets** deben tener exactamente estos nombres
4. **No expongas** el VERCEL_TOKEN en público
5. **Las variables** `NEXT_PUBLIC_*` deben tener el prefijo

---

**Última actualización:** 2024-12-20  
**Estado:** En configuración
**Próximo paso:** Ejecutar los pasos del checklist
