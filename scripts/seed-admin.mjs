import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp({ projectId: 'demo-origen-e2e' });
}

const db = getFirestore();

const COMPANY_ID = 'demo-company';
const USER_ID = 'salazaroliveros@gmail.com';

const projects = [
  {
    id: `${COMPANY_ID}-demo-proj-001`, companyId: COMPANY_ID, code: 'DEMO-001',
    name: 'Residencia Unifamiliar Los Altos', client: 'Familia Méndez García',
    municipality: 'Guatemala', department: 'Guatemala',
    budgetTotal: 260000, spentTotal: 48500, progressPercent: 22,
    status: 'En Ejecución', ownerId: USER_ID, createdBy: USER_ID,
  },
  {
    id: `${COMPANY_ID}-demo-proj-002`, companyId: COMPANY_ID, code: 'DEMO-002',
    name: 'Edificio Comercial Plaza Xela', client: 'Corporación Inversiones Xela S.A.',
    municipality: 'Quetzaltenango', department: 'Quetzaltenango',
    budgetTotal: 1800000, spentTotal: 320000, progressPercent: 18,
    status: 'En Ejecución', ownerId: USER_ID, createdBy: USER_ID,
  },
  {
    id: `${COMPANY_ID}-demo-proj-003`, companyId: COMPANY_ID, code: 'DEMO-003',
    name: 'Puente Vehicular Río Polochic', client: 'Municipalidad de Cobán',
    municipality: 'Cobán', department: 'Alta Verapaz',
    budgetTotal: 1350000, spentTotal: 85000, progressPercent: 8,
    status: 'Planificación', ownerId: USER_ID, createdBy: USER_ID,
  },
];

async function seed() {
  const batch = db.batch();
  for (const p of projects) {
    batch.set(db.collection('companies').doc(COMPANY_ID), {
      id: COMPANY_ID, ownerId: USER_ID, legalName: 'Empresa Demo', commercialName: 'Empresa Demo',
    }, { merge: true });
    batch.set(db.collection('companies').doc(COMPANY_ID).collection('members').doc(USER_ID), {
      uid: USER_ID, companyId: COMPANY_ID, role: 'owner', email: USER_ID, invitationId: 'seed-invite',
    });
    batch.set(db.collection('projects').doc(p.id), p);
    console.log(`  ✅ projects/${p.id}`);
  }
  await batch.commit();
  console.log('\n✅ Seed complete. Projects:', projects.length);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
