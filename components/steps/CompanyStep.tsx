"use client";

import { useRef, useState } from "react";
import { CURRENCIES, type Currency } from "@/lib/invoice";
import { fileToLogo } from "@/lib/logo";
import { BuildingIcon, ImageIcon, ReceiptIcon } from "@/components/icons";
import {
  Field,
  NumericInput,
  Section,
  SegmentedControl,
  Switch,
  TextArea,
  TextInput,
} from "@/components/ui";
import type { StepProps } from "./types";

export function CompanyStep({ data, patchSeller, patchBuyer, patchMeta }: StepProps) {
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogo = async (file: File) => {
    setLogoError(null);
    setLogoBusy(true);
    try {
      const logo = await fileToLogo(file);
      patchSeller({ logo: logo.dataUrl });
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : "بارگذاری لوگو ناموفق بود.");
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Section
        title="اطلاعات فروشنده"
        description="این اطلاعات در سرصفحه فاکتور چاپ می‌شود؛ لوگو را هم همین‌جا بارگذاری کنید."
        icon={<BuildingIcon className="h-5 w-5" />}
      >
        <div className="grid gap-5 md:grid-cols-[150px_minmax(0,1fr)]">
          <div>
            <span className="label">لوگو</span>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void handleLogo(file);
              }}
              className={`flex h-[132px] w-[132px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-2 transition ${
                dragging
                  ? "border-brand-400 bg-brand-50"
                  : "border-slate-200 bg-slate-50/70 hover:border-slate-300"
              }`}
            >
              {data.seller.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.seller.logo}
                  alt="لوگوی شرکت"
                  className="max-h-[112px] max-w-[112px] object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <ImageIcon className="h-6 w-6 text-slate-300" />
                  <span className="text-[11px] leading-tight text-slate-400">
                    {logoBusy ? "در حال بارگذاری…" : "لوگو را اینجا رها کنید"}
                  </span>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleLogo(file);
                event.target.value = "";
              }}
            />

            <div className="mt-2 flex w-[132px] gap-1.5">
              <button
                type="button"
                className="btn btn-ghost flex-1 px-2 py-1.5 text-[11px]"
                onClick={() => fileRef.current?.click()}
                disabled={logoBusy}
              >
                {data.seller.logo ? "تغییر" : "انتخاب"}
              </button>
              {data.seller.logo ? (
                <button
                  type="button"
                  className="btn btn-danger px-2 py-1.5 text-[11px]"
                  onClick={() => patchSeller({ logo: null })}
                >
                  حذف
                </button>
              ) : null}
            </div>

            <p className="mt-2 w-[132px] text-[10px] leading-relaxed text-slate-400">
              PNG یا JPG، حداکثر ۳ مگابایت
            </p>
            {logoError ? (
              <p className="mt-1 w-[140px] text-[10px] font-medium leading-relaxed text-rose-500">
                {logoError}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نام شرکت / فروشگاه" className="sm:col-span-2" hint="در بالای فاکتور با فونت درشت نمایش داده می‌شود.">
              <TextInput
                value={data.seller.name}
                onChange={(event) => patchSeller({ name: event.target.value })}
                placeholder="مثلاً شرکت نمونه تجارت پارس"
              />
            </Field>

            <Field label="شناسه ملی / کد اقتصادی">
              <TextInput
                value={data.seller.nationalId}
                onChange={(event) => patchSeller({ nationalId: event.target.value })}
                placeholder="۱۰۱۰۲۳۴۵۶۷۸"
                dir="ltr"
                className="text-left"
              />
            </Field>

            <Field label="تلفن">
              <TextInput
                value={data.seller.phone}
                onChange={(event) => patchSeller({ phone: event.target.value })}
                placeholder="۰۲۱-۸۸۷۷۶۶۵۵"
                dir="ltr"
                className="text-left"
              />
            </Field>

            <Field label="ایمیل">
              <TextInput
                value={data.seller.email}
                onChange={(event) => patchSeller({ email: event.target.value })}
                placeholder="info@example.com"
                dir="ltr"
                className="text-left"
              />
            </Field>

            <Field label="وب‌سایت">
              <TextInput
                value={data.seller.website}
                onChange={(event) => patchSeller({ website: event.target.value })}
                placeholder="www.example.com"
                dir="ltr"
                className="text-left"
              />
            </Field>

            <Field label="نشانی" className="sm:col-span-2">
              <TextArea
                rows={2}
                value={data.seller.address}
                onChange={(event) => patchSeller({ address: event.target.value })}
                placeholder="استان، شهر، خیابان، پلاک، واحد"
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section
        title="اطلاعات خریدار"
        description="مشخصات طرف مقابل فاکتور. اگر فاکتور مصرف‌کننده است، می‌توانید آن را خالی بگذارید."
        icon={<ReceiptIcon className="h-5 w-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نام خریدار / شرکت" className="sm:col-span-2">
            <TextInput
              value={data.buyer.name}
              onChange={(event) => patchBuyer({ name: event.target.value })}
              placeholder="مثلاً فروشگاه زنجیره‌ای آرمان"
            />
          </Field>

          <Field label="شناسه ملی / کد ملی">
            <TextInput
              value={data.buyer.nationalId}
              onChange={(event) => patchBuyer({ nationalId: event.target.value })}
              dir="ltr"
              className="text-left"
              placeholder="۱۴۰۰۵۶۷۸۹۰۱"
            />
          </Field>

          <Field label="تلفن">
            <TextInput
              value={data.buyer.phone}
              onChange={(event) => patchBuyer({ phone: event.target.value })}
              dir="ltr"
              className="text-left"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
            />
          </Field>

          <Field label="ایمیل">
            <TextInput
              value={data.buyer.email}
              onChange={(event) => patchBuyer({ email: event.target.value })}
              dir="ltr"
              className="text-left"
              placeholder="buyer@example.com"
            />
          </Field>

          <Field label="نشانی">
            <TextInput
              value={data.buyer.address}
              onChange={(event) => patchBuyer({ address: event.target.value })}
              placeholder="استان، شهر، خیابان، پلاک"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="شماره، تاریخ و مالیات"
        description="این مقادیر در بالای فاکتور و بخش جمع‌بندی استفاده می‌شوند."
        icon={<ReceiptIcon className="h-5 w-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="شماره فاکتور">
            <TextInput
              value={data.meta.number}
              onChange={(event) => patchMeta({ number: event.target.value })}
              placeholder="۱۴۰۴-۰۱۲"
            />
          </Field>

          <Field label="تاریخ صدور">
            <TextInput
              type="date"
              value={data.meta.date}
              onChange={(event) => patchMeta({ date: event.target.value })}
              dir="ltr"
              className="text-left"
            />
          </Field>

          <Field label="مهلت پرداخت (اختیاری)">
            <TextInput
              type="date"
              value={data.meta.dueDate}
              onChange={(event) => patchMeta({ dueDate: event.target.value })}
              dir="ltr"
              className="text-left"
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SegmentedControl<Currency>
            label="واحد پول"
            value={data.meta.currency}
            options={CURRENCIES}
            onChange={(currency) => patchMeta({ currency })}
          />

          <Field label="درصد مالیات بر ارزش افزوده">
            <NumericInput
              value={data.meta.taxRate}
              max={100}
              suffix="٪"
              onChange={(taxRate) => patchMeta({ taxRate })}
              ariaLabel="درصد مالیات"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Switch
            checked={data.meta.taxEnabled}
            onChange={(taxEnabled) => patchMeta({ taxEnabled })}
            label="مالیات بر ارزش افزوده محاسبه شود"
            description="اگر غیرفعال باشد، مالیات در فاکتور و جمع کل لحاظ نمی‌شود."
          />
        </div>
      </Section>
    </div>
  );
}
