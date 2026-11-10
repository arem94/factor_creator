"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const SHEET_PX = 793.7; // 210mm در 96dpi

/**
 * پیش‌نمایش فاکتور را با مقیاس مناسب عرض ظرف نمایش می‌دهد.
 * خود برگه A4 بدون تغییر مقیاس در DOM است تا خروجی PDF دقیق باشد.
 */
export function SheetPreview({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.55);
  const [height, setHeight] = useState(620);

  useEffect(() => {
    const frame = frameRef.current;
    const sheet = sheetRef.current;
    if (!frame || !sheet) return;

    const update = () => {
      const available = frame.clientWidth;
      if (!available) return;
      const nextScale = Math.min(1, Math.max(0.2, available / SHEET_PX));
      setScale(nextScale);
      setHeight(sheet.offsetHeight * nextScale);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(sheet);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div ref={frameRef} className="w-full overflow-hidden">
      <div className="mx-auto" style={{ width: SHEET_PX * scale, height }}>
        <div
          ref={sheetRef}
          style={{
            width: SHEET_PX,
            transform: `scale(${scale})`,
            transformOrigin: "top right",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
