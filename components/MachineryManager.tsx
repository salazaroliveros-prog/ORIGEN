'use client';

import { formatGTQ, formatUSD } from '@/lib/data';
import { CompanySettings, Machinery, MachineryLog, Project } from '@/lib/types';
import {
  CheckCircle2,
  ClipboardList,
  Fuel,
  Gauge,
  Plus,
  Wrench,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';

interface MachineryManagerProps {
  machinery: Machinery[];
  machineryLogs: MachineryLog[];
  projects: Project[];
  activeProjectId: string;
  canWrite: boolean;
  onAddMachinery: (m: Machinery) => Promise<boolean>;
  onRecordMachineryUse: (log: MachineryLog) => Promise<boolean>;
  onSetMachineryStatus: (machineryId: string, status: Machinery['status']) => Promise<boolean>;
  currency: 'GTQ' | 'USD';
  company: CompanySettings;
}

export function MachineryManager({
  machinery,
  machineryLogs,
  projects,
  activeProjectId,
  canWrite,
  onAddMachinery,
  onRecordMachineryUse,
  onSetMachineryStatus,
  currency,
  company,
}: MachineryManagerProps) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [name, setName] = useState('');
  const [model, setModel] = useState('2023');
  const [plate, setPlate] = useState('EQ-01');
  const [rate, setRate] = useState('300');
  const [initialHorometer, setInitialHorometer] = useState('0');
  const [selectedMachineryId, setSelectedMachineryId] = useState('');
  const [selectedProject, setSelectedProject] = useState(activeProjectId);
  const [newHorometer, setNewHorometer] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [fuelGallons, setFuelGallons] = useState('0');
  const [operationDate, setOperationDate] = useState(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' })
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const selectedMachine = machinery.find((item) => item.id === selectedMachineryId);
  const enteredHorometer = Number(newHorometer);
  const hoursWorked = selectedMachine ? enteredHorometer - selectedMachine.currentHorometer : 0;
  const operationCost =
    selectedMachine && hoursWorked > 0
      ? Math.round(hoursWorked * selectedMachine.hourlyRateGTQ * 100) / 100
      : 0;

  // Sistema de mantenimiento preventivo
  const MAINTENANCE_THRESHOLD_HOURS = 250; // Umbral: 250 horas de uso
  const MAINTENANCE_WARNING_HOURS = 200; // Advertencia: 200 horas de uso

  // Calcular horas totales de uso por máquina desde los logs
  const machineryUsageHours = useMemo(() => {
    const usageMap = new Map<string, number>();

    machineryLogs.forEach((log) => {
      const currentHours = usageMap.get(log.machineryId) || 0;
      usageMap.set(log.machineryId, currentHours + log.hoursWorked);
    });

    return usageMap;
  }, [machineryLogs]);

  // Calcular alertas de mantenimiento
  const maintenanceAlerts = useMemo(() => {
    const alerts: Array<{
      machineryId: string;
      machineryName: string;
      currentHours: number;
      threshold: number;
      urgency: 'critical' | 'warning' | 'info';
      message: string;
    }> = [];

    machinery.forEach((mach) => {
      const totalHours = machineryUsageHours.get(mach.id) || 0;

      if (totalHours >= MAINTENANCE_THRESHOLD_HOURS) {
        alerts.push({
          machineryId: mach.id,
          machineryName: mach.name,
          currentHours: totalHours,
          threshold: MAINTENANCE_THRESHOLD_HOURS,
          urgency: 'critical',
          message: `Mantenimiento requerido inmediatamente (${totalHours}h de uso)`,
        });
      } else if (totalHours >= MAINTENANCE_WARNING_HOURS) {
        alerts.push({
          machineryId: mach.id,
          machineryName: mach.name,
          currentHours: totalHours,
          threshold: MAINTENANCE_THRESHOLD_HOURS,
          urgency: 'warning',
          message: `Mantenimiento recomendado pronto (${totalHours}h de uso)`,
        });
      }
    });

    return alerts.sort((a, b) => b.currentHours - a.currentHours);
  }, [machinery, machineryUsageHours]);

  useEffect(() => {
    if (!projects.some((project) => project.id === selectedProject)) {
      setSelectedProject(activeProjectId || projects[0]?.id || '');
    }
  }, [activeProjectId, projects, selectedProject]);

  useEffect(() => {
    if (!machinery.some((item) => item.id === selectedMachineryId) && machinery[0]) {
      setSelectedMachineryId(machinery[0].id);
      setNewHorometer(String(machinery[0].currentHorometer));
    }
  }, [machinery, selectedMachineryId]);

  const formatMoney = (amount: number) => {
    return currency === 'GTQ' ? formatGTQ(amount) : formatUSD(amount, company.exchangeRate);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const hourlyRateGTQ = Number(rate);
    const currentHorometer = Number(initialHorometer);
    if (
      !name.trim() ||
      !Number.isFinite(hourlyRateGTQ) ||
      hourlyRateGTQ < 0 ||
      !Number.isFinite(currentHorometer) ||
      currentHorometer < 0
    ) {
      toast.error('Verifica el nombre, la tarifa y el horómetro inicial.');
      return;
    }

    const m: Machinery = {
      id: `m-${globalThis.crypto.randomUUID()}`,
      name: name.trim(),
      model: model.trim(),
      plateOrCode: plate.trim(),
      hourlyRateGTQ,
      currentHorometer,
      status: 'Disponible',
    };

    setIsSaving(true);
    try {
      if (await onAddMachinery(m)) {
        setIsOpenModal(false);
        setName('');
        setModel('');
        setPlate('');
        setRate('300');
        setInitialHorometer('0');
        toast.success('Maquinaria registrada.');
      }
    } catch (error) {
      console.error('No se pudo registrar la maquinaria:', error);
      toast.error('No se pudo registrar la maquinaria. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordUse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine || !projects.some((project) => project.id === selectedProject)) {
      toast.error('Selecciona la maquinaria y el proyecto de la operación.');
      return;
    }
    if (selectedMachine.status === 'Mantenimiento') {
      toast.error('No se puede registrar uso mientras el equipo está en mantenimiento.');
      return;
    }
    const gallons = Number(fuelGallons);
    if (
      !operatorName.trim() ||
      !Number.isFinite(enteredHorometer) ||
      hoursWorked <= 0 ||
      !Number.isFinite(gallons) ||
      gallons < 0 ||
      !operationDate
    ) {
      toast.error(
        'El horómetro final debe ser mayor al actual; revisa también operador, fecha y combustible.'
      );
      return;
    }

    const log: MachineryLog = {
      id: `ml-${globalThis.crypto.randomUUID()}`,
      machineryId: selectedMachine.id,
      machineryName: selectedMachine.name,
      projectId: selectedProject,
      date: operationDate,
      hoursWorked,
      operatorName: operatorName.trim(),
      fuelGallons: gallons,
      costGTQ: operationCost,
    };

    setIsRecording(true);
    try {
      if (await onRecordMachineryUse(log)) {
        setNewHorometer(String(enteredHorometer));
        setOperatorName('');
        setFuelGallons('0');
        toast.success(
          'Operación registrada; el horómetro y el gasto pendiente fueron actualizados.'
        );
      }
    } catch (error) {
      console.error('No se pudo registrar el uso de maquinaria:', error);
      toast.error('No se pudo registrar la operación. Intenta nuevamente.');
    } finally {
      setIsRecording(false);
    }
  };

  const handleStatusChange = async (equipment: Machinery, status: Machinery['status']) => {
    try {
      if (await onSetMachineryStatus(equipment.id, status)) {
        toast.success(`Estado actualizado: ${status}.`);
      }
    } catch (error) {
      console.error('No se pudo actualizar el estado de la maquinaria:', error);
      toast.error('No se pudo actualizar el estado de la maquinaria.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Control de Maquinaria & Equipo Pesado
          </h2>
          <p className="text-xs text-slate-500">
            Horómetros, rendimiento y costos de maquinaria en proyectos de Guatemala.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpenModal(true)}
          disabled={!canWrite}
          title={!canWrite ? 'Inicia sesión con un rol que pueda gestionar maquinaria' : undefined}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Registrar Maquinaria
        </button>
      </div>

      {/* Alertas de Mantenimiento Preventivo */}
      {maintenanceAlerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Alertas de Mantenimiento Preventivo
            </h3>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {maintenanceAlerts.length}
            </span>
          </div>
          <div className="space-y-2">
            {maintenanceAlerts.map((alert) => (
              <div
                key={alert.machineryId}
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  alert.urgency === 'critical'
                    ? 'border-red-300 bg-red-50'
                    : 'border-amber-300 bg-amber-50'
                }`}
              >
                <div
                  className={`rounded-full p-2 ${
                    alert.urgency === 'critical'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">{alert.machineryName}</p>
                    <p className="font-mono text-xs text-slate-600">
                      {alert.currentHours}h / {alert.threshold}h
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-700">{alert.message}</p>
                </div>
                <button
                  onClick={() => {
                    const mach = machinery.find((m) => m.id === alert.machineryId);
                    if (mach) {
                      handleStatusChange(mach, 'Mantenimiento');
                    }
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Enviar a Mantenimiento
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {machinery.map((mach) => {
          const totalUsageHours = machineryUsageHours.get(mach.id) || 0;
          const needsMaintenance = totalUsageHours >= MAINTENANCE_THRESHOLD_HOURS;
          const maintenanceWarning = totalUsageHours >= MAINTENANCE_WARNING_HOURS;

          return (
            <div
              key={mach.id}
              className={`space-y-3 rounded-2xl border p-5 shadow-xs ${
                needsMaintenance
                  ? 'border-red-300 bg-red-50/50'
                  : maintenanceWarning
                    ? 'border-amber-300 bg-amber-50/50'
                    : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                  {mach.plateOrCode}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                    mach.status === 'Mantenimiento'
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : mach.status === 'En Obra'
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {mach.status}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{mach.name}</h3>
                <p className="text-xs text-slate-500">Modelo: {mach.model}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                  <span className="text-slate-500">
                    <Gauge className="mr-1 inline h-3.5 w-3.5" />
                    Horómetro: {mach.currentHorometer}
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatMoney(mach.hourlyRateGTQ)} / h
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    <Clock className="mr-1 inline h-3.5 w-3.5" />
                    Uso total: {totalUsageHours}h
                  </span>
                  {needsMaintenance ? (
                    <span className="font-bold text-red-600">¡Mantenimiento!</span>
                  ) : maintenanceWarning ? (
                    <span className="font-bold text-amber-600">Próximo</span>
                  ) : (
                    <span className="font-bold text-emerald-600">OK</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  void handleStatusChange(
                    mach,
                    mach.status === 'En Obra'
                      ? 'Disponible'
                      : mach.status === 'Disponible'
                        ? 'Mantenimiento'
                        : 'Disponible'
                  )
                }
                disabled={!canWrite}
                className="w-full rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mach.status === 'En Obra'
                  ? 'Finalizar uso en obra'
                  : mach.status === 'Disponible'
                    ? 'Enviar a mantenimiento'
                    : 'Marcar disponible'}
              </button>
            </div>
          );
        })}
        {machinery.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 md:col-span-2 lg:col-span-4">
            Aún no hay maquinaria registrada en este espacio de empresa.
          </div>
        )}
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-blue-700" />
          <div>
            <h3 className="font-bold text-slate-900">Registrar uso de maquinaria</h3>
            <p className="text-xs text-slate-500">
              Actualiza el horómetro y registra el costo como gasto pendiente del proyecto.
            </p>
          </div>
        </div>
        <form
          onSubmit={handleRecordUse}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="text-xs font-semibold text-slate-700">
            Equipo
            <select
              value={selectedMachineryId}
              onChange={(event) => {
                const machine = machinery.find((item) => item.id === event.target.value);
                setSelectedMachineryId(event.target.value);
                setNewHorometer(machine ? String(machine.currentHorometer) : '');
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
              required
            >
              <option value="">Selecciona maquinaria</option>
              {machinery.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.plateOrCode}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Proyecto
            <select
              value={selectedProject}
              onChange={(event) => setSelectedProject(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
              required
            >
              <option value="">Selecciona proyecto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} · {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Horómetro final
            <input
              type="number"
              min={selectedMachine?.currentHorometer ?? 0}
              step="0.1"
              value={newHorometer}
              onChange={(event) => setNewHorometer(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Operador
            <input
              value={operatorName}
              onChange={(event) => setOperatorName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Fecha
            <input
              type="date"
              value={operationDate}
              onChange={(event) => setOperationDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Combustible (galones)
            <span className="relative mt-1 block">
              <Fuel className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="number"
                min="0"
                step="0.1"
                value={fuelGallons}
                onChange={(event) => setFuelGallons(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pr-3 pl-9 text-sm"
                required
              />
            </span>
          </label>
          <div className="flex items-center text-sm text-slate-600">
            <Wrench className="mr-2 h-4 w-4 text-amber-600" />
            {hoursWorked > 0
              ? `${hoursWorked.toFixed(1)} h · ${formatMoney(operationCost)}`
              : 'Ingresa el horómetro final'}
          </div>
          <button
            type="submit"
            disabled={
              !canWrite ||
              isRecording ||
              machinery.length === 0 ||
              projects.length === 0 ||
              hoursWorked <= 0
            }
            className="min-h-10 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRecording ? 'Registrando...' : 'Registrar operación y gasto'}
          </button>
          <p className="text-[11px] text-slate-500 sm:col-span-2 lg:col-span-4">
            El costo se calcula con la tarifa horaria registrada; los galones quedan en la bitácora
            y no se valorizan por separado.
          </p>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-900">
          <CheckCircle2 className="h-5 w-5 text-emerald-700" /> Operaciones recientes
        </h3>
        {machineryLogs.length === 0 ? (
          <p className="text-sm text-slate-500">Las operaciones registradas aparecerán aquí.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {machineryLogs
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 10)
              .map((log) => (
                <li
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {log.machineryName} · {log.hoursWorked} h
                    </p>
                    <p className="text-xs text-slate-500">
                      {projects.find((project) => project.id === log.projectId)?.name ??
                        'Proyecto no disponible'}
                      {' · '}
                      {log.operatorName}
                      {' · '}
                      {log.date}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900">{formatMoney(log.costGTQ)}</span>
                </li>
              ))}
          </ul>
        )}
      </section>

      {isOpenModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="machinery-form-title"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-xs"
        >
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
              <h3 id="machinery-form-title" className="text-base font-bold">
                Registrar Nueva Maquinaria
              </h3>
              <button
                onClick={() => setIsOpenModal(false)}
                className="text-slate-400 hover:text-white"
                aria-label="Cerrar formulario de maquinaria"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={handleCreate}
              className="min-h-0 space-y-3 overflow-y-auto overscroll-contain p-4 text-slate-900 sm:p-5"
            >
              <div>
                <label
                  htmlFor="machinery-name"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Nombre / Equipo
                </label>
                <input
                  id="machinery-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Excavadora CAT 320"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="machinery-model"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Modelo / Año
                  </label>
                  <input
                    id="machinery-model"
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="machinery-plate"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Código / Placa
                  </label>
                  <input
                    id="machinery-plate"
                    type="text"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="machinery-hourly-rate"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Tarifa por Hora (GTQ)
                </label>
                <input
                  id="machinery-hourly-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="machinery-initial-horometer"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Horómetro actual
                </label>
                <input
                  id="machinery-initial-horometer"
                  type="number"
                  min="0"
                  step="0.1"
                  value={initialHorometer}
                  onChange={(e) => setInitialHorometer(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="min-h-11 rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!canWrite || isSaving}
                  className="min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Maquinaria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
