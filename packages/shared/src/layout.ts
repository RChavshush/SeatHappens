import type {
  LayoutSectionConfig,
  SeatBlueprint,
} from "./types.js";

export const CINEMA_LAYOUT: LayoutSectionConfig[] = [
  { section: "main", rows: 10, seatsPerRow: 10 },
  { section: "balcony", rows: 3, seatsPerRow: 5 },
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
  layout: LayoutSectionConfig[],
): SeatBlueprint[] => {
  const seats: SeatBlueprint[] = [];
  let rowIndex = 0;
  for (const { section, rows, seatsPerRow } of layout) {
    for (let r = 0; r < rows; r++) {
      const label = rowLabel(rowIndex);
      for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber++) {
        seats.push({ rowLabel: label, rowIndex, seatNumber, section });
      }
      rowIndex++;
    }
  }
  return seats;
};
