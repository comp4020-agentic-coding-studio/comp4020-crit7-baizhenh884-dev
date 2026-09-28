const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function hh(slot: number): string {
  return `${String(slot).padStart(2, "0")}:00`;
}

export function slotRange(slot: number): string {
  return `${hh(slot)}–${hh(slot + 1)}`;
}

export function shortRoomName(name: string, library: string): string {
  return name.startsWith(`${library} `) ? name.slice(library.length + 1) : name;
}

// Hand-rolled because Intl's en-AU short month for September is "Sept".
export function shortDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "Mon 28 Sep"; anything that isn't a real date is shown as typed.
export function friendlyDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== m - 1 || utc.getUTCDate() !== d) return date;
  return `${WEEKDAYS[utc.getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

export function libraryClass(library: string): string {
  return `lib-${library.toLowerCase()}`;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
