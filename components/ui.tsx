"use client";

import {
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { formatNumber, sanitizeNumber } from "@/lib/format";

/* ---------------------------------- فیلد ---------------------------------- */

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="label">{label}</span> : null}
      {children}
      {hint ? <span className="hint block">{hint}</span> : null}
    </label>
  );
}

export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${className}`} />;
}

export function TextArea({
  className = "",
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number }) {
  return <textarea rows={rows} {...props} className={`field resize-y leading-relaxed ${className}`} />;
}

/* -------------------------------- اعداد ---------------------------------- */

function displayValue(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "";
  return formatNumber(value);
}

export function NumericInput({
  value,
  onChange,
  allowDecimal = false,
  suffix,
  placeholder,
  hint,
  max,
  min = 0,
  className = "",
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  allowDecimal?: boolean;
  suffix?: string;
  placeholder?: string;
  hint?: ReactNode;
  max?: number;
  min?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(() => displayValue(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(displayValue(value));
  }, [value, focused]);

  const handleChange = (raw: string) => {
    let clean = sanitizeNumber(raw);
    if (!allowDecimal) clean = clean.replace(/\./g, "");
    setText(clean);

    if (clean === "" || clean === ".") {
      onChange(0);
      return;
    }

    let next = Number(clean);
    if (!Number.isFinite(next)) next = 0;
    if (typeof max === "number") next = Math.min(next, max);
    if (typeof min === "number") next = Math.max(next, min);
    onChange(next);
  };

  return (
    <div className={className}>
      <div className="relative">
        <input
          type="text"
          inputMode={allowDecimal ? "decimal" : "numeric"}
          dir="ltr"
          aria-label={ariaLabel}
          value={text}
          placeholder={placeholder ?? "۰"}
          onFocus={() => {
            setFocused(true);
            setText(value ? String(value) : "");
          }}
          onBlur={() => {
            setFocused(false);
            setText(displayValue(value));
          }}
          onChange={(event) => handleChange(event.target.value)}
          className={`field text-left tabular-nums ${suffix ? "pl-3 pr-16" : ""}`}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pl-2 pr-3 text-[11px] font-medium text-muted">
            {suffix}
          </span>
        ) : null}
      </div>
      {hint !== undefined ? <span className="hint block tabular-nums">{hint}</span> : null}
    </div>
  );
}

export function AmountInput({
  value,
  onChange,
  currency,
  className = "",
  ariaLabel,
  showHint = true,
}: {
  value: number;
  onChange: (value: number) => void;
  currency: string;
  className?: string;
  ariaLabel?: string;
  showHint?: boolean;
}) {
  return (
    <NumericInput
      value={value}
      onChange={onChange}
      suffix={currency}
      hint={showHint ? `${formatNumber(value)} ${currency}` : undefined}
      className={className}
      ariaLabel={ariaLabel}
      placeholder="۰"
    />
  );
}

/* --------------------------------- سوییچ --------------------------------- */

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-surface px-3.5 py-3 text-right transition hover:border-line-strong"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink-soft">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{description}</span>
        ) : null}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-brand-600" : "bg-line-strong"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
            checked ? "right-[22px]" : "right-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/* -------------------------------- سگمنت --------------------------------- */

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div>
      {label ? <span className="label">{label}</span> : null}
      <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition ${
              option === value
                ? "bg-raised text-brand-strong shadow-sm"
                : "text-muted hover:text-ink-soft"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- بخش کارت -------------------------------- */

export function Section({
  title,
  description,
  icon,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon ? (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
              {icon}
            </span>
          ) : null}
          <div>
            <h2 className="text-[15px] font-bold text-ink">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}


