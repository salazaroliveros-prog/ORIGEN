'use client';

import { AttendanceRecord,CompanySettings,Employee,Project } from '@/lib/types';
import {
Award,
Building2,
Calendar,
Clock,
Users
} from 'lucide-react';
import React,{ useEffect,useMemo,useState } from 'react';
import {
Bar,
BarChart,
CartesianGrid,
Legend,
ResponsiveContainer,
Tooltip,
XAxis,
YAxis
} from 'recharts';

interface LaborProductivityChartProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  projects: Project[];
  activeProjectId?: string;
  company: CompanySettings;
  currency: 'GTQ' | 'USD';
}

export const LaborProductivityChart: React.FC<LaborProductivityChartProps> = ({
  employees,
  attendance,
  projects,
  activeProjectId,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProjectId || 'all');
  const [viewScope, setViewScope] = useState<'empleado' | 'rol' | 'proyecto'>('empleado');

  useEffect(() => {
    if (activeProjectId && projects.some((project) => project.id === activeProjectId)) {
      setSelectedProjectId(activeProjectId);
    }
  }, [activeProjectId, projects]);

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Compute labor hours comparison data
  const chartData = useMemo(() => {
    const targetAttendance = selectedProjectId === 'all'
      ? attendance
      : attendance.filter((a) => a.projectId === selectedProjectId);
    const targetProjects = selectedProjectId === 'all'
      ? projects
      : projects.filter((project) => project.id === selectedProjectId);

    if (viewScope === 'empleado') {
      return employees.map((emp) => {
        const empAtt = targetAttendance.filter((a) => a.employeeId === emp.id);
        const presentDays = empAtt.filter((a) => a.status === 'Presente').length;
        const overtime = empAtt.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

        return {
          name: emp.name.split(' ')[0] + (emp.name.split(' ')[1] ? ' ' + emp.name.split(' ')[1][0] + '.' : ''),
          fullName: emp.name,
          jobTitle: emp.role,
          diasPresente: presentDays,
          horasExtra: overtime,
          horasEstimadas: presentDays * 8 + overtime,
        };
      });
    }

    if (viewScope === 'rol') {
      const roles = [...new Set(employees.map((employee) => employee.role))];
      return roles.map((role) => {
        const roleEmps = employees.filter((employee) => employee.role === role);
        const roleEmpIds = new Set(roleEmps.map((e) => e.id));
        const roleAtt = targetAttendance.filter((a) => roleEmpIds.has(a.employeeId));
        const presentDays = roleAtt.filter((a) => a.status === 'Presente').length;
        const overtime = roleAtt.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

        return {
          name: role,
          fullName: role,
          diasPresente: presentDays,
          horasExtra: overtime,
          horasEstimadas: presentDays * 8 + overtime,
        };
      });
    }

    return targetProjects.map((proj) => {
        const projAtt = attendance.filter((a) => a.projectId === proj.id);
        const presentDays = projAtt.filter((a) => a.status === 'Presente').length;
        const overtime = projAtt.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

        return {
          name: proj.code || proj.name,
          fullName: proj.name,
          diasPresente: presentDays,
          horasExtra: overtime,
          horasEstimadas: presentDays * 8 + overtime,
        };
      });
  }, [employees, attendance, projects, selectedProjectId, viewScope]);

  const totalEstimatedHours = chartData.reduce((total, item) => total + item.horasEstimadas, 0);
  const totalPresentDays = chartData.reduce((total, item) => total + item.diasPresente, 0);
  const totalOvertimeHours = chartData.reduce((total, item) => total + item.horasExtra, 0);
  const hasAttendanceData = attendance.some((record) =>
    selectedProjectId === 'all' || record.projectId === selectedProjectId
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
              <Users className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
              Asistencia y horas estimadas de mano de obra
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Estimación: 8 h por día presente
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Horas estimadas a partir de días con asistencia registrada y horas extra para{' '}
            <strong className="text-slate-200">
              {activeProject ? activeProject.name : 'Todos los proyectos'}
            </strong>
            .
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-sky-400" /> Obra:
            </span>
            <select
              aria-label="Filtrar productividad por obra"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-sky-400 transition cursor-pointer"
            >
              <option value="all">Todas las Obras (Consolidado)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewScope('empleado')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewScope === 'empleado' ? 'bg-sky-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Por Empleado
            </button>
            <button
              onClick={() => setViewScope('rol')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewScope === 'rol' ? 'bg-sky-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Por Especialidad
            </button>
            <button
              onClick={() => setViewScope('proyecto')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewScope === 'proyecto' ? 'bg-sky-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Por Proyecto
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Horas Estimadas
            </span>
            <p className="text-xl font-extrabold text-amber-400 mt-0.5">{totalEstimatedHours.toLocaleString('es-GT')} hrs</p>
            <span className="text-[11px] text-slate-400">8 h por día presente + horas extra</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Días con asistencia
            </span>
            <p className="text-xl font-extrabold text-sky-400 mt-0.5">{totalPresentDays.toLocaleString('es-GT')}</p>
            <span className="text-[11px] text-slate-400">Registros con estado Presente</span>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Horas extra registradas
            </span>
            <p className="text-xl font-extrabold text-emerald-400 mt-0.5">{totalOvertimeHours.toLocaleString('es-GT')} hrs</p>
            <span className="text-[11px] text-slate-400">Suma de horas extra en asistencia</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {!hasAttendanceData ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-center text-sm text-slate-400">
          No hay registros de asistencia para el proyecto seleccionado.
        </p>
      ) : (
      <div className="h-80 sm:h-96 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 0, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={11}
              angle={-25}
              textAnchor="end"
              tickLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickFormatter={(val) => `${val}h`}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: '#334155', opacity: 0.3 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border border-slate-700 p-3.5 rounded-2xl shadow-2xl text-xs space-y-1.5 min-w-48">
                      <p className="font-bold text-white text-sm">{data.fullName}</p>
                      {data.jobTitle && <p className="text-slate-400 font-medium">Especialidad: {data.jobTitle}</p>}
                      <div className="pt-1 border-t border-slate-800 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Horas estimadas:</span>
                          <span className="font-bold text-amber-400">{data.horasEstimadas} hrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Días presente:</span>
                          <span className="font-semibold text-sky-400">{data.diasPresente}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Horas extra:</span>
                          <span className="font-semibold text-emerald-400">{data.horasExtra} hrs</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              height={36}
              wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
            />
            <Bar
              dataKey="horasEstimadas"
              name="Horas estimadas (8 h por día presente)"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              barSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  );
};
