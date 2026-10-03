import type { Metadata } from "next";
import { currentMerchantOrigins } from "@/shared/lib/merchant-origins";
import { BuilderCanvas } from "@/views/builder-canvas";

// Read per request: the allowed origins come from the server's environment.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

export default function BuilderPreviewPage() {
  return <BuilderCanvas allowedOrigins={currentMerchantOrigins()} />;
}
