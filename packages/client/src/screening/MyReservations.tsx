import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelReservation, getMyReservations } from "../api/me";
import { queryKeys } from "../query/keys";
import { useErrorToast, useToasts } from "../toast/ToastContext";
import { TOAST_TONE } from "../toast/tones";
import { Icon } from "../ui/Icon";

interface MyReservationsProps {
  displayName: string;
}

const formatStart = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const MyReservations = ({ displayName }: MyReservationsProps) => {
  const [open, setOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { push } = useToasts();
  const showError = useErrorToast();

  const reservationsQuery = useQuery({
    queryKey: queryKeys.myReservations,
    queryFn: getMyReservations,
    enabled: open,
  });

  const cancelMutation = useMutation({
    mutationFn: (reservationId: string) => cancelReservation(reservationId),
    onSuccess: () => {
      setConfirmingId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.myReservations });
      push(TOAST_TONE.info, "Seat set free. That row will miss you.");
    },
    onError: showError,
  });

  const close = () => {
    setOpen(false);
    setConfirmingId(null);
  };

  const reservations = reservationsQuery.data ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-neutral-300 transition hover:border-neutral-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-soft"
      >
        <Icon name="ticket" className="h-4 w-4" />
        <span className="hidden sm:inline">{displayName}</span>
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Your reservations"
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center"
            onClick={close}
          >
            <div
              className="w-full max-w-md space-y-4 rounded-2xl border border-hairline bg-panel p-5 shadow-2xl shadow-black/60"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight text-white">Your tickets</h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-soft"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>

              {reservationsQuery.isPending ? (
                <p className="text-sm text-neutral-400">Fetching your seats…</p>
              ) : reservationsQuery.isError ? (
                <p className="text-sm text-red-soft">Could not load your tickets. Seat happens.</p>
              ) : reservations.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  No seat history. Suspicious. Go book something.
                </p>
              ) : (
                <ul className="space-y-3">
                  {reservations.map((reservation) => (
                    <li
                      key={reservation.id}
                      className="rounded-xl border border-hairline bg-white/[0.03] p-3 text-sm"
                    >
                      <p className="font-bold text-white">{reservation.movieTitle}</p>
                      <p className="text-xs text-neutral-500">{formatStart(reservation.startsAt)}</p>
                      <p className="mt-1 text-neutral-300">
                        <span className="text-neutral-500">Seats: </span>
                        <span className="font-mono font-bold text-red-soft">
                          {reservation.seatLabels.join(", ")}
                        </span>
                      </p>
                      <p className="font-mono text-xs text-neutral-500">
                        Ref {reservation.referenceCode}
                      </p>

                      {confirmingId === reservation.id ? (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-neutral-300">Set this seat free?</span>
                          <button
                            type="button"
                            onClick={() => cancelMutation.mutate(reservation.id)}
                            disabled={cancelMutation.isPending}
                            className="rounded-lg bg-red px-2.5 py-1 text-xs font-bold text-white transition hover:bg-red-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-red-soft disabled:opacity-60"
                          >
                            {cancelMutation.isPending ? "Cancelling…" : "Yes, free it"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            disabled={cancelMutation.isPending}
                            className="rounded-lg border border-hairline px-2.5 py-1 text-xs font-semibold text-neutral-300 transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:opacity-60"
                          >
                            Keep it
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingId(reservation.id)}
                          className="mt-3 rounded-lg border border-hairline px-3 py-1.5 text-xs font-semibold text-neutral-300 transition hover:border-red/60 hover:text-red-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                        >
                          Abandon seat
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
