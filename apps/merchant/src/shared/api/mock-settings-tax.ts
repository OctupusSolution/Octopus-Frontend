// Mock data for /settings/tax — VAT / ZATCA Phase 2 profile for the
// business. Stands in for GET /settings/tax + GET /settings/tax/zatca until
// the backend exists.

export type TaxRateType = "Standard" | "Zero Rated" | "Exempt" | "Reverse Charge";
export type ZatcaComplianceStatus = "Verified" | "Not Verified" | "Pending";

export interface TaxRate {
  id: string;
  type: TaxRateType;
  rate: string;
  appliesTo: string;
  active: boolean;
}

export interface ZatcaStep {
  id: string;
  label: string;
  description: string;
  done: boolean;
}

export interface VatProfile {
  vatNumber: string;
  vatValidated: boolean;
  crNumber: string;
  crValidated: boolean;
  defaultVatRate: string;
  simplifiedEnabled: boolean;
  standardEnabled: boolean;
  zeroRatedEnabled: boolean;
  exemptEnabled: boolean;
  vatOnDigitalOnly: boolean;
}

export const vatProfile: VatProfile = {
  vatNumber: "300000000000003",
  vatValidated: true,
  crNumber: "1010456789",
  crValidated: true,
  defaultVatRate: "standard",
  simplifiedEnabled: true,
  standardEnabled: false,
  zeroRatedEnabled: false,
  exemptEnabled: false,
  vatOnDigitalOnly: false,
};

/* --------------------------------------------------------- Invoice settings */

export type FilingFrequency = "Monthly" | "Quarterly";

export interface InvoiceSettings {
  /** invoice number prefix, e.g. "INV" → INV-1001 */
  prefix: string;
  startNumber: number;
  /** default payment terms in days */
  termsDays: number;
  filingFrequency: FilingFrequency;
}

export const invoiceSettings: InvoiceSettings = {
  prefix: "INV",
  startNumber: 1001,
  termsDays: 14,
  filingFrequency: "Monthly",
};

export const taxRates: readonly TaxRate[] = [
  { id: "rate-standard", type: "Standard", rate: "15%", appliesTo: "All goods and services", active: true },
  { id: "rate-zero", type: "Zero Rated", rate: "0%", appliesTo: "Exports, international transport", active: true },
  { id: "rate-exempt", type: "Exempt", rate: "Exempt", appliesTo: "Financial services, residential rent", active: true },
  { id: "rate-reverse", type: "Reverse Charge", rate: "B2B", appliesTo: "Import and supply chain B2B", active: false },
];

export type ZatcaEnvironment = "Production" | "Simulation";

export interface ZatcaStatus {
  environment: ZatcaEnvironment;
  status: ZatcaComplianceStatus;
  csid: string;
  /** ISO date the current CSID certificate expires */
  csidExpiry: string;
  otpVerified: boolean;
  invoiceType: "Standard" | "Simplified" | "Both";
  clearanceMode: "Clearance" | "Reporting";
}

export const zatcaStatus: ZatcaStatus = {
  environment: "Production",
  status: "Verified",
  csid: "CSID-7f3a-9c21-b8e4",
  csidExpiry: "2027-08-30",
  otpVerified: true,
  invoiceType: "Simplified",
  clearanceMode: "Reporting",
};

export const zatcaChecklist: readonly ZatcaStep[] = [
  { id: "zatca-1", label: "Register on Fatoora portal", description: "Create the CSID through the ZATCA Fatoora portal using the OTP", done: true },
  { id: "zatca-2", label: "Install e-invoicing solution", description: "Connect OCTOPUS as the compliant e-invoicing solution", done: true },
  { id: "zatca-3", label: "Issue compliant invoices", description: "Sign and submit invoices with the correct QR code", done: true },
  { id: "zatca-4", label: "Submit to ZATCA portal", description: "Report invoices to ZATCA as required by Phase 2", done: false },
];
