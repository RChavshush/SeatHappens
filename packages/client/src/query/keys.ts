export const queryKeys = {
  screenings: ["screenings"] as const,
  seatMap: (screeningId: string) => ["seatMap", screeningId] as const,
  myHold: (screeningId: string) => ["me", "hold", screeningId] as const,
};
