/**
 * ORIGEN ERP - Componente Cliente: Cierre Formal de Proyecto
 *
 * Componente de cliente para la vista de cierre de proyecto.
 * Contiene toda la interactividad (formulario, estado, navegación, Firestore).
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useActiveWorkspace } from '@/lib/hooks/useActiveWorkspace';
import { useProjects } from '@/lib/hooks/data/useProjects';
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

/** Roles que pueden cerrar un proyecto (mismos que `canManageProjects`). */
const CLOSURE_ROLES = ['owner', 'admin', 'project_manager'];

export function ProjectClosureContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const {
    status,
    companyId,
    currentUserId,
    role,
    ready,
    loading: workspaceLoading,
    error: workspaceError,
  } = useActiveWorkspace();
  const { projects, loading: projectsLoading } = useProjects({ companyId, currentUserId });

  const [formData, setFormData] = useState<ClosureFormData>({
    closureNotes: '',
    finalBalanceGTQ: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const canClose = CLOSURE_ROLES.includes(role ?? '');

  const project: Project | null = useMemo(
    () => projects.find((item) => item.id === projectId) ?? null,
    [projects, projectId]
  );

  useEffect(() => {
    if (status === 'unauthenticated' || status === 'error') {
      router.replace('/login');
    }
  }, [status, router]);

  // Cargar datos del proyecto una vez disponible
  useEffect(() => {
    if (!project) return;
    setFormData((prev) => ({
      ...prev,
      // Si el proyecto ya tiene un balance de cierre guardado, se respeta.
      finalBalanceGTQ:
        project.finalBalanceGTQ !== undefined && project.finalBalanceGTQ !== null
          ? String(project.finalBalanceGTQ)
          : ((project.budgetTotal ?? 0) - (project.spentTotal ?? 0)).toString(),
      closureNotes: prev.closureNotes || project.closureNotes || '',
    }));
  }, [project]);

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

    if (!project || !currentUserId || !companyId) {
      toast.error('No se pudo obtener la información del proyecto');
      return;
    }

    setIsLoading(true);
    try {
      const updatedProject: Project = {
        ...project,
        status: 'Cerrado',
        closedAt: new Date().toISOString(),
        closedBy: currentUserId,
        finalBalanceGTQ: Number(formData.finalBalanceGTQ),
        closureNotes: formData.closureNotes.trim(),
      };

      const saved = await saveProjectToFirestore(updatedProject, companyId, currentUserId);

      if (saved) {
        toast.success('Proyecto cerrado correctamente.');
        // El detalle de proyecto vive dentro de la app principal (`/`), no en
        // una ruta propia: el cierre regresa al tablero.
        setTimeout(() => {
          router.replace('/');
        }, 1500);
      } else {
        toast.error('No se pudo cerrar el proyecto.');
      }
    } catch (error) {
      console.error('No se pudo cerrar el proyecto:', error);
      toast.error('Error al cerrar el proyecto.');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || workspaceLoading || (ready && !project && projectsLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 flex h-8 w-8 animate-spin items-center justify-center rounded-full border-4 border-brand-primary/30 border-t-brand-primary" />
          <p className="text-slate-400">Cargando proyecto…</p>
        </div>
      </div>
    );
  }

  if (workspaceError || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <Card variant="glass" padding="lg" className="max-w-md text-center">
          <h1 className="mb-2 text-xl font-bold text-white">No se pudo cargar la empresa</h1>
          <p className="mb-4 text-sm text-slate-400">
            {workspaceError ?? 'Inicia sesión para cerrar un proyecto.'}
          </p>
          <Button variant="primary" onClick={() => router.replace('/login')}>
            Ir a iniciar sesión
          </Button>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <Card variant="glass" padding="lg" className="max-w-md text-center">
          <h1 className="mb-2 text-xl font-bold text-white">Proyecto no encontrado</h1>
          <p className="mb-4 text-sm text-slate-400">
            El proyecto solicitado no existe o no pertenece a tu empresa.
          </p>
          <Button variant="primary" onClick={() => router.replace('/')}>
            Volver al tablero
          </Button>
        </Card>
      </div>
    );
  }

  if (!canClose) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <Card variant="glass" padding="lg" className="max-w-md text-center">
          <h1 className="mb-2 text-xl font-bold text-white">Permiso insuficiente</h1>
          <p className="mb-4 text-sm text-slate-400">
            Solo el propietario, un administrador o el Project Manager pueden cerrar un proyecto.
          </p>
          <Button variant="outline" onClick={() => router.replace('/')}>
            Volver al tablero
          </Button>
        </Card>
      </div>
    );
  }

  const budgetTotal = project.budgetTotal ?? 0;
  const spentTotal = project.spentTotal ?? 0;
  const remainingBalance = budgetTotal - spentTotal;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <Card variant="glass" padding="lg">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-sky-500 shadow-glass">
            <span className="font-bold text-white">📋</span>
          </div>
          <div>
            <h1 className="mb-0 text-2xl font-bold text-white">Cierre de Proyecto</h1>
            <p className="text-sm text-slate-400">{project.name}</p>
          </div>
        </div>

        {/* Resumen financiero */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Presupuesto Total
            </p>
            <p className="text-lg font-bold text-white">{formatGTQ(budgetTotal)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Gastos Ejecutados
            </p>
            <p className="text-lg font-bold text-rose-400">{formatGTQ(spentTotal)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Balance Final
            </p>
            <p
              className={`text-lg font-bold ${
                remainingBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatGTQ(remainingBalance)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
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
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Balance Final (GTQ)
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.finalBalanceGTQ}
              onChange={(e) => setFormData({ ...formData, finalBalanceGTQ: e.target.value })}
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
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Cerrando proyecto…' : 'Cerrar Proyecto Definitivamente'}
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            ⚠️ Una vez cerrado, el proyecto no podrá tener nuevos gastos ni APU.
          </p>
        </form>
      </Card>

      <div className="mt-6 text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.replace('/')}
          className="text-slate-400 hover:text-amber-300"
        >
          ← Volver al tablero
        </Button>
      </div>
    </div>
  );
}
