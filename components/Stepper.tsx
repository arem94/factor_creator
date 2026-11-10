"use client";

import type { ComponentType } from "react";
import { CheckIcon } from "@/components/icons";
import { formatNumber } from "@/lib/format";

export interface StepDefinition {
  key: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

export function Stepper({
  steps,
  current,
  onSelect,
}: {
  steps: readonly StepDefinition[];
  current: number;
  onSelect?: (index: number) => void;
}) {
  return (
    <div>
      <ol className="flex items-center gap-2 sm:gap-3">
        {steps.map((step, index) => {
          const active = index === current;
          const completed = index < current;
          const interactive = completed && onSelect;

          const content = (
            <>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold transition ${
                  completed
                    ? "bg-brand-600 text-white"
                    : active
                      ? "bg-brand-50 text-brand-700 ring-2 ring-brand-200"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {completed ? <CheckIcon className="h-4 w-4" /> : formatNumber(index + 1)}
              </span>
              <span className="hidden min-w-0 text-right sm:block">
                <span
                  className={`block text-[12.5px] font-semibold ${
                    active ? "text-slate-900" : completed ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  {step.title}
                </span>
                <span className="block truncate text-[10.5px] text-slate-400">
                  {step.description}
                </span>
              </span>
            </>
          );

          return (
            <li key={step.key} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              {interactive ? (
                <button
                  type="button"
                  onClick={() => onSelect?.(index)}
                  className="flex min-w-0 items-center gap-2.5 rounded-xl py-1 text-right transition hover:opacity-80"
                >
                  {content}
                </button>
              ) : (
                <div className="flex min-w-0 items-center gap-2.5 py-1" aria-current={active ? "step" : undefined}>
                  {content}
                </div>
              )}

              {index < steps.length - 1 ? (
                <span
                  className={`h-px flex-1 rounded-full ${
                    index < current ? "bg-brand-300" : "bg-slate-200"
                  }`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <p className="mt-2.5 text-[11px] text-slate-400 sm:hidden">
        مرحله {formatNumber(current + 1)} از {formatNumber(steps.length)} — {steps[current].title}
      </p>
    </div>
  );
}
