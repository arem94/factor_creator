import { todayIso } from "./format";
import { calcTotals, type InvoiceData } from "./invoice";

export interface InvoiceRecord {
  number: string;
  issueDate: string;
  dueDate: string | null;
  buyerName: string;
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  itemCount: number;
  dataJson: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** فیلدهای قابل ذخیره‌ی فاکتور را از داده فرم می‌سازد و جمع‌ها را دوباره محاسبه می‌کند */
export function buildInvoiceRecord(data: InvoiceData): InvoiceRecord {
  const totals = calcTotals(data);
  const issueDate = ISO_DATE.test(data.meta.date) ? data.meta.date : todayIso();
  const dueDate = ISO_DATE.test(data.meta.dueDate) ? data.meta.dueDate : null;

  return {
    number: data.meta.number.trim().slice(0, 64) || "بدون شماره",
    issueDate,
    dueDate,
    buyerName: data.buyer.name.trim().slice(0, 200),
    currency: data.meta.currency,
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total,
    itemCount: totals.itemCount,
    dataJson: JSON.stringify(data),
  };
}

export function toIsoDateString(value: Date | string | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
