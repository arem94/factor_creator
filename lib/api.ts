import { NextResponse } from "next/server";

export type ApiError = { error: string };

export function ok<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized(): NextResponse<ApiError> {
  return fail("برای انجام این کار باید وارد حساب خود شوید.", 401);
}

export function serverError(error: unknown, fallback = "خطای غیرمنتظره در سرور رخ داد."): NextResponse<ApiError> {
  console.error("[api]", error);
  return fail(fallback, 500);
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function text(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
