import { getPool, sql } from "@/lib/db";
import { fail, ok, readJson, serverError } from "@/lib/api";
import { OTP_PURPOSE_REGISTER, OtpError, issueOtp, pruneExpiredOtps } from "@/lib/otp";
import { sendVerificationSms, SmsError } from "@/lib/sms";
import { isValidMobile, normalizeMobile, validateFullName } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** مرحله ۱ ثبت‌نام: نام و شماره همراه → ارسال کد تأیید */
export async function POST(request: Request) {
  const body = await readJson<{ fullName?: string; mobile?: string }>(request);
  if (!body) return fail("درخواست نامعتبر است.");

  const fullName = String(body.fullName ?? "").trim();
  const nameError = validateFullName(fullName);
  if (nameError) return fail(nameError);

  const mobile = normalizeMobile(body.mobile ?? "");
  if (!isValidMobile(mobile)) {
    return fail("شماره همراه معتبر وارد کنید؛ مثلاً ۰۹۱۲۱۲۳۴۵۶۷.");
  }

  try {
    const pool = await getPool();
          console.log("A3",mobile)

    const existing = await pool
      .request()
      .input("mobile", sql.VarChar(11), mobile)
      .query<{ Id: number }>("SELECT TOP 1 Id FROM dbo.Users WHERE Mobile = @mobile");

    if (existing.recordset.length > 0) {
      return fail("این شماره همراه قبلاً ثبت شده است. وارد شوید.", 409);
    }

    const { code, expiresIn } = await issueOtp(mobile, OTP_PURPOSE_REGISTER, { fullName });
    const sms = await sendVerificationSms(mobile, code);

    void pruneExpiredOtps();

    return ok({
      mobile,
      expiresIn,
      ...(sms.devCode ? { devCode: sms.devCode } : {}),
    });
  } catch (error) {
    if (error instanceof OtpError) return fail(error.message, error.status);
    if (error instanceof SmsError) return fail(error.message, 502);
    return serverError(error, "ارسال کد تأیید ناموفق بود.");
  }
}
