import { describe, expect, it } from "vitest";
import { validateNewCustomer } from "./validate-customer";

const valid = { firstName: "Reem", lastName: "Al-Subaie", phoneDigits: "510002877", email: "" };

describe("validateNewCustomer", () => {
  it("accepts a complete record with no email", () => {
    expect(validateNewCustomer(valid)).toEqual({});
  });

  it("requires first name, last name and phone", () => {
    expect(validateNewCustomer({ firstName: " ", lastName: "", phoneDigits: "", email: "" })).toEqual({
      firstName: "customers.validation.required",
      lastName: "customers.validation.required",
      phone: "customers.validation.required",
    });
  });

  it("checks the Saudi mobile format", () => {
    expect(validateNewCustomer({ ...valid, phoneDigits: "12345" }).phone).toBe("customers.validation.phone");
    expect(validateNewCustomer({ ...valid, phoneDigits: "410002877" }).phone).toBe("customers.validation.phone");
  });

  it("checks the email format only when one is given", () => {
    expect(validateNewCustomer({ ...valid, email: "not-an-email" }).email).toBe("customers.validation.email");
    expect(validateNewCustomer({ ...valid, email: "reem@example.com" })).toEqual({});
  });
});
