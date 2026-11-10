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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
