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

export const JobsiteGeofencingTracker: React.FC<JobsiteGeofencingTrackerProps> = ({
  employees = [],
  attendance = [],
  projects = [],
  activeProjectId,
  onAddAttendance,
}) => {
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
    } catch (err: any) {
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
      alert('Debe ingresar un motivo de justificación para autorizar un marcaje fuera de la zona de obra.');
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
    const reason = prompt('Ingrese el motivo de aprobación del marcaje fuera de obra:', 'Comisión de compras / trámite oficial autorizado');
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
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Compass className="w-7 h-7" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">Rastreador de Geofencing de Obra</h2>
              <Badge variant="primary" size="sm">
                GPS Satelital
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Monitoreo perimetral en tiempo real. Genera alertas cuando el personal marca fuera de las coordenadas oficiales de la obra.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated" padding="md" className="bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Marcajes Hoy</p>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Smartphone className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-white mt-1">{projectAttendance.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Entradas validadas por GPS</p>
        </Card>

        <Card variant="elevated" padding="md" className="bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dentro de Perímetro</p>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">{verifiedOnSite.length}</p>
          <p className="text-[11px] text-emerald-400/80 mt-0.5">Ubicación física confirmada</p>
        </Card>

        <Card
          variant="elevated"
          padding="md"
          className={`border ${
            geofenceViolations.length > 0
              ? 'bg-rose-950/30 border-rose-800/80'
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Alertas Fuera de Obra</p>
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-rose-400 mt-1">{geofenceViolations.length}</p>
          <p className="text-[11px] text-rose-300/80 mt-0.5">
            {geofenceViolations.length > 0 ? 'Requieren revisión del Administrador' : 'Sin infracciones'}
          </p>
        </Card>

        <Card variant="elevated" padding="md" className="bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Radio Tolerancia Geofence</p>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Sliders className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1">{allowedRadiusMeters} m</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Perímetro alrededor del centro</p>
        </Card>
      </div>

      {/* Active Project Location Card & Radius Config */}
      {activeProject && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <Building2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Coordenadas Centrales de Obra: {activeProject.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Latitud: {activeProject.lat || 14.6349}° • Longitud: {activeProject.lng || -90.5069}° • {activeProject.municipality}, {activeProject.department}
                </p>
              </div>
            </div>

            {/* Radius Slider */}
            <div className="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-300 shrink-0">Ajustar Perímetro:</span>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={allowedRadiusMeters}
                onChange={(e) => setAllowedRadiusMeters(Number(e.target.value))}
                className="w-32 accent-amber-500 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-amber-400 shrink-0">
                {allowedRadiusMeters}m
              </span>
            </div>
          </div>

          {/* Interactive Check-In Tester */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-400" />
                Validación de Entrada / Marcaje con GPS
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                Presione para probar la captura de ubicación
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Empleado a Registrar</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex items-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLocating}
                  onClick={handleGetDeviceGps}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-sky-300 border-sky-500/30 bg-sky-500/10"
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-400" />
                  <span>Obtener GPS Real</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSimulateOnSite}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Simular Dentro (~25m)</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSimulateOffSite}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-300 border-rose-500/30 bg-rose-500/10"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Simular Fuera (+850m)</span>
                </Button>
              </div>
            </div>

            {/* GPS Result Preview Box */}
            {userCoords && (
              <div
                className={`p-4 rounded-2xl border space-y-3 animate-in fade-in ${
                  isWithinGeofence
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-800 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs flex items-center gap-2">
                    {isWithinGeofence ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" /> Marcaje Válido en Perímetro
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" /> ¡Alerta! Fuera del Perímetro de Obra
                      </>
                    )}
                  </span>
                  <span className="font-mono text-xs font-bold bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                    Distancia: {distanceMeters} metros
                  </span>
                </div>

                <p className="text-xs leading-relaxed font-mono">
                  Coordenadas capturadas: {userCoords.lat.toFixed(6)}°, {userCoords.lng.toFixed(6)}° (Precisión: ±{gpsAccuracy}m)
                </p>

                {!isWithinGeofence && (
                  <div className="space-y-2 pt-2 border-t border-rose-800/60">
                    <label className="block text-xs font-bold text-rose-300">
                      Justificación requerida para autorizar excepción fuera de obra:
                    </label>
                    <input
                      type="text"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Ej. Trámite de licencia en municipalidad / Compra urgente de insumos"
                      className="w-full bg-slate-900 border border-rose-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}

                <div className="pt-2 flex justify-end">
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
              <div className="bg-emerald-950 border border-emerald-800 text-emerald-300 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANAGER ALERT FEED: Geofence Violations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-rose-400" />
            Alertas de Marcaje Fuera de Perímetro ({geofenceViolations.length})
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Mostrando alertas del proyecto activo
          </span>
        </div>

        {geofenceViolations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {geofenceViolations.map((v) => (
              <div
                key={v.id}
                className="bg-rose-950/30 border border-rose-800/80 rounded-2xl p-4 text-rose-200 space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-white font-extrabold text-sm">{v.employeeName}</strong>
                      <span className="text-[10px] font-mono uppercase bg-rose-900 text-rose-100 border border-rose-700 px-2 py-0.5 rounded">
                        {v.role}
                      </span>
                    </div>
                    <p className="text-xs text-rose-300 mt-0.5">{v.projectName}</p>
                  </div>

                  <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950 border border-rose-800 px-2.5 py-1 rounded-md">
                    +{v.distanceFromSiteMeters || 340}m fuera
                  </span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-rose-900/60 text-xs font-mono space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Hora de Marcaje:</span>
                    <span className="text-amber-400 font-bold">{v.checkInTime || '07:15 AM'}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Coordenadas:</span>
                    <span>{v.checkInLat?.toFixed(5) || '14.6412'}°, {v.checkInLng?.toFixed(5) || '-90.5122'}°</span>
                  </div>
                  {v.geofenceOverrideReason && (
                    <p className="text-[11px] text-amber-300 font-sans pt-1">
                      Nota de campo: <em>&quot;{v.geofenceOverrideReason}&quot;</em>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <a
                    href={`https://maps.google.com/?q=${v.checkInLat || 14.6349},${v.checkInLng || -90.5069}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Ver en Mapa
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-xs font-bold text-white">Sin alertas pendientes de geofencing</p>
            <p className="text-[11px] text-slate-500">
              Todo el personal registrado se encuentra dentro del perímetro de obra autorizado.
            </p>
          </div>
        )}
      </div>

      {/* Verified On-Site Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Histórico de Marcajes Verificados en Perímetro ({verifiedOnSite.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 uppercase font-mono text-[10px] text-slate-400 border-b border-slate-700">
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
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-white font-sans">{r.employeeName}</td>
                    <td className="p-3 text-slate-400">{r.role}</td>
                    <td className="p-3 text-amber-400">{r.projectName}</td>
                    <td className="p-3 text-slate-300">{r.checkInTime || '07:00 AM'}</td>
                    <td className="p-3 text-emerald-400 font-bold">
                      {r.distanceFromSiteMeters || 18}m
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold font-sans ${
                          isApproved
                            ? 'bg-sky-900 text-sky-200 border border-sky-700'
                            : 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
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
};
