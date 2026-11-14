import { ok, serverError } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await clearSessionCookie();
    return ok({ ok: true });
  } catch (error) {
    return serverError(error, "خروج از حساب ناموفق بود.");
  }
}
