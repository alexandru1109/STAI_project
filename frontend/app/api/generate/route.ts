import { NextResponse } from "next/server";
import { FASTAPI_BASE_URL, apiError, parseFastApiError, validateGeneratePayload } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const payload = validateGeneratePayload(json);
  if (typeof payload === "string") return apiError(payload, 400);

  try {
    const response = await fetch(`${FASTAPI_BASE_URL}/generate`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(180000),
    });

    if (!response.ok) {
      return apiError(await parseFastApiError(response), response.status);
    }

    return NextResponse.json(await response.json(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reach FastAPI server.";
    return apiError(`Generation failed: ${message}`, 502);
  }
}
