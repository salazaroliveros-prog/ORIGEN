'use client';

import { useMemo, useState } from 'react';
import { Download, FileCheck2, Printer } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { formatGTQ } from '@/lib/data';
import type { CompanySettings, ExpenseRecord, FieldVisit, Project } from '@/lib/types';

interface ReportsViewProps {
  projects: Project[];
  expenses: ExpenseRecord[];
  fieldVisits: FieldVisit[];
  company?: CompanySettings;
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character
  );
}

function openPrintDocument(title: string, body: string): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.opener = null;
  printWindow.document
    .write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      body{font:14px Arial,sans-serif;color:#172033;margin:36px;line-height:1.5}
      h1{font-size:24px;margin:0 0 6px}h2{font-size:16px;margin:24px 0 8px;border-bottom:1px solid #ccd2dc;padding-bottom:5px}
      .meta{color:#465066;font-size:12px}table{border-collapse:collapse;width:100%;font-size:12px}
      th,td{border:1px solid #ccd2dc;padding:8px;text-align:left;vertical-align:top}th{background:#f1f3f6}
      .signatures{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:80px}
      .signature{border-top:1px solid #222;padding-top:8px;text-align:center;font-size:12px}
      @media print{body{margin:18mm}.no-print{display:none}}
    </style></head><body>${body}<script>window.addEventListener('load',()=>window.print())</script></body></html>`);
  printWindow.document.close();
  return true;
}

export function ReportsView({
  projects,
  expenses,
  fieldVisits,
  company,
  activeProjectId,
  onSelectProject,
}: ReportsViewProps) {
  const [actaNotes, setActaNotes] = useState('');
  const project = projects.find((item) => item.id === activeProjectId);
  const projectExpenses = useMemo(
    () => expenses.filter((expense) => expense.projectId === activeProjectId),
    [expenses, activeProjectId]
  );
  const projectVisits = useMemo(
    () =>
      fieldVisits
        .filter((visit) => visit.projectId === activeProjectId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [fieldVisits, activeProjectId]
  );
  const totalExpenses = projectExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const renderReport = (acta: boolean) => {
    if (!project) {
      toast.error('Crea o selecciona un proyecto para generar el documento.');
      return;
    }
    const title = acta ? `Acta de obra - ${project.code}` : `Resumen de obra - ${project.code}`;
    const companyName = escapeHtml(company?.commercialName || company?.companyName || 'Empresa');

    // Generar filas de visitas con datos adicionales
    const visits = projectVisits
      .map((visit) => {
        const hasSignature = visit.signatureDataUrl ? '✓' : '✗';
        const hasGps = visit.gpsCoords ? '✓' : '✗';
        const hasPhotos =
          visit.photos && visit.photos.length > 0 ? `${visit.photos.length} fotos` : '0 fotos';
        const gpsInfo = visit.gpsCoords
          ? `Lat: ${visit.gpsCoords.lat.toFixed(6)}, Lng: ${visit.gpsCoords.lng.toFixed(6)}`
          : 'Sin GPS';

        return `<tr>
          <td>${escapeHtml(visit.date)}</td>
          <td>${escapeHtml(visit.foremanName)}</td>
          <td>${escapeHtml(visit.status)}</td>
          <td>${hasGps}</td>
          <td>${hasSignature}</td>
          <td>${hasPhotos}</td>
          <td><small class="text-slate-500">${escapeHtml(gpsInfo)}</small></td>
          <td>${escapeHtml(visit.notes)}</td>
        </tr>`;
      })
      .join('');

    // Generar filas de gastos
    const expensesRows = projectExpenses
      .map(
        (expense) =>
          `<tr><td>${escapeHtml(expense.date)}</td><td>${escapeHtml(expense.category)}</td><td>${escapeHtml(expense.description)}</td><td>${escapeHtml(expense.supplier)}</td><td>${escapeHtml(formatGTQ(expense.amount))}</td></tr>`
      )
      .join('');

    // Generar sección de fotos si hay visitas con fotos
    const photosSection = projectVisits.some((v) => v.photos && v.photos.length > 0)
      ? `<h2>Evidencia Fotográfica</h2>
         <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin:24px 0;">
           ${projectVisits
             .filter((v) => v.photos && v.photos.length > 0)
             .map((visit) =>
               (visit.photos || [])
                 .map(
                   (photo) =>
                     `<div style="border:1px solid #ccd2dc;border-radius:8px;overflow:hidden;">
                      <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.caption || 'Foto de obra')}" style="width:100%;height:150px;object-fit:cover;">
                      <div style="padding:8px;font-size:11px;background:#f8f9fa;">
                        <strong>${escapeHtml(visit.date)}</strong><br>
                        <small>${escapeHtml(photo.caption || 'Sin descripción')}</small>
                      </div>
                    </div>`
                 )
                 .join('')
             )
             .join('')}
         </div>`
      : '';

    // Generar sección de validación GPS
    const gpsValidationSection = projectVisits.some((v) => v.gpsCoords)
      ? `<h2>Validación Geográfica (GPS)</h2>
         <table>
           <thead>
             <tr>
               <th>Fecha</th>
               <th>Capataz</th>
               <th>Estado GPS</th>
               <th>Coordenadas</th>
               <th>Precisión</th>
             </tr>
           </thead>
           <tbody>
             ${projectVisits
               .filter((v) => v.gpsCoords)
               .map((visit) => {
                 const accuracy = visit.accuracy ? `±${Math.round(visit.accuracy)}m` : 'N/A';
                 const valid = visit.geofenceValid ? 'Válido' : 'Fuera de geocerca';
                 const coords = visit.gpsCoords
                   ? `Lat: ${visit.gpsCoords.lat.toFixed(6)}, Lng: ${visit.gpsCoords.lng.toFixed(6)}`
                   : 'Sin GPS';
                 return `<tr>
                   <td>${escapeHtml(visit.date)}</td>
                   <td>${escapeHtml(visit.foremanName)}</td>
                   <td><span style="color:${visit.geofenceValid ? '#16a34a' : '#dc2626'}">${escapeHtml(valid)}</span></td>
                   <td>${escapeHtml(coords)}</td>
                   <td>${escapeHtml(accuracy)}</td>
                 </tr>`;
               })
               .join('')}
           </tbody>
         </table>`
      : '';

    const actaBody = acta
      ? `<h2>Objeto y observaciones</h2>
         <p>${escapeHtml(actaNotes || 'Sin observaciones registradas.')}</p>
         <p>Las partes dejan constancia del estado de avance reportado en la fecha de emisión. Este documento es un borrador imprimible y requiere revisión y firmas de las partes antes de considerarse formal.</p>
         <div class="signatures">
           <div class="signature">
             <strong>Representante de la empresa</strong><br>
             <small>Nombre: ___________________</small><br>
             <small>Firma: ___________________</small><br>
             <small>Fecha: ___________________</small>
           </div>
           <div class="signature">
             <strong>Representante del cliente</strong><br>
             <small>Nombre: ___________________</small><br>
             <small>Firma: ___________________</small><br>
             <small>Fecha: ___________________</small>
           </div>
         </div>`
      : `<h2>Resumen financiero</h2>
         <p>Presupuesto registrado: ${escapeHtml(formatGTQ(project.budgetTotal))} · Gastos registrados: ${escapeHtml(formatGTQ(totalExpenses))}</p>`;

    const html = `<header><p class="meta">${companyName}${company?.nit ? ` · NIT ${escapeHtml(company.nit)}` : ''}</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="meta">Emitido: ${new Intl.DateTimeFormat('es-GT', { dateStyle: 'long' }).format(new Date())}</p>
      <p class="meta">Proyecto: ${escapeHtml(project.name)} (${escapeHtml(project.code)})</p>
      <p class="meta">Cliente: ${escapeHtml(project.client)}</p>
      <p class="meta">Ubicación: ${escapeHtml(project.location)}, ${escapeHtml(project.municipality)}, ${escapeHtml(project.department)}</p>
      <p class="meta">Estado: ${escapeHtml(project.status)} · Avance: ${project.progressPercent}%</p>
      </header>
      <h2>Bitácora de Visitas de Campo</h2>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Capataz</th>
            <th>Estado</th>
            <th>GPS</th>
            <th>Firma</th>
            <th>Fotos</th>
            <th>Ubicación</th>
            <th>Notas</th>
          </tr>
        </thead>
        <tbody>${visits || '<tr><td colspan="8">No hay bitácoras registradas.</td></tr>'}</tbody>
      </table>
      ${gpsValidationSection}
      ${photosSection}
      <h2>Gastos y Facturas</h2>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Categoría</th>
            <th>Descripción</th>
            <th>Proveedor</th>
            <th>Monto (GTQ)</th>
          </tr>
        </thead>
        <tbody>${expensesRows || '<tr><td colspan="5">No hay gastos registrados.</td></tr>'}</tbody>
        <tfoot>
          <tr>
            <th colspan="4" style="text-align:right">Total:</th>
            <th style="font-weight:bold">${escapeHtml(formatGTQ(totalExpenses))}</th>
          </tr>
        </tfoot>
      </table>
      ${actaBody}
      <div class="signatures">
        <div class="signature">
          <strong>Generado por ConstructERP Guatemala</strong><br>
          <small>Sistema de Gestión de Obras</small><br>
          <small>www.origin-erp.com</small>
        </div>
        <div class="signature">
          <strong>Confirmación de recepción</strong><br>
          <small>Fecha: ___________________</small><br>
          <small>Firma: ___________________</small>
        </div>
      </div>`;
    if (!openPrintDocument(title, html)) {
      toast.error(
        'El navegador bloqueó la ventana del documento. Permite ventanas emergentes para imprimir o guardar como PDF.'
      );
      return;
    }
    toast.success('Documento preparado. En el diálogo de impresión puedes guardarlo como PDF.');
  };

  const exportExpensesCsv = () => {
    if (!project) {
      toast.error('Selecciona un proyecto para exportar gastos.');
      return;
    }
    const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const lines = [
      [
        'Fecha',
        'Categoría',
        'Descripción',
        'Proveedor',
        'NIT',
        'Factura',
        'Estado',
        'Monto GTQ',
      ].join(','),
      ...projectExpenses.map((expense) =>
        [
          expense.date,
          expense.category,
          expense.description,
          expense.supplier,
          expense.nitSupplier,
          expense.facturaNumber,
          expense.approvalStatus ?? 'Sin revisar',
          expense.amount.toFixed(2),
        ]
          .map(quote)
          .join(',')
      ),
    ];
    const url = URL.createObjectURL(
      new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `gastos-${project.code}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full space-y-5">
      <PageHeader
        title="Reportes de obra"
        subtitle="Resúmenes imprimibles basados en proyectos, bitácoras y gastos registrados"
        logoUrl={company?.logoUrl}
        companyName={company?.companyName}
      />
      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-300">
          Proyecto
          <select
            value={activeProjectId}
            onChange={(event) => onSelectProject(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            <option value="">Selecciona proyecto</option>
            {projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} · {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="Gastos" value={String(projectExpenses.length)} />
          <Metric label="Bitácoras" value={String(projectVisits.length)} />
          <Metric label="Total gastos" value={formatGTQ(totalExpenses)} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-bold text-white">Resumen de obra</h2>
          <p className="mt-2 text-sm text-slate-400">
            Imprime el proyecto, avance, bitácoras y gastos guardados en el espacio de empresa.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!project}
              onClick={() => renderReport(false)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Imprimir / Guardar PDF
            </button>
            <button
              type="button"
              disabled={!project}
              onClick={exportExpensesCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Exportar gastos CSV
            </button>
          </div>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="flex items-center gap-2 font-bold text-white">
            <FileCheck2 className="h-4 w-4" />
            Borrador de acta
          </h2>
          <label htmlFor="acta-notes" className="mt-3 block text-xs font-semibold text-slate-300">
            Observaciones / acuerdos
          </label>
          <textarea
            id="acta-notes"
            rows={4}
            value={actaNotes}
            onChange={(event) => setActaNotes(event.target.value)}
            placeholder="Describe el estado de la obra y los acuerdos a documentar..."
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <p className="mt-2 text-[11px] text-amber-200">
            El acta es un borrador imprimible; no se firma electrónicamente ni queda almacenada.
          </p>
          <button
            type="button"
            disabled={!project}
            onClick={() => renderReport(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-500/50 px-4 py-2 text-sm font-bold text-amber-200 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Preparar acta para imprimir
          </button>
        </article>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-950 p-3">
      <p className="text-[10px] text-slate-500 uppercase">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}
