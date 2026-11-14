import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getPool, sql } from "./db";

export const SESSION_COOKIE = "mk_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // ۳۰ روز

export interface SessionUser {
  id: number;
  fullName: string;
  mobile: string;
  username: string;
}

function sessionSecret(): string {
  return process.env.SESSION_SECRET || "mrkem-dev-secret-change-me";
}

/* ------------------------------- رمز عبور -------------------------------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = String(stored ?? "").split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const [, salt, hash] = parts;
  if (!salt || !hash) return false;

  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;

  return crypto.timingSafeEqual(candidate, expected);
}

/* --------------------------------- نشست ---------------------------------- */

export function createSessionToken(userId: number): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): { userId: number } | null {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 3) return null;

  const [userIdRaw, expiresRaw, signature] = parts;
  const userId = Number(userIdRaw);
  const expiresAt = Number(expiresRaw);
  if (!Number.isInteger(userId) || !Number.isFinite(expiresAt)) return null;
  if (expiresAt < Date.now()) return null;

  const expected = crypto
    .createHmac("sha256", sessionSecret())
    .update(`${userIdRaw}.${expiresRaw}`)
    .digest("base64url");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  return { userId };
}

export async function setSessionCookie(userId: number): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** کاربر جاری بر اساس کوکی نشست */
export async function getSessionUser(): Promise<SessionUser | null> {
  let token: string | undefined;
  try {
    const store = await cookies();
    token = store.get(SESSION_COOKIE)?.value;
  } catch {
    return null;
  }

  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, payload.userId)
      .query<{ Id: number; FullName: string; Mobile: string; Username: string }>(
        "SELECT Id, FullName, Mobile, Username FROM dbo.Users WHERE Id = @id",
      );

    const row = result.recordset[0];
    if (!row) return null;

    return {
      id: row.Id,
      fullName: row.FullName,
      mobile: row.Mobile,
      username: row.Username,
    };
  } catch {
    return null;
  }
}
