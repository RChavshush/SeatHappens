import { cx } from "../lib/cx";
import { seatClasses, variantLabel } from "./seatClasses";
import type { SeatVariant } from "./types";

const LEGEND: SeatVariant[] = ["available", "held", "mine", "booked", "selected"];

export const Legend = () => (
  <ul className="flex flex-wrap gap-2 text-sm text-neutral-300">
    {LEGEND.map((variant) => (
      <li
        key={variant}
        className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/60 px-3 py-1 text-neutral-300"
      >
        <span
          className={cx("h-4 w-4 rounded-t-md rounded-b-sm", seatClasses[variant])}
          aria-hidden="true"
        />
        <span className="capitalize">{variantLabel[variant]}</span>
      </li>
    ))}
  </ul>
);
