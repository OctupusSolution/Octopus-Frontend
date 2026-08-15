# OCTOPUS Frontend

Monorepo for the four OCTOPUS web portals — Website, Customer, Merchant, Admin — plus shared foundation packages.

This is a **structural scaffold only**: folders and placeholder files that mirror `OCTOPUS_Frontend_Architecture_Vision.pdf`. No dependencies are installed and no build tooling has been configured yet — that's the next step, per-app.

## Layout

- `apps/website` — Next.js, public marketing site
- `apps/customer` — Next.js, public storefront/booking (FSD)
- `apps/merchant` — React + Vite, business-owner dashboard (FSD + module registry)
- `apps/admin` — React + Vite, internal OCTOPUS SuperAdmin console
- `packages/*` — shared design system, i18n, generated API client, realtime, module-kit, tooling config

See the architecture PDF for the full rationale behind every decision here.
