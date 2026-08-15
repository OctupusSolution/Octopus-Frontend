// Step 5 — the only details we ask for. Everything else was inferred.
//
// MOCK: no password is collected and nothing is sent anywhere; the mock auth
// provider signs the merchant in on the email alone. A real signup would add
// OTP verification here (SRS §11.1 step 1).
import { Input } from "@ui/primitives";
import { getRestaurantType, type TypeCode } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";

export interface AccountDetails {
  businessName: string;
  email: string;
  phone: string;
}

export function AccountStep({
  type,
  details,
  onChange,
}: {
  type: TypeCode;
  details: AccountDetails;
  onChange: (next: AccountDetails) => void;
}) {
  const { t } = useI18n();
  const restaurantType = getRestaurantType(type);

  return (
    <div className="mx-auto max-w-[440px]">
      {restaurantType && (
        <p className="mb-4 rounded-[10px] bg-[var(--octo-hover)] px-3 py-2.5 text-[12px] text-[var(--octo-text-secondary)]">
          {t("onboarding.summaryFor").replace("{type}", t(restaurantType.nameKey))}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Input
          label={t("onboarding.businessName")}
          value={details.businessName}
          onChange={(e) => onChange({ ...details, businessName: e.target.value })}
          autoFocus
          required
        />
        <Input
          type="email"
          label={t("onboarding.email")}
          value={details.email}
          onChange={(e) => onChange({ ...details, email: e.target.value })}
          required
        />
        <Input
          type="tel"
          label={t("onboarding.phone")}
          value={details.phone}
          onChange={(e) => onChange({ ...details, phone: e.target.value })}
          placeholder="+966 5X XXX XXXX"
        />
      </div>

      <p className="mt-4 text-[11px] text-[var(--octo-text-faint)]">{t("pricing.vatNote")}</p>
    </div>
  );
}
