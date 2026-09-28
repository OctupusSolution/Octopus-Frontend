import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MenuTheme } from "@/entities/menu";

const getMenuTheme = vi.fn();
const updateMenuTheme = vi.fn();

vi.mock("@octopus/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@octopus/api-client")>();
  return { ...actual, getMenuTheme: (...args: unknown[]) => getMenuTheme(...args), updateMenuTheme: (...args: unknown[]) => updateMenuTheme(...args) };
});

const { serverFontCode } = await import("./font-code");
const { pushTheme } = await import("@/entities/menu/menu-sync");

beforeEach(() => {
  getMenuTheme.mockReset();
  updateMenuTheme.mockReset();
});

describe("serverFontCode", () => {
  it("keeps a font the platform lists, in the platform's own spelling", () => {
    expect(serverFontCode("inter", ["Inter", "Cairo"])).toBe("Inter");
  });

  it("drops a font the platform does not list", () => {
    expect(serverFontCode("inter", ["Cairo"])).toBeUndefined();
  });

  it("drops every font when the platform lists none (not loaded, failed, none configured)", () => {
    expect(serverFontCode("inter", [])).toBeUndefined();
  });

  it("an unlisted pick never reaches the save: pushTheme sends the server's current fonts", async () => {
    getMenuTheme.mockResolvedValue({
      presetCode: null, logo: null, hero: null, heroText: {}, heroSubtext: {},
      titleFontCode: "Cairo", bodyFontCode: null, primaryColor: null, lightColor: null, accentColor: null, darkColor: null,
      navigationStyle: "TopBar", sectionNavStyle: "IconAndText", cardStyle: "Classic", itemDetailsBehavior: "SamePage",
      stickyPrimaryAction: false, showItemTags: false, isConfigured: true,
    });
    updateMenuTheme.mockResolvedValue({});
    const theme: MenuTheme = {
      presetId: "p", navStyle: "top-bar", categoryStyle: "icon-text", cardStyle: "classic", itemDetails: "same-page",
      stickyAddToCart: false, showItemTags: false,
      titleFontCode: serverFontCode("inter", []),
      bodyFontCode: serverFontCode("roboto", ["Cairo"]),
    };
    await pushTheme("biz-1", "menu-1", theme, "en");
    expect(updateMenuTheme).toHaveBeenCalledWith(
      "biz-1",
      "menu-1",
      expect.objectContaining({ titleFontCode: "Cairo", bodyFontCode: null })
    );
  });
});
