"use client";

export const THEME_STORAGE_KEY = "factor-saz:theme";

export type Theme = "light" | "dark";

/** تم ذخیره‌شده توسط کاربر (یا null اگر انتخابی نکرده باشد) */
export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

/** تم فعلی صفحه بر اساس کلاس ریشه‌ی سند */
export function getCurrentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** اعمال و ذخیره‌ی تم؛ رنگ نوار مرورگر (theme-color) هم به‌روز می‌شود */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // حالت ناشناس یا حافظه پر؛ بی‌صدا رد می‌شویم
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#050a14" : "#3840ed");
}

/** حذف انتخاب دستی تا دوباره از تنظیمات سیستم پیروی شود */
export function clearStoredTheme(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // نادیده بگیر
  }
}
