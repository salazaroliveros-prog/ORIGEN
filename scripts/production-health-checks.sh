#!/bin/bash

# ✅ PRODUCTION HEALTH CHECKS
# Valida todos los endpoints y funcionalidades en producción

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}     ✅ PRODUCTION HEALTH CHECKS                        ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     Valida sistema en producción                      ${BLUE}║${NC}"
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
# HEALTH CHECKS
# ===========================================================================
PASSED=0
FAILED=0
WARNINGS=0

# ===========================================================================
# CHECK 1: HTTPS Connection
# ===========================================================================
echo -e "${YELLOW}1️⃣  HTTPS Connection${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if curl -s -I --connect-timeout $TIMEOUT "$PROD_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ HTTPS connection successful${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ HTTPS connection failed${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# ===========================================================================
# CHECK 2: HTTP to HTTPS Redirect
# ===========================================================================
echo -e "${YELLOW}2️⃣  HTTP to HTTPS Redirect${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REDIRECT_CHECK=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "http://${PROD_URL#https://}")
if [ "$REDIRECT_CHECK" = "301" ] || [ "$REDIRECT_CHECK" = "302" ] || [ "$REDIRECT_CHECK" = "308" ]; then
    echo -e "${GREEN}✅ HTTP redirect working (HTTP $REDIRECT_CHECK)${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  HTTP status: $REDIRECT_CHECK (expected 301/302/308)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ===========================================================================
# CHECK 3: Security Headers
# ===========================================================================
echo -e "${YELLOW}3️⃣  Security Headers${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HEADERS=$(curl -s -I --connect-timeout $TIMEOUT "$PROD_URL" 2>/dev/null)

SECURITY_HEADERS=(
    "strict-transport-security:Strict-Transport-Security"
    "x-frame-options:X-Frame-Options"
    "x-content-type-options:X-Content-Type-Options"
    "content-security-policy:Content-Security-Policy"
    "x-xss-protection:X-XSS-Protection"
    "referrer-policy:Referrer-Policy"
    "expect-ct:Expect-CT"
)

HEADERS_FOUND=0
for header in "${SECURITY_HEADERS[@]}"; do
    HEADER_NAME="${header%%:*}"
    HEADER_LABEL="${header##*:}"
    
    if echo "$HEADERS" | grep -qi "^${HEADER_NAME}:"; then
        echo -e "${GREEN}✅ $HEADER_LABEL${NC}"
        HEADERS_FOUND=$((HEADERS_FOUND + 1))
    else
        echo -e "${YELLOW}⚠️  $HEADER_LABEL missing${NC}"
    fi
done

if [ $HEADERS_FOUND -ge 5 ]; then
    echo -e "${GREEN}✅ Security headers OK ($HEADERS_FOUND/7)${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  Some security headers missing${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ===========================================================================
# CHECK 4: Health Endpoint
# ===========================================================================
echo -e "${YELLOW}4️⃣  Health Endpoint${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HEALTH=$(curl -s --connect-timeout $TIMEOUT "$PROD_URL/api/health" 2>/dev/null)

if echo "$HEALTH" | grep -q '"status"'; then
    echo -e "${GREEN}✅ Health endpoint responding${NC}"
    echo "   Response: $HEALTH"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ Health endpoint failed${NC}"
    echo "   Response: $HEALTH"
    FAILED=$((FAILED + 1))
fi
echo ""

# ===========================================================================
# CHECK 5: Response Time
# ===========================================================================
echo -e "${YELLOW}5️⃣  Response Time${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout $TIMEOUT "$PROD_URL/api/health" 2>/dev/null)
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc)

echo "   Response time: ${RESPONSE_TIME}s (${RESPONSE_MS}ms)"

if (( $(echo "$RESPONSE_TIME < 2" | bc -l) )); then
    echo -e "${GREEN}✅ Response time excellent (< 2s)${NC}"
    PASSED=$((PASSED + 1))
elif (( $(echo "$RESPONSE_TIME < 3" | bc -l) )); then
    echo -e "${GREEN}✅ Response time good (< 3s)${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  Response time slow (> 3s)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ===========================================================================
# CHECK 6: Homepage
# ===========================================================================
echo -e "${YELLOW}6️⃣  Homepage${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HOMEPAGE=$(curl -s --connect-timeout $TIMEOUT "$PROD_URL" 2>/dev/null)
HOMEPAGE_SIZE=${#HOMEPAGE}

if [ $HOMEPAGE_SIZE -gt 1000 ]; then
    echo -e "${GREEN}✅ Homepage loaded successfully${NC}"
    echo "   Size: ${HOMEPAGE_SIZE} bytes"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  Homepage size small (${HOMEPAGE_SIZE} bytes)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ===========================================================================
# CHECK 7: Content Type
# ===========================================================================
echo -e "${YELLOW}7️⃣  Content Type${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CONTENT_TYPE=$(curl -s -I --connect-timeout $TIMEOUT "$PROD_URL" 2>/dev/null | grep -i "content-type" | head -1)

if echo "$CONTENT_TYPE" | grep -qi "text/html\|application/json"; then
    echo -e "${GREEN}✅ Content-Type header present${NC}"
    echo "   Header: $CONTENT_TYPE"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  Content-Type: $CONTENT_TYPE${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ===========================================================================
# CHECK 8: SSL Certificate
# ===========================================================================
echo -e "${YELLOW}8️⃣  SSL Certificate${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v openssl &> /dev/null; then
    DOMAIN="${PROD_URL#https://}"
    CERT_INFO=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | grep -A5 "subject=" | head -3)
    
    if [ ! -z "$CERT_INFO" ]; then
        echo -e "${GREEN}✅ SSL certificate valid${NC}"
        echo "   Domain: $DOMAIN"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}⚠️  Could not verify SSL certificate${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  OpenSSL not installed (skipping certificate check)${NC}"
fi
echo ""

# ===========================================================================
# CHECK 9: JSON Response Parsing
# ===========================================================================
echo -e "${YELLOW}9️⃣  JSON Response Parsing${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v jq &> /dev/null; then
    HEALTH_JSON=$(curl -s --connect-timeout $TIMEOUT "$PROD_URL/api/health" 2>/dev/null)
    
    if echo "$HEALTH_JSON" | jq . > /dev/null 2>&1; then
        echo -e "${GREEN}✅ JSON parsing successful${NC}"
        STATUS=$(echo "$HEALTH_JSON" | jq -r '.status' 2>/dev/null)
        echo "   Status field: $STATUS"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}⚠️  Invalid JSON response${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  jq not installed (skipping JSON check)${NC}"
fi
echo ""

# ===========================================================================
# SUMMARY
# ===========================================================================
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}        ✅ HEALTH CHECK SUMMARY                        ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL=$((PASSED + FAILED + WARNINGS))

echo -e "${GREEN}✅ PASSED: $PASSED${NC}"
echo -e "${YELLOW}⚠️  WARNINGS: $WARNINGS${NC}"
echo -e "${RED}❌ FAILED: $FAILED${NC}"
echo ""
echo "Total checks: $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL CHECKS PASSED!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  CHECKS PASSED WITH WARNINGS${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ SOME CHECKS FAILED${NC}"
    exit 1
fi
