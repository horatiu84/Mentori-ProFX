const TZ = "Europe/Bucharest";

export function getNextTuesday(baseDate = new Date(), includeToday = true) {
  const d = new Date(baseDate);
  const day = d.getDay();
  const TUE = 2;
  let add = (TUE - day + 7) % 7;
  if (add === 0 && !includeToday) add = 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + add);
  return d;
}

export function getConsecutiveTuesdays(startDate, n = 10) {
  const out = [];
  const d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

export function formatDateRO(date) {
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: TZ,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}