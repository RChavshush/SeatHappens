import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { seatsUpdatedEventSchema } from "@cinema/shared";
import type { Hold, SeatMap } from "@cinema/shared";
import { queryKeys } from "../query/keys";
import { applySeatsUpdate } from "../seatmap/patch";
import { createSocket } from "./socket";
import { SOCKET_EVENTS } from "./events";

export const useSeatUpdates = (
  screeningId: string | undefined,
  enabled: boolean,
): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!screeningId || !enabled) return;

    const socket = createSocket();

    const onConnect = () => {
      socket.emit(SOCKET_EVENTS.subscribe, { screeningId });
      queryClient.invalidateQueries({ queryKey: queryKeys.seatMap(screeningId) });
    };

    const onSeatsUpdated = (raw: unknown) => {
      const parsed = seatsUpdatedEventSchema.safeParse(raw);
      if (!parsed.success || parsed.data.screeningId !== screeningId) return;
      const myHold = queryClient.getQueryData<Hold | null>(queryKeys.myHold(screeningId));
      queryClient.setQueryData<SeatMap>(queryKeys.seatMap(screeningId), (prev) =>
        prev ? applySeatsUpdate(prev, parsed.data, myHold?.seatIds ?? []) : prev,
      );
    };

    socket.on("connect", onConnect);
    socket.on(SOCKET_EVENTS.seatsUpdated, onSeatsUpdated);
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off(SOCKET_EVENTS.seatsUpdated, onSeatsUpdated);
      socket.disconnect();
    };
  }, [screeningId, enabled, queryClient]);
};
