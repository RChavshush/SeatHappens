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
    <aside className="space-y-4 rounded-2xl border border-marquee/40 bg-neutral-950/80 p-5 shadow-lg shadow-black/40 backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black uppercase tracking-tight text-white">Seats on hold</h2>
        <span aria-hidden="true" className="text-xl">
          🍿
        </span>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-black/50 p-3 text-sm">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Your seats</p>
        <p className="mt-0.5 font-bold text-marquee">{seatLabels.join(", ")}</p>
      </div>

      <div
        aria-live="polite"
        className={cx(
          "rounded-xl border p-3 text-sm",
          urgent
            ? "border-red-500/50 bg-red-500/10 text-red-200"
            : "border-neutral-800 bg-black/40 text-neutral-300",
        )}
      >
        {urgent ? "Trailers are basically over — decide! " : "Held for you for "}
        <span className="font-mono text-lg font-bold tabular-nums text-white">
          {formatCountdown(remaining)}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming || expired}
          className="flex-1 rounded-xl bg-marquee px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-marquee focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-60"
        >
          {confirming ? "Locking it in…" : "Confirm seats"}
        </button>
        <button
          type="button"
          onClick={onRelease}
          disabled={releasing}
          className="flex-1 rounded-xl border border-neutral-700 px-3 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-60"
        >
          {releasing ? "Letting go…" : "Release"}
        </button>
      </div>
    </aside>
  );
};
