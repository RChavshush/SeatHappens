import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SeatView } from "@cinema/shared";
import { confirmHold, createHold, getMyHold, releaseHold } from "../api/holds";
import { getSeatMap, listScreenings } from "../api/screenings";
import { useAuth } from "../auth/AuthContext";
import { HoldPanel } from "../hold/HoldPanel";
import { reconcileHold } from "../hold/reconcile";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { queryKeys } from "../query/keys";
import { SeatMap } from "../seatmap/SeatMap";
import { labelForSeats, nextSelection, selectedSeatIds } from "../seatmap/selection";
import { useSeatUpdates } from "../socket/useSeatUpdates";
import { useErrorToast, useToasts } from "../toast/ToastContext";

const HOLD_DEBOUNCE_MS = 400;

export const ScreeningView = () => {
  const { token } = useAuth();
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
    enabled: Boolean(token && screeningId),
  });

  useSeatUpdates(screeningId, token);

  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const seatMap = seatMapQuery.data;
  const hold = holdQuery.data ?? null;

  const onSeatClick = useCallback(
    (seat: SeatView) => setSelected((prev) => nextSelection(prev, seat)),
    [],
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
      setSelected(new Set(created.seatIds));
      invalidateSeatMap();
    },
    onError: (error) => {
      showError(error);
      setSelected(new Set(hold?.seatIds ?? []));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (holdId: string) => confirmHold(holdId),
    onSuccess: (reservation) => {
      queryClient.setQueryData(queryKeys.myHold(screeningId ?? "none"), null);
      setSelected(new Set());
      invalidateSeatMap();
      push("success", `You're in! Seats locked, reference ${reservation.referenceCode}. 🍿`);
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
      setSelected(new Set());
      invalidateSeatMap();
    },
    onError: showError,
  });

  const onExpire = useCallback(() => {
    queryClient.setQueryData(queryKeys.myHold(screeningId ?? "none"), null);
    setSelected(new Set());
    invalidateSeatMap();
    push("info", "Hold expired — the seats slipped back into the wild. 🦌");
  }, [queryClient, invalidateSeatMap, push]);

  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !holdQuery.isSuccess) return;
    seededRef.current = true;
    if (hold) setSelected(new Set(hold.seatIds));
  }, [holdQuery.isSuccess, hold]);

  const debouncedSelected = useDebouncedValue(selected, HOLD_DEBOUNCE_MS);
  const mutating =
    createMutation.isPending || releaseMutation.isPending || confirmMutation.isPending;

  useEffect(() => {
    if (!seededRef.current || !seatMap || mutating) return;
    const target = selectedSeatIds(seatMap, debouncedSelected);
    const current = selectedSeatIds(seatMap, selected);
    const settled =
      target.length === current.length && target.every((id, i) => id === current[i]);
    if (!settled) return;
    const action = reconcileHold(target, hold);
    if (action.kind === "create") createMutation.mutate(action.seatIds);
    else if (action.kind === "release") releaseMutation.mutate(action.holdId);
  }, [debouncedSelected, selected, hold, seatMap, mutating, createMutation, releaseMutation]);

  if (screeningsQuery.isPending || seatMapQuery.isPending) {
    return <p className="text-slate-400">Rolling the seat map…</p>;
  }
  if (screeningsQuery.isError || !screeningId) {
    return <p className="text-red-400">Could not load screenings.</p>;
  }
  if (seatMapQuery.isError || !seatMap) {
    return <p className="text-red-400">Could not load the seat map.</p>;
  }

  const selectedIds = selectedSeatIds(seatMap, selected);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
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
          <aside className="space-y-3 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 shadow-lg shadow-black/20 backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-100">Pick your spot</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              {selectedIds.length === 0 ? (
                "Tap a seat — or a whole row of them. We don't judge. Sit with your people; blocks can span rows as long as they stay connected."
              ) : (
                <>
                  <span className="text-slate-400">Reserving: </span>
                  <span className="font-medium text-slate-100">
                    {labelForSeats(seatMap, selectedIds).join(", ")}
                  </span>
                </>
              )}
            </p>
            <p
              aria-live="polite"
              className="flex items-center gap-2 text-sm font-medium text-amber-300"
            >
              {selectedIds.length === 0 ? (
                <span className="text-slate-500">Your hold starts the moment you tap. ✨</span>
              ) : createMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  Grabbing those seats…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400 motion-safe:animate-ping" />
                  Holding automatically…
                </span>
              )}
            </p>
          </aside>
        )}
      </div>
    </div>
  );
};
