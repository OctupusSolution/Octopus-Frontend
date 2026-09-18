// apps/merchant/src/pages/customers/_shared/validate-customer.ts
export interface NewCustomerInput {
  firstName: string;
  lastName: string;
  phoneDigits: string; // national number without +966
  email: string;
}

/** i18n keys of the messages to show, per field. */
export type NewCustomerErrors = Partial<Record<"firstName" | "lastName" | "phone" | "email", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Saudi mobile numbers are 9 digits after +966 and start with 5. */
export function validateNewCustomer(input: NewCustomerInput): NewCustomerErrors {
  const errors: NewCustomerErrors = {};
  if (input.firstName.trim() === "") errors.firstName = "customers.validation.required";
  if (input.lastName.trim() === "") errors.lastName = "customers.validation.required";
  const digits = input.phoneDigits.trim();
  if (digits === "") errors.phone = "customers.validation.required";
  else if (!/^5\d{8}$/.test(digits)) errors.phone = "customers.validation.phone";
  if (input.email.trim() !== "" && !EMAIL_RE.test(input.email.trim())) errors.email = "customers.validation.email";
  return errors;
}

