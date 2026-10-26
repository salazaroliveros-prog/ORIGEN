'use client';

import React, { useState } from 'react';
import {
  Bell,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  Trash2,
  Plus,
  X,
  Mail,
  Sliders,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { TaskReminder, ScheduleTask, Milestone, ReminderAdvanceOption } from '@/lib/types';
import { playNotificationChime } from '@/lib/notificationService';

interface NotificationRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: TaskReminder[];
  tasks: ScheduleTask[];
  milestones: Milestone[];
  onAddReminder: (reminder: TaskReminder) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onTriggerTestNotification: (title: string, message: string, type: 'urgent' | 'reminder') => void;
}

export function NotificationRemindersModal({
  isOpen,
  onClose,
  reminders,
  tasks,
  milestones,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
  onTriggerTestNotification,
}: NotificationRemindersModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'workflow'>('list');

  // Form states for creating a new reminder
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id || '');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');
  const [targetType, setTargetType] = useState<'task' | 'milestone'>('task');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('2025-05-20');
  const [targetTime, setTargetTime] = useState('08:00');
  const [advanceOption, setAdvanceOption] = useState<ReminderAdvanceOption>('1_day_before');
  const [priority, setPriority] = useState<'Alta' | 'Media' | 'Baja'>('Alta');
  const [channel, setChannel] = useState<'in_app' | 'sound' | 'email'>('in_app');
  const [followFlowRequirement, setFollowFlowRequirement] = useState(true);

  if (!isOpen) return null;

  const handleSelectTask = (tId: string) => {
    setSelectedTaskId(tId);
    const foundTask = tasks.find((t) => t.id === tId);
    if (foundTask) {
      setTitle(`Recordatorio: ${foundTask.name}`);
      setTargetDate(foundTask.endDate || '2025-05-20');
      setDescription(`Revisión programada de avance para la fase "${foundTask.phase}".`);
    }
  };

  const handleSelectMilestone = (mId: string) => {
    setSelectedMilestoneId(mId);
    const foundM = milestones.find((m) => m.id === mId);
    if (foundM) {
      setTitle(`Hito Clave: ${foundM.title}`);
      setTargetDate(foundM.targetDate || '2025-05-30');
      setDescription(foundM.description || `Entrega y verificación del hito en obra.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let targetName = 'General';
    if (targetType === 'task') {
      const t = tasks.find((item) => item.id === selectedTaskId);
      if (t) targetName = t.name;
    } else {
      const m = milestones.find((item) => item.id === selectedMilestoneId);
      if (m) targetName = m.title;
    }

    const newReminder: TaskReminder = {
      id: `rem-${Date.now()}`,
      projectId: tasks[0]?.projectId || 'p1',
      taskId: targetType === 'task' ? selectedTaskId : undefined,
      milestoneId: targetType === 'milestone' ? selectedMilestoneId : undefined,
      taskName: targetName,
      title: title.trim(),
      description: description.trim() || `Recordatorio programado para ${targetName}.`,
      targetDate,
      targetTime,
      advanceOption,
      priority,
      channel,
      enabled: true,
      createdAt: new Date().toISOString().split('T')[0],
      triggered: false,
      followFlowRequirement,
    };

    onAddReminder(newReminder);
    playNotificationChime(priority === 'Alta' ? 'urgent' : 'reminder');
    setActiveTab('list');

    // Reset form
    setTitle('');
    setDescription('');
  };

  const advanceLabels: Record<ReminderAdvanceOption, string> = {
    same_day: 'El mismo día (Hora fijada)',
    '1_day_before': '1 día antes (Recomendado)',
    '2_days_before': '2 días de anticipación',
    '3_days_before': '3 días antes (Logística)',
    '1_week_before': '1 semana antes (Suministros)',
    custom: 'Fecha exacta personalizada',
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/60 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white">
                Sistema de Notificaciones & Recordatorios
              </h3>
              <p className="text-xs text-slate-400">
                Configura avisos personalizados por tarea o hito y asegura el flujo de obra
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-white/10 bg-slate-950/40 px-6 pt-3">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex cursor-pointer items-center gap-2 border-b-2 px-4 pb-3 text-xs font-bold transition ${
              activeTab === 'list'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Recordatorios Configurados ({reminders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`flex cursor-pointer items-center gap-2 border-b-2 px-4 pb-3 text-xs font-bold transition ${
              activeTab === 'create'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Configurar Nuevo Recordatorio</span>
          </button>

          <button
            onClick={() => setActiveTab('workflow')}
            className={`flex cursor-pointer items-center gap-2 border-b-2 px-4 pb-3 text-xs font-bold transition ${
              activeTab === 'workflow'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Reglas de Flujo & Bloqueos</span>
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* TAB 1: LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs tracking-wider text-slate-400 uppercase">
                  Avisos programados en el proyecto activo
                </span>
                <button
                  onClick={() => {
                    playNotificationChime('reminder');
                    onTriggerTestNotification(
                      'Prueba de Notificación ConstructERP',
                      'El timbre sonoro y la alerta en pantalla funcionan con éxito.',
                      'reminder'
                    );
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/25"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>Probar Timbre Sonoro</span>
                </button>
              </div>

              {reminders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
                  <Bell className="mx-auto mb-2 h-10 w-10 text-slate-600" />
                  <p className="text-sm font-semibold text-slate-300">
                    No hay recordatorios configurados
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                    Crea recordatorios para tus tareas de la ruta crítica o hitos de entrega.
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-4 cursor-pointer rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
                  >
                    Crear Primer Recordatorio
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {reminders.map((rem) => {
                    return (
                      <div
                        key={rem.id}
                        className={`rounded-2xl border p-4 transition-all ${
                          rem.enabled
                            ? 'border-white/10 bg-white/[0.04] hover:border-white/20'
                            : 'border-white/5 bg-white/[0.01] opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                                  rem.priority === 'Alta'
                                    ? 'border-rose-500/30 bg-rose-500/15 text-rose-300'
                                    : rem.priority === 'Media'
                                      ? 'border-amber-500/30 bg-amber-500/15 text-amber-300'
                                      : 'border-blue-500/30 bg-blue-500/15 text-blue-300'
                                }`}
                              >
                                {rem.priority} Prioridad
                              </span>

                              <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                                {advanceLabels[rem.advanceOption]}
                              </span>

                              {rem.channel === 'sound' && (
                                <span className="flex items-center gap-1 rounded border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-400">
                                  <Volume2 className="h-3 w-3" /> Sonoro
                                </span>
                              )}

                              {rem.channel === 'email' && (
                                <span className="flex items-center gap-1 rounded border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                                  <Mail className="h-3 w-3" /> Correo
                                </span>
                              )}

                              {rem.followFlowRequirement && (
                                <span className="flex items-center gap-1 rounded border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-300">
                                  <ShieldAlert className="h-3 w-3" /> Flujo Guiado
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-white">{rem.title}</h4>
                            <p className="line-clamp-2 text-xs text-slate-400">{rem.description}</p>

                            <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                Meta: {rem.targetDate}{' '}
                                {rem.targetTime ? `a las ${rem.targetTime}` : ''}
                              </span>
                              <span>•</span>
                              <span className="max-w-[200px] truncate font-medium text-slate-300">
                                {rem.taskName}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                playNotificationChime(
                                  rem.priority === 'Alta' ? 'urgent' : 'reminder'
                                );
                                onTriggerTestNotification(
                                  rem.title,
                                  `${rem.description} (Simulación de aviso para ${rem.targetDate})`,
                                  rem.priority === 'Alta' ? 'urgent' : 'reminder'
                                );
                              }}
                              title="Probar sonido y aviso"
                              className="cursor-pointer rounded-xl border border-white/5 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-amber-300"
                            >
                              <Volume2 className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => onToggleReminder(rem.id)}
                              className={`cursor-pointer rounded-xl border px-2.5 py-1 text-xs font-bold transition ${
                                rem.enabled
                                  ? 'border-emerald-400/30 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {rem.enabled ? 'Activo' : 'En pausa'}
                            </button>

                            <button
                              onClick={() => onDeleteReminder(rem.id)}
                              className="cursor-pointer rounded-xl border border-white/5 bg-white/5 p-2 text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300"
                              title="Eliminar recordatorio"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE NEW */}
          {activeTab === 'create' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="font-mono text-xs font-bold tracking-wider text-amber-400 uppercase">
                  1. Selección del Objetivo
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType('task');
                      handleSelectTask(tasks[0]?.id || '');
                    }}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                      targetType === 'task'
                        ? 'border-sky-400/40 bg-sky-500/20 text-sky-300 shadow-sm'
                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sliders className="h-4 w-4" />
                    <span>Para Tarea de Obra</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetType('milestone');
                      if (milestones[0]) handleSelectMilestone(milestones[0].id);
                    }}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                      targetType === 'milestone'
                        ? 'border-amber-400/40 bg-amber-500/20 text-amber-300 shadow-sm'
                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Para Hito de Entrega</span>
                  </button>
                </div>

                {targetType === 'task' ? (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Seleccionar Tarea:
                    </label>
                    <select
                      value={selectedTaskId}
                      onChange={(e) => handleSelectTask(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white transition outline-none focus:border-sky-400"
                    >
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          [{t.phase}] {t.name} ({t.progress}%)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Seleccionar Hito Clave:
                    </label>
                    <select
                      value={selectedMilestoneId}
                      onChange={(e) => handleSelectMilestone(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white transition outline-none focus:border-amber-400"
                    >
                      {milestones.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title} - Meta: {m.targetDate}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="font-mono text-xs font-bold tracking-wider text-sky-400 uppercase">
                  2. Mensaje y Contenido del Recordatorio
                </span>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Título del Aviso:
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Revisar encofrado y pruebas de resistencia"
                    className="w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white transition outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Instrucciones / Procedimiento de Obra:
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalles técnicos, responsable o verificación previa requerida..."
                    className="w-full resize-none rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white transition outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Timing & Channel Options */}
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="font-mono text-xs font-bold tracking-wider text-emerald-400 uppercase">
                  3. Programación y Canal
                </span>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Fecha Meta / Vencimiento:
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 font-mono text-xs text-white transition outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Hora de Alerta:
                    </label>
                    <input
                      type="time"
                      value={targetTime}
                      onChange={(e) => setTargetTime(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 font-mono text-xs text-white transition outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Anticipación del Aviso:
                    </label>
                    <select
                      value={advanceOption}
                      onChange={(e) => setAdvanceOption(e.target.value as ReminderAdvanceOption)}
                      className="w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white transition outline-none focus:border-emerald-400"
                    >
                      <option value="same_day">El mismo día</option>
                      <option value="1_day_before">1 día antes (Recomendado)</option>
                      <option value="2_days_before">2 días antes</option>
                      <option value="3_days_before">3 días antes</option>
                      <option value="1_week_before">1 semana antes</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Nivel de Prioridad:
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as 'Alta' | 'Media' | 'Baja')}
                      className="w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white transition outline-none focus:border-emerald-400"
                    >
                      <option value="Alta">Alta (Crítica para la ruta)</option>
                      <option value="Media">Media (Procedimiento regular)</option>
                      <option value="Baja">Baja (Informativo)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Canal de Aviso:
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setChannel('in_app')}
                        className={`flex-1 cursor-pointer rounded-xl border px-2 py-1.5 text-xs font-semibold transition ${
                          channel === 'in_app'
                            ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                            : 'border-white/10 bg-slate-800 text-slate-400'
                        }`}
                      >
                        En Pantalla
                      </button>
                      <button
                        type="button"
                        onClick={() => setChannel('sound')}
                        className={`flex-1 cursor-pointer rounded-xl border px-2 py-1.5 text-xs font-semibold transition ${
                          channel === 'sound'
                            ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                            : 'border-white/10 bg-slate-800 text-slate-400'
                        }`}
                      >
                        Timbre Sonoro
                      </button>
                      <button
                        type="button"
                        onClick={() => setChannel('email')}
                        className={`flex-1 cursor-pointer rounded-xl border px-2 py-1.5 text-xs font-semibold transition ${
                          channel === 'email'
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                            : 'border-white/10 bg-slate-800 text-slate-400'
                        }`}
                      >
                        Correo
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={followFlowRequirement}
                        onChange={(e) => setFollowFlowRequirement(e.target.checked)}
                        className="h-4 w-4 cursor-pointer rounded border-white/20 bg-slate-800 text-sky-500 focus:ring-sky-400"
                      />
                      <span>Asegurar que siga el flujo constructivo indicado</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="cursor-pointer rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-amber-500 px-6 py-2 text-xs font-bold tracking-wide text-slate-950 uppercase shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
                >
                  Guardar y Programar Recordatorio
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: WORKFLOW RULES */}
          {activeTab === 'workflow' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div className="space-y-1 text-xs text-slate-300">
                  <p className="font-bold text-amber-300">
                    Monitoreo del Flujo Constructivo Normativo
                  </p>
                  <p>
                    Para evitar patologías estructurales y retrasos, el sistema valida que las
                    actividades precedentes se encuentren finalizadas antes de dar paso a las fases
                    subsiguientes.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <span className="font-mono text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Dependencias y Predecesoras de la Obra
                </span>

                {tasks.map((task, idx) => {
                  const hasPreds = task.predecessors && task.predecessors.length > 0;
                  const predTasks = hasPreds
                    ? tasks.filter((t) => task.predecessors.includes(t.id))
                    : [];
                  const isBlocked = predTasks.some((pt) => !pt.completed && pt.progress < 100);

                  return (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between gap-4 rounded-2xl border p-3.5 ${
                        isBlocked
                          ? 'border-rose-500/20 bg-rose-500/5'
                          : task.completed
                            ? 'border-emerald-500/20 bg-emerald-500/5'
                            : 'border-white/10 bg-white/[0.03]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-500">
                            Paso {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-white">{task.name}</span>
                          {task.completed && (
                            <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                              Completada (100%)
                            </span>
                          )}
                          {isBlocked && (
                            <span className="rounded border border-rose-500/30 bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300">
                              En Espera de Flujo
                            </span>
                          )}
                        </div>

                        {hasPreds ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span>Requiere finalizar:</span>
                            {predTasks.map((pt) => (
                              <span
                                key={pt.id}
                                className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                                  pt.completed
                                    ? 'bg-emerald-500/10 text-emerald-300'
                                    : 'bg-amber-500/15 text-amber-300'
                                }`}
                              >
                                {pt.name} ({pt.progress}%)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500">
                            Fase inicial (Sin predecesoras bloqueantes)
                          </p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {isBlocked ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-rose-400">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Bloqueada</span>
                          </div>
                        ) : task.completed ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Al día</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs font-bold text-sky-400">
                            <ArrowRight className="h-4 w-4" />
                            <span>En Ejecución</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/80 p-4 text-xs text-slate-400">
          <span className="font-mono text-[11px]">
            {reminders.filter((r) => r.enabled).length} recordatorios activos monitoreando el flujo
          </span>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl bg-white/10 px-4 py-1.5 font-bold text-white transition hover:bg-white/15"
          >
            Cerrar Panel
          </button>
        </div>
      </div>
    </div>
  );
}
