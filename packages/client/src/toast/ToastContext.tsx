import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ApiError } from "../api/errors";
import { TOAST_TONE } from "./tones";
import type { Toast, ToastContextValue, ToastTone } from "./types";

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_MS = 5_000;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, tone, message }]);
      setTimeout(() => dismiss(id), DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, push, dismiss }),
    [toasts, push, dismiss],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToasts = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToasts must be used within a ToastProvider");
  return ctx;
};

export const useErrorToast = (): ((error: unknown) => void) => {
  const { push } = useToasts();
  return useCallback(
    (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : "Seat happens. Try again.";
      push(TOAST_TONE.error, message);
    },
    [push],
  );
};
