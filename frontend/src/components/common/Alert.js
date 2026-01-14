import React from 'react';
import { X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

/**
 * Alert component for notifications
 */
export const Alert = ({ 
  type = 'info', 
  title, 
  message, 
  onDismiss, 
  className = '' 
}) => {
  const styles = {
    info: {
      bg: 'bg-blue-900/90 border-blue-500',
      icon: <Info className="w-5 h-5 text-blue-400" />,
    },
    success: {
      bg: 'bg-green-900/90 border-green-500',
      icon: <CheckCircle className="w-5 h-5 text-green-400" />,
    },
    warning: {
      bg: 'bg-yellow-900/90 border-yellow-500',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    },
    error: {
      bg: 'bg-red-900/90 border-red-500',
      icon: <XCircle className="w-5 h-5 text-red-400" />,
    },
  };

  const style = styles[type] || styles.info;

  return (
    <div 
      className={`p-4 rounded-lg border animate-fade-in ${style.bg} ${className}`}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">{style.icon}</div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-semibold text-sm mb-1">{title}</h4>
          )}
          <p className="text-sm text-gray-300">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Toast notification container
 */
export const ToastContainer = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div 
      className="fixed top-4 right-4 z-50 space-y-2 max-w-sm"
      data-testid="toast-container"
    >
      {toasts.map((toast) => (
        <Alert
          key={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onDismiss={() => onDismiss(toast.id)}
          className="animate-slide-in shadow-lg"
        />
      ))}
    </div>
  );
};

/**
 * Server alert notification (specialized for server state changes)
 */
export const ServerAlert = ({ alert, onDismiss }) => {
  const typeMap = {
    online: 'success',
    offline: 'error',
    warning: 'warning',
    info: 'info',
  };

  return (
    <Alert
      type={typeMap[alert.type] || 'info'}
      title={alert.title}
      message={alert.message}
      onDismiss={() => onDismiss(alert.id)}
      className="shadow-lg"
    />
  );
};

export default Alert;
