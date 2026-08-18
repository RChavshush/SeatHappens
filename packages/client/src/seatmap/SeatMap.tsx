import { SEAT_STATE } from "@cinema/shared";
import type { SeatMap as SeatMapData, SeatMapRow, SeatView } from "@cinema/shared";
import { Legend } from "./Legend";
import { Seat } from "./Seat";
import { evaluateSeat, seatVariant } from "./selection";

interface SeatMapProps {
  seatMap: SeatMapData;
  selected: ReadonlySet<string>;
  onSeatClick: (seat: SeatView) => void;
}

export const SeatMap = ({ seatMap, selected, onSeatClick }: SeatMapProps) => {
  const openSeats = seatMap.rows.reduce(
    (total, row) => total + row.seats.filter((seat) => seat.status === SEAT_STATE.available).length,
    0,
  );

  const renderRow = (row: SeatMapRow) => (
    <div key={row.rowLabel} className="flex items-center gap-2">
      <span className="w-4 shrink-0 text-right font-mono text-[10px] text-neutral-600">
        {row.rowLabel}
      </span>
      <div className="flex flex-1 justify-center gap-2">
        {row.seats.map((seat) => (
          <Seat
            key={seat.id}
            seat={seat}
            variant={seatVariant(seat)}
            selected={selected.has(seat.id)}
            evaluation={evaluateSeat(seatMap, seat, selected)}
            onClick={onSeatClick}
          />
        ))}
      </div>
      <span aria-hidden="true" className="w-4 shrink-0" />
    </div>
  );

  return (
    <div className="space-y-9">
      <div className="mx-auto w-full max-w-lg">
        <div
          aria-hidden="true"
          className="animate-screen-glow mx-auto h-[5px] w-3/5 rounded-full bg-red"
        />
        <p className="mt-2.5 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-600">
          Screen · all eyes this way
        </p>
      </div>

      {openSeats === 0 && (
        <p className="mx-auto max-w-md rounded-xl border border-hairline bg-white/[0.03] px-4 py-3 text-center text-sm text-neutral-300">
          Well… seat happened. Every seat here is spoken for.
        </p>
      )}

      <div className="overflow-x-auto px-2 py-2">
        <div className="mx-auto flex min-w-max flex-col items-center gap-2">
          {seatMap.rows.map(renderRow)}
        </div>
      </div>

      <Legend />
    </div>
  );
};
