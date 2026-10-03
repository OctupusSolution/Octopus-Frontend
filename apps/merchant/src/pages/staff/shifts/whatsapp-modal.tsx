import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { Employee } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { Avatar } from "../_shared/avatar";
import { Field, TextArea } from "../_shared/form";
import { formatDayHeader } from "../_shared/format";
import { StaffModal } from "../_shared/staff-modal";
import { INK, INK_MUTED, INK_SOFT, LINE } from "../_shared/theme";

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
    <StaffModal
      open={open}
      onClose={onClose}
      title={t("staff.shiftsTab.sendWhatsAppTitle")}
      submitLabel={t("staff.whatsapp.open")}
      onSubmit={send}
      submitDisabled={recipients.length === 0}
    >
      <div className="flex flex-col gap-4">
        <p className={clsx("px-2 text-[14px] leading-5", INK_SOFT)}>{t("staff.whatsapp.body")}</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-between gap-2 px-2">
              <label className={clsx("flex cursor-pointer items-center gap-2 text-[16px] font-medium leading-4", INK)}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#0D6EFD]"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(staff.map((e) => e.id)))}
                />
                {t("staff.member.modules.selectAll")}
              </label>
              <span className={clsx("text-[12px] font-medium leading-3", INK_MUTED)}>
                {t("staff.assignUsers.selected").replace("{count}", String(recipients.length))}
              </span>
            </div>
            <ul className={clsx("octo-scroll flex max-h-[300px] flex-col gap-1 overflow-y-auto rounded-[12px] border p-2", LINE)}>
              {staff.map((e) => (
                <li key={e.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-[4px] p-2 hover:bg-[var(--octo-hover)]">
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
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className={clsx("truncate text-[14px] font-semibold leading-[14px]", INK)}>{e.name}</span>
                      <span dir="ltr" className={clsx("truncate text-[12px] font-medium leading-3 rtl:text-end", INK_SOFT)}>{e.phone}</span>
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
      </div>
    </StaffModal>
  );
}
