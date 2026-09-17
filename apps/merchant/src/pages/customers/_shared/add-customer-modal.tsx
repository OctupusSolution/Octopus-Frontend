// apps/merchant/src/pages/customers/_shared/add-customer-modal.tsx
import { useState } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import { Input, Modal, Select, Textarea } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { Field } from "./form-field";
import { PhoneField, combinePhone } from "./phone-field";
import { Switch } from "./switch";
import { AddTagModal } from "./add-tag-modal";
import type { CommunicationChannel, CustomerRecord } from "./types";

function GenderOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex flex-1 items-center gap-2 rounded-[9px] border px-3 py-2 text-[12.5px] transition-colors",
        active ? "border-[#0D6EFD] text-[#0D6EFD]" : "border-[var(--octo-border-input)] text-[var(--octo-text-primary)]"
      )}
    >
      <span className={clsx("grid h-4 w-4 shrink-0 place-items-center rounded-full border", active ? "border-[#0D6EFD]" : "border-[var(--octo-border-input)]")}>
        {active && <span className="h-2 w-2 rounded-full bg-[#0D6EFD]" />}
      </span>
      {label}
    </button>
  );
}

const CHANNELS: readonly CommunicationChannel[] = ["WhatsApp", "SMS", "Email"];

export function AddCustomerModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (customer: CustomerRecord) => void }) {
  const { t } = useI18n();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [branch, setBranch] = useState("");
  const [areaTable, setAreaTable] = useState("");
  const [source, setSource] = useState("Walk-in");
  const [referredBy, setReferredBy] = useState("");
  const [note, setNote] = useState("");
  const [channels, setChannels] = useState<CommunicationChannel[]>(["WhatsApp"]);
  const [marketing, setMarketing] = useState(true);
  const [tags, setTags] = useState<string[]>(["VIP", "Frequent Diner"]);
  const [addTagOpen, setAddTagOpen] = useState(false);

  const canSubmit = firstName.trim() !== "" && lastName.trim() !== "" && phoneDigits.trim() !== "";

  function reset() {
    setFirstName(""); setLastName(""); setPhoneDigits(""); setEmail(""); setDob(""); setGender("Male");
    setBranch(""); setAreaTable(""); setSource("Walk-in"); setReferredBy(""); setNote("");
    setChannels(["WhatsApp"]); setMarketing(true); setTags(["VIP", "Frequent Diner"]);
  }

  function toggleChannel(channel: CommunicationChannel) {
    setChannels((prev) => (prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]));
  }

  function handleClose() {
    if (addTagOpen) return; // let the nested Add Tag modal own this Escape/backdrop-click
    reset();
    onClose();
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const today = new Date().toISOString().slice(0, 10);
    const customer: CustomerRecord = {
      id: `CUST-${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      tags,
      phone: combinePhone(phoneDigits.trim()),
      email: email.trim(),
      isBlocked: false,
      visits: 0,
      totalSpendSar: 0,
      lastVisit: today,
      loyaltyPoints: 0,
      avgSpendSar: 0,
      customerSince: today,
      firstVisit: today,
      preferredBranch: branch,
      preferredAreaTable: areaTable,
      referredBy: referredBy.trim() || source || undefined,
      marketingConsent: marketing ? "Opted in" : "Opted out",
      cuisinePreference: [],
      dietaryPreference: "",
      occasion: "",
      visitTime: "",
      communicationPreference: channels,
      specialRequests: "",
      notes: note.trim() ? [{ date: today, text: note.trim() }] : [],
      recentReservations: [],
      recentOrders: [],
      recentPayments: [],
    };
    onCreate(customer);
    reset();
    onClose();
  }

  return (
    <>
      <Modal open={open} onClose={handleClose} title={t("customers.addCustomer.title")} className="max-w-[640px] max-h-[85vh] overflow-y-auto octo-scroll">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("customers.addCustomer.firstName")} required>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t("customers.addCustomer.firstNamePlaceholder")} />
          </Field>
          <Field label={t("customers.addCustomer.lastName")} required>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t("customers.addCustomer.lastNamePlaceholder")} />
          </Field>
          <Field label={t("customers.addCustomer.phone")} required>
            <PhoneField digits={phoneDigits} onChange={setPhoneDigits} />
          </Field>
          <Field label={t("customers.addCustomer.email")}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("customers.addCustomer.emailPlaceholder")} />
          </Field>
          <Field label={t("customers.addCustomer.dob")}>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} placeholder={t("customers.addCustomer.dobPlaceholder")} />
          </Field>
          <Field label={t("customers.addCustomer.gender")}>
            <div className="flex gap-2">
              <GenderOption label={t("customers.addCustomer.male")} active={gender === "Male"} onClick={() => setGender("Male")} />
              <GenderOption label={t("customers.addCustomer.female")} active={gender === "Female"} onClick={() => setGender("Female")} />
            </div>
          </Field>
          <Field label={t("customers.addCustomer.branch")}>
            <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">{t("customers.addCustomer.branchPlaceholder")}</option>
              {["Riyadh", "Jeddah", "Dammam", "Khobar"].map((b) => <option key={b} value={b}>{b}</option>)}
            </Select>
          </Field>
          <Field label={t("customers.addCustomer.areaTable")}>
            <Select value={areaTable} onChange={(e) => setAreaTable(e.target.value)}>
              <option value="">{t("customers.addCustomer.areaTablePlaceholder")}</option>
              {["Indoor", "Outdoor", "Private Room", "Bar Seating"].map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
          <Field label={t("customers.addCustomer.source")}>
            <Select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="Walk-in">{t("customers.addCustomer.source.walkIn")}</option>
              <option value="Website">{t("customers.addCustomer.source.website")}</option>
              <option value="Instagram">{t("customers.addCustomer.source.instagram")}</option>
              <option value="Referral">{t("customers.addCustomer.source.referral")}</option>
            </Select>
          </Field>
          <Field label={t("customers.addCustomer.referredBy")}>
            <Input value={referredBy} onChange={(e) => setReferredBy(e.target.value)} placeholder={t("customers.addCustomer.referredByPlaceholder")} />
          </Field>
        </div>

        <Field label={t("customers.addCustomer.note")} className="mt-4">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("customers.addCustomer.notePlaceholder")} rows={3} />
        </Field>

        <Field label={t("customers.addCustomer.preferenceCommunication")} className="mt-4">
          <div className="flex gap-2">
            {CHANNELS.map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={() => toggleChannel(channel)}
                className={clsx(
                  "rounded-[9px] border px-3 py-2 text-[12.5px] font-medium transition-colors",
                  channels.includes(channel) ? "border-[#0D6EFD] bg-[#0D6EFD]/5 text-[#0D6EFD]" : "border-[var(--octo-border-input)] text-[var(--octo-text-primary)]"
                )}
              >
                {t(`customers.addCustomer.channel.${channel.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </Field>

        <div className="mt-4 flex items-start gap-3">
          <Switch checked={marketing} onChange={setMarketing} label={t("customers.addCustomer.marketingTitle")} />
          <div>
            <div className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("customers.addCustomer.marketingTitle")}</div>
            <div className="text-[11.5px] text-[var(--octo-text-muted)]">{t("customers.addCustomer.marketingDescription")}</div>
          </div>
        </div>

        <Field label={t("customers.addCustomer.tagLabel")} className="mt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[var(--octo-track)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--octo-text-secondary)]">
                {tag}
                <button type="button" onClick={() => setTags((prev) => prev.filter((t2) => t2 !== tag))} aria-label={`Remove ${tag}`}>
                  <X size={11} className="text-[#EF4444]" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setAddTagOpen(true)}
              className="rounded-full border border-dashed border-[var(--octo-border-input)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              + {t("customers.addCustomer.addTagCta")}
            </button>
          </div>
        </Field>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="mt-6 w-full rounded-[10px] bg-[#0D6EFD] py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("customers.addCustomer.submit")}
        </button>
      </Modal>

      <AddTagModal open={addTagOpen} onClose={() => setAddTagOpen(false)} onSave={(tag) => setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))} />
    </>
  );
}
