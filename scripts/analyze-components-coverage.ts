/**
 * ORIGEN ERP - Component Test Coverage Analysis
 *
 * Este script analiza qué componentes tienen tests y cuáles no
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

interface ComponentAnalysis {
  component: string;
  hasTest: boolean;
  testFile?: string;
  size: number;
  category: string;
}

const componentsDir = join(process.cwd(), 'components');
const components = readdirSync(componentsDir).filter((f) => f.endsWith('.tsx'));

const analysis: ComponentAnalysis[] = [];

function categorizeComponent(name: string): string {
  if (name.includes('Payroll') || name.includes('Attendance') || name.includes('Staff'))
    return 'Payroll & Staff';
  if (name.includes('Machine')) return 'Machinery';
  if (name.includes('Gmail') || name.includes('Email')) return 'Gmail';
  if (name.includes('Quotation') || name.includes('Quote')) return 'Quotations';
  if (name.includes('Report')) return 'Reports';
  if (name.includes('Gantt') || name.includes('Cronograma')) return 'Gantt';
  if (name.includes('Signature') || name.includes('Canvas')) return 'Signatures';
  if (name.includes('Field') || name.includes('Visit')) return 'Field Operations';
  if (name.includes('Company') || name.includes('Team')) return 'Team Management';
  if (name.includes('Budget') || name.includes('APU') || name.includes('Expense'))
    return 'Financial';
  if (name.includes('Project')) return 'Projects';
  if (name.includes('Dashboard') || name.includes('Chart')) return 'Dashboard';
  if (name.includes('AI') || name.includes('Gemini')) return 'AI Assistant';
  return 'Other';
}

function checkTestFile(componentName: string): string | null {
  const testName = componentName.replace('.tsx', '.test.ts');
  const testNameJS = componentName.replace('.tsx', '.test.js');
  const testNameSpec = componentName.replace('.tsx', '.spec.ts');

  const possiblePaths = [
    join(componentsDir, testName),
    join(componentsDir, testNameJS),
    join(componentsDir, testNameSpec),
    join(process.cwd(), 'lib', testName),
    join(process.cwd(), 'lib', testNameJS),
    join(process.cwd(), 'lib', testNameSpec),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║     ORIGEN ERP - COMPONENT TEST COVERAGE ANALYSIS                        ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

components.forEach((component) => {
  const componentPath = join(componentsDir, component);
  const stats = readFileSync(componentPath);
  const size = stats.length;
  const testFile = checkTestFile(component);
  const category = categorizeComponent(component);

  analysis.push({
    component,
    hasTest: testFile !== null,
    testFile: testFile || undefined,
    size,
    category,
  });
});

const categories = [...new Set(analysis.map((a) => a.category))];

console.log('\n=== COMPONENTS BY CATEGORY ===\n');

categories.forEach((category) => {
  const categoryComponents = analysis.filter((a) => a.category === category);
  const withTests = categoryComponents.filter((c) => c.hasTest).length;
  const total = categoryComponents.length;

  console.log(`\n${category}:`);
  console.log(`  Total: ${total}`);
  console.log(`  With tests: ${withTests} (${((withTests / total) * 100).toFixed(1)}%)`);
  console.log(`  Without tests: ${total - withTests}`);

  categoryComponents.forEach((c) => {
    const status = c.hasTest ? '✅' : '❌';
    const sizeKB = (c.size / 1024).toFixed(1);
    console.log(`    ${status} ${c.component} (${sizeKB} KB)`);
  });
});

console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                           SUMMARY                                           ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

const totalComponents = analysis.length;
const withTests = analysis.filter((c) => c.hasTest).length;
const withoutTests = analysis.filter((c) => !c.hasTest).length;

console.log(`\nTotal Components: ${totalComponents}`);
console.log(`With Tests: ${withTests} (${((withTests / totalComponents) * 100).toFixed(1)}%)`);
console.log(
  `Without Tests: ${withoutTests} (${((withoutTests / totalComponents) * 100).toFixed(1)}%)`
);

console.log('\n=== COMPONENTS WITHOUT TESTS ===\n');

analysis
  .filter((c) => !c.hasTest)
  .forEach((c) => {
    const sizeKB = (c.size / 1024).toFixed(1);
    console.log(`❌ ${c.component} (${c.category}, ${sizeKB} KB)`);
  });

console.log('\n=== RECOMMENDATIONS ===\n');

const priorityCategories = [
  'Payroll & Staff',
  'Machinery',
  'Gmail',
  'Quotations',
  'Reports',
  'Gantt',
  'Signatures',
  'Field Operations',
];

priorityCategories.forEach((category) => {
  const categoryComponents = analysis.filter((a) => a.category === category && !a.hasTest);
  if (categoryComponents.length > 0) {
    console.log(`\n${category} (${categoryComponents.length} components need tests):`);
    categoryComponents.forEach((c) => {
      console.log(`  - ${c.component}`);
    });
  }
});
