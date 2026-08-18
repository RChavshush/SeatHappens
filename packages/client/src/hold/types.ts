export type HoldAction =
  | { kind: "none" }
  | { kind: "create"; seatIds: string[] }
  | { kind: "release"; holdId: string };
