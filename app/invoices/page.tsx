"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  AlertIcon,
  DownloadIcon,
  ListIcon,
  LogoutIcon,
  ReceiptIcon,
  SpinnerIcon,
  TrashIcon,
} from "@/components/icons";
import { formatJalali, formatNumber } from "@/lib/format";

interface InvoiceRow {
  id: number;
  number: string;
  issueDate: string;
  buyerName: string;
  total: number;
  itemCount: number;
  currency: string;
  createdAt: string;
}

interface ListPayload {
  items: InvoiceRow[];
  total: number;
  sumAmount: number;
  lastDate: string | null;
  error?: string;
}

const PAGE_SIZE = 10;

export default function InvoicesPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [sumAmount, setSumAmount] = useState(0);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(
    async (nextPage: number, query: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(nextPage * PAGE_SIZE),
        });
        if (query) params.set("q", query);

        const response = await fetch(`/api/invoices?${params.toString()}`, { cache: "no-store" });
        if (response.status === 401) {
          window.location.replace("/login");
          return;
        }

        const payload = (await response.json()) as ListPayload;
        if (!response.ok) {
          setError(payload.error ?? "خواندن فاکتورها ناموفق بود.");
          return;
        }

        setRows(payload.items);
        setTotal(payload.total);
        setSumAmount(payload.sumAmount);
        setLastDate(payload.lastDate);
      } catch {
        setError("ارتباط با سرور برقرار نشد.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(page, appliedSearch);
  }, [page, appliedSearch, load]);

  const removeInvoice = async (row: InvoiceRow) => {
    if (!window.confirm(`فاکتور ${row.number} حذف شود؟ این کار قابل بازگشت نیست.`)) return;

    setDeletingId(row.id);
    try {
      const response = await fetch(`/api/invoices/${row.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "حذف فاکتور ناموفق بود.");
        return;
      }
      const nextTotal = total - 1;
      const maxPage = Math.max(0, Math.ceil(nextTotal / PAGE_SIZE) - 1);
      const targetPage = Math.min(page, maxPage);
      setPage(targetPage);
      await load(targetPage, appliedSearch);
    } finally {
      setDeletingId(null);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isEmpty = !loading && rows.length === 0;

  const stats = useMemo(
    () => [
      { label: "تعداد فاکتورها", value: formatNumber(total), icon: ListIcon },
      { label: "مجموع مبالغ", value: `${formatNumber(sumAmount)} تومان`, icon: ReceiptIcon },
      {
        label: "آخرین فاکتور",
        value: lastDate ? formatJalali(lastDate) : "—",
        icon: DownloadIcon,
      },
    ],
    [total, sumAmount, lastDate],
  );

  return (
    <div className="app-shell min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/25">
              <ReceiptIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[15px] font-extrabold text-ink">فاکتورهای من</h1>
              <p className="hidden truncate text-[10.5px] text-muted sm:block">
                تاریخچه و سابقه فاکتورهای صادرشده
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link href="/" className="btn btn-primary px-3 py-2 text-[12px]">
              فاکتور جدید
            </Link>
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
                window.location.href = "/login";
              }}
              className="btn btn-ghost btn-icon text-muted"
              aria-label="خروج از حساب"
              title="خروج از حساب"
            >
              <LogoutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-5 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="card flex items-center gap-3 px-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                <stat.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="text-[10.5px] text-muted">{stat.label}</div>
                <div className="truncate text-[13px] font-extrabold tabular-nums text-ink">
                  {loading ? "…" : stat.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="card mt-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-4 py-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setPage(0);
                setAppliedSearch(search.trim());
              }}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جستجو بر اساس شماره فاکتور یا نام خریدار…"
                className="field h-9 py-1.5 text-[12px]"
                aria-label="جستجوی فاکتور"
              />
              <button type="submit" className="btn btn-ghost px-3 py-1.5 text-[12px]">
                جستجو
              </button>
              {appliedSearch ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setAppliedSearch("");
                    setPage(0);
                  }}
                  className="text-[11px] font-medium text-muted underline underline-offset-4 hover:text-ink"
                >
                  پاک کردن
                </button>
              ) : null}
            </form>

            <span className="text-[11px] text-muted">
              {formatNumber(total)} فاکتور
            </span>
          </div>

          {error ? (
            <div className="flex items-center gap-2 border-b border-rose-200/60 bg-rose-50 px-4 py-2.5 text-[11.5px] text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertIcon className="h-4 w-4" />
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-14 text-[12px] text-muted">
              <SpinnerIcon className="h-4 w-4" />
              در حال بارگذاری…
            </div>
          ) : isEmpty ? (
            <div className="px-4 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">
                <ReceiptIcon className="h-7 w-7" />
              </div>
              <p className="mt-3 text-[13px] font-bold text-ink">
                {appliedSearch ? "فاکتوری با این مشخصات پیدا نشد." : "هنوز فاکتوری ثبت نکرده‌اید."}
              </p>
              <p className="mt-1 text-[11.5px] text-muted">
                {appliedSearch
                  ? "عبارت جستجو را تغییر دهید."
                  : "اولین فاکتور خود را بسازید و ذخیره کنید تا اینجا نمایش داده شود."}
              </p>
              {!appliedSearch ? (
                <Link href="/" className="btn btn-primary mt-4 px-4 py-2 text-[12px]">
                  ساخت فاکتور جدید
                </Link>
              ) : null}
            </div>
          ) : (
            <>
              {/* نمای جدول در دسکتاپ */}
              <div className="hidden sm:block">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-line/70 bg-surface-2/60 text-[10.5px] text-muted">
                      <th className="px-4 py-2.5 font-medium">شماره</th>
                      <th className="px-3 py-2.5 font-medium">تاریخ</th>
                      <th className="px-3 py-2.5 font-medium">خریدار</th>
                      <th className="px-3 py-2.5 font-medium">اقلام</th>
                      <th className="px-3 py-2.5 font-medium">مبلغ</th>
                      <th className="px-4 py-2.5 font-medium">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-line/50 last:border-0 hover:bg-surface-2/50">
                        <td className="px-4 py-3 text-[12px] font-bold text-ink">{row.number}</td>
                        <td className="px-3 py-3 text-[11.5px] text-ink-soft">{formatJalali(row.issueDate)}</td>
                        <td className="px-3 py-3 text-[11.5px] text-ink-soft">{row.buyerName || "—"}</td>
                        <td className="px-3 py-3 text-[11.5px] tabular-nums text-muted">
                          {formatNumber(row.itemCount)}
                        </td>
                        <td className="px-3 py-3 text-[12px] font-bold tabular-nums text-ink">
                          {formatNumber(row.total)}{" "}
                          <span className="text-[9.5px] font-normal text-muted">{row.currency}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/?invoice=${row.id}`}
                              className="btn btn-ghost px-2.5 py-1.5 text-[11px]"
                            >
                              باز کردن
                            </Link>
                            <button
                              type="button"
                              onClick={() => void removeInvoice(row)}
                              disabled={deletingId === row.id}
                              className="btn btn-ghost btn-icon text-muted hover:text-rose-500"
                              aria-label={`حذف فاکتور ${row.number}`}
                            >
                              {deletingId === row.id ? (
                                <SpinnerIcon className="h-3.5 w-3.5" />
                              ) : (
                                <TrashIcon className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* نمای کارت در موبایل */}
              <ul className="divide-y divide-line/60 sm:hidden">
                {rows.map((row) => (
                  <li key={row.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[12.5px] font-bold text-ink">{row.number}</div>
                        <div className="mt-0.5 text-[11px] text-muted">{formatJalali(row.issueDate)}</div>
                        <div className="mt-0.5 truncate text-[11px] text-ink-soft">
                          {row.buyerName || "بدون خریدار"}
                        </div>
                      </div>
                      <div className="shrink-0 text-left">
                        <div className="text-[12px] font-extrabold tabular-nums text-ink">
                          {formatNumber(row.total)}
                        </div>
                        <div className="text-[9.5px] text-muted">{row.currency}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Link
                        href={`/?invoice=${row.id}`}
                        className="btn btn-soft px-3 py-1.5 text-[11px]"
                      >
                        باز کردن
                      </Link>
                      <button
                        type="button"
                        onClick={() => void removeInvoice(row)}
                        disabled={deletingId === row.id}
                        className="btn btn-ghost btn-icon text-muted hover:text-rose-500"
                        aria-label={`حذف فاکتور ${row.number}`}
                      >
                        {deletingId === row.id ? (
                          <SpinnerIcon className="h-3.5 w-3.5" />
                        ) : (
                          <TrashIcon className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <span className="mr-auto text-[10.5px] text-muted">
                        {formatNumber(row.itemCount)} قلم
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {pageCount > 1 ? (
            <div className="flex items-center justify-between border-t border-line/70 px-4 py-3">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                disabled={page === 0 || loading}
                className="btn btn-ghost px-3 py-1.5 text-[11.5px]"
              >
                صفحه قبل
              </button>
              <span className="text-[11px] tabular-nums text-muted">
                صفحه {formatNumber(page + 1)} از {formatNumber(pageCount)}
              </span>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                disabled={page >= pageCount - 1 || loading}
                className="btn btn-ghost px-3 py-1.5 text-[11.5px]"
              >
                صفحه بعد
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
