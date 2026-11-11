import type { Metadata, Viewport } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";

export const metadata: Metadata = {
  title: "فاکتورساز — ساخت فاکتور فروش با خروجی PDF و Word",
  description:
    "فاکتور فروش آنلاین بسازید: لوگو و اطلاعات شرکت، اقلام با قیمت و تعداد، متن پایانی و امضا، سپس خروجی PDF و Word بگیرید.",
};

export const viewport: Viewport = {
  themeColor: "#3840ed",
  width: "device-width",
  initialScale: 1,
};

/**
 * تم انتخاب‌شده را پیش از رنگ‌آمیزی صفحه اعمال می‌کند تا هنگام بارگذاری
 * پرش رنگ (flash) دیده نشود. اگر کاربر انتخابی نکرده باشد، از تنظیمات سیستم پیروی می‌کند.
 */
const themeScript = `(function(){try{var k="factor-saz:theme";var s=localStorage.getItem(k);var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";var m=document.querySelector('meta[name="theme-color"]');if(m&&d)m.setAttribute("content","#050a14");}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
