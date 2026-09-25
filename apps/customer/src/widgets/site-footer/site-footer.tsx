"use client";

import { Clock, Facebook, Instagram, Linkedin, MapPin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/app/providers";
import type { Tenant } from "@/entities/tenant";
import { NewsletterForm } from "./newsletter-form";

export interface SiteFooterProps {
  tenant: Tenant;
}

interface LinkColumn {
  heading: string;
  links: { href: string; key: string }[];
}

const EXPLORE: LinkColumn = {
  heading: "store.footer.explore",
  links: [
    { href: "/", key: "store.nav.home" },
    { href: "/menu", key: "store.nav.menu" },
    { href: "/#best-sellers", key: "store.section.bestSellers" },
    { href: "/#offers", key: "store.section.offers" },
  ],
};

const INFO: LinkColumn = {
  heading: "store.footer.info",
  links: [
    { href: "/contact", key: "store.footer.contactUs" },
    { href: "/privacy", key: "store.footer.privacy" },
    { href: "/terms", key: "store.footer.terms" },
  ],
};

const SOCIAL = [
  { label: "Instagram", Icon: Instagram },
  { label: "Facebook", Icon: Facebook },
  { label: "LinkedIn", Icon: Linkedin },
];

function Column({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[13px] font-bold text-[var(--octo-text-primary)]">{heading}</h3>
      {children}
    </div>
  );
}

export function SiteFooter({ tenant }: SiteFooterProps) {
  const { t } = useI18n();

  return (
    <footer className="mt-16 bg-[var(--octo-store-footer)]">
      <div className="mx-auto grid max-w-[1200px] gap-9 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,0.8fr)_1.6fr]">
        <div className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/octopus-logo.svg" alt={tenant.name} className="h-[34px] w-[34px]" />
          <p className="max-w-[240px] text-[12px] leading-[1.9] text-[var(--octo-text-secondary)]">
            {t("store.footer.tagline")}
          </p>
          <p className="mt-1 text-[13px] font-bold text-[var(--octo-text-primary)]">
            {t("store.footer.followUs")}
          </p>
          <ul className="flex items-center gap-2.5">
            {SOCIAL.map(({ label, Icon }) => (
              <li key={label}>
                <a
                  href="#"
                  aria-label={label}
                  className="grid h-8 w-8 place-items-center rounded-full border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:text-[var(--octo-brand)]"
                >
                  <Icon size={14} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {[EXPLORE, INFO].map((column) => (
          <Column key={column.heading} heading={t(column.heading)}>
            <ul className="flex flex-col gap-2.5">
              {column.links.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="text-[12px] text-[var(--octo-text-secondary)] transition-colors hover:text-[var(--octo-text-primary)]"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </Column>
        ))}

        <Column heading={t("store.footer.visitUs")}>
          <ul className="flex flex-col gap-2.5 text-[12px] text-[var(--octo-text-secondary)]">
            <li className="flex items-start gap-2">
              <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              {t("store.footer.address")}
            </li>
            <li className="flex items-start gap-2">
              <Clock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              {t("store.footer.hours")}
            </li>
          </ul>
        </Column>

        <Column heading={t("store.footer.contactUs")}>
          <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
            {t("store.footer.newsletterTitle")}
          </p>
          <NewsletterForm />
        </Column>
      </div>
    </footer>
  );
}
