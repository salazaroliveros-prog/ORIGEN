#!/bin/bash

# 🎯 PRODUCTION VALIDATION MASTER SCRIPT
# Ejecuta todos los validadores en secuencia

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║${NC}     🎯 PRODUCTION VALIDATION MASTER SCRIPT             ${MAGENTA}║${NC}"
echo -e "${MAGENTA}║${NC}     Validación completa del sistema en producción    ${MAGENTA}║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
PROD_URL="${1:-https://origen-one-kohl.vercel.app}"
REPO="${2:-origin-erp-team/origen-erp}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
VERCEL_TOKEN="${VERCEL_TOKEN:-}"

echo -e "${YELLOW}📋 Configuración:${NC}"
echo "   Production URL: $PROD_URL"
echo "   Repository: $REPO"
echo "   GitHub Token: $([ -z "$GITHUB_TOKEN" ] && echo "❌ No configurado" || echo "✅ Configurado")"
echo "   Vercel Token: $([ -z "$VERCEL_TOKEN" ] && echo "❌ No configurado" || echo "✅ Configurado")"
echo ""

# ===========================================================================
# VALIDATION RESULTS
# ===========================================================================
VALIDATORS_PASSED=0
VALIDATORS_FAILED=0
TOTAL_VALIDATORS=0

# ===========================================================================
# FUNCTION: Run Validator
# ===========================================================================
run_validator() {
    local SCRIPT_NAME=$1
    local DESCRIPTION=$2
    local SCRIPT_PATH="scripts/$SCRIPT_NAME"
    
    TOTAL_VALIDATORS=$((TOTAL_VALIDATORS + 1))
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}${TOTAL_VALIDATORS}️⃣  $DESCRIPTION${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    if [ -f "$SCRIPT_PATH" ]; then
        if bash "$SCRIPT_PATH" "$PROD_URL" 2>&1 | tee /tmp/validator_output.txt; then
            echo -e "${GREEN}✅ $DESCRIPTION: PASSED${NC}"
            VALIDATORS_PASSED=$((VALIDATORS_PASSED + 1))
        else
            echo -e "${RED}❌ $DESCRIPTION: FAILED${NC}"
            VALIDATORS_FAILED=$((VALIDATORS_FAILED + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  Script no encontrado: $SCRIPT_PATH${NC}"
    fi
    
    echo ""
    sleep 2
}

# ===========================================================================
# STEP 1: GitHub Actions Validator
# ===========================================================================
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}PHASE 1: GitHub Actions CI/CD Validation${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo ""

if command -v gh &> /dev/null; then
    run_validator "github-actions-validator.sh" "GitHub Actions Pipeline Validator"
else
    echo -e "${YELLOW}⚠️  GitHub CLI no instalado (skipping GitHub validation)${NC}"
    echo "   Instala: brew install gh (macOS) o apt install gh (Linux)"
    echo ""
fi

# ===========================================================================
# STEP 2: Vercel Deployment Validator
# ===========================================================================
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}PHASE 2: Vercel Deployment Validation${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo ""

run_validator "vercel-deployment-monitor.sh" "Vercel Deployment Monitor"

# ===========================================================================
# STEP 3: Production Health Checks
# ===========================================================================
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}PHASE 3: Production Health Checks${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo ""

run_validator "production-health-checks.sh" "Production Health Checks"

# ===========================================================================
# STEP 4: API Endpoint Tester
# ===========================================================================
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}PHASE 4: API Endpoint Testing${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo ""

run_validator "api-endpoint-tester.sh" "API Endpoint Tester"

# ===========================================================================
# FINAL SUMMARY
# ===========================================================================
echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║${NC}        🎯 VALIDATION SUMMARY                           ${MAGENTA}║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✅ PASSED: $VALIDATORS_PASSED${NC}"
echo -e "${RED}❌ FAILED: $VALIDATORS_FAILED${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total validators: $TOTAL_VALIDATORS"
echo ""

PERCENTAGE=$((VALIDATORS_PASSED * 100 / TOTAL_VALIDATORS))
echo "Success rate: ${PERCENTAGE}%"
echo ""

# ===========================================================================
# PRODUCTION STATUS
# ===========================================================================
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║${NC}        📊 PRODUCTION STATUS                            ${MAGENTA}║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}🌍 Production URL:${NC}"
echo "   $PROD_URL"
echo ""

echo -e "${BLUE}📊 System Status:${NC}"
if [ $VALIDATORS_FAILED -eq 0 ]; then
    echo -e "   ${GREEN}🟢 ALL SYSTEMS OPERATIONAL${NC}"
    echo "   Score: 100% (All validators passed)"
else
    echo -e "   ${YELLOW}🟡 PARTIAL OPERATION${NC}"
    echo "   Score: ${PERCENTAGE}% ($VALIDATORS_PASSED/$TOTAL_VALIDATORS passed)"
fi
echo ""

echo -e "${BLUE}🔗 Useful Links:${NC}"
echo "   • Production: $PROD_URL"
echo "   • GitHub Actions: https://github.com/$REPO/actions"
echo "   • Vercel Dashboard: https://vercel.com/dashboard"
echo "   • GA4 Analytics: https://analytics.google.com"
echo "   • Sentry Errors: https://sentry.io/projects/"
echo ""

echo -e "${BLUE}📋 Next Steps:${NC}"
if [ $VALIDATORS_FAILED -eq 0 ]; then
    echo "   1. ✅ All validations passed - System is production ready"
    echo "   2. 📊 Monitor analytics and metrics"
    echo "   3. 🔔 Watch for alerts in Slack"
    echo "   4. 📈 Track performance metrics"
else
    echo "   1. ❌ Review failed validators"
    echo "   2. 🔧 Address issues found"
    echo "   3. 🔄 Re-run validation"
    echo "   4. 📧 Report to team"
fi
echo ""

echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║${NC}        ✨ Validation Complete                          ${MAGENTA}║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $VALIDATORS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 PRODUCTION VALIDATION: SUCCESS 🎉${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  PRODUCTION VALIDATION: PARTIAL (review failures)${NC}"
    exit 1
fi
