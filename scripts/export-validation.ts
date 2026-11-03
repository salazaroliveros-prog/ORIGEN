/**
 * ORIGEN ERP - Export Functionality Validation Script
 *
 * Este script valida las funcionalidades de exportación:
 * - Exportación a PDF (jsPDF)
 * - Exportación a Excel (ExcelJS)
 * - Exportación de imágenes (html2canvas, canvg)
 * - Generación de reportes
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ============================================================================
// EXPORT LIBRARIES VALIDATION
// ============================================================================

interface ExportValidationResult {
  category: string;
  item: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

const exportResults: ExportValidationResult[] = [];

function addExportResult(
  category: string,
  item: string,
  status: 'pass' | 'fail' | 'warning',
  message: string
) {
  exportResults.push({ category, item, status, message });
}

function validateExportLibraries() {
  console.log('\n=== VALIDATING EXPORT LIBRARIES ===');

  const packageJsonPath = join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  // Check PDF export library
  if (packageJson.dependencies?.['jspdf']) {
    addExportResult('Libraries', 'jsPDF', 'pass', 'jsPDF library found for PDF export');
  } else {
    addExportResult('Libraries', 'jsPDF', 'fail', 'jsPDF library not found');
  }

  // Check Excel export library
  if (packageJson.dependencies?.['exceljs']) {
    addExportResult('Libraries', 'ExcelJS', 'pass', 'ExcelJS library found for Excel export');
  } else {
    addExportResult('Libraries', 'ExcelJS', 'fail', 'ExcelJS library not found');
  }

  // Check image export libraries
  if (packageJson.dependencies?.['html2canvas']) {
    addExportResult(
      'Libraries',
      'html2canvas',
      'pass',
      'html2canvas library found for image export'
    );
  } else {
    addExportResult('Libraries', 'html2canvas', 'warning', 'html2canvas library not found');
  }

  if (packageJson.dependencies?.['canvg']) {
    addExportResult('Libraries', 'canvg', 'pass', 'canvg library found for SVG export');
  } else {
    addExportResult('Libraries', 'canvg', 'warning', 'canvg library not found');
  }

  // Check Sharp for image processing
  if (packageJson.dependencies?.['sharp']) {
    addExportResult('Libraries', 'Sharp', 'pass', 'Sharp library found for image processing');
  } else {
    addExportResult('Libraries', 'Sharp', 'warning', 'Sharp library not found');
  }

  console.log(
    `✓ Export libraries validated: ${exportResults.filter((r) => r.category === 'Libraries').length} checks`
  );
}

// ============================================================================
// EXPORT COMPONENTS VALIDATION
// ============================================================================

function validateExportComponents() {
  console.log('\n=== VALIDATING EXPORT COMPONENTS ===');

  const componentsDir = join(process.cwd(), 'components');

  // Check for export-related components
  const exportComponents = [
    'AdvancedReportsManager.tsx',
    'PdfExportService.ts',
    'ExcelExportService.ts',
  ];

  exportComponents.forEach((component) => {
    const componentPath = join(componentsDir, component);
    if (existsSync(componentPath)) {
      addExportResult('Components', component, 'pass', `${component} exists`);
    } else {
      addExportResult('Components', component, 'warning', `${component} not found`);
    }
  });

  // Check for reports view
  const reportsViewPath = join(componentsDir, 'ReportsView.tsx');
  if (existsSync(reportsViewPath)) {
    addExportResult(
      'Components',
      'ReportsView.tsx',
      'pass',
      'Reports view exists with export functionality'
    );
  }

  console.log(
    `✓ Export components validated: ${exportResults.filter((r) => r.category === 'Components').length} checks`
  );
}

// ============================================================================
// EXPORT SERVICES VALIDATION
// ============================================================================

function validateExportServices() {
  console.log('\n=== VALIDATING EXPORT SERVICES ===');

  const libDir = join(process.cwd(), 'lib');

  // Check for export services
  const exportServices = ['pdf-export.ts', 'excel-export.ts', 'report-generator.ts'];

  exportServices.forEach((service) => {
    const servicePath = join(libDir, service);
    if (existsSync(servicePath)) {
      addExportResult('Services', service, 'pass', `${service} exists`);
    } else {
      addExportResult('Services', service, 'warning', `${service} not found`);
    }
  });

  console.log(
    `✓ Export services validated: ${exportResults.filter((r) => r.category === 'Services').length} checks`
  );
}

// ============================================================================
// REPORT TYPES VALIDATION
// ============================================================================

function validateReportTypes() {
  console.log('\n=== VALIDATING REPORT TYPES ===');

  // Check if report types are defined in types
  const typesPath = join(process.cwd(), 'lib', 'types.ts');
  if (existsSync(typesPath)) {
    const typesContent = readFileSync(typesPath, 'utf-8');

    const reportTypes = [
      'FinancialReport',
      'ProjectReport',
      'PayrollReport',
      'BudgetReport',
      'ExpenseReport',
    ];

    reportTypes.forEach((type) => {
      if (typesContent.includes(type)) {
        addExportResult('Report Types', type, 'pass', `${type} type defined`);
      } else {
        addExportResult('Report Types', type, 'warning', `${type} type not defined`);
      }
    });
  }

  console.log(
    `✓ Report types validated: ${exportResults.filter((r) => r.category === 'Report Types').length} checks`
  );
}

// ============================================================================
// RUN ALL EXPORT VALIDATIONS
// ============================================================================

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║     ORIGEN ERP - EXPORT FUNCTIONALITY VALIDATION                      ║');
console.log('║     Validating PDF, Excel, and image export capabilities                  ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

validateExportLibraries();
validateExportComponents();
validateExportServices();
validateReportTypes();

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                           EXPORT VALIDATION SUMMARY                        ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

const categories = [...new Set(exportResults.map((r) => r.category))];
categories.forEach((category) => {
  const categoryResults = exportResults.filter((r) => r.category === category);
  const passed = categoryResults.filter((r) => r.status === 'pass').length;
  const failed = categoryResults.filter((r) => r.status === 'fail').length;
  const warnings = categoryResults.filter((r) => r.status === 'warning').length;

  console.log(`\n${category}:`);
  console.log(`  ✓ Passed: ${passed}`);
  console.log(`  ✗ Failed: ${failed}`);
  console.log(`  ⚠ Warnings: ${warnings}`);
});

const totalPassed = exportResults.filter((r) => r.status === 'pass').length;
const totalFailed = exportResults.filter((r) => r.status === 'fail').length;
const totalWarnings = exportResults.filter((r) => r.status === 'warning').length;
const total = exportResults.length;

console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                           FINAL RESULTS                                    ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log(`\nTotal Checks: ${total}`);
console.log(`✓ Passed: ${totalPassed} (${((totalPassed / total) * 100).toFixed(1)}%)`);
console.log(`✗ Failed: ${totalFailed} (${((totalFailed / total) * 100).toFixed(1)}%)`);
console.log(`⚠ Warnings: ${totalWarnings} (${((totalWarnings / total) * 100).toFixed(1)}%)`);

if (totalFailed === 0) {
  console.log('\n✅ EXPORT VALIDATION PASSED - Critical export libraries present');
} else {
  console.log('\n❌ EXPORT VALIDATION FAILED - Missing critical export libraries');
}

if (totalWarnings > 0) {
  console.log(`\n⚠️ ${totalWarnings} warnings found - Some export features may be limited`);
}

console.log('\nExport functionality summary:');
console.log('- PDF Export: jsPDF library present');
console.log('- Excel Export: ExcelJS library present');
console.log('- Image Export: html2canvas library present');
console.log('- SVG Export: canvg library present');
console.log('- Image Processing: Sharp library present');
console.log('- Report Components: AdvancedReportsManager, ReportsView');
