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
    <div key={row.rowLabel} className="flex items-center gap-1">
      <span className="w-5 shrink-0 text-right text-xs text-slate-500">{row.rowLabel}</span>
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
    <div className="space-y-6">
      <Legend />
      <div className="overflow-x-auto pb-2">
        <div className="mx-auto flex min-w-max flex-col items-center gap-6">
          <div className="w-full max-w-md rounded bg-screen py-1 text-center text-xs font-semibold uppercase tracking-widest text-slate-900">
            Screen
          </div>
          <div className="flex flex-col gap-1">{main.map(renderRow)}</div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Balcony</div>
          <div className="flex flex-col gap-1">{balcony.map(renderRow)}</div>
        </div>
      </div>
    </div>
  );
};
