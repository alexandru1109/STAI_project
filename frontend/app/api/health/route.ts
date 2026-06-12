import { NextResponse } from "next/server";
import { FASTAPI_BASE_URL, apiError, parseFastApiError } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(`${FASTAPI_BASE_URL}/health`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return apiError(await parseFastApiError(response), response.status);
    }

    return NextResponse.json(await response.json(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reach FastAPI server.";
    return apiError(`Health check failed: ${message}`, 502);
  }
}
