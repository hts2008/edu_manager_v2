import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';

// VI: Modal component cho dialogs
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  bodyClassName = ''
}) {
  const modalRef = useRef(null);
  const previousBodyOverflowRef = useRef('');
  const titleId = useId();

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      previousBodyOverflowRef.current = document.body.style.overflow;
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
      document.body.style.overflow = previousBodyOverflowRef.current;
    };
  }, [isOpen, onClose]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95%] mx-auto',
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 box-border overflow-hidden p-3 sm:p-6">
          <Motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-slate-900/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full items-start justify-center">
          <Motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className={`flex max-h-full w-full ${sizes[size]} flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white/95 shadow-2xl shadow-slate-900/20 backdrop-blur-xl`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
          >
            {/* Header */}
            {(title || showClose) && (
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5 md:px-8">
                {title && (
                  <h2 id={titleId} className="text-xl font-bold tracking-tight text-slate-900">
                    {title}
                  </h2>
                )}
                {showClose && (
                  <button
                    type="button"
                    aria-label="Đóng hộp thoại"
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
            <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 md:px-8 md:py-6 ${bodyClassName}`}>
              {children}
            </div>
          </Motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
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
