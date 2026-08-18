import type { TOAST_TONE } from "./tones";

export type ToastTone = (typeof TOAST_TONE)[keyof typeof TOAST_TONE];

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}

export interface ToastContextValue {
  toasts: Toast[];
  push: (tone: ToastTone, message: string) => void;
  dismiss: (id: string) => void;
}
