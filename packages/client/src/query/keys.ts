export const queryKeys = {
  currentUser: ["currentUser"] as const,
  screenings: ["screenings"] as const,
  seatMap: (screeningId: string) => ["seatMap", screeningId] as const,
  myHold: (screeningId: string) => ["me", "hold", screeningId] as const,
  myReservations: ["me", "reservations"] as const,
};
