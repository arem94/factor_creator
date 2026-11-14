import { getPool, sql } from "@/lib/db";
import { fail, ok, readJson, serverError, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { normalizeInvoice } from "@/lib/invoice-normalize";
import { buildInvoiceRecord, toIsoDateString } from "@/lib/invoice-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** فهرست فاکتورهای کاربر به همراه تعداد کل و جمع مبالغ */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 100);

  try {
    const pool = await getPool();

    const list = await pool
      .request()
      .input("userId", sql.Int, user.id)
      .input("search", sql.NVarChar(100), search || null)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .query<{
        Id: number;
        Number: string;
        IssueDate: Date;
        BuyerName: string | null;
        Total: number;
        ItemCount: number;
        Currency: string;
        CreatedAt: Date;
      }>(
        `SELECT Id, Number, IssueDate, BuyerName, Total, ItemCount, Currency, CreatedAt
         FROM dbo.Invoices
         WHERE UserId = @userId
           AND (@search IS NULL OR @search = ''
                OR Number LIKE '%' + @search + '%'
                OR BuyerName LIKE '%' + @search + '%')
         ORDER BY Id DESC
         OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      );

    const stats = await pool
      .request()
      .input("userId", sql.Int, user.id)
      .input("search", sql.NVarChar(100), search || null)
      .query<{ Total: number; SumAmount: number; LastDate: Date | null; NextNumber: number }>(
        `SELECT COUNT(*) AS Total,
                ISNULL(SUM(Total), 0) AS SumAmount,
                MAX(IssueDate) AS LastDate,
                ISNULL((SELECT MAX(TRY_CAST(Number AS INT)) FROM dbo.Invoices
                        WHERE UserId = @userId AND TRY_CAST(Number AS INT) IS NOT NULL), 1000) + 1 AS NextNumber
         FROM dbo.Invoices
         WHERE UserId = @userId
           AND (@search IS NULL OR @search = ''
                OR Number LIKE '%' + @search + '%'
                OR BuyerName LIKE '%' + @search + '%')`,
      );

    const summary = stats.recordset[0];

    return ok({
      items: list.recordset.map((row) => ({
        id: row.Id,
        number: row.Number,
        issueDate: toIsoDateString(row.IssueDate),
        buyerName: row.BuyerName ?? "",
        total: Number(row.Total),
        itemCount: row.ItemCount,
        currency: row.Currency,
        createdAt: row.CreatedAt,
      })),
      total: Number(summary?.Total ?? 0),
      sumAmount: Number(summary?.SumAmount ?? 0),
      lastDate: summary?.LastDate ? toIsoDateString(summary.LastDate) : null,
      nextNumber: Number(summary?.NextNumber ?? 1001),
    });
  } catch (error) {
    return serverError(error, "خواندن فهرست فاکتورها ناموفق بود.");
  }
}

/** ذخیره فاکتور جدید */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const body = await readJson<{ data?: unknown }>(request);
  if (!body?.data) return fail("داده‌ی فاکتور ارسال نشده است.");

  const data = normalizeInvoice(body.data);
  if (!data.seller.name.trim()) return fail("نام فروشنده را وارد کنید.");

  const record = buildInvoiceRecord(data);

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("userId", sql.Int, user.id)
      .input("number", sql.NVarChar(64), record.number)
      .input("issueDate", sql.Date, record.issueDate)
      .input("dueDate", sql.Date, record.dueDate)
      .input("buyerName", sql.NVarChar(200), record.buyerName)
      .input("currency", sql.NVarChar(10), record.currency)
      .input("subtotal", sql.Decimal(18, 0), record.subtotal)
      .input("discount", sql.Decimal(18, 0), record.discount)
      .input("tax", sql.Decimal(18, 0), record.tax)
      .input("total", sql.Decimal(18, 0), record.total)
      .input("itemCount", sql.Int, record.itemCount)
      .input("dataJson", sql.NVarChar(sql.MAX), record.dataJson)
      .query<{ Id: number; CreatedAt: Date }>(
        `INSERT INTO dbo.Invoices
           (UserId, Number, IssueDate, DueDate, BuyerName, Currency,
            Subtotal, Discount, Tax, Total, ItemCount, DataJson)
         OUTPUT INSERTED.Id, INSERTED.CreatedAt
         VALUES
           (@userId, @number, @issueDate, @dueDate, @buyerName, @currency,
            @subtotal, @discount, @tax, @total, @itemCount, @dataJson)`,
      );

    const row = result.recordset[0];
    return ok({ id: row.Id, createdAt: row.CreatedAt }, { status: 201 });
  } catch (error) {
    return serverError(error, "ذخیره فاکتور ناموفق بود.");
  }
}
