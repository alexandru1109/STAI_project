import { NextResponse } from "next/server";
import { FASTAPI_BASE_URL, apiError, parseFastApiError } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const response = await fetch(`${FASTAPI_BASE_URL}/load`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      return apiError(await parseFastApiError(response), response.status);
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reach FastAPI server.";
    return apiError(`Model load failed: ${message}`, 502);
  }
}
