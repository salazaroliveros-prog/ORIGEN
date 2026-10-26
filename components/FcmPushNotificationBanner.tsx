'use client';

import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Bell,
  CheckCircle2,
  AlertTriangle,
  PenTool,
  Clock,
  Sparkles,
  X,
  Send,
  Building2,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  requestFcmPushToken,
  sendCapatazProjectAlert,
  subscribeCapatazAlerts,
  markAlertAsSigned,
  ProjectAlert,
} from '@/lib/fcmService';
import { DigitalSignaturePad, SignatureResult } from './DigitalSignaturePad';
import { toast } from 'react-hot-toast';

interface FcmPushNotificationBannerProps {
  capatazName?: string;
  capatazDpi?: string;
  className?: string;
}

export function FcmPushNotificationBanner({
  capatazName = 'Don Mario Cifuentes',
  capatazDpi = '2489 10293 0101',
  className = '',
}: FcmPushNotificationBannerProps) {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unknown'>(
    'unknown'
  );
  const [alerts, setAlerts] = useState<ProjectAlert[]>([]);
  const [activeAlertForSignature, setActiveAlertForSignature] = useState<ProjectAlert | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }

    // Subscribe to Firestore project_alerts in real time
    const unsub = subscribeCapatazAlerts((newAlerts) => {
      setAlerts(newAlerts);
    });

    return () => unsub();
  }, []);

  const handleActivatePush = async () => {
    setIsActivating(true);
    const result = await requestFcmPushToken(capatazName);
    setIsActivating(false);

    if (result.granted) {
      setPermissionStatus('granted');
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleSimulateAssignmentAlert = async () => {
    try {
      await sendCapatazProjectAlert({
        projectId: 'p1',
        projectName: 'Torre Residencial Vista Hermosa IV',
        type: 'new_report_assigned',
        title: 'Nuevo Reporte Asignado: Armado de Columnas C-18',
        message:
          'Se le ha asignado la bitácora de supervisión de armaduría grado 60 en el nivel 4.',
        capatazName,
        reportCode: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
        signatureRequired: false,
      });
      toast.success('Alerta registrada correctamente.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar la alerta.');
    }
  };

  const handleSimulateSignatureRequiredAlert = async () => {
    try {
      await sendCapatazProjectAlert({
        projectId: 'p1',
        projectName: 'Torre Residencial Vista Hermosa IV',
        type: 'signature_required',
        title: 'Firma Urgente Requerida: Bitácora de Concreto',
        message:
          'Se requiere su firma digital táctil en la bitácora de fundición antes del fraguado.',
        capatazName,
        capatazDpi,
        reportCode: `BIT-${Math.floor(1000 + Math.random() * 9000)}`,
        signatureRequired: true,
      });
      toast.success('Solicitud de firma registrada correctamente.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudo registrar la solicitud de firma.'
      );
    }
  };

  const handleSignatureConfirmed = async (result: SignatureResult) => {
    if (activeAlertForSignature) {
      try {
        await markAlertAsSigned(activeAlertForSignature.id, result.signerName);
        toast.success(
          `Bitácora ${activeAlertForSignature.reportCode || ''} firmada exitosamente por ${result.signerName}`
        );
        setActiveAlertForSignature(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar la firma.');
      }
    }
  };

  const pendingSignatureAlertsCount = alerts.filter(
    (a) => a.signatureRequired && a.status === 'Pendiente'
  ).length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Push Notification Main Banner */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-white shadow-xl sm:p-5 md:flex-row md:items-center">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-400">
            <BellRing className="h-6 w-6 animate-pulse" />
            {pendingSignatureAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-900 bg-rose-500 text-[10px] font-black text-white">
                {pendingSignatureAlertsCount}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold tracking-tight sm:text-base">
                Notificaciones Push FCM para Capataces de Obra
              </h3>
              <span className="rounded-md border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                Firebase FCM
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Alertas en tiempo real en teléfonos y tablets cuando se asigna un nuevo reporte de
              campo o se requiere firma digital urgente.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {permissionStatus !== 'granted' ? (
            <button
              type="button"
              onClick={handleActivatePush}
              disabled={isActivating}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-900 shadow-md transition hover:bg-amber-300"
            >
              <Bell className="h-4 w-4" />
              {isActivating ? 'Activando...' : 'Activar Notificaciones Push'}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-800 bg-emerald-950/60 px-3 py-1.5 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> FCM Push Activo
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex cursor-pointer items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
          >
            Ver Alertas ({alerts.length})
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 font-semibold text-slate-300">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Simulador de Envío FCM en Obra:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateAssignmentAlert}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-blue-800 bg-blue-950 px-3 py-1.5 text-[11px] font-bold text-blue-300 transition hover:bg-blue-900"
            >
              <Send className="h-3 w-3" /> Notificar Nuevo Reporte
            </button>

            <button
              type="button"
              onClick={handleSimulateSignatureRequiredAlert}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-amber-800 bg-amber-950 px-3 py-1.5 text-[11px] font-bold text-amber-300 transition hover:bg-amber-900"
            >
              <PenTool className="h-3 w-3" /> Solicitar Firma Urgente
            </button>
          </div>
        </div>
      )}

      {/* FCM Alerts Drawer / Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="my-6 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <div className="flex items-center gap-2">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/20 p-2 text-amber-400">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold sm:text-base">
                    Historial de Alertas FCM Push
                  </h3>
                  <p className="text-xs text-slate-400">
                    Notificaciones enviadas a capataces y firmas pendientes en Firestore.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
              {alerts.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">
                  No hay alertas registradas recientemente.
                </p>
              ) : (
                alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-3.5 transition ${
                      a.signatureRequired && a.status === 'Pendiente'
                        ? 'border-amber-700/80 bg-amber-950/30'
                        : 'border-slate-700/60 bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="mr-1.5 rounded border border-amber-800 bg-amber-950/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-400">
                          {a.reportCode || a.type}
                        </span>
                        <h4 className="inline-block text-xs font-bold text-white">{a.title}</h4>
                        <p className="mt-1 text-[11px] text-slate-300">{a.message}</p>
                        <p className="mt-1 font-mono text-[10px] text-slate-400">
                          Obra: <strong className="text-slate-200">{a.projectName}</strong> •{' '}
                          {new Date(a.timestamp).toLocaleString('es-GT')}
                        </p>
                      </div>

                      {a.signatureRequired && a.status === 'Pendiente' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAlertForSignature(a);
                            setIsModalOpen(false);
                          }}
                          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-amber-400"
                        >
                          <PenTool className="h-3.5 w-3.5" /> Firmar
                        </button>
                      ) : (
                        <span className="shrink-0 rounded-full border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          {a.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-800 bg-slate-950 p-3 text-center">
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Pad Modal Triggered from Alert */}
      {activeAlertForSignature && (
        <DigitalSignaturePad
          isOpen={true}
          onClose={() => setActiveAlertForSignature(null)}
          onConfirm={handleSignatureConfirmed}
          defaultSignerName={activeAlertForSignature.capatazName || capatazName}
          defaultSignerDpi={activeAlertForSignature.capatazDpi || capatazDpi}
          defaultSignerRole="Capataz General de Obra"
          title={`Firma Digital de Bitácora (${activeAlertForSignature.reportCode})`}
          subtitle={`Obra: ${activeAlertForSignature.projectName}`}
          reportCode={activeAlertForSignature.reportCode}
        />
      )}
    </div>
  );
}
