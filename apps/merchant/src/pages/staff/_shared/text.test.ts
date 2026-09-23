import { describe, expect, it } from "vitest";
import { ApiError } from "@octopus/api-client";
import { staffErrorText, type Tx } from "./text";

const en: Tx = (english) => english;
const ar: Tx = (_english, arabic) => arabic;

describe("staffErrorText", () => {
  it("names a known Staff error code in the active language", () => {
    const err = new ApiError(409, { errorCode: "staff.catalog.in-use", status: 409 });
    expect(staffErrorText(err, en)).toMatch(/Still assigned/);
    expect(staffErrorText(err, ar)).toMatch(/مرتبطًا/);
  });

  it("answers the uniform invitation refusal without guessing a cause", () => {
    const err = new ApiError(404, { errorCode: "staff.invitation.unavailable", status: 404 });
    expect(staffErrorText(err, en)).toBe("This invitation is no longer valid.");
  });

  it("falls back to the server detail, then the code, for unknown errors", () => {
    expect(staffErrorText(new ApiError(422, { errorCode: "staff.other", detail: "Server said no" }), en)).toBe("Server said no");
    expect(staffErrorText(new ApiError(422, { errorCode: "staff.other" }), en)).toBe("staff.other");
    expect(staffErrorText(new Error("boom"), en)).toBe("boom");
  });
});
