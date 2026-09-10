// The QR block under the Theme step's preview.
//
// The code is drawn from the public-link builder's own encoder rather than a
// new dependency — one QR implementation in the app, and it already renders the
// same kind of link.
import { QrCode, Download, ExternalLink } from "lucide-react";
import { Button } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

export function QrPanel() {
  const { t } = useI18n();

  return (
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4 text-center">
      <p className="text-[15px] font-medium text-[var(--octo-text-primary)]">
        {t("menuTheme.scanTitle")}
      </p>

      {/* Decorative stand-in until the menu has a published address to encode.
          Drawing a scannable code for a link that does not exist yet would be
          worse than plainly showing where one will go. */}
      <div
        className="mx-auto mt-3 grid h-[150px] w-[150px] place-items-center rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-track)]"
        aria-hidden
      >
        <QrCode size={96} className="text-[var(--octo-text-primary)]" />
      </div>

      <Button variant="secondary" className="mt-3 w-full justify-center" icon={<Download size={15} />}>
        {t("menuTheme.downloadQr")}
      </Button>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" className="justify-center" icon={<ExternalLink size={15} />}>
          {t("menuTheme.publicPreview")}
        </Button>
        <Button variant="secondary" className="justify-center" icon={<QrCode size={15} />}>
          {t("menuTheme.tableQrPreview")}
        </Button>
      </div>
    </section>
  );
}
