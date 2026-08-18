import { cx } from "../lib/cx";
import { Icon } from "../ui/Icon";
import type { IconName } from "../ui/types";
import { useToasts } from "./ToastContext";
import type { ToastTone } from "./types";

const toneClasses: Record<ToastTone, string> = {
  success: "border-go/50 bg-go/10 text-emerald-100",
  error: "border-red/50 bg-red/10 text-red-100",
  info: "border-hairline bg-panel text-neutral-100",
};

const toneIcon: Record<ToastTone, IconName> = {
  success: "checkCircle",
  error: "alert",
  info: "info",
};

const toneIconColor: Record<ToastTone, string> = {
  success: "text-go",
  error: "text-red-soft",
  info: "text-neutral-400",
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
            "animate-toast-in pointer-events-auto flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg shadow-black/40 backdrop-blur",
            toneClasses[toast.tone],
          )}
        >
          <span className="flex items-start gap-2.5">
            <Icon
              name={toneIcon[toast.tone]}
              className={cx("mt-0.5 h-4 w-4 shrink-0", toneIconColor[toast.tone])}
            />
            <span>{toast.message}</span>
          </span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
            className="opacity-60 transition hover:opacity-100"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
