import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { getModalMotion, getMotionTransition } from '../../design/motion';
import ActionProgressButton from './ActionProgressButton';
import { LoadingProgress } from './LoadingStates';

function readFormSnapshot(root) {
  if (!root) return '';
  const fields = Array.from(root.querySelectorAll('input, select, textarea'))
    .filter((field) => {
      const type = field.getAttribute('type');
      return type !== 'file' && type !== 'button' && type !== 'submit' && type !== 'reset';
    })
    .map((field, index) => {
      const key = field.name || field.id || field.getAttribute('aria-label') || String(index);
      if (field.type === 'checkbox' || field.type === 'radio') {
        return [key, field.type, field.checked];
      }
      if (field.tagName === 'SELECT' && field.multiple) {
        return [key, field.type, Array.from(field.selectedOptions).map((option) => option.value)];
      }
      return [key, field.type || field.tagName, field.value];
    });
  return JSON.stringify(fields);
}

// VI: Modal component cho dialogs
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  bodyClassName = '',
  busy = false,
  busyLabel = 'Dang xu ly...',
  confirmOnClose = false,
  confirmCloseMessage = 'Ban co thay doi chua luu. Dong hop thoai se bo cac thay doi nay.'
}) {
  const modalRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  const confirmOnCloseRef = useRef(confirmOnClose);
  const previousBodyOverflowRef = useRef('');
  const previousFocusRef = useRef(null);
  const initialFormSnapshotRef = useRef('');
  const userInteractedRef = useRef(false);
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    confirmOnCloseRef.current = confirmOnClose;
  }, [confirmOnClose]);

  const hasUnsavedFormChanges = useCallback(() => {
    if (!confirmOnCloseRef.current || !userInteractedRef.current) return false;
    const initialSnapshot = initialFormSnapshotRef.current;
    if (!initialSnapshot) return false;
    return readFormSnapshot(modalRef.current) !== initialSnapshot;
  }, []);

  const handleClose = useCallback(() => {
    if (busyRef.current) return;
    if (hasUnsavedFormChanges()) {
      setCloseGuardOpen(true);
      return;
    }
    onCloseRef.current?.();
  }, [hasUnsavedFormChanges]);

  const confirmDiscardAndClose = useCallback(() => {
    setCloseGuardOpen(false);
    onCloseRef.current?.();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setCloseGuardOpen(false);
      initialFormSnapshotRef.current = '';
      userInteractedRef.current = false;
      return undefined;
    }

    const getFocusableElements = () => {
      const focusableSelector = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');

      return Array.from(modalRef.current?.querySelectorAll(focusableSelector) || [])
        .filter((element) => element.offsetParent !== null || element === document.activeElement);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (!focusableElements.length) {
        e.preventDefault();
        modalRef.current?.focus?.();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const markInteracted = () => {
      userInteractedRef.current = true;
      setCloseGuardOpen(false);
    };

    const currentModal = modalRef.current;

    previousFocusRef.current = document.activeElement;
    document.addEventListener('keydown', handleKeyDown);
    previousBodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => {
      const focusTarget = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusTarget?.focus?.();
      initialFormSnapshotRef.current = readFormSnapshot(modalRef.current);
    }, 0);
    currentModal?.addEventListener('input', markInteracted, true);
    currentModal?.addEventListener('change', markInteracted, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      currentModal?.removeEventListener('input', markInteracted, true);
      currentModal?.removeEventListener('change', markInteracted, true);
      document.body.style.overflow = previousBodyOverflowRef.current;
      if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus?.();
      }
    };
  }, [handleClose, isOpen]);

  const handleContentClickCapture = (e) => {
    if (!e.target?.closest?.('[data-modal-close]')) return;
    e.preventDefault();
    e.stopPropagation();
    handleClose();
  };

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
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={getMotionTransition({ reduced: reduceMotion, duration: 'standard' })}
            className="fixed inset-0 bg-slate-900/40"
            onClick={handleClose}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full items-start justify-center">
          <Motion.div
            ref={modalRef}
            initial={modalMotion.initial}
            animate={modalMotion.animate}
            exit={modalMotion.exit}
            transition={modalMotion.transition}
            className={`flex max-h-full w-full ${sizes[size]} flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white/95 shadow-2xl shadow-slate-900/20 backdrop-blur-xl`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-busy={busy || undefined}
            tabIndex={-1}
            onClickCapture={handleContentClickCapture}
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
                    onClick={handleClose}
                    disabled={busy}
                    className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition-colors hover:bg-rose-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {closeGuardOpen && (
              <div className="shrink-0 border-b border-amber-100 bg-amber-50 px-6 py-4 text-sm text-amber-900 md:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-semibold">{confirmCloseMessage}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCloseGuardOpen(false)}
                      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-100"
                    >
                      Tiep tuc sua
                    </button>
                    <button
                      type="button"
                      onClick={confirmDiscardAndClose}
                      className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700"
                    >
                      Dong khong luu
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Body */}
            <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 md:px-8 md:py-6 ${bodyClassName}`}>
              {busy && <LoadingProgress label={busyLabel} className="mb-4" />}
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
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const handleConfirm = async () => {
    if (confirming) return;
    setConfirmError('');
    setConfirming(true);
    try {
      await onConfirm?.();
      onClose?.();
    } catch (error) {
      setConfirmError(error?.message || 'Khong the thuc hien thao tac');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      busy={confirming}
      busyLabel="Dang xu ly..."
    >
      <p className="text-slate-600 mb-6 text-base">{message}</p>
      {confirmError && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {confirmError}
        </div>
      )}
      <div className="flex justify-end gap-3 mt-8">
        <button
          type="button"
          onClick={onClose}
          disabled={confirming}
          className="rounded-xl px-5 py-2.5 font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelText}
        </button>
        <ActionProgressButton
          onClick={handleConfirm}
          loading={confirming}
          loadingLabel="Dang xu ly..."
          className={`rounded-xl px-5 py-2.5 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 ${
            variant === 'danger'
              ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/30 hover:shadow-rose-500/40'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-cyan-500/30 hover:shadow-cyan-500/40'
          }`}
        >
          {confirmText}
        </ActionProgressButton>
      </div>
    </Modal>
  );
}
