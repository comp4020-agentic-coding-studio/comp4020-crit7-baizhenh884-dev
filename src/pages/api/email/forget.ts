import type { APIRoute } from "astro";
import { forgetEmail, safeNext } from "../../../lib/remember";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  forgetEmail(cookies);
  return redirect(safeNext(String(form.get("next") ?? "")), 303);
};
