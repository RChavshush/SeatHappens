import type { ReactNode } from "react";

export type IconName =
  | "search"
  | "play"
  | "playSolid"
  | "clock"
  | "check"
  | "checkCircle"
  | "alert"
  | "info"
  | "heart"
  | "close"
  | "ticket"
  | "logout"
  | "ban"
  | "film"
  | "plus"
  | "chevronRight"
  | "arrowLeft";

export interface IconProps {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}

export type IconGlyphs = Record<IconName, ReactNode>;
