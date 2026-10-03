// apps/merchant/src/pages/customers/segments/create-segment-modal.tsx
import { useEffect, useState } from "react";
import type { CrmCustomerCriteriaDto } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { ConditionsEditor, FIELD_BOX_CLASS, FIELD_LABEL_CLASS } from "./conditions-editor";
import { emptyCondition, toCriteria, type ConditionDraft, type MatchMode } from "./segment-model";

// The API's limit on a segment's name.
const NAME_MAX_LENGTH = 60;

export function CreateSegmentModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  /** Resolves once the segment exists; a rejection keeps the modal open. */
  onCreate: (name: string, criteria: CrmCustomerCriteriaDto) => Promise<void>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState<ConditionDraft[]>(() => [emptyCondition()]);
  const [match, setMatch] = useState<MatchMode>("All");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setDrafts([emptyCondition()]);
    setMatch("All");
    setSaving(false);
  }, [open]);

  const criteria = toCriteria(drafts, match);
  const ready = name.trim() !== "" && criteria !== null && !saving;

  const submit = async () => {
    if (!ready || !criteria) return;
    setSaving(true);
    try {
      await onCreate(name.trim(), criteria);
      onClose();
    } catch {
      // The page reports the refusal; the form stays as it was for another try.
      setSaving(false);
    }
  };

  return (
    // `!` because the primitive's own radius and padding would otherwise win the cascade.
    <Modal open={open} onClose={onClose} className="max-w-[750px] flex max-h-[calc(100dvh-2rem)] flex-col [&>div]:-mx-1 [&>div]:min-h-0 [&>div]:flex-1 [&>div]:overflow-y-auto [&>div]:px-1 [&>div]:[scrollbar-width:none] [&>div::-webkit-scrollbar]:hidden !rounded-[44px] !p-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex max-h-[calc(100vh-80px)] flex-col gap-4"
      >
        <div className="octo-scroll flex min-h-0 flex-col gap-6 overflow-y-auto">
          <h2 className="text-[24px] font-bold leading-[24px] text-[var(--octo-text-primary)]">{t("customers.segments.create.title")}</h2>

          <label className="flex flex-col gap-3">
            <span className={FIELD_LABEL_CLASS}>{t("customers.segments.nameLabel")}</span>
            <span className={FIELD_BOX_CLASS}>
              <input
                autoFocus
                value={name}
                maxLength={NAME_MAX_LENGTH}
                placeholder={t("customers.segments.namePlaceholder")}
                onChange={(event) => setName(event.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-secondary)] focus:outline-none"
              />
            </span>
          </label>

          <ConditionsEditor drafts={drafts} match={match} onDraftsChange={setDrafts} onMatchChange={setMatch} />
        </div>

        <button
          type="submit"
          disabled={!ready}
          className="h-12 w-full shrink-0 rounded-[8px] bg-[#0d6efd] px-3 py-2 text-[18px] font-bold leading-[18px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("customers.segments.create.submit")}
        </button>
      </form>
    </Modal>
  );
}
