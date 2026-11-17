/**
 * ORIGEN ERP - Componente Cliente: Cierre Formal de Proyecto
 *
 * Componente de cliente para la vista de cierre de proyecto.
 * Contiene toda la interactividad (formulario, estado, navegación, Firestore).
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { useCompanyWorkspace } from '@/lib/hooks/useCompanyWorkspace';
import { useProjectData } from '@/lib/hooks/data';
import { calculateProjectClosureFinancialSummary } from '@/lib/domain/projectClosure';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { saveProjectToFirestore } from '@/lib/firebaseService';
import type { Project } from '@/lib/types';
import { formatGTQ } from '@/lib/data';

interface ClosureFormData {
  closureNotes: string;
  finalBalanceGTQ: string;
}

export function ProjectClosureContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { currentUser, status: authStatus } = useAuthSession();
  const {
    workspace,
    membership,
    loading: workspaceLoading,
    error: workspaceError,
  } = useCompanyWorkspace(currentUser);
  const { projects, allExpenses, expensesLoading, loading: projectsLoading } = useProjectData({
    companyId: workspace?.id,
    currentUserId: currentUser?.uid,
    role: membership?.role,
  });

  const [formData, setFormData] = useState<ClosureFormData>({
    closureNotes: '',
    finalBalanceGTQ: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [manuallyEditedBalanceProjectId, setManuallyEditedBalanceProjectId] = useState<string | null>(null);

  // Cargar datos del proyecto una vez disponible
  useEffect(() => {
    if (projects.length > 0) {
      const found = projects.find((p: Project) => p.id === projectId);
      if (found) {
        setProject(found);
        const closureSummary = calculateProjectClosureFinancialSummary({
          projectId: found.id,
          budgetTotalGTQ: found.budgetTotal ?? 0,
          expenses: allExpenses,
        });
        setFormData((prev) => ({
          ...prev,
          finalBalanceGTQ: manuallyEditedBalanceProjectId === found.id
            ? prev.finalBalanceGTQ
            : closureSummary.remainingBudgetGTQ.toFixed(2),
        }));
      }
    }
  }, [projects, allExpenses, projectId, manuallyEditedBalanceProjectId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.closureNotes.trim()) {
      newErrors.closureNotes = 'Las observaciones de cierre son requeridas';
    }
    if (!formData.finalBalanceGTQ.trim() || isNaN(Number(formData.finalBalanceGTQ))) {
      newErrors.finalBalanceGTQ = 'El balance final es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor completa todos los campos correctamente');
      return;
    }

    if (!project || !currentUser) {
      toast.error('No se pudo obtener la información del proyecto');
      return;
    }

    if (expensesLoading) {
      toast.error('Espera a que termine de cargar el historial financiero antes de cerrar la obra.');
      return;
    }

    const closureFinancials = calculateProjectClosureFinancialSummary({
      projectId: project.id,
      budgetTotalGTQ: project.budgetTotal ?? 0,
      expenses: allExpenses,
    });
    if (!closureFinancials.canClose) {
      toast.error(
        `No se puede cerrar la obra: hay ${closureFinancials.pendingExpenseCount} gasto(s) pendientes de aprobación por ${formatGTQ(closureFinancials.pendingExpenseTotalGTQ)}.`
      );
      return;
    }

    if (!project.companyId) {
      toast.error('El proyecto no tiene empresa asociada.');
      return;
    }

    setIsLoading(true);
    try {
      const updatedProject: Project = {
        ...project,
        status: 'Cerrado',
        closedAt: new Date().toISOString(),
        closedBy: currentUser.uid,
        finalBalanceGTQ: Number(formData.finalBalanceGTQ),
        closureNotes: formData.closureNotes.trim(),
      };

      const saved = await saveProjectToFirestore(
        updatedProject,
        project.companyId,
        currentUser.uid
      );

      if (saved) {
        toast.success('Proyecto cerrado correctamente.');
        setTimeout(() => {
          router.replace(`/proyectos/${projectId}`);
        }, 1500);
      } else {
        toast.error('No se pudo cerrar el proyecto.');
      }
    } catch (error) {
      toast.error('Error al cerrar el proyecto.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser || authStatus !== 'authenticated' || workspaceLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-4 border-brand-primary/30 border-t-brand-primary animate-spin mb-4" />
          <p className="text-slate-400">Cargando sesión y espacio de trabajo…</p>
        </div>
      </div>
    );
  }

  if (workspaceError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <Card variant="glass" padding="lg" className="max-w-md text-center">
          <h1 className="text-lg font-bold text-white">No se pudo cargar la empresa</h1>
          <p className="mt-2 text-sm text-slate-400">{workspaceError}</p>
        </Card>
      </div>
    );
  }

  if (projectsLoading || expensesLoading || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-4 border-brand-primary/30 border-t-brand-primary animate-spin mb-4" />
          <p className="text-slate-400">Cargando proyecto…</p>
        </div>
      </div>
    );
  }

  const closureFinancials = calculateProjectClosureFinancialSummary({
    projectId: project.id,
    budgetTotalGTQ: project.budgetTotal ?? 0,
    expenses: allExpenses,
  });
  const budgetTotal = project.budgetTotal ?? 0;
  const approvedExpenseTotal = closureFinancials.approvedExpenseTotalGTQ;
  const pendingExpenseTotal = closureFinancials.pendingExpenseTotalGTQ;
  const remainingBalance = closureFinancials.remainingBudgetGTQ;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card variant="glass" padding="lg">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-sky-500 flex items-center justify-center shadow-glass">
            <span className="text-white font-bold">📋</span>
          </div>
          <div>
            <h1 className="mb-0 text-2xl font-bold text-white">Cierre de Proyecto</h1>
            <p className="text-sm text-slate-400">{project.name}</p>
          </div>
        </div>

        {/* Resumen financiero */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Presupuesto Total
            </p>
            <p className="text-lg font-bold text-white">{formatGTQ(budgetTotal)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Gasto Aprobado
            </p>
            <p className="text-lg font-bold text-rose-400">
              {formatGTQ(approvedExpenseTotal)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pendiente de Aprobación
            </p>
            <p className={`text-lg font-bold ${
              pendingExpenseTotal > 0 ? 'text-amber-400' : 'text-slate-200'
            }`}>
              {formatGTQ(pendingExpenseTotal)}
            </p>
            <p className="mt-1 text-[10px] text-slate-500">{closureFinancials.pendingExpenseCount} solicitud(es)</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Saldo tras Compromisos
            </p>
            <p className={`text-lg font-bold ${
              remainingBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {formatGTQ(remainingBalance)}
            </p>
          </div>
        </div>

        {closureFinancials.pendingExpenseCount > 0 ? (
          <div role="alert" className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            No es posible cerrar esta obra mientras existan gastos pendientes de aprobación. Resuelve las {closureFinancials.pendingExpenseCount} solicitud(es) por {formatGTQ(pendingExpenseTotal)} y vuelve a generar el cierre.
          </div>
        ) : (
          <p className="mb-5 text-xs text-emerald-300">No hay solicitudes de gasto pendientes de aprobación.</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Observaciones de Cierre
            </label>
            <textarea
              value={formData.closureNotes}
              onChange={(e) => setFormData({ ...formData, closureNotes: e.target.value })}
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary/50"
              placeholder="Describa los acuerdos de finiquito, retenciones liberadas y observaciones del cierre del proyecto…"
              disabled={isLoading}
              required
            />
            {errors.closureNotes && (
              <p className="mt-1 text-xs text-red-400">{errors.closureNotes}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Saldo final tras compromisos (GTQ)
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.finalBalanceGTQ}
              onChange={(e) => {
                setManuallyEditedBalanceProjectId(project.id);
                setFormData({ ...formData, finalBalanceGTQ: e.target.value });
              }}
              disabled={isLoading}
              required
              variant={errors.finalBalanceGTQ ? 'error' : 'default'}
              placeholder={remainingBalance.toString()}
            />
            <p className="mt-1 text-xs text-slate-500">
              Balance calculado automáticamente: {formatGTQ(remainingBalance)}
            </p>
            {errors.finalBalanceGTQ && (
              <p className="mt-1 text-xs text-red-400">{errors.finalBalanceGTQ}</p>
            )}
          </div>

          <div className="pt-6">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={isLoading || expensesLoading || !project || !closureFinancials.canClose}
              className="w-full"
            >
              {isLoading ? 'Cerrando proyecto…' : 'Cerrar Proyecto Definitivamente'}
            </Button>
          </div>

          <p className="mt-4 text-xs text-slate-500 text-center">
            ⚠️ El cierre requiere resolver todas las solicitudes pendientes. Una vez cerrado, el proyecto no podrá tener nuevos gastos ni APU.
          </p>
        </form>
      </Card>

      <div className="mt-6 text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.replace(`/proyectos/${projectId}`)}
          className="text-slate-400 hover:text-amber-300"
        >
          ← Volver al proyecto
        </Button>
      </div>
    </div>
  );
}