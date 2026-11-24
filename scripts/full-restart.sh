#!/bin/bash

# 🚀 REINICIO COMPLETO Y STARTUP DEL SERVIDOR LOCAL
# Limpia todo: puertos, cache, procesos, reinstala dependencias

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}     🚀 REINICIO COMPLETO - ORIGEN ERP GUATEMALA         ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     Limpieza total + Startup local en localhost        ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ===========================================================================
# STEP 1: Kill all Node processes
# ===========================================================================
echo -e "${YELLOW}1️⃣  Eliminando procesos Node existentes...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Kill processes on port 3000, 3001, 8080, 8081
for PORT in 3000 3001 8080 8081 5000; do
    if lsof -i :$PORT > /dev/null 2>&1; then
        echo "Liberando puerto $PORT..."
        lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    fi
done

sleep 2
echo -e "${GREEN}✅ Procesos eliminados${NC}"
echo ""

# ===========================================================================
# STEP 2: Clear npm cache
# ===========================================================================
echo -e "${YELLOW}2️⃣  Limpiando cache de npm...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npm cache clean --force 2>/dev/null || true
echo -e "${GREEN}✅ Cache npm limpiado${NC}"
echo ""

# ===========================================================================
# STEP 3: Remove node_modules and reinstall
# ===========================================================================
echo -e "${YELLOW}3️⃣  Limpiando node_modules...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "node_modules" ]; then
    echo "Removiendo node_modules (este puede tomar un momento)..."
    rm -rf node_modules
    echo -e "${GREEN}✅ node_modules removido${NC}"
fi

echo ""
echo -e "${YELLOW}Reinstalando dependencias...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npm install --legacy-peer-deps 2>&1 | tail -20
echo -e "${GREEN}✅ Dependencias reinstaladas${NC}"
echo ""

# ===========================================================================
# STEP 4: Clear build cache and .next
# ===========================================================================
echo -e "${YELLOW}4️⃣  Limpiando .next y cache de build...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

rm -rf .next dist build __pycache__ 2>/dev/null || true
echo -e "${GREEN}✅ Build cache limpiado${NC}"
echo ""

# ===========================================================================
# STEP 5: Clear OS cache
# ===========================================================================
echo -e "${YELLOW}5️⃣  Limpiando cache del sistema...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sync && sudo purge 2>/dev/null || true
elif [[ "$OSTYPE" == "linux"* ]]; then
    # Linux
    sync && sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches' 2>/dev/null || true
fi

echo -e "${GREEN}✅ Cache del sistema limpiado${NC}"
echo ""

# ===========================================================================
# STEP 6: Verify project structure
# ===========================================================================
echo -e "${YELLOW}6️⃣  Verificando estructura del proyecto...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REQUIRED_DIRS=("app" "components" "lib" "public" "scripts")
for DIR in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$DIR" ]; then
        echo -e "${GREEN}✅ $DIR${NC}"
    else
        echo -e "${RED}❌ $DIR MISSING${NC}"
    fi
done

echo ""

# ===========================================================================
# STEP 7: Check environment
# ===========================================================================
echo -e "${YELLOW}7️⃣  Verificando ambiente...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Next.js: $(npm list next | head -2 | tail -1)"

echo ""

# ===========================================================================
# STEP 8: Start development server
# ===========================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}        🚀 INICIANDO SERVIDOR LOCAL                     ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✅ Iniciando Next.js en modo desarrollo...${NC}"
echo ""
echo -e "${CYAN}URL Local: http://localhost:3000${NC}"
echo -e "${CYAN}Presiona Ctrl+C para detener${NC}"
echo ""

# Start the development server
npm run dev

