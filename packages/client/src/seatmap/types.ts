import type { SeatView } from "@cinema/shared";

export type SeatVariant = "available" | "held" | "mine" | "booked" | "selected";

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
