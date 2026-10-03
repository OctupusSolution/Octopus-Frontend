import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Modal } from "@ui/primitives";
import type { Employee } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { Avatar } from "../_shared/avatar";
import { buttonClass } from "../_shared/buttons";
import { Field, TextArea } from "../_shared/form";
import { formatDayHeader } from "../_shared/format";

export function WhatsAppModal({
  open,
  onClose,
  staff,
  days,
  weekRange,
  shiftLabel,
  notify,
}: {
  open: boolean;
  onClose: () => void;
  staff: Employee[];
  days: Date[];
  weekRange: string;
  shiftLabel: (employeeId: string, day: Date) => string;
  notify: (text: string, tone?: "success" | "error") => void;
}) {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState("");
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set(staff.map((e) => e.id)));
      setEdited(false);
    }
    // Start from "everyone shown" whenever the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const recipients = useMemo(() => staff.filter((e) => selected.has(e.id)), [staff, selected]);

  const generated = useMemo(() => {
    const lines = recipients.map(
      (e) => `• ${e.name}\n${days.map((d) => `   ${formatDayHeader(d, locale)}: ${shiftLabel(e.id, d)}`).join("\n")}`
    );
    return `${t("staff.whatsapp.greeting").replace("{range}", weekRange)}\n\n${lines.join("\n\n")}`;
  }, [recipients, days, locale, shiftLabel, t, weekRange]);

  useEffect(() => {
    if (!edited) setMessage(generated);
  }, [generated, edited]);

  const allSelected = staff.length > 0 && selected.size === staff.length;

  const send = () => {
    if (recipients.length === 0) return;
    // wa.me opens one chat per link. A single recipient gets a direct chat;
    // several get WhatsApp's own "choose a chat" picker, e.g. the team group.
    const phone = recipients.length === 1 ? recipients[0].phone.replace(/\D/g, "") : "";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
    notify(
      recipients.length === 1
        ? t("staff.whatsapp.toastOne").replace("{name}", recipients[0].name)
        : t("staff.whatsapp.toastMany").replace("{count}", String(recipients.length))
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("staff.shiftsTab.sendWhatsAppTitle")}
      className="max-w-2xl"
      footer={
        <>
          <span className="me-auto text-[13px] text-[var(--octo-text-secondary)]">
            {t("staff.assignUsers.selected").replace("{count}", String(recipients.length))}
          </span>
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>{t("common.cancel")}</button>
          <button type="button" onClick={send} disabled={recipients.length === 0} className={buttonClass("primary")}>
            <MessageCircle size={18} aria-hidden />
            {t("staff.whatsapp.open")}
          </button>
        </>
      }
    >
      <p className="-mt-1 mb-4 text-[13px] text-[var(--octo-text-secondary)]">{t("staff.whatsapp.body")}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="min-w-0">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-2 text-[13px] font-semibold text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#0D6EFD]"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(staff.map((e) => e.id)))}
            />
            {t("staff.member.modules.selectAll")}
          </label>
          <ul className="octo-scroll mt-1 flex max-h-[300px] flex-col gap-0.5 overflow-y-auto border-t border-[var(--octo-divider)] pe-1 pt-1">
            {staff.map((e) => (
              <li key={e.id}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 hover:bg-[var(--octo-hover)]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-[#0D6EFD]"
                    checked={selected.has(e.id)}
                    onChange={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(e.id)) next.delete(e.id);
                        else next.add(e.id);
                        return next;
                      })
                    }
                  />
                  <Avatar name={e.name} size={28} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-[var(--octo-text-primary)]">{e.name}</span>
                    <span dir="ltr" className="block truncate text-[12px] text-[var(--octo-text-secondary)] rtl:text-end">{e.phone}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <Field label={t("staff.whatsapp.message")} htmlFor="wa-message" hint={recipients.length > 1 ? t("staff.whatsapp.manyHint") : undefined}>
          <TextArea
            id="wa-message"
            rows={12}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setEdited(true);
            }}
            className="font-mono text-[12px] leading-relaxed"
          />
        </Field>
      </div>
    </Modal>
  );
}
