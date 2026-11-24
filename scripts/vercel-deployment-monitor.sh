#!/bin/bash

# 🚀 VERCEL DEPLOYMENT MONITOR
# Monitorea el deployment en Vercel en tiempo real

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}     🚀 VERCEL DEPLOYMENT MONITOR                       ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     Monitorea deployment en tiempo real                ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
VERCEL_TOKEN="${VERCEL_TOKEN:-}"
PROJECT_NAME="${1:-origen-erp}"
PROD_DOMAIN="${2:-origen-erp.vercel.app}"

echo -e "${YELLOW}📋 Configuración:${NC}"
echo "   Project: $PROJECT_NAME"
echo "   Domain: $PROD_DOMAIN"
echo ""

# ===========================================================================
# STEP 1: Check Vercel CLI
# ===========================================================================
echo -e "${YELLOW}1️⃣  Verificando Vercel CLI...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI no instalado${NC}"
    echo "   Instalación: npm install -g vercel"
    echo "   O usa: https://vercel.com/dashboard"
    echo ""
else
    echo -e "${GREEN}✅ Vercel CLI detectado${NC}"
    
    # Check authentication
    if [ -z "$VERCEL_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  VERCEL_TOKEN no configurado${NC}"
        echo "   Configura: export VERCEL_TOKEN=..."
    else
        echo -e "${GREEN}✅ VERCEL_TOKEN configurado${NC}"
    fi
fi

echo ""

# ===========================================================================
# STEP 2: Get latest deployment info
# ===========================================================================
echo -e "${YELLOW}2️⃣  Obteniendo información de deployment...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v curl &> /dev/null; then
    # Fetch deployment status from Vercel API
    if [ ! -z "$VERCEL_TOKEN" ]; then
        # Get project deployments
        DEPLOYMENTS=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
            "https://api.vercel.com/v6/deployments?projectId=$PROJECT_NAME&limit=1" 2>/dev/null || echo "{}")
        
        if [ "$DEPLOYMENTS" != "{}" ]; then
            LATEST_DEPLOYMENT=$(echo "$DEPLOYMENTS" | jq '.deployments[0]' 2>/dev/null || echo "{}")
            
            if [ "$LATEST_DEPLOYMENT" != "{}" ]; then
                DEPLOY_ID=$(echo "$LATEST_DEPLOYMENT" | jq -r '.uid // "unknown"')
                DEPLOY_STATE=$(echo "$LATEST_DEPLOYMENT" | jq -r '.state // "unknown"')
                DEPLOY_CREATED=$(echo "$LATEST_DEPLOYMENT" | jq -r '.created // "unknown"')
                DEPLOY_URL=$(echo "$LATEST_DEPLOYMENT" | jq -r '.url // "unknown"')
                
                echo -e "${GREEN}✅ Deployment encontrado${NC}"
                echo "   ID: $DEPLOY_ID"
                echo "   State: $DEPLOY_STATE"
                echo "   URL: $DEPLOY_URL"
                echo "   Created: $DEPLOY_CREATED"
            fi
        fi
    fi
fi

echo ""

# ===========================================================================
# STEP 3: Monitor deployment status
# ===========================================================================
echo -e "${YELLOW}3️⃣  Monitoreando estado del deployment...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DEPLOY_STATE="unknown"
CHECK_COUNT=0
MAX_CHECKS=36 # 3 minutes (5 seconds per check)

while [ $CHECK_COUNT -lt $MAX_CHECKS ]; do
    if command -v curl &> /dev/null && [ ! -z "$VERCEL_TOKEN" ]; then
        # Get current deployment status
        CURRENT=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
            "https://api.vercel.com/v6/deployments/$DEPLOY_ID" 2>/dev/null || echo "{}")
        
        STATE=$(echo "$CURRENT" | jq -r '.state // "unknown"' 2>/dev/null)
        
        case $STATE in
            "READY")
                echo -e "${GREEN}✅ DEPLOYMENT READY${NC}"
                DEPLOY_STATE="ready"
                break
                ;;
            "BUILDING")
                echo -e "${YELLOW}🏗️  BUILDING...${NC}"
                DEPLOY_STATE="building"
                ;;
            "ERROR")
                echo -e "${RED}❌ BUILD ERROR${NC}"
                DEPLOY_STATE="error"
                break
                ;;
            "FAILED")
                echo -e "${RED}❌ DEPLOYMENT FAILED${NC}"
                DEPLOY_STATE="failed"
                break
                ;;
            *)
                echo -e "${CYAN}⏳ State: $STATE${NC}"
                DEPLOY_STATE="$STATE"
                ;;
        esac
    fi
    
    sleep 5
    CHECK_COUNT=$((CHECK_COUNT + 1))
done

echo ""

# ===========================================================================
# STEP 4: Test production URL
# ===========================================================================
echo -e "${YELLOW}4️⃣  Probando URL de producción...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PROD_URL="https://$PROD_DOMAIN"
echo "URL: $PROD_URL"

if command -v curl &> /dev/null; then
    # Test HTTPS
    echo -n "Testing HTTPS... "
    if curl -s -I "$PROD_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
    
    # Test health endpoint
    echo -n "Testing /api/health... "
    HEALTH=$(curl -s "$PROD_URL/api/health")
    if echo "$HEALTH" | grep -q "ok"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${YELLOW}⚠️  Response: $HEALTH${NC}"
    fi
    
    # Check response time
    echo -n "Response time... "
    RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$PROD_URL/api/health")
    echo -e "${GREEN}${RESPONSE_TIME}s${NC}"
fi

echo ""

# ===========================================================================
# STEP 5: Summary
# ===========================================================================
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}        🚀 Monitoreo Completado                         ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$DEPLOY_STATE" = "ready" ]; then
    echo -e "${GREEN}✅ DEPLOYMENT: SUCCESS${NC}"
    echo -e "${GREEN}✅ Production URL: $PROD_URL${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  DEPLOYMENT STATE: $DEPLOY_STATE${NC}"
    exit 1
fi
