/**
 * 📊 CRUD Demo Component - Muestra todas las operaciones de lectura/escritura
 *
 * Este componente demuestra TODAS las operaciones CRUD disponibles en ORIGEN:
 * - CREATE (Crear): Guardar nuevos datos
 * - READ (Leer): Obtener datos en tiempo real
 * - UPDATE (Actualizar): Modificar datos existentes
 * - DELETE (Eliminar): Borrar datos
 * - OFFLINE: Almacenamiento local y sincronización
 *
 * Uso: Importar y usar en cualquier página
 * <CRUDDemo companyId={companyId} userId={userId} role={role} />
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useProjectData } from '@/lib/hooks/useProjectData';
import {
  saveOfflineData,
  loadOfflineData,
  addOfflineAction,
  getOfflineQueue,
  processOfflineQueue,
} from '@/lib/offlineStorage';
import type { Project, ExpenseRecord, AttendanceRecord, Employee, QuoteRecord } from '@/lib/types';
import { toast } from 'react-hot-toast';

interface CRUDDemoProps {
  companyId: string;
  userId: string;
  role: string;
}

export function CRUDDemo({ companyId, userId, role }: CRUDDemoProps) {
  const {
    projects,
    expenses,
    attendance,
    employees,
    quotes,
    createProject,
    updateProject,
    archiveProject,
    addExpense,
    updateExpense,
    deleteExpense,
    addAttendance,
    deleteAttendance,
    addEmployee,
    addQuote,
    updateQuoteStatus,
  } = useProjectData(companyId, userId, role as any);

  const [activeTab, setActiveTab] = useState<
    'proyectos' | 'gastos' | 'asistencia' | 'empleados' | 'local' | 'offline'
  >('proyectos');
  const [offlineQueue, setOfflineQueue] = useState(getOfflineQueue());
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [loadingCreateProject, setLoadingCreateProject] = useState(false);
  const [loadingCreateExpense, setLoadingCreateExpense] = useState(false);
  const [loadingCreateAttendance, setLoadingCreateAttendance] = useState(false);
  const [loadingCreateEmployee, setLoadingCreateEmployee] = useState(false);

  // ============================================================================
  // 1. CRUD DE PROYECTOS
  // ============================================================================

  const handleCreateProject = useCallback(async () => {
    setLoadingCreateProject(true);
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      companyId,
      name: `Proyecto Demo ${new Date().toLocaleTimeString()}`,
      code: `PRJ-${Math.random().toString(36).substring(7)}`,
      client: 'Cliente Demo',
      location: 'Ubicación Demo',
      municipality: 'Municipio',
      department: 'Departamento',
      budgetTotal: 10000,
      spentTotal: 0,
      progressPercent: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Planificación',
      lat: 14.6133,
      lng: -90.4875,
      ownerId: userId,
      createdBy: userId,
    };

    const success = await createProject(newProject as any);
    if (success) {
      toast.success('✅ Proyecto creado en Firebase');
    }
    setLoadingCreateProject(false);
    // eslint-disable react-hooks/exhaustive-deps
  }, [createProject]);

  const handleUpdateProject = useCallback(
    async (projectId: string) => {
      const success = await updateProject(projectId, {
        progressPercent: Math.floor(Math.random() * 100),
      });
      if (success) {
        toast.success('✅ Proyecto actualizado en Firebase');
      }
    },
    [updateProject]
  );

  const handleArchiveProject = useCallback(
    async (projectId: string) => {
      const success = await archiveProject(projectId);
      if (success) {
        toast.success('✅ Proyecto archivado en Firebase');
      }
    },
    [archiveProject]
  );

  // ============================================================================
  // 2. CRUD DE GASTOS
  // ============================================================================

  const handleCreateExpense = useCallback(async () => {
    setLoadingCreateExpense(true);
    if (projects.length === 0) {
      toast.error('❌ No hay proyectos disponibles');
      setLoadingCreateExpense(false);
      return;
    }

    const newExpense: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      projectId: projects[0].id,
      description: `Gasto Demo ${new Date().toLocaleTimeString()}`,
      amount: Math.floor(Math.random() * 5000),
      category: 'Materiales (Cementos, Hierro)',
      supplier: '',
      nitSupplier: '',
      facturaNumber: '',
      currency: 'GTQ',
      paymentMethod: 'Efectivo',
      date: new Date().toISOString().split('T')[0],
    };

    const success = await addExpense(newExpense);
    if (success) {
      toast.success('✅ Gasto creado en Firebase');
    }
    setLoadingCreateExpense(false);
    // eslint-disable react-hooks/exhaustive-deps
  }, [addExpense, companyId, projects, userId]);

  const handleUpdateExpense = useCallback(
    async (expenseId: string) => {
      const expense = expenses.find((e) => e.id === expenseId);
      if (!expense) return;

      const updated: ExpenseRecord = {
        ...expense,
        approvalStatus: expense.approvalStatus === 'Pendiente' ? 'Aprobado' : 'Pendiente',
      };

      const success = await updateExpense(updated);
      if (success) {
        toast.success('✅ Gasto actualizado en Firebase');
      }
    },
    [expenses, updateExpense]
  );

  const handleDeleteExpense = useCallback(
    async (expenseId: string) => {
      const success = await deleteExpense(expenseId);
      if (success) {
        toast.success('✅ Gasto eliminado de Firebase');
      }
    },
    [deleteExpense]
  );

  // ============================================================================
  // 3. CRUD DE ASISTENCIA
  // ============================================================================

  const handleCreateAttendance = useCallback(async () => {
    setLoadingCreateAttendance(true);
    if (employees.length === 0) {
      toast.error('❌ No hay empleados disponibles');
      setLoadingCreateAttendance(false);
      return;
    }

    const newAttendance: AttendanceRecord = {
      id: `att-${Date.now()}`,
      projectId: projects[0]?.id || '',
      employeeId: (employees[0] as Employee).id,
      employeeName: (employees[0] as Employee).name,
      date: new Date().toISOString().split('T')[0],
      status: 'Presente',
      overtimeHours: 0,
    };

    const success = await addAttendance(newAttendance);
    if (success) {
      toast.success('✅ Asistencia registrada en Firebase');
    }
    setLoadingCreateAttendance(false);
    // eslint-disable react-hooks/exhaustive-deps
  }, [addAttendance]);

  const handleDeleteAttendance = useCallback(
    async (attendanceId: string) => {
      const success = await deleteAttendance(attendanceId);
      if (success) {
        toast.success('✅ Asistencia eliminada de Firebase');
      }
    },
    [deleteAttendance]
  );

  // ============================================================================
  // 4. CRUD DE EMPLEADOS
  // ============================================================================

  const handleCreateEmployee = useCallback(async () => {
    setLoadingCreateEmployee(true);
    const newEmployee: Employee = {
      id: `emp-${Date.now()}`,
      name: `Empleado Demo ${Math.random().toString(36).substring(7)}`,
      role: 'Albañil',
      dailyRateGTQ: 250,
      igssAffiliated: true,
      phone: '555-0000',
    };

    const success = await addEmployee(newEmployee);
    if (success) {
      toast.success('✅ Empleado creado en Firebase');
    }
    setLoadingCreateEmployee(false);
    // eslint-disable react-hooks/exhaustive-deps
  }, [addEmployee]);

  // ============================================================================
  // 5. ALMACENAMIENTO LOCAL
  // ============================================================================

  const handleSaveLocal = useCallback(() => {
    const localData = {
      timestamp: new Date().toISOString(),
      message: 'Datos guardados localmente',
      projects: projects.length,
      expenses: expenses.length,
    };
    saveOfflineData('demo', localData);
    toast.success('✅ Datos guardados en localStorage');
  }, [projects, expenses]);

  const handleLoadLocal = useCallback(() => {
    const data = loadOfflineData('demo', {});
    toast.success(`✅ Datos locales: ${JSON.stringify(data)}`);
  }, []);

  // ============================================================================
  // 6. MODO OFFLINE
  // ============================================================================

  const handleAddOfflineAction = useCallback(() => {
    if (projects.length === 0) {
      toast.error('❌ No hay proyectos');
      return;
    }

    addOfflineAction(
      'progress',
      { projectId: projects[0].id, complete: Math.floor(Math.random() * 100) },
      `Actualizar progreso (offline)`
    );

    setOfflineQueue(getOfflineQueue());
    toast.success('✅ Acción agregada a la cola offline');
  }, [projects]);

  const handleProcessQueue = useCallback(async () => {
    const result = await processOfflineQueue(async (item) => {
      console.log('Sincronizando:', item);
      toast.success(`🔄 Procesando: ${item.description}`);
      return true;
    });

    setOfflineQueue(getOfflineQueue());
    toast.success(`✅ Procesados: ${result.processed}, Pendientes: ${result.remaining}`);
  }, []);

  // ============================================================================
  // UI COMPONENTS
  // ============================================================================

  return (
    <div className="rounded-lg bg-white p-6 shadow-lg">
      <h1 className="mb-6 text-3xl font-bold">📊 Demo CRUD Completo - ORIGEN</h1>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {['proyectos', 'gastos', 'asistencia', 'empleados', 'local', 'offline'].map((tab) => (
          <button
            key={tab}
            onClick={() =>
              setActiveTab(
                tab as 'proyectos' | 'gastos' | 'asistencia' | 'empleados' | 'local' | 'offline'
              )
            }
            className={`rounded px-4 py-2 ${
              activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* CRUD Proyectos */}
      {activeTab === 'proyectos' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">🏗️ CRUD de Proyectos</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCreateProject}
              className={`rounded p-3 text-white hover:bg-green-600 ${loadingCreateProject ? 'cursor-not-allowed bg-gray-400' : 'bg-green-500'}`}
              aria-label="Crear proyecto"
              disabled={loadingCreateProject}
            >
              {loadingCreateProject ? 'Cargando...' : '➕ Crear Proyecto'}
            </button>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Proyectos ({projects.length})</h3>
            {projects.slice(0, 5).map((project) => (
              <div key={project.id} className="rounded bg-gray-100 p-3">
                <div className="flex justify-between">
                  <span>
                    {project.name} - {project.status}
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleUpdateProject(project.id)}
                      className="rounded bg-blue-500 px-2 py-1 text-sm text-white"
                      aria-label="Actualizar proyecto"
                    >
                      ✏️ Actualizar
                    </button>
                    <button
                      onClick={() => handleArchiveProject(project.id)}
                      className="rounded bg-yellow-500 px-2 py-1 text-sm text-white"
                      aria-label="Archivar proyecto"
                    >
                      📦 Archivar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CRUD Gastos */}
      {activeTab === 'gastos' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">💰 CRUD de Gastos</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCreateExpense}
              className={`rounded p-3 text-white hover:bg-green-600 ${loadingCreateExpense ? 'cursor-not-allowed bg-gray-400' : 'bg-green-500'}`}
              aria-label="Crear gasto"
              disabled={loadingCreateExpense}
            >
              {loadingCreateExpense ? 'Cargando...' : '➕ Crear Gasto'}
            </button>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Gastos ({expenses.length})</h3>
            {expenses.slice(0, 5).map((expense) => (
              <div key={expense.id} className="rounded bg-gray-100 p-3">
                <div className="flex justify-between">
                  <span>
                    {expense.description} - ${expense.amount}
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleUpdateExpense(expense.id)}
                      className="rounded bg-blue-500 px-2 py-1 text-sm text-white"
                      aria-label="Actualizar gasto"
                    >
                      ✏️ Actualizar
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="rounded bg-red-500 px-2 py-1 text-sm text-white"
                      aria-label="Eliminar gasto"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CRUD Asistencia */}
      {activeTab === 'asistencia' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">👥 CRUD de Asistencia</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCreateAttendance}
              className={`rounded p-3 text-white hover:bg-green-600 ${loadingCreateAttendance ? 'cursor-not-allowed bg-gray-400' : 'bg-green-500'}`}
              aria-label="Registrar asistencia"
              disabled={loadingCreateAttendance}
            >
              {loadingCreateAttendance ? 'Cargando...' : '➕ Registrar Asistencia'}
            </button>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Registros ({attendance.length})</h3>
            {attendance.slice(0, 5).map((record) => (
              <div key={record.id} className="rounded bg-gray-100 p-3">
                <div className="flex justify-between">
                  <span>
                    {record.employeeName} - {record.status}
                  </span>
                  <button
                    onClick={() => handleDeleteAttendance(record.id)}
                    className="rounded bg-red-500 px-2 py-1 text-sm text-white"
                    aria-label="Eliminar asistencia"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CRUD Empleados */}
      {activeTab === 'empleados' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">👨‍💼 CRUD de Empleados</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCreateEmployee}
              className={`rounded p-3 text-white hover:bg-green-600 ${loadingCreateEmployee ? 'cursor-not-allowed bg-gray-400' : 'bg-green-500'}`}
              aria-label="Crear empleado"
              disabled={loadingCreateEmployee}
            >
              {loadingCreateEmployee ? 'Cargando...' : '➕ Crear Empleado'}
            </button>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Empleados ({employees.length})</h3>
            {(employees as Employee[]).slice(0, 5).map((emp) => (
              <div key={emp.id} className="rounded bg-gray-100 p-3">
                <span>
                  {emp.name} - {emp.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Almacenamiento Local */}
      {activeTab === 'local' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">💾 Almacenamiento Local</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSaveLocal}
              className="rounded bg-green-500 p-3 text-white hover:bg-green-600"
              aria-label="Guardar datos localmente"
            >
              💾 Guardar Localmente
            </button>
            <button
              onClick={handleLoadLocal}
              className="rounded bg-blue-500 p-3 text-white hover:bg-blue-600"
              aria-label="Cargar datos localmente"
            >
              📂 Cargar Localmente
            </button>
          </div>
          <div className="rounded bg-gray-100 p-4">
            <h3 className="mb-2 font-semibold">localStorage</h3>
            <p>Los datos se guardan en el navegador</p>
            <p>Persisten incluso si se cierra la app</p>
            <p>Se sincronizan cuando vuelve online</p>
          </div>
        </div>
      )}

      {/* Modo Offline */}
      {activeTab === 'offline' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">📡 Sincronización Offline</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAddOfflineAction}
              className="rounded bg-green-500 p-3 text-white hover:bg-green-600"
              aria-label="Agregar acción a cola offline"
            >
              ➕ Agregar a Cola
            </button>
            <button
              onClick={handleProcessQueue}
              className="rounded bg-blue-500 p-3 text-white hover:bg-blue-600"
              aria-label="Sincronizar cola offline"
            >
              🔄 Sincronizar
            </button>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Cola Offline ({offlineQueue.length} pendientes)</h3>
            {offlineQueue.map((item) => (
              <div key={item.id} className="rounded border bg-yellow-50 p-3">
                <div className="flex justify-between">
                  <span>
                    {item.type} - {item.description}
                  </span>
                  <span
                    className={`rounded px-2 py-1 text-sm ${
                      item.synced ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
                    }`}
                  >
                    {item.synced ? '✅ Sincronizado' : '⏳ Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado */}
      <div className="mt-8 rounded border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 font-semibold">📊 Estado Actual</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Proyectos:</strong> {projects.length}
          </div>
          <div>
            <strong>Gastos:</strong> {expenses.length}
          </div>
          <div>
            <strong>Asistencia:</strong> {attendance.length}
          </div>
          <div>
            <strong>Empleados:</strong> {employees.length}
          </div>
          <div>
            <strong>Offline Queue:</strong> {offlineQueue.length}
          </div>
        </div>
      </div>
    </div>
  );
}
