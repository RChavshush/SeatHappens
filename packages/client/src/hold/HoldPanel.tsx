import { useEffect } from "react";
import type { Hold } from "@cinema/shared";
import { cx } from "../lib/cx";
import { formatCountdown } from "../lib/time";
import { useCountdown } from "../hooks/useCountdown";
import { Icon } from "../ui/Icon";

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
    <aside className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
        <Icon name="ticket" className="h-5 w-5 text-red" />
        Seats on hold
      </h2>

      <div className="rounded-xl border border-hairline bg-white/[0.03] p-3">
        <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">Your seats</p>
        <p className="mt-1 font-mono text-lg font-bold text-red-soft">{seatLabels.join(", ")}</p>
      </div>

      <div
        aria-live="polite"
        className={cx(
          "flex items-center gap-2 rounded-xl border p-3 text-sm",
          urgent
            ? "border-red/50 bg-red/10 text-red-soft"
            : "border-hairline bg-white/[0.02] text-neutral-300",
        )}
      >
        <Icon name="clock" className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">
          {urgent ? "Trailers are basically over — decide!" : "Your seat is getting impatient."}
        </span>
        <span className="font-mono text-base font-bold tabular-nums text-white">
          {formatCountdown(remaining)}
        </span>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming || expired}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red px-3 py-3 text-sm font-bold text-white transition hover:bg-red-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-red-soft focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:opacity-60"
        >
          {!confirming && <Icon name="check" className="h-4 w-4" />}
          {confirming ? "Reserving your seats…" : "Claim my seats"}
        </button>
        <button
          type="button"
          onClick={onRelease}
          disabled={releasing}
          className="w-full rounded-xl border border-hairline px-3 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-neutral-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:opacity-60"
        >
          {releasing ? "Letting go…" : "Abandon seat"}
        </button>
      </div>
    </aside>
  );
};
