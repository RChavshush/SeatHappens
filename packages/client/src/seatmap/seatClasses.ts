import type { SeatVariant } from "./types";

/**
 * State is signalled by fill AND a distinct border style (solid / dashed /
 * dotted / double) so it never relies on colour alone. Your own seats carry the
 * brand red so they stand out from everyone else's.
 */
export const seatClasses: Record<SeatVariant, string> = {
  available:
    "bg-seat-available border-2 border-solid border-seat-available-border text-neutral-300",
  held: "bg-seat-reserved border-2 border-dashed border-seat-reserved-border text-amber-200",
  mine: "bg-seat-mine border-2 border-solid border-seat-mine-border text-white shadow-[0_0_16px_-2px_rgba(229,9,20,0.85)]",
  booked: "bg-seat-booked border-2 border-dotted border-seat-booked-border text-neutral-600",
  mineBooked:
    "bg-seat-mine-booked border-2 border-double border-seat-mine-booked-border text-red-200",
};

export const variantLabel: Record<SeatVariant, string> = {
  available: "Available",
  held: "Reserved",
  mine: "Your seat",
  booked: "Booked",
  mineBooked: "Your booking",
};
