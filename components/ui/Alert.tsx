/**
 * Standard Alert Components
 * Consistent error, warning, info, and success alerts across the app
 */

'use client';

import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { COLORS } from '@/lib/design/constants';

interface AlertProps {
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
  dismissible?: boolean;
}

/**
 * Error Alert
 */
export function ErrorAlert({
  title = 'Error',
  message,
  onClose,
  dismissible = true,
  className = '',
}: AlertProps) {
  return (
    <div
      className={`flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 ${className}`}
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" aria-hidden="true" />
      <div className="flex-1">
        {title && <p className="text-sm font-semibold text-red-600">{title}</p>}
        <p className={`text-sm text-red-700 ${title ? 'mt-1' : ''}`}>{message}</p>
      </div>
      {dismissible && onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-red-600 transition-colors hover:text-red-700"
          aria-label="Cerrar alerta"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/**
 * Warning Alert
 */
export function WarningAlert({
  title = 'Advertencia',
  message,
  onClose,
  dismissible = true,
  className = '',
}: AlertProps) {
  return (
    <div
      className={`flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 ${className}`}
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" aria-hidden="true" />
      <div className="flex-1">
        {title && <p className="text-sm font-semibold text-yellow-600">{title}</p>}
        <p className={`text-sm text-yellow-700 ${title ? 'mt-1' : ''}`}>{message}</p>
      </div>
      {dismissible && onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-yellow-600 transition-colors hover:text-yellow-700"
          aria-label="Cerrar alerta"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/**
 * Info Alert
 */
export function InfoAlert({
  title = 'Información',
  message,
  onClose,
  dismissible = true,
  className = '',
}: AlertProps) {
  return (
    <div
      className={`flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 ${className}`}
      role="alert"
    >
      <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" aria-hidden="true" />
      <div className="flex-1">
        {title && <p className="text-sm font-semibold text-blue-600">{title}</p>}
        <p className={`text-sm text-blue-700 ${title ? 'mt-1' : ''}`}>{message}</p>
      </div>
      {dismissible && onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-blue-600 transition-colors hover:text-blue-700"
          aria-label="Cerrar alerta"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/**
 * Success Alert
 */
export function SuccessAlert({
  title = 'Éxito',
  message,
  onClose,
  dismissible = true,
  className = '',
}: AlertProps) {
  return (
    <div
      className={`flex gap-3 rounded-lg border border-green-200 bg-green-50 p-4 ${className}`}
      role="alert"
    >
      <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" aria-hidden="true" />
      <div className="flex-1">
        {title && <p className="text-sm font-semibold text-green-600">{title}</p>}
        <p className={`text-sm text-green-700 ${title ? 'mt-1' : ''}`}>{message}</p>
      </div>
      {dismissible && onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-green-600 transition-colors hover:text-green-700"
          aria-label="Cerrar alerta"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/**
 * Generic Alert with dynamic variant
 */
interface GenericAlertProps extends AlertProps {
  variant: 'error' | 'warning' | 'info' | 'success';
}

export function Alert({
  variant,
  title,
  message,
  onClose,
  dismissible,
  className,
}: GenericAlertProps) {
  switch (variant) {
    case 'error':
      return (
        <ErrorAlert
          title={title}
          message={message}
          onClose={onClose}
          dismissible={dismissible}
          className={className}
        />
      );
    case 'warning':
      return (
        <WarningAlert
          title={title}
          message={message}
          onClose={onClose}
          dismissible={dismissible}
          className={className}
        />
      );
    case 'info':
      return (
        <InfoAlert
          title={title}
          message={message}
          onClose={onClose}
          dismissible={dismissible}
          className={className}
        />
      );
    case 'success':
      return (
        <SuccessAlert
          title={title}
          message={message}
          onClose={onClose}
          dismissible={dismissible}
          className={className}
        />
      );
    default:
      return (
        <InfoAlert
          title={title}
          message={message}
          onClose={onClose}
          dismissible={dismissible}
          className={className}
        />
      );
  }
}

export default Alert;
