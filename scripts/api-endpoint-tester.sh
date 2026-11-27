#!/bin/bash

# 🧪 API ENDPOINT TESTER
# Prueba todos los endpoints de la API en producción

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}     🧪 API ENDPOINT TESTER                             ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     Prueba endpoints en producción                    ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
PROD_URL="${1:-https://origen-one-kohl.vercel.app}"
TIMEOUT=10

echo -e "${YELLOW}📋 Configuración:${NC}"
echo "   URL: $PROD_URL"
echo "   Timeout: ${TIMEOUT}s"
echo ""

# ===========================================================================
# TEST RESULTS
# ===========================================================================
PASSED=0
FAILED=0
TOTAL=0

# ===========================================================================
# FUNCTION: Test Endpoint
# ===========================================================================
test_endpoint() {
    local METHOD=$1
    local ENDPOINT=$2
    local DESCRIPTION=$3
    local EXPECTED_STATUS=${4:-200}
    
    TOTAL=$((TOTAL + 1))
    
    echo -n "[$TOTAL] $DESCRIPTION... "
    
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$METHOD" --connect-timeout $TIMEOUT \
        "$PROD_URL$ENDPOINT" 2>/dev/null)
    
    if [ "$STATUS" = "$EXPECTED_STATUS" ]; then
        echo -e "${GREEN}✅ OK ($STATUS)${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAILED (Expected: $EXPECTED_STATUS, Got: $STATUS)${NC}"
        FAILED=$((FAILED + 1))
    fi
}

# ===========================================================================
# HEALTH & SYSTEM ENDPOINTS
# ===========================================================================
echo -e "${YELLOW}1️⃣  Health & System Endpoints${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "GET" "/api/health" "Health endpoint"
test_endpoint "GET" "/api" "API root" 404
test_endpoint "GET" "/" "Homepage" 200

echo ""

# ===========================================================================
# ACCOUNT ENDPOINTS (ARCO)
# ===========================================================================
echo -e "${YELLOW}2️⃣  Account Endpoints (ARCO)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "GET" "/api/account/my-data" "Export my data" 401
test_endpoint "DELETE" "/api/account/delete-account" "Delete account" 401

echo ""

# ===========================================================================
# ALERT ENDPOINTS
# ===========================================================================
echo -e "${YELLOW}3️⃣  Alert Endpoints${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "POST" "/api/alerts/slack" "Slack alert" 400

echo ""

# ===========================================================================
# STATIC ROUTES
# ===========================================================================
echo -e "${YELLOW}4️⃣  Static Routes${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "GET" "/api/security/health" "Security health" 404
test_endpoint "GET" "/robots.txt" "Robots.txt" 200
test_endpoint "GET" "/sitemap.xml" "Sitemap.xml" 200

echo ""

# ===========================================================================
# MIDDLEWARE TESTS
# ===========================================================================
echo -e "${YELLOW}5️⃣  Middleware Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test HTTP to HTTPS redirect
echo -n "[6] HTTP to HTTPS redirect... "
DOMAIN="${PROD_URL#https://}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT \
    "http://$DOMAIN" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "308" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo -e "${GREEN}✅ OK ($HTTP_STATUS)${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  Status: $HTTP_STATUS${NC}"
fi
TOTAL=$((TOTAL + 1))

echo ""

# ===========================================================================
# HEADER VALIDATION
# ===========================================================================
echo -e "${YELLOW}6️⃣  Header Validation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HEADERS=$(curl -s -I --connect-timeout $TIMEOUT "$PROD_URL" 2>/dev/null)

HEADER_TESTS=(
    "strict-transport-security"
    "x-frame-options"
    "content-security-policy"
    "x-content-type-options"
)

for HEADER in "${HEADER_TESTS[@]}"; do
    TOTAL=$((TOTAL + 1))
    echo -n "[$TOTAL] Header: $HEADER... "
    
    if echo "$HEADERS" | grep -qi "^$HEADER:"; then
        echo -e "${GREEN}✅ OK${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ Missing${NC}"
        FAILED=$((FAILED + 1))
    fi
done

echo ""

# ===========================================================================
# CONTENT TESTS
# ===========================================================================
echo -e "${YELLOW}7️⃣  Content Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for GA4 script
TOTAL=$((TOTAL + 1))
echo -n "[$TOTAL] Google Analytics initialized... "
HOMEPAGE=$(curl -s --connect-timeout $TIMEOUT "$PROD_URL" 2>/dev/null)

if echo "$HOMEPAGE" | grep -q "googletagmanager\|gtag"; then
    echo -e "${GREEN}✅ OK${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  Not found${NC}"
fi

# Check for security headers in content
TOTAL=$((TOTAL + 1))
echo -n "[$TOTAL] Meta tags present... "

if echo "$HOMEPAGE" | grep -q "<meta.*name=\|<meta.*property="; then
    echo -e "${GREEN}✅ OK${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ Missing${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""

# ===========================================================================
# PERFORMANCE TESTS
# ===========================================================================
echo -e "${YELLOW}8️⃣  Performance Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOTAL=$((TOTAL + 1))
echo -n "[$TOTAL] Response time < 2s... "
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout $TIMEOUT \
    "$PROD_URL/api/health" 2>/dev/null)

if (( $(echo "$RESPONSE_TIME < 2" | bc -l 2>/dev/null || echo 0) )); then
    echo -e "${GREEN}✅ OK (${RESPONSE_TIME}s)${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  Slow (${RESPONSE_TIME}s)${NC}"
fi

TOTAL=$((TOTAL + 1))
echo -n "[$TOTAL] Content size reasonable... "
HOMEPAGE=$(curl -s --connect-timeout $TIMEOUT "$PROD_URL" 2>/dev/null)
CONTENT_SIZE=${#HOMEPAGE}

if [ $CONTENT_SIZE -gt 5000 ] && [ $CONTENT_SIZE -lt 1000000 ]; then
    echo -e "${GREEN}✅ OK (${CONTENT_SIZE} bytes)${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  Unexpected size (${CONTENT_SIZE} bytes)${NC}"
fi

echo ""

# ===========================================================================
# SUMMARY
# ===========================================================================
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}        🧪 TEST SUMMARY                                 ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✅ PASSED: $PASSED${NC}"
echo -e "${RED}❌ FAILED: $FAILED${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total tests: $TOTAL"
echo ""

PERCENTAGE=$((PASSED * 100 / TOTAL))
echo "Success rate: ${PERCENTAGE}%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  SOME TESTS FAILED${NC}"
    exit 1
fi
