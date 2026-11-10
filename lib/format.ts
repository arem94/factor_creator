/** ابزارهای قالب‌بندی اعداد، تاریخ و تبدیل عدد به حروف (فارسی) */

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** تبدیل ارقام لاتین به فارسی */
export function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** تبدیل ارقام فارسی/عربی به لاتین */
export function toEnDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** فقط ارقام و نقطه و منفی را نگه می‌دارد (برای ورودی‌های عددی) */
export function sanitizeNumber(input: string): string {
  const latin = toEnDigits(input).replace(/[٬,\s]/g, "");
  let out = "";
  let dot = false;
  for (const ch of latin) {
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === "." && !dot) {
      dot = true;
      out += ch;
    }
  }
  return out;
}

/** نمایش عدد با جداکننده هزارگان و ارقام فارسی */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "۰";
  const safe = Math.round(value);
  return toFaDigits(safe.toLocaleString("en-US"));
}

/** نمایش تعداد (با حداکثر دو رقم اعشار) */
export function formatQty(value: number): string {
  if (!Number.isFinite(value)) return "۰";
  const safe = Math.round(value * 100) / 100;
  return toFaDigits(
    safe.toLocaleString("en-US", { maximumFractionDigits: 2 }),
  );
}

/** مبلغ همراه با واحد پول */
export function formatMoney(value: number, currency = "تومان"): string {
  return `${formatNumber(value)} ${currency}`;
}

/** تاریخ میلادی (YYYY-MM-DD) به تاریخ شمسی خوانا */
export function formatJalali(isoDate: string): string {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return isoDate;
  }
}

/** تاریخ شمسی کوتاه برای نام فایل */
export function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

const ONES = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const TEENS = [
  "ده",
  "یازده",
  "دوازده",
  "سیزده",
  "چهارده",
  "پانزده",
  "شانزده",
  "هفده",
  "هجده",
  "نوزده",
];
const TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const HUNDREDS = [
  "",
  "یکصد",
  "دویست",
  "سیصد",
  "چهارصد",
  "پانصد",
  "ششصد",
  "هفتصد",
  "هشتصد",
  "نهصد",
];
const SCALES = ["", "هزار", "میلیون", "میلیارد", "تریلیون", "کوادریلیون"];

function threeDigitsToWords(value: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;

  if (hundreds > 0) parts.push(HUNDREDS[hundreds]);

  if (rest > 0) {
    if (rest < 10) parts.push(ONES[rest]);
    else if (rest < 20) parts.push(TEENS[rest - 10]);
    else {
      const tens = Math.floor(rest / 10);
      const ones = rest % 10;
      parts.push(ones ? `${TENS[tens]} و ${ONES[ones]}` : TENS[tens]);
    }
  }

  return parts.join(" و ");
}

/** تبدیل عدد به حروف فارسی (مثلاً ۱۲۵۰۰۰ → «یکصد و بیست و پنج هزار») */
export function numberToPersianWords(value: number): string {
  let n = Math.round(Math.abs(value));
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "صفر";

  const groups: number[] = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }

  const chunks: string[] = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    if (groups[i] === 0) continue;
    const scale = SCALES[i] ?? "";
    chunks.push(
      scale
        ? `${threeDigitsToWords(groups[i])} ${scale}`
        : threeDigitsToWords(groups[i]),
    );
  }

  return chunks.join(" و ");
}
