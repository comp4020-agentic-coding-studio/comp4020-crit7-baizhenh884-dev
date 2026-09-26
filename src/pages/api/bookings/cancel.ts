import type { APIRoute } from "astro";
import { BookingError, cancelBooking } from "../../../lib/bookings";

// A plain form POST from /bookings. Either way, redirect back to /bookings
// for the email that was submitted — with `?error=<code>` on failure — so
// the cancel attempt re-renders that email's current booking list.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const id = Number(form.get("id"));
  const email = String(form.get("email") ?? "");

  try {
    cancelBooking({ id, email });
    return redirect(`/bookings?email=${encodeURIComponent(email.trim().toLowerCase())}`, 303);
  } catch (err) {
    if (err instanceof BookingError) {
      return redirect(`/bookings?email=${encodeURIComponent(email)}&error=${err.code}`, 303);
    }
    throw err;
  }
};
