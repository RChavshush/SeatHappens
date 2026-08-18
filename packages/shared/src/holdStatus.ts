// Mirror of the Prisma `HoldStatus` enum in
// packages/server/prisma/schema.prisma — keep the two in sync.
export const HOLD_STATUS = {
  active: "active",
  confirmed: "confirmed",
  cancelled: "cancelled",
  expired: "expired",
} as const;
