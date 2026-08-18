import type {
  LayoutBlock,
  SeatBlueprint,
} from "./types.js";

export const CINEMA_LAYOUT: LayoutBlock[] = [
  { rows: 10, seatsPerRow: 10 },
  { rows: 3, seatsPerRow: 5 },
];

export const rowLabel = (index: number): string => {
  let n = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
};

export const buildSeatLayout = (
  layout: LayoutBlock[],
): SeatBlueprint[] => {
  const seats: SeatBlueprint[] = [];
  let rowIndex = 0;
  for (const { rows, seatsPerRow } of layout) {
    for (let r = 0; r < rows; r++) {
      for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber++) {
        seats.push({ rowIndex, seatNumber });
      }
      rowIndex++;
    }
  }
  return seats;
};
