#!/bin/bash

# 🔍 GITHUB ACTIONS REAL-TIME VALIDATOR
# Monitorea y valida GitHub Actions en tiempo real

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}     🔍 GITHUB ACTIONS REAL-TIME VALIDATOR               ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     Monitorea CI/CD pipeline en tiempo real             ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
REPO_OWNER="${1:-origin-erp-team}"
REPO_NAME="${2:-origen-erp}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
WORKFLOW_NAME="CI/CD Pipeline"
CHECK_INTERVAL=10 # seconds
MAX_CHECKS=180 # 30 minutes

echo -e "${YELLOW}📋 Configuración:${NC}"
echo "   Repository: $REPO_OWNER/$REPO_NAME"
echo "   Workflow: $WORKFLOW_NAME"
echo "   Check interval: ${CHECK_INTERVAL}s"
echo ""

# ===========================================================================
# STEP 1: Get latest workflow run
# ===========================================================================
echo -e "${YELLOW}1️⃣  Obteniendo último workflow run...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Using GitHub CLI if available
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI detectado"
    
    # Get latest workflow run
    WORKFLOW_RUN=$(gh run list --repo "$REPO_OWNER/$REPO_NAME" --workflow "main.yml" --limit 1 --json status,name,number,conclusion,startedAt,updatedAt)
    
    if [ -z "$WORKFLOW_RUN" ]; then
        echo -e "${YELLOW}⚠️  No hay runs recientes${NC}"
        exit 0
    fi
    
    RUN_ID=$(echo "$WORKFLOW_RUN" | jq -r '.[0].number')
    RUN_STATUS=$(echo "$WORKFLOW_RUN" | jq -r '.[0].status')
    
    echo "   Run ID: $RUN_ID"
    echo "   Status: $RUN_STATUS"
else
    echo -e "${YELLOW}⚠️  GitHub CLI no instalado${NC}"
    echo "   Instalación: brew install gh (macOS) o apt install gh (Linux)"
    echo "   O configura GITHUB_TOKEN manualmente"
fi

echo ""

# ===========================================================================
# STEP 2: Monitor workflow execution
# ===========================================================================
echo -e "${YELLOW}2️⃣  Monitoreando ejecución del workflow...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PREV_STATUS=""
CHECK_COUNT=0

while [ $CHECK_COUNT -lt $MAX_CHECKS ]; do
    if command -v gh &> /dev/null; then
        # Get current status
        CURRENT_RUN=$(gh run list --repo "$REPO_OWNER/$REPO_NAME" --workflow "main.yml" --limit 1 --json status,conclusion,number --jq '.[0]')
        STATUS=$(echo "$CURRENT_RUN" | jq -r '.status')
        CONCLUSION=$(echo "$CURRENT_RUN" | jq -r '.conclusion')
        RUN_ID=$(echo "$CURRENT_RUN" | jq -r '.number')
        
        # Print status if changed
        if [ "$STATUS" != "$PREV_STATUS" ]; then
            case $STATUS in
                "completed")
                    if [ "$CONCLUSION" = "success" ]; then
                        echo -e "${GREEN}✅ COMPLETADO: SUCCESS${NC}"
                    else
                        echo -e "${RED}❌ COMPLETADO: $CONCLUSION${NC}"
                    fi
                    break
                    ;;
                "in_progress")
                    echo -e "${CYAN}⏳ EN PROGRESO...${NC}"
                    ;;
                "queued")
                    echo -e "${YELLOW}📋 EN COLA...${NC}"
                    ;;
                *)
                    echo -e "Status: $STATUS"
                    ;;
            esac
            PREV_STATUS="$STATUS"
        fi
        
        # Get jobs status
        JOBS=$(gh run view $RUN_ID --repo "$REPO_OWNER/$REPO_NAME" --json jobs --jq '.jobs[] | {name, status, conclusion}')
        
        if [ ! -z "$JOBS" ]; then
            echo ""
            echo -e "${CYAN}Jobs Status:${NC}"
            echo "$JOBS" | jq -r '.name + ": " + .status + " (" + (.conclusion // "pending") + ")"' | sed 's/^/  /'
        fi
    fi
    
    # Check if completed
    if [ "$STATUS" = "completed" ]; then
        break
    fi
    
    sleep $CHECK_INTERVAL
    CHECK_COUNT=$((CHECK_COUNT + 1))
    
    # Clear screen for next update (optional)
    # clear
done

echo ""

# ===========================================================================
# STEP 3: Get detailed job results
# ===========================================================================
if command -v gh &> /dev/null; then
    echo -e "${YELLOW}3️⃣  Resultados detallados de jobs:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ ! -z "$RUN_ID" ]; then
        # Get all jobs
        gh run view $RUN_ID --repo "$REPO_OWNER/$REPO_NAME" --json jobs --jq '.jobs[]' | while read -r job; do
            JOB_NAME=$(echo "$job" | jq -r '.name')
            JOB_STATUS=$(echo "$job" | jq -r '.status')
            JOB_CONCLUSION=$(echo "$job" | jq -r '.conclusion')
            JOB_DURATION=$(echo "$job" | jq -r '.durationMinutes')
            
            case $JOB_CONCLUSION in
                "success")
                    STATUS_ICON="✅"
                    ;;
                "failure")
                    STATUS_ICON="❌"
                    ;;
                "skipped")
                    STATUS_ICON="⏭️"
                    ;;
                *)
                    STATUS_ICON="⏳"
                    ;;
            esac
            
            echo -e "${STATUS_ICON} $JOB_NAME"
            echo "   Status: $JOB_STATUS | Conclusion: $JOB_CONCLUSION | Duration: ${JOB_DURATION}m"
        done
    fi
fi

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}        🔍 Monitoreo Completado                         ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Output results
if [ "$CONCLUSION" = "success" ]; then
    echo -e "${GREEN}✅ CI/CD Pipeline: SUCCESS${NC}"
    exit 0
else
    echo -e "${RED}❌ CI/CD Pipeline: FAILED${NC}"
    exit 1
fi
