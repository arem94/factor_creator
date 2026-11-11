"use client";

import { useState } from "react";
import { InvoiceSheet } from "@/components/InvoiceSheet";
import { SheetPreview } from "@/components/SheetPreview";
import {
  AlertIcon,
  DownloadIcon,
  FileTextIcon,
  PrinterIcon,
  SpinnerIcon,
} from "@/components/icons";
import { safeFileName } from "@/lib/download";
import { formatNumber, toEnDigits } from "@/lib/format";
import type { InvoiceData, Totals } from "@/lib/invoice";

interface ExportStepProps {
  data: InvoiceData;
  totals: Totals;
  goto: (step: number) => void;
}

type Busy = "pdf" | "word" | null;

export function ExportStep({ data, totals, goto }: ExportStepProps) {
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const baseName = `factor-${toEnDigits(data.meta.number).trim() || "draft"}`;

  const handlePdf = async () => {
    setError(null);
    setDone(null);
    const element = document.getElementById("invoice-sheet");
    if (!element) {
      setError("پیش‌نمایش فاکتور پیدا نشد. صفحه را دوباره بارگذاری کنید.");
      return;
    }

    setBusy("pdf");
    try {
      const { exportElementToPdf } = await import("@/lib/export-pdf");
      await exportElementToPdf(element, safeFileName(baseName, "pdf"));
      setDone("فایل PDF ساخته و دانلود شد.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "ساخت فایل PDF ناموفق بود.");
    } finally {
      setBusy(null);
    }
  };

  const handleWord = async () => {
    setError(null);
    setDone(null);
    setBusy("word");
    try {
      const { exportInvoiceDocx } = await import("@/lib/export-docx");
      await exportInvoiceDocx(data, totals, safeFileName(baseName, "docx"));
      setDone("فایل Word ساخته و دانلود شد.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "ساخت فایل Word ناموفق بود.");
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = () => {
    setError(null);
    window.print();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="card order-2 p-4 sm:p-5 xl:order-1">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-bold text-ink-soft">پیش‌نمایش فاکتور (A4)</h2>
          <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[10px] font-medium text-muted">
            ۲۱۰ × ۲۹۷ میلی‌متر
          </span>
        </div>

        <div className="overflow-hidden rounded-xl bg-surface-3/70 p-2 sm:p-4">
          <SheetPreview>
            <InvoiceSheet data={data} totals={totals} />
          </SheetPreview>
        </div>
        <p className="mt-2 text-center text-[10.5px] text-muted sm:hidden">
          برای دیدن جزئیات، فایل PDF را دانلود کنید.
        </p>
      </section>

      <aside className="order-1 space-y-4 xl:order-2">
        <section className="card p-5">
          <h2 className="text-[15px] font-bold text-ink">دریافت خروجی</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            فاکتور با همین ظاهر، به صورت فایل PDF یا Word ذخیره می‌شود.
          </p>

          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              onClick={handlePdf}
              disabled={busy !== null}
              className="btn btn-primary w-full"
            >
              {busy === "pdf" ? (
                <SpinnerIcon className="h-4 w-4" />
              ) : (
                <DownloadIcon className="h-4 w-4" />
              )}
              {busy === "pdf" ? "در حال ساخت PDF…" : "دانلود PDF"}
            </button>

            <button
              type="button"
              onClick={handleWord}
              disabled={busy !== null}
              className="btn btn-ghost w-full"
            >
              {busy === "word" ? (
                <SpinnerIcon className="h-4 w-4" />
              ) : (
                <FileTextIcon className="h-4 w-4" />
              )}
              {busy === "word" ? "در حال ساخت Word…" : "دانلود Word"}
            </button>

            <button type="button" onClick={handlePrint} className="btn btn-ghost w-full">
              <PrinterIcon className="h-4 w-4" />
              چاپ فاکتور
            </button>
          </div>

          <div aria-live="polite" className="mt-3 space-y-2">
            {error ? (
              <p className="flex items-start gap-2 rounded-xl bg-rose-50 p-2.5 text-[11px] leading-relaxed text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            ) : null}
            {done ? (
              <p className="rounded-xl bg-emerald-50 p-2.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                {done}
              </p>
            ) : null}
          </div>

          <dl className="mt-4 space-y-1.5 border-t border-line/60 pt-3 text-[11px]">
            <div className="flex items-center justify-between">
              <dt className="text-muted">نام فایل</dt>
              <dd className="font-medium text-ink-soft" dir="ltr">
                {baseName}.pdf
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">مبلغ نهایی</dt>
              <dd className="font-bold tabular-nums text-ink-soft">
                {formatNumber(totals.total)} {data.meta.currency}
              </dd>
            </div>
          </dl>
        </section>

        {!data.seller.name.trim() ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-amber-700 dark:text-amber-200">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                نام فروشنده خالی است و در فاکتور «نام شرکت شما» چاپ می‌شود.
              </span>
            </p>
            <button
              type="button"
              onClick={() => goto(0)}
              className="mt-2 text-[11.5px] font-bold text-amber-800 underline dark:text-amber-100 underline-offset-4"
            >
              رفتن به مرحله اطلاعات اولیه
            </button>
          </div>
        ) : null}

        <section className="rounded-2xl border border-line bg-surface/70 p-4">
          <h3 className="text-[12px] font-bold text-ink-soft">نکته‌ها</h3>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted">
            {[
              "فایل PDF دقیقاً مثل پیش‌نمایش و آماده چاپ در A4 است.",
              "فایل Word متن قابل ویرایش دارد و لوگو داخل آن قرار می‌گیرد.",
              "در پنجره چاپ، اندازه کاغذ را A4 و حاشیه را «هیچ» بگذارید.",
              "اطلاعات فاکتور به‌صورت خودکار در همین مرورگر ذخیره می‌شود.",
            ].map((tip) => (
              <li key={tip} className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-300" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
