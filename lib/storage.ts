"use client";

import type { InvoiceData } from "./invoice";
import { normalizeInvoice } from "./invoice-normalize";

export { normalizeInvoice };

const STORAGE_KEY = "factor-saz:draft:v1";

export function loadDraft(): InvoiceData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeInvoice(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveDraft(data: InvoiceData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ظرفیت حافظه پر شده یا حالت ناشناس است؛ ذخیره خودکار را بی‌صدا نادیده می‌گیریم
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // نادیده بگیر
  }
}
