import type { AstroCookies } from "astro";

// A convenience, not authentication: it only saves retyping an email.
export const EMAIL_COOKIE = "booking_email";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function rememberEmail(cookies: AstroCookies, email: string): void {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  cookies.set(EMAIL_COOKIE, normalized, { path: "/", sameSite: "lax", maxAge: THIRTY_DAYS });
}

export function forgetEmail(cookies: AstroCookies): void {
  cookies.delete(EMAIL_COOKIE, { path: "/" });
}

export function rememberedEmail(cookies: AstroCookies): string {
  return cookies.get(EMAIL_COOKIE)?.value ?? "";
}

export function bookingsHref(email: string): string {
  return email ? `/bookings?email=${encodeURIComponent(email)}` : "/bookings";
}

// Only same-site paths, so the forget link can't be turned into an open redirect.
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/bookings";
}
