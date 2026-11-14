import crypto from "node:crypto";
import { getPool, sql } from "./db";

export const OTP_PURPOSE_REGISTER = "register";
export const OTP_TTL_SECONDS = 120;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_CODES_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

function hashCode(mobile: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${mobile}:${code}:${process.env.SESSION_SECRET ?? "mk"}`)
    .digest("hex");
}

export function generateOtpCode(): string {
  return String(crypto.randomInt(10_000, 100_000));
}

export class OtpError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * ساخت کد تأیید برای شماره همراه.
 * محدودیت: هر ۶۰ ثانیه یک کد، حداکثر ۵ کد در ساعت.
 */
export async function issueOtp(
  mobile: string,
  purpose: string,
  payload: unknown,
): Promise<{ code: string; expiresIn: number }> {
  const pool = await getPool();
  console.log("A4", mobile)

  const recent = await pool
    .request()
    .input("mobile", sql.VarChar(11), mobile)
    .query<{ SecondsAgo: number; CountLastHour: number }>(
      `SELECT
         DATEDIFF(SECOND, MAX(CreatedAt), SYSUTCDATETIME()) AS SecondsAgo,
         SUM(CASE WHEN CreatedAt > DATEADD(HOUR, -1, SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS CountLastHour
       FROM dbo.OtpCodes
       WHERE Mobile = @mobile`,
    );

  const row = recent.recordset[0];
  if (row && row.SecondsAgo !== null && row.SecondsAgo < RESEND_COOLDOWN_SECONDS) {
    const wait = RESEND_COOLDOWN_SECONDS - Number(row.SecondsAgo);
    throw new OtpError(`لطفاً ${wait} ثانیه دیگر دوباره تلاش کنید.`, 429);
  }
  if (row && Number(row.CountLastHour ?? 0) >= MAX_CODES_PER_HOUR) {
    throw new OtpError("تعداد درخواست کد تأیید زیاد بوده است. یک ساعت دیگر تلاش کنید.", 429);
  }

  const code = generateOtpCode();
  console.log("A5", mobile)

  await pool
    .request()
    .input("mobile", sql.VarChar(11), mobile)
    .input("hash", sql.Char(64), hashCode(mobile, code))
    .input("purpose", sql.VarChar(32), purpose)
    .input("payload", sql.NVarChar(sql.MAX), payload ? JSON.stringify(payload) : null)
    .input("ttl", sql.Int, OTP_TTL_SECONDS)
    .query(
      `INSERT INTO dbo.OtpCodes (Mobile, CodeHash, Purpose, Payload, ExpiresAt)
       VALUES (@mobile, @hash, @purpose, @payload, DATEADD(SECOND, @ttl, SYSUTCDATETIME()))`,
    );

  return { code, expiresIn: OTP_TTL_SECONDS };
}

export interface OtpConsumeResult {
  payload: Record<string, unknown>;
}

/** بررسی کد تأیید و مصرف آن */
export async function consumeOtp(
  mobile: string,
  purpose: string,
  code: string,
): Promise<OtpConsumeResult> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("mobile", sql.VarChar(11), mobile)
    .input("purpose", sql.VarChar(32), purpose)
    .query<{
      Id: number;
      CodeHash: string;
      Payload: string | null;
      Attempts: number;
      Expired: boolean;
    }>(
      `SELECT TOP 1 Id, CodeHash, Payload, Attempts,
              CASE WHEN ExpiresAt < SYSUTCDATETIME() THEN 1 ELSE 0 END AS Expired
       FROM dbo.OtpCodes
       WHERE Mobile = @mobile AND Purpose = @purpose AND ConsumedAt IS NULL
       ORDER BY Id DESC`,
    );

  const row = result.recordset[0];
  if (!row) throw new OtpError("کد تأیید یافت نشد. دوباره درخواست کنید.");
  if (row.Expired) throw new OtpError("کد تأیید منقضی شده است. دوباره درخواست کنید.");
  if (row.Attempts >= MAX_ATTEMPTS) throw new OtpError("تعداد تلاش‌های ناموفق زیاد است.");

  if (row.CodeHash !== hashCode(mobile, code.trim())) {
    await pool
      .request()
      .input("id", sql.BigInt, row.Id)
      .query("UPDATE dbo.OtpCodes SET Attempts = Attempts + 1 WHERE Id = @id");
    throw new OtpError("کد تأیید وارد‌شده درست نیست.");
  }

  await pool
    .request()
    .input("id", sql.BigInt, row.Id)
    .query("UPDATE dbo.OtpCodes SET ConsumedAt = SYSUTCDATETIME() WHERE Id = @id");

  let payload: Record<string, unknown> = {};
  if (row.Payload) {
    try {
      payload = JSON.parse(row.Payload) as Record<string, unknown>;
    } catch {
      payload = {};
    }
  }

  return { payload };
}

/** پاک‌سازی کدهای منقضی (اختیاری، برای جلوگیری از رشد جدول) */
export async function pruneExpiredOtps(): Promise<void> {
  try {
    const pool = await getPool();
    await pool
      .request()
      .query(
        "DELETE FROM dbo.OtpCodes WHERE CreatedAt < DATEADD(DAY, -2, SYSUTCDATETIME())",
      );
  } catch {
    // پاک‌سازی اختیاری است
  }
}
