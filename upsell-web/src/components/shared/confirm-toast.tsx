"use client";

import { createContext, useCallback, useContext, useState, FC, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmToastContextValue {
  show: (options: ConfirmOptions) => void;
  hide: () => void;
}

const ConfirmToastContext = createContext<ConfirmToastContextValue | null>(null);

export const ConfirmToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const show = useCallback((opts: ConfirmOptions) => setOptions(opts), []);
  const hide = useCallback(() => setOptions(null), []);

  const handleConfirm = () => {
    options?.onConfirm();
    hide();
  };

  const handleCancel = () => {
    options?.onCancel?.();
    hide();
  };

  return (
    <ConfirmToastContext.Provider value={{ show, hide }}>
      {children}
      {options && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <div className="px-4 py-3 bg-zinc-900 rounded-2xl flex items-center justify-between gap-3 shadow-xl shadow-zinc-900/20">
            <p className="text-xs text-white">{options.message}</p>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm" variant="ghost"
                className="text-zinc-400 hover:text-white hover:bg-zinc-700 h-7 px-3 rounded-full text-xs"
                onClick={handleCancel}
              >
                {options.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                size="sm"
                className="h-7 px-3 rounded-full text-xs bg-white text-zinc-900 hover:bg-zinc-100"
                onClick={handleConfirm}
              >
                {options.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmToastContext.Provider>
  );
};

export function useConfirmToast(): ConfirmToastContextValue {
  const ctx = useContext(ConfirmToastContext);
  if (!ctx) throw new Error("useConfirmToast must be used inside <ConfirmToastProvider>");
  return ctx;
}
