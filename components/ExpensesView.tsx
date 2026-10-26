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

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  projects,
  expenses = [],
  company,
  activeProjectId,
  onSelectProject,
  onAddExpense,
  onDeleteExpense,
}) => {
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
  const [formCategory, setFormCategory] = useState<ExpenseRecord['category']>('Materiales (Cementos, Hierro)');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formSupplier, setFormSupplier] = useState<string>('');
  const [formNitSupplier, setFormNitSupplier] = useState<string>('');
  const [formFacturaNumber, setFormFacturaNumber] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCurrency, setFormCurrency] = useState<'GTQ' | 'USD'>('GTQ');
  const [formPaymentMethod, setFormPaymentMethod] = useState<ExpenseRecord['paymentMethod']>('Transferencia BI');
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

  const categoriesList = useMemo<ExpenseRecord['category'][]>(() => [
    'Materiales (Cementos, Hierro)',
    'Mano de Obra',
    'Maquinaria y Combustible',
    'Permisos & Licencias',
    'Imprevistos',
  ], []);

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
    if (formCurrency === 'USD' && (!Number.isFinite(company.exchangeRate) || company.exchangeRate <= 0)) {
      setSaveError('Configura un tipo de cambio válido en la configuración de empresa antes de registrar gastos en USD.');
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
      setSaveError('Ocurrió un error al guardar. Conservamos los datos para que puedas intentarlo de nuevo.');
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
        selectedProject: selectedProjectId !== 'todos' ? projectMap.get(selectedProjectId) || null : null,
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
    const targetProject = selectedProjectId !== 'todos' ? projectMap.get(selectedProjectId) || projects[0] : projects[0];
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <Receipt className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Gestión de Gastos, Comprobantes & Facturas SAT
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control financiero de egresos de obra, IVA acreditable, proveedores y liquidaciones por proyecto.
            </p>
          </div>
        </div>

        {/* Primary Tab Controls */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('tabla')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'tabla'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Listado de Gastos
            </button>
            {onAddExpense && <button
              type="button"
              onClick={() => setActiveTab('nuevo')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'nuevo'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Gasto / Factura
            </button>}
            <button
              type="button"
              onClick={() => setActiveTab('resumen')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'resumen'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Gastos Filtrados
              </p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {formatGTQ(totalFilteredAmountGTQ)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {filteredExpenses.length} registros mostrados
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                Crédito Fiscal IVA (12%)
              </p>
              <p className="text-xl font-extrabold text-blue-700 mt-1">
                {formatGTQ((totalFilteredAmountGTQ / 1.12) * 0.12)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">IVA acreditable en la SAT</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Subtotal Neto de Materiales
              </p>
              <p className="text-xl font-extrabold text-emerald-700 mt-1">
                {formatGTQ(
                  filteredExpenses
                    .filter((e) => e.category === 'Materiales (Cementos, Hierro)')
                    .reduce((sum, e) => sum + e.amount, 0)
                )}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Insumos de construcción</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                Proyectos con Egreso
              </p>
              <p className="text-xl font-extrabold text-amber-700 mt-1">
                {projectsWithExpensesCount} proyectos
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Control presupuestario</p>
            </div>
          </div>

          {/* Controls Bar: Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2.5">
              {/* Project Filter */}
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Proyecto:</span>
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    const projectId = e.target.value;
                    setShowAllProjects(projectId === 'todos');
                    if (projectId !== 'todos') onSelectProject(projectId);
                  }}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-800 cursor-pointer focus:ring-2 focus:ring-amber-500"
                >
                  <option value="todos">Todos los Proyectos ({activeProjects.length})</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code || p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Categoría:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-medium text-slate-800 cursor-pointer"
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
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por proveedor, NIT, factura..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-7 py-1.5 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleExportExcelSummary}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shrink-0"
                title="Exportar registros a Excel Contable"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              </button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="p-3 border-r border-slate-200">Fecha</th>
                    <th className="p-3 border-r border-slate-200">Proyecto</th>
                    <th className="p-3 border-r border-slate-200">Categoría</th>
                    <th className="p-3 border-r border-slate-200">Descripción / Insumo</th>
                    <th className="p-3 border-r border-slate-200">Proveedor & NIT</th>
                    <th className="p-3 border-r border-slate-200">No. Factura</th>
                    <th className="p-3 text-center border-r border-slate-200">Comprobante</th>
                    <th className="p-3 text-right border-r border-slate-200 font-black text-slate-900 bg-slate-200/60">
                      Monto (GTQ)
                    </th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredExpenses.map((ex) => {
                    const proj = projectMap.get(ex.projectId);
                    return (
                      <tr key={ex.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 border-r border-slate-200 font-mono text-slate-600 whitespace-nowrap">
                          {ex.date}
                        </td>
                        <td className="p-3 border-r border-slate-200 font-bold text-slate-800 whitespace-nowrap">
                          {proj ? proj.name : ex.projectId}
                        </td>
                        <td className="p-3 border-r border-slate-200 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                            {ex.category}
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-200 max-w-xs font-medium text-slate-900">
                          {ex.description}
                        </td>
                        <td className="p-3 border-r border-slate-200 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{ex.supplier}</div>
                          <div className="text-[10px] text-slate-400 font-mono">NIT: {ex.nitSupplier}</div>
                        </td>
                        <td className="p-3 border-r border-slate-200 font-mono text-slate-700 whitespace-nowrap">
                          {ex.facturaNumber}
                        </td>
                        <td className="p-3 text-center border-r border-slate-200 whitespace-nowrap">
                          {ex.receiptPhotoUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewPhotoUrl(ex.receiptPhotoUrl || null)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] transition cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> Ver Foto
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Sin foto</span>
                          )}
                        </td>
                        <td className="p-3 text-right border-r border-slate-200 font-mono font-black text-slate-900 text-sm bg-slate-50">
                          {formatGTQ(ex.amount)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {onDeleteExpense && (
                            <button
                              type="button"
                              onClick={() => onDeleteExpense(ex.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-4 h-4" />
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

                <tfoot className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300">
                  <tr className="bg-slate-200/90 text-[12px]">
                    <td className="p-3.5 border-r border-slate-300 font-black" colSpan={7}>
                      TOTAL DE GASTOS FILTRADOS ({filteredExpenses.length} FACTURAS / COMPROBANTES)
                    </td>
                    <td className="p-3.5 text-right border-r border-slate-300 font-mono font-black text-slate-950 text-base">
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
                <Plus className="w-5 h-5" />
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
              <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-950">
                Crea un proyecto antes de registrar gastos; cada factura debe asignarse a una obra.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="expense-project" className="font-bold text-slate-700 block mb-1">Proyecto Asignado *</label>
                <select
                  id="expense-project"
                  value={activeProjectId}
                  onChange={(e) => onSelectProject(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-800"
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
                <label htmlFor="expense-date" className="font-bold text-slate-700 block mb-1">Fecha de Emisión / Factura *</label>
                <input
                  id="expense-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono text-slate-900"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="expense-category" className="font-bold text-slate-700 block mb-1">Categoría del Gasto *</label>
                <select
                  id="expense-category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-900"
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
                <label htmlFor="expense-payment-method" className="font-bold text-slate-700 block mb-1">Método de Pago *</label>
                <select
                  id="expense-payment-method"
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                  className="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-900"
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
              <label htmlFor="expense-description" className="font-bold text-slate-700 block mb-1">
                Descripción Detallada del Insumo o Servicio *
              </label>
              <textarea
                id="expense-description"
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ej. Compra de 150 bolsas de cemento Progreso IP para fundición de losa Nivel 2..."
                className="w-full min-h-20 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-600"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="expense-supplier" className="font-bold text-slate-700 block mb-1">Proveedor / Emisor SAT</label>
                <input
                  id="expense-supplier"
                  type="text"
                  placeholder="Ej. Discosa S.A. / Cemento Progreso"
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label htmlFor="expense-supplier-nit" className="font-bold text-slate-700 block mb-1">NIT del Proveedor</label>
                <input
                  id="expense-supplier-nit"
                  type="text"
                  placeholder="Ej. 1294821-9 o CF"
                  value={formNitSupplier}
                  onChange={(e) => setFormNitSupplier(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono text-slate-900 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label htmlFor="expense-invoice-number" className="font-bold text-slate-700 block mb-1">No. Factura SAT Serie/Número</label>
                <input
                  id="expense-invoice-number"
                  type="text"
                  placeholder="Ej. A-49201 / FEL-8812"
                  value={formFacturaNumber}
                  onChange={(e) => setFormFacturaNumber(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono text-slate-900 placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="expense-amount" className="font-bold text-slate-700 block mb-1">Monto del Gasto *</label>
                <div className="flex gap-2">
                  <select
                    aria-label="Moneda del gasto"
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value as any)}
                    className="min-h-11 px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 font-bold text-slate-900"
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
                    className="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono font-bold text-base text-slate-900 placeholder:text-slate-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="expense-receipt-photo" className="font-bold text-slate-700 block mb-1">Fotografía o Foto de Factura</label>
                <input
                  id="expense-receipt-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="w-full min-h-11 text-xs text-slate-700 file:mr-3 file:min-h-11 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer"
                />
              </div>
            </div>

            {formReceiptPhotoUrl && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <Image
                  src={formReceiptPhotoUrl}
                  alt="Vista previa factura"
                  width={64}
                  height={64}
                  unoptimized
                  className="w-16 h-16 object-cover rounded-lg border border-slate-300"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">Comprobante adjunto correctamente</span>
                  <button
                    type="button"
                    onClick={() => setFormReceiptPhotoUrl('')}
                    className="text-rose-600 hover:underline text-[11px] font-semibold mt-1 cursor-pointer"
                  >
                    Remover foto
                  </button>
                </div>
              </div>
            )}

            {saveError && (
              <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-900">
                {saveError}
              </p>
            )}

            <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('tabla')}
                className="min-h-11 px-4 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || activeProjects.length === 0}
                className="min-h-11 px-6 py-2.5 rounded-xl font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-xs cursor-pointer disabled:opacity-50"
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-700 font-bold">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Resumen Mensual de Egresos & Análisis de Desviaciones
                </h3>
                <p className="text-xs text-slate-500">
                  Consolidado periódico por categoría, crédito de IVA e historial de gastos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Mes Evaluado:</span>
              <input
                type="month"
                value={selectedMonthYear}
                onChange={(e) => setSelectedMonthYear(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-800 cursor-pointer"
              />

              <button
                type="button"
                onClick={handleExportPdfSummary}
                disabled={isExportingPdf}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" />
                {isExportingPdf ? 'Exportando...' : 'PDF Resumen'}
              </button>
            </div>
          </div>

          {/* Monthly KPI Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xs space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                Total Gastado en el Mes ({selectedMonthYear})
              </span>
              <p className="text-2xl font-black text-amber-400 font-mono">
                {formatGTQ(monthlyCategoryTotals.total)}
              </p>
              <p className="text-[11px] text-slate-400">
                {monthlyExpenses.length} Facturas / Comprobantes auditables
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                Subtotal Neto (Sin IVA)
              </span>
              <p className="text-2xl font-black text-slate-900 font-mono">
                {formatGTQ(monthlyCategoryTotals.subtotalNet)}
              </p>
              <p className="text-[11px] text-slate-400">Materia imponible neta</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-blue-600 font-bold uppercase tracking-wider block">
                Crédito Fiscal IVA SAT (12%)
              </span>
              <p className="text-2xl font-black text-blue-700 font-mono">
                {formatGTQ(monthlyCategoryTotals.ivaCredit)}
              </p>
              <p className="text-[11px] text-slate-400">IVA deductible por facturas FEL</p>
            </div>
          </div>

          {/* Monthly Breakdown by Category */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-600" />
              Desglose de Gastos Mensuales por Categoría
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoriesList.map((cat) => {
                const amount = monthlyCategoryTotals.map[cat] || 0;
                const pct =
                  monthlyCategoryTotals.total > 0
                    ? Math.round((amount / monthlyCategoryTotals.total) * 100)
                    : 0;

                return (
                  <div key={cat} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-800 text-xs">{cat}</span>
                      <span className="text-xs font-mono font-bold text-slate-600">{pct}%</span>
                    </div>
                    <p className="text-lg font-extrabold text-slate-900 font-mono">
                      {formatGTQ(amount)}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Histogram Component */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h4 className="font-bold text-slate-900 text-sm">Vista Previa de Comprobante / Factura</h4>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-center max-h-[70vh] overflow-hidden rounded-xl bg-slate-100">
              <Image src={previewPhotoUrl} alt="Factura SAT" width={1200} height={900} unoptimized className="max-h-[65vh] w-auto object-contain" />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesView;
