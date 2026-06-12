import { NextResponse } from "next/server";
import type { GenerateRequest } from "@/types/generation";

export const FASTAPI_BASE_URL = (process.env.FASTAPI_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseFastApiError(response: Response) {
  try {
    const body = (await response.json()) as { detail?: unknown; error?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (typeof body.error === "string") return body.error;
    return JSON.stringify(body);
  } catch {
    return response.statusText || "FastAPI request failed";
  }
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateGeneratePayload(body: unknown): GenerateRequest | string {
  if (!body || typeof body !== "object") return "Request body must be a JSON object.";

  const candidate = body as Record<string, unknown>;

  if (typeof candidate.prompt !== "string") return "prompt must be a string.";
  const prompt = candidate.prompt.trim();
  if (prompt.length < 1) return "prompt is required.";
  if (prompt.length > 2000) return "prompt must be 2000 characters or fewer.";

  if (!isNumber(candidate.max_new_tokens)) return "max_new_tokens must be a number.";
  if (!Number.isInteger(candidate.max_new_tokens) || candidate.max_new_tokens < 10 || candidate.max_new_tokens > 512) {
    return "max_new_tokens must be an integer between 10 and 512.";
  }

  if (!isNumber(candidate.temperature) || candidate.temperature < 0.1 || candidate.temperature > 2) {
    return "temperature must be between 0.1 and 2.0.";
  }

  if (!isNumber(candidate.top_k)) return "top_k must be a number.";
  if (!Number.isInteger(candidate.top_k) || candidate.top_k < 1 || candidate.top_k > 200) {
    return "top_k must be an integer between 1 and 200.";
  }

  if (!isNumber(candidate.repetition_penalty) || candidate.repetition_penalty < 1 || candidate.repetition_penalty > 2) {
    return "repetition_penalty must be between 1.0 and 2.0.";
  }

  return {
    prompt,
    max_new_tokens: candidate.max_new_tokens,
    temperature: candidate.temperature,
    top_k: candidate.top_k,
    repetition_penalty: candidate.repetition_penalty,
  };
}
