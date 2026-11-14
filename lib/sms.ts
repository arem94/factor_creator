/** ارسال پیامک کد تأیید — با امکان جایگزینی سرویس‌دهنده */

export type SmsProvider = "console" | "kavenegar";

export interface SmsResult {
  /** فقط در حالت توسعه پر می‌شود تا کد در رابط کاربری نمایش داده شود */
  devCode?: string;
}

export class SmsError extends Error {}

export function smsProvider(): SmsProvider {
  const provider = (process.env.SMS_PROVIDER ?? "console").toLowerCase();
  return provider === "kavenegar" ? "kavenegar" : "console";
}

/**
 * ارسال کد تأیید.
 * - console: کد در لاگ سرور چاپ می‌شود و (در حالت توسعه) به کلاینت برگردانده می‌شود.
 * - kavenegar: ارسال واقعی پیامک با سرویس کاوه‌نگار.
 */
export async function sendVerificationSms(
  mobile: string,
  code: string,
): Promise<SmsResult> {
  const provider = smsProvider();

  if (provider === "kavenegar") {
    return sendWithKavenegar(mobile, code);
  }

  console.info(`[OTP] کد تأیید ${mobile}: ${code}`);
  return { devCode: code };
}

async function sendWithKavenegar(mobile: string, code: string): Promise<SmsResult> {
  const apiKey = process.env.KAVENEGAR_API_KEY;
  const template = process.env.KAVENEGAR_TEMPLATE ?? "verify";
  const sender = process.env.KAVENEGAR_SENDER;

  if (!apiKey) {
    throw new SmsError("سرویس پیامک تنظیم نشده است. با پشتیبانی تماس بگیرید.");
  }

  const url = new URL(
    `https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/verify/lookup.json`,
  );
  url.searchParams.set("receptor", mobile);
  url.searchParams.set("token", code);
  url.searchParams.set("template", template);
  if (sender) url.searchParams.set("sender", sender);

  let response: Response;
  try {
    response = await fetch(url, { method: "GET", cache: "no-store" });
  } catch {
    throw new SmsError("ارتباط با سرویس پیامک برقرار نشد. دوباره تلاش کنید.");
  }

  if (!response.ok) {
    throw new SmsError("ارسال پیامک ناموفق بود. دوباره تلاش کنید.");
  }

  const payload = (await response.json().catch(() => null)) as
    | { return?: { status?: number; message?: string } }
    | null;

  if (payload?.return && payload.return.status && payload.return.status !== 200) {
    throw new SmsError("ارسال پیامک ناموفق بود. دوباره تلاش کنید.");
  }

  return {};
}
