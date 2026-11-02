# 🔍 DIAGNÓSTICO DE VERCEL & GITHUB DEPLOYMENT

## ❌ PROBLEMAS IDENTIFICADOS

### 1. GitHub Workflow Authorization Error
```
Error: refusing to allow an OAuth App to create or update workflow 
       `.github/workflows/deploy.yml` without `workflow` scope
```

**Causa:** El token de GitHub (OAuth) no tiene scope `workflow`  
**Solución:** Necesita re-autenticarse con token personal o SSH

### 2. Vercel Project Mapping
- **Proyecto actual:** `origen` (Vercel Team: proyectoswm)
- **URL actual:** https://origen-proyectoswm.vercel.app
- **URL esperada:** https://origen-one-kohl.vercel.app
- **Estado:** Hay discrepancia en el nombre del proyecto

### 3. Auto-Deployment No Está Configurado
- ✅ `ci.yml` existe (lint, test, build)
- ❌ `deploy.yml` no puede pushearse (error de scope)
- ❌ GitHub Secrets de Vercel no existen

---

## ✅ INFORMACIÓN VERIFICADA

### Vercel CLI
```
Status: ✅ Instalado (v65.2.0)
Autenticación: ✅ Correcta (usuario: salazaroliveros-prog)
Team: ✅ proyectoswm (hobby plan)
Project: ✅ origen (prj_QqnxSbQ9ljkBJRbWQD9ck6amlwL1)
Node: 24.x
```

### GitHub Repository
```
Remote: https://github.com/salazaroliveros-prog/ORIGEN
Branch: main
Commits: ✅ Sincronizados (65befc9 latest)
CI Workflow: ✅ Configurado (ci.yml)
```

### Local Estado
```
Procesos Node: ✅ Terminados (33 procesos)
Cache: ✅ Limpios (npm cache clean)
Directorio: ✅ Sincronizado
```

---

## 🔧 SOLUCIONES

### Opción A: Usar GitHub Personal Access Token (RECOMENDADO)

#### Paso 1: Crear Personal Access Token en GitHub
```
1. Ir a: https://github.com/settings/tokens/new
2. Nombre: ORIGEN-DEPLOY
3. Scopes requeridos:
   ✓ repo (full control)
   ✓ workflow (manage workflows)
   ✓ admin:repo_hook (write access to hooks)
4. Copiar el token
```

#### Paso 2: Configurar Git con el token
```bash
git remote set-url origin https://<token>@github.com/salazaroliveros-prog/ORIGEN.git
# Ejemplo:
# git remote set-url origin https://ghp_xxxxxxxxxxxx@github.com/salazaroliveros-prog/ORIGEN.git
```

#### Paso 3: Re-intentar Push
```bash
git push origin main
```

---

### Opción B: Usar SSH (ALTERNATIVA)

#### Paso 1: Generar SSH key (si no existe)
```bash
ssh-keygen -t ed25519 -C "tu@email.com"
# O si usas Windows:
# ssh-keygen -t rsa -b 4096 -C "tu@email.com"
```

#### Paso 2: Agregar SSH key a GitHub
```
1. Copiar contenido de ~/.ssh/id_ed25519.pub
2. Ir a: https://github.com/settings/keys
3. New SSH key
4. Pegar la clave pública
```

#### Paso 3: Cambiar remote a SSH
```bash
git remote set-url origin git@github.com:salazaroliveros-prog/ORIGEN.git
```

#### Paso 4: Re-intentar Push
```bash
git push origin main
```

---

### Opción C: Crear Vercel Token & Agregar Secrets Manualmente

Si no puedes modificar workflows directamente, puedes hacer todo manual:

#### Paso 1: Crear Vercel Token
```bash
vercel tokens create
# Nombre: ORIGEN-GITHUB-DEPLOY
# Copiar el token generado
```

#### Paso 2: Agregar Secrets en GitHub UI
```
1. Ir a: https://github.com/salazaroliveros-prog/ORIGEN/settings/secrets/actions
2. New repository secret
3. Nombre: VERCEL_TOKEN
   Valor: [token copiado]
4. Nombre: VERCEL_ORG_ID
   Valor: proyectoswm
5. Nombre: VERCEL_PROJECT_ID
   Valor: prj_QqnxSbQ9ljkBJRbWQD9ck6amlwL1
```

#### Paso 3: Agregar Firebase Secrets
```
Copiar desde vercel.json:
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

---

## 📊 Comparativa de Soluciones

| Opción | Ventajas | Desventajas | Tiempo |
|--------|----------|------------|--------|
| A: PAT | Fácil, específico, revocable | Token expira | 5 min |
| B: SSH | Seguro, permanente | Más pasos | 10 min |
| C: Manual | No requiere CLI | Lento, error-prone | 15 min |

---

## ✅ CHECKLIST DE CONFIGURACIÓN

```
OPCIÓN A: Personal Access Token
- [ ] Crear token en GitHub Settings
- [ ] Copiar el token (ghp_xxxx...)
- [ ] git remote set-url origin https://<token>@github.com/...
- [ ] git push origin main
- [ ] Verificar que deploy.yml se creó

OPCIÓN B: SSH
- [ ] ssh-keygen -t ed25519 (o rsa -b 4096)
- [ ] cat ~/.ssh/id_ed25519.pub (copiar)
- [ ] Agregar en GitHub Settings → SSH Keys
- [ ] git remote set-url origin git@github.com:...
- [ ] git push origin main
- [ ] Verificar que deploy.yml se creó

OPCIÓN C: Manual
- [ ] vercel tokens create
- [ ] GitHub Settings → Secrets → Add VERCEL_TOKEN
- [ ] Agregar VERCEL_ORG_ID = proyectoswm
- [ ] Agregar VERCEL_PROJECT_ID
- [ ] Agregar Firebase secrets (6 variables)
- [ ] ReintentarPush manual si es necesario
```

---

## 🚀 Después de Resolver

Una vez que el `deploy.yml` esté en GitHub:

```
1. GitHub Actions ejecutará automáticamente:
   - Lint: ✅
   - Tests: 324/324 ✅
   - Build: ✅
   - Deploy to Vercel: ✅

2. Vercel recibirá el deploy y actualizará:
   https://origen-proyectoswm.vercel.app

3. La aplicación estará en vivo con cada push a main
```

---

## 📞 Referencia

### Vercel Info
- **Team:** proyectoswm
- **Project ID:** prj_QqnxSbQ9ljkBJRbWQD9ck6amlwL1
- **Node Version:** 24.x
- **Última build:** 2h atrás

### GitHub Info
- **Repository:** salazaroliveros-prog/ORIGEN
- **Branch:** main
- **Remote:** https://github.com/salazaroliveros-prog/ORIGEN.git
- **Commits:** 65 (latest: 65befc9)

---

**Generado:** 2024-12-20  
**Estado:** ⏳ En espera de solución de GitHub auth  
**Recomendación:** Usa Opción A (Personal Access Token) - más rápida
