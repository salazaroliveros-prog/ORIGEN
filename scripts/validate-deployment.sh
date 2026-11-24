#!/bin/bash

# ORIGEN ERP - Pre-Deployment Validation Script
# This script validates all configurations before deployment

set -e

echo "🔍 ORIGEN ERP - Pre-Deployment Validation"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check counter
PASSED=0
FAILED=0
WARNINGS=0

# Function to print status
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

# 1. Node Version Check
echo "1️⃣  Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" = "26" ]; then
    check_pass "Node.js version is 26.x"
else
    check_warn "Node.js version is $NODE_VERSION.x (Expected 26.x)"
fi

# 2. Package manager check
echo ""
echo "2️⃣  Checking dependencies..."
if [ -f "package-lock.json" ]; then
    check_pass "package-lock.json exists"
else
    check_fail "package-lock.json not found"
fi

# 3. Environment files check
echo ""
echo "3️⃣  Checking environment files..."
if [ -f ".env.vercel.production" ]; then
    check_pass ".env.vercel.production exists"
else
    check_fail ".env.vercel.production not found"
fi

if [ -f ".env.example" ]; then
    check_pass ".env.example exists"
else
    check_fail ".env.example not found"
fi

# 4. Configuration files check
echo ""
echo "4️⃣  Checking configuration files..."
if [ -f "vercel.json" ]; then
    check_pass "vercel.json exists"
    
    # Check vercel.json has required fields
    if grep -q '"framework": "nextjs"' vercel.json; then
        check_pass "vercel.json has Next.js framework configured"
    else
        check_warn "vercel.json missing Next.js framework configuration"
    fi
else
    check_fail "vercel.json not found"
fi

if [ -f "next.config.ts" ] || [ -f "next.config.js" ]; then
    check_pass "Next.js config exists"
else
    check_fail "Next.js config file not found"
fi

# 5. GitHub workflows check
echo ""
echo "5️⃣  Checking GitHub workflows..."
if [ -f ".github/workflows/main.yml" ]; then
    check_pass ".github/workflows/main.yml exists"
    
    # Check Node version in workflow
    if grep -q "26" .github/workflows/main.yml || grep -q "26.x" .github/workflows/main.yml; then
        check_pass "main.yml configured for Node 26.x"
    else
        check_warn "main.yml may not be configured for Node 26.x"
    fi
else
    check_fail ".github/workflows/main.yml not found"
fi

if [ -f ".github/workflows/ci.yml" ]; then
    check_pass ".github/workflows/ci.yml exists"
else
    check_fail ".github/workflows/ci.yml not found"
fi

# 6. Source code structure check
echo ""
echo "6️⃣  Checking source code structure..."
if [ -d "src" ] || [ -d "app" ]; then
    check_pass "Source code directory exists"
else
    check_warn "No src or app directory found"
fi

# 7. Build script check
echo ""
echo "7️⃣  Checking build scripts..."
if grep -q '"build"' package.json; then
    check_pass "Build script exists in package.json"
else
    check_fail "Build script not found in package.json"
fi

# 8. TypeScript check
echo ""
echo "8️⃣  Checking TypeScript..."
if [ -f "tsconfig.json" ]; then
    check_pass "tsconfig.json exists"
else
    check_warn "tsconfig.json not found"
fi

# 9. ESLint check
echo ""
echo "9️⃣  Checking ESLint..."
if [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ] || grep -q '"eslint"' package.json; then
    check_pass "ESLint configuration exists"
else
    check_warn "ESLint configuration not found"
fi

# 10. Prettier check
echo ""
echo "🔟 Checking Prettier..."
if [ -f ".prettierrc" ] || [ -f ".prettierrc.json" ]; then
    check_pass "Prettier configuration exists"
else
    check_warn "Prettier configuration not found"
fi

# 11. Git configuration check
echo ""
echo "1️⃣1️⃣  Checking Git configuration..."
if grep -q "^node_modules" .gitignore 2>/dev/null; then
    check_pass "node_modules in .gitignore"
else
    check_warn "node_modules may not be in .gitignore"
fi

if grep -q "^.env" .gitignore 2>/dev/null; then
    check_pass ".env files in .gitignore"
else
    check_warn ".env files may not be in .gitignore"
fi

# 12. Firebase configuration check
echo ""
echo "1️⃣2️⃣  Checking Firebase configuration..."
if grep -q "NEXT_PUBLIC_FIREBASE_PROJECT_ID" .env.example 2>/dev/null; then
    check_pass "Firebase configuration template exists"
else
    check_warn "Firebase configuration template not found"
fi

# 13. Docker files check (optional)
echo ""
echo "1️⃣3️⃣  Checking Docker files (optional)..."
if [ -f "Dockerfile" ]; then
    check_pass "Dockerfile exists"
else
    check_warn "Dockerfile not found (optional for Vercel)"
fi

if [ -f "docker-compose.yml" ]; then
    check_pass "docker-compose.yml exists"
else
    check_warn "docker-compose.yml not found (optional for Vercel)"
fi

# 14. Documentation check
echo ""
echo "1️⃣4️⃣  Checking documentation..."
if [ -f "README.md" ]; then
    check_pass "README.md exists"
else
    check_warn "README.md not found"
fi

if [ -f ".github/DEPLOYMENT_CHECKLIST.md" ]; then
    check_pass ".github/DEPLOYMENT_CHECKLIST.md exists"
else
    check_warn ".github/DEPLOYMENT_CHECKLIST.md not found"
fi

if [ -f ".github/VERCEL_TROUBLESHOOTING.md" ]; then
    check_pass ".github/VERCEL_TROUBLESHOOTING.md exists"
else
    check_warn ".github/VERCEL_TROUBLESHOOTING.md not found"
fi

# Summary
echo ""
echo "=========================================="
echo "📊 Validation Summary"
echo "=========================================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All critical checks passed!${NC}"
    echo ""
    echo "📝 Next steps:"
    echo "1. Run: npm ci"
    echo "2. Run: npm run lint:fix"
    echo "3. Run: npm run build"
    echo "4. Test locally: npm run start"
    echo "5. Push to main/develop"
    echo ""
    echo "🚀 Deployment will start automatically via GitHub Actions"
    exit 0
else
    echo -e "${RED}❌ Please fix the failed checks before deploying${NC}"
    exit 1
fi
