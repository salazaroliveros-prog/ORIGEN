/**
 * Toast Notification Component
 * Provides success, error, warning, and info notifications
 * Singleton pattern for global notifications
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Check, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

let toastQueue: ToastMessage[] = [];
let toastSubscribers: ((messages: ToastMessage[]) => void)[] = [];

const notifySubscribers = () => {
  toastSubscribers.forEach(subscriber => subscriber(toastQueue));
};

const addToast = (type: ToastMessage['type'], message: string, duration = 3000) => {
  const id = Math.random().toString(36);
  const newToast: ToastMessage = {
    id,
    type,
    message,
    duration,
  };

  toastQueue = [...toastQueue, newToast];
  notifySubscribers();

  if (duration > 0) {
    setTimeout(() => {
      toastQueue = toastQueue.filter(t => t.id !== id);
      notifySubscribers();
    }, duration);
  }

  return id;
};

// Public API
export const toast = {
  success: (message: string, duration?: number) => addToast('success', message, duration),
  error: (message: string, duration?: number) => addToast('error', message, duration),
  warning: (message: string, duration?: number) => addToast('warning', message, duration),
  info: (message: string, duration?: number) => addToast('info', message, duration),
  remove: (id: string) => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    notifySubscribers();
  },
};

// Toast Container Component
export function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToastUpdate = (newMessages: ToastMessage[]) => {
      setMessages(newMessages);
    };

    toastSubscribers.push(handleToastUpdate);

    return () => {
      toastSubscribers = toastSubscribers.filter(sub => sub !== handleToastUpdate);
    };
  }, []);

  const removeToast = (id: string) => {
    toast.remove(id);
  };

  const getStyles = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: <Check className="h-5 w-5 text-green-600" />,
          text: 'text-green-800',
          close: 'text-green-600 hover:text-green-700',
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: <AlertCircle className="h-5 w-5 text-red-600" />,
          text: 'text-red-800',
          close: 'text-red-600 hover:text-red-700',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
          text: 'text-yellow-800',
          close: 'text-yellow-600 hover:text-yellow-700',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: <Info className="h-5 w-5 text-blue-600" />,
          text: 'text-blue-800',
          close: 'text-blue-600 hover:text-blue-700',
        };
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          icon: <Info className="h-5 w-5 text-slate-600" />,
          text: 'text-slate-800',
          close: 'text-slate-600 hover:text-slate-700',
        };
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm pointer-events-none">
      {messages.map(msg => {
        const styles = getStyles(msg.type);
        return (
          <div
            key={msg.id}
            className={`${styles.bg} border ${styles.border} rounded-lg p-4 shadow-lg flex gap-3 items-start pointer-events-auto animate-slide-up`}
          >
            <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
            <p className={`text-sm font-medium ${styles.text} flex-1`}>{msg.message}</p>
            <button
              onClick={() => removeToast(msg.id)}
              className={`flex-shrink-0 ${styles.close} transition-colors hover:bg-white/20 p-1 rounded`}
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default toast;
