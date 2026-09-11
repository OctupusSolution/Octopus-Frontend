// Step 1 — Sections. Three columns: the list, the selected section's settings,
// and the live preview.
//
// Every list event is routed into one of the pure transforms from
// entities/menu/draft and the result set as the new draft; nothing mutates a
// section in place.
import { useRef, useState } from "react";
import { Button, Modal } from "@ui/primitives";
import {
  OFFERS_SECTION_ID,
  addSection,
  archiveSection,
  blankSection,
  moveSection,
  neighbourSectionId,
  removeSection,
  restoreSection,
  toggleSectionVisibility,
  updateSection,
  type Menu,
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

  // setDraft takes a value, not an updater. Handlers read the newest draft from
  // this ref and write the result back into it, so two updates in one tick
  // (or a colour picker firing faster than React re-renders) compose instead
  // of the second overwriting the first from a stale closure.
  const latest = useRef(draft);
  latest.current = draft;
  function apply(transform: (menu: Menu) => Menu) {
    const next = transform(latest.current);
    latest.current = next;
    setDraft(next);
  }

  // Seeded with a concrete id, not left null: a null selection would follow
  // whichever row happens to be first, so reordering would change it.
  const [selectedId, setSelectedId] = useState<string | null>(
    () => (draft.sections.find((s) => s.id !== OFFERS_SECTION_ID) ?? draft.sections[0])?.id ?? null
  );
  const [modal, setModal] = useState<ModalState>(null);
  const [confirmDelete, setConfirmDelete] = useState<Section | null>(null);

  // Derived rather than seeded once: an unset or stale selection falls back to
  // the first real section, else the offers section, so Section Setting is
  // never blank while the menu has anything in it.
  const selected =
    draft.sections.find((s) => s.id === selectedId) ??
    draft.sections.find((s) => s.id !== OFFERS_SECTION_ID) ??
    draft.sections[0] ??
    null;

  function patchSelected(patch: Partial<Section>) {
    if (!selected) return;
    const id = selected.id;
    apply((menu) => updateSection(menu, id, patch));
  }

  function saveFromModal(name: string, image: string | null) {
    if (modal?.mode === "edit") {
      const id = modal.section.id;
      apply((menu) => updateSection(menu, id, { name, image }));
    } else {
      const id = `s-${Date.now().toString(36)}`;
      apply((menu) => addSection(menu, blankSection(id, "items", name, image)));
      setSelectedId(id);
    }
    setModal(null);
  }

  function deleteSection(section: Section) {
    if (selected?.id === section.id) {
      setSelectedId(neighbourSectionId(latest.current, section.id));
    }
    apply((menu) => removeSection(menu, section.id));
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
        <SectionList
          header={
            // No frame shows where a menu is named, and the library, the
            // schedule dialog and the review step all identify a menu by its
            // name. The product owner asked for it on step 1; it sits compact
            // in this card so the three columns still start level.
            <label className="flex h-10 items-center overflow-hidden rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] focus-within:border-[var(--octo-accent)]">
              <span className="flex h-full shrink-0 items-center border-e border-[var(--octo-border-input)] bg-[var(--octo-hover)] px-3 text-[13px] font-medium text-[var(--octo-text-primary)]">
                {t("menuWiz.sec.menuName")} <span className="ms-0.5 text-error">*</span>
              </span>
              <input
                value={draft.name}
                onChange={(e) => {
                  const name = e.target.value;
                  apply((menu) => ({ ...menu, name }));
                }}
                placeholder={t("menuWiz.sec.menuNamePlaceholder")}
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-[14px] text-[var(--octo-text-primary)] outline-none"
              />
            </label>
          }
          sections={draft.sections}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          onToggleVisibility={(id) => apply((menu) => toggleSectionVisibility(menu, id))}
          onReorder={(from, to) => apply((menu) => moveSection(menu, from, to))}
          onAdd={() => setModal({ mode: "add" })}
          onEdit={(section) => setModal({ mode: "edit", section })}
          onArchive={(section) => apply((menu) => archiveSection(menu, section.id))}
          onRestore={(section) => apply((menu) => restoreSection(menu, section.id))}
          onDelete={setConfirmDelete}
        />

        <SectionSettings
          section={selected}
          onPatch={patchSelected}
          onClearImage={() => patchSelected({ image: null })}
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
                if (confirmDelete) deleteSection(confirmDelete);
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
