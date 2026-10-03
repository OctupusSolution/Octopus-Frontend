"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/app/providers";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** There is no newsletter endpoint. The form validates and confirms locally
 *  rather than posting somewhere that does not exist, so it does not imply a
 *  subscription that was never made. */
export function NewsletterForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "invalid">("idle");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setStatus("invalid");
      return;
    }
    setStatus("ok");
    setEmail("");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
      <div className="flex overflow-hidden rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)]">
        <input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setStatus("idle");
          }}
          placeholder={t("store.footer.newsletterPlaceholder")}
          aria-label={t("store.footer.newsletterPlaceholder")}
          aria-invalid={status === "invalid"}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[12px] text-[var(--octo-text-primary)] outline-none placeholder:text-[var(--octo-text-faint)]"
        />
        <button
          type="submit"
          className="shrink-0 bg-[var(--octo-brand)] px-6 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t("store.footer.newsletterSubmit")}
        </button>
      </div>

      <p aria-live="polite" className="min-h-[16px] text-[11px]">
        {status === "ok" && (
          <span className="text-[#16a34a]">{t("store.footer.newsletterThanks")}</span>
        )}
        {status === "invalid" && (
          <span className="text-[#EF4444]">{t("store.footer.newsletterInvalid")}</span>
        )}
      </p>
    </form>
  );
}
