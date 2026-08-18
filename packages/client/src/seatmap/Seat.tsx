import { cx } from "../lib/cx";
import { seatClasses, variantLabel } from "./seatClasses";
import type { SeatProps } from "./types";
import { SEAT_VARIANT } from "./variants";

export const Seat = ({ seat, variant, selected, evaluation, onClick }: SeatProps) => {
  const shown = selected ? SEAT_VARIANT.mine : variant;
  const stateLabel = selected ? variantLabel[SEAT_VARIANT.mine] : variantLabel[variant];
  const label = `Row ${seat.rowLabel} seat ${seat.seatNumber}, ${stateLabel}`;

  return (
    <button
      type="button"
      onClick={() => onClick(seat)}
      disabled={evaluation.disabled}
      title={evaluation.reason}
      aria-label={
        evaluation.disabled && evaluation.reason ? `${label}. ${evaluation.reason}` : label
      }
      aria-pressed={selected}
      className={cx(
        "h-9 w-9 shrink-0 rounded-[9px] font-mono text-[11px] font-bold tabular-nums transition duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:ring-red-soft",
        seatClasses[shown],
        evaluation.disabled && !selected && "cursor-not-allowed opacity-45",
        !evaluation.disabled &&
          "hover:brightness-110 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-safe:active:scale-95",
        selected && "motion-safe:-translate-y-0.5",
      )}
    >
      {seat.seatNumber}
    </button>
  );
};
