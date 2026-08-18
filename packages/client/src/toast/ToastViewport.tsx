import { cx } from "../lib/cx";
import { useToasts } from "./ToastContext";
import type { ToastTone } from "./types";

const toneClasses: Record<ToastTone, string> = {
  success: "border-emerald-500/60 bg-emerald-950/90 text-emerald-100",
  error: "border-red-500/60 bg-red-950/90 text-red-100",
  info: "border-neutral-700 bg-neutral-900/90 text-neutral-100",
};

const toneIcon: Record<ToastTone, string> = {
  success: "🎉",
  error: "🙈",
  info: "🎬",
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
            "animate-toast-in pointer-events-auto flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg shadow-black/30 backdrop-blur",
            toneClasses[toast.tone],
          )}
        >
          <span className="flex items-start gap-2">
            <span aria-hidden="true">{toneIcon[toast.tone]}</span>
            <span>{toast.message}</span>
          </span>
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
