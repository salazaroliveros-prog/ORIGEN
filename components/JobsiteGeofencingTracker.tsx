'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Compass,
  Sliders,
  Bell,
  Check,
  User,
  Building2,
  Smartphone,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react';
import { Employee, AttendanceRecord, Project } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  validateProjectGeofence,
  getCurrentGpsPosition,
  DEFAULT_GEOFENCE_RADIUS_METERS,
} from '@/lib/geofencing';

interface JobsiteGeofencingTrackerProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  projects: Project[];
  activeProjectId?: string;
  onAddAttendance?: (record: AttendanceRecord) => void;
}

export function JobsiteGeofencingTracker({
  employees = [],
  attendance = [],
  projects = [],
  activeProjectId,
  onAddAttendance,
}: JobsiteGeofencingTrackerProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    activeProjectId || projects[0]?.id || ''
  );
  const [allowedRadiusMeters, setAllowedRadiusMeters] = useState<number>(500);

  // Live test check-in state
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [showOverrideInput, setShowOverrideInput] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Manager overrides state for existing records
  const [approvedOverrides, setApprovedOverrides] = useState<Record<string, string>>({});

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const runGeofenceCheck = (coords: { lat: number; lng: number }) => {
    if (!activeProject) return;
    const res = validateProjectGeofence(
      coords.lat,
      coords.lng,
      activeProject.lat || 14.6349,
      activeProject.lng || -90.5069,
      allowedRadiusMeters
    );
    setDistanceMeters(res.distanceMeters);
    setIsWithinGeofence(res.isWithinGeofence);
    setShowOverrideInput(!res.isWithinGeofence);
  };

  const handleGetDeviceGps = async () => {
    setIsLocating(true);
    setGpsError(null);
    try {
      const pos = await getCurrentGpsPosition();
      const coords = { lat: pos.lat, lng: pos.lng };
      setUserCoords(coords);
      setGpsAccuracy(Math.round(pos.accuracy));
      runGeofenceCheck(coords);
    } catch (err: unknown) {
      console.warn('GPS position error:', err);
      setGpsError('No se pudo acceder al GPS satelital. Puede probar la simulación de prueba.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSimulateOnSite = () => {
    if (!activeProject) return;
    setGpsError(null);
    const coords = {
      lat: (activeProject.lat || 14.6349) + 0.00018,
      lng: (activeProject.lng || -90.5069) + 0.00015,
    };
    setUserCoords(coords);
    setGpsAccuracy(10);
    runGeofenceCheck(coords);
  };

  const handleSimulateOffSite = () => {
    if (!activeProject) return;
    setGpsError(null);
    const coords = {
      lat: (activeProject.lat || 14.6349) + 0.012,
      lng: (activeProject.lng || -90.5069) + 0.009,
    };
    setUserCoords(coords);
    setGpsAccuracy(15);
    runGeofenceCheck(coords);
  };

  const handleRegisterCheckIn = () => {
    const emp = employees.find((e) => e.id === selectedEmpId) || employees[0];
    if (!emp || !activeProject) return;

    if (isWithinGeofence === false && !overrideReason.trim()) {
      alert(
        'Debe ingresar un motivo de justificación para autorizar un marcaje fuera de la zona de obra.'
      );
      return;
    }

    const record: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      role: emp.role,
      projectId: activeProject.id,
      projectName: activeProject.name,
      date: new Date().toISOString().split('T')[0],
      status: 'Presente',
      overtimeHours: 0,
      checkInTime: new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
      checkInLat: userCoords?.lat || activeProject.lat,
      checkInLng: userCoords?.lng || activeProject.lng,
      gpsAccuracy: gpsAccuracy || 10,
      isGeofenceViolation: isWithinGeofence === false,
      distanceFromSiteMeters: distanceMeters || 0,
      geofenceOverrideReason: isWithinGeofence === false ? overrideReason : undefined,
    };

    if (onAddAttendance) {
      onAddAttendance(record);
    }

    setSuccessMessage(
      `Marcaje de ${emp.name} registrado con éxito (${
        isWithinGeofence ? 'Dentro de Obra' : 'Excepción Autorizada'
      }).`
    );
    setUserCoords(null);
    setDistanceMeters(null);
    setIsWithinGeofence(null);
    setOverrideReason('');

    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleApproveOverrideForRecord = (recordId: string) => {
    const reason = prompt(
      'Ingrese el motivo de aprobación del marcaje fuera de obra:',
      'Comisión de compras / trámite oficial autorizado'
    );
    if (reason) {
      setApprovedOverrides((prev) => ({ ...prev, [recordId]: reason }));
    }
  };

  // Filter attendance records by geofence status
  const projectAttendance = attendance.filter(
    (a) => !selectedProjectId || a.projectId === selectedProjectId
  );

  const geofenceViolations = projectAttendance.filter(
    (a) => a.isGeofenceViolation && !approvedOverrides[a.id]
  );
  const verifiedOnSite = projectAttendance.filter(
    (a) => !a.isGeofenceViolation || approvedOverrides[a.id]
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <span className="rounded-2xl border border-amber-500/30 bg-amber-500/20 p-3.5 text-amber-400">
            <Compass className="h-7 w-7" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                Rastreador de Geofencing de Obra
              </h2>
              <Badge variant="primary" size="sm">
                GPS Satelital
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Monitoreo perimetral en tiempo real. Genera alertas cuando el personal marca fuera de
              las coordenadas oficiales de la obra.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="elevated" padding="md" className="border-slate-800 bg-slate-900/80">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Total Marcajes Hoy
            </p>
            <span className="rounded-lg bg-blue-500/10 p-1.5 text-blue-400">
              <Smartphone className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1 text-2xl font-black text-white">{projectAttendance.length}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Entradas validadas por GPS</p>
        </Card>

        <Card variant="elevated" padding="md" className="border-slate-800 bg-slate-900/80">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Dentro de Perímetro
            </p>
            <span className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1 text-2xl font-black text-emerald-400">{verifiedOnSite.length}</p>
          <p className="mt-0.5 text-[11px] text-emerald-400/80">Ubicación física confirmada</p>
        </Card>

        <Card
          variant="elevated"
          padding="md"
          className={`border ${
            geofenceViolations.length > 0
              ? 'border-rose-800/80 bg-rose-950/30'
              : 'border-slate-800 bg-slate-900/80'
          }`}
        >
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold tracking-wider text-rose-400 uppercase">
              Alertas Fuera de Obra
            </p>
            <span className="rounded-lg bg-rose-500/20 p-1.5 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1 text-2xl font-black text-rose-400">{geofenceViolations.length}</p>
          <p className="mt-0.5 text-[11px] text-rose-300/80">
            {geofenceViolations.length > 0
              ? 'Requieren revisión del Administrador'
              : 'Sin infracciones'}
          </p>
        </Card>

        <Card variant="elevated" padding="md" className="border-slate-800 bg-slate-900/80">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Radio Tolerancia Geofence
            </p>
            <span className="rounded-lg bg-amber-500/10 p-1.5 text-amber-400">
              <Sliders className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1 text-2xl font-black text-amber-400">{allowedRadiusMeters} m</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Perímetro alrededor del centro</p>
        </Card>
      </div>

      {/* Active Project Location Card & Radius Config */}
      {activeProject && (
        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-800 pb-3 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-sky-500/30 bg-sky-500/20 p-2.5 text-sky-400">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Coordenadas Centrales de Obra: {activeProject.name}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  Latitud: {activeProject.lat || 14.6349}° • Longitud:{' '}
                  {activeProject.lng || -90.5069}° • {activeProject.municipality},{' '}
                  {activeProject.department}
                </p>
              </div>
            </div>

            {/* Radius Slider */}
            <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800/80 p-2.5 md:w-auto">
              <span className="shrink-0 text-xs font-bold text-slate-300">Ajustar Perímetro:</span>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={allowedRadiusMeters}
                onChange={(e) => setAllowedRadiusMeters(Number(e.target.value))}
                className="w-32 cursor-pointer accent-amber-500"
              />
              <span className="shrink-0 font-mono text-xs font-bold text-amber-400">
                {allowedRadiusMeters}m
              </span>
            </div>
          </div>

          {/* Interactive Check-In Tester */}
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-white uppercase">
                <Navigation className="h-4 w-4 text-emerald-400" />
                Validación de Entrada / Marcaje con GPS
              </h4>
              <span className="font-mono text-[10px] text-slate-400">
                Presione para probar la captura de ubicación
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-400">
                  Empleado a Registrar
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-2 md:col-span-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLocating}
                  onClick={handleGetDeviceGps}
                  className="flex flex-1 items-center justify-center gap-1.5 border-sky-500/30 bg-sky-500/10 text-xs font-bold text-sky-300"
                >
                  <Navigation className="h-3.5 w-3.5 text-sky-400" />
                  <span>Obtener GPS Real</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSimulateOnSite}
                  className="flex flex-1 items-center justify-center gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-300"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Simular Dentro (~25m)</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSimulateOffSite}
                  className="flex flex-1 items-center justify-center gap-1.5 border-rose-500/30 bg-rose-500/10 text-xs font-bold text-rose-300"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                  <span>Simular Fuera (+850m)</span>
                </Button>
              </div>
            </div>

            {/* GPS Result Preview Box */}
            {userCoords && (
              <div
                className={`animate-in fade-in space-y-3 rounded-2xl border p-4 ${
                  isWithinGeofence
                    ? 'border-emerald-800 bg-emerald-950/40 text-emerald-200'
                    : 'border-rose-800 bg-rose-950/40 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-extrabold">
                    {isWithinGeofence ? (
                      <>
                        <ShieldCheck className="h-4 w-4 text-emerald-400" /> Marcaje Válido en
                        Perímetro
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 animate-bounce text-rose-400" /> ¡Alerta!
                        Fuera del Perímetro de Obra
                      </>
                    )}
                  </span>
                  <span className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold">
                    Distancia: {distanceMeters} metros
                  </span>
                </div>

                <p className="font-mono text-xs leading-relaxed">
                  Coordenadas capturadas: {userCoords.lat.toFixed(6)}°, {userCoords.lng.toFixed(6)}°
                  (Precisión: ±{gpsAccuracy}m)
                </p>

                {!isWithinGeofence && (
                  <div className="space-y-2 border-t border-rose-800/60 pt-2">
                    <label className="block text-xs font-bold text-rose-300">
                      Justificación requerida para autorizar excepción fuera de obra:
                    </label>
                    <input
                      type="text"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Ej. Trámite de licencia en municipalidad / Compra urgente de insumos"
                      className="w-full rounded-xl border border-rose-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    variant={isWithinGeofence ? 'primary' : 'danger'}
                    size="sm"
                    onClick={handleRegisterCheckIn}
                    className="font-bold shadow-md"
                  >
                    Confirmar Registro de Asistencia GPS
                  </Button>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-800 bg-emerald-950 p-3 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANAGER ALERT FEED: Geofence Violations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
            <Bell className="h-4 w-4 text-rose-400" />
            Alertas de Marcaje Fuera de Perímetro ({geofenceViolations.length})
          </h3>
          <span className="font-mono text-xs text-slate-400">
            Mostrando alertas del proyecto activo
          </span>
        </div>

        {geofenceViolations.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {geofenceViolations.map((v) => (
              <div
                key={v.id}
                className="space-y-3 rounded-2xl border border-rose-800/80 bg-rose-950/30 p-4 text-rose-200 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-extrabold text-white">
                        {v.employeeName}
                      </strong>
                      <span className="rounded border border-rose-700 bg-rose-900 px-2 py-0.5 font-mono text-[10px] text-rose-100 uppercase">
                        {v.role}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-rose-300">{v.projectName}</p>
                  </div>

                  <span className="rounded-md border border-rose-800 bg-rose-950 px-2.5 py-1 font-mono text-[10px] font-bold text-rose-400">
                    +{v.distanceFromSiteMeters || 340}m fuera
                  </span>
                </div>

                <div className="space-y-1 rounded-xl border border-rose-900/60 bg-slate-950/80 p-3 font-mono text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Hora de Marcaje:</span>
                    <span className="font-bold text-amber-400">{v.checkInTime || '07:15 AM'}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Coordenadas:</span>
                    <span>
                      {v.checkInLat?.toFixed(5) || '14.6412'}°,{' '}
                      {v.checkInLng?.toFixed(5) || '-90.5122'}°
                    </span>
                  </div>
                  {v.geofenceOverrideReason && (
                    <p className="pt-1 font-sans text-[11px] text-amber-300">
                      Nota de campo: <em>&quot;{v.geofenceOverrideReason}&quot;</em>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <a
                    href={`https://maps.google.com/?q=${v.checkInLat || 14.6349},${v.checkInLng || -90.5069}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300"
                  >
                    <ExternalLink className="h-3 w-3" /> Ver en Mapa
                  </a>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApproveOverrideForRecord(v.id)}
                    className="text-xs font-bold"
                  >
                    Aprobar Excepción
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            <ShieldCheck className="mx-auto h-8 w-8 text-emerald-400" />
            <p className="text-xs font-bold text-white">Sin alertas pendientes de geofencing</p>
            <p className="text-[11px] text-slate-500">
              Todo el personal registrado se encuentra dentro del perímetro de obra autorizado.
            </p>
          </div>
        )}
      </div>

      {/* Verified On-Site Table */}
      <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Histórico de Marcajes Verificados en Perímetro ({verifiedOnSite.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-700 bg-slate-800/80 font-mono text-[10px] text-slate-400 uppercase">
              <tr>
                <th className="p-3">Empleado</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Obra</th>
                <th className="p-3">Hora</th>
                <th className="p-3">Distancia al Centro</th>
                <th className="p-3">Estado GPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {verifiedOnSite.map((r) => {
                const isApproved = approvedOverrides[r.id];
                return (
                  <tr key={r.id} className="transition hover:bg-slate-800/40">
                    <td className="p-3 font-sans font-bold text-white">{r.employeeName}</td>
                    <td className="p-3 text-slate-400">{r.role}</td>
                    <td className="p-3 text-amber-400">{r.projectName}</td>
                    <td className="p-3 text-slate-300">{r.checkInTime || '07:00 AM'}</td>
                    <td className="p-3 font-bold text-emerald-400">
                      {r.distanceFromSiteMeters || 18}m
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded px-2 py-0.5 font-sans text-[10px] font-bold ${
                          isApproved
                            ? 'border border-sky-700 bg-sky-900 text-sky-200'
                            : 'border border-emerald-700 bg-emerald-900/80 text-emerald-200'
                        }`}
                      >
                        {isApproved ? 'Excepción Aprobada' : 'Confirmado en Obra'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
