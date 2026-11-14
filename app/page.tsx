"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { InvoiceSheet } from "@/components/InvoiceSheet";
import { Stepper, type StepDefinition } from "@/components/Stepper";
import {
  DownloadIcon,
  PenIcon,
  ReceiptIcon,
  SpinnerIcon,
  BuildingIcon,
  ListIcon,
  LogoutIcon,
  SaveIcon,
  UserIcon,
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
import { normalizeInvoice } from "@/lib/invoice-normalize";
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

interface SessionUser {
  id: number;
  fullName: string;
  mobile: string;
  username: string;
}

interface SavedProfile {
  sellerName: string;
  nationalId: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  logo: string | null;
  footerNote: string;
  terms: string;
  signatureSeller: string;
  signatureBuyer: string;
  currency: string;
  taxEnabled: boolean;
  taxRate: number;
}

function applyProfile(data: InvoiceData, profile: SavedProfile, overwrite: boolean): InvoiceData {
  const pick = (current: string, saved: string) =>
    overwrite ? saved || current : current || saved;

  return {
    ...data,
    seller: {
      ...data.seller,
      name: pick(data.seller.name, profile.sellerName),
      nationalId: pick(data.seller.nationalId, profile.nationalId),
      phone: pick(data.seller.phone, profile.phone),
      email: pick(data.seller.email, profile.email),
      website: pick(data.seller.website, profile.website),
      address: pick(data.seller.address, profile.address),
      logo: data.seller.logo ?? profile.logo ?? null,
    },
    footer: {
      ...data.footer,
      note: overwrite ? profile.footerNote || data.footer.note : data.footer.note,
      terms: overwrite ? profile.terms || data.footer.terms : data.footer.terms,
      signatureSeller: pick(data.footer.signatureSeller, profile.signatureSeller),
      signatureBuyer: pick(data.footer.signatureBuyer, profile.signatureBuyer),
    },
    meta: {
      ...data.meta,
      currency: (profile.currency === "ریال" ? "ریال" : "تومان") as InvoiceData["meta"]["currency"],
      taxEnabled: profile.taxEnabled,
      taxRate: Number.isFinite(profile.taxRate) ? profile.taxRate : data.meta.taxRate,
    },
  };
}

export default function HomePage() {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [step, setStep] = useState(0);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<SavedProfile | null>(null);
  const [stats, setStats] = useState<{ total: number; sumAmount: number } | null>(null);
  const [nextNumber, setNextNumber] = useState<number>(1001);

  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const bootstrapped = useRef(false);
  const invoiceIdRef = useRef<number | null>(null);
  invoiceIdRef.current = invoiceId;

  /* ------------------------- بارگذاری اولیه‌ی حساب ------------------------- */

  useEffect(() => {
    let alive = true;

    const bootstrap = async () => {
      try {
        const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
        if (!meResponse.ok) {
          window.location.replace("/login");
          return;
        }
        const me = (await meResponse.json()) as { user: SessionUser };
        if (!alive) return;
        setUser(me.user);

        const [profileResponse, statsResponse] = await Promise.all([
          fetch("/api/profile", { cache: "no-store" }),
          fetch("/api/invoices?limit=1", { cache: "no-store" }),
        ]);

        const profilePayload = profileResponse.ok
          ? ((await profileResponse.json()) as { profile: SavedProfile | null })
          : { profile: null };
        const statsPayload = statsResponse.ok
          ? ((await statsResponse.json()) as {
              total: number;
              sumAmount: number;
              nextNumber: number;
            })
          : null;

        if (!alive) return;
        setProfile(profilePayload.profile);
        setStats(statsPayload ? { total: statsPayload.total, sumAmount: statsPayload.sumAmount } : null);
        if (statsPayload?.nextNumber) setNextNumber(statsPayload.nextNumber);

        const invoiceParam = new URLSearchParams(window.location.search).get("invoice");
        let initial: InvoiceData | null = null;
        let loadedId: number | null = null;

        if (invoiceParam) {
          const invoiceResponse = await fetch(
            `/api/invoices/${encodeURIComponent(invoiceParam)}`,
            { cache: "no-store" },
          );
          if (invoiceResponse.ok) {
            const payload = (await invoiceResponse.json()) as { id: number; data: unknown };
            initial = normalizeInvoice(payload.data);
            loadedId = payload.id;
          }
        }

        let fromDraft = false;
        if (!initial) {
          const draft = loadDraft();
          if (draft) {
            initial = draft;
            fromDraft = true;
          }
        }
        if (!initial) initial = createEmptyData();

        if (profilePayload.profile && !initial.seller.name.trim()) {
          initial = applyProfile(initial, profilePayload.profile, true);
        }

        // شماره پیشنهادی برای فاکتور تازه
        if (!invoiceParam && !fromDraft && statsPayload?.nextNumber) {
          initial.meta.number = String(statsPayload.nextNumber);
        }

        if (!alive) return;
        setData(initial);
        setInvoiceId(loadedId);
        setDirty(false);
      } catch {
        if (alive) setData(createEmptyData());
      }
    };

    void bootstrap();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    const timer = window.setTimeout(() => {
      saveDraft(data);
      setSavedAt(Date.now());
    }, 500);
    return () => window.clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    if (!data) return;
    if (!bootstrapped.current) {
      bootstrapped.current = true;
      return;
    }
    setDirty(true);
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

  const refreshStats = useCallback(async () => {
    try {
      const response = await fetch("/api/invoices?limit=1", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        total: number;
        sumAmount: number;
        nextNumber: number;
      };
      setStats({ total: payload.total, sumAmount: payload.sumAmount });
      if (payload.nextNumber) setNextNumber(payload.nextNumber);
    } catch {
      /* بی‌اهمیت */
    }
  }, []);

  /* ----------------------------- ذخیره فاکتور ----------------------------- */

  const saveInvoice = useCallback(
    async (silent = false): Promise<boolean> => {
      if (!data) return false;

      if (!data.seller.name.trim()) {
        if (!silent) setNotice({ kind: "error", text: "نام شرکت یا فروشگاه را وارد کنید." });
        return false;
      }

      setSaving(true);
      setNotice(null);

      const currentId = invoiceIdRef.current;

      try {
        const response = await fetch(
          currentId ? `/api/invoices/${currentId}` : "/api/invoices",
          {
            method: currentId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data }),
          },
        );

        const payload = (await response.json().catch(() => ({}))) as {
          id?: number;
          error?: string;
        };

        if (!response.ok) {
          setNotice({ kind: "error", text: payload.error ?? "ذخیره فاکتور ناموفق بود." });
          return false;
        }

        if (!currentId && payload.id) {
          setInvoiceId(payload.id);
          invoiceIdRef.current = payload.id;
        }

        setDirty(false);
        setNotice({ kind: "ok", text: `فاکتور ${data.meta.number} ذخیره شد.` });
        void refreshStats();
        return true;
      } catch {
        setNotice({ kind: "error", text: "ارتباط با سرور برقرار نشد." });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [data, refreshStats],
  );

  /** بعد از اولین ذخیره، تغییرات با تأخیر خودکار ذخیره می‌شوند */
  useEffect(() => {
    if (!dirty || !invoiceId || !data) return;
    const timer = window.setTimeout(() => {
      void saveInvoice(true);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [dirty, invoiceId, data, saveInvoice]);

  const ensureSaved = useCallback(async () => {
    if (!dirty && invoiceId) return;
    await saveInvoice(true);
  }, [dirty, invoiceId, saveInvoice]);

  /* ------------------------------ پروفایل من ------------------------------ */

  const saveProfile = useCallback(async () => {
    if (!data) return;
    if (!data.seller.name.trim()) {
      setNotice({ kind: "error", text: "برای ذخیره اطلاعات، نام شرکت را وارد کنید." });
      return;
    }

    setProfileSaving(true);
    setNotice(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerName: data.seller.name,
          nationalId: data.seller.nationalId,
          phone: data.seller.phone,
          email: data.seller.email,
          website: data.seller.website,
          address: data.seller.address,
          logo: data.seller.logo,
          footerNote: data.footer.note,
          terms: data.footer.terms,
          signatureSeller: data.footer.signatureSeller,
          signatureBuyer: data.footer.signatureBuyer,
          currency: data.meta.currency,
          taxEnabled: data.meta.taxEnabled,
          taxRate: data.meta.taxRate,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setNotice({ kind: "error", text: payload.error ?? "ذخیره اطلاعات ناموفق بود." });
        return;
      }

      setProfile({
        sellerName: data.seller.name,
        nationalId: data.seller.nationalId,
        phone: data.seller.phone,
        email: data.seller.email,
        website: data.seller.website,
        address: data.seller.address,
        logo: data.seller.logo,
        footerNote: data.footer.note,
        terms: data.footer.terms,
        signatureSeller: data.footer.signatureSeller,
        signatureBuyer: data.footer.signatureBuyer,
        currency: data.meta.currency,
        taxEnabled: data.meta.taxEnabled,
        taxRate: data.meta.taxRate,
      });

      setNotice({ kind: "ok", text: "اطلاعات شرکت در حساب شما ذخیره شد." });
    } catch {
      setNotice({ kind: "error", text: "ارتباط با سرور برقرار نشد." });
    } finally {
      setProfileSaving(false);
    }
  }, [data]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/login";
  }, []);

  /* ----------------------------- عملیات فاکتور ---------------------------- */

  const startNewInvoice = useCallback(() => {
    const fresh = createEmptyData();
    fresh.meta.number = String(nextNumber);
    clearDraft();
    setInvoiceId(null);
    invoiceIdRef.current = null;
    setDirty(false);
    setNotice(null);
    setData(profile ? applyProfile(fresh, profile, true) : fresh);
    goto(0);
  }, [goto, profile, nextNumber]);

  const issue =
    step === 0 && data && !data.seller.name.trim()
      ? "برای ادامه، نام شرکت یا فروشگاه را وارد کنید."
      : step === 1 && totals.itemCount === 0
        ? "حداقل یک ردیف با شرح کالا لازم است."
        : null;

  const handleSample = () => {
    setData(createSampleData());
    setInvoiceId(null);
    invoiceIdRef.current = null;
    setDirty(false);
    setSavedAt(null);
    goto(0);
  };

  const handleReset = () => {
    if (typeof window !== "undefined" && !window.confirm("همه اطلاعات فاکتور پاک شود؟ این کار قابل بازگشت نیست.")) {
      return;
    }
    clearDraft();
    setData(createEmptyData());
    setInvoiceId(null);
    invoiceIdRef.current = null;
    setDirty(false);
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
                {savedAt ? "پیش‌نویس ذخیره شد" : "پیش‌نویس محلی"}
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
          {/* نوار حساب کاربری */}
          <section className="card mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-[13px] font-extrabold text-brand-ink">
                {(user?.fullName ?? "؟").trim().charAt(0)}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-bold text-ink">
                  {user?.fullName ?? "کاربر"}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10.5px] text-muted">
                  <span>{stats ? `${formatNumber(stats.total)} فاکتور ثبت‌شده` : "در حال بارگذاری…"}</span>
                  {stats && stats.sumAmount > 0 ? (
                    <span className="hidden sm:inline">
                      • مجموع {formatNumber(stats.sumAmount)} {data.meta.currency}
                    </span>
                  ) : null}
                  <span className="hidden sm:inline">
                    • {invoiceId ? `فاکتور ذخیره‌شده #${formatNumber(invoiceId)}` : "فاکتور جدید (ذخیره‌نشده)"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/invoices" className="btn btn-ghost px-3 py-2 text-[12px]">
                <ListIcon className="h-4 w-4" />
                فاکتورهای من
                {stats ? (
                  <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand-ink">
                    {formatNumber(stats.total)}
                  </span>
                ) : null}
              </Link>

              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={profileSaving}
                className="btn btn-ghost px-3 py-2 text-[12px]"
                title="ذخیره مشخصات شرکت برای فاکتورهای بعدی"
              >
                {profileSaving ? <SpinnerIcon className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                ذخیره اطلاعات من
              </button>

              <button
                type="button"
                onClick={() => void saveInvoice()}
                disabled={saving}
                className="btn btn-primary px-3 py-2 text-[12px]"
              >
                {saving ? <SpinnerIcon className="h-4 w-4" /> : <SaveIcon className="h-4 w-4" />}
                ذخیره فاکتور
              </button>

              <button
                type="button"
                onClick={() => void logout()}
                className="btn btn-ghost btn-icon text-muted"
                aria-label="خروج از حساب"
                title="خروج از حساب"
              >
                <LogoutIcon className="h-4 w-4" />
              </button>
            </div>
          </section>

          {notice ? (
            <div
              className={`mb-4 rounded-xl px-4 py-2.5 text-[11.5px] font-medium ${
                notice.kind === "ok"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
              }`}
              role="status"
            >
              {notice.text}
            </div>
          ) : null}

          <div className="card px-4 py-3.5 sm:px-5">
            <Stepper steps={STEPS} current={step} onSelect={goto} />
          </div>

          <div className="mt-5">
            {step === 0 ? <CompanyStep {...stepProps} /> : null}
            {step === 1 ? <ItemsStep {...stepProps} /> : null}
            {step === 2 ? <FooterStep {...stepProps} /> : null}
            {step === 3 ? (
              <ExportStep data={data} totals={totals} goto={goto} onBeforeExport={ensureSaved} />
            ) : null}
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
                onClick={startNewInvoice}
                className="btn btn-soft order-2 text-[12.5px] sm:order-3"
              >
                فاکتور جدید
              </button>
            )}
          </nav>

          <footer className="mt-8 text-center text-[10.5px] leading-relaxed text-muted">
            اطلاعات شما در حساب کاربری‌تان ذخیره می‌شود و فاکتورها در تاریخچه باقی می‌مانند.
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
