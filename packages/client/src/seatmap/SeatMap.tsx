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
  const main = seatMap.rows.filter((row) => row.section === "main");
  const balcony = seatMap.rows.filter((row) => row.section === "balcony");

  const renderRow = (row: SeatMapRow) => (
    <div key={row.rowLabel} className="flex items-center gap-1.5">
      <span className="w-5 shrink-0 text-right text-xs font-semibold text-neutral-500">
        {row.rowLabel}
      </span>
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
  );

  return (
    <div className="space-y-8">
      <Legend />
      <div className="overflow-x-auto pb-2">
        <div className="mx-auto flex min-w-max flex-col items-center gap-8">
          <div className="w-full max-w-lg space-y-1.5">
            <div
              aria-hidden="true"
              className="mx-auto h-2.5 w-11/12 rounded-t-full bg-gradient-to-b from-curtain to-curtain-deep shadow-inner"
            />
            <div className="animate-screen-glow rounded-md bg-gradient-to-b from-screen to-neutral-400 py-1.5 text-center text-xs font-black uppercase tracking-[0.35em] text-black [transform:perspective(30rem)_rotateX(32deg)]">
              Screen
            </div>
            <p className="text-center text-[0.65rem] uppercase tracking-widest text-neutral-500">
              All eyes this way
            </p>
          </div>

          <div className="flex flex-col gap-1.5">{main.map(renderRow)}</div>

          <div className="flex w-full items-center gap-3 text-[0.65rem] font-semibold uppercase tracking-widest text-neutral-500">
            <span className="h-px flex-1 bg-neutral-800" />
            Balcony · the fancy seats
            <span className="h-px flex-1 bg-neutral-800" />
          </div>

          <div className="flex flex-col gap-1.5">{balcony.map(renderRow)}</div>
        </div>
      </div>
    </div>
  );
};
