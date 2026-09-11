// Step-specific help behind the footer's Help button, which used to do
// nothing on every step. Three short tips for the step the merchant is on,
// plus a way to reach a person.
import { Lightbulb, Mail } from "lucide-react";
import { Button, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

const TIP_COUNT = 3;
const SUPPORT_EMAIL = "support@octopus.app";

export function HelpModal({
  open,
  onClose,
  stepId,
  titleKey,
}: {
  open: boolean;
  onClose: () => void;
  stepId: string;
  titleKey: string;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("publicLink.help.title").replace("{step}", t(titleKey))}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#0D6EFD] hover:underline"
          >
            <Mail size={14} />
            {t("publicLink.help.contact")}
          </a>
          <Button onClick={onClose}>{t("publicLink.help.gotIt")}</Button>
        </div>
      }
    >
      <ul className="flex flex-col gap-3">
        {Array.from({ length: TIP_COUNT }, (_, index) => (
          <li key={index} className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#0D6EFD]/10 text-[#0D6EFD]">
              <Lightbulb size={13} />
            </span>
            <span className="text-[12.5px] leading-relaxed text-[var(--octo-text-primary)]">
              {t(`publicLink.help.tip.${stepId}.${index + 1}`)}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
