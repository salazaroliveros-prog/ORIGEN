'use client';

import { CameraCaptureModal } from '@/components/CameraCaptureModal';
import { MonthlyExpensesHistogram } from '@/components/MonthlyExpensesHistogram';
import { formatGTQ, formatUSD } from '@/lib/data';
import { authFetch } from '@/lib/apiClient';
import {
  detectApuOverrun,
  sumApuSpent,
  toGTQAmount,
  type ApuOverrun,
} from '@/lib/domain/expenseBudget';
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
  FolderOpen,
  History,
  Lock,
  Plus,
  Receipt,
  RotateCw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/Input';

interface ExpensesManagerProps {
  expenses: ExpenseRecord[];
  projects: Project[];
  activeProjectId: string;
  /** Sin handler no se pueden registrar gastos: la UI se muestra en solo lectura. */
  onAddExpense?: (e: ExpenseRecord) => void | Promise<unknown>;
  onUpdateExpense?: (e: ExpenseRecord) => void | Promise<unknown>;
  currency: 'GTQ' | 'USD';
  company: CompanySettings;
  /**
   * Renglones APU del proyecto activo. Sin fallback a datos demo: si está vacío
   * el gasto se registra como gasto general del proyecto.
   */
  budgetItems?: APUItem[];
  /** Roles financieros. Si es false, el módulo es de solo lectura. */
  canWrite?: boolean;
  /** Navegación al tab de proyectos para el estado vacío. */
  onNavigateToProjects?: () => void;
  /**
   * Identidad real del usuario autenticado. La bitácora de auditoría y la firma
   * de aprobación deben registrar a una persona real, nunca un nombre fijo de
   * demostración.
   */
  auditUser?: { name: string; role: string } | null;
}

export function ExpensesManager({
  expenses,
  projects,
  activeProjectId,
  onAddExpense,
  onUpdateExpense,
  currency,
  company,
  budgetItems = [],
  canWrite = true,
  onNavigateToProjects,
  auditUser,
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
  const [amount, setAmount] = useState('');
  const [assignedApuId, setAssignedApuId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

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
  const [pmName, setPmName] = useState(auditUser?.name ?? '');

  // La sesión puede resolverse después del primer render: sincroniza el nombre
  // de quien firma sin pisar un valor ya escrito manualmente.
  useEffect(() => {
    setPmName((current) => (current.trim() ? current : (auditUser?.name ?? '')));
  }, [auditUser?.name]);

  const auditUserName = auditUser?.name?.trim() || 'Usuario autenticado';
  const auditUserRole = auditUser?.role?.trim() || 'Usuario autenticado';

  // Overrun warning toast
  const [warningToast, setWarningToast] = useState<{
    message: string;
    diff: number;
    apuCode: string;
    budgetTotal: number;
    spentTotal: number;
  } | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  // Si no hay proyecto activo, mostrar estado vacío en lugar de fallar
  if (!activeProject) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
            <FolderOpen className="h-6 w-6 text-slate-300" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-medium text-slate-100">Sin proyectos disponibles</h2>
          <p className="mt-1 text-sm text-slate-300">
            Crea un proyecto primero para registrar gastos y facturas.
          </p>
          {onNavigateToProjects && (
            <div className="mt-6">
              <button
                type="button"
                onClick={onNavigateToProjects}
                className="cursor-pointer rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-medium text-slate-100 hover:bg-slate-700"
              >
                Ir a Proyectos
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const formatMoney = (val: number) => {
    if (!company) return formatGTQ(val);
    return currency === 'GTQ' ? formatGTQ(val) : formatUSD(val, company.exchangeRate);
  };

  // Control de sobregasto por renglón APU (regla de dominio, sin datos demo).
  // Solo evalúa renglones del proyecto activo y excluye gastos rechazados.
  const checkApuOverrun = (
    apuId: string,
    additionalAmount: number,
    excludeExpenseId?: string
  ): ApuOverrun | null =>
    detectApuOverrun({
      apuItems: budgetItems,
      expenses,
      projectId: activeProject.id,
      apuId,
      additionalAmount,
      excludeExpenseId,
    });

  /** Convierte a GTQ (moneda de persistencia); null si el monto o la tasa no son válidos. */
  const toAmountGTQ = (rawAmount: number): number | null => {
    try {
      return toGTQAmount(rawAmount, currency, company?.exchangeRate ?? 0);
    } catch {
      return null;
    }
  };

  const analyzeReceiptWithAI = async (dataUrl: string) => {
    try {
      setIsAnalyzing(true);
      const res = await authFetch('/api/gemini/receipt', {
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
          // Check APU overrun (monto convertido a GTQ para comparar contra el APU)
          const amountGTQ = toAmountGTQ(Number(parsedAmt));
          const overrun = amountGTQ !== null ? checkApuOverrun(assignedApuId, amountGTQ) : null;
          if (overrun) {
            setWarningToast({
              message: `¡Alerta de Presupuesto APU! La factura detectada por IA de Q${amountGTQ?.toLocaleString('es-GT')} excede el renglón ${overrun.apuCode} (${overrun.apuDesc}).`,
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
      setCameraTargetExpenseId(null);

      if (!target) {
        toast.error('No se encontró el gasto al que intentabas adjuntar el comprobante.');
        return;
      }
      if (!onUpdateExpense) {
        // No descartar la foto en silencio: el usuario debe saber que no se guardó.
        toast.error('No tienes permiso para adjuntar comprobantes a gastos existentes.');
        return;
      }

      void onUpdateExpense({
        ...target,
        receiptPhotoUrl: dataUrl,
        receiptPhotoDate: meta.timestamp,
        receiptCoords: meta.coords,
      });
    } else {
      setNewReceiptUrl(dataUrl);
      setNewReceiptDate(meta.timestamp);
      setNewReceiptCoords(meta.coords || null);
      analyzeReceiptWithAI(dataUrl);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!onAddExpense) {
      setFormError('No tienes permiso para registrar gastos.');
      return;
    }
    if (!desc.trim()) {
      setFormError('La descripción del gasto es obligatoria.');
      return;
    }

    // `amount` se captura en la moneda de la UI y se persiste siempre en GTQ.
    // Nunca se inventa un monto por defecto.
    let numAmount: number;
    try {
      numAmount = toGTQAmount(Number(amount), currency, company?.exchangeRate ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Monto inválido.';
      setFormError(message);
      toast.error(message);
      return;
    }
    setFormError(null);

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
      id: `ex-${crypto.randomUUID()}`,
      projectId: activeProject.id,
      date: new Date().toISOString().split('T')[0],
      category,
      description: desc.trim(),
      supplier: supplier.trim(),
      nitSupplier: nit.trim(),
      facturaNumber: factura.trim(),
      amount: numAmount,
      currency: 'GTQ', // `amount` se persiste siempre en GTQ (ver toGTQAmount)
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
          user: auditUserName,
          role: auditUserRole,
          timestamp: nowStr,
          note: newReceiptUrl
            ? 'Comprobante físico capturado con cámara y validado con IA'
            : 'Registro manual de gasto en campo',
        },
        {
          id: `aud-${Date.now() + 1}-2`,
          action: 'ENVIADO_A_REVISION',
          user: auditUserName,
          role: auditUserRole,
          timestamp: nowStr,
          note: `Enviado al flujo de aprobación del Project Manager (Renglón APU: ${selectedApu?.code || 'General'})`,
        },
      ],
    };

    void onAddExpense(ex);
    setIsOpenModal(false);
    setDesc('');
    setSupplier('');
    setNit('');
    setFactura('');
    setAmount('');
    setAssignedApuId('');
    setNewReceiptUrl(null);
    setNewReceiptDate(null);
    setNewReceiptCoords(null);
  };

  // Two-Step Approval Submit Handler
  const handleConfirmApproval = () => {
    if (!approvalModalExpense) return;
    if (!onUpdateExpense) {
      toast.error('No tienes permiso para cambiar el estado de aprobación de gastos.');
      return;
    }
    if (!pmName.trim()) {
      toast.error('Indica el nombre del Project Manager que firma la aprobación.');
      return;
    }

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
      user: pmName.trim() || auditUserName,
      role: auditUserRole,
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
      approvedBy: isApproving ? pmName.trim() || auditUserName : undefined,
      approvedAt: isApproving ? nowStr : undefined,
      auditTrail: [...(approvalModalExpense.auditTrail || []), newAuditEntry],
    };

    void onUpdateExpense(updatedExpense);
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
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1 text-xs">
              <h4 className="flex items-center gap-2 text-sm font-bold text-rose-950">
                Alerta de Sobrecosto Presupuestario en Renglón APU {warningToast.apuCode}
                <span className="rounded bg-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-900">
                  Exceso: Q{warningToast.diff.toLocaleString('es-GT')}
                </span>
              </h4>
              <p className="font-medium leading-relaxed text-rose-800">{warningToast.message}</p>
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
          <p className="text-xs text-slate-300">
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
                  : 'text-slate-300 hover:text-slate-900'
              }`}
            >
              <Receipt className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              Facturas & Aprobación
            </button>
            <button
              onClick={() => setActiveExpenseTab('histograma')}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeExpenseTab === 'histograma'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Histograma Mensual & PDF
            </button>
          </div>

          {!canWrite || !onAddExpense ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-300">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Solo lectura
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setNewReceiptUrl(null);
                setIsOpenModal(true);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" /> Registrar Gasto / Factura
            </button>
          )}
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
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Total Ejecutado Aprobado
                </span>
                <p className="mt-0.5 text-lg font-bold text-emerald-600">
                  {formatMoney(approvedTotal)}
                </p>
                <span className="text-[11px] text-slate-300">
                  {approvedCount} facturas validadas por PM
                </span>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Pendientes de Revisión PM
                </span>
                <p className="mt-0.5 text-lg font-bold text-amber-600">{pendingCount} gastos</p>
                <span className="text-[11px] text-slate-300">Paso 1: Registrados en campo</span>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                <Clock className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Control Presupuestario APU
                </span>
                <p className="mt-0.5 text-lg font-bold text-slate-900">Visto Bueno PM</p>
                <span className="text-[11px] font-medium text-blue-600">
                  Auditoría con firma y fecha
                </span>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <History className="h-6 w-6" aria-hidden="true" />
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
                    : 'text-slate-300 hover:text-slate-900'
                }`}
              >
                Todos ({projectExpenses.length})
              </button>
              <button
                onClick={() => setStatusFilter('pendientes')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === 'pendientes'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-slate-900'
                }`}
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Pendientes de Aprobación PM ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('aprobados')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === 'aprobados'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Aprobados ({approvedCount})
              </button>
            </div>

            <span className="text-xs text-slate-300">
              Mostrando {filteredExpenses.length} de {projectExpenses.length} gastos
            </span>
          </div>

          {/* Expenses Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-300">
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
                <tbody className="divide-y divide-slate-100 text-slate-300">
                  {filteredExpenses.map((ex) => {
                    const isApproved = ex.approvalStatus === 'Aprobado';
                    const isRejected = ex.approvalStatus === 'Rechazado';

                    // Check if this expense belongs to an APU item that is over budget
                    const assignedApu = budgetItems.find((b) => b.id === ex.assignedApuId);
                    let apuOverrun = false;
                    if (assignedApu) {
                      // Los gastos rechazados no consumen presupuesto del renglón.
                      const totalSpentOnApu = sumApuSpent({
                        expenses: projectExpenses,
                        projectId: activeProject.id,
                        apuId: assignedApu.id,
                      });
                      apuOverrun = totalSpentOnApu > assignedApu.totalPriceGTQ;
                    }

                    return (
                      <tr key={ex.id} className="transition hover:bg-slate-50/80">
                        <td className="p-3.5">
                          <span className="font-bold text-slate-900">
                            {ex.facturaNumber || (ex.paymentReference ? `Ref. ${ex.paymentReference}` : 'Interno')}
                          </span>
                          <p className="text-[10px] text-slate-300">{ex.date}</p>
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
                                  : 'bg-slate-100 text-slate-300'
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
                          <p className="text-[10px] text-slate-300">NIT: {ex.nitSupplier || '—'}</p>
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
                                  <Eye className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                                </div>
                              </div>
                              <div className="hidden pr-1 text-left sm:block">
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-800">
                                  <Receipt className="h-3 w-3 text-emerald-600" /> Ver
                                </span>
                              </div>
                            </button>
                          ) : canWrite && onUpdateExpense ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCameraTargetExpenseId(ex.id);
                                setIsCameraOpen(true);
                              }}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100"
                              title="Tomar fotografía del recibo físico con la cámara del dispositivo"
                            >
                              <Camera className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                              <span>Foto</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-300">Sin comprobante</span>
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
                                <p className="max-w-[120px] truncate text-[9px] text-slate-300">
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
                            {canWrite && onUpdateExpense && !ex.subcontractPaymentId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setApprovalModalExpense(ex);
                                  setApprovalDecision(isApproved ? 'Pendiente' : 'Aprobado');
                                }}
                                className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-xs transition ${
                                  isApproved
                                    ? 'bg-slate-100 text-slate-300 hover:bg-slate-200'
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
                            )}

                            {!ex.subcontractPaymentId ? (
                              <button
                                type="button"
                                onClick={() => setViewingAuditExpense(ex)}
                                className="rounded-lg p-1.5 text-slate-300 transition hover:bg-blue-50 hover:text-blue-600"
                                title="Ver Pista de Auditoría Completa"
                              >
                                <FileSearch className="h-4 w-4" aria-hidden="true" />
                              </button>
                            ) : (
                              <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                                Pago conciliado
                              </span>
                            )}
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
                <ShieldCheck className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                <h3 className="text-base font-bold">Aprobación de Gasto por Project Manager</h3>
              </div>
              <button
                onClick={() => setApprovalModalExpense(null)}
                className="rounded-lg p-1 text-slate-300 transition hover:text-white"
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
                <p className="text-slate-300">{approvalModalExpense.description}</p>
                <p className="text-[11px] text-slate-300">
                  Proveedor: {approvalModalExpense.supplier}
                </p>
                {approvalModalExpense.assignedApuId && (
                  <p className="border-t border-slate-200 pt-1 font-mono text-[11px] text-slate-300">
                    Renglón Asignado: {approvalModalExpense.assignedApuId}
                  </p>
                )}
              </div>

              {/* Approval Decision Selection */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Decisión del Project Manager (Paso 2)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovalDecision('Aprobado')}
                    className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      approvalDecision === 'Aprobado'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
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
                        : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
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
                        : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Ban className="h-3.5 w-3.5" /> Rechazar
                  </button>
                </div>
              </div>

              {/* PM Name */}
              <div>
                <Input
                  label="Nombre del Project Manager / Auditor"
                  type="text"
                  value={pmName}
                  onChange={(e) => setPmName(e.target.value)}
                  required
                />
              </div>

              {/* Note / Audit Observation */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Observación para Pista de Auditoría
                </label>
                <textarea
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="Ej. Verificado físicamente contra entrega en obra y renglón APU correspondiente."
                  rows={3}
                  className="focus:ring-brand-400 w-full resize-none rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-white focus:ring-2"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovalModalExpense(null)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-200"
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
                <History className="h-5 w-5 text-blue-400" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-bold sm:text-base">Pista de Auditoría del Gasto</h3>
                  <p className="text-[11px] text-slate-300">
                    Factura {viewingAuditExpense.facturaNumber} •{' '}
                    {formatMoney(viewingAuditExpense.amount)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingAuditExpense(null)}
                className="rounded-lg p-1 text-slate-300 transition hover:text-white"
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
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                  <Clock className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                  Línea de Tiempo Inalterable
                </h4>

                {viewingAuditExpense.auditTrail && viewingAuditExpense.auditTrail.length > 0 ? (
                  <div className="relative space-y-4 pl-6 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-0.5 before:bg-slate-200">
                    {viewingAuditExpense.auditTrail.map((entry, idx) => (
                      <div key={entry.id || idx} className="relative space-y-1 text-xs">
                        <div
                          className={`absolute -left-6 top-0.5 h-4 w-4 rounded-full border-2 border-white ${
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
                          <span className="font-mono text-[10px] text-slate-300">
                            {entry.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Por: <strong className="text-slate-800">{entry.user}</strong> (
                          {entry.role})
                        </p>
                        {entry.note && (
                          <p className="rounded-lg border border-slate-200 bg-white p-2 text-[11px] italic text-slate-300">
                            &quot;{entry.note}&quot;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-300">
                    No hay registros de auditoría anteriores.
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewingAuditExpense(null)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-200"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Nuevo Gasto con Cámara y APU Check */}
      {isOpenModal && canWrite && onAddExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-amber-400" aria-hidden="true" />
                <h3 className="text-base font-bold">Registrar Gasto o Factura FEL</h3>
              </div>
              <button
                onClick={() => setIsOpenModal(false)}
                className="rounded-lg p-1 text-slate-300 transition hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 space-y-3 overflow-y-auto p-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Categoría de Gasto
                </label>
                <select
                  value={category}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setCategory(e.target.value as typeof category)
                  }
                  aria-label="Categoría de Gasto"
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
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Renglón de Presupuesto APU Asignado
                </label>
                <select
                  value={assignedApuId}
                  onChange={(e) => {
                    const newApuId = e.target.value;
                    setAssignedApuId(newApuId);
                    const amountGTQ = toAmountGTQ(Number(amount));
                    const overrun =
                      amountGTQ !== null ? checkApuOverrun(newApuId, amountGTQ) : null;
                    if (overrun) {
                      setWarningToast({
                        message: `¡Alerta de Presupuesto! El monto de Q${amountGTQ?.toLocaleString('es-GT')} excede el renglón ${overrun.apuCode}.`,
                        diff: overrun.diff,
                        apuCode: overrun.apuCode,
                        budgetTotal: overrun.budgetTotal,
                        spentTotal: overrun.projectedTotal,
                      });
                    }
                  }}
                  aria-label="Renglón de Presupuesto APU Asignado"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium"
                >
                  <option value="">Sin renglón APU (gasto general del proyecto)</option>
                  {budgetItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.description} ({formatGTQ(item.totalPriceGTQ)})
                    </option>
                  ))}
                </select>
                {budgetItems.length === 0 && (
                  <p className="mt-1 text-[11px] font-medium text-amber-700">
                    Este proyecto aún no tiene renglones APU registrados. El gasto se guardará como
                    gasto general y no se validará contra un presupuesto de renglón.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    label="Proveedor"
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Ej. Discosa S.A."
                    aria-label="Proveedor"
                    formTheme="light"
                    required
                  />
                </div>
                <div>
                  <Input
                    label="NIT Proveedor"
                    type="text"
                    value={nit}
                    onChange={(e) => setNit(e.target.value)}
                    placeholder="Ej. 1294821-9"
                    aria-label="NIT Proveedor"
                    formTheme="light"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    label="No. Factura FEL"
                    type="text"
                    value={factura}
                    onChange={(e) => setFactura(e.target.value)}
                    placeholder="Ej. A-49201"
                    aria-label="No. Factura FEL"
                    formTheme="light"
                    required
                  />
                </div>
                <div>
                  <Input
                    label={`Monto (${currency})`}
                    type="number"
                    value={amount}
                    min="0.01"
                    step="0.01"
                    onChange={(e) => {
                      const newAmt = e.target.value;
                      setAmount(newAmt);
                      const amountGTQ = toAmountGTQ(Number(newAmt));
                      const overrun =
                        amountGTQ !== null ? checkApuOverrun(assignedApuId, amountGTQ) : null;
                      if (overrun) {
                        setWarningToast({
                          message: `¡Alerta! El monto ingresado (Q${amountGTQ?.toLocaleString('es-GT')}) excede el presupuesto del renglón ${overrun.apuCode}.`,
                          diff: overrun.diff,
                          apuCode: overrun.apuCode,
                          budgetTotal: overrun.budgetTotal,
                          spentTotal: overrun.projectedTotal,
                        });
                      }
                    }}
                    placeholder="0.00"
                    aria-label={`Monto (${currency})`}
                    formTheme="light"
                    className="font-bold"
                    required
                  />
                  {currency === 'USD' && (
                    <p className="mt-1 text-[11px] text-slate-300">
                      Se convertirá a GTQ con el tipo de cambio configurado (
                      {company?.exchangeRate || 'sin configurar'} GTQ por USD).
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Input
                  label="Descripción del Insumo / Gasto"
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Ej. Compra de 250 bolsas de Cemento Progreso"
                  aria-label="Descripción del Insumo / Gasto"
                  formTheme="light"
                  required
                />
              </div>

              {/* Receipt / Invoice Photo Capture Section */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-amber-600" aria-hidden="true" />
                    <span className="text-xs font-bold text-slate-800">
                      Comprobante Físico / Factura
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-300">Cámara del dispositivo</span>
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
                        <p className="text-[10px] text-slate-300">{newReceiptDate}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCameraTargetExpenseId(null);
                          setIsCameraOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-50 hover:text-blue-600"
                        title="Tomar foto de nuevo"
                      >
                        <RotateCw className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewReceiptUrl(null);
                          setNewReceiptDate(null);
                          setNewReceiptCoords(null);
                        }}
                        className="rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"
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
                      <Camera className="h-4 w-4 text-amber-600" aria-hidden="true" />
                      Tomar Foto del Recibo con Cámara
                    </button>
                    <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-100">
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
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

              {formError && (
                <p
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"
                >
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-300 hover:bg-slate-200"
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
                <Receipt className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <div>
                  <h4 className="text-xs font-bold">
                    Factura FEL {viewingReceiptExpense.facturaNumber} •{' '}
                    {viewingReceiptExpense.supplier}
                  </h4>
                  <p className="text-[10px] text-slate-300">
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
                  className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  title="Descargar imagen"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setViewingReceiptExpense(null)}
                  className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-800 hover:text-white"
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
                <p className="text-[11px] text-slate-300">
                  Total: {formatMoney(viewingReceiptExpense.amount)} •{' '}
                  {viewingReceiptExpense.category}
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-300">
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
