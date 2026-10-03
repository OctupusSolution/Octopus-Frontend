import type { Metadata } from "next";
import { currentMerchantOrigins } from "@/shared/lib/merchant-origins";
import { MenuCanvas } from "@/views/menu-canvas";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

export default function MenuPreviewPage() {
  return <MenuCanvas allowedOrigins={currentMerchantOrigins()} />;
}
