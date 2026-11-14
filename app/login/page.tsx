"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CheckIcon, ReceiptIcon, SpinnerIcon } from "@/components/icons";
import { formatNumber, toFaDigits } from "@/lib/format";
import {
  isValidMobile,
  normalizeMobile,
  toLatinDigits,
  validateFullName,
  validatePassword,
  validateUsername,
} from "@/lib/validation";

type Mode = "login" | "register";

interface ApiError {
  error?: string;
}

async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: T & ApiError }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & ApiError;
  return { ok: response.ok, status: response.status, data };
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute left-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-line bg-surface shadow-card md:grid-cols-[1.02fr_1fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-8 text-white md:flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <ReceiptIcon className="h-6 w-6" />
              </span>
              <div>
                <div className="text-[17px] font-extrabold">فاکتورساز</div>
                <div className="text-[11px] text-white/70">mrkem</div>
              </div>
            </div>

            <h2 className="mt-10 text-[22px] font-extrabold leading-relaxed">
              فاکتور فروش حرفه‌ای،
              <br />
              در چند دقیقه
            </h2>
            <p className="mt-3 max-w-[260px] text-[12.5px] leading-relaxed text-white/75">
              اطلاعات شرکت، اقلام و امضاها یک‌بار ذخیره می‌شوند و فاکتورهای بعدی سریع‌تر ساخته
              می‌شوند.
            </p>
          </div>

          <ul className="relative mt-10 space-y-3 text-[12px] text-white/85">
            {[
              "ذخیره خودکار اطلاعات شرکت و مشتریان",
              "تاریخچه کامل فاکتورها با تعداد و مبلغ",
              "خروجی PDF و Word آماده چاپ",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between md:hidden">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                <ReceiptIcon className="h-5 w-5" />
              </span>
              <span className="text-[15px] font-extrabold text-ink">فاکتورساز</span>
            </div>
          </div>

          <div className="mb-6 flex rounded-xl bg-surface-2 p-1">
            {[
              { key: "login" as Mode, label: "ورود" },
              { key: "register" as Mode, label: "ثبت‌نام" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMode(tab.key)}
                className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
                  mode === tab.key
                    ? "bg-raised text-brand-ink shadow-toggle"
                    : "text-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {mode === "login" ? <LoginForm onDone={() => router.replace("/")} /> : <RegisterFlow onDone={() => router.replace("/")} />}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- ورود ---------------------------------- */

function LoginForm({ onDone }: { onDone: () => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError("نام کاربری یا شماره همراه را وارد کنید.");
      return;
    }
    if (!password) {
      setError("رمز عبور را وارد کنید.");
      return;
    }

    setBusy(true);
    try {
      const { ok, data } = await postJson<{ user?: unknown }>("/api/auth/login", {
        username: identifier.trim(),
        password,
      });
      if (!ok) {
        setError(data.error ?? "ورود ناموفق بود.");
        return;
      }
      onDone();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-[18px] font-extrabold text-ink">ورود به حساب</h1>
        <p className="mt-1 text-[12px] text-muted">
          با نام کاربری یا شماره همراه خود وارد شوید.
        </p>
      </div>

      <label className="block">
        <span className="label">نام کاربری یا شماره همراه</span>
        <input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          className="field"
          placeholder="نام کاربری"
          autoComplete="username"
          dir="ltr"
        />
      </label>

      <label className="block">
        <span className="label">رمز عبور</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="field"
          placeholder="••••••••"
          autoComplete="current-password"
          dir="ltr"
        />
      </label>

      {error ? <Alert message={error} /> : null}

      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? <SpinnerIcon className="h-4 w-4" /> : null}
        {busy ? "در حال ورود…" : "ورود"}
      </button>
    </form>
  );
}

/* ------------------------------- ثبت‌نام --------------------------------- */

type RegisterStep = "details" | "verify";

function RegisterFlow({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<RegisterStep>("details");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const requestCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError(null);

    const nameError = validateFullName(fullName);
    if (nameError) {
      setError(nameError);
      return;
    }

    const normalized = normalizeMobile(mobile);
    if (!isValidMobile(normalized)) {
      setError("شماره همراه معتبر وارد کنید؛ مثلاً ۰۹۱۲۱۲۳۴۵۶۷.");
      return;
    }

    setBusy(true);
    try {
      const { ok, data } = await postJson<{ devCode?: string; expiresIn?: number }>(
        "/api/auth/register",
        { fullName: fullName.trim(), mobile: normalized },
      );

      if (!ok) {
        setError(data.error ?? "ارسال کد تأیید ناموفق بود.");
        return;
      }

      setMobile(normalized);
      setDevCode(data.devCode ?? null);
      setStep("verify");
      setSecondsLeft(60);
      setCode("");
      window.setTimeout(() => codeRef.current?.focus(), 120);
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const cleanCode = toLatinDigits(code).replace(/\D/g, "");
    if (cleanCode.length !== 5) {
      setError("کد تأیید ۵ رقمی را کامل وارد کنید.");
      return;
    }

    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setBusy(true);
    try {
      const { ok, data } = await postJson<{ user?: unknown }>("/api/auth/register/verify", {
        mobile,
        code: cleanCode,
        username: username.trim(),
        password,
      });

      if (!ok) {
        setError(data.error ?? "ثبت‌نام ناموفق بود.");
        return;
      }

      onDone();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  };

  if (step === "details") {
    return (
      <form onSubmit={requestCode} className="space-y-4" noValidate>
        <div>
          <h1 className="text-[18px] font-extrabold text-ink">ساخت حساب کاربری</h1>
          <p className="mt-1 text-[12px] text-muted">
            برای ثبت‌نام، شماره همراه شما با کد پیامکی تأیید می‌شود.
          </p>
        </div>

        <label className="block">
          <span className="label">نام و نام خانوادگی</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="field"
            placeholder="مثلاً امیر محمدی"
            autoComplete="name"
          />
        </label>

        <label className="block">
          <span className="label">شماره همراه</span>
          <input
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            className="field text-left"
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
          />
          <span className="hint block">
            کد تأیید به همین شماره پیامک می‌شود و بعداً برای ورود هم قابل استفاده است.
          </span>
        </label>

        {error ? <Alert message={error} /> : null}

        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {busy ? <SpinnerIcon className="h-4 w-4" /> : null}
          {busy ? "در حال ارسال کد…" : "ارسال کد تأیید"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-4" noValidate>
      <div>
        <h1 className="text-[18px] font-extrabold text-ink">تأیید شماره همراه</h1>
        <p className="mt-1 text-[12px] text-muted">
          کد ۵ رقمی ارسال‌شده به{" "}
          <span className="font-bold tabular-nums text-ink" dir="ltr">
            {toFaDigits(mobile)}
          </span>{" "}
          را وارد کنید.
        </p>
      </div>

      {devCode ? (
        <div className="rounded-xl border border-dashed border-brand-300 bg-brand-soft/60 p-3 text-[11.5px] leading-relaxed text-brand-strong">
          <span className="font-bold">کد آزمایشی (حالت توسعه): </span>
          <span className="font-extrabold tabular-nums" dir="ltr">
            {toFaDigits(devCode)}
          </span>
          <div className="mt-1 text-[10.5px] text-muted">
            برای ارسال واقعی پیامک، تنظیمات سرویس پیامک را در فایل <code dir="ltr">.env.local</code>{" "}
            وارد کنید.
          </div>
        </div>
      ) : null}

      <label className="block">
        <span className="label">کد تأیید</span>
        <input
          ref={codeRef}
          value={code}
          onChange={(event) => setCode(toLatinDigits(event.target.value).replace(/\D/g, "").slice(0, 5))}
          className="field text-center text-[17px] font-bold tracking-[0.5em] tabular-nums"
          placeholder="- - - - -"
          inputMode="numeric"
          autoComplete="one-time-code"
          dir="ltr"
        />
      </label>

      <div className="flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={() => {
            setStep("details");
            setError(null);
          }}
          className="font-medium text-muted underline underline-offset-4 hover:text-ink"
        >
          اصلاح شماره همراه
        </button>

        <button
          type="button"
          onClick={() => requestCode()}
          disabled={busy || secondsLeft > 0}
          className="font-semibold text-brand-ink disabled:text-muted"
        >
          {secondsLeft > 0 ? `ارسال مجدد در ${formatNumber(secondsLeft)} ثانیه` : "ارسال مجدد کد"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">نام کاربری</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="field text-left"
            placeholder="amir"
            autoComplete="username"
            dir="ltr"
          />
        </label>

        <label className="block">
          <span className="label">رمز عبور</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field text-left"
            placeholder="حداقل ۶ کاراکتر"
            autoComplete="new-password"
            dir="ltr"
          />
        </label>
      </div>

      {error ? <Alert message={error} /> : null}

      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? <SpinnerIcon className="h-4 w-4" /> : null}
        {busy ? "در حال ثبت‌نام…" : "تأیید و ساخت حساب"}
      </button>
    </form>
  );
}

function Alert({ message }: { message: string }) {
  return (
    <p className="rounded-xl bg-rose-50 p-3 text-[11.5px] leading-relaxed text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
      {message}
    </p>
  );
}
