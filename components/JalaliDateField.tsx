"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { formatNumber, toFaDigits } from "@/lib/format";
import {
  JALALI_MONTHS,
  JALALI_WEEKDAYS,
  addJalaliMonths,
  formatJalaliShort,
  isoToJalali,
  jalaliMonthLength,
  jalaliMonthStartWeekday,
  jalaliToIso,
  parseJalaliInput,
  todayJalali,
  type JalaliDate,
} from "@/lib/jalali";

interface JalaliDateFieldProps {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

/**
 * انتخاب‌گر تاریخ شمسی. مقدار ذخیره‌شده میلادی (YYYY-MM-DD) است
 * اما کاربر تاریخ را به صورت شمسی می‌بیند و انتخاب می‌کند.
 */
export function JalaliDateField({
  value,
  onChange,
  placeholder = "۱۴۰۴/۰۱/۰۱",
  ariaLabel = "انتخاب تاریخ",
  disabled = false,
  allowClear = true,
}: JalaliDateFieldProps) {
  const current = isoToJalali(value);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(current ? toFaDigits(formatJalaliShort(current)) : "");
  const [view, setView] = useState<JalaliDate>(() => current ?? todayJalali());
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const jalali = isoToJalali(value);
    setText(jalali ? toFaDigits(formatJalaliShort(jalali)) : "");
    if (jalali) setView(jalali);
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const commitText = (raw: string) => {
    const parsed = parseJalaliInput(raw);
    if (parsed) {
      onChange(jalaliToIso(parsed.jy, parsed.jm, parsed.jd));
      setView(parsed);
    } else {
      setText(current ? toFaDigits(formatJalaliShort(current)) : "");
    }
  };

  const selectDay = (day: number) => {
    const next = { ...view, jd: day };
    onChange(jalaliToIso(next.jy, next.jm, next.jd));
    setOpen(false);
  };

  const monthLength = jalaliMonthLength(view.jy, view.jm);
  const startWeekday = jalaliMonthStartWeekday(view.jy, view.jm);
  const today = todayJalali();
  const years = Array.from({ length: 26 }, (_, index) => today.jy - 12 + index);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          dir="ltr"
          inputMode="numeric"
          aria-label={ariaLabel}
          disabled={disabled}
          value={text}
          placeholder={placeholder}
          onChange={(event) => setText(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={(event) => commitText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitText(text);
              setOpen(false);
            }
          }}
          className="field pl-10 text-left tabular-nums"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((previous) => !previous)}
          aria-label="تقویم شمسی"
          className="absolute inset-y-0 left-0 flex w-9 items-center justify-center text-muted transition hover:text-brand-ink"
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[272px] rounded-2xl border border-line bg-surface p-3 shadow-card">
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => setView(addJalaliMonths(view, -1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-ink"
              aria-label="ماه قبل"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1">
              <select
                value={view.jm}
                onChange={(event) => {
                  const jm = Number(event.target.value);
                  setView({ jy: view.jy, jm, jd: Math.min(view.jd, jalaliMonthLength(view.jy, jm)) });
                }}
                aria-label="ماه"
                className="rounded-lg border border-line bg-surface px-1.5 py-1 text-[12px] font-medium text-ink outline-none"
              >
                {JALALI_MONTHS.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>

              <select
                value={view.jy}
                onChange={(event) => {
                  const jy = Number(event.target.value);
                  setView({ jy, jm: view.jm, jd: Math.min(view.jd, jalaliMonthLength(jy, view.jm)) });
                }}
                aria-label="سال"
                className="rounded-lg border border-line bg-surface px-1.5 py-1 text-[12px] font-medium tabular-nums text-ink outline-none"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {formatNumber(year)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setView(addJalaliMonths(view, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-ink"
              aria-label="ماه بعد"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-0.5 text-center">
            {JALALI_WEEKDAYS.map((day) => (
              <span key={day} className="py-1 text-[10px] font-bold text-muted">
                {day}
              </span>
            ))}

            {Array.from({ length: startWeekday }).map((_, index) => (
              <span key={`empty-${index}`} />
            ))}

            {Array.from({ length: monthLength }).map((_, index) => {
              const day = index + 1;
              const isSelected =
                current?.jy === view.jy && current?.jm === view.jm && current?.jd === day;
              const isToday =
                today.jy === view.jy && today.jm === view.jm && today.jd === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`flex h-8 items-center justify-center rounded-lg text-[12px] tabular-nums transition ${
                    isSelected
                      ? "bg-brand-600 font-bold text-white"
                      : isToday
                        ? "bg-brand-soft font-bold text-brand-ink"
                        : "text-ink hover:bg-surface-2"
                  }`}
                >
                  {formatNumber(day)}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-2">
            <button
              type="button"
              onClick={() => {
                const now = todayJalali();
                onChange(jalaliToIso(now.jy, now.jm, now.jd));
                setView(now);
                setOpen(false);
              }}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-ink transition hover:bg-brand-soft"
            >
              امروز
            </button>

            {allowClear ? (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
              >
                پاک کردن
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
