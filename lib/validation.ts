/** اعتبارسنجی و یکدست‌سازی ورودی‌های کاربر */

export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

/** ‎+989121234567 / 00989121234567 / ۰۹۱۲۱۲۳۴۵۶۷ → 09121234567 */
export function normalizeMobile(input: string): string {
  let digits = toLatinDigits(String(input ?? "")).replace(/\D/g, "");
  if (digits.startsWith("0098")) digits = digits.slice(4);
  else if (digits.startsWith("98") && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("9")) digits = `0${digits}`;
  return digits;
}

export function isValidMobile(mobile: string): boolean {
  return /^09\d{9}$/.test(mobile);
}

export function validateFullName(value: string): string | null {
  const name = value.trim();
  if (name.length < 3) return "نام و نام خانوادگی را کامل وارد کنید.";
  if (name.length > 150) return "نام و نام خانوادگی بیش از حد طولانی است.";
  if (!/^[\p{L}\p{M}\s.'-]+$/u.test(name)) return "نام فقط می‌تواند شامل حروف باشد.";
  return null;
}

export function validateUsername(value: string): string | null {
  const username = value.trim();
  if (username.length < 3) return "نام کاربری باید حداقل ۳ کاراکتر باشد.";
  if (username.length > 32) return "نام کاربری حداکثر ۳۲ کاراکتر است.";
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return "نام کاربری فقط می‌تواند شامل حروف انگلیسی، عدد، نقطه، خط تیره و زیرخط باشد.";
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < 6) return "رمز عبور باید حداقل ۶ کاراکتر باشد.";
  if (value.length > 72) return "رمز عبور حداکثر ۷۲ کاراکتر است.";
  return null;
}

/** جلوگیری از ذخیره‌ی متن‌های خیلی بلند در دیتابیس */
export function clampText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}
