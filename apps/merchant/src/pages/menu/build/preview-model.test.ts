import { describe, expect, it } from "vitest";
import { blankItem, blankMenu, blankSection, addItem, addSection, updateItem } from "@/entities/menu";
import { toPreviewModel } from "./preview-model";

const NOW = "2026-09-10T08:00:00.000Z";

function menuWithSections() {
  let menu = blankMenu("m1", "jeddah-corniche", NOW);
  menu = addSection(menu, blankSection("s1", "items", "Breakfast", null));
  menu = addSection(menu, blankSection("s2", "items", "Desserts", null));
  menu = addItem(menu, "s1", blankItem("i1", "Classic Breakfast"));
  menu = updateItem(menu, "s1", "i1", { pricing: { price: 90, vatRate: 0.15 } });
  return menu;
}

describe("toPreviewModel", () => {
  it("passes section names through as literal labels, not i18n keys", () => {
    const model = toPreviewModel(menuWithSections(), "desktop");
    expect(model.categoryLabels).toEqual(["Breakfast", "Desserts"]);
  });

  it("leaves the built-in offers section out of the category strip", () => {
    const model = toPreviewModel(menuWithSections(), "desktop");
    expect(model.categoryLabels).not.toContain("offers");
  });

  it("omits hidden sections", () => {
    let menu = menuWithSections();
    menu = { ...menu, sections: menu.sections.map((s) => (s.id === "s2" ? { ...s, visibility: "hidden" as const } : s)) };
    expect(toPreviewModel(menu, "desktop").categoryLabels).toEqual(["Breakfast"]);
  });

  it("formats item prices from the draft rather than sampling", () => {
    const model = toPreviewModel(menuWithSections(), "desktop");
    expect(model.samplePrices[0]).toContain("90");
  });

  it("carries the device through", () => {
    expect(toPreviewModel(menuWithSections(), "mobile").device).toBe("mobile");
  });

  it("never returns an empty category list, so the widget always has something to draw", () => {
    const model = toPreviewModel(blankMenu("m2", "b1", NOW), "desktop");
    expect(model.categoryLabels?.length).toBeGreaterThan(0);
  });
});
