// apps/merchant/src/pages/customers/_shared/add-customer-modal.tsx
import { useState } from "react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { Field } from "./form-field";
import { CheckboxPill, DateField, PRIMARY_SUBMIT_CLASS, RadioBox, SelectBox, TEXTAREA_CLASS, TEXT_INPUT_CLASS } from "./form-controls";
import { PhoneField, combinePhone } from "./phone-field";
import { Switch } from "./switch";
import { AddTagModal } from "./add-tag-modal";
import { useTagLabel } from "./tag-chips";
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

// The frame's dialog: 738px wide, 24px padding, a 24px semibold title and 16px
// between the title and the form.
const MODAL_CLASS =
  "max-w-[738px] flex max-h-[calc(100dvh-2rem)] flex-col [&>div]:-mx-1 [&>div]:min-h-0 [&>div]:flex-1 [&>div]:overflow-y-auto [&>div]:px-1 [&>div]:[scrollbar-width:none] [&>div::-webkit-scrollbar]:hidden sm:p-6 [&>h2]:text-[24px] [&>h2]:font-semibold [&>h2]:leading-6 [&>h2+div]:mt-4";

function RemovableTag({ label, removeLabel, onRemove }: { label: string; removeLabel: string; onRemove: () => void }) {
  return (
    <span className="relative inline-flex h-[26px] items-center rounded-full bg-[#f5f9ff] px-2 text-[12px] font-medium leading-3 text-[#0058da] [[data-theme=dark]_&]:bg-[#0d6efd]/15 [[data-theme=dark]_&]:text-[#0D6EFD]">
      {label}
      <button type="button" onClick={onRemove} aria-label={removeLabel} className="absolute -end-0.5 -top-[7px] grid h-4 w-4 place-items-center text-[#d30202]">
        <ShellIcon name="form-close-circle.svg" size={16} />
      </button>
    </span>
  );
}

export function AddCustomerModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (customer: CustomerRecord) => void }) {
  const { t } = useI18n();
  const tagLabel = useTagLabel();
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
        className={MODAL_CLASS}
        backdropClassName="bg-black/60"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
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
                <div role="radiogroup" aria-label={t("customers.addCustomer.gender")} className="flex gap-4">
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

            <Field label={t("customers.addCustomer.note")}>
              <textarea className={`${TEXTAREA_CLASS} h-[78px]`} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("customers.addCustomer.notePlaceholder")} rows={3} />
            </Field>
          </div>

          <Field label={t("customers.addCustomer.preferenceCommunication")} className="gap-4">
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

          <div className="flex items-start gap-2">
            <Switch size="sm" checked={marketing} onChange={setMarketing} label={t("customers.addCustomer.marketingTitle")} />
            <div className="flex flex-col gap-2">
              <div className="text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)]">{t("customers.addCustomer.marketingTitle")}</div>
              <div className="text-[12px] leading-3 text-[var(--octo-text-secondary)]">{t("customers.addCustomer.marketingDescription")}</div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="text-[16px] font-medium leading-4 text-[var(--octo-text-primary)]">{t("customers.addCustomer.tagLabel")}</div>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <RemovableTag
                  key={tag}
                  label={tagLabel(tag)}
                  removeLabel={t("customers.aria.removeTag").replace("{tag}", tagLabel(tag))}
                  onRemove={() => setTags((prev) => prev.filter((other) => other !== tag))}
                />
              ))}
              <button
                type="button"
                onClick={() => setAddTagOpen(true)}
                className="inline-flex h-[26px] items-center gap-1 rounded-full border border-[#cbd5e1] px-2 text-[12px] font-medium leading-3 text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)] [[data-theme=dark]_&]:border-[var(--octo-border-input)]"
              >
                <ShellIcon name="form-plus.svg" size={16} />
                {t("customers.addCustomer.addTagCta")}
              </button>
            </div>
          </div>

          <button type="button" onClick={handleSubmit} className={`${PRIMARY_SUBMIT_CLASS} !mt-0`}>
            {t("customers.addCustomer.submit")}
          </button>
        </div>
      </Modal>

      <AddTagModal open={addTagOpen} onClose={() => setAddTagOpen(false)} onSave={(tag) => setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))} />
    </>
  );
}
