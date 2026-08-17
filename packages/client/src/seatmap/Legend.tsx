import { cx } from "../lib/cx";
import { seatClasses, variantLabel } from "./seatClasses";
import type { SeatVariant } from "./types";

const LEGEND: SeatVariant[] = ["available", "held", "mine", "booked", "selected"];

export const Legend = () => (
  <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
    {LEGEND.map((variant) => (
      <li key={variant} className="flex items-center gap-2">
        <span className={cx("h-5 w-5 rounded", seatClasses[variant])} aria-hidden="true" />
        <span className="capitalize">{variantLabel[variant]}</span>
      </li>
    ))}
  </ul>
);
