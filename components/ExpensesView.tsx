'use client';

import Image from 'next/image';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Filter,
  Search,
  Building,
  Calendar,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Printer,
  Trash2,
  Eye,
  X,
  Upload,
  CheckCircle2,
  Tag,
  FileSpreadsheet,
  PieChart,
  BarChart3,
  Building2,
  Layers,
  Sparkles,
  AlertCircle,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import { Project, ExpenseRecord, CompanySettings } from '@/lib/types';
import { formatGTQ, formatUSD } from '@/lib/data';
import { MonthlyExpensesHistogram } from '@/components/MonthlyExpensesHistogram';
import { exportExpensesBudgetPdf } from '@/lib/pdfExportService';
import { exportExpensesToExcel } from '@/lib/excelAccountingExport';

const getGuatemalaDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
const getGuatemalaMonth = () => getGuatemalaDate().slice(0, 7);

export interface ExpensesViewProps {
  projects: Project[];
  expenses: ExpenseRecord[];
  company: CompanySettings;
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onAddExpense?: (expense: ExpenseRecord) => Promise<boolean>;
  onDeleteExpense?: (expenseId: string) => Promise<boolean>;
}

export function ExpensesView({
  projects,
  expenses = [],
  company,
  activeProjectId,
  onSelectProject,
  onAddExpense,
  onDeleteExpense,
}: ExpensesViewProps) {
  // Navigation tabs: List vs Form vs Monthly Summary
  const [activeTab, setActiveTab] = useState<'tabla' | 'nuevo' | 'resumen'>('tabla');

  // Filters state
  const [showAllProjects, setShowAllProjects] = useState(false);
  const selectedProjectId = showAllProjects ? 'todos' : activeProjectId;
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(getGuatemalaMonth);

  // Modal image preview
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Form State
  const [formDate, setFormDate] = useState<string>(getGuatemalaDate);
  const [formCategory, setFormCategory] = useState<ExpenseRecord['category']>(
    'Materiales (Cementos, Hierro)'
  );
  const [formDescription, setFormDescription] = useState<string>('');
  const [formSupplier, setFormSupplier] = useState<string>('');
  const [formNitSupplier, setFormNitSupplier] = useState<string>('');
  const [formFacturaNumber, setFormFacturaNumber] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCurrency, setFormCurrency] = useState<'GTQ' | 'USD'>('GTQ');
  const [formPaymentMethod, setFormPaymentMethod] =
    useState<ExpenseRecord['paymentMethod']>('Transferencia BI');
  const [formReceiptPhotoUrl, setFormReceiptPhotoUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const activeProjects = useMemo(
    () => projects.filter((project) => project.status !== 'Archivado'),
    [projects]
  );
  const projectsWithExpensesCount = useMemo(() => {
    const activeProjectIds = new Set(activeProjects.map((project) => project.id));
    return new Set(
      expenses
        .filter((expense) => activeProjectIds.has(expense.projectId))
        .map((expense) => expense.projectId)
    ).size;
  }, [activeProjects, expenses]);

  useEffect(() => {
    if (!onAddExpense && activeTab === 'nuevo') setActiveTab('tabla');
  }, [activeTab, onAddExpense]);

  // Export PDF state
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const categoriesList = useMemo<ExpenseRecord['category'][]>(
    () => [
      'Materiales (Cementos, Hierro)',
      'Mano de Obra',
      'Maquinaria y Combustible',
      'Permisos & Licencias',
      'Imprevistos',
    ],
    []
  );

  // Map project ID to project object
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((ex) => {
      // Filter by Project
      if (selectedProjectId !== 'todos' && ex.projectId !== selectedProjectId) {
        return false;
      }
      // Filter by Category
      if (selectedCategory !== 'todas' && ex.category !== selectedCategory) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDesc = ex.description.toLowerCase().includes(q);
        const matchesSupplier = ex.supplier.toLowerCase().includes(q);
        const matchesNit = ex.nitSupplier.toLowerCase().includes(q);
        const matchesFactura = ex.facturaNumber.toLowerCase().includes(q);
        const matchesAmount = ex.amount.toString().includes(q);
        if (!matchesDesc && !matchesSupplier && !matchesNit && !matchesFactura && !matchesAmount) {
          return false;
        }
      }
      return true;
    });
  }, [expenses, selectedProjectId, selectedCategory, searchQuery]);

  // Total amount of filtered expenses
  const totalFilteredAmountGTQ = useMemo(() => {
    return filteredExpenses.reduce((sum, ex) => sum + ex.amount, 0);
  }, [filteredExpenses]);

  // Monthly summary calculations based on selectedMonthYear (YYYY-MM)
  const monthlyExpenses = useMemo(() => {
    return expenses.filter((ex) => {
      if (!ex.date) return false;
      const exMonth = ex.date.substring(0, 7); // 'YYYY-MM'
      const matchesProject = selectedProjectId === 'todos' || ex.projectId === selectedProjectId;
      return matchesProject && exMonth === selectedMonthYear;
    });
  }, [expenses, selectedMonthYear, selectedProjectId]);

  // Monthly totals by category
  const monthlyCategoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    categoriesList.forEach((cat) => (map[cat] = 0));

    monthlyExpenses.forEach((ex) => {
      const cat = ex.category || 'Imprevistos';
      map[cat] = (map[cat] || 0) + ex.amount;
    });

    const total = monthlyExpenses.reduce((sum, ex) => sum + ex.amount, 0);

    return {
      map,
      total,
      ivaCredit: Math.round((total / 1.12) * 0.12 * 100) / 100, // SAT 12% IVA
      subtotalNet: Math.round((total / 1.12) * 100) / 100,
    };
  }, [monthlyExpenses, categoriesList]);

  // Image Upload Handler
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormReceiptPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Expense Form Handler
  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim() || !formAmount || Number(formAmount) <= 0) {
      alert('Por favor complete la descripción y un monto válido mayor a Q0.00.');
      return;
    }
    if (!activeProjects.some((project) => project.id === activeProjectId)) {
      setSaveError('Selecciona un proyecto válido antes de registrar el gasto.');
      return;
    }
    if (!onAddExpense) {
      setSaveError('El registro de gastos no está disponible en este momento.');
      return;
    }
    if (
      formCurrency === 'USD' &&
      (!Number.isFinite(company.exchangeRate) || company.exchangeRate <= 0)
    ) {
      setSaveError(
        'Configura un tipo de cambio válido en la configuración de empresa antes de registrar gastos en USD.'
      );
      return;
    }

    setIsSubmitting(true);
    setSaveError(null);

    const amountGTQ =
      formCurrency === 'GTQ' ? Number(formAmount) : Number(formAmount) * company.exchangeRate;

    const newExpense: ExpenseRecord = {
      id: `ex-${Date.now()}`,
      projectId: activeProjectId,
      date: formDate,
      category: formCategory,
      description: formDescription,
      supplier: formSupplier.trim(),
      nitSupplier: formNitSupplier.trim(),
      facturaNumber: formFacturaNumber.trim(),
      amount: amountGTQ,
      currency: formCurrency,
      paymentMethod: formPaymentMethod,
      ...(formReceiptPhotoUrl ? { receiptPhotoUrl: formReceiptPhotoUrl } : {}),
      approvalStatus: 'Pendiente',
    };

    try {
      const saved = await onAddExpense(newExpense);
      if (!saved) {
        setSaveError('No se pudo guardar el gasto. Verifica tu sesión e inténtalo de nuevo.');
        return;
      }

      setFormDescription('');
      setFormSupplier('');
      setFormNitSupplier('');
      setFormFacturaNumber('');
      setFormAmount('');
      setFormReceiptPhotoUrl('');
      setActiveTab('tabla');
    } catch (error) {
      console.error('No se pudo registrar el gasto:', error);
      setSaveError(
        'Ocurrió un error al guardar. Conservamos los datos para que puedas intentarlo de nuevo.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export PDF Summary Function
  const handleExportPdfSummary = async () => {
    try {
      setIsExportingPdf(true);
      await exportExpensesBudgetPdf({
        projects,
        selectedProject:
          selectedProjectId !== 'todos' ? projectMap.get(selectedProjectId) || null : null,
        expenses,
        monthlyData: [],
        company,
        currency: 'GTQ',
      });
    } catch (err) {
      console.error('Error al exportar PDF de gastos:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export Excel Summary Function
  const handleExportExcelSummary = () => {
    const targetProject =
      selectedProjectId !== 'todos'
        ? projectMap.get(selectedProjectId) || projects[0]
        : projects[0];
    if (targetProject) {
      exportExpensesToExcel({
        project: targetProject,
        expenses: filteredExpenses,
        company,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <span className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-amber-600">
            <Receipt className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Gestión de Gastos, Comprobantes & Facturas SAT
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Control financiero de egresos de obra, IVA acreditable, proveedores y liquidaciones
              por proyecto.
            </p>
          </div>
        </div>

        {/* Primary Tab Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('tabla')}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'tabla'
                  ? 'bg-white font-bold text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              Listado de Gastos
            </button>
            {onAddExpense && (
              <button
                type="button"
                onClick={() => setActiveTab('nuevo')}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  activeTab === 'nuevo'
                    ? 'bg-amber-500 font-bold text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo Gasto / Factura
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('resumen')}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'resumen'
                  ? 'bg-blue-600 font-bold text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Resumen Mensual
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: TABLA Y REGISTRO DE GASTOS */}
      {/* ======================================================== */}
      {activeTab === 'tabla' && (
        <div className="space-y-4">
          {/* KPI Summary Banner */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Total Gastos Filtrados
              </p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">
                {formatGTQ(totalFilteredAmountGTQ)}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {filteredExpenses.length} registros mostrados
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-[10px] font-bold tracking-wider text-blue-600 uppercase">
                Crédito Fiscal IVA (12%)
              </p>
              <p className="mt-1 text-xl font-extrabold text-blue-700">
                {formatGTQ((totalFilteredAmountGTQ / 1.12) * 0.12)}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">IVA acreditable en la SAT</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase">
                Subtotal Neto de Materiales
              </p>
              <p className="mt-1 text-xl font-extrabold text-emerald-700">
                {formatGTQ(
                  filteredExpenses
                    .filter((e) => e.category === 'Materiales (Cementos, Hierro)')
                    .reduce((sum, e) => sum + e.amount, 0)
                )}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">Insumos de construcción</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-[10px] font-bold tracking-wider text-amber-600 uppercase">
                Proyectos con Egreso
              </p>
              <p className="mt-1 text-xl font-extrabold text-amber-700">
                {projectsWithExpensesCount} proyectos
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">Control presupuestario</p>
            </div>
          </div>

          {/* Controls Bar: Filters & Search */}
          <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Project Filter */}
              <div className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Proyecto:</span>
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    const projectId = e.target.value;
                    setShowAllProjects(projectId === 'todos');
                    if (projectId !== 'todos') onSelectProject(projectId);
                  }}
                  className="cursor-pointer rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="todos">Todos los Proyectos ({activeProjects.length})</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code || p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="hidden h-4 w-px bg-slate-200 sm:block" />

              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Categoría:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="cursor-pointer rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800"
                >
                  <option value="todas">Todas las categorías</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Input & Action Buttons */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por proveedor, NIT, factura..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-1.5 pr-7 pl-8 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute top-2 right-2.5 cursor-pointer text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleExportExcelSummary}
                className="shrink-0 cursor-pointer rounded-xl bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200"
                title="Exportar registros a Excel Contable"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              </button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-700 uppercase">
                  <tr>
                    <th className="border-r border-slate-200 p-3">Fecha</th>
                    <th className="border-r border-slate-200 p-3">Proyecto</th>
                    <th className="border-r border-slate-200 p-3">Categoría</th>
                    <th className="border-r border-slate-200 p-3">Descripción / Insumo</th>
                    <th className="border-r border-slate-200 p-3">Proveedor & NIT</th>
                    <th className="border-r border-slate-200 p-3">No. Factura</th>
                    <th className="border-r border-slate-200 p-3 text-center">Comprobante</th>
                    <th className="border-r border-slate-200 bg-slate-200/60 p-3 text-right font-black text-slate-900">
                      Monto (GTQ)
                    </th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredExpenses.map((ex) => {
                    const proj = projectMap.get(ex.projectId);
                    return (
                      <tr key={ex.id} className="transition hover:bg-slate-50">
                        <td className="border-r border-slate-200 p-3 font-mono whitespace-nowrap text-slate-600">
                          {ex.date}
                        </td>
                        <td className="border-r border-slate-200 p-3 font-bold whitespace-nowrap text-slate-800">
                          {proj ? proj.name : ex.projectId}
                        </td>
                        <td className="border-r border-slate-200 p-3 whitespace-nowrap">
                          <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                            {ex.category}
                          </span>
                        </td>
                        <td className="max-w-xs border-r border-slate-200 p-3 font-medium text-slate-900">
                          {ex.description}
                        </td>
                        <td className="border-r border-slate-200 p-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{ex.supplier}</div>
                          <div className="font-mono text-[10px] text-slate-400">
                            NIT: {ex.nitSupplier}
                          </div>
                        </td>
                        <td className="border-r border-slate-200 p-3 font-mono whitespace-nowrap text-slate-700">
                          {ex.facturaNumber}
                        </td>
                        <td className="border-r border-slate-200 p-3 text-center whitespace-nowrap">
                          {ex.receiptPhotoUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewPhotoUrl(ex.receiptPhotoUrl || null)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 transition hover:bg-blue-100"
                            >
                              <Eye className="h-3 w-3" /> Ver Foto
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">Sin foto</span>
                          )}
                        </td>
                        <td className="border-r border-slate-200 bg-slate-50 p-3 text-right font-mono text-sm font-black text-slate-900">
                          {formatGTQ(ex.amount)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {onDeleteExpense && (
                            <button
                              type="button"
                              onClick={() => onDeleteExpense(ex.id)}
                              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              title="Eliminar registro"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No hay gastos registrados que coincidan con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                  <tr className="bg-slate-200/90 text-[12px]">
                    <td className="border-r border-slate-300 p-3.5 font-black" colSpan={7}>
                      TOTAL DE GASTOS FILTRADOS ({filteredExpenses.length} FACTURAS / COMPROBANTES)
                    </td>
                    <td className="border-r border-slate-300 p-3.5 text-right font-mono text-base font-black text-slate-950">
                      {formatGTQ(totalFilteredAmountGTQ)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: FORMULARIO DE ENTRADA DE NUEVO GASTO / FACTURA */}
      {/* ======================================================== */}
      {activeTab === 'nuevo' && (
        <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="rounded-xl bg-amber-500 p-2 font-bold text-slate-950">
                <Plus className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Registro Formulario de Factura SAT / Comprobante
                </h3>
                <p className="text-xs text-slate-500">
                  Ingrese los datos contables del gasto para imputación a presupuesto de obra.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitExpense} className="space-y-4 text-xs">
            {activeProjects.length === 0 && (
              <p
                role="status"
                className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-950"
              >
                Crea un proyecto antes de registrar gastos; cada factura debe asignarse a una obra.
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="expense-project" className="mb-1 block font-bold text-slate-700">
                  Proyecto Asignado *
                </label>
                <select
                  id="expense-project"
                  value={activeProjectId}
                  onChange={(e) => onSelectProject(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-bold text-slate-800"
                  required
                  disabled={activeProjects.length === 0}
                >
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code || p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="expense-date" className="mb-1 block font-bold text-slate-700">
                  Fecha de Emisión / Factura *
                </label>
                <input
                  id="expense-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-slate-900"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="expense-category" className="mb-1 block font-bold text-slate-700">
                  Categoría del Gasto *
                </label>
                <select
                  id="expense-category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-medium text-slate-900"
                  required
                >
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="expense-payment-method"
                  className="mb-1 block font-bold text-slate-700"
                >
                  Método de Pago *
                </label>
                <select
                  id="expense-payment-method"
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-medium text-slate-900"
                >
                  <option value="Pendiente">Pendiente de pago</option>
                  <option value="Transferencia BI">Transferencia Bancaria BI / G&T</option>
                  <option value="Cheque">Cheque de Cuenta de Obra</option>
                  <option value="Efectivo">Efectivo / Caja Chica de Obra</option>
                  <option value="Tarjeta">Tarjeta Corporativa</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="expense-description" className="mb-1 block font-bold text-slate-700">
                Descripción Detallada del Insumo o Servicio *
              </label>
              <textarea
                id="expense-description"
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ej. Compra de 150 bolsas de cemento Progreso IP para fundición de losa Nivel 2..."
                className="min-h-20 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 placeholder:text-slate-600"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="expense-supplier" className="mb-1 block font-bold text-slate-700">
                  Proveedor / Emisor SAT
                </label>
                <input
                  id="expense-supplier"
                  type="text"
                  placeholder="Ej. Discosa S.A. / Cemento Progreso"
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label
                  htmlFor="expense-supplier-nit"
                  className="mb-1 block font-bold text-slate-700"
                >
                  NIT del Proveedor
                </label>
                <input
                  id="expense-supplier-nit"
                  type="text"
                  placeholder="Ej. 1294821-9 o CF"
                  value={formNitSupplier}
                  onChange={(e) => setFormNitSupplier(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-slate-900 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label
                  htmlFor="expense-invoice-number"
                  className="mb-1 block font-bold text-slate-700"
                >
                  No. Factura SAT Serie/Número
                </label>
                <input
                  id="expense-invoice-number"
                  type="text"
                  placeholder="Ej. A-49201 / FEL-8812"
                  value={formFacturaNumber}
                  onChange={(e) => setFormFacturaNumber(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-slate-900 placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="expense-amount" className="mb-1 block font-bold text-slate-700">
                  Monto del Gasto *
                </label>
                <div className="flex gap-2">
                  <select
                    aria-label="Moneda del gasto"
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value as any)}
                    className="min-h-11 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 font-bold text-slate-900"
                  >
                    <option value="GTQ">GTQ (Q)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                  <input
                    id="expense-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-base font-bold text-slate-900 placeholder:text-slate-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="expense-receipt-photo"
                  className="mb-1 block font-bold text-slate-700"
                >
                  Fotografía o Foto de Factura
                </label>
                <input
                  id="expense-receipt-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="min-h-11 w-full cursor-pointer text-xs text-slate-700 file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-amber-100 file:px-4 file:py-2 file:text-xs file:font-bold file:text-amber-900 hover:file:bg-amber-200"
                />
              </div>
            </div>

            {formReceiptPhotoUrl && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Image
                  src={formReceiptPhotoUrl}
                  alt="Vista previa factura"
                  width={64}
                  height={64}
                  unoptimized
                  className="h-16 w-16 rounded-lg border border-slate-300 object-cover"
                />
                <div className="text-xs">
                  <span className="block font-bold text-slate-800">
                    Comprobante adjunto correctamente
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormReceiptPhotoUrl('')}
                    className="mt-1 cursor-pointer text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    Remover foto
                  </button>
                </div>
              </div>
            )}

            {saveError && (
              <p
                role="alert"
                className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-900"
              >
                {saveError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('tabla')}
                className="min-h-11 cursor-pointer rounded-xl bg-slate-100 px-4 py-2.5 font-bold text-slate-700 transition hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || activeProjects.length === 0}
                className="min-h-11 cursor-pointer rounded-xl bg-amber-500 px-6 py-2.5 font-extrabold text-slate-950 shadow-xs transition hover:bg-amber-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar y Registrar Gasto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: RESUMEN MENSUAL DE GASTOS */}
      {/* ======================================================== */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          {/* Controls Header for Monthly Summary */}
          <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-blue-50 p-2 font-bold text-blue-700">
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Resumen Mensual de Egresos & Análisis de Desviaciones
                </h3>
                <p className="text-xs text-slate-500">
                  Consolidado periódico por categoría, crédito de IVA e historial de gastos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold whitespace-nowrap text-slate-700">
                Mes Evaluado:
              </span>
              <input
                type="month"
                value={selectedMonthYear}
                onChange={(e) => setSelectedMonthYear(e.target.value)}
                className="cursor-pointer rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800"
              />

              <button
                type="button"
                onClick={handleExportPdfSummary}
                disabled={isExportingPdf}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-extrabold text-white transition hover:bg-rose-500 disabled:opacity-50"
              >
                <FileText className="h-3.5 w-3.5" />
                {isExportingPdf ? 'Exportando...' : 'PDF Resumen'}
              </button>
            </div>
          </div>

          {/* Monthly KPI Summary Bar */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-white shadow-xs">
              <span className="block text-xs font-bold tracking-wider text-slate-400 uppercase">
                Total Gastado en el Mes ({selectedMonthYear})
              </span>
              <p className="font-mono text-2xl font-black text-amber-400">
                {formatGTQ(monthlyCategoryTotals.total)}
              </p>
              <p className="text-[11px] text-slate-400">
                {monthlyExpenses.length} Facturas / Comprobantes auditables
              </p>
            </div>

            <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="block text-xs font-bold tracking-wider text-slate-500 uppercase">
                Subtotal Neto (Sin IVA)
              </span>
              <p className="font-mono text-2xl font-black text-slate-900">
                {formatGTQ(monthlyCategoryTotals.subtotalNet)}
              </p>
              <p className="text-[11px] text-slate-400">Materia imponible neta</p>
            </div>

            <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="block text-xs font-bold tracking-wider text-blue-600 uppercase">
                Crédito Fiscal IVA SAT (12%)
              </span>
              <p className="font-mono text-2xl font-black text-blue-700">
                {formatGTQ(monthlyCategoryTotals.ivaCredit)}
              </p>
              <p className="text-[11px] text-slate-400">IVA deductible por facturas FEL</p>
            </div>
          </div>

          {/* Monthly Breakdown by Category */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <PieChart className="h-4 w-4 text-amber-600" />
              Desglose de Gastos Mensuales por Categoría
            </h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoriesList.map((cat) => {
                const amount = monthlyCategoryTotals.map[cat] || 0;
                const pct =
                  monthlyCategoryTotals.total > 0
                    ? Math.round((amount / monthlyCategoryTotals.total) * 100)
                    : 0;

                return (
                  <div
                    key={cat}
                    className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-bold text-slate-800">{cat}</span>
                      <span className="font-mono text-xs font-bold text-slate-600">{pct}%</span>
                    </div>
                    <p className="font-mono text-lg font-extrabold text-slate-900">
                      {formatGTQ(amount)}
                    </p>

                    {/* Progress Bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Histogram Component */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <MonthlyExpensesHistogram
              projects={projects}
              activeProjectId={selectedProjectId !== 'todos' ? selectedProjectId : undefined}
              expenses={expenses}
              company={company}
              currency="GTQ"
            />
          </div>
        </div>
      )}

      {/* Modal for Photo Preview */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-sm font-bold text-slate-900">
                Vista Previa de Comprobante / Factura
              </h4>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="cursor-pointer p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex max-h-[70vh] items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              <Image
                src={previewPhotoUrl}
                alt="Factura SAT"
                width={1200}
                height={900}
                unoptimized
                className="max-h-[65vh] w-auto object-contain"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpensesView;
