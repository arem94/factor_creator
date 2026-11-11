"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { InvoiceSheet } from "@/components/InvoiceSheet";
import { Stepper, type StepDefinition } from "@/components/Stepper";
import {
  DownloadIcon,
  PenIcon,
  ReceiptIcon,
  SpinnerIcon,
  BuildingIcon,
} from "@/components/icons";
import { CompanyStep } from "@/components/steps/CompanyStep";
import { ExportStep } from "@/components/steps/ExportStep";
import { FooterStep } from "@/components/steps/FooterStep";
import { ItemsStep } from "@/components/steps/ItemsStep";
import { ThemeToggle } from "@/components/ThemeToggle";
import { formatNumber } from "@/lib/format";
import {
  calcTotals,
  createEmptyData,
  createSampleData,
  type InvoiceData,
  type InvoiceItem,
} from "@/lib/invoice";
import { clearDraft, loadDraft, saveDraft } from "@/lib/storage";

const STEPS: readonly StepDefinition[] = [
  {
    key: "company",
    title: "اطلاعات اولیه",
    description: "شرکت، لوگو و خریدار",
    icon: BuildingIcon,
  },
  {
    key: "items",
    title: "اقلام فروش",
    description: "کالا، تعداد و قیمت",
    icon: ReceiptIcon,
  },
  {
    key: "footer",
    title: "متن و امضا",
    description: "یادداشت پایانی",
    icon: PenIcon,
  },
  {
    key: "export",
    title: "خروجی",
    description: "PDF و Word",
    icon: DownloadIcon,
  },
];

const EMPTY_TOTALS = {
  subtotal: 0,
  discount: 0,
  tax: 0,
  total: 0,
  itemCount: 0,
  quantityTotal: 0,
};

export default function HomePage() {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [step, setStep] = useState(0);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const draft = loadDraft();
    setData(draft ?? createEmptyData());
  }, []);

  useEffect(() => {
    if (!data) return;
    const timer = window.setTimeout(() => {
      saveDraft(data);
      setSavedAt(Date.now());
    }, 500);
    return () => window.clearTimeout(timer);
  }, [data]);

  const totals = useMemo(() => (data ? calcTotals(data) : EMPTY_TOTALS), [data]);

  const patchSeller = useCallback((patch: Partial<InvoiceData["seller"]>) => {
    setData((current) => (current ? { ...current, seller: { ...current.seller, ...patch } } : current));
  }, []);

  const patchBuyer = useCallback((patch: Partial<InvoiceData["buyer"]>) => {
    setData((current) => (current ? { ...current, buyer: { ...current.buyer, ...patch } } : current));
  }, []);

  const patchMeta = useCallback((patch: Partial<InvoiceData["meta"]>) => {
    setData((current) => (current ? { ...current, meta: { ...current.meta, ...patch } } : current));
  }, []);

  const patchFooter = useCallback((patch: Partial<InvoiceData["footer"]>) => {
    setData((current) => (current ? { ...current, footer: { ...current.footer, ...patch } } : current));
  }, []);

  const setItems = useCallback((items: InvoiceItem[]) => {
    setData((current) => (current ? { ...current, items } : current));
  }, []);

  const goto = useCallback((target: number) => {
    setStep(target);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const issue =
    step === 0 && data && !data.seller.name.trim()
      ? "برای ادامه، نام شرکت یا فروشگاه را وارد کنید."
      : step === 1 && totals.itemCount === 0
        ? "حداقل یک ردیف با شرح کالا لازم است."
        : null;

  const handleSample = () => {
    setData(createSampleData());
    setSavedAt(null);
    goto(0);
  };

  const handleReset = () => {
    if (typeof window !== "undefined" && !window.confirm("همه اطلاعات فاکتور پاک شود؟ این کار قابل بازگشت نیست.")) {
      return;
    }
    clearDraft();
    setData(createEmptyData());
    setSavedAt(null);
    goto(0);
  };

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm">
          <SpinnerIcon className="h-5 w-5 text-brand-500" />
          <span className="text-[13px] text-muted">در حال آماده‌سازی فاکتور…</span>
        </div>
      </div>
    );
  }

  const stepProps = {
    data,
    patchSeller,
    patchBuyer,
    patchMeta,
    patchFooter,
    setItems,
  };

  return (
    <>
      <div className="app-shell min-h-screen">
        <header className="sticky top-0 z-30 border-b border-line/70 bg-surface/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/25">
                <ReceiptIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="text-[15px] font-extrabold text-ink">فاکتورساز</h1>
                  <span className="hidden items-center sm:flex">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/logo.svg"
                      alt="لوگوی mrkem"
                      width={96}
                      height={48}
                      className="h-6 w-auto select-none dark:hidden"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/logo_wordmark_light.svg"
                      alt=""
                      aria-hidden="true"
                      width={96}
                      height={48}
                      className="hidden h-6 w-auto select-none dark:block"
                    />
                  </span>
                </div>
                <p className="hidden truncate text-[10.5px] text-muted sm:block">
                  فاکتور فروش با لوگو، اقلام و خروجی PDF و Word
                </p>
              </div>

            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-1.5 text-[10.5px] text-muted lg:flex">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${savedAt ? "bg-emerald-400" : "bg-line-strong"
                    }`}
                />
                {savedAt ? "ذخیره خودکار" : "پیش‌نویس محلی"}
              </span>
              <ThemeToggle />
              <button
                type="button"
                onClick={handleSample}
                className="btn btn-ghost px-3 py-2 text-[12px]"
              >
                نمونه
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-ghost px-3 py-2 text-[12px] text-rose-500 hover:border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10"
              >
                پاک کردن
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6">
          <div className="card px-4 py-3.5 sm:px-5">
            <Stepper steps={STEPS} current={step} onSelect={goto} />
          </div>

          <div className="mt-5">
            {step === 0 ? <CompanyStep {...stepProps} /> : null}
            {step === 1 ? <ItemsStep {...stepProps} /> : null}
            {step === 2 ? <FooterStep {...stepProps} /> : null}
            {step === 3 ? <ExportStep data={data} totals={totals} goto={goto} /> : null}
          </div>

          <nav className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3">
            <button
              type="button"
              onClick={() => goto(Math.max(0, step - 1))}
              disabled={step === 0}
              className="btn btn-ghost text-[12.5px]"
            >
              مرحله قبل
            </button>

            <div className="order-3 w-full text-center sm:order-2 sm:w-auto">
              <p className="text-[10.5px] leading-relaxed text-muted">
                {issue ?? "همه چیز آماده است؛ می‌توانید ادامه دهید."}
              </p>
              <p className="mt-0.5 text-[11px] font-bold tabular-nums text-ink-soft">
                {formatNumber(totals.total)} {data.meta.currency}
              </p>
            </div>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => goto(step + 1)}
                disabled={Boolean(issue)}
                className="btn btn-primary order-2 text-[12.5px] sm:order-3"
              >
                مرحله بعد
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-soft order-2 text-[12.5px] sm:order-3"
              >
                فاکتور جدید
              </button>
            )}
          </nav>

          <footer className="mt-8 text-center text-[10.5px] leading-relaxed text-muted">
            اطلاعات شما فقط در همین مرورگر ذخیره می‌شود و به سروری ارسال نمی‌گردد.
          </footer>
        </main>
      </div>

      <div className="print-only">
        {step === STEPS.length - 1 ? (
          <InvoiceSheet id="invoice-sheet-print" data={data} totals={totals} />
        ) : null}
      </div>
    </>
  );
}
