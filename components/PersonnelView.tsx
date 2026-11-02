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
  AlertCircle,
  Loader,
  Eye,
  EyeOff,
  Calendar,
  List,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { COLORS } from '@/lib/design/constants';

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

export function PersonnelView({ projectId }: { projectId: string }) {
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // FEATURE 3.1: Calendar/List view toggle
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [clockInTime, setClockInTime] = useState<TimeInput>({ hours: '08', minutes: '00' });
  const [clockOutTime, setClockOutTime] = useState<TimeInput>({ hours: '17', minutes: '00' });
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // FEATURE 3.2: Overtime validation state
  const [overtimeWarning, setOvertimeWarning] = useState('');

  // Simulate data load
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

  // FEATURE 3.2: Calculate hours and validate overtime (max 12 hours)
  const handleTimeChange = (type: 'in' | 'out', field: 'hours' | 'minutes', value: string) => {
    const newValue = value.replace(/\D/g, '').padStart(2, '0').slice(0, 2);

    if (type === 'in') {
      setClockInTime(prev => ({
        ...prev,
        [field]: newValue,
      }));
    } else {
      setClockOutTime(prev => ({
        ...prev,
        [field]: newValue,
      }));
    }

    // Calculate hours and check overtime
    setTimeout(() => {
      const inHours = parseInt(clockInTime.hours) + parseInt(clockInTime.minutes) / 60;
      const outHours = parseInt(value) + (field === 'minutes' ? parseInt(clockOutTime.hours) : parseInt(clockOutTime.hours)) / 60;

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

  // FEATURE 3.2: Validate form with overtime check
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

  // Handle attendance submission
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

      setAttendance(prev => [...prev, newRecord]);
      toast.success('Asistencia registrada');

      // Reset form
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

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Get first day of month
  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Filter attendance by selected date
  const selectedDateAttendance = selectedDate
    ? attendance.filter(att => att.date === selectedDate)
    : [];

  // FEATURE 3.1: Calendar View Component
  const CalendarView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    // Empty cells before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const dayHasAttendance = (day: number) => {
      const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        .toISOString()
        .split('T')[0];
      return attendance.some(att => att.date === dateStr);
    };

    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900 capitalize">{monthName}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-slate-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days - FIXED: Increased touch targets to min 44x44px, added attendance indicator */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => (
              <div className="flex gap-2">
                <div
                  onClick={() => setSelectedDate(dateStr)}
                  className={`h-12 w-12 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors relative cursor-pointer ${
                    dayHasAttendance(day)
                      ? COLORS.attendance.present
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  } ${
                    selectedDate === dateStr
                      ? 'ring-4 ring-blue-500'
                      : ''
                  }`}
                  role="button"
                  aria-label={day ? `${day} de ${currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}` : undefined}
                >
                  {day}
                  {day && dayHasAttendance(day) && (
                    <span className="absolute bottom-1 right-1 h-2.5 w-2.5 bg-green-500 rounded-full" />
                  )}
                </div>
              </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center gap-2 text-slate-600">
          <Loader className="h-5 w-5 animate-spin" />
          <span>Cargando personal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-slate-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Personal & Asistencia</h1>
          <p className="text-sm text-slate-600 mt-1">Total empleados: {employees.length}</p>
        </div>

        {/* View Mode Toggle - FEATURE 3.1 */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
              viewMode === 'calendar'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendario</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </button>
        </div>
      </div>

      {/* Calendar View - FEATURE 3.1 */}
      {viewMode === 'calendar' && <CalendarView />}

      {/* Attendance Details for Selected Date */}
      {selectedDate && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-3">
            Asistencia - {new Date(selectedDate).toLocaleDateString('es-ES')}
          </h3>
          {selectedDateAttendance.length === 0 ? (
            <p className="text-sm text-slate-600">Sin registros de asistencia</p>
          ) : (
            <div className="space-y-2">
              {selectedDateAttendance.map(att => {
                const employee = employees.find(e => e.id === att.employeeId);
                return (
                  <div
                    key={att.id}
                    className={`p-3 rounded-lg border ${
                      att.isOvertime ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'
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
                        <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded text-xs font-semibold text-orange-700">
                          <Clock className="h-3 w-3" />
                          +{att.overtimeHours}h
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

      {/* Add Attendance Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Registrar Asistencia</h3>

          {/* Overtime Warning - FEATURE 3.2 */}
          {overtimeWarning && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2 items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">{overtimeWarning}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employee */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Empleado *</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    formErrors.employee 
                      ? 'border-red-500 bg-red-50' 
                      : selectedEmployee 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-slate-300'
                  }`}
                >
                  <option value="">Selecciona un empleado</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.position}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Fecha *</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    formErrors.date 
                      ? 'border-red-500 bg-red-50' 
                      : formDate 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-slate-300'
                  }`}
                />
              </div>

              {/* Clock In - FEATURE 3.2 */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Entrada *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clockInTime.hours}
                    onChange={(e) => handleTimeChange('in', 'hours', e.target.value)}
                    maxLength={2}
                    className="w-16 px-2 py-2 border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="HH"
                  />
                  <span className="flex items-center text-slate-600 font-semibold">:</span>
                  <input
                    type="text"
                    value={clockInTime.minutes}
                    onChange={(e) => handleTimeChange('in', 'minutes', e.target.value)}
                    maxLength={2}
                    className="w-16 px-2 py-2 border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="MM"
                  />
                </div>
              </div>

              {/* Clock Out - FEATURE 3.2 */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Salida *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clockOutTime.hours}
                    onChange={(e) => handleTimeChange('out', 'hours', e.target.value)}
                    maxLength={2}
                    className="w-16 px-2 py-2 border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="HH"
                  />
                  <span className="flex items-center text-slate-600 font-semibold">:</span>
                  <input
                    type="text"
                    value={clockOutTime.minutes}
                    onChange={(e) => handleTimeChange('out', 'minutes', e.target.value)}
                    maxLength={2}
                    className="w-16 px-2 py-2 border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="MM"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Notas adicionales..."
              />
            </div>

            {formErrors.time && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{formErrors.time}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Registrar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List View - FEATURE 3.1 */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Empleado</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Entrada</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Salida</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-700">Horas</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-700">Extra</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 10).map(att => {
                  const employee = employees.find(e => e.id === att.employeeId);
                  return (
                    <tr key={att.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3">{employee?.name}</td>
                      <td className="px-4 py-3">{att.date}</td>
                      <td className="px-4 py-3">{att.clockIn}</td>
                      <td className="px-4 py-3">{att.clockOut}</td>
                      <td className="px-4 py-3 text-center font-semibold">{att.hoursWorked}h</td>
                      <td className="px-4 py-3 text-center">
                        {att.isOvertime ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">
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

      {/* Add Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Registrar Asistencia
        </button>
      )}
    </div>
  );
}

export default PersonnelView;
