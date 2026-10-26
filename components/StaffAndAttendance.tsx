'use client';

import { LaborProductivityChart } from '@/components/LaborProductivityChart';
import { formatGTQ,initialCompanySettings } from '@/lib/data';
import {
DEFAULT_GEOFENCE_RADIUS_METERS,
getCurrentGpsPosition,
validateProjectGeofence
} from '@/lib/geofencing';
import { AttendanceRecord,Employee,Project } from '@/lib/types';
import {
AlertTriangle,
BarChart3,
Check,
CheckCircle2,
Clock,
Compass,
Filter,
MapPin,
Navigation,
Plus,
ShieldCheck,
Smartphone,
Trash2,
XCircle
} from 'lucide-react';
import React,{ useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface StaffAndAttendanceProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  projects: Project[];
  activeProjectId: string;
  onAddEmployee: (emp: Employee) => Promise<boolean>;
  onAddAttendance?: (record: AttendanceRecord) => Promise<boolean>;
  onDeleteAttendance?: (id: string) => void;
}

export const StaffAndAttendance: React.FC<StaffAndAttendanceProps> = ({
  employees,
  attendance,
  projects,
  activeProjectId,
  onAddEmployee,
  onAddAttendance,
  onDeleteAttendance,
}) => {
  // Navigation Tabs: 'asistencia', 'personal', or 'productividad'
  const [activeTab, setActiveTab] = useState<'asistencia' | 'personal' | 'productividad'>('asistencia');

  // Employee creation modal
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<
    'Capataz' | 'Albañil' | 'Ayudante' | 'Arquitecto Residente' | 'Bodeguero' | 'Electricista'
  >('Albañil');
  const [rate, setRate] = useState('175');
  const [phone, setPhone] = useState('+502 ');
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);

  // Attendance Form State
  const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProjectId);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || '');
  const [attendanceDate, setAttendanceDate] = useState<string>(() =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guatemala',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  );
  const [status, setStatus] = useState<'Presente' | 'Ausente' | 'Permiso' | 'Incapacidad IGSS'>(
    'Presente'
  );
  const [overtimeHours, setOvertimeHours] = useState<number>(0);

  // GPS Verification State
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [showOverrideInput, setShowOverrideInput] = useState<boolean>(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  // Filter for history
  const [historyProjectFilter, setHistoryProjectFilter] = useState<string>(activeProjectId);

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  useEffect(() => {
    if (projects.length === 0 || projects.some((project) => project.id === selectedProjectId)) return;
    setSelectedProjectId(
      projects.some((project) => project.id === activeProjectId) ? activeProjectId : projects[0].id
    );
  }, [activeProjectId, projects, selectedProjectId]);

  // Recalculate distance whenever user coords or selected project changes
  const runGeofenceCheck = (coords: { lat: number; lng: number }) => {
    if (!currentProject) {
      setGpsError('Selecciona o crea un proyecto antes de validar la geocerca.');
      return;
    }
    const res = validateProjectGeofence(
      coords.lat,
      coords.lng,
      currentProject.lat,
      currentProject.lng,
      DEFAULT_GEOFENCE_RADIUS_METERS
    );
    setDistanceMeters(res.distanceMeters);
    setIsWithinGeofence(res.isWithinGeofence);
    if (!res.isWithinGeofence) {
      setShowOverrideInput(true);
    } else {
      setShowOverrideInput(false);
      setOverrideReason('');
    }
  };

  // Real GPS Capture from device
  const handleGetLiveGps = async () => {
    if (!currentProject) {
      setGpsError('Selecciona o crea un proyecto antes de validar la geocerca.');
      return;
    }
    setIsLocating(true);
    setGpsError(null);
    try {
      const pos = await getCurrentGpsPosition();
      const coords = { lat: pos.lat, lng: pos.lng };
      setUserCoords(coords);
      setGpsAccuracy(Math.round(pos.accuracy));
      runGeofenceCheck(coords);
    } catch (err: any) {
      console.warn('GPS location error:', err);
      let errorMsg = 'No se pudo obtener la señal GPS del dispositivo.';
      if (err.code === 1) {
        errorMsg = 'Permiso de ubicación denegado en el navegador. Active el GPS o use la simulación de prueba.';
      } else if (err.code === 2) {
        errorMsg = 'Posición no disponible o sin señal satelital.';
      } else if (err.code === 3) {
        errorMsg = 'Tiempo de espera agotado al consultar coordenadas GPS.';
      }
      setGpsError(errorMsg);
    } finally {
      setIsLocating(false);
    }
  };

  // Test / Demo: simulate employee directly on-site (within 35m)
  const handleSimulateOnSite = () => {
    if (!currentProject) {
      setGpsError('Selecciona o crea un proyecto antes de validar la geocerca.');
      return;
    }
    setGpsError(null);
    // Add micro-offset (~30m)
    const simulated = {
      lat: currentProject.lat + 0.00022,
      lng: currentProject.lng + 0.00018,
    };
    setUserCoords(simulated);
    setGpsAccuracy(8);
    runGeofenceCheck(simulated);
  };

  // Test / Demo: simulate employee outside geofence (e.g. 1.4km away)
  const handleSimulateOffSite = () => {
    if (!currentProject) {
      setGpsError('Selecciona o crea un proyecto antes de validar la geocerca.');
      return;
    }
    setGpsError(null);
    // Add ~1.4km offset
    const simulated = {
      lat: currentProject.lat + 0.0125,
      lng: currentProject.lng + 0.0095,
    };
    setUserCoords(simulated);
    setGpsAccuracy(15);
    runGeofenceCheck(simulated);
  };

  // Register Attendance Form Submit with 500-meter Geolocation Validation Layer
  const handleRegisterAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) {
      setGpsError('Crea un proyecto antes de registrar asistencia.');
      return;
    }

    const emp = employees.find((x) => x.id === selectedEmployeeId) || employees[0];
    if (!emp) return;

    let activeCoords = userCoords;
    let activeWithin = isWithinGeofence;
    let activeDist = distanceMeters;

    // Validation layer for "Presente" status using Geolocation API
    if (status === 'Presente') {
      if (!activeCoords) {
        setIsLocating(true);
        setGpsError(null);
        try {
          const pos = await getCurrentGpsPosition();
          activeCoords = { lat: pos.lat, lng: pos.lng };
          setUserCoords(activeCoords);
          setGpsAccuracy(Math.round(pos.accuracy));

          const res = validateProjectGeofence(
            activeCoords.lat,
            activeCoords.lng,
            currentProject.lat,
            currentProject.lng,
            DEFAULT_GEOFENCE_RADIUS_METERS
          );
          activeDist = res.distanceMeters;
          activeWithin = res.isWithinGeofence;
          setDistanceMeters(activeDist);
          setIsWithinGeofence(activeWithin);
        } catch (err: any) {
          setIsLocating(false);
          let errorMsg = 'Validación Geográfica Obligatoria: Active los permisos de GPS del navegador para verificar que el empleado se encuentre dentro del radio de 500 metros de la obra.';
          if (err.code === 1) {
            errorMsg = 'Permiso de ubicación denegado en el navegador. Por favor autorice el acceso GPS o use la simulación "En Obra" para verificar.';
          }
          setGpsError(errorMsg);
          return;
        } finally {
          setIsLocating(false);
        }
      }

      // Strict validation check: Must be within 500-meter radius
      if (activeWithin === false && !overrideReason.trim()) {
        setGpsError(
          `⛔ Bloqueo de Asistencia por Geocerca: El empleado se encuentra a ${activeDist}m del proyecto (radio máximo permitido: ${DEFAULT_GEOFENCE_RADIUS_METERS} metros). Para registrar asistencia fuera de la obra se requiere una justificación autorizada por el supervisor.`
        );
        setShowOverrideInput(true);
        return;
      }
    }

    if (!onAddAttendance) {
      setGpsError('El registro de asistencia no está disponible en este momento.');
      return;
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      projectId: selectedProjectId,
      date: attendanceDate,
      employeeId: emp.id,
      employeeName: emp.name,
      status,
      overtimeHours: Number(overtimeHours) || 0,
      ...(activeCoords ? { gpsCoords: activeCoords } : {}),
      ...(activeWithin !== null ? { gpsVerified: activeWithin } : {}),
      ...(activeDist !== null ? { distanceMeters: activeDist } : {}),
      ...(activeCoords
        ? {
            gpsTimestamp: `${attendanceDate} ${new Date().toLocaleTimeString('es-GT', {
              hour: '2-digit',
              minute: '2-digit',
            })}`,
          }
        : {}),
      ...(activeWithin === false ? { overrideReason: overrideReason.trim() } : {}),
    };

    const saved = await onAddAttendance(newRecord);
    if (!saved) {
      setGpsError('No se pudo guardar el registro de asistencia. Inténtalo nuevamente.');
      return;
    }

    setSaveSuccessToast(`Asistencia de ${emp.name} registrada correctamente (Validación: ${activeWithin ? 'En Obra <500m' : 'Excepción auditada'}).`);
    setTimeout(() => setSaveSuccessToast(null), 4000);

    // Reset temporary state
    setUserCoords(null);
    setDistanceMeters(null);
    setIsWithinGeofence(null);
    setOverrideReason('');
    setShowOverrideInput(false);
    setGpsError(null);
  };

  // Employee creation submit
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Ingresa el nombre del empleado.');
      return;
    }

    const emp: Employee = {
      id: `emp-${Date.now()}`,
      name: name.trim(),
      role,
      dailyRateGTQ: Number(rate) || 150,
      igssAffiliated: true,
      phone,
    };

    setIsSavingEmployee(true);
    try {
      if (await onAddEmployee(emp)) {
        setIsOpenModal(false);
        setName('');
      }
    } catch (error) {
      console.error('No se pudo registrar el empleado:', error);
      toast.error('No se pudo registrar el empleado.');
    } finally {
      setIsSavingEmployee(false);
    }
  };

  // Attendance metrics
  const filteredAttendance = attendance.filter(
    (a) => historyProjectFilter === 'all' || a.projectId === historyProjectFilter
  );

  const totalRegistered = filteredAttendance.length;
  const verifiedGpsCount = filteredAttendance.filter((a) => a.gpsVerified === true).length;
  const outsideCount = filteredAttendance.filter((a) => a.gpsVerified === false).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Navigation className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Control de Personal, Cuadrillas & Asistencia con Geocerca GPS
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Validación satelital en tiempo real: compara las coordenadas del empleado con el perímetro del proyecto ({DEFAULT_GEOFENCE_RADIUS_METERS}m de radio).
          </p>
        </div>

        <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
          {/* Navigation Pill Buttons */}
          <div className="flex w-full min-w-0 flex-col bg-slate-100 p-1 rounded-xl border border-slate-200 sm:w-auto sm:flex-row">
            <button
              onClick={() => setActiveTab('asistencia')}
              className={`min-h-11 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer sm:min-h-9 ${
                activeTab === 'asistencia'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Registro & Marcaje GPS
            </button>
            <button
              onClick={() => setActiveTab('personal')}
              className={`min-h-11 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer sm:min-h-9 ${
                activeTab === 'personal'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cuadrillas ({employees.length})
            </button>
            <button
              onClick={() => setActiveTab('productividad')}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer sm:min-h-9 ${
                activeTab === 'productividad'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Productividad Recharts
            </button>
          </div>

          <button
            onClick={() => setIsOpenModal(true)}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo Empleado
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Nómina Total</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{employees.length} trabajadores</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Albañiles, ayudantes y capataces</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-blue-600 uppercase">Marcajes Registrados</p>
          <p className="text-xl font-bold text-blue-950 mt-1">{totalRegistered} asistencias</p>
          <p className="text-[10px] text-blue-600 mt-0.5">En historial del proyecto</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase">Verificados en Obra (GPS)</p>
          <p className="text-xl font-bold text-emerald-950 mt-1">{verifiedGpsCount} en sitio</p>
          <p className="text-[10px] text-emerald-700 mt-0.5">Dentro del radio de {DEFAULT_GEOFENCE_RADIUS_METERS}m</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-amber-600 uppercase">Excepciones / Fuera Obra</p>
          <p className="text-xl font-bold text-amber-950 mt-1">{outsideCount} advertencias</p>
          <p className="text-[10px] text-amber-700 mt-0.5">Con justificación autorizada</p>
        </div>
      </div>

      {/* SUCCESS TOAST */}
      {saveSuccessToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <p className="text-xs font-bold">{saveSuccessToast}</p>
          </div>
          <button
            onClick={() => setSaveSuccessToast(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* VIEW 1: ATTENDANCE REGISTRATION & GPS AUDIT */}
      {activeTab === 'asistencia' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Geofence Check-in Form (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Compass className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">Registrar Asistencia en Obra</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                  Geocerca Activa
                </span>
              </div>

              <form onSubmit={handleRegisterAttendance} className="space-y-4">
                {/* Project selector */}
                <div>
                  <label htmlFor="attendance-project" className="block text-xs font-semibold text-slate-700 mb-1">
                    Proyecto / Frente de Obra
                  </label>
                  <select
                    id="attendance-project"
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      if (userCoords) {
                        const proj = projects.find((p) => p.id === e.target.value);
                        if (proj) {
                          const res = validateProjectGeofence(
                            userCoords.lat,
                            userCoords.lng,
                            proj.lat,
                            proj.lng,
                            DEFAULT_GEOFENCE_RADIUS_METERS
                          );
                          setDistanceMeters(res.distanceMeters);
                          setIsWithinGeofence(res.isWithinGeofence);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {currentProject
                      ? `Coords Obra: ${currentProject.lat.toFixed(4)}° N, ${currentProject.lng.toFixed(4)}° W (${currentProject.municipality})`
                      : 'Crea un proyecto para habilitar el registro de asistencia.'}
                  </p>
                </div>

                {/* Employee selector */}
                <div>
                  <label htmlFor="attendance-employee" className="block text-xs font-semibold text-slate-700 mb-1">
                    Empleado / Miembro de Cuadrilla
                  </label>
                  <select
                    id="attendance-employee"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {emp.role} ({formatGTQ(emp.dailyRateGTQ)}/día)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date and Overtime */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="attendance-date" className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                    <input
                      id="attendance-date"
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="attendance-overtime" className="block text-xs font-semibold text-slate-700 mb-1">Horas Extras</label>
                    <input
                      id="attendance-overtime"
                      type="number"
                      min="0"
                      max="12"
                      value={overtimeHours}
                      onChange={(e) => setOvertimeHours(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                    />
                  </div>
                </div>

                {/* Status selector */}
                <div>
                  <label htmlFor="attendance-status" className="block text-xs font-semibold text-slate-700 mb-1">Estado de Asistencia</label>
                  <select
                    id="attendance-status"
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium"
                  >
                    <option value="Presente">Presente en Sitio</option>
                    <option value="Ausente">Ausente / Inasistencia</option>
                    <option value="Permiso">Permiso Autorizado</option>
                    <option value="Incapacidad IGSS">Incapacidad Médica IGSS</option>
                  </select>
                </div>

                {/* GPS VALIDATION BOX */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                      Validación GPS de Ubicación
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Radio max: {DEFAULT_GEOFENCE_RADIUS_METERS}m
                    </span>
                  </div>

                  {/* Actions to get or simulate GPS */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleGetLiveGps}
                      disabled={isLocating}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                    >
                      <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                      {isLocating ? 'Detectando GPS...' : 'Obtener GPS en Vivo'}
                    </button>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={handleSimulateOnSite}
                        className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold transition cursor-pointer"
                        title="Simular ubicación dentro de la obra (30m de distancia)"
                      >
                        En Obra
                      </button>
                      <button
                        type="button"
                        onClick={handleSimulateOffSite}
                        className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold transition cursor-pointer"
                        title="Simular ubicación fuera de la obra (1.4km de distancia)"
                      >
                        Fuera
                      </button>
                    </div>
                  </div>

                  {/* GPS Error Alert */}
                  {gpsError && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p>{gpsError}</p>
                    </div>
                  )}

                  {/* GPS Coordinates & Result Display */}
                  {userCoords && distanceMeters !== null && (
                    <div
                      className={`p-3 rounded-xl border text-xs space-y-2 transition ${
                        isWithinGeofence
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50/80 border-rose-200 text-rose-950'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isWithinGeofence ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span className="font-bold">
                            {isWithinGeofence ? 'EN OBRA — GPS CONFIRMADO' : 'FUERA DEL PERÍMETRO'}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-full ${
                            isWithinGeofence
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {distanceMeters} metros
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-200/60 font-mono">
                        <p>GPS Empleado: {userCoords.lat.toFixed(5)}°, {userCoords.lng.toFixed(5)}°</p>
                        {currentProject && (
                          <p>Punto Proyecto: {currentProject.lat.toFixed(5)}°, {currentProject.lng.toFixed(5)}°</p>
                        )}
                        {gpsAccuracy && <p>Precisión Satelital: ±{gpsAccuracy}m</p>}
                      </div>

                      {!isWithinGeofence && (
                        <p className="text-[11px] text-rose-800 font-semibold pt-1">
                          ⚠️ El empleado excede la tolerancia permitida ({DEFAULT_GEOFENCE_RADIUS_METERS}m). Se registrará una excepción auditada.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Override input when outside geofence */}
                  {showOverrideInput && isWithinGeofence === false && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                      <label htmlFor="attendance-override-reason" className="block text-[11px] font-bold text-amber-900">
                        Justificación de Excepción (Obligatoria para Capataz/Supervisor)
                      </label>
                      <input
                        id="attendance-override-reason"
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Ej. Comisión de compra de insumos en ferretería central"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-white text-slate-900 placeholder:text-slate-400"
                        required
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Guardar Registro de Asistencia
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: History Table with GPS Badges (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Historial de Marcajes y Auditoría GPS</h3>
                    <p className="text-[11px] text-slate-500">
                      Verificación de presencia física con geocerca en obras de Guatemala.
                    </p>
                  </div>
                </div>

                {/* Filter by project */}
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={historyProjectFilter}
                    onChange={(e) => setHistoryProjectFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-slate-50 text-slate-800"
                  >
                    <option value="all">Todos los Proyectos</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Records List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="pb-2.5 pl-1">Fecha</th>
                      <th className="pb-2.5">Empleado</th>
                      <th className="pb-2.5">Proyecto</th>
                      <th className="pb-2.5">Estado</th>
                      <th className="pb-2.5">Verificación GPS</th>
                      <th className="pb-2.5 text-right pr-1">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                          No hay registros de asistencia para este filtro.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((rec) => {
                        const proj = projects.find((p) => p.id === rec.projectId);
                        return (
                          <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 pl-1 font-mono text-[11px] text-slate-600">
                              {rec.date}
                            </td>
                            <td className="py-3">
                              <p className="font-bold text-slate-900">{rec.employeeName}</p>
                              {rec.overtimeHours > 0 && (
                                <span className="text-[10px] text-amber-700 font-semibold">
                                  +{rec.overtimeHours}h extras
                                </span>
                              )}
                            </td>
                            <td className="py-3">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {proj?.code || rec.projectId}
                              </span>
                            </td>
                            <td className="py-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  rec.status === 'Presente'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : rec.status === 'Ausente'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-blue-50 text-blue-700'
                                }`}
                              >
                                {rec.status}
                              </span>
                            </td>
                            <td className="py-3">
                              {rec.gpsVerified === true ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    <ShieldCheck className="w-3 h-3" />
                                    En Obra ({rec.distanceMeters ?? '< 250'}m)
                                  </span>
                                  {rec.gpsCoords && (
                                    <p className="text-[9px] font-mono text-slate-400">
                                      {rec.gpsCoords.lat.toFixed(4)}, {rec.gpsCoords.lng.toFixed(4)}
                                    </p>
                                  )}
                                </div>
                              ) : rec.gpsVerified === false ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    Fuera ({rec.distanceMeters ?? '> 250'}m)
                                  </span>
                                  {rec.overrideReason && (
                                    <p className="text-[10px] text-amber-800 italic max-w-[140px] truncate" title={rec.overrideReason}>
                                      &quot;{rec.overrideReason}&quot;
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">
                                  Sin GPS
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-right pr-1">
                              {onDeleteAttendance && (
                                <button
                                  onClick={() => onDeleteAttendance(rec.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="Eliminar registro"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: EMPLOYEES ROSTER & CUADRILLAS */}
      {activeTab === 'personal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {employees.map((emp) => (
            <div key={emp.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                  {emp.role}
                </span>
                {emp.igssAffiliated && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                    IGSS Afiliado
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">{emp.name}</h3>
                <p className="text-xs text-slate-500">{emp.phone}</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500">Jornal Diario:</span>
                <span className="font-bold text-slate-900">{formatGTQ(emp.dailyRateGTQ)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 3: LABOR PRODUCTIVITY RECHARTS VIEW */}
      {activeTab === 'productividad' && (
        <LaborProductivityChart
          employees={employees}
          attendance={attendance}
          projects={projects}
          activeProjectId={activeProjectId}
          company={initialCompanySettings}
          currency="GTQ"
        />
      )}

      {/* CREATE EMPLOYEE MODAL */}
      {isOpenModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="employee-form-title" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[calc(100dvh-2rem)] border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 id="employee-form-title" className="font-bold text-base">Registrar Nuevo Empleado</h3>
              <button
                onClick={() => setIsOpenModal(false)}
                className="text-slate-400 hover:text-white"
                aria-label="Cerrar formulario de empleado"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateEmployee} className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3 text-slate-900 [&_input::placeholder]:text-slate-600">
              <div>
                <label htmlFor="employee-name" className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo</label>
                <input
                  id="employee-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Juan Carlos Tumax"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="employee-role" className="block text-xs font-semibold text-slate-700 mb-1">Puesto / Rol</label>
                  <select
                    id="employee-role"
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50"
                  >
                    <option value="Capataz">Capataz</option>
                    <option value="Albañil">Albañil</option>
                    <option value="Ayudante">Ayudante</option>
                    <option value="Arquitecto Residente">Arquitecto Residente</option>
                    <option value="Bodeguero">Bodeguero</option>
                    <option value="Electricista">Electricista</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="employee-daily-rate" className="block text-xs font-semibold text-slate-700 mb-1">Jornal Diario (Q)</label>
                  <input
                    id="employee-daily-rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="employee-phone" className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                <input
                  id="employee-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50"
                />
              </div>
              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="min-h-11 px-4 py-2 rounded-xl text-sm text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEmployee}
                  className="min-h-11 px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-sm"
                >
                  {isSavingEmployee ? 'Guardando...' : 'Guardar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
