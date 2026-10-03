// The Add / Edit Section dialog's rules. Pure, so the dialog only decides
// *when* to show a message (after blur or a save attempt), never *whether*.

export interface SectionFormInput {
  name: string;
  image: string | null;
}

/** i18n keys of the messages to show, per field. */
export type SectionFormErrors = Partial<Record<"name" | "image", string>>;

export const SECTION_NAME_MAX = 60;

/**
 * `otherNames` are the names of the menu's other sections — every section but
 * the one being edited — so renaming a section to its own name is not a clash.
 */
export function validateSectionForm(input: SectionFormInput, otherNames: readonly string[] = []): SectionFormErrors {
  const errors: SectionFormErrors = {};
  const name = input.name.trim();
  if (name === "") errors.name = "menuWiz.sec.validation.nameRequired";
  else if (name.length > SECTION_NAME_MAX) errors.name = "menuWiz.sec.validation.nameTooLong";
  else if (otherNames.some((other) => other.trim().toLowerCase() === name.toLowerCase()))
    errors.name = "menuWiz.sec.validation.nameTaken";
  if (!input.image) errors.image = "menuWiz.sec.validation.imageRequired";
  return errors;
}
