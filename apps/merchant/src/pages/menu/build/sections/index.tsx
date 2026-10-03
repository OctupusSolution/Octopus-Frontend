// Step 1 — Sections. Three columns: the list, the selected section's settings,
// and the live preview.
//
// Every list event is routed into one of the pure transforms from
// entities/menu/draft and the result set as the new draft; nothing mutates a
// section in place.
import { useRef, useState } from "react";
import clsx from "clsx";
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
import { Field } from "../../_shared/controls";
import { FIELD_INVALID, TEXT_INPUT_CLASS } from "../../_shared/theme";
import { MenuPreviewFrame } from "../preview/menu-preview-frame";
import { SectionList } from "./section-list";
import { SectionSettings } from "./section-settings";
import { SectionModal } from "./section-modal";

/** The menu-name field is not in the Figma frame; flip this to draw it again. */
const SHOW_MENU_NAME: boolean = true;

type ModalState ={ mode: "add" } | { mode: "edit"; section: Section } | null;

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
  const [nameTouched, setNameTouched] = useState(false);
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
      {/* The frame's own column widths (464 / 327 / 309), kept as ratios. */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,464fr)_minmax(0,327fr)_minmax(0,309fr)]">
        <SectionList
          header={
            // No frame shows where a menu is named, so the field is not drawn
            // (SHOW_MENU_NAME). It is kept, not deleted: the library, the
            // schedule dialog and the review step all identify a menu by name.
            SHOW_MENU_NAME && (
              <Field
                label={t("menuWiz.sec.menuName")}
                required
                error={nameTouched && draft.name.trim() === "" ? t("menuWiz.sec.menuNameRequired") : null}
              >
                <input
                  value={draft.name}
                  aria-label={t("menuWiz.sec.menuName")}
                  onBlur={() => setNameTouched(true)}
                  onChange={(e) => {
                    const name = e.target.value;
                    apply((menu) => ({ ...menu, name }));
                  }}
                  placeholder={t("menuWiz.sec.menuNamePlaceholder")}
                  className={clsx(TEXT_INPUT_CLASS, nameTouched && draft.name.trim() === "" && FIELD_INVALID)}
                />
              </Field>
            )
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

        <MenuPreviewFrame menu={draft} selectedSectionId={selected?.id ?? null} onSelectSection={setSelectedId} />
      </div>

      <SectionModal
        open={modal !== null}
        mode={modal?.mode ?? "add"}
        section={modal?.mode === "edit" ? modal.section : null}
        otherNames={draft.sections
          .filter((s) => !(modal?.mode === "edit" && s.id === modal.section.id))
          .map((s) => s.name)}
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
