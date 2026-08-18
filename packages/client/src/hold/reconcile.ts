import type { Hold } from "@cinema/shared";
import { HOLD_ACTION_KIND } from "./actionKinds";
import type { HoldAction } from "./types";

const sameSeats = (a: readonly string[], b: readonly string[]): boolean => {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
};

export const reconcileHold = (
  selectedIds: readonly string[],
  hold: Hold | null,
): HoldAction => {
  if (selectedIds.length === 0) {
    return hold
      ? { kind: HOLD_ACTION_KIND.release, holdId: hold.id }
      : { kind: HOLD_ACTION_KIND.none };
  }
  if (hold && sameSeats(selectedIds, hold.seatIds)) {
    return { kind: HOLD_ACTION_KIND.none };
  }
  return { kind: HOLD_ACTION_KIND.create, seatIds: [...selectedIds] };
};
