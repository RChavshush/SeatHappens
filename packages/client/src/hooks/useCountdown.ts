import { useEffect, useState } from "react";
import { remainingMs } from "../lib/time";

export const useCountdown = (expiresAt: string | null): number => {
  const [remaining, setRemaining] = useState(() => remainingMs(expiresAt));

  useEffect(() => {
    setRemaining(remainingMs(expiresAt));
    if (!expiresAt) return;
    const id = setInterval(() => setRemaining(remainingMs(expiresAt)), 1_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return Math.max(0, remaining);
};
