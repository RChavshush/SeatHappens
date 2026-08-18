import { cx } from "../lib/cx";
import { seatClasses, variantLabel } from "./seatClasses";
import type { SeatProps } from "./types";

export const Seat = ({ seat, variant, selected, evaluation, onClick }: SeatProps) => {
  const shown = selected ? "selected" : variant;
  const stateLabel = selected ? "selected" : variantLabel[variant];
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
        "h-8 w-8 shrink-0 rounded-t-lg rounded-b-sm text-xs font-medium tabular-nums transition duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-marquee",
        seatClasses[shown],
        evaluation.disabled && !selected && "cursor-not-allowed opacity-40",
        !evaluation.disabled &&
          "hover:brightness-125 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-safe:active:scale-95",
        selected && "motion-safe:-translate-y-0.5",
      )}
    >
      {seat.seatNumber}
    </button>
  );
};
