const dateTime = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const timeOnly = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

export const formatStart = (startsAt: string): string => dateTime.format(new Date(startsAt));

export const formatRange = (startsAt: string, endsAt: string): string =>
  `${dateTime.format(new Date(startsAt))} – ${timeOnly.format(new Date(endsAt))}`;
