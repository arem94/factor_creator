import { getPool, sql } from "@/lib/db";
import { fail, ok, readJson, serverError, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { clampText } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileRow = {
  SellerName: string | null;
  NationalId: string | null;
  Phone: string | null;
  Email: string | null;
  Website: string | null;
  Address: string | null;
  Logo: string | null;
  FooterNote: string | null;
  Terms: string | null;
  SignatureSeller: string | null;
  SignatureBuyer: string | null;
  Currency: string | null;
  TaxEnabled: boolean | null;
  TaxRate: number | null;
  UpdatedAt: Date | null;
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("userId", sql.Int, user.id)
      .query<ProfileRow>(
        `SELECT SellerName, NationalId, Phone, Email, Website, Address, Logo,
                FooterNote, Terms, SignatureSeller, SignatureBuyer, Currency,
                TaxEnabled, TaxRate, UpdatedAt
         FROM dbo.UserProfiles WHERE UserId = @userId`,
      );

    const row = result.recordset[0];
    if (!row) return ok({ profile: null });

    return ok({
      profile: {
        sellerName: row.SellerName ?? "",
        nationalId: row.NationalId ?? "",
        phone: row.Phone ?? "",
        email: row.Email ?? "",
        website: row.Website ?? "",
        address: row.Address ?? "",
        logo: row.Logo ?? null,
        footerNote: row.FooterNote ?? "",
        terms: row.Terms ?? "",
        signatureSeller: row.SignatureSeller ?? "",
        signatureBuyer: row.SignatureBuyer ?? "",
        currency: row.Currency ?? "تومان",
        taxEnabled: row.TaxEnabled ?? true,
        taxRate: row.TaxRate ?? 10,
        updatedAt: row.UpdatedAt,
      },
    });
  } catch (error) {
    return serverError(error, "خواندن اطلاعات ذخیره‌شده ناموفق بود.");
  }
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const body = await readJson<Record<string, unknown>>(request);
  if (!body) return fail("داده ارسالی معتبر نیست.");

  const sellerName = clampText(body.sellerName, 200);
  if (sellerName.length < 2) return fail("نام شرکت یا فروشگاه را وارد کنید.");

  const logoRaw = typeof body.logo === "string" ? body.logo : null;
  const logo = logoRaw && logoRaw.startsWith("data:") && logoRaw.length < 3_000_000 ? logoRaw : null;
  const currency = body.currency === "ریال" ? "ریال" : "تومان";
  const taxEnabled = typeof body.taxEnabled === "boolean" ? body.taxEnabled : true;
  const taxRate = Math.min(Math.max(Number(body.taxRate) || 0, 0), 100);

  const values = {
    nationalId: clampText(body.nationalId, 50),
    phone: clampText(body.phone, 50),
    email: clampText(body.email, 150),
    website: clampText(body.website, 150),
    address: clampText(body.address, 500),
    footerNote: clampText(body.footerNote, 1000),
    terms: clampText(body.terms, 500),
    signatureSeller: clampText(body.signatureSeller, 100),
    signatureBuyer: clampText(body.signatureBuyer, 100),
  };

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("userId", sql.Int, user.id)
      .input("sellerName", sql.NVarChar(200), sellerName)
      .input("nationalId", sql.NVarChar(50), values.nationalId)
      .input("phone", sql.NVarChar(50), values.phone)
      .input("email", sql.NVarChar(150), values.email)
      .input("website", sql.NVarChar(150), values.website)
      .input("address", sql.NVarChar(500), values.address)
      .input("logo", sql.NVarChar(sql.MAX), logo)
      .input("footerNote", sql.NVarChar(1000), values.footerNote)
      .input("terms", sql.NVarChar(500), values.terms)
      .input("signatureSeller", sql.NVarChar(100), values.signatureSeller)
      .input("signatureBuyer", sql.NVarChar(100), values.signatureBuyer)
      .input("currency", sql.NVarChar(10), currency)
      .input("taxEnabled", sql.Bit, taxEnabled)
      .input("taxRate", sql.Decimal(5, 2), taxRate)
      .query(
        `IF EXISTS (SELECT 1 FROM dbo.UserProfiles WHERE UserId = @userId)
           UPDATE dbo.UserProfiles SET
             SellerName = @sellerName, NationalId = @nationalId, Phone = @phone,
             Email = @email, Website = @website, Address = @address, Logo = @logo,
             FooterNote = @footerNote, Terms = @terms,
             SignatureSeller = @signatureSeller, SignatureBuyer = @signatureBuyer,
             Currency = @currency, TaxEnabled = @taxEnabled, TaxRate = @taxRate,
             UpdatedAt = SYSUTCDATETIME()
           WHERE UserId = @userId
         ELSE
           INSERT INTO dbo.UserProfiles
             (UserId, SellerName, NationalId, Phone, Email, Website, Address, Logo,
              FooterNote, Terms, SignatureSeller, SignatureBuyer, Currency, TaxEnabled, TaxRate)
           VALUES
             (@userId, @sellerName, @nationalId, @phone, @email, @website, @address, @logo,
              @footerNote, @terms, @signatureSeller, @signatureBuyer, @currency, @taxEnabled, @taxRate)`,
      );

    return ok({ ok: true });
  } catch (error) {
    return serverError(error, "ذخیره اطلاعات ناموفق بود.");
  }
}
