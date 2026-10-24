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
  INITIAL_DEMO_ALERTS,
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
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unknown'>('unknown');
  const [alerts, setAlerts] = useState<ProjectAlert[]>(INITIAL_DEMO_ALERTS);
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
    const alertId = await sendCapatazProjectAlert({
      projectId: 'p1',
      projectName: 'Torre Residencial Vista Hermosa IV',
      type: 'new_report_assigned',
      title: 'Nuevo Reporte Asignado: Armado de Columnas C-18',
      message: 'Se le ha asignado la bitácora de supervisión de armaduría grado 60 en el nivel 4.',
      capatazName,
      reportCode: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
      signatureRequired: false,
    });

    toast.success('Alertas FCM Push enviadas al Capataz para nueva asignación.');
  };

  const handleSimulateSignatureRequiredAlert = async () => {
    const alertId = await sendCapatazProjectAlert({
      projectId: 'p1',
      projectName: 'Torre Residencial Vista Hermosa IV',
      type: 'signature_required',
      title: 'Firma Urgente Requerida: Bitácora de Concreto',
      message: 'Se requiere su firma digital táctil en la bitácora de fundición antes del fraguado.',
      capatazName,
      capatazDpi,
      reportCode: `BIT-${Math.floor(1000 + Math.random() * 9000)}`,
      signatureRequired: true,
    });

    toast.success('Solicitud de Firma Urgente Push enviada al Capataz.');
  };

  const handleSignatureConfirmed = async (result: SignatureResult) => {
    if (activeAlertForSignature) {
      await markAlertAsSigned(activeAlertForSignature.id, result.signerName);
      toast.success(`Bitácora ${activeAlertForSignature.reportCode || ''} firmada exitosamente por ${result.signerName}`);
      setActiveAlertForSignature(null);
    }
  };

  const pendingSignatureAlertsCount = alerts.filter((a) => a.signatureRequired && a.status === 'Pendiente').length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Push Notification Main Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <BellRing className="w-6 h-6 animate-pulse" />
            {pendingSignatureAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-slate-900">
                {pendingSignatureAlertsCount}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                Notificaciones Push FCM para Capataces de Obra
              </h3>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                Firebase FCM
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Alertas en tiempo real en teléfonos y tablets cuando se asigna un nuevo reporte de campo o se requiere firma digital urgente.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {permissionStatus !== 'granted' ? (
            <button
              type="button"
              onClick={handleActivatePush}
              disabled={isActivating}
              className="px-4 py-2 rounded-xl text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-md cursor-pointer transition flex items-center gap-1.5"
            >
              <Bell className="w-4 h-4" />
              {isActivating ? 'Activando...' : 'Activar Notificaciones Push'}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4" /> FCM Push Activo
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition flex items-center gap-1"
          >
            Ver Alertas ({alerts.length})
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Quick Testing Bar for Field Assignment & Signature Request */}
      <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Simulador de Envío FCM en Obra:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSimulateAssignmentAlert}
            className="px-3 py-1.5 rounded-lg bg-blue-950 text-blue-300 border border-blue-800 hover:bg-blue-900 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
          >
            <Send className="w-3 h-3" /> Notificar Nuevo Reporte
          </button>

          <button
            type="button"
            onClick={handleSimulateSignatureRequiredAlert}
            className="px-3 py-1.5 rounded-lg bg-amber-950 text-amber-300 border border-amber-800 hover:bg-amber-900 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
          >
            <PenTool className="w-3 h-3" /> Solicitar Firma Urgente
          </button>
        </div>
      </div>

      {/* FCM Alerts Drawer / Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden my-6">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    Historial de Alertas FCM Push
                  </h3>
                  <p className="text-xs text-slate-400">
                    Notificaciones enviadas a capataces y firmas pendientes en Firestore.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No hay alertas registradas recientemente.
                </p>
              ) : (
                alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`p-3.5 rounded-xl border transition ${
                      a.signatureRequired && a.status === 'Pendiente'
                        ? 'bg-amber-950/30 border-amber-700/80'
                        : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800 mr-1.5">
                          {a.reportCode || a.type}
                        </span>
                        <h4 className="text-xs font-bold text-white inline-block">{a.title}</h4>
                        <p className="text-[11px] text-slate-300 mt-1">{a.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          Obra: <strong className="text-slate-200">{a.projectName}</strong> • {new Date(a.timestamp).toLocaleString('es-GT')}
                        </p>
                      </div>

                      {a.signatureRequired && a.status === 'Pendiente' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAlertForSignature(a);
                            setIsModalOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-white bg-amber-500 hover:bg-amber-400 shadow-sm cursor-pointer shrink-0 transition flex items-center gap-1"
                        >
                          <PenTool className="w-3.5 h-3.5" /> Firmar
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                          {a.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
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
