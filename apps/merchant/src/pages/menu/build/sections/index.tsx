// Step 1 — Sections. Three columns: the list, the selected section's settings,
// and the live preview.
//
// Every list event is routed into one of the pure transforms from
// entities/menu/draft and the result set as the new draft; nothing mutates a
// section in place.
import { useState } from "react";
import { Button, Modal } from "@ui/primitives";
import {
  OFFERS_SECTION_ID,
  addSection,
  blankSection,
  moveSection,
  removeSection,
  updateSection,
  type Section,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { useDraft } from "../use-draft";
import { PreviewRail } from "../preview-rail";
import { SectionList } from "./section-list";
import { SectionSettings } from "./section-settings";
import { SectionModal } from "./section-modal";

type ModalState = { mode: "add" } | { mode: "edit"; section: Section } | null;

export function SectionsStep() {
  const { t } = useI18n();
  const { draft, setDraft } = useDraft();

  const [selectedId, setSelectedId] = useState<string | null>(
    draft.sections.find((s) => s.id !== OFFERS_SECTION_ID)?.id ?? null
  );
  const [modal, setModal] = useState<ModalState>(null);
  const [confirmDelete, setConfirmDelete] = useState<Section | null>(null);

  const selected = draft.sections.find((s) => s.id === selectedId) ?? null;

  function patchSelected(patch: Partial<Section>) {
    if (!selected) return;
    setDraft(updateSection(draft, selected.id, patch));
  }

  function saveFromModal(name: string, image: string | null) {
    if (modal?.mode === "edit") {
      setDraft(updateSection(draft, modal.section.id, { name, image }));
    } else {
      const id = `s-${Date.now().toString(36)}`;
      setDraft(addSection(draft, blankSection(id, "items", name, image)));
      setSelectedId(id);
    }
    setModal(null);
  }

  return (
    <>
      {/* No frame shows where a menu is named, and the library, the schedule
          dialog and the review step all identify a menu by its name. Step 1
          is the first screen the merchant reaches, so it asks here. */}
      <label className="mb-4 block max-w-[520px]">
        <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.sec.menuName")} <span className="text-error">*</span>
        </span>
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder={t("menuWiz.sec.menuNamePlaceholder")}
          className="mt-1.5 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)]"
        />
      </label>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1fr)]">
        <SectionList
          sections={draft.sections}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onToggleVisibility={(id) => {
            const section = draft.sections.find((s) => s.id === id);
            if (!section) return;
            setDraft(
              updateSection(draft, id, {
                visibility: section.visibility === "visible" ? "hidden" : "visible",
              })
            );
          }}
          onReorder={(from, to) => setDraft(moveSection(draft, from, to))}
          onAdd={() => setModal({ mode: "add" })}
          onEdit={(section) => setModal({ mode: "edit", section })}
          onArchive={(section) => setDraft(updateSection(draft, section.id, { visibility: "hidden" }))}
          onDelete={setConfirmDelete}
        />

        <SectionSettings
          section={selected}
          onPatch={patchSelected}
          onClearImage={() => patchSelected({ image: null })}
          onChangeImage={() => selected && setModal({ mode: "edit", section: selected })}
        />

        <PreviewRail menu={draft} />
      </div>

      <SectionModal
        open={modal !== null}
        mode={modal?.mode ?? "add"}
        section={modal?.mode === "edit" ? modal.section : null}
        onClose={() => setModal(null)}
        onSave={saveFromModal}
      />

      {/* Deleting a section takes its items with it, so the confirm says how
          many rather than asking "are you sure" about an unknown quantity. */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={t("menuWiz.sec.deleteTitle")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              {t("menuWiz.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) {
                  setDraft(removeSection(draft, confirmDelete.id));
                  if (selectedId === confirmDelete.id) setSelectedId(null);
                }
                setConfirmDelete(null);
              }}
            >
              {t("menuWiz.sec.action.delete")}
            </Button>
          </div>
        }
      >
        <p className="text-[14px] text-[var(--octo-text-secondary)]">
          {t("menuWiz.sec.deleteBody")
            .replace("{name}", confirmDelete?.name ?? "")
            .replace("{n}", String(confirmDelete?.entries.length ?? 0))}
        </p>
      </Modal>
    </>
  );
}
