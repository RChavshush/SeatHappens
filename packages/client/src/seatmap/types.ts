import type { SeatView } from "@cinema/shared";
import type { SEAT_VARIANT } from "./variants";

export type SeatVariant = (typeof SEAT_VARIANT)[keyof typeof SEAT_VARIANT];

export interface SeatEvaluation {
  disabled: boolean;
  reason?: string;
}

export interface SeatProps {
  seat: SeatView;
  variant: SeatVariant;
  selected: boolean;
  evaluation: SeatEvaluation;
  onClick: (seat: SeatView) => void;
}
