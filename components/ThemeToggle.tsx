"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";
import { applyTheme, getCurrentTheme, type Theme } from "@/lib/theme";

/**
 * کلید تغییر تم روشن/تاریک.
 * ظاهر دکمه‌ها با CSS و کلاس `dark` روی تگ html کنترل می‌شود تا
 * هنگام بارگذاری صفحه هیچ پرش یا ناهماهنگی دیده نشود.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getCurrentTheme());
  }, []);

  const choose = (next: Theme) => {
    applyTheme(next);
    setTheme(next);
  };

  return (
    <div
      role="group"
      aria-label="تغییر تم"
      className={`flex shrink-0 items-center gap-0.5 rounded-xl border border-line bg-surface-2 p-0.5 ${className}`}
    >
      <button
        type="button"
        data-theme-option="light"
        onClick={() => choose("light")}
        aria-pressed={theme === "light"}
        aria-label="تم روشن"
        title="تم روشن"
        className="theme-option flex h-7 w-7 items-center justify-center rounded-lg"
      >
        <SunIcon className="h-4 w-4" />
      </button>

      <button
        type="button"
        data-theme-option="dark"
        onClick={() => choose("dark")}
        aria-pressed={theme === "dark"}
        aria-label="تم تاریک"
        title="تم تاریک"
        className="theme-option flex h-7 w-7 items-center justify-center rounded-lg"
      >
        <MoonIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
