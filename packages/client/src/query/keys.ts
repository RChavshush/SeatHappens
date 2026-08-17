export const queryKeys = {
  screenings: ["screenings"] as const,
  seatMap: (screeningId: string) => ["seatMap", screeningId] as const,
  myHold: ["me", "hold"] as const,
};
