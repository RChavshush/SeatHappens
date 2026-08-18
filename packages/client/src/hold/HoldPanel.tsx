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

  const urgent = remaining <= 60_000;

  return (
    <aside className="space-y-4 rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-5 shadow-lg shadow-emerald-900/20 backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Seats on hold</h2>
        <span aria-hidden="true" className="text-xl">
          🍿
        </span>
      </div>

      <div className="rounded-xl bg-slate-950/50 p-3 text-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Your seats</p>
        <p className="mt-0.5 font-medium text-emerald-200">{seatLabels.join(", ")}</p>
      </div>

      <div
        aria-live="polite"
        className={cx(
          "rounded-xl border p-3 text-sm",
          urgent
            ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
            : "border-slate-700/70 bg-slate-950/40 text-slate-300",
        )}
      >
        {urgent ? "Trailers are basically over — decide! " : "Held for you for "}
        <span className="font-mono text-lg font-bold tabular-nums text-slate-100">
          {formatCountdown(remaining)}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming || expired}
          className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-3 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-900/40 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-60"
        >
          {confirming ? "Locking it in…" : "Confirm seats"}
        </button>
        <button
          type="button"
          onClick={onRelease}
          disabled={releasing}
          className="flex-1 rounded-xl border border-slate-600 px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-60"
        >
          {releasing ? "Letting go…" : "Release"}
        </button>
      </div>
    </aside>
  );
};
