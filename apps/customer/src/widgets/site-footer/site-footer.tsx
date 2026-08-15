import { Facebook, Instagram, MapPin, Twitter } from "lucide-react";
import type { Tenant } from "@/entities/tenant";

export interface SiteFooterProps {
  tenant: Tenant;
}

const SOCIAL_LINKS = [
  { icon: Instagram, label: "Instagram" },
  { icon: Twitter, label: "Twitter" },
  { icon: Facebook, label: "Facebook" },
];

export function SiteFooter({ tenant }: SiteFooterProps) {
  const primaryBranch = tenant.branches[0];

  return (
    <footer className="border-t border-[var(--octo-border-card)] bg-[var(--octo-shell)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-center sm:px-[26px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/octopus-OCTOPUS LOGO.svg" alt="OCTOPUS" className="h-7 w-7" />

        <p className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{tenant.name}</p>

        {primaryBranch && (
          <p className="flex items-center gap-1.5 text-[11.5px] text-[var(--octo-text-secondary)]">
            <MapPin size={13} aria-hidden="true" />
            {primaryBranch.address}
          </p>
        )}

        <div className="flex items-center gap-3">
          {SOCIAL_LINKS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              aria-label={label}
              className="grid h-8 w-8 place-items-center rounded-full border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)]"
            >
              <Icon size={14} />
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
