import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Screening, SeatView } from "@cinema/shared";
import { confirmHold, createHold, getMyHold, releaseHold } from "../api/holds";
import { getSeatMap, listScreenings } from "../api/screenings";
import { formatStart } from "../movie/format";
import { Poster } from "../movie/Poster";
import { useAuth } from "../auth/useAuth";
import { HOLD_ACTION_KIND } from "../hold/actionKinds";
import { HoldPanel } from "../hold/HoldPanel";
import { reconcileHold } from "../hold/reconcile";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { queryKeys } from "../query/keys";
import { SeatMap } from "../seatmap/SeatMap";
import { labelForSeats, nextSelection, selectedSeatIds } from "../seatmap/selection";
import { useSeatUpdates } from "../socket/useSeatUpdates";
import { useErrorToast, useToasts } from "../toast/ToastContext";
import { TOAST_TONE } from "../toast/tones";
import { Icon } from "../ui/Icon";
import { cx } from "../lib/cx";

const HOLD_DEBOUNCE_MS = 150;

const availabilityLabel = (open: number): string => {
  if (open === 0) return "Well… seat happened";
  if (open <= 6) return `Almost sold out · ${open} seats left`;
  return "Now showing";
};

const Hero = ({
  screening,
  open,
  onPick,
}: {
  screening: Screening;
  open: number | null;
  onPick: () => void;
}) => (
  <section className="relative overflow-hidden rounded-2xl border border-hairline">
    <div aria-hidden="true" className="absolute inset-0">
      {screening.movieImageUrl && (
        <img
          src={screening.movieImageUrl}
          alt=""
          className="h-full w-full scale-110 object-cover opacity-30 blur-xl"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-red/15 blur-3xl" />
    </div>

    <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-10 sm:p-9">
      <div className="min-w-0 flex-1">
        <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-red">
          <span className="h-1.5 w-1.5 rounded-full bg-red shadow-[0_0_9px_rgba(229,9,20,0.9)]" />
          {open === null ? "Now showing" : availabilityLabel(open)}
        </p>
        <h1 className="text-4xl font-bold leading-[0.98] tracking-tight text-white sm:text-5xl">
          {screening.movieTitle}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-300">
          <span>{formatStart(screening.startsAt)}</span>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-neutral-600" />
          <span>{screening.durationMinutes} min</span>
        </div>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-400">
          Pick your seat before someone slower does. Seat happens — best make it yours.
        </p>
        <button
          type="button"
          onClick={onPick}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-red px-6 py-3 text-sm font-bold text-white transition hover:bg-red-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-red-soft focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          Choose your seat
          <Icon name="chevronRight" className="h-[18px] w-[18px]" />
        </button>
      </div>

      <Poster
        src={screening.movieImageUrl}
        alt={screening.movieTitle}
        className="hidden aspect-[2/3] w-40 shadow-2xl shadow-black/60 sm:block"
      />
    </div>
  </section>
);

const ScreeningRail = ({
  screenings,
  activeId,
  onSelect,
}: {
  screenings: Screening[];
  activeId: string;
  onSelect: (id: string) => void;
}) => (
  <section>
    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-tight text-white">
      Now showing
      <span className="font-sans text-xs font-normal text-neutral-500">· things are getting seated</span>
    </h2>
    <div className="rail-scroll -mx-1 flex snap-x gap-3 overflow-x-auto p-1.5 pb-2.5">
      {screenings.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          aria-current={s.id === activeId ? "true" : undefined}
          className={cx(
            "group w-32 shrink-0 snap-start text-left focus:outline-none",
          )}
        >
          <div
            className={cx(
              "relative overflow-hidden rounded-xl transition",
              s.id === activeId
                ? "ring-2 ring-red ring-offset-2 ring-offset-ink"
                : "ring-1 ring-hairline group-hover:ring-neutral-600",
            )}
          >
            <Poster src={s.movieImageUrl} alt={s.movieTitle} className="aspect-[2/3] w-full" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-6">
              <p className="truncate text-[11px] font-bold text-white">{s.movieTitle}</p>
            </div>
          </div>
          <p className="mt-1.5 font-mono text-[10px] text-neutral-500">{formatStart(s.startsAt)}</p>
        </button>
      ))}
    </div>
  </section>
);

export const ScreeningView = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { push } = useToasts();
  const showError = useErrorToast();
  const seatRef = useRef<HTMLDivElement>(null);

  const screeningsQuery = useQuery({
    queryKey: queryKeys.screenings,
    queryFn: listScreenings,
  });
  const screenings = screeningsQuery.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const screeningId = selectedId ?? screenings[0]?.id;
  const screening = screenings.find((s) => s.id === screeningId);

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
      push(
        TOAST_TONE.success,
        `Your butt has been successfully assigned. Ref ${reservation.referenceCode}.`,
      );
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
    push(TOAST_TONE.info, "You snoozed. You lost your seat.");
  }, [queryClient, invalidateSeatMap, push]);

  const seededRef = useRef(false);
  useEffect(() => {
    seededRef.current = false;
    setSelected(new Set());
  }, [screeningId]);

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
    if (action.kind === HOLD_ACTION_KIND.create) createMutation.mutate(action.seatIds);
    else if (action.kind === HOLD_ACTION_KIND.release) releaseMutation.mutate(action.holdId);
  }, [debouncedSelected, selected, hold, seatMap, mutating, createMutation, releaseMutation]);

  const scrollToSeats = useCallback(() => {
    seatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (screeningsQuery.isPending || seatMapQuery.isPending) {
    return (
      <p className="flex items-center gap-2 text-neutral-400">
        <span className="h-2 w-2 animate-[pulse-dot_1.1s_ease-in-out_infinite] rounded-full bg-red" />
        Finding somewhere to put you…
      </p>
    );
  }
  if (screeningsQuery.isError || !screeningId || !screening) {
    return <p className="text-red-soft">Could not load screenings. Seat happens — try a refresh.</p>;
  }
  if (seatMapQuery.isError || !seatMap) {
    return <p className="text-red-soft">Could not load the seat map. Seat happens — try again.</p>;
  }

  const selectedIds = selectedSeatIds(seatMap, selected);
  const openSeats = seatMap.rows.reduce(
    (total, row) => total + row.seats.filter((seat) => seat.status === "available").length,
    0,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Hero screening={screening} open={openSeats} onPick={scrollToSeats} />

      {screenings.length > 1 && (
        <ScreeningRail screenings={screenings} activeId={screeningId} onSelect={setSelectedId} />
      )}

      <section
        ref={seatRef}
        className="grid scroll-mt-4 grid-cols-1 gap-6 rounded-2xl border border-hairline bg-panel p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <SeatMap seatMap={seatMap} selected={selected} onSeatClick={onSeatClick} />

        <div className="lg:border-l lg:border-hairline lg:pl-6">
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
            <aside className="space-y-3">
              <h2 className="text-lg font-bold tracking-tight text-white">Choose your seat</h2>
              <p className="text-sm leading-relaxed text-neutral-400">
                Tap a seat — or a whole connected block. Sit with your people; blocks can span rows
                as long as they stay together.
              </p>
              {selectedIds.length > 0 && (
                <div className="rounded-xl border border-hairline bg-white/[0.03] p-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                    Reserving
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-red-soft">
                    {labelForSeats(seatMap, selectedIds).join(", ")}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">Excellent butt placement.</p>
                </div>
              )}
              <p
                aria-live="polite"
                className="flex items-center gap-2 text-sm font-medium text-neutral-400"
              >
                {selectedIds.length === 0 ? (
                  <span className="text-neutral-500">Your hold starts the moment you tap.</span>
                ) : createMutation.isPending ? (
                  <span className="inline-flex items-center gap-2 text-red-soft">
                    <span className="h-2 w-2 animate-[pulse-dot_1.1s_ease-in-out_infinite] rounded-full bg-red" />
                    Grabbing those seats…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 text-red-soft">
                    <span className="h-2 w-2 rounded-full bg-red motion-safe:animate-ping" />
                    Holding automatically…
                  </span>
                )}
              </p>
            </aside>
          )}
        </div>
      </section>
    </div>
  );
};
