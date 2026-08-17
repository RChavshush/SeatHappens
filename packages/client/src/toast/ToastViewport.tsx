import { cx } from "../lib/cx";
import { useToasts } from "./ToastContext";
import type { ToastTone } from "./types";

const toneClasses: Record<ToastTone, string> = {
  success: "border-emerald-500 bg-emerald-950 text-emerald-100",
  error: "border-red-500 bg-red-950 text-red-100",
  info: "border-slate-500 bg-slate-800 text-slate-100",
};

export const ToastViewport = () => {
  const { toasts, dismiss } = useToasts();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cx(
            "pointer-events-auto flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm shadow-lg",
            toneClasses[toast.tone],
          )}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
            className="text-lg leading-none opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
