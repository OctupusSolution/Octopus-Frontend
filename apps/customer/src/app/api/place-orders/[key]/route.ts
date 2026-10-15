import { NextResponse, type NextRequest } from "next/server";
import { postPlaceOrder } from "@/shared/api/public-api";

// The browser's target for a place-code order: forwards the body and the Idempotency-Key to
// PublicApi server-side (no CORS, no API origin in the page) and answers with the backend's own
// status and body, so the page reads the same error codes the backend sends.
export async function POST(request: NextRequest, { params }: { params: { key: string } }) {
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) return NextResponse.json({ errorCode: "idempotency-key.missing" }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errorCode: "body.invalid" }, { status: 400 });
  }
  const res = await postPlaceOrder(params.key, body, idempotencyKey);
  if (res.status === 0) return NextResponse.json({ errorCode: "upstream.unreachable" }, { status: 502 });
  return new NextResponse(res.body || null, { status: res.status, headers: { "content-type": "application/json" } });
}
