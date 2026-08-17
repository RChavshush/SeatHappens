import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SeatView } from "@cinema/shared";
import { getSeatMap, listScreenings } from "../api/screenings";
import { queryKeys } from "../query/keys";
import { SeatMap } from "../seatmap/SeatMap";
import { nextSelection } from "../seatmap/selection";

export const ScreeningView = () => {
  const screeningsQuery = useQuery({
    queryKey: queryKeys.screenings,
    queryFn: listScreenings,
  });

  const screeningId = screeningsQuery.data?.[0]?.id;

  const seatMapQuery = useQuery({
    queryKey: queryKeys.seatMap(screeningId ?? "none"),
    queryFn: () => getSeatMap(screeningId!),
    enabled: Boolean(screeningId),
  });

  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const seatMap = seatMapQuery.data;

  const onSeatClick = useCallback(
    (seat: SeatView) => setSelected((prev) => nextSelection(seatMap, prev, seat)),
    [seatMap],
  );

  if (screeningsQuery.isPending || seatMapQuery.isPending) {
    return <p className="text-slate-400">Loading seat map…</p>;
  }
  if (screeningsQuery.isError || !screeningId) {
    return <p className="text-red-400">Could not load screenings.</p>;
  }
  if (seatMapQuery.isError || !seatMap) {
    return <p className="text-red-400">Could not load the seat map.</p>;
  }

  return (
    <div className="space-y-6">
      <SeatMap seatMap={seatMap} selected={selected} onSeatClick={onSeatClick} />
      <p className="text-sm text-slate-400">
        {selected.size === 0
          ? "Select adjacent seats in a single row."
          : `${selected.size} seat${selected.size > 1 ? "s" : ""} selected.`}
      </p>
    </div>
  );
};
