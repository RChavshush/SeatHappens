export const queryKeys = {
  currentUser: ["currentUser"] as const,
  screenings: ["screenings"] as const,
  movies: ["movies"] as const,
  seatMap: (screeningId: string) => ["seatMap", screeningId] as const,
  myHold: (screeningId: string) => ["me", "hold", screeningId] as const,
};
