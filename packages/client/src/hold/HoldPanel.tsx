import { useEffect } from "react";
import type { Hold } from "@cinema/shared";
import { cx } from "../lib/cx";
import { formatCountdown } from "../lib/time";
import { useCountdown } from "../hooks/useCountdown";

interface HoldPanelProps {
  hold: Hold;
  seatLabels: string[];
  confirming: boolean;
  releasing: boolean;
  onConfirm: () => void;
  onRelease: () => void;
  onExpire: () => void;
}

export const HoldPanel = ({
  hold,
  seatLabels,
  confirming,
  releasing,
  onConfirm,
  onRelease,
  onExpire,
}: HoldPanelProps) => {
  const remaining = useCountdown(hold.expiresAt);
  const expired = remaining <= 0;

  useEffect(() => {
    if (expired) onExpire();
  }, [expired, onExpire]);

  return (
    <aside className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold text-slate-100">Your hold</h2>

      <div className="text-sm text-slate-300">
        <span className="text-slate-500">Seats: </span>
        {seatLabels.join(", ")}
      </div>

      <p aria-live="polite" className="text-sm text-slate-300">
        Expires in{" "}
        <span
          className={cx(
            "font-mono text-base font-semibold tabular-nums",
            remaining <= 60_000 ? "text-amber-400" : "text-slate-100",
          )}
        >
          {formatCountdown(remaining)}
        </span>
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming || expired}
          className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {confirming ? "Confirming…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={onRelease}
          disabled={releasing}
          className="flex-1 rounded-md border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60"
        >
          {releasing ? "Releasing…" : "Release"}
        </button>
      </div>
    </aside>
  );
};
