import type { SeatVariant } from "./types";

/**
 * State is signalled by fill AND a distinct border style (solid / dashed /
 * double / dotted) so it never relies on colour alone.
 */
export const seatClasses: Record<SeatVariant, string> = {
  available:
    "bg-seat-available border-2 border-solid border-seat-available-border text-slate-300",
  held: "bg-seat-held border-2 border-dashed border-seat-held-border text-amber-50",
  mine: "bg-seat-mine border-2 border-double border-seat-mine-border text-emerald-50 shadow-sm shadow-emerald-500/30",
  booked: "bg-seat-booked border-2 border-dotted border-seat-booked-border text-red-100",
  selected:
    "bg-seat-selected border-2 border-solid border-seat-selected-border text-white ring-2 ring-seat-selected-border shadow-md shadow-blue-500/40",
};

export const variantLabel: Record<SeatVariant, string> = {
  available: "available",
  held: "held by another user",
  mine: "held by you",
  booked: "booked",
  selected: "selected",
};
