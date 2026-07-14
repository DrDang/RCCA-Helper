import React, { createContext, FormEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

type DialogKind = 'alert' | 'confirm' | 'prompt';

interface DialogState {
  kind: DialogKind;
  title: string;
  message: string;
  defaultValue?: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface DialogContextValue {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string, options?: { confirmLabel?: string; danger?: boolean }) => Promise<boolean>;
  showPrompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export const AppDialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [inputValue, setInputValue] = useState('');
  const resolverRef = useRef<((value: unknown) => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const openDialog = useCallback(<T,>(nextDialog: DialogState): Promise<T> => {
    setInputValue(nextDialog.defaultValue ?? '');
    setDialog(nextDialog);
    return new Promise<T>((resolve) => {
      resolverRef.current = resolve as (value: unknown) => void;
    });
  }, []);

  const closeDialog = useCallback((value: unknown) => {
    setDialog(null);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(value);
  }, []);

  const showAlert = useCallback((message: string, title = 'Notice') =>
    openDialog<void>({ kind: 'alert', title, message }), [openDialog]);

  const showConfirm = useCallback((message: string, title = 'Confirm', options?: { confirmLabel?: string; danger?: boolean }) =>
    openDialog<boolean>({ kind: 'confirm', title, message, ...options }), [openDialog]);

  const showPrompt = useCallback((message: string, defaultValue = '', title = 'Enter a name') =>
    openDialog<string | null>({ kind: 'prompt', title, message, defaultValue }), [openDialog]);

  useEffect(() => {
    if (dialog?.kind === 'prompt') {
      window.setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDialog(dialog.kind === 'alert' ? undefined : dialog.kind === 'confirm' ? false : null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dialog, closeDialog]);

  const contextValue = useMemo(() => ({ showAlert, showConfirm, showPrompt }), [showAlert, showConfirm, showPrompt]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!dialog) return;
    closeDialog(dialog.kind === 'prompt' ? inputValue.trim() || null : dialog.kind === 'confirm' ? true : undefined);
  };

  const handleBackdropClick = () => {
    if (!dialog) return;
    closeDialog(dialog.kind === 'alert' ? undefined : dialog.kind === 'confirm' ? false : null);
  };

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
      {dialog && (
        <div
          data-app-dialog="true"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={handleBackdropClick}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
            onSubmit={handleSubmit}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-primary)' }}
          >
            <div className="flex items-start gap-3 p-5" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
              <div className={`mt-0.5 rounded-full p-2 ${dialog.danger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                <AlertTriangle size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="app-dialog-title" className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{dialog.title}</h2>
                <p className="mt-1 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>{dialog.message}</p>
              </div>
              <button
                type="button"
                onClick={handleBackdropClick}
                className="rounded-lg p-1.5 hover:bg-black/5"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {dialog.kind === 'prompt' && (
              <div className="px-5 pt-5">
                <input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ backgroundColor: 'var(--color-surface-secondary)', border: '1px solid var(--color-border-secondary)', color: 'var(--color-text-primary)' }}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 p-5">
              {dialog.kind !== 'alert' && (
                <button
                  type="button"
                  onClick={() => closeDialog(dialog.kind === 'confirm' ? false : null)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-black/5"
                  style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-primary)' }}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${dialog.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {dialog.kind === 'alert' ? 'OK' : dialog.confirmLabel ?? (dialog.kind === 'prompt' ? 'Continue' : 'Confirm')}
              </button>
            </div>
          </form>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useAppDialog = (): DialogContextValue => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useAppDialog must be used within AppDialogProvider');
  return context;
};
