import { todayIso } from "./format";

export const CURRENCIES = ["تومان", "ریال"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const UNITS = [
  "عدد",
  "کیلوگرم",
  "گرم",
  "متر",
  "متر مربع",
  "لیتر",
  "بسته",
  "کارتن",
  "دست",
  "ساعت",
  "روز",
  "سرویس",
  "قرارداد",
] as const;

export interface InvoiceItem {
  id: string;
  title: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  /** درصد تخفیف روی ردیف (۰ تا ۱۰۰) */
  discount: number;
}

export interface Party {
  name: string;
  nationalId: string;
  phone: string;
  address: string;
  email: string;
}

export interface InvoiceMeta {
  number: string;
  date: string;
  dueDate: string;
  currency: Currency;
  taxEnabled: boolean;
  /** درصد مالیات بر ارزش افزوده */
  taxRate: number;
}

export interface InvoiceFooter {
  note: string;
  terms: string;
  signatureSeller: string;
  signatureBuyer: string;
  signaturesEnabled: boolean;
  amountInWordsEnabled: boolean;
}

export interface InvoiceData {
  seller: Party & { logo: string | null; website: string };
  buyer: Party;
  meta: InvoiceMeta;
  items: InvoiceItem[];
  footer: InvoiceFooter;
}

export interface Totals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  itemCount: number;
  quantityTotal: number;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function createItem(partial: Partial<InvoiceItem> = {}): InvoiceItem {
  return {
    id: uid(),
    title: "",
    unit: "عدد",
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    ...partial,
  };
}

export function createEmptyData(): InvoiceData {
  return {
    seller: {
      name: "",
      nationalId: "",
      phone: "",
      address: "",
      email: "",
      website: "",
      logo: null,
    },
    buyer: {
      name: "",
      nationalId: "",
      phone: "",
      address: "",
      email: "",
    },
    meta: {
      number: "1001",
      date: todayIso(),
      dueDate: "",
      currency: "تومان",
      taxEnabled: true,
      taxRate: 10,
    },
    items: [createItem()],
    footer: {
      note: "از خرید شما سپاسگزاریم. کالاهای فروخته‌شده تا ۷ روز پس از تحویل، در صورت سالم بودن قابل تعویض هستند.",
      terms: "پرداخت نقدی در زمان تحویل کالا",
      signatureSeller: "مهر و امضای فروشنده",
      signatureBuyer: "مهر و امضای خریدار",
      signaturesEnabled: true,
      amountInWordsEnabled: true,
    },
  };
}

/** داده نمونه برای آشنایی سریع با برنامه */
export function createSampleData(): InvoiceData {
  return {
    ...createEmptyData(),
    seller: {
      name: "شرکت نمونه تجارت کیم",
      nationalId: "۱۰۱۰۲۳۴۵۶۷۸",
      phone: "۰۲۱-۸۸۷۷۶۶۵۵",
      address: "تهران، خیابان ولیعصر، برج نگین، طبقه ۱۲، واحد ۳",
      email: "info@mrkem.ir",
      website: "www.mrkem.ir",
      logo: null,
    },
    buyer: {
      name: "فروشگاه زنجیره‌ای امیر",
      nationalId: "۱۴۰۰۵۶۷۸۹۰۱",
      phone: "۰۹۱۲۳۴۵۶۷۸۹",
      address: "مشهد، خیابان وکیل آباد، پلاک ۲۴",
      email: "buyer@mrkem.ir",
    },
    meta: {
      number: "۱۴۰۴-۰۱۲",
      date: todayIso(),
      dueDate: "",
      currency: "تومان",
      taxEnabled: true,
      taxRate: 10,
    },
    items: [
      createItem({
        title: "لپ‌تاپ اداری مدل X۵۰۰ — ۱۶ گیگابایت رم",
        unit: "عدد",
        quantity: 2,
        unitPrice: 48_500_000,
        discount: 5,
      }),
      createItem({
        title: "مانیتور ۲۷ اینچ Full HD",
        unit: "عدد",
        quantity: 3,
        unitPrice: 9_800_000,
        discount: 0,
      }),
      createItem({
        title: "خدمات نصب و راه‌اندازی شبکه",
        unit: "سرویس",
        quantity: 1,
        unitPrice: 12_000_000,
        discount: 10,
      }),
    ],
    footer: {
      note: "لطفاً هنگام تحویل کالا، فاکتور را بررسی و مهر نمایید. از همکاری شما سپاسگزاریم.",
      terms: "۵۰٪ پیش‌پرداخت و مابقی هنگام تحویل — مهلت تسویه ۳۰ روز",
      signatureSeller: "مهر و امضای فروشنده",
      signatureBuyer: "مهر و امضای خریدار",
      signaturesEnabled: true,
      amountInWordsEnabled: true,
    },
  };
}

/** مبلغ خالص یک ردیف بعد از تخفیف */
export function itemAmount(item: InvoiceItem): number {
  const gross = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  const discount = Math.min(Math.max(Number(item.discount) || 0, 0), 100);
  return (gross * (100 - discount)) / 100;
}

/** گرد کردن مبلغ به نزدیک‌ترین عدد صحیح */
export function roundAmount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

export function calcTotals(data: InvoiceData): Totals {
  let subtotal = 0;
  let discount = 0;
  let quantityTotal = 0;

  for (const item of data.items) {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const gross = quantity * unitPrice;
    subtotal += gross;
    discount += gross - itemAmount(item);
    quantityTotal += quantity;
  }

  const taxable = Math.max(subtotal - discount, 0);
  const rate = Math.min(Math.max(Number(data.meta.taxRate) || 0, 0), 100);
  const tax = data.meta.taxEnabled ? (taxable * rate) / 100 : 0;
  const total = taxable + tax;

  return {
    subtotal: roundAmount(subtotal),
    discount: roundAmount(discount),
    tax: roundAmount(tax),
    total: roundAmount(total),
    itemCount: data.items.filter((item) => item.title.trim() !== "").length,
    quantityTotal: Math.round(quantityTotal * 100) / 100,
  };
}
