import * as React from 'react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
  }[type];

  return (
    <div
      className={`${bgColor} flex items-center justify-between rounded-lg px-4 py-3 text-white shadow-lg`}
    >
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">
          ×
        </button>
      )}
    </div>
  );
};

export const useToast = () => {
  const [toast, setToast] = React.useState<ToastProps | null>(null);

  const showToast = (props: ToastProps) => {
    setToast(props);
  };

  const hideToast = () => {
    setToast(null);
  };

  return { toast, showToast, hideToast };
};

// Export toast methods for backward compatibility
export const toast = {
  success: (message: string) => {
    if (process.env.NODE_ENV === 'development') console.debug(`[Toast Success] ${message}`);
  },
  error: (message: string) => {
    if (process.env.NODE_ENV === 'development') console.error(`[Toast Error] ${message}`);
  },
  info: (message: string) => {
    if (process.env.NODE_ENV === 'development') console.debug(`[Toast Info] ${message}`);
  },
  warning: (message: string) => {
    if (process.env.NODE_ENV === 'development') console.warn(`[Toast Warning] ${message}`);
  },
};

export default Toast;
