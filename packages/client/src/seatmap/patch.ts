import type { SeatMap, SeatsUpdatedEvent } from "@cinema/shared";

export const applySeatsUpdate = (
  seatMap: SeatMap,
  event: SeatsUpdatedEvent,
  myHoldSeatIds: readonly string[],
): SeatMap => {
  const patch = new Map(event.seats.map((seat) => [seat.id, seat]));
  const mine = new Set(myHoldSeatIds);

  return {
    ...seatMap,
    rows: seatMap.rows.map((row) => ({
      ...row,
      seats: row.seats.map((seat) => {
        const update = patch.get(seat.id);
        if (!update) return seat;
        return {
          ...seat,
          status: update.status,
          holdExpiresAt: update.holdExpiresAt,
          heldByMe: update.status === "held" && mine.has(seat.id),
        };
      }),
    })),
  };
};
