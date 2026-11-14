import { getPool, sql } from "@/lib/db";
import { fail, ok, readJson, serverError, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { normalizeInvoice } from "@/lib/invoice-normalize";
import { buildInvoiceRecord } from "@/lib/invoice-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function resolveId(context: RouteContext): Promise<number | null> {
  const { id } = await context.params;
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** دریافت یک فاکتور با تمام داده‌ها */
export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const id = await resolveId(context);
  if (!id) return fail("شناسه فاکتور معتبر نیست.");

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("userId", sql.Int, user.id)
      .query<{ DataJson: string; CreatedAt: Date; UpdatedAt: Date }>(
        `SELECT DataJson, CreatedAt, UpdatedAt
         FROM dbo.Invoices WHERE Id = @id AND UserId = @userId`,
      );

    const row = result.recordset[0];
    if (!row) return fail("فاکتور یافت نشد.", 404);

    return ok({
      id,
      data: normalizeInvoice(JSON.parse(row.DataJson)),
      createdAt: row.CreatedAt,
      updatedAt: row.UpdatedAt,
    });
  } catch (error) {
    return serverError(error, "خواندن فاکتور ناموفق بود.");
  }
}

/** به‌روزرسانی فاکتور */
export async function PUT(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const id = await resolveId(context);
  if (!id) return fail("شناسه فاکتور معتبر نیست.");

  const body = await readJson<{ data?: unknown }>(request);
  if (!body?.data) return fail("داده‌ی فاکتور ارسال نشده است.");

  const data = normalizeInvoice(body.data);
  if (!data.seller.name.trim()) return fail("نام فروشنده را وارد کنید.");

  const record = buildInvoiceRecord(data);

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
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
      .query<{ Id: number }>(
        `UPDATE dbo.Invoices SET
           Number = @number, IssueDate = @issueDate, DueDate = @dueDate,
           BuyerName = @buyerName, Currency = @currency, Subtotal = @subtotal,
           Discount = @discount, Tax = @tax, Total = @total,
           ItemCount = @itemCount, DataJson = @dataJson,
           UpdatedAt = SYSUTCDATETIME()
         OUTPUT INSERTED.Id
         WHERE Id = @id AND UserId = @userId`,
      );

    if (result.recordset.length === 0) return fail("فاکتور یافت نشد.", 404);

    return ok({ id });
  } catch (error) {
    return serverError(error, "به‌روزرسانی فاکتور ناموفق بود.");
  }
}

/** حذف فاکتور */
export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const id = await resolveId(context);
  if (!id) return fail("شناسه فاکتور معتبر نیست.");

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("userId", sql.Int, user.id)
      .query<{ Id: number }>(
        "DELETE FROM dbo.Invoices OUTPUT DELETED.Id WHERE Id = @id AND UserId = @userId",
      );

    if (result.recordset.length === 0) return fail("فاکتور یافت نشد.", 404);

    return ok({ ok: true });
  } catch (error) {
    return serverError(error, "حذف فاکتور ناموفق بود.");
  }
}
