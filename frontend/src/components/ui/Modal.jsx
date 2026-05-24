import { useEffect, useId, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

// VI: Modal component cho dialogs
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true
}) {
  const modalRef = useRef(null);
  const titleId = useId();

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
      window.setTimeout(() => {
        const focusTarget = modalRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusTarget?.focus?.();
      }, 0);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95%] mx-auto',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <Motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-slate-900/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <Motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className={`relative w-full ${sizes[size]} max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/60 bg-white/95 p-6 shadow-2xl shadow-slate-900/20 backdrop-blur-xl md:p-8`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
          >
            {/* Header */}
            {(title || showClose) && (
              <div className="mb-6 flex items-center justify-between pb-4 border-b border-slate-100">
                {title && (
                  <h2 id={titleId} className="text-xl font-bold tracking-tight text-slate-900">
                    {title}
                  </h2>
                )}
                {showClose && (
                  <button
                    onClick={onClose}
                    className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition-colors hover:bg-rose-100 hover:text-rose-600"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="relative">
              {children}
            </div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Confirm dialog helper
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger' // 'danger' | 'primary'
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-slate-600 mb-6 text-base">{message}</p>
      <div className="flex justify-end gap-3 mt-8">
        <button
          onClick={onClose}
          className="rounded-xl px-5 py-2.5 font-semibold text-slate-600 transition-colors hover:bg-slate-100"
        >
          {cancelText}
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`rounded-xl px-5 py-2.5 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 ${
            variant === 'danger'
              ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/30 hover:shadow-rose-500/40'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-cyan-500/30 hover:shadow-cyan-500/40'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
