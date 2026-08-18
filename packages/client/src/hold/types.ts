import type { HOLD_ACTION_KIND } from "./actionKinds";

export type HoldAction =
  | { kind: typeof HOLD_ACTION_KIND.none }
  | { kind: typeof HOLD_ACTION_KIND.create; seatIds: string[] }
  | { kind: typeof HOLD_ACTION_KIND.release; holdId: string };
