export const remainingMs = (expiresAt: string | null): number =>
  expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0;

export const formatCountdown = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};
