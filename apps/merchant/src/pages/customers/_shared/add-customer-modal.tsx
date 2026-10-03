// apps/merchant/src/pages/customers/_shared/add-customer-modal.tsx
import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { CRM_MODAL_CLASS } from "./action-button";
import { Field } from "./form-field";
import { CheckboxPill, DateField, PRIMARY_SUBMIT_CLASS, RadioBox, SelectBox, TEXTAREA_CLASS, TEXT_INPUT_CLASS } from "./form-controls";
import { PhoneField, combinePhone } from "./phone-field";
import { Switch } from "./switch";
import { AddTagModal } from "./add-tag-modal";
import { TagChips } from "./tag-chips";
import { validateNewCustomer, type NewCustomerErrors } from "./validate-customer";
import type { CommunicationChannel, CustomerRecord } from "./types";

const CHANNELS: readonly CommunicationChannel[] = ["WhatsApp", "SMS", "Email"];
const BRANCHES = ["Riyadh", "Jeddah", "Dammam", "Khobar"] as const;
const AREAS = ["Indoor", "Outdoor", "Private Room", "Bar Seating"] as const;
const SOURCES = [
  { value: "Walk-in", key: "customers.addCustomer.source.walkIn" },
  { value: "Website", key: "customers.addCustomer.source.website" },
  { value: "Instagram", key: "customers.addCustomer.source.instagram" },
  { value: "Referral", key: "customers.addCustomer.source.referral" },
] as const;

const DEFAULT_TAGS = ["VIP", "Frequent Diner"];

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
  const [tags, setTags] = useState<string[]>(DEFAULT_TAGS);
  const [addTagOpen, setAddTagOpen] = useState(false);
  const [errors, setErrors] = useState<NewCustomerErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function reset() {
    setFirstName(""); setLastName(""); setPhoneDigits(""); setEmail(""); setDob(""); setGender("Male");
    setBranch(""); setAreaTable(""); setSource("Walk-in"); setReferredBy(""); setNote("");
    setChannels(["WhatsApp"]); setMarketing(true); setTags(DEFAULT_TAGS);
    setErrors({}); setSubmitted(false);
  }

  // After the first submit attempt, errors update live as the user fixes them.
  function revalidate(patch: Partial<Parameters<typeof validateNewCustomer>[0]>) {
    if (!submitted) return;
    setErrors(validateNewCustomer({ firstName, lastName, phoneDigits, email, ...patch }));
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
    const found = validateNewCustomer({ firstName, lastName, phoneDigits, email });
    setSubmitted(true);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const customer: CustomerRecord = {
      id: `CUST-${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      dateOfBirth: dob || undefined,
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

  const err = (key: keyof NewCustomerErrors) => (errors[key] ? t(errors[key] as string) : undefined);

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title={t("customers.addCustomer.title")}
        className={`max-w-[760px] max-h-[92vh] overflow-y-auto octo-scroll ${CRM_MODAL_CLASS}`}
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
          <Field label={t("customers.addCustomer.firstName")} required error={err("firstName")}>
            <input className={TEXT_INPUT_CLASS} value={firstName} onChange={(e) => { setFirstName(e.target.value); revalidate({ firstName: e.target.value }); }} placeholder={t("customers.addCustomer.firstNamePlaceholder")} aria-invalid={!!errors.firstName} />
          </Field>
          <Field label={t("customers.addCustomer.lastName")} required error={err("lastName")}>
            <input className={TEXT_INPUT_CLASS} value={lastName} onChange={(e) => { setLastName(e.target.value); revalidate({ lastName: e.target.value }); }} placeholder={t("customers.addCustomer.lastNamePlaceholder")} aria-invalid={!!errors.lastName} />
          </Field>
          <Field label={t("customers.addCustomer.phone")} required error={err("phone")}>
            <PhoneField digits={phoneDigits} onChange={(d) => { setPhoneDigits(d); revalidate({ phoneDigits: d }); }} />
          </Field>
          <Field label={t("customers.addCustomer.email")} error={err("email")}>
            <input type="email" className={TEXT_INPUT_CLASS} value={email} onChange={(e) => { setEmail(e.target.value); revalidate({ email: e.target.value }); }} placeholder={t("customers.addCustomer.emailPlaceholder")} aria-invalid={!!errors.email} />
          </Field>
          <Field label={t("customers.addCustomer.dob")}>
            <DateField value={dob} onChange={setDob} placeholder={t("customers.addCustomer.dobPlaceholder")} ariaLabel={t("customers.addCustomer.dob")} withYear />
          </Field>
          <Field label={t("customers.addCustomer.gender")}>
            <div role="radiogroup" aria-label={t("customers.addCustomer.gender")} className="flex gap-6">
              <RadioBox label={t("customers.addCustomer.male")} checked={gender === "Male"} onClick={() => setGender("Male")} />
              <RadioBox label={t("customers.addCustomer.female")} checked={gender === "Female"} onClick={() => setGender("Female")} />
            </div>
          </Field>
          <Field label={t("customers.addCustomer.branch")}>
            <SelectBox value={branch} onChange={setBranch} placeholderShown={branch === ""} ariaLabel={t("customers.addCustomer.branch")}>
              <option value="">{t("customers.addCustomer.branchPlaceholder")}</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{t(`customers.branch.${b.toLowerCase()}`)}</option>)}
            </SelectBox>
          </Field>
          <Field label={t("customers.addCustomer.areaTable")}>
            <SelectBox value={areaTable} onChange={setAreaTable} placeholderShown={areaTable === ""} ariaLabel={t("customers.addCustomer.areaTable")}>
              <option value="">{t("customers.addCustomer.areaTablePlaceholder")}</option>
              {AREAS.map((a) => <option key={a} value={a}>{t(`customers.area.${a.replace(/ /g, "").replace(/^./, (c) => c.toLowerCase())}`)}</option>)}
            </SelectBox>
          </Field>
          <Field label={t("customers.addCustomer.source")}>
            <SelectBox value={source} onChange={setSource} ariaLabel={t("customers.addCustomer.source")}>
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{t(s.key)}</option>)}
            </SelectBox>
          </Field>
          <Field label={t("customers.addCustomer.referredBy")}>
            <input className={TEXT_INPUT_CLASS} value={referredBy} onChange={(e) => setReferredBy(e.target.value)} placeholder={t("customers.addCustomer.referredByPlaceholder")} />
          </Field>
        </div>

        <Field label={t("customers.addCustomer.note")} className="mt-3.5">
          <textarea className={TEXTAREA_CLASS} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("customers.addCustomer.notePlaceholder")} rows={3} />
        </Field>

        <Field label={t("customers.addCustomer.preferenceCommunication")} className="mt-4">
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((channel) => (
              <CheckboxPill
                key={channel}
                label={t(`customers.addCustomer.channel.${channel.toLowerCase()}`)}
                checked={channels.includes(channel)}
                onClick={() => toggleChannel(channel)}
              />
            ))}
          </div>
        </Field>

        <div className="mt-4 flex items-start gap-3">
          <Switch checked={marketing} onChange={setMarketing} label={t("customers.addCustomer.marketingTitle")} />
          <div>
            <div className="text-[15px] font-medium text-[var(--octo-text-primary)]">{t("customers.addCustomer.marketingTitle")}</div>
            <div className="mt-0.5 text-[12.5px] text-[var(--octo-text-muted)]">{t("customers.addCustomer.marketingDescription")}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[15px] font-medium text-[var(--octo-text-primary)]">{t("customers.addCustomer.tagLabel")}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {tags.length > 0 && <TagChips tags={tags} size="md" uniform onRemove={(tag) => setTags((prev) => prev.filter((t2) => t2 !== tag))} className="!gap-2.5" />}
            <button
              type="button"
              onClick={() => setAddTagOpen(true)}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--octo-border-input)] px-3 text-[13px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              <Plus size={15} /> {t("customers.addCustomer.addTagCta")}
            </button>
          </div>
        </div>

        <button type="button" onClick={handleSubmit} className={PRIMARY_SUBMIT_CLASS}>
          {t("customers.addCustomer.submit")}
        </button>
      </Modal>

      <AddTagModal open={addTagOpen} onClose={() => setAddTagOpen(false)} onSave={(tag) => setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))} />
    </>
  );
}
