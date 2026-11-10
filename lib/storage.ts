"use client";

import {
  createEmptyData,
  createItem,
  type InvoiceData,
  type InvoiceItem,
} from "./invoice";

const STORAGE_KEY = "factor-saz:draft:v1";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeItem(raw: unknown, index: number): InvoiceItem {
  const item = (raw ?? {}) as Record<string, unknown>;
  return {
    id: asString(item.id) || `item-${index}`,
    title: asString(item.title),
    unit: asString(item.unit, "عدد") || "عدد",
    quantity: asNumber(item.quantity, 1),
    unitPrice: asNumber(item.unitPrice, 0),
    discount: Math.min(Math.max(asNumber(item.discount, 0), 0), 100),
  };
}

/** داده ذخیره‌شده را با ساختار فعلی هم‌تراز می‌کند */
export function normalizeInvoice(raw: unknown): InvoiceData {
  const base = createEmptyData();
  if (!raw || typeof raw !== "object") return base;

  const data = raw as Record<string, unknown>;
  const seller = (data.seller ?? {}) as Record<string, unknown>;
  const buyer = (data.buyer ?? {}) as Record<string, unknown>;
  const meta = (data.meta ?? {}) as Record<string, unknown>;
  const footer = (data.footer ?? {}) as Record<string, unknown>;
  const items = Array.isArray(data.items) ? data.items : [];
  const currency = meta.currency === "ریال" ? "ریال" : "تومان";

  return {
    seller: {
      name: asString(seller.name),
      nationalId: asString(seller.nationalId),
      phone: asString(seller.phone),
      address: asString(seller.address),
      email: asString(seller.email),
      website: asString(seller.website),
      logo: typeof seller.logo === "string" && seller.logo.startsWith("data:") ? seller.logo : null,
    },
    buyer: {
      name: asString(buyer.name),
      nationalId: asString(buyer.nationalId),
      phone: asString(buyer.phone),
      address: asString(buyer.address),
      email: asString(buyer.email),
    },
    meta: {
      number: asString(meta.number, base.meta.number),
      date: asString(meta.date, base.meta.date),
      dueDate: asString(meta.dueDate),
      currency,
      taxEnabled: typeof meta.taxEnabled === "boolean" ? meta.taxEnabled : true,
      taxRate: Math.min(Math.max(asNumber(meta.taxRate, 10), 0), 100),
    },
    items: items.length
      ? items.map((item, index) => normalizeItem(item, index))
      : [createItem()],
    footer: {
      note: asString(footer.note, base.footer.note),
      terms: asString(footer.terms, base.footer.terms),
      signatureSeller: asString(footer.signatureSeller, base.footer.signatureSeller),
      signatureBuyer: asString(footer.signatureBuyer, base.footer.signatureBuyer),
      signaturesEnabled:
        typeof footer.signaturesEnabled === "boolean" ? footer.signaturesEnabled : true,
      amountInWordsEnabled:
        typeof footer.amountInWordsEnabled === "boolean"
          ? footer.amountInWordsEnabled
          : true,
    },
  };
}

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
