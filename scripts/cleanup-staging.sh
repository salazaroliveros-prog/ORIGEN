#!/bin/bash

# 🧹 SCRIPT DE LIMPIEZA PRE-COMMIT - ORIGEN ERP GUATEMALA
# Elimina archivos de documentación del staging y mantiene solo código producción

set -e

echo "🧹 LIMPIEZA DE ARCHIVOS INNECESARIOS"
echo "════════════════════════════════════════"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Mostrar estado actual
echo "1️⃣  Estado actual del staging:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git status --short || true

echo ""
echo "2️⃣  Identificando archivos a remover..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Archivos de documentación a remover
DOCS_TO_REMOVE=(
  "REPORTE_*.md"
  "AUDITORIA_*.md"
  "PLAN_*.md"
  "TEST_RESULTS_*.md"
  "TESTING_*.md"
  "TESTING_*.txt"
  "*_SIGN_OFF_*.md"
  "*_FINAL_*.md"
  "*_FINAL_*.txt"
  "GAP_ANALYSIS_*.md"
  "GAP_ANALYSIS_*.txt"
  "IMPLEMENTACION_MEJORAS_*.md"
  "DECISION_FINAL_*.txt"
  "VERIFICACION_FINAL_*.txt"
  "*_CONSOLIDADO_*.md"
  "*_EJECUTIVO_*.md"
  "MATRIZ_ACCIONES_*.md"
  "INDICE_MAESTRO_*.md"
  "QUICK_REFERENCE_*.md"
  "START_AQUI_*.md"
  "test-results.json"
  "PROYECTO_COMPLETADO_*.txt"
)

# Contar archivos a remover
REMOVE_COUNT=0
for pattern in "${DOCS_TO_REMOVE[@]}"; do
  COUNT=$(git diff --cached --name-only --diff-filter=A | grep -c "$pattern" || true)
  if [ "$COUNT" -gt 0 ]; then
    echo "  ❌ Patrón '$pattern': $COUNT archivo(s)"
    REMOVE_COUNT=$((REMOVE_COUNT + COUNT))
  fi
done

echo ""
echo "3️⃣  Removiendo archivos de documentación del staging..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for pattern in "${DOCS_TO_REMOVE[@]}"; do
  git reset HEAD $pattern 2>/dev/null || true
  rm -f $pattern
done

echo -e "${GREEN}✅ Removidos $REMOVE_COUNT archivo(s) de documentación${NC}"

echo ""
echo "4️⃣  Actualizando .gitignore..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Actualizar .gitignore si no tiene los patrones
if [ -f ".gitignore" ]; then
  if ! grep -q "REPORTE_\*.md" .gitignore; then
    cat >> .gitignore << 'EOF'

# Documentation Reports (archivos generados en sesiones anteriores)
REPORTE_*.md
AUDITORIA_*.md
*_FASE_*.md
TEST_RESULTS_*.md
*_SIGN_OFF_*.md
*_FINAL_*.md
*_FINAL_*.txt
GAP_ANALYSIS_*.md
GAP_ANALYSIS_*.txt
IMPLEMENTACION_*.md
DECISION_FINAL_*.txt
VERIFICACION_FINAL_*.txt
*_CONSOLIDADO_*.md
test-results.json
PROYECTO_COMPLETADO_*.txt
PLAN_DEPLOYMENT_*.md
PLAN_ESCALABILIDAD_*.md
PLAN_DISASTER_*.md
*_EJECUTIVO_*.md
MATRIZ_ACCIONES_*.md
INDICE_MAESTRO_*.md
QUICK_REFERENCE_*.md
START_AQUI_*.md
*.log
EOF
    echo -e "${GREEN}✅ .gitignore actualizado${NC}"
  else
    echo "✓ .gitignore ya contiene los patrones"
  fi
fi

echo ""
echo "5️⃣  Verificando archivos en staging después de limpieza..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git status --short || echo "No files in staging"

echo ""
echo "6️⃣  Archivos PRODUCCIÓN listos para commit:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | head -20)
if [ -z "$STAGED_FILES" ]; then
  echo "   ⚠️  No hay archivos en staging"
else
  echo "$STAGED_FILES" | sed 's/^/   ✅ /'
fi

FILE_COUNT=$(git diff --cached --name-only --diff-filter=ACM | wc -l)
echo ""
echo "   Total archivos staged: $FILE_COUNT"

echo ""
echo "════════════════════════════════════════"
echo -e "${GREEN}🎉 LIMPIEZA COMPLETADA${NC}"
echo "════════════════════════════════════════"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Revisar archivos: git status"
echo "   2. Hacer commit: git commit -m 'feat: Phase 4 - Security + Analytics'"
echo "   3. Push a GitHub: git push origin main"
echo ""
