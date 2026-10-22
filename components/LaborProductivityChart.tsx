'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Filter,
} from 'lucide-react';
import { Employee, AttendanceRecord, Project, CompanySettings } from '@/lib/types';

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
  company,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProjectId || 'all');
  const [viewScope, setViewScope] = useState<'empleado' | 'rol' | 'proyecto'>('empleado');

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Compute labor hours comparison data
  const chartData = useMemo(() => {
    const targetAttendance = selectedProjectId === 'all'
      ? attendance
      : attendance.filter((a) => a.projectId === selectedProjectId);

    if (viewScope === 'empleado') {
      // Map each employee
      return employees.map((emp) => {
        const empAtt = targetAttendance.filter((a) => a.employeeId === emp.id);
        const presentDays = empAtt.filter((a) => a.status === 'Presente').length;
        const overtime = empAtt.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
        const realHours = presentDays * 8 + overtime;

        // Budgeted hours baseline (e.g. 160 hrs/month or based on role seniority)
        let baseBudgetedHours = 160;
        if (emp.role === 'Capataz' || emp.role === 'Arquitecto Residente') {
          baseBudgetedHours = 175;
        } else if (emp.role === 'Ayudante') {
          baseBudgetedHours = 150;
        }

        const efficiency = baseBudgetedHours > 0 ? (realHours / baseBudgetedHours) * 100 : 100;

        return {
          name: emp.name.split(' ')[0] + (emp.name.split(' ')[1] ? ' ' + emp.name.split(' ')[1][0] + '.' : ''),
          fullName: emp.name,
          role: emp.role,
          trabajadas: realHours,
          presupuestadas: baseBudgetedHours,
          diferencia: realHours - baseBudgetedHours,
          eficiencia: efficiency,
          estado: realHours <= baseBudgetedHours ? 'Óptimo' : 'Exceso Horas',
        };
      });
    } else if (viewScope === 'rol') {
      // Group by Role
      const roles = ['Capataz', 'Albañil', 'Ayudante', 'Arquitecto Residente', 'Bodeguero', 'Electricista'] as const;
      return roles.map((role) => {
        const roleEmps = employees.filter((e) => e.role === role);
        const roleEmpIds = new Set(roleEmps.map((e) => e.id));
        const roleAtt = targetAttendance.filter((a) => roleEmpIds.has(a.employeeId));

        const presentDays = roleAtt.filter((a) => a.status === 'Presente').length;
        const overtime = roleAtt.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
        const realHours = presentDays * 8 + overtime;
        const budgetedHours = roleEmps.length * 160;

        const efficiency = budgetedHours > 0 ? (realHours / budgetedHours) * 100 : 100;

        return {
          name: role,
          fullName: role,
          trabajadas: realHours,
          presupuestadas: budgetedHours,
          diferencia: realHours - budgetedHours,
          eficiencia: efficiency,
          estado: realHours <= budgetedHours ? 'Óptimo' : 'Exceso Horas',
        };
      });
    } else {
      // Group by Project
      return projects.map((proj) => {
        const projAtt = attendance.filter((a) => a.projectId === proj.id);
        const presentDays = projAtt.filter((a) => a.status === 'Presente').length;
        const overtime = projAtt.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
        const realHours = presentDays * 8 + overtime;

        // Budgeted hours from project budget scale
        const budgetedHours = Math.round(proj.budgetTotal / 1200);

        const efficiency = budgetedHours > 0 ? (realHours / budgetedHours) * 100 : 100;

        return {
          name: proj.code,
          fullName: proj.name,
          trabajadas: realHours,
          presupuestadas: budgetedHours,
          diferencia: realHours - budgetedHours,
          eficiencia: efficiency,
          estado: realHours <= budgetedHours ? 'Óptimo' : 'Exceso Horas',
        };
      });
    }
  }, [employees, attendance, projects, selectedProjectId, viewScope]);

  // Aggregate metrics
  const totalWorkedHours = chartData.reduce((acc, curr) => acc + curr.trabajadas, 0);
  const totalBudgetedHours = chartData.reduce((acc, curr) => acc + curr.presupuestadas, 0);
  const avgEfficiency = chartData.length > 0 ? chartData.reduce((acc, curr) => acc + curr.eficiencia, 0) / chartData.length : 100;

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
              Rendimiento & Productividad Laboral (Horas Reales vs. Presupuestadas)
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Recharts Gantt & APU Yield
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Comparativa de horas trabajadas (incluyendo asistencia y horas extra) frente a las horas presupuestadas en la planificación del cronograma para{' '}
            <strong className="text-slate-200">
              {activeProject ? activeProject.name : 'Todas las Obras de ConstructERP Guatemala'}
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
              Horas Trabajadas Reales
            </span>
            <p className="text-xl font-extrabold text-amber-400 mt-0.5">{totalWorkedHours.toLocaleString('es-GT')} hrs</p>
            <span className="text-[11px] text-slate-400">Registradas en bitácora de asistencia</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Horas Presupuestadas (APU)
            </span>
            <p className="text-xl font-extrabold text-sky-400 mt-0.5">{totalBudgetedHours.toLocaleString('es-GT')} hrs</p>
            <span className="text-[11px] text-slate-400">Asignadas según cronograma</span>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Índice Promedio de Eficiencia
            </span>
            <p className="text-xl font-extrabold text-emerald-400 mt-0.5">{avgEfficiency.toFixed(1)}%</p>
            <span className="text-[11px] text-slate-400">Rendimiento de mano de obra</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Recharts BarChart */}
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
                      {data.role && <p className="text-slate-400 font-medium">Especialidad: {data.role}</p>}
                      <div className="pt-1 border-t border-slate-800 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Horas Trabajadas:</span>
                          <span className="font-bold text-amber-400">{data.trabajadas} hrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Horas Presupuestadas:</span>
                          <span className="font-semibold text-sky-400">{data.presupuestadas} hrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Desviación:</span>
                          <span className={data.diferencia <= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {data.diferencia > 0 ? `+${data.diferencia}` : data.diferencia} hrs
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Eficiencia:</span>
                          <span className="font-bold text-white">{data.eficiencia.toFixed(1)}%</span>
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
              dataKey="presupuestadas"
              name="Horas Presupuestadas (Cronograma)"
              fill="#38bdf8"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
            <Bar
              dataKey="trabajadas"
              name="Horas Trabajadas Reales"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
