import sql from "mssql";

/**
 * اتصال مشترک به SQL Server.
 * در حالت توسعه، Next.js ماژول‌ها را دوباره بارگذاری می‌کند؛ برای جلوگیری از
 * ساخته‌شدن چند ConnectionPool، نمونه را روی globalThis نگه می‌داریم.
 */

const config: sql.config = {
  server: process.env.DB_SERVER ?? "localhost",
  port: Number(process.env.DB_PORT ?? 1433),
  database: process.env.DB_NAME ?? "MrKem_Factors",
  user: process.env.DB_USER ?? "sa",
  password: process.env.DB_PASSWORD ?? "",
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_CERT !== "false",
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30_000,
  },
  requestTimeout: 30_000,
  connectionTimeout: 20_000,
};

type GlobalWithPool = typeof globalThis & {
  __mkPool?: Promise<sql.ConnectionPool>;
};

const globalForDb = globalThis as GlobalWithPool;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!globalForDb.__mkPool) {
    const pool = new sql.ConnectionPool(config);
    globalForDb.__mkPool = pool.connect().catch((error) => {
      globalForDb.__mkPool = undefined;
      throw error;
    });
  }
  return globalForDb.__mkPool;
}

/** اجرای یک کوئری ساده */
export async function query<T = unknown>(
  text: string,
  bind?: (request: sql.Request) => sql.Request,
): Promise<sql.IResult<T>> {
  const pool = await getPool();
  const request = bind ? bind(pool.request()) : pool.request();
  return request.query<T>(text);
}

/** اجرای یک Stored Procedure یا دستور با پارامترهای آماده */
export async function execute<T = unknown>(
  text: string,
  bind?: (request: sql.Request) => sql.Request,
): Promise<sql.IResult<T>> {
  const pool = await getPool();
  const request = bind ? bind(pool.request()) : pool.request();
  return request.query<T>(text);
}

/** پیام خطای فارسی برای خطاهای شناخته‌شده‌ی دیتابیس */
export function describeDbError(error: unknown): string {
  if (error && typeof error === "object" && "number" in error) {
    const number = Number((error as { number?: number }).number);
    if (number === 2627 || number === 2601) return "این مقدار قبلاً ثبت شده است.";
    if (number === 4060 || number === 18456) return "اتصال به پایگاه داده ناموفق بود.";
  }
  return "خطای پایگاه داده رخ داد.";
}

export type DbUser = {
  Id: number;
  FullName: string;
  Mobile: string;
  Username: string;
  CreatedAt: Date;
  MobileVerifiedAt: Date | null;
};

export { sql };
