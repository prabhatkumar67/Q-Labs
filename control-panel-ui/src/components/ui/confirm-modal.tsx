"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { Button } from "./button";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    closing: boolean;
    options: ConfirmOptions;
  }>({
    open: false,
    closing: false,
    options: { title: "" },
  });

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, closing: false, options });
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    setState((prev) => ({ ...prev, closing: true }));
    setTimeout(() => {
      resolveRef.current?.(result);
      setState({ open: false, closing: false, options: { title: "" } });
    }, 150);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <ConfirmModal
          {...state.options}
          closing={state.closing}
          onConfirm={() => handleClose(true)}
          onCancel={() => handleClose(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmModal({
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  closing,
  onConfirm,
  onCancel,
}: ConfirmOptions & {
  closing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    confirmRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-150"
        style={{ opacity: closing ? 0 : 1 }}
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4 bg-card rounded-none border border-border shadow-xl"
        style={{
          animation: closing
            ? "none"
            : "fade-in-scale 0.15s cubic-bezier(0.16, 1, 0.3, 1) both",
          opacity: closing ? 0 : 1,
          transform: closing ? "scale(0.97)" : undefined,
          transition: closing
            ? "opacity 0.15s ease-out, transform 0.15s ease-out"
            : undefined,
        }}
      >
        <div className="p-6">
          <h3 className="text-base font-semibold">
            {title}
          </h3>

          {description && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {description}
            </p>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onCancel}>
              {cancelText}
            </Button>
            <Button
              ref={confirmRef}
              variant={variant === "destructive" ? "destructive" : "default"}
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
