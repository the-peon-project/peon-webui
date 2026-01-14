import React from 'react';
import { X } from 'lucide-react';

/**
 * Modal wrapper component
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  className = '',
}) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[90vw]',
  };

  return (
    <div 
      className="modal-backdrop flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`
          medieval-border rounded-lg w-full ${sizes[size]}
          animate-modal-in
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
        data-testid="modal-content"
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between p-6 border-b border-purple-800/50">
            {title && (
              <h2 className="warcraft-title text-2xl">{title}</h2>
            )}
            {showClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * Modal footer with action buttons
 */
export const ModalFooter = ({ children, className = '' }) => (
  <div className={`flex gap-3 pt-4 border-t border-purple-800/50 mt-4 ${className}`}>
    {children}
  </div>
);

/**
 * Confirm dialog
 */
export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-gray-300 mb-6">{message}</p>
      <ModalFooter>
        <button
          onClick={onClose}
          className="gray-button flex-1 py-2 rounded"
          disabled={loading}
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className={`${variant === 'danger' ? 'red-button' : 'gold-button'} flex-1 py-2 rounded`}
          disabled={loading}
        >
          {loading ? 'Processing...' : confirmText}
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default Modal;
