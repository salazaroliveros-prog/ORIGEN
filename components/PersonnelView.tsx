/**
 * ORIGEN ERP - Personnel & Attendance View Component
 * Features:
 * - Responsive calendar view for attendance tracking (desktop/mobile toggle)
 * - Overtime validation (max 12 hours per day)
 * - Employee management and attendance records
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Loader,
  Eye,
  EyeOff,
  Calendar,
  List,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { COLORS } from '@/lib/design/constants';
import { Alert } from '@/components/ui/Alert';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string;
  notes: string;
  hoursWorked: number;
  isOvertime: boolean;
  overtimeHours: number;
}

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  phone: string;
  email: string;
  wage: number;
}

interface TimeInput {
  hours: string;
  minutes: string;
}

interface CalendarViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  attendance: AttendanceRecord[];
  setSelectedDate: (date: string | null) => void;
  selectedDate: string | null;
}

function CalendarView({
  currentDate,
  setCurrentDate,
  attendance,
  setSelectedDate,
  selectedDate,
}: CalendarViewProps) {
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days: (number | null)[] = [];
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const dayHasAttendance = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString()
      .split('T')[0];
    return attendance.some((att) => att.date === dateStr);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize text-slate-900">{monthName}</h2>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
            }
            className="rounded-lg p-2 transition-colors hover:bg-slate-100"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-slate-100"
          >
            Hoy
          </button>
          <button
            onClick={() =>
              setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
            }
            className="rounded-lg p-2 transition-colors hover:bg-slate-100"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-7 gap-1">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'].map((day) => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-slate-600">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const dateStr = day
            ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                .toISOString()
                .split('T')[0]
            : null;

          return (
            <div
              key={`cal-${currentDate.getFullYear()}-${currentDate.getMonth()}-${idx}`}
              onClick={() => day && dateStr && setSelectedDate(dateStr)}
              className={`relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                day && dayHasAttendance(day)
                  ? COLORS.attendance.present
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              } ${dateStr === selectedDate ? 'ring-4 ring-blue-500' : ''}`}
              role="button"
              aria-label={
                day
                  ? `${day} de ${currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}`
                  : undefined
              }
            >
              {day}
              {day && dayHasAttendance(day) && (
                <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-green-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PersonnelView({ projectId }: { projectId: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [clockInTime, setClockInTime] = useState<TimeInput>({ hours: '08', minutes: '00' });
  const [clockOutTime, setClockOutTime] = useState<TimeInput>({ hours: '17', minutes: '00' });
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [overtimeWarning, setOvertimeWarning] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setEmployees([
        {
          id: 'emp-1',
          name: 'Juan Pérez',
          position: 'Maestro Carpintero',
          department: 'Construcción',
          phone: '5555-1234',
          email: 'juan@origen.com',
          wage: 8000,
        },
        {
          id: 'emp-2',
          name: 'María García',
          position: 'Capataz',
          department: 'Supervisión',
          phone: '5555-5678',
          email: 'maria@origen.com',
          wage: 10000,
        },
      ]);

      setAttendance([
        {
          id: 'att-1',
          employeeId: 'emp-1',
          date: new Date().toISOString().split('T')[0],
          clockIn: '08:00',
          clockOut: '17:00',
          notes: 'Normal',
          hoursWorked: 9,
          isOvertime: false,
          overtimeHours: 0,
        },
      ]);

      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleTimeChange = (type: 'in' | 'out', field: 'hours' | 'minutes', value: string) => {
    const newValue = value.replace(/\D/g, '').padStart(2, '0').slice(0, 2);

    if (type === 'in') {
      setClockInTime((prev) => ({ ...prev, [field]: newValue }));
    } else {
      setClockOutTime((prev) => ({ ...prev, [field]: newValue }));
    }

    setTimeout(() => {
      const inHours = parseInt(clockInTime.hours) + parseInt(clockInTime.minutes) / 60;
      const outHours =
        parseInt(value) +
        (field === 'minutes' ? parseInt(clockOutTime.hours) : parseInt(clockOutTime.hours)) / 60;
      const diff = outHours - inHours;

      if (diff > 12) {
        setOvertimeWarning('⚠️ Máximo 12 horas permitidas. Ajusta los tiempos.');
      } else if (diff > 8) {
        setOvertimeWarning(`⚠️ Horas extra: ${(diff - 8).toFixed(2)}h`);
      } else {
        setOvertimeWarning('');
      }
    }, 0);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedEmployee) errors.employee = 'Selecciona un empleado';
    if (!formDate) errors.date = 'Selecciona una fecha';

    const inHours = parseInt(clockInTime.hours) + parseInt(clockInTime.minutes) / 60;
    const outHours = parseInt(clockOutTime.hours) + parseInt(clockOutTime.minutes) / 60;
    const hoursWorked = outHours - inHours;

    if (hoursWorked <= 0) {
      errors.time = 'La hora de salida debe ser después de la entrada';
    }
    if (hoursWorked > 12) {
      errors.time = '❌ No se permite más de 12 horas de trabajo por día';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor verifica los datos');
      return;
    }

    try {
      const inHours = parseInt(clockInTime.hours) + parseInt(clockInTime.minutes) / 60;
      const outHours = parseInt(clockOutTime.hours) + parseInt(clockOutTime.minutes) / 60;
      const hoursWorked = outHours - inHours;
      const overtimeHours = Math.max(0, hoursWorked - 8);

      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        employeeId: selectedEmployee,
        date: formDate,
        clockIn: `${clockInTime.hours.padStart(2, '0')}:${clockInTime.minutes.padStart(2, '0')}`,
        clockOut: `${clockOutTime.hours.padStart(2, '0')}:${clockOutTime.minutes.padStart(2, '0')}`,
        notes,
        hoursWorked: parseFloat(hoursWorked.toFixed(2)),
        isOvertime: overtimeHours > 0,
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      };

      setAttendance((prev) => [...prev, newRecord]);
      toast.success('Asistencia registrada');

      setSelectedEmployee('');
      setFormDate(new Date().toISOString().split('T')[0]);
      setClockInTime({ hours: '08', minutes: '00' });
      setClockOutTime({ hours: '17', minutes: '00' });
      setNotes('');
      setFormErrors({});
      setOvertimeWarning('');
      setShowForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error');
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const selectedDateAttendance = selectedDate
    ? attendance.filter((att) => att.date === selectedDate)
    : [];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center gap-2 text-slate-600">
          <Loader className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Cargando personal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Personal & Asistencia</h1>
          <p className="mt-1 text-sm text-slate-600">Total empleados: {employees.length}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors ${
              viewMode === 'calendar'
                ? 'bg-blue-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Calendario</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <List className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Lista</span>
          </button>
        </div>
      </div>

      {viewMode === 'calendar' && (
        <CalendarView
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          attendance={attendance}
          setSelectedDate={setSelectedDate}
          selectedDate={selectedDate}
        />
      )}

      {selectedDate && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-900">
            Asistencia - {new Date(selectedDate).toLocaleDateString('es-ES')}
          </h3>
          {selectedDateAttendance.length === 0 ? (
            <p className="text-sm text-slate-600">Sin registros de asistencia</p>
          ) : (
            <div className="space-y-2">
              {selectedDateAttendance.map((att) => {
                const employee = employees.find((e) => e.id === att.employeeId);
                return (
                  <div
                    key={att.id}
                    className={`rounded-lg border p-3 ${
                      att.isOvertime
                        ? 'border-orange-200 bg-orange-50'
                        : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{employee?.name}</p>
                        <p className="text-xs text-slate-600">
                          {att.clockIn} - {att.clockOut} ({att.hoursWorked}h)
                        </p>
                      </div>
                      {att.isOvertime && (
                        <div className="flex items-center gap-1 rounded bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                          <Clock className="h-3 w-3" />+{att.overtimeHours}h
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Registrar Asistencia</h3>

          {overtimeWarning && (
            <Alert
              variant="warning"
              title="Advertencia"
              message={overtimeWarning}
              dismissible={false}
              className="mb-4"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Empleado *
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.employee
                      ? 'border-red-500 bg-red-50'
                      : selectedEmployee
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-300'
                  }`}
                >
                  <option value="">Selecciona un empleado</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.position}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Fecha *</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.date
                      ? 'border-red-500 bg-red-50'
                      : formDate
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Entrada *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clockInTime.hours}
                    onChange={(e) => handleTimeChange('in', 'hours', e.target.value)}
                    maxLength={2}
                    className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="HH"
                  />
                  <span className="flex items-center font-semibold text-slate-600">:</span>
                  <input
                    type="text"
                    value={clockInTime.minutes}
                    onChange={(e) => handleTimeChange('in', 'minutes', e.target.value)}
                    maxLength={2}
                    className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="MM"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Salida *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clockOutTime.hours}
                    onChange={(e) => handleTimeChange('out', 'hours', e.target.value)}
                    maxLength={2}
                    className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="HH"
                  />
                  <span className="flex items-center font-semibold text-slate-600">:</span>
                  <input
                    type="text"
                    value={clockOutTime.minutes}
                    onChange={(e) => handleTimeChange('out', 'minutes', e.target.value)}
                    maxLength={2}
                    className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="MM"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Notas adicionales…"
              />
            </div>

            {formErrors.time && (
              <Alert
                variant="error"
                title="Error de tiempo"
                message={formErrors.time}
                dismissible={false}
                className="mb-4"
              />
            )}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Registrar
              </button>
            </div>
          </form>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Empleado</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Entrada</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Salida</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Horas</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Extra</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 10).map((att) => {
                  const employee = employees.find((e) => e.id === att.employeeId);
                  return (
                    <tr key={att.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3">{employee?.name}</td>
                      <td className="px-4 py-3">{att.date}</td>
                      <td className="px-4 py-3">{att.clockIn}</td>
                      <td className="px-4 py-3">{att.clockOut}</td>
                      <td className="px-4 py-3 text-center font-semibold">{att.hoursWorked}h</td>
                      <td className="px-4 py-3 text-center">
                        {att.isOvertime ? (
                          <span className="rounded bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                            +{att.overtimeHours}h
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Registrar Asistencia
        </button>
      )}
    </div>
  );
}

export default PersonnelView;
