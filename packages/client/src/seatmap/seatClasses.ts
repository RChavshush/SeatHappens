import type { SeatVariant } from "./types";

/**
 * State is signalled by fill AND a distinct border style (solid / dashed /
 * double / dotted) so it never relies on colour alone.
 */
export const seatClasses: Record<SeatVariant, string> = {
  available:
    "bg-seat-available border-2 border-solid border-seat-available-border text-neutral-300",
  held: "bg-seat-held border-2 border-dashed border-seat-held-border text-neutral-200",
  mine: "bg-seat-mine border-2 border-double border-seat-mine-border text-yellow-100",
  booked: "bg-seat-booked border-2 border-dotted border-seat-booked-border text-red-100",
  selected:
    "bg-seat-selected border-2 border-solid border-seat-selected-border font-bold text-black ring-2 ring-seat-selected-border shadow-[0_0_16px_-2px] shadow-yellow-300/60",
};

export const variantLabel: Record<SeatVariant, string> = {
  available: "available",
  held: "held by another user",
  mine: "held by you",
  booked: "booked",
  selected: "selected",
};
