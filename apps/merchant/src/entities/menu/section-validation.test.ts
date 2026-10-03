import { describe, expect, it } from "vitest";
import { SECTION_NAME_MAX, validateSectionForm } from "./section-validation";

const IMAGE = "data:image/png;base64,AAAA";

describe("validateSectionForm", () => {
  it("accepts a named section with an image", () => {
    expect(validateSectionForm({ name: "Breakfast", image: IMAGE })).toEqual({});
  });

  it("requires a name, treating whitespace as empty", () => {
    expect(validateSectionForm({ name: "   ", image: IMAGE }).name).toBe("menuWiz.sec.validation.nameRequired");
  });

  it("requires an image", () => {
    expect(validateSectionForm({ name: "Breakfast", image: null }).image).toBe("menuWiz.sec.validation.imageRequired");
    expect(validateSectionForm({ name: "Breakfast", image: "" }).image).toBe("menuWiz.sec.validation.imageRequired");
  });

  it("reports both fields of an untouched form", () => {
    expect(Object.keys(validateSectionForm({ name: "", image: null })).sort()).toEqual(["image", "name"]);
  });

  it("rejects a name longer than the limit but accepts one at it", () => {
    expect(validateSectionForm({ name: "a".repeat(SECTION_NAME_MAX), image: IMAGE })).toEqual({});
    expect(validateSectionForm({ name: "a".repeat(SECTION_NAME_MAX + 1), image: IMAGE }).name).toBe(
      "menuWiz.sec.validation.nameTooLong"
    );
  });

  it("rejects a name another section already has, ignoring case and padding", () => {
    expect(validateSectionForm({ name: " breakfast ", image: IMAGE }, ["Breakfast", "Mains"]).name).toBe(
      "menuWiz.sec.validation.nameTaken"
    );
    expect(validateSectionForm({ name: "Desserts", image: IMAGE }, ["Breakfast", "Mains"])).toEqual({});
  });
});
