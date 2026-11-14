import { getPool, sql } from "@/lib/db";
import { fail, ok, readJson, serverError } from "@/lib/api";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { isValidMobile, normalizeMobile } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ورود با نام کاربری (یا شماره همراه) و رمز عبور */
export async function POST(request: Request) {
  const body = await readJson<{ username?: string; password?: string }>(request);
  if (!body) return fail("درخواست نامعتبر است.");

  const identifier = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (!identifier) return fail("نام کاربری یا شماره همراه را وارد کنید.");
  if (!password) return fail("رمز عبور را وارد کنید.");

  const asMobile = normalizeMobile(identifier);
  const mobileLookup = isValidMobile(asMobile) ? asMobile : null;

  try {
    const pool = await getPool();
    console.log("A2", mobileLookup)

    const result = await pool
      .request()
      .input("username", sql.NVarChar(64), identifier)
      .input("mobile", sql.VarChar(11), mobileLookup)
      .query<{
        Id: number;
        FullName: string;
        Mobile: string;
        Username: string;
        PasswordHash: string;
      }>(
        `SELECT TOP 1 Id, FullName, Mobile, Username, PasswordHash
         FROM dbo.Users
         WHERE Username = @username OR (@mobile IS NOT NULL AND Mobile = @mobile)`,
      );

    const user = result.recordset[0];
    if (!user || !verifyPassword(password, user.PasswordHash)) {
      return fail("نام کاربری یا رمز عبور درست نیست.", 401);
    }

    await pool
      .request()
      .input("id", sql.Int, user.Id)
      .query("UPDATE dbo.Users SET LastLoginAt = SYSUTCDATETIME() WHERE Id = @id");

    await setSessionCookie(user.Id);

    return ok({
      user: {
        id: user.Id,
        fullName: user.FullName,
        mobile: user.Mobile,
        username: user.Username,
      },
    });
  } catch (error) {
    return serverError(error, "ورود ناموفق بود. دوباره تلاش کنید.");
  }
}
