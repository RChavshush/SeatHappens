import { cx } from "../lib/cx";
import { seatClasses, variantLabel } from "./seatClasses";
import { SEAT_VARIANT } from "./variants";

const LEGEND = [SEAT_VARIANT.available, SEAT_VARIANT.held, SEAT_VARIANT.booked];

export const Legend = () => (
  <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-neutral-400">
    {LEGEND.map((variant) => (
      <li key={variant} className="flex items-center gap-2">
        <span
          className={cx("h-3.5 w-3.5 rounded-[5px]", seatClasses[variant])}
          aria-hidden="true"
        />
        <span>{variantLabel[variant]}</span>
      </li>
    ))}
    <li className="flex items-center gap-2 text-neutral-500">
      <span className={cx("h-3.5 w-3.5 rounded-[5px]", seatClasses.mine)} aria-hidden="true" />
      <span>Your picks glow red</span>
    </li>
  </ul>
);
