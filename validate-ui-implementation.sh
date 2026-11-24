#!/bin/bash

# SCRIPT DE VALIDACIÓN - UI/UX PROFESSIONAL ENHANCEMENT
# Verifica que todas las implementaciones están en lugar

echo "🔍 VALIDANDO IMPLEMENTACIONES UI/UX PROFESIONAL..."
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Función para validar
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✅${NC} Encontrado: $1"
    ((PASSED++))
  else
    echo -e "${RED}❌${NC} No encontrado: $1"
    ((FAILED++))
  fi
}

check_content() {
  if grep -q "$2" "$1" 2>/dev/null; then
    echo -e "${GREEN}✅${NC} $3"
    ((PASSED++))
  else
    echo -e "${RED}❌${NC} $3"
    ((FAILED++))
  fi
}

# DOCUMENTACIÓN
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 DOCUMENTACIÓN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "UI_UX_PROFESSIONAL_AUDIT.md"
check_file "IMPLEMENTATION_GUIDE_UI_ENHANCEMENT.md"
check_file "DESIGN_SYSTEM_TOKENS.md"
check_file "EXECUTIVE_SUMMARY_UI_ENHANCEMENT.md"
check_file "QUICK_START_CHECKLIST.md"
check_file "INDEX_UI_ENHANCEMENT.md"
check_file "IMPLEMENTATION_STEPS_MANUAL.md"
echo ""

# COMPONENTES NUEVOS
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎨 COMPONENTES NUEVOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "components/DashboardEnhanced.tsx"
check_file "components/ProjectSelectorEnhanced.tsx"
check_file "components/TabsGrouped.tsx"
echo ""

# CONFIGURACIÓN
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️ CONFIGURACIÓN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar tailwind.config.js actualizado
check_content "tailwind.config.js" "primary.*#0ea5e9" "Paleta primaria actualizada a Sky"
check_content "tailwind.config.js" "accent" "Colores accent (warnings) actualizados"
check_content "tailwind.config.js" "success.*#10b981" "Estados semánticos (success) configurados"
check_content "tailwind.config.js" "danger.*#ef4444" "Estados semánticos (danger) configurados"
check_content "tailwind.config.js" "rejected" "Estados semánticos (rejected) configurados"
echo ""

# GLOBALS.CSS
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 DESIGN TOKENS (globals.css)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_content "app/globals.css" "--brand-primary.*#f59e0b" "Tokens de marca definidos"
check_content "app/globals.css" "glass-l1-bg" "Glass morphism tokens definidos"
check_content "app/globals.css" ".glass-panel" "Componentes glass definidos"
check_content "app/globals.css" ".skeleton" "Skeleton animations definidas"
check_content "app/globals.css" "safe-area-top" "Safe areas iOS/Android soportadas"
check_content "app/globals.css" ".responsive-grid" "Responsive grid definida"
echo ""

# BUILD
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 BUILD CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar que package.json tiene todos los scripts
check_content "package.json" "\"build\":" "Script build definido"
check_content "package.json" "\"dev\":" "Script dev definido"
check_content "package.json" "\"lint\":" "Script lint definido"
check_content "package.json" "next" "Next.js configurado"
check_content "package.json" "react" "React configurado"
echo ""

# RESUMEN
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "✅ Pasados: ${GREEN}$PASSED${NC}"
echo -e "❌ Fallidos: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 TODAS LAS VALIDACIONES PASARON!${NC}"
  echo ""
  echo "Próximos pasos:"
  echo "1. Leer IMPLEMENTATION_STEPS_MANUAL.md"
  echo "2. Integrar componentes en MainApp.tsx"
  echo "3. npm run build"
  echo "4. npm run dev"
  echo "5. Validar en http://localhost:3000"
  exit 0
else
  echo -e "${YELLOW}⚠️ Algunas validaciones fallaron${NC}"
  echo ""
  echo "Verifica:"
  echo "1. Todos los archivos están en el lugar correcto"
  echo "2. tailwind.config.js está actualizado"
  echo "3. app/globals.css tiene los tokens completos"
  echo ""
  exit 1
fi
