import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SeatView } from "@cinema/shared";
import { confirmHold, createHold, getMyHold, releaseHold } from "../api/holds";
import { getSeatMap, listScreenings } from "../api/screenings";
import { useAuth } from "../auth/AuthContext";
import { HoldPanel } from "../hold/HoldPanel";
import { queryKeys } from "../query/keys";
import { SeatMap } from "../seatmap/SeatMap";
import { labelForSeats, nextSelection, selectedSeatIds } from "../seatmap/selection";
import { useSeatUpdates } from "../socket/useSeatUpdates";
import { useErrorToast, useToasts } from "../toast/ToastContext";

export const ScreeningView = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { push } = useToasts();
  const showError = useErrorToast();

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

  const holdQuery = useQuery({
    queryKey: queryKeys.myHold(screeningId ?? "none"),
    queryFn: () => getMyHold(screeningId!),
    enabled: Boolean(user && screeningId),
  });

  useSeatUpdates(screeningId, Boolean(user));

  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const seatMap = seatMapQuery.data;
  const hold = holdQuery.data ?? null;

  const onSeatClick = useCallback(
    (seat: SeatView) => setSelected((prev) => nextSelection(prev, seat)),
    [seatMap],
  );

  const invalidateSeatMap = useCallback(() => {
    if (screeningId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.seatMap(screeningId) });
    }
  }, [queryClient, screeningId]);

  const createMutation = useMutation({
    mutationFn: (seatIds: string[]) => createHold(screeningId!, seatIds),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.myHold(screeningId ?? "none"), created);
      setSelected(new Set());
      invalidateSeatMap();
    },
    onError: showError,
  });

  const confirmMutation = useMutation({
    mutationFn: (holdId: string) => confirmHold(holdId),
    onSuccess: (reservation) => {
      queryClient.setQueryData(queryKeys.myHold(screeningId ?? "none"), null);
      invalidateSeatMap();
      push("success", `Booked! Reference ${reservation.referenceCode}.`);
    },
    onError: (error) => {
      showError(error);
      void holdQuery.refetch();
      invalidateSeatMap();
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (holdId: string) => releaseHold(holdId),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.myHold(screeningId ?? "none"), null);
      invalidateSeatMap();
    },
    onError: showError,
  });

  const onExpire = useCallback(() => {
    queryClient.setQueryData(queryKeys.myHold(screeningId ?? "none"), null);
    invalidateSeatMap();
    push("info", "Your hold expired and the seats were released.");
  }, [queryClient, invalidateSeatMap, push]);

  if (screeningsQuery.isPending || seatMapQuery.isPending) {
    return <p className="text-slate-400">Loading seat map…</p>;
  }
  if (screeningsQuery.isError || !screeningId) {
    return <p className="text-red-400">Could not load screenings.</p>;
  }
  if (seatMapQuery.isError || !seatMap) {
    return <p className="text-red-400">Could not load the seat map.</p>;
  }

  const selectedIds = selectedSeatIds(seatMap, selected);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <SeatMap seatMap={seatMap} selected={selected} onSeatClick={onSeatClick} />

      <div>
        {hold ? (
          <HoldPanel
            hold={hold}
            seatLabels={labelForSeats(seatMap, hold.seatIds)}
            confirming={confirmMutation.isPending}
            releasing={releaseMutation.isPending}
            onConfirm={() => confirmMutation.mutate(hold.id)}
            onRelease={() => releaseMutation.mutate(hold.id)}
            onExpire={onExpire}
          />
        ) : (
          <aside className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="text-lg font-semibold text-slate-100">Select seats</h2>
            <p className="text-sm text-slate-300">
              {selectedIds.length === 0
                ? "Choose adjacent seats. You can pick a block in each row to sit together across rows."
                : labelForSeats(seatMap, selectedIds).join(", ")}
            </p>
            <button
              type="button"
              onClick={() => createMutation.mutate(selectedIds)}
              disabled={selectedIds.length === 0 || createMutation.isPending}
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {createMutation.isPending
                ? "Holding…"
                : `Hold ${selectedIds.length || ""} seat${selectedIds.length === 1 ? "" : "s"}`.trim()}
            </button>
          </aside>
        )}
      </div>
    </div>
  );
};
