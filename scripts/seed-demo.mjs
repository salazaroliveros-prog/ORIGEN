/**
 * seed-demo.mjs
 *
 * Populates the Firebase Emulator with a realistic set of demo construction
 * projects, APU items, and quotes.
 *
 * Usage:
 *   node scripts/seed-demo.mjs
 *
 * Prerequisites:
 *   - Firebase Emulator running at 127.0.0.1:8081 (Firestore)
 *   - Run from the project root
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Firebase initialisation (emulator-only config)
// ---------------------------------------------------------------------------
const app = initializeApp({
  apiKey: 'demo-api-key',
  authDomain: 'demo-origen-seed.firebaseapp.com',
  projectId: 'demo-origen-seed',
  storageBucket: 'demo-origen-seed.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:demo',
});

const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);

// ---------------------------------------------------------------------------
// Inline demo data (mirrors lib/budget/demoProjects.ts but as plain JS so
// this script runs without tsx or a build step)
// ---------------------------------------------------------------------------
const COMPANY_ID = 'demo-company';
const USER_ID = 'demo-user';

const p1Id = `${COMPANY_ID}-demo-proj-001`;
const p2Id = `${COMPANY_ID}-demo-proj-002`;
const p3Id = `${COMPANY_ID}-demo-proj-003`;

const apuItems = [
  // Project 1 – Residencia Unifamiliar
  { id: `${COMPANY_ID}-apu-001`, companyId: COMPANY_ID, projectId: p1Id, createdBy: USER_ID, code: '01.01', description: 'Excavación y nivelación de terreno', unit: 'm³', quantity: 120, materialUnitCostGTQ: 0, laborUnitCostGTQ: 85, equipmentUnitCostGTQ: 40, totalUnitCostGTQ: 125, totalPriceGTQ: 15000, department: 'Guatemala' },
  { id: `${COMPANY_ID}-apu-002`, companyId: COMPANY_ID, projectId: p1Id, createdBy: USER_ID, code: '02.01', description: 'Cimientos de concreto armado', unit: 'm³', quantity: 45, materialUnitCostGTQ: 950, laborUnitCostGTQ: 320, equipmentUnitCostGTQ: 80, totalUnitCostGTQ: 1350, totalPriceGTQ: 60750, department: 'Guatemala' },
  { id: `${COMPANY_ID}-apu-003`, companyId: COMPANY_ID, projectId: p1Id, createdBy: USER_ID, code: '03.01', description: 'Muros de block 14×19×39 cm', unit: 'm²', quantity: 280, materialUnitCostGTQ: 185, laborUnitCostGTQ: 95, equipmentUnitCostGTQ: 0, totalUnitCostGTQ: 280, totalPriceGTQ: 78400, department: 'Guatemala' },
  { id: `${COMPANY_ID}-apu-004`, companyId: COMPANY_ID, projectId: p1Id, createdBy: USER_ID, code: '04.01', description: 'Losa de concreto e=0.12 m', unit: 'm²', quantity: 110, materialUnitCostGTQ: 620, laborUnitCostGTQ: 210, equipmentUnitCostGTQ: 60, totalUnitCostGTQ: 890, totalPriceGTQ: 97900, department: 'Guatemala' },

  // Project 2 – Edificio Comercial
  { id: `${COMPANY_ID}-apu-005`, companyId: COMPANY_ID, projectId: p2Id, createdBy: USER_ID, code: '01.01', description: 'Demolición y limpieza del sitio', unit: 'm²', quantity: 350, materialUnitCostGTQ: 0, laborUnitCostGTQ: 55, equipmentUnitCostGTQ: 35, totalUnitCostGTQ: 90, totalPriceGTQ: 31500, department: 'Quetzaltenango' },
  { id: `${COMPANY_ID}-apu-006`, companyId: COMPANY_ID, projectId: p2Id, createdBy: USER_ID, code: '02.01', description: 'Pilotes de concreto d=0.40 m', unit: 'ml', quantity: 180, materialUnitCostGTQ: 1200, laborUnitCostGTQ: 450, equipmentUnitCostGTQ: 300, totalUnitCostGTQ: 1950, totalPriceGTQ: 351000, department: 'Quetzaltenango' },
  { id: `${COMPANY_ID}-apu-007`, companyId: COMPANY_ID, projectId: p2Id, createdBy: USER_ID, code: '03.01', description: 'Estructura metálica principal', unit: 'kg', quantity: 8500, materialUnitCostGTQ: 42, laborUnitCostGTQ: 18, equipmentUnitCostGTQ: 8, totalUnitCostGTQ: 68, totalPriceGTQ: 578000, department: 'Quetzaltenango' },
  { id: `${COMPANY_ID}-apu-008`, companyId: COMPANY_ID, projectId: p2Id, createdBy: USER_ID, code: '04.01', description: 'Losa postensada e=0.20 m', unit: 'm²', quantity: 350, materialUnitCostGTQ: 1100, laborUnitCostGTQ: 380, equipmentUnitCostGTQ: 120, totalUnitCostGTQ: 1600, totalPriceGTQ: 560000, department: 'Quetzaltenango' },
  { id: `${COMPANY_ID}-apu-009`, companyId: COMPANY_ID, projectId: p2Id, createdBy: USER_ID, code: '05.01', description: 'Instalaciones eléctricas 3 fases', unit: 'global', quantity: 1, materialUnitCostGTQ: 180000, laborUnitCostGTQ: 60000, equipmentUnitCostGTQ: 10000, totalUnitCostGTQ: 250000, totalPriceGTQ: 250000, department: 'Quetzaltenango' },

  // Project 3 – Puente Vehicular
  { id: `${COMPANY_ID}-apu-010`, companyId: COMPANY_ID, projectId: p3Id, createdBy: USER_ID, code: '01.01', description: 'Excavación para estribos', unit: 'm³', quantity: 200, materialUnitCostGTQ: 0, laborUnitCostGTQ: 120, equipmentUnitCostGTQ: 80, totalUnitCostGTQ: 200, totalPriceGTQ: 40000, department: 'Alta Verapaz' },
  { id: `${COMPANY_ID}-apu-011`, companyId: COMPANY_ID, projectId: p3Id, createdBy: USER_ID, code: '02.01', description: "Estribos de concreto armado f'c=280 kg/cm²", unit: 'm³', quantity: 85, materialUnitCostGTQ: 1400, laborUnitCostGTQ: 500, equipmentUnitCostGTQ: 150, totalUnitCostGTQ: 2050, totalPriceGTQ: 174250, department: 'Alta Verapaz' },
  { id: `${COMPANY_ID}-apu-012`, companyId: COMPANY_ID, projectId: p3Id, createdBy: USER_ID, code: '03.01', description: 'Vigas presforzadas L=20 m', unit: 'unidad', quantity: 6, materialUnitCostGTQ: 85000, laborUnitCostGTQ: 12000, equipmentUnitCostGTQ: 8000, totalUnitCostGTQ: 105000, totalPriceGTQ: 630000, department: 'Alta Verapaz' },
  { id: `${COMPANY_ID}-apu-013`, companyId: COMPANY_ID, projectId: p3Id, createdBy: USER_ID, code: '04.01', description: 'Tablero de rodadura e=0.20 m', unit: 'm²', quantity: 240, materialUnitCostGTQ: 850, laborUnitCostGTQ: 280, equipmentUnitCostGTQ: 120, totalUnitCostGTQ: 1250, totalPriceGTQ: 300000, department: 'Alta Verapaz' },
  { id: `${COMPANY_ID}-apu-014`, companyId: COMPANY_ID, projectId: p3Id, createdBy: USER_ID, code: '05.01', description: 'Barandas metálicas y señalización', unit: 'ml', quantity: 80, materialUnitCostGTQ: 1800, laborUnitCostGTQ: 450, equipmentUnitCostGTQ: 50, totalUnitCostGTQ: 2300, totalPriceGTQ: 184000, department: 'Alta Verapaz' },
];

const p1ApuTotal = apuItems.filter(i => i.projectId === p1Id).reduce((s, i) => s + i.totalPriceGTQ, 0);
const p2ApuTotal = apuItems.filter(i => i.projectId === p2Id).reduce((s, i) => s + i.totalPriceGTQ, 0);
const p3ApuTotal = apuItems.filter(i => i.projectId === p3Id).reduce((s, i) => s + i.totalPriceGTQ, 0);

const projects = [
  {
    id: p1Id, companyId: COMPANY_ID, code: 'DEMO-001', name: 'Residencia Unifamiliar Los Altos',
    client: 'Familia Méndez García', location: 'Zona 10, Ciudad de Guatemala',
    municipality: 'Guatemala', department: 'Guatemala',
    budgetTotal: 260000, spentTotal: 48500, progressPercent: 22,
    startDate: '2025-01-15', endDate: '2025-09-30', status: 'En Ejecución',
    lat: 14.6035, lng: -90.4886, ownerId: USER_ID, createdBy: USER_ID,
    expectedProfitMarginPercent: 15, apuBudgetTotal: p1ApuTotal,
    apuBudgetVarianceGTQ: 260000 - p1ApuTotal,
  },
  {
    id: p2Id, companyId: COMPANY_ID, code: 'DEMO-002', name: 'Edificio Comercial Plaza Xela',
    client: 'Corporación Inversiones Xela S.A.', location: 'Zona 1, Quetzaltenango',
    municipality: 'Quetzaltenango', department: 'Quetzaltenango',
    budgetTotal: 1800000, spentTotal: 320000, progressPercent: 18,
    startDate: '2025-03-01', endDate: '2026-06-30', status: 'En Ejecución',
    lat: 14.8459, lng: -91.5191, ownerId: USER_ID, createdBy: USER_ID,
    expectedProfitMarginPercent: 12, apuBudgetTotal: p2ApuTotal,
    apuBudgetVarianceGTQ: 1800000 - p2ApuTotal,
  },
  {
    id: p3Id, companyId: COMPANY_ID, code: 'DEMO-003', name: 'Puente Vehicular Río Polochic',
    client: 'Municipalidad de Cobán', location: 'Cobán, Alta Verapaz',
    municipality: 'Cobán', department: 'Alta Verapaz',
    budgetTotal: 1350000, spentTotal: 85000, progressPercent: 8,
    startDate: '2025-05-01', endDate: '2026-04-30', status: 'Planificación',
    lat: 15.4722, lng: -90.3767, ownerId: USER_ID, createdBy: USER_ID,
    expectedProfitMarginPercent: 10, apuBudgetTotal: p3ApuTotal,
    apuBudgetVarianceGTQ: 1350000 - p3ApuTotal,
  },
];

const quotes = [
  {
    id: `${COMPANY_ID}-quote-001`, companyId: COMPANY_ID, projectId: p1Id,
    clientName: 'Familia Méndez García', clientNit: '12345678-9',
    clientPhone: '+502 5555-1111', clientEmail: 'mendez@demo.gt',
    clientAddress: 'Zona 10, Ciudad de Guatemala',
    date: '2024-12-01', validUntil: '2025-02-01',
    items: [
      { description: 'Excavación y nivelación', qty: 120, unit: 'm³', unitPriceGTQ: 125 },
      { description: 'Cimientos de concreto armado', qty: 45, unit: 'm³', unitPriceGTQ: 1350 },
      { description: 'Muros de block', qty: 280, unit: 'm²', unitPriceGTQ: 280 },
      { description: 'Losa de concreto', qty: 110, unit: 'm²', unitPriceGTQ: 890 },
    ],
    totalGTQ: p1ApuTotal, status: 'Aceptada',
    notes: 'Proyecto de vivienda unifamiliar de dos plantas.',
    estimatedDuration: '8 meses',
    subtotalGTQ: p1ApuTotal, discountPercent: 0, taxPercent: 12,
    taxGTQ: Math.round(p1ApuTotal * 0.12),
  },
  {
    id: `${COMPANY_ID}-quote-002`, companyId: COMPANY_ID, projectId: p2Id,
    clientName: 'Corporación Inversiones Xela S.A.', clientNit: '98765432-1',
    clientPhone: '+502 7777-2222', clientEmail: 'inversiones@xela.gt',
    clientAddress: 'Zona 1, Quetzaltenango',
    date: '2025-01-15', validUntil: '2025-03-15',
    items: [
      { description: 'Demolición y limpieza', qty: 350, unit: 'm²', unitPriceGTQ: 90 },
      { description: 'Pilotes de concreto', qty: 180, unit: 'ml', unitPriceGTQ: 1950 },
      { description: 'Estructura metálica', qty: 8500, unit: 'kg', unitPriceGTQ: 68 },
      { description: 'Losa postensada', qty: 350, unit: 'm²', unitPriceGTQ: 1600 },
      { description: 'Instalaciones eléctricas', qty: 1, unit: 'global', unitPriceGTQ: 250000 },
    ],
    totalGTQ: p2ApuTotal, status: 'Aceptada',
    notes: 'Edificio comercial de 5 niveles con sótano.',
    estimatedDuration: '16 meses',
    subtotalGTQ: p2ApuTotal, discountPercent: 2, taxPercent: 12,
    taxGTQ: Math.round(p2ApuTotal * 0.12),
  },
  {
    id: `${COMPANY_ID}-quote-003`, companyId: COMPANY_ID, projectId: p3Id,
    clientName: 'Municipalidad de Cobán', clientNit: '11223344-5',
    clientPhone: '+502 7952-0000', clientEmail: 'municipalidad@coban.gob.gt',
    clientAddress: 'Cobán, Alta Verapaz',
    date: '2025-03-01', validUntil: '2025-05-01',
    items: [
      { description: 'Excavación para estribos', qty: 200, unit: 'm³', unitPriceGTQ: 200 },
      { description: 'Estribos de concreto armado', qty: 85, unit: 'm³', unitPriceGTQ: 2050 },
      { description: 'Vigas presforzadas L=20 m', qty: 6, unit: 'unidad', unitPriceGTQ: 105000 },
      { description: 'Tablero de rodadura', qty: 240, unit: 'm²', unitPriceGTQ: 1250 },
      { description: 'Barandas metálicas', qty: 80, unit: 'ml', unitPriceGTQ: 2300 },
    ],
    totalGTQ: p3ApuTotal, status: 'Enviada',
    notes: 'Puente vehicular de 20 metros de longitud, carga HL-93.',
    estimatedDuration: '12 meses',
    subtotalGTQ: p3ApuTotal, discountPercent: 0, taxPercent: 12,
    taxGTQ: Math.round(p3ApuTotal * 0.12),
  },
];

// ---------------------------------------------------------------------------
// Write to Firestore
// ---------------------------------------------------------------------------
async function seed() {
  console.log('🌱 Seeding demo data to Firebase Emulator (127.0.0.1:8080)…\n');

  // Projects
  for (const project of projects) {
    const ref = doc(db, 'projects', project.id);
    await setDoc(ref, project, { merge: true });
    console.log(`  ✅ projects/${project.id}  (${project.name})`);
  }

  // APU items
  for (const item of apuItems) {
    const ref = doc(db, 'apuItems', item.id);
    await setDoc(ref, item, { merge: true });
    console.log(`  ✅ apuItems/${item.id}  (${item.code} – ${item.description})`);
  }

  // Quotes
  for (const quote of quotes) {
    const ref = doc(db, 'quotes', quote.id);
    await setDoc(ref, quote, { merge: true });
    console.log(`  ✅ quotes/${quote.id}  (${quote.clientName})`);
  }

  console.log('\n✨ Demo seed complete.');
  console.log(`   Projects : ${projects.length}`);
  console.log(`   APU items: ${apuItems.length}`);
  console.log(`   Quotes   : ${quotes.length}`);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
