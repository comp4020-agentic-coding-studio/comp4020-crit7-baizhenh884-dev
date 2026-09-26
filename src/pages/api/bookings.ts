import type { APIRoute } from "astro";
import { BookingError, createBooking, listBookingsForEmail } from "../../lib/bookings";

// GET ?email= — that email's bookings as JSON. This is how a client finds a
// booking's id to cancel it, without any server-rendered page needing to
// exist yet: /bookings (the human-facing page) reads from the same
// listBookingsForEmail, but this route is the HTTP-introspectable form of it.
export const GET: APIRoute = ({ url }) => {
  const email = url.searchParams.get("email") ?? "";
  const list = email ? listBookingsForEmail(email) : [];
  return new Response(JSON.stringify(list), {
    headers: { "content-type": "application/json" },
  });
};

// The write half: a plain HTML form (from /book) POSTs here. Success
// redirects to the grid; a BookingError redirects back to the same booking
// form with `?error=<code>`, so the no-JS page can show a specific message.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const roomId = Number(form.get("roomId"));
  const date = String(form.get("date") ?? "");
  const slot = Number(form.get("slot"));
  const name = String(form.get("name") ?? "");
  const email = String(form.get("email") ?? "");

  try {
    createBooking({ roomId, date, slot, name, email });
    return redirect("/", 303);
  } catch (err) {
    if (err instanceof BookingError) {
      return redirect(`/book?room=${roomId}&date=${date}&slot=${slot}&error=${err.code}`, 303);
    }
    throw err;
  }
};
