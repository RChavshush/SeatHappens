import type { SeatVariant } from "./types";

export const seatClasses: Record<SeatVariant, string> = {
  available: "bg-seat-available border-2 border-solid border-seat-available-border text-slate-200",
  held: "bg-seat-held border-2 border-dashed border-seat-held-border text-amber-50",
  mine: "bg-seat-mine border-2 border-double border-seat-mine-border text-emerald-50",
  booked: "bg-seat-booked border-2 border-dotted border-seat-booked-border text-red-50",
  selected: "bg-seat-selected border-2 border-solid border-seat-selected-border text-white ring-2 ring-seat-selected-border",
};

export const variantLabel: Record<SeatVariant, string> = {
  available: "available",
  held: "held by another user",
  mine: "held by you",
  booked: "booked",
  selected: "selected",
};
