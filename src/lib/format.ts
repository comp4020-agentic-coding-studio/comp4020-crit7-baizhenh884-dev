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
