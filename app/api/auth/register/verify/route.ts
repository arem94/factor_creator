import { getPool, sql } from "@/lib/db";
import { fail, ok, readJson, serverError } from "@/lib/api";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { OTP_PURPOSE_REGISTER, OtpError, consumeOtp } from "@/lib/otp";
import {
  isValidMobile,
  normalizeMobile,
  validateFullName,
  validatePassword,
  validateUsername,
} from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** مرحله ۲ ثبت‌نام: کد تأیید + نام کاربری و رمز عبور → ساخت حساب */
export async function POST(request: Request) {
  const body = await readJson<{
    mobile?: string;
    code?: string;
    username?: string;
    password?: string;
  }>(request);

  if (!body) return fail("درخواست نامعتبر است.");

  const mobile = normalizeMobile(body.mobile ?? "");
  if (!isValidMobile(mobile)) return fail("شماره همراه معتبر نیست.");

  const code = String(body.code ?? "").replace(/\D/g, "");
  if (code.length !== 5) return fail("کد تأیید ۵ رقمی را کامل وارد کنید.");

  const username = String(body.username ?? "").trim();
  const usernameError = validateUsername(username);
  if (usernameError) return fail(usernameError);

  const password = String(body.password ?? "");
  const passwordError = validatePassword(password);
  if (passwordError) return fail(passwordError);

  try {
    const { payload } = await consumeOtp(mobile, OTP_PURPOSE_REGISTER, code);

    const fullName = String(payload.fullName ?? "").trim();
    const nameError = validateFullName(fullName);
    if (nameError) return fail("اطلاعات ثبت‌نام کامل نیست. از ابتدا شروع کنید.");

    const pool = await getPool();

      console.log("A2",mobile)
    const duplicate = await pool
      .request()
      .input("username", sql.NVarChar(64), username)
      .input("mobile", sql.VarChar(11), mobile)
      .query<{ Username: string; Mobile: string }>(
        "SELECT TOP 1 Username, Mobile FROM dbo.Users WHERE Username = @username OR Mobile = @mobile",
      );

    if (duplicate.recordset.length > 0) {
      const row = duplicate.recordset[0];
      return fail(
        row.Mobile === mobile
          ? "این شماره همراه قبلاً ثبت شده است."
          : "این نام کاربری قبلاً انتخاب شده است.",
        409,
      );
    }

    const passwordHash = hashPassword(password);
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      console.log("A1",mobile)

      const inserted = await new sql.Request(transaction)
        .input("fullName", sql.NVarChar(150), fullName)
        .input("mobile", sql.VarChar(11), mobile)
        .input("username", sql.NVarChar(64), username)
        .input("hash", sql.NVarChar(255), passwordHash)
        .query<{ Id: number }>(
          `INSERT INTO dbo.Users (FullName, Mobile, Username, PasswordHash, MobileVerifiedAt)
           OUTPUT INSERTED.Id
           VALUES (@fullName, @mobile, @username, @hash, SYSUTCDATETIME())`,
        );

      const userId = inserted.recordset[0].Id;

      await new sql.Request(transaction)
        .input("userId", sql.Int, userId)
        .query("INSERT INTO dbo.UserProfiles (UserId) VALUES (@userId)");

      await transaction.commit();

      await setSessionCookie(userId);

      return ok(
        {
          user: { id: userId, fullName, mobile, username },
        },
        { status: 201 },
      );
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    if (error instanceof OtpError) return fail(error.message, error.status);
    return serverError(error, "ثبت‌نام ناموفق بود. دوباره تلاش کنید.");
  }
}
