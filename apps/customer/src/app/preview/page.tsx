"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/app/providers";
import { previewEntryFromHash } from "@/shared/lib/preview-hash";

/** The backend's own preview link (`/preview#t=<token>`). The token is in the fragment, so it is
 *  read here in the browser and handed to the storefront's preview entry. */
export default function PreviewLinkPage() {
  const { t } = useI18n();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const entry = previewEntryFromHash(window.location.hash);
    if (entry) window.location.replace(entry);
    else setMissing(true);
  }, []);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-[480px] items-center justify-center px-6 text-center">
      <p className="text-[16px] font-medium text-gray-700">{missing ? t("store.preview.linkInvalid") : t("store.preview.opening")}</p>
    </main>
  );
}
