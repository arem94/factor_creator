import { createEmptyData, createItem, type InvoiceData, type InvoiceItem } from "./invoice";

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
    title: asString(item.title).slice(0, 300),
    unit: asString(item.unit, "عدد").slice(0, 30) || "عدد",
    quantity: Math.max(0, asNumber(item.quantity, 1)),
    unitPrice: Math.max(0, asNumber(item.unitPrice, 0)),
    discount: Math.min(Math.max(asNumber(item.discount, 0), 0), 100),
  };
}

/** داده ورودی (از کلاینت یا دیتابیس) را با ساختار فعلی هم‌تراز و پاک‌سازی می‌کند */
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
  const logo = typeof seller.logo === "string" && seller.logo.startsWith("data:") ? seller.logo : null;

  return {
    seller: {
      name: asString(seller.name).slice(0, 200),
      nationalId: asString(seller.nationalId).slice(0, 50),
      phone: asString(seller.phone).slice(0, 50),
      address: asString(seller.address).slice(0, 500),
      email: asString(seller.email).slice(0, 150),
      website: asString(seller.website).slice(0, 150),
      logo: logo && logo.length < 3_000_000 ? logo : null,
    },
    buyer: {
      name: asString(buyer.name).slice(0, 200),
      nationalId: asString(buyer.nationalId).slice(0, 50),
      phone: asString(buyer.phone).slice(0, 50),
      address: asString(buyer.address).slice(0, 500),
      email: asString(buyer.email).slice(0, 150),
    },
    meta: {
      number: asString(meta.number, base.meta.number).slice(0, 64),
      date: asString(meta.date, base.meta.date),
      dueDate: asString(meta.dueDate),
      currency,
      taxEnabled: typeof meta.taxEnabled === "boolean" ? meta.taxEnabled : true,
      taxRate: Math.min(Math.max(asNumber(meta.taxRate, 10), 0), 100),
    },
    items: (items.length ? items : [createItem()])
      .slice(0, 200)
      .map((item, index) => normalizeItem(item, index)),
    footer: {
      note: asString(footer.note, base.footer.note).slice(0, 2000),
      terms: asString(footer.terms, base.footer.terms).slice(0, 500),
      signatureSeller: asString(footer.signatureSeller, base.footer.signatureSeller).slice(0, 100),
      signatureBuyer: asString(footer.signatureBuyer, base.footer.signatureBuyer).slice(0, 100),
      signaturesEnabled:
        typeof footer.signaturesEnabled === "boolean" ? footer.signaturesEnabled : true,
      amountInWordsEnabled:
        typeof footer.amountInWordsEnabled === "boolean"
          ? footer.amountInWordsEnabled
          : true,
    },
  };
}
