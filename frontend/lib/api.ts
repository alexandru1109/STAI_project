import type { GenerateRequest, GenerateResponse, HealthResponse } from "@/types/generation";

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown; error?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (typeof body.error === "string") return body.error;
    return JSON.stringify(body);
  } catch {
    return response.statusText || "Unknown API error";
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as T;
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return requestJson<HealthResponse>("/api/health", {
    method: "GET",
    signal,
    cache: "no-store",
  });
}

export async function loadModel(signal?: AbortSignal): Promise<{ status: string }> {
  return requestJson<{ status: string }>("/api/load", {
    method: "POST",
    signal,
  });
}

export async function generateText(
  payload: GenerateRequest,
  signal?: AbortSignal,
): Promise<GenerateResponse> {
  return requestJson<GenerateResponse>("/api/generate", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
}
