'use client';

import { CameraCaptureModal } from '@/components/CameraCaptureModal';
import { MonthlyExpensesHistogram } from '@/components/MonthlyExpensesHistogram';
import { formatGTQ, formatUSD, initialAPUItems } from '@/lib/data';
import { APUItem, CompanySettings, ExpenseAuditEntry, ExpenseRecord, Project } from '@/lib/types';
import {
  AlertTriangle,
  Ban,
  BarChart3,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSearch,
  History,
  Plus,
  Receipt,
  RotateCw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Image from 'next/image';
import React, { useState } from 'react';

interface ExpensesManagerProps {
  expenses: ExpenseRecord[];
  projects: Project[];
  activeProjectId: string;
  onAddExpense: (e: ExpenseRecord) => void;
  onUpdateExpense?: (e: ExpenseRecord) => void;
  currency: 'GTQ' | 'USD';
  company: CompanySettings;
  budgetItems?: APUItem[];
}

export function ExpensesManager({
  expenses,
  projects,
  activeProjectId,
  onAddExpense,
  onUpdateExpense,
  currency,
  company,
  budgetItems = initialAPUItems,
}: ExpensesManagerProps) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [category, setCategory] = useState<
    | 'Materiales (Cementos, Hierro)'
    | 'Mano de Obra'
    | 'Maquinaria y Combustible'
    | 'Permisos & Licencias'
    | 'Imprevistos'
  >('Materiales (Cementos, Hierro)');
  const [desc, setDesc] = useState('');
  const [supplier, setSupplier] = useState('');
  const [nit, setNit] = useState('');
  const [factura, setFactura] = useState('');
  const [amount, setAmount] = useState('5000');
  const [assignedApuId, setAssignedApuId] = useState<string>('apu-2');

  // Receipt capture states for new expense
  const [newReceiptUrl, setNewReceiptUrl] = useState<string | null>(null);
  const [newReceiptDate, setNewReceiptDate] = useState<string | null>(null);
  const [newReceiptCoords, setNewReceiptCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );

  // Camera modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTargetExpenseId, setCameraTargetExpenseId] = useState<string | null>(null);

  // Lightbox preview for full receipt inspection
  const [viewingReceiptExpense, setViewingReceiptExpense] = useState<ExpenseRecord | null>(null);

  // Active view tab: Invoices list or Monthly Histogram & PDF
  const [activeExpenseTab, setActiveExpenseTab] = useState<'facturas' | 'histograma'>('facturas');

  // Two-Step Approval states
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendientes' | 'aprobados'>('todos');
  const [viewingAuditExpense, setViewingAuditExpense] = useState<ExpenseRecord | null>(null);
  const [approvalModalExpense, setApprovalModalExpense] = useState<ExpenseRecord | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<'Aprobado' | 'Pendiente' | 'Rechazado'>(
    'Aprobado'
  );
  const [approvalNote, setApprovalNote] = useState('');
  const [pmName, setPmName] = useState('Ing. Carlos Mendoza (PM)');

  // Overrun warning toast
  const [warningToast, setWarningToast] = useState<{
    message: string;
    diff: number;
    apuCode: string;
    budgetTotal: number;
    spentTotal: number;
  } | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const formatMoney = (val: number) => {
    return currency === 'GTQ' ? formatGTQ(val) : formatUSD(val, company.exchangeRate);
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Helper to check APU budget overrun
  const checkApuOverrun = (apuId: string, additionalAmount: number, excludeExpenseId?: string) => {
    const apu = budgetItems.find((b) => b.id === apuId);
    if (!apu) return null;

    const currentSpent = expenses
      .filter(
        (e) =>
          e.projectId === activeProject.id && e.assignedApuId === apuId && e.id !== excludeExpenseId
      )
      .reduce((sum, e) => sum + e.amount, 0);

    const projectedTotal = currentSpent + additionalAmount;
    if (projectedTotal > apu.totalPriceGTQ) {
      return {
        isOver: true,
        diff: projectedTotal - apu.totalPriceGTQ,
        apuCode: apu.code,
        apuDesc: apu.description,
        budgetTotal: apu.totalPriceGTQ,
        currentSpent,
        projectedTotal,
      };
    }
    return null;
  };

  const analyzeReceiptWithAI = async (dataUrl: string) => {
    try {
      setIsAnalyzing(true);
      const res = await fetch('/api/gemini/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (d.supplier) setSupplier(d.supplier);
        if (d.nitSupplier) setNit(d.nitSupplier);
        if (d.facturaNumber) setFactura(d.facturaNumber);
        if (d.amount && !isNaN(Number(d.amount))) {
          const parsedAmt = String(d.amount);
          setAmount(parsedAmt);
          // Check APU overrun
          const overrun = checkApuOverrun(assignedApuId, Number(parsedAmt));
          if (overrun) {
            setWarningToast({
              message: `¡Alerta de Presupuesto APU! La factura detectada por IA de Q${d.amount} excede el renglón ${overrun.apuCode} (${overrun.apuDesc}).`,
              diff: overrun.diff,
              apuCode: overrun.apuCode,
              budgetTotal: overrun.budgetTotal,
              spentTotal: overrun.projectedTotal,
            });
          }
        }
        if (d.category) setCategory(d.category);
        if (d.description) setDesc(d.description);
      }
    } catch (err) {
      console.error('Failed to analyze receipt with AI:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCaptureReceipt = (
    dataUrl: string,
    meta: { coords?: { lat: number; lng: number }; timestamp: string; caption?: string }
  ) => {
    if (cameraTargetExpenseId) {
      const target = expenses.find((e) => e.id === cameraTargetExpenseId);
      if (target && onUpdateExpense) {
        onUpdateExpense({
          ...target,
          receiptPhotoUrl: dataUrl,
          receiptPhotoDate: meta.timestamp,
          receiptCoords: meta.coords,
        });
      }
      setCameraTargetExpenseId(null);
    } else {
      setNewReceiptUrl(dataUrl);
      setNewReceiptDate(meta.timestamp);
      setNewReceiptCoords(meta.coords || null);
      analyzeReceiptWithAI(dataUrl);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;

    const numAmount = Number(amount) || 1000;
    const selectedApu = budgetItems.find((b) => b.id === assignedApuId);
    const nowStr = new Date().toLocaleString('es-GT');

    // Check APU overrun warning
    const overrun = checkApuOverrun(assignedApuId, numAmount);
    if (overrun) {
      setWarningToast({
        message: `¡Alerta de Sobrecosto APU! El gasto excede por Q${overrun.diff.toLocaleString('es-GT')} el presupuesto asignado al renglón ${overrun.apuCode}.`,
        diff: overrun.diff,
        apuCode: overrun.apuCode,
        budgetTotal: overrun.budgetTotal,
        spentTotal: overrun.projectedTotal,
      });
    }

    const ex: ExpenseRecord = {
      id: `ex-${Date.now()}`,
      projectId: activeProject.id,
      date: new Date().toISOString().split('T')[0],
      category,
      description: desc,
      supplier: supplier || 'Proveedor Local',
      nitSupplier: nit || '123456-7',
      facturaNumber: factura || 'A-001',
      amount: numAmount,
      currency: 'GTQ',
      paymentMethod: 'Transferencia BI',
      receiptPhotoUrl: newReceiptUrl || undefined,
      receiptPhotoDate: newReceiptDate || undefined,
      receiptCoords: newReceiptCoords || undefined,
      approvalStatus: 'Pendiente', // Step 1: Registered as Pending PM approval
      assignedApuId: assignedApuId || undefined,
      assignedApuDescription: selectedApu ? selectedApu.description : undefined,
      auditTrail: [
        {
          id: `aud-${Date.now()}-1`,
          action: 'CREADO',
          user: 'Residente de Obra',
          role: 'Ingeniero Residente',
          timestamp: nowStr,
          note: newReceiptUrl
            ? 'Comprobante físico capturado con cámara y validado con IA'
            : 'Registro manual de gasto en campo',
        },
        {
          id: `aud-${Date.now()}-2`,
          action: 'ENVIADO_A_REVISION',
          user: 'Residente de Obra',
          role: 'Ingeniero Residente',
          timestamp: nowStr,
          note: `Enviado al flujo de aprobación del Project Manager (Renglón APU: ${selectedApu?.code || 'General'})`,
        },
      ],
    };

    onAddExpense(ex);
    setIsOpenModal(false);
    setDesc('');
    setSupplier('');
    setNit('');
    setFactura('');
    setNewReceiptUrl(null);
    setNewReceiptDate(null);
    setNewReceiptCoords(null);
  };

  // Two-Step Approval Submit Handler
  const handleConfirmApproval = () => {
    if (!approvalModalExpense || !onUpdateExpense) return;

    const nowStr = new Date().toLocaleString('es-GT');
    const isApproving = approvalDecision === 'Aprobado';

    // If approving, verify if this approval causes an APU overrun
    if (isApproving && approvalModalExpense.assignedApuId) {
      const overrun = checkApuOverrun(
        approvalModalExpense.assignedApuId,
        approvalModalExpense.amount,
        approvalModalExpense.id
      );
      if (overrun) {
        setWarningToast({
          message: `¡Atención! Ha aprobado un gasto que supera el presupuesto del renglón ${overrun.apuCode} por Q${overrun.diff.toLocaleString('es-GT')}.`,
          diff: overrun.diff,
          apuCode: overrun.apuCode,
          budgetTotal: overrun.budgetTotal,
          spentTotal: overrun.projectedTotal,
        });
      }
    }

    const newAuditEntry: ExpenseAuditEntry = {
      id: `aud-${Date.now()}`,
      action: isApproving
        ? 'APROBADO'
        : approvalDecision === 'Rechazado'
          ? 'RECHAZADO'
          : 'REVERTIDO',
      user: pmName,
      role: 'Project Manager / Director de Obra',
      timestamp: nowStr,
      note:
        approvalNote.trim() ||
        (isApproving
          ? 'Gasto aprobado contra presupuesto y renglón APU.'
          : 'Estado modificado por PM.'),
    };

    const updatedExpense: ExpenseRecord = {
      ...approvalModalExpense,
      approvalStatus: approvalDecision,
      approvedBy: isApproving ? pmName : undefined,
      approvedAt: isApproving ? nowStr : undefined,
      auditTrail: [...(approvalModalExpense.auditTrail || []), newAuditEntry],
    };

    onUpdateExpense(updatedExpense);
    setApprovalModalExpense(null);
    setApprovalNote('');
  };

  const handleDownloadReceipt = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Filter expenses based on active project and approval status
  const projectExpenses = expenses.filter((e) => e.projectId === activeProject.id);

  const filteredExpenses = projectExpenses.filter((ex) => {
    if (statusFilter === 'pendientes')
      return ex.approvalStatus === 'Pendiente' || !ex.approvalStatus;
    if (statusFilter === 'aprobados') return ex.approvalStatus === 'Aprobado';
    return true;
  });

  const pendingCount = projectExpenses.filter(
    (e) => e.approvalStatus === 'Pendiente' || !e.approvalStatus
  ).length;
  const approvedCount = projectExpenses.filter((e) => e.approvalStatus === 'Aprobado').length;
  const approvedTotal = projectExpenses
    .filter((e) => e.approvalStatus === 'Aprobado')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Warning Toast for APU Overrun */}
      {warningToast && (
        <div className="animate-in fade-in slide-in-from-top flex items-start justify-between gap-3 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 shadow-lg duration-200">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 rounded-xl bg-rose-600 p-2 text-white shadow-sm">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1 text-xs">
              <h4 className="flex items-center gap-2 text-sm font-bold text-rose-950">
                Alerta de Sobrecosto Presupuestario en Renglón APU {warningToast.apuCode}
                <span className="rounded bg-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-900">
                  Exceso: Q{warningToast.diff.toLocaleString('es-GT')}
                </span>
              </h4>
              <p className="leading-relaxed font-medium text-rose-800">{warningToast.message}</p>
              <div className="flex items-center gap-4 pt-1 text-[11px] text-rose-700">
                <span>
                  Presupuesto Renglón:{' '}
                  <strong>Q{warningToast.budgetTotal.toLocaleString('es-GT')}</strong>
                </span>
                <span>
                  Monto Proyectado:{' '}
                  <strong>Q{warningToast.spentTotal.toLocaleString('es-GT')}</strong>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setWarningToast(null)}
            className="rounded-lg p-1.5 text-rose-700 transition hover:bg-rose-100 hover:text-rose-900"
            title="Cerrar advertencia"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Gastos, Facturas & Aprobación en 2 Pasos (PM)
            </h2>
            <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              <Camera className="h-3 w-3 text-amber-600" /> Captura Cámara & OCR
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Control de egresos para {activeProject.name} con validación presupuestaria APU y pista
            de auditoría inalterable.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-tab view switcher */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setActiveExpenseTab('facturas')}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeExpenseTab === 'facturas'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="h-3.5 w-3.5 text-blue-600" />
              Facturas & Aprobación
            </button>
            <button
              onClick={() => setActiveExpenseTab('histograma')}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeExpenseTab === 'histograma'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Histograma Mensual & PDF
            </button>
          </div>

          <button
            onClick={() => {
              setNewReceiptUrl(null);
              setIsOpenModal(true);
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" /> Registrar Gasto / Factura
          </button>
        </div>
      </div>

      {activeExpenseTab === 'histograma' ? (
        <MonthlyExpensesHistogram
          projects={projects}
          activeProjectId={activeProjectId}
          expenses={expenses}
          company={company}
          currency={currency}
        />
      ) : (
        <>
          {/* Metrics & Two-Step Approval Summary Bar */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div>
                <span className="block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Total Ejecutado Aprobado
                </span>
                <p className="mt-0.5 text-lg font-bold text-emerald-600">
                  {formatMoney(approvedTotal)}
                </p>
                <span className="text-[11px] text-slate-400">
                  {approvedCount} facturas validadas por PM
                </span>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div>
                <span className="block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Pendientes de Revisión PM
                </span>
                <p className="mt-0.5 text-lg font-bold text-amber-600">{pendingCount} gastos</p>
                <span className="text-[11px] text-slate-400">Paso 1: Registrados en campo</span>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                <Clock className="h-6 w-6" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div>
                <span className="block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Control Presupuestario APU
                </span>
                <p className="mt-0.5 text-lg font-bold text-slate-900">Visto Bueno PM</p>
                <span className="text-[11px] font-medium text-blue-600">
                  Auditoría con firma y fecha
                </span>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <History className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Filter Tabs for Approval Workflow */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setStatusFilter('todos')}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === 'todos'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({projectExpenses.length})
              </button>
              <button
                onClick={() => setStatusFilter('pendientes')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === 'pendientes'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Pendientes de Aprobación PM ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('aprobados')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === 'aprobados'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Aprobados ({approvedCount})
              </button>
            </div>

            <span className="text-xs text-slate-500">
              Mostrando {filteredExpenses.length} de {projectExpenses.length} gastos
            </span>
          </div>

          {/* Expenses Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-500">
                  <tr>
                    <th className="p-3.5">Factura / Fecha</th>
                    <th className="p-3.5">Categoría / Renglón APU</th>
                    <th className="p-3.5">Proveedor & NIT</th>
                    <th className="p-3.5">Descripción</th>
                    <th className="p-3.5 text-center">Comprobante Físico</th>
                    <th className="p-3.5 text-center">Estado (Paso 2)</th>
                    <th className="p-3.5 text-right">Monto</th>
                    <th className="p-3.5 text-center">Acciones PM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredExpenses.map((ex) => {
                    const isApproved = ex.approvalStatus === 'Aprobado';
                    const isPending = ex.approvalStatus === 'Pendiente' || !ex.approvalStatus;
                    const isRejected = ex.approvalStatus === 'Rechazado';

                    // Check if this expense belongs to an APU item that is over budget
                    const assignedApu = budgetItems.find((b) => b.id === ex.assignedApuId);
                    let apuOverrun = false;
                    if (assignedApu) {
                      const totalSpentOnApu = projectExpenses
                        .filter((e) => e.assignedApuId === assignedApu.id)
                        .reduce((sum, e) => sum + e.amount, 0);
                      apuOverrun = totalSpentOnApu > assignedApu.totalPriceGTQ;
                    }

                    return (
                      <tr key={ex.id} className="transition hover:bg-slate-50/80">
                        <td className="p-3.5">
                          <span className="font-bold text-slate-900">{ex.facturaNumber}</span>
                          <p className="text-[10px] text-slate-500">{ex.date}</p>
                        </td>

                        <td className="space-y-1 p-3.5">
                          <span className="block w-fit rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {ex.category}
                          </span>
                          {assignedApu && (
                            <span
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                                apuOverrun
                                  ? 'border border-rose-200 bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                              title={assignedApu.description}
                            >
                              APU {assignedApu.code}
                              {apuOverrun && <AlertTriangle className="h-3 w-3 text-rose-600" />}
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span className="font-semibold text-slate-900">{ex.supplier}</span>
                          <p className="text-[10px] text-slate-500">NIT: {ex.nitSupplier}</p>
                        </td>

                        <td className="max-w-xs p-3.5">{ex.description}</td>

                        {/* Receipt column */}
                        <td className="p-3.5 text-center">
                          {ex.receiptPhotoUrl ? (
                            <button
                              type="button"
                              onClick={() => setViewingReceiptExpense(ex)}
                              className="group relative inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 transition hover:bg-slate-100"
                              title="Ver comprobante capturado"
                            >
                              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-slate-900">
                                <Image
                                  src={ex.receiptPhotoUrl}
                                  alt="Recibo"
                                  width={72}
                                  height={72}
                                  unoptimized
                                  className="h-full w-full object-cover transition group-hover:scale-105"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                                  <Eye className="h-3.5 w-3.5 text-white" />
                                </div>
                              </div>
                              <div className="hidden pr-1 text-left sm:block">
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-800">
                                  <Receipt className="h-3 w-3 text-emerald-600" /> Ver
                                </span>
                              </div>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setCameraTargetExpenseId(ex.id);
                                setIsCameraOpen(true);
                              }}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100"
                              title="Tomar fotografía del recibo físico con la cámara del dispositivo"
                            >
                              <Camera className="h-3.5 w-3.5 text-amber-600" />
                              <span>Foto</span>
                            </button>
                          )}
                        </td>

                        {/* Two-step Approval Status Column */}
                        <td className="p-3.5 text-center">
                          {isApproved ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                <ShieldCheck className="h-3 w-3 text-emerald-600" /> Aprobado (Paso
                                2)
                              </span>
                              {ex.approvedBy && (
                                <p className="max-w-[120px] truncate text-[9px] text-slate-400">
                                  {ex.approvedBy}
                                </p>
                              )}
                            </div>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                              <Ban className="h-3 w-3 text-rose-600" /> Rechazado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              <Clock className="h-3 w-3 text-amber-600" /> Pendiente PM
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right font-bold text-slate-900">
                          {formatMoney(ex.amount)}
                        </td>

                        {/* Project Manager Actions & Audit Trail */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setApprovalModalExpense(ex);
                                setApprovalDecision(isApproved ? 'Pendiente' : 'Aprobado');
                              }}
                              className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-xs transition ${
                                isApproved
                                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
                              }`}
                              title={
                                isApproved
                                  ? 'Cambiar estado de aprobación'
                                  : 'Aprobar gasto como Project Manager'
                              }
                            >
                              {isApproved ? 'Modificar' : 'Aprobar PM'}
                            </button>

                            <button
                              type="button"
                              onClick={() => setViewingAuditExpense(ex)}
                              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                              title="Ver Pista de Auditoría Completa"
                            >
                              <FileSearch className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal: Two-Step Approval by Project Manager */}
      {approvalModalExpense && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs duration-150">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold">Aprobación de Gasto por Project Manager</h3>
              </div>
              <button
                onClick={() => setApprovalModalExpense(null)}
                className="rounded-lg p-1 text-slate-400 transition hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Factura: {approvalModalExpense.facturaNumber}</span>
                  <span className="text-blue-600">{formatMoney(approvalModalExpense.amount)}</span>
                </div>
                <p className="text-slate-600">{approvalModalExpense.description}</p>
                <p className="text-[11px] text-slate-400">
                  Proveedor: {approvalModalExpense.supplier}
                </p>
                {approvalModalExpense.assignedApuId && (
                  <p className="border-t border-slate-200 pt-1 font-mono text-[11px] text-slate-700">
                    Renglón Asignado: {approvalModalExpense.assignedApuId}
                  </p>
                )}
              </div>

              {/* Approval Decision Selection */}
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wider text-slate-700 uppercase">
                  Decisión del Project Manager (Paso 2)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovalDecision('Aprobado')}
                    className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      approvalDecision === 'Aprobado'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" /> Aprobar
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalDecision('Pendiente')}
                    className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      approvalDecision === 'Pendiente'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" /> Pendiente
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalDecision('Rechazado')}
                    className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      approvalDecision === 'Rechazado'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Ban className="h-3.5 w-3.5" /> Rechazar
                  </button>
                </div>
              </div>

              {/* PM Name */}
              <div>
                <label className="mb-1 block text-xs font-bold tracking-wider text-slate-700 uppercase">
                  Nombre del Project Manager / Auditor
                </label>
                <input
                  type="text"
                  value={pmName}
                  onChange={(e) => setPmName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:bg-white"
                  required
                />
              </div>

              {/* Note / Audit Observation */}
              <div>
                <label className="mb-1 block text-xs font-bold tracking-wider text-slate-700 uppercase">
                  Observación para Pista de Auditoría
                </label>
                <textarea
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="Ej. Verificado físicamente contra entrega en obra y renglón APU correspondiente."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovalModalExpense(null)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  Guardar Decisión en Auditoría
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Audit Trail Inspector */}
      {viewingAuditExpense && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs duration-150">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold sm:text-base">Pista de Auditoría del Gasto</h3>
                  <p className="text-[11px] text-slate-400">
                    Factura {viewingAuditExpense.facturaNumber} •{' '}
                    {formatMoney(viewingAuditExpense.amount)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingAuditExpense(null)}
                className="rounded-lg p-1 text-slate-400 transition hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p>
                  <strong>Descripción:</strong> {viewingAuditExpense.description}
                </p>
                <p>
                  <strong>Proveedor:</strong> {viewingAuditExpense.supplier} (NIT:{' '}
                  {viewingAuditExpense.nitSupplier})
                </p>
                <p>
                  <strong>Estado Actual:</strong>{' '}
                  <span className="font-bold text-blue-600">
                    {viewingAuditExpense.approvalStatus || 'Pendiente'}
                  </span>
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-800 uppercase">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  Línea de Tiempo Inalterable
                </h4>

                {viewingAuditExpense.auditTrail && viewingAuditExpense.auditTrail.length > 0 ? (
                  <div className="relative space-y-4 pl-6 before:absolute before:top-2 before:bottom-2 before:left-2 before:w-0.5 before:bg-slate-200">
                    {viewingAuditExpense.auditTrail.map((entry, idx) => (
                      <div key={entry.id || idx} className="relative space-y-1 text-xs">
                        <div
                          className={`absolute top-0.5 -left-6 h-4 w-4 rounded-full border-2 border-white ${
                            entry.action === 'APROBADO'
                              ? 'bg-emerald-500 ring-2 ring-emerald-100'
                              : entry.action === 'RECHAZADO'
                                ? 'bg-rose-500 ring-2 ring-rose-100'
                                : 'bg-blue-500 ring-2 ring-blue-100'
                          }`}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            {entry.action === 'CREADO' && 'Paso 1: Registro Inicial de Gasto'}
                            {entry.action === 'ENVIADO_A_REVISION' &&
                              'Enviado a Revisión Presupuestaria'}
                            {entry.action === 'APROBADO' && 'Paso 2: Aprobado por Project Manager'}
                            {entry.action === 'RECHAZADO' && 'Rechazado por Project Manager'}
                            {entry.action === 'REVERTIDO' && 'Revertido a Pendiente'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {entry.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Por: <strong className="text-slate-800">{entry.user}</strong> (
                          {entry.role})
                        </p>
                        {entry.note && (
                          <p className="rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-500 italic">
                            &quot;{entry.note}&quot;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No hay registros de auditoría anteriores.
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewingAuditExpense(null)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Nuevo Gasto con Cámara y APU Check */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold">Registrar Gasto o Factura FEL</h3>
              </div>
              <button
                onClick={() => setIsOpenModal(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 space-y-3 overflow-y-auto p-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Categoría de Gasto
                </label>
                <select
                  value={category}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setCategory(e.target.value as typeof category)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                >
                  <option value="Materiales (Cementos, Hierro)">
                    Materiales (Cementos, Hierro)
                  </option>
                  <option value="Mano de Obra">Mano de Obra</option>
                  <option value="Maquinaria y Combustible">Maquinaria y Combustible</option>
                  <option value="Permisos & Licencias">Permisos & Licencias</option>
                  <option value="Imprevistos">Imprevistos</option>
                </select>
              </div>

              {/* APU Budget Item Selection */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Renglón de Presupuesto APU Asignado
                </label>
                <select
                  value={assignedApuId}
                  onChange={(e) => {
                    const newApuId = e.target.value;
                    setAssignedApuId(newApuId);
                    const overrun = checkApuOverrun(newApuId, Number(amount) || 0);
                    if (overrun) {
                      setWarningToast({
                        message: `¡Alerta de Presupuesto! El monto de Q${amount} excede el renglón ${overrun.apuCode}.`,
                        diff: overrun.diff,
                        apuCode: overrun.apuCode,
                        budgetTotal: overrun.budgetTotal,
                        spentTotal: overrun.projectedTotal,
                      });
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium"
                >
                  {budgetItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.description} ({formatGTQ(item.totalPriceGTQ)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Ej. Discosa S.A."
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    NIT Proveedor
                  </label>
                  <input
                    type="text"
                    value={nit}
                    onChange={(e) => setNit(e.target.value)}
                    placeholder="Ej. 1294821-9"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    No. Factura FEL
                  </label>
                  <input
                    type="text"
                    value={factura}
                    onChange={(e) => setFactura(e.target.value)}
                    placeholder="Ej. A-49201"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Monto (GTQ)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      const newAmt = e.target.value;
                      setAmount(newAmt);
                      const overrun = checkApuOverrun(assignedApuId, Number(newAmt) || 0);
                      if (overrun) {
                        setWarningToast({
                          message: `¡Alerta! El monto ingresado (Q${newAmt}) excede el presupuesto del renglón ${overrun.apuCode}.`,
                          diff: overrun.diff,
                          apuCode: overrun.apuCode,
                          budgetTotal: overrun.budgetTotal,
                          spentTotal: overrun.projectedTotal,
                        });
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Descripción del Insumo / Gasto
                </label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Ej. Compra de 250 bolsas de Cemento Progreso"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  required
                />
              </div>

              {/* Receipt / Invoice Photo Capture Section */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Comprobante Físico / Factura
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Cámara del dispositivo</span>
                </div>

                {isAnalyzing && (
                  <div className="flex animate-pulse items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"></div>
                    <span className="font-semibold">
                      Analizando factura con Gemini AI (Extrayendo proveedor, NIT y monto)...
                    </span>
                  </div>
                )}

                {newReceiptUrl ? (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2">
                    <div className="flex items-center gap-2.5">
                      <Image
                        src={newReceiptUrl}
                        alt="Preview recibo"
                        width={48}
                        height={48}
                        unoptimized
                        className="h-12 w-12 rounded-md border border-slate-300 object-cover"
                      />
                      <div className="text-xs">
                        <p className="flex items-center gap-1 font-bold text-slate-900">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Recibo Escaneado
                        </p>
                        <p className="text-[10px] text-slate-400">{newReceiptDate}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCameraTargetExpenseId(null);
                          setIsCameraOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-50 hover:text-blue-600"
                        title="Tomar foto de nuevo"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewReceiptUrl(null);
                          setNewReceiptDate(null);
                          setNewReceiptCoords(null);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        title="Quitar comprobante"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setCameraTargetExpenseId(null);
                        setIsCameraOpen(true);
                      }}
                      className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
                    >
                      <Camera className="h-4 w-4 text-amber-600" />
                      Tomar Foto del Recibo con Cámara
                    </button>
                    <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                      <Upload className="h-3.5 w-3.5" />
                      Subir Archivo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const result = reader.result as string;
                            setNewReceiptUrl(result);
                            setNewReceiptDate(new Date().toLocaleString('es-GT'));
                            analyzeReceiptWithAI(result);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  Registrar Gasto (Paso 1)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => {
          setIsCameraOpen(false);
          setCameraTargetExpenseId(null);
        }}
        onCapture={handleCaptureReceipt}
        mode="receipt"
        title="Capturar Comprobante / Factura con Cámara"
        subtitle="Alinee la factura física o ticket de compra dentro del marco y presione capturar."
        defaultLocation={{ lat: activeProject.lat, lng: activeProject.lng }}
        projectCode={activeProject.code}
      />

      {/* Lightbox / Inspector for Physical Receipt */}
      {viewingReceiptExpense && viewingReceiptExpense.receiptPhotoUrl && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm duration-150">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-3.5 text-white">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-bold">
                    Factura FEL {viewingReceiptExpense.facturaNumber} •{' '}
                    {viewingReceiptExpense.supplier}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    NIT: {viewingReceiptExpense.nitSupplier}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleDownloadReceipt(
                      viewingReceiptExpense.receiptPhotoUrl!,
                      `Recibo-${viewingReceiptExpense.facturaNumber}.jpg`
                    )
                  }
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  title="Descargar imagen"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewingReceiptExpense(null)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex max-h-[65vh] flex-1 items-center justify-center overflow-auto bg-black p-2">
              <Image
                src={viewingReceiptExpense.receiptPhotoUrl}
                alt="Comprobante físico"
                width={1200}
                height={900}
                unoptimized
                className="max-h-[60vh] w-auto rounded-lg object-contain"
              />
            </div>

            <div className="flex flex-col items-start justify-between gap-2 border-t border-slate-800 bg-slate-950 p-3 text-xs text-slate-300 sm:flex-row sm:items-center">
              <div>
                <span className="font-semibold text-white">
                  {viewingReceiptExpense.description}
                </span>
                <p className="text-[11px] text-slate-400">
                  Total: {formatMoney(viewingReceiptExpense.amount)} •{' '}
                  {viewingReceiptExpense.category}
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                {viewingReceiptExpense.receiptCoords && (
                  <p className="font-mono text-sky-400">
                    GPS: {viewingReceiptExpense.receiptCoords.lat.toFixed(4)}°N,{' '}
                    {viewingReceiptExpense.receiptCoords.lng.toFixed(4)}°W
                  </p>
                )}
                <p>{viewingReceiptExpense.receiptPhotoDate || viewingReceiptExpense.date}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
