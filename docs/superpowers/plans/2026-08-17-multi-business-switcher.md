# Multi-Business Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one OCTOPUS merchant account hold more than one business (tenant), with a new `/settings/businesses` page to see which business is active, switch to another, and create a new one.

**Architecture:** `TenantConfigProvider` moves from a single stored `TenantConfig` to a list of businesses plus an active id. The vertical/type/questions/modules step components the 10-step onboarding wizard already has are extracted into a new `widgets/business-wizard` so a second, shorter wizard (a modal on the new Settings page) can reuse them exactly instead of re-implementing them.

**Tech Stack:** React 18 + TypeScript + Vite SPA (`apps/merchant`), Tailwind, `react-router-dom`, no server — all state is mock/local (localStorage).

## Global Constraints

- TypeScript everywhere. No `.js`/`.jsx`, no `any`. (`AGENTS.md` §6)
- RTL is mandatory: use only logical Tailwind classes (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`) — never `ml-`/`mr-`/`pl-`/`pr-`/`text-left`/`text-right`. (`AGENTS.md` §5)
- Every new string needs both an English and an Arabic translation in `packages/i18n/src/locales/{en,ar}/index.ts`, added as a matched pair at the same location in both files.
- Colors/spacing/type scale: use only the tokens in `AGENTS.md` §5 (e.g. card = `rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]`, page padding = `px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5`). Reuse `@ui/primitives` (`Button`, `Input`, `Badge`, `Modal`, `EmptyState`) rather than hand-rolling equivalents.
- Feature-Sliced import direction is strictly downward (`app > pages > widgets > features > entities > shared`), and every slice's only public surface is its `index.ts` — never deep-import another slice's internals. (`AGENTS.md` §4)
- **No test framework exists in this repo** (no vitest/jest, no `*.test.*` files anywhere under `apps/merchant`). Per `AGENTS.md` §8, the required verification loop is `npx tsc --noEmit` (must print nothing) plus a manual check in the running dev server. Every task below substitutes this loop for the usual "write a failing test" cycle — this is a deliberate adaptation to match the codebase's existing convention, not a shortcut.
- `apps/merchant/src/app/routes/registry.tsx` and `apps/merchant/src/widgets/app-sidebar/index.tsx` are listed in `AGENTS.md` §7.1 as "do not edit unless your task explicitly owns the file." Tasks 5 below explicitly owns both — that is intentional and required to make the new page reachable.
- Never run `npm install` — no new dependency is needed anywhere in this plan.
- Commit messages in this repo are short, imperative, one line, no prefix (see `git log --oneline`) — match that style.

---

### Task 1: Extract `CatalogIcon` / `BRAND_GRADIENT` into `shared/lib`

These two helpers are pure and business-agnostic (an icon-name-to-component resolver and a CSS gradient constant) but currently live under `pages/onboarding/_shared/`, which is private to the onboarding page. Task 2 needs to import them from a widget, and per the FSD rule a widget cannot reach into another page's internals — so they move to `shared/lib` first, where every layer is allowed to import from.

**Files:**
- Create: `apps/merchant/src/shared/lib/catalog-icon.tsx`
- Create: `apps/merchant/src/shared/lib/brand.ts`
- Delete: `apps/merchant/src/pages/onboarding/_shared/icon.tsx`
- Delete: `apps/merchant/src/pages/onboarding/_shared/brand.ts`
- Modify: `apps/merchant/src/pages/onboarding/steps/goals-step.tsx`
- Modify: `apps/merchant/src/pages/onboarding/steps/integrations-step.tsx`
- Modify: `apps/merchant/src/pages/onboarding/steps/data-security-step.tsx`
- Modify: `apps/merchant/src/pages/onboarding/steps/team-workflows-step.tsx`
- Modify: `apps/merchant/src/pages/onboarding/steps/launch-step.tsx`

**Interfaces:**
- Produces: `CatalogIcon({ name, size?, className? })` from `@/shared/lib/catalog-icon`, `BRAND_GRADIENT: string` from `@/shared/lib/brand` — both used by Task 2.

- [ ] **Step 1: Create `shared/lib/catalog-icon.tsx`**

```tsx
// The catalog stores icons as names rather than component references, so it
// stays plain serialisable data that a real API could return unchanged.
// This is the one place those names become components.
import {
  UtensilsCrossed, Stethoscope, PawPrint, Scissors, ShoppingBag,
  Wine, Users, Zap, Coffee, Croissant, ChefHat, Truck, Utensils,
  PartyPopper, Flame, Palmtree, Home,
  Settings, ClipboardList, CreditCard, ReceiptText, BarChart3,
  CalendarClock, Package, Megaphone, UserCog, Wallet, MessageCircle, Plug,
  Heart, Building2, TrendingDown, Sparkles, ShieldCheck, MapPin, Bell, Repeat,
  Box,
} from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  UtensilsCrossed, Stethoscope, PawPrint, Scissors, ShoppingBag,
  Wine, Users, Zap, Coffee, Croissant, ChefHat, Truck, Utensils,
  PartyPopper, Flame, Palmtree, Home,
  Settings, ClipboardList, CreditCard, ReceiptText, BarChart3,
  CalendarClock, Package, Megaphone, UserCog, Wallet, MessageCircle, Plug,
  Heart, Building2, TrendingDown, Sparkles, ShieldCheck, MapPin, Bell, Repeat,
};

export function CatalogIcon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const Component = ICONS[name] ?? Box;
  return <Component size={size} className={className} />;
}
```

- [ ] **Step 2: Create `shared/lib/brand.ts`**

```ts
// The one accent OCTOPUS's setup flow is built around — used for the step
// rail, selected-state icon badges and the login brand panel so all three
// read as the same visual system.
export const BRAND_GRADIENT = "linear-gradient(135deg, #0D6EFD 0%, #6C4DFF 100%)";
```

- [ ] **Step 3: Delete the old helper files**

```bash
rm apps/merchant/src/pages/onboarding/_shared/icon.tsx
rm apps/merchant/src/pages/onboarding/_shared/brand.ts
```

- [ ] **Step 4: Repoint the 5 remaining onboarding steps at the new location**

In `apps/merchant/src/pages/onboarding/steps/goals-step.tsx`, replace:
```ts
import { CatalogIcon } from "../_shared/icon";
import { BRAND_GRADIENT } from "../_shared/brand";
```
with:
```ts
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import { BRAND_GRADIENT } from "@/shared/lib/brand";
```

In `apps/merchant/src/pages/onboarding/steps/integrations-step.tsx`, replace:
```ts
import { BRAND_GRADIENT } from "../_shared/brand";
```
with:
```ts
import { BRAND_GRADIENT } from "@/shared/lib/brand";
```

In `apps/merchant/src/pages/onboarding/steps/data-security-step.tsx`, replace:
```ts
import { CatalogIcon } from "../_shared/icon";
import { BRAND_GRADIENT } from "../_shared/brand";
```
with:
```ts
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import { BRAND_GRADIENT } from "@/shared/lib/brand";
```

In `apps/merchant/src/pages/onboarding/steps/team-workflows-step.tsx`, replace:
```ts
import { CatalogIcon } from "../_shared/icon";
```
with:
```ts
import { CatalogIcon } from "@/shared/lib/catalog-icon";
```

In `apps/merchant/src/pages/onboarding/steps/launch-step.tsx`, replace:
```ts
import { BRAND_GRADIENT } from "../_shared/brand";
```
with:
```ts
import { BRAND_GRADIENT } from "@/shared/lib/brand";
```

- [ ] **Step 5: Typecheck**

Run (from `apps/merchant`): `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Manual check**

Start (or reuse) the dev server on port 5173, open `/onboarding`, and click through steps 3 (Goals), 6 (Integrations), 7 (Data & Security), 8 (Team & Workflows) and 10 (Launch). Every icon must still render (no broken/missing icon boxes) and the gradient accent must still show on selected cards and the step rail — pixel-identical to before this change.

- [ ] **Step 7: Commit**

```bash
git add apps/merchant/src/shared/lib/catalog-icon.tsx apps/merchant/src/shared/lib/brand.ts apps/merchant/src/pages/onboarding/_shared/icon.tsx apps/merchant/src/pages/onboarding/_shared/brand.ts apps/merchant/src/pages/onboarding/steps/goals-step.tsx apps/merchant/src/pages/onboarding/steps/integrations-step.tsx apps/merchant/src/pages/onboarding/steps/data-security-step.tsx apps/merchant/src/pages/onboarding/steps/team-workflows-step.tsx apps/merchant/src/pages/onboarding/steps/launch-step.tsx
git commit -m "Move CatalogIcon and BRAND_GRADIENT to shared/lib"
```

---

### Task 2: Extract `widgets/business-wizard` from the onboarding steps

The vertical/type/questions/modules steps are pure and prop-driven already. Moving them into a widget lets both `pages/onboarding` (the 10-step signup) and the new `pages/settings/businesses` (Task 6) import the exact same components instead of duplicating ~500 lines of JSX.

**Files:**
- Create: `apps/merchant/src/widgets/business-wizard/vertical-step.tsx`
- Create: `apps/merchant/src/widgets/business-wizard/type-step.tsx`
- Create: `apps/merchant/src/widgets/business-wizard/questions-step.tsx`
- Create: `apps/merchant/src/widgets/business-wizard/modules-step.tsx`
- Create: `apps/merchant/src/widgets/business-wizard/index.ts`
- Delete: `apps/merchant/src/pages/onboarding/steps/vertical-step.tsx`
- Delete: `apps/merchant/src/pages/onboarding/steps/type-step.tsx`
- Delete: `apps/merchant/src/pages/onboarding/steps/questions-step.tsx`
- Delete: `apps/merchant/src/pages/onboarding/steps/modules-step.tsx`
- Modify: `apps/merchant/src/pages/onboarding/index.tsx`

**Interfaces:**
- Consumes: `CatalogIcon`, `BRAND_GRADIENT` from Task 1.
- Produces (this is what Task 6 will import): `VerticalStep({ selected: VerticalId | null; onSelect: (id: VerticalId) => void })`, `TypeStep({ selected: TypeCode | null; onSelect: (code: TypeCode) => void })`, `QuestionsStep({ type: TypeCode; answers: Answers; onAnswer: (questionId: string, optionId: string) => void })`, `ModulesStep({ type: TypeCode; answers: Answers; enabled: readonly ModuleId[]; onToggle: (id: ModuleId, next: boolean) => void })`, and `type Answers = Record<string, string>` — all exported from `@/widgets/business-wizard`.

- [ ] **Step 1: Create `widgets/business-wizard/vertical-step.tsx`**

```tsx
// Step 1 — which business is this? OCTOPUS is multi-vertical, and this single
// choice decides which product the merchant ends up with.
//
// Only restaurants can be provisioned today. The rest are shown honestly as
// "coming soon" with an interest capture, rather than hidden (which would
// misrepresent the platform) or faked (which would misrepresent the product).
import { useState } from "react";
import { Check, Lock } from "lucide-react";
import clsx from "clsx";
import { verticals, type VerticalId } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import { BRAND_GRADIENT } from "@/shared/lib/brand";

export function VerticalStep({
  selected,
  onSelect,
}: {
  selected: VerticalId | null;
  onSelect: (id: VerticalId) => void;
}) {
  const { t } = useI18n();
  const [notified, setNotified] = useState<VerticalId | null>(null);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {verticals.map((vertical) => {
        const available = vertical.status === "available";
        const active = selected === vertical.id;

        return (
          <article
            key={vertical.id}
            className={clsx(
              "relative flex flex-col rounded-xl border p-[18px] transition-all duration-200",
              active
                ? "border-[#0D6EFD] bg-[var(--octo-selected)] shadow-[0_0_0_3px_rgba(13,110,253,0.08)]"
                : "border-[var(--octo-border-card)] bg-[var(--octo-card)] hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]",
              !available && "opacity-75"
            )}
          >
            <button
              type="button"
              disabled={!available}
              onClick={() => onSelect(vertical.id)}
              className={clsx("flex flex-1 flex-col text-start", available ? "cursor-pointer" : "cursor-default")}
            >
              <span
                className={clsx(
                  "grid h-10 w-10 place-items-center rounded-[10px] transition-colors",
                  active ? "text-white" : "bg-[var(--octo-hover)] text-[var(--octo-text-secondary)]"
                )}
                style={active ? { background: BRAND_GRADIENT } : undefined}
              >
                <CatalogIcon name={vertical.icon} size={19} />
              </span>

              <h3 className="mt-3 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
                {t(vertical.nameKey)}
              </h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--octo-text-muted)]">
                {t(vertical.descKey)}
              </p>
            </button>

            {active && (
              <span
                className="absolute end-3 top-3 grid h-5 w-5 place-items-center rounded-full text-white"
                style={{ background: BRAND_GRADIENT }}
              >
                <Check size={11} strokeWidth={3} />
              </span>
            )}

            {!available && (
              <div className="mt-3 border-t border-[var(--octo-divider)] pt-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--octo-hover)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--octo-text-muted)]">
                  <Lock size={10} />
                  {t("onboarding.vertical.comingSoon")}
                </span>
                {notified === vertical.id ? (
                  <p className="mt-2 text-[11px] text-[#16a34a]">{t("onboarding.vertical.notified")}</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setNotified(vertical.id)}
                    className="mt-2 block text-[11px] font-medium text-[#0D6EFD] hover:underline"
                  >
                    {t("onboarding.vertical.notifyMe")}
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `widgets/business-wizard/type-step.tsx`**

```tsx
// Step 2 — which of the twelve restaurant types is this?
//
// The type is the single highest-leverage answer in the whole flow: it drives
// which modules switch on, which questions get asked at all, and what the
// dashboard looks like afterwards. So each card carries a definition plus a
// "right for you if…" line to help a merchant place themselves correctly.
import { Check } from "lucide-react";
import clsx from "clsx";
import { restaurantTypes, type TypeCode } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import { BRAND_GRADIENT } from "@/shared/lib/brand";

export function TypeStep({
  selected,
  onSelect,
}: {
  selected: TypeCode | null;
  onSelect: (code: TypeCode) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {restaurantTypes.map((type) => {
        const active = selected === type.code;
        return (
          <button
            key={type.code}
            type="button"
            onClick={() => onSelect(type.code)}
            className={clsx(
              "relative flex flex-col rounded-xl border p-[18px] text-start transition-all duration-200",
              active
                ? "border-[#0D6EFD] bg-[var(--octo-selected)] shadow-[0_0_0_3px_rgba(13,110,253,0.08)]"
                : "border-[var(--octo-border-card)] bg-[var(--octo-card)] hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
            )}
          >
            {active && (
              <span
                className="absolute end-3 top-3 grid h-5 w-5 place-items-center rounded-full text-white"
                style={{ background: BRAND_GRADIENT }}
              >
                <Check size={11} strokeWidth={3} />
              </span>
            )}

            <span
              className={clsx(
                "grid h-9 w-9 place-items-center rounded-[9px] transition-colors",
                active ? "text-white" : "bg-[var(--octo-hover)] text-[var(--octo-text-secondary)]"
              )}
              style={active ? { background: BRAND_GRADIENT } : undefined}
            >
              <CatalogIcon name={type.icon} size={17} />
            </span>

            <h3 className="mt-3 text-[13px] font-semibold text-[var(--octo-text-primary)]">
              {t(type.nameKey)}
            </h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--octo-text-muted)]">
              {t(type.descKey)}
            </p>
            <p className="mt-2 border-t border-[var(--octo-divider)] pt-2 text-[11px] leading-relaxed text-[var(--octo-text-secondary)]">
              {t(type.fitKey)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create `widgets/business-wizard/questions-step.tsx`**

```tsx
// Step 3 — questions in the merchant's own language, never about "modules".
//
// The question list is not fixed: `questionsFor` drops anything the chosen
// type makes irrelevant. A cloud kitchen is never asked about tables, and a
// home kitchen is never asked about staff shifts — not because those
// questions are hidden, but because the SRS capability matrix says they do
// not apply to that segment.
import { Check } from "lucide-react";
import clsx from "clsx";
import { questionsFor, type Question, type TypeCode } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";

export type Answers = Record<string, string>;

export function QuestionsStep({
  type,
  answers,
  onAnswer,
}: {
  type: TypeCode;
  answers: Answers;
  onAnswer: (questionId: string, optionId: string) => void;
}) {
  const { t } = useI18n();
  const list = questionsFor(type);

  return (
    <div className="flex flex-col gap-3">
      {list.map((question, index) => (
        <QuestionCard
          key={question.id}
          index={index + 1}
          question={question}
          selected={answers[question.id]}
          onSelect={(optionId) => onAnswer(question.id, optionId)}
          t={t}
        />
      ))}
    </div>
  );
}

function QuestionCard({
  index,
  question,
  selected,
  onSelect,
  t,
}: {
  index: number;
  question: Question;
  selected: string | undefined;
  onSelect: (optionId: string) => void;
  t: (key: string) => string;
}) {
  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--octo-hover)] text-[10.5px] font-semibold text-[var(--octo-text-secondary)]">
          {index}
        </span>
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t(question.textKey)}</h3>
          {question.helpKey && (
            <p className="mt-0.5 text-[11.5px] text-[var(--octo-text-muted)]">{t(question.helpKey)}</p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {question.options.map((option) => {
          const active = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              aria-pressed={active}
              className={clsx(
                "flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-start text-[12.5px] transition-colors",
                active
                  ? "border-[#0D6EFD] bg-[var(--octo-selected)] font-medium text-[#0D6EFD]"
                  : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
              )}
            >
              {t(option.labelKey)}
              {active && (
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#0D6EFD] text-white">
                  <Check size={9} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create `widgets/business-wizard/modules-step.tsx`**

```tsx
// Step 5 — what we recommend, why, and what it costs.
//
// Three groups, deliberately: what is always included (no decision to make),
// what we switched on for this merchant (with the reason we did it), and what
// they could add. Modules the type marks `na` never appear at all — offering a
// cloud kitchen a table-reservations upsell would be noise, not revenue.
import { Info, Lock } from "lucide-react";
import clsx from "clsx";
import {
  addOnModules, availabilityFor, baseModuleIds, dependentsOf, formatSar,
  getModule, questionsFor, type ModuleId, type TypeCode,
} from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import { BRAND_GRADIENT } from "@/shared/lib/brand";
import type { Answers } from "./questions-step";

/** Why a module ended up switched on, in the merchant's own terms. */
function reasonFor(
  moduleId: ModuleId,
  type: TypeCode,
  answers: Answers,
  t: (key: string) => string
): string {
  const availability = availabilityFor(type, moduleId);
  if (availability === "core") return t("onboarding.reason.core");

  // Prefer quoting the merchant's own answer back at them when one caused it.
  for (const question of questionsFor(type)) {
    const answerId = answers[question.id];
    if (!answerId) continue;
    const option = question.options.find((o) => o.id === answerId);
    if (option?.enables.includes(moduleId)) {
      return t("onboarding.reason.answer").replace("{answer}", t(option.labelKey));
    }
  }

  if (availability === "recommended") return t("onboarding.reason.recommended");
  return t("onboarding.reason.added");
}

export function ModulesStep({
  type,
  answers,
  enabled,
  onToggle,
}: {
  type: TypeCode;
  answers: Answers;
  enabled: readonly ModuleId[];
  onToggle: (id: ModuleId, next: boolean) => void;
}) {
  const { t, locale } = useI18n();

  // `na` modules are dropped entirely — they are not part of this product for
  // this business type, so they are not shown even as a locked upsell.
  const applicable = addOnModules.filter((m) => availabilityFor(type, m.id) !== "na");
  const selected = applicable.filter((m) => enabled.includes(m.id));
  const available = applicable.filter((m) => !enabled.includes(m.id));

  return (
    <div className="flex flex-col gap-3">
      {/* Always included */}
      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <h3 className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
          <Lock size={11} /> {t("onboarding.baseSection")}
        </h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {baseModuleIds.map((id) => {
            const module = getModule(id);
            if (!module) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--octo-hover)] px-2.5 py-1 text-[11.5px] text-[var(--octo-text-secondary)]"
              >
                <CatalogIcon name={module.icon} size={12} />
                {t(module.nameKey)}
              </span>
            );
          })}
        </div>
      </section>

      {selected.length > 0 && (
        <ModuleGroup
          titleKey="onboarding.recommendedSection"
          modules={selected}
          enabled
          type={type}
          answers={answers}
          onToggle={onToggle}
          t={t}
          locale={locale}
        />
      )}

      {available.length > 0 && (
        <ModuleGroup
          titleKey="onboarding.optionalSection"
          modules={available}
          enabled={false}
          type={type}
          answers={answers}
          onToggle={onToggle}
          t={t}
          locale={locale}
        />
      )}
    </div>
  );
}

function ModuleGroup({
  titleKey, modules, enabled, type, answers, onToggle, t, locale,
}: {
  titleKey: string;
  modules: ReturnType<typeof addOnModules.filter>;
  enabled: boolean;
  type: TypeCode;
  answers: Answers;
  onToggle: (id: ModuleId, next: boolean) => void;
  t: (key: string) => string;
  locale: string;
}) {
  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
        {t(titleKey)}
      </h3>

      <div className="mt-3 flex flex-col gap-2">
        {modules.map((module) => {
          const dependents = enabled
            ? dependentsOf(module.id).filter((d) => modules.some((m) => m.id === d.id))
            : [];
          const requires = module.dependencies
            ?.map((d) => getModule(d))
            .filter((d): d is NonNullable<typeof d> => Boolean(d) && !baseModuleIds.includes(d!.id));

          return (
            <div
              key={module.id}
              className={clsx(
                "flex flex-wrap items-center gap-3 rounded-[10px] border px-3 py-2.5",
                enabled ? "border-[#0D6EFD]/30 bg-[var(--octo-selected)]" : "border-[var(--octo-border-input)]"
              )}
            >
              <span
                className={clsx(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-[8px]",
                  enabled ? "text-white" : "bg-[var(--octo-hover)] text-[var(--octo-text-muted)]"
                )}
                style={enabled ? { background: BRAND_GRADIENT } : undefined}
              >
                <CatalogIcon name={module.icon} size={15} />
              </span>

              <div className="min-w-[160px] flex-1">
                <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t(module.nameKey)}</p>
                <p className="mt-0.5 text-[11px] text-[var(--octo-text-muted)]">{t(module.descKey)}</p>
                {enabled && (
                  <p className="mt-1 flex items-center gap-1 text-[10.5px] text-[#0D6EFD]">
                    <Info size={10} />
                    {reasonFor(module.id, type, answers, t)}
                  </p>
                )}
                {!enabled && requires && requires.length > 0 && (
                  <p className="mt-1 text-[10.5px] text-[var(--octo-text-faint)]">
                    {t("onboarding.requiresNote").replace("{name}", t(requires[0].nameKey))}
                  </p>
                )}
              </div>

              <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                {module.price === null
                  ? t("pricing.onRequest")
                  : `${formatSar(module.price, locale)} ${t("pricing.perMonth")}`}
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={t(module.nameKey)}
                onClick={() => onToggle(module.id, !enabled)}
                title={
                  dependents.length > 0
                    ? t("onboarding.requiresNote").replace("{name}", t(dependents[0].nameKey))
                    : undefined
                }
                className={clsx(
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                  !enabled && "bg-[var(--octo-switch-off)]"
                )}
                style={enabled ? { background: BRAND_GRADIENT } : undefined}
              >
                <span
                  className={clsx(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-[var(--octo-knob)] shadow transition-all",
                    enabled ? "start-[18px]" : "start-0.5"
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create `widgets/business-wizard/index.ts`**

```ts
// widgets/business-wizard
// The provisioning steps shared by the 10-step signup flow and the shorter
// "create another business" wizard in Settings → My Businesses: pick a
// vertical, pick a type, answer the qualifying questions, review modules.
// This index.ts is the ONLY file other slices/layers may import from.
export { VerticalStep } from "./vertical-step";
export { TypeStep } from "./type-step";
export { QuestionsStep, type Answers } from "./questions-step";
export { ModulesStep } from "./modules-step";
```

- [ ] **Step 6: Delete the old step files**

```bash
rm apps/merchant/src/pages/onboarding/steps/vertical-step.tsx
rm apps/merchant/src/pages/onboarding/steps/type-step.tsx
rm apps/merchant/src/pages/onboarding/steps/questions-step.tsx
rm apps/merchant/src/pages/onboarding/steps/modules-step.tsx
```

- [ ] **Step 7: Repoint `pages/onboarding/index.tsx`**

Replace this block:
```ts
import { VerticalStep } from "./steps/vertical-step";
import { TypeStep } from "./steps/type-step";
import { GoalsStep } from "./steps/goals-step";
import { QuestionsStep, type Answers } from "./steps/questions-step";
import { ModulesStep } from "./steps/modules-step";
import { IntegrationsStep } from "./steps/integrations-step";
```
with:
```ts
import { VerticalStep, TypeStep, QuestionsStep, ModulesStep, type Answers } from "@/widgets/business-wizard";
import { GoalsStep } from "./steps/goals-step";
import { IntegrationsStep } from "./steps/integrations-step";
```

- [ ] **Step 8: Typecheck**

Run (from `apps/merchant`): `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 9: Manual check**

Open `/onboarding` and click all the way through the 10 steps end to end: pick a vertical, pick a type, answer at least one qualifying question, toggle a module on the Modules step, finish through Review and Launch, and confirm `handleCreate` still lands you on the dashboard (`/`). Behavior and visuals must be identical to before this task.

- [ ] **Step 10: Commit**

```bash
git add apps/merchant/src/widgets/business-wizard apps/merchant/src/pages/onboarding/index.tsx apps/merchant/src/pages/onboarding/steps/vertical-step.tsx apps/merchant/src/pages/onboarding/steps/type-step.tsx apps/merchant/src/pages/onboarding/steps/questions-step.tsx apps/merchant/src/pages/onboarding/steps/modules-step.tsx
git commit -m "Extract vertical/type/questions/modules steps into widgets/business-wizard"
```

---

### Task 3: Multi-business `TenantConfigProvider`

Replace the single-tenant store with a list of businesses plus an active id, migrating any existing single-tenant `localStorage` session automatically.

**Files:**
- Modify: `apps/merchant/src/app/providers/tenant-config-provider.tsx` (full rewrite)
- Modify: `apps/merchant/src/pages/onboarding/index.tsx`

**Interfaces:**
- Consumes: `catalogModules`, `baseModuleIds`, `computePrice`, `ModuleId`, `PriceBreakdown`, `TypeCode`, `VerticalId` from `@/shared/catalog` (unchanged).
- Produces (used by Task 5 and Task 6): `useTenantConfig()` returning `{ businesses: TenantConfig[]; activeBusiness: TenantConfig | null; activeTenantId: string | null; isProvisioned: boolean; isModuleEnabled: (id: ModuleId) => boolean; price: PriceBreakdown; createBusiness: (config: Omit<TenantConfig, "id" | "createdAt">) => void; switchBusiness: (id: string) => void; updateModules: (modules: ModuleId[]) => void; resetConfig: () => void }`, and `interface TenantConfig { id: string; vertical: VerticalId; businessType: TypeCode; enabledModules: ModuleId[]; branchCount: number; businessName: string; createdAt: string }`. Both exported from `@/app/providers/tenant-config-provider`.
- Breaking rename other tasks must account for: `config` → `activeBusiness`, `saveConfig` → `createBusiness`.

- [ ] **Step 1: Rewrite `tenant-config-provider.tsx`**

```tsx
// What this tenant actually bought — the vertical, business type, enabled
// modules and branch count chosen during onboarding.
//
// This is the entitlement source of truth: the sidebar and route guards read
// it to decide what exists for this merchant. A cloud kitchen genuinely has
// no Reservations section, rather than a greyed-out one.
//
// An account can hold more than one business (e.g. a restaurant and a salon)
// — `businesses` is the full list, `activeTenantId` picks which one drives
// the sidebar and module gating right now. Only name/vertical/type/modules
// change on switch; every other page still reads the same shared mock data
// regardless of which business is active (see docs/superpowers/specs/
// 2026-08-17-multi-business-switcher-design.md).
//
// MOCK PERSISTENCE — the backend does not exist yet, so config is written to
// localStorage, mirroring auth-provider. Swap for GET /tenants + GET
// /tenants/active later.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  baseModuleIds,
  catalogModules,
  computePrice,
  type ModuleId,
  type PriceBreakdown,
  type TypeCode,
  type VerticalId,
} from "@/shared/catalog";

const TENANTS_KEY = "octopus.tenants";
const ACTIVE_ID_KEY = "octopus.activeTenantId";
const LEGACY_SINGLE_KEY = "octopus.tenant";

export interface TenantConfig {
  id: string;
  vertical: VerticalId;
  businessType: TypeCode;
  enabledModules: ModuleId[];
  branchCount: number;
  businessName: string;
  createdAt: string;
}

interface TenantConfigContextValue {
  /** Every business this account owns, most recently created last. */
  businesses: TenantConfig[];
  /** The business currently driving the sidebar and module gating. */
  activeBusiness: TenantConfig | null;
  activeTenantId: string | null;
  /** True once onboarding has produced at least one business. */
  isProvisioned: boolean;
  isModuleEnabled: (id: ModuleId) => boolean;
  price: PriceBreakdown;
  /** Adds a new business, generating its id, and makes it the active one. */
  createBusiness: (config: Omit<TenantConfig, "id" | "createdAt">) => void;
  switchBusiness: (id: string) => void;
  updateModules: (modules: ModuleId[]) => void;
  resetConfig: () => void;
}

const TenantConfigContext = createContext<TenantConfigContextValue | null>(null);

/**
 * Every module, used as the fallback when no business exists. An
 * unprovisioned session — an existing user from before onboarding shipped,
 * or someone landing on a deep link — must see the full console, never an
 * empty one.
 */
const ALL_MODULE_IDS: ModuleId[] = catalogModules.map((m) => m.id);

function generateTenantId(): string {
  return `tenant-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** A stored business with no modules would lock the merchant out of their
 * own console, so it is treated as corrupt and dropped rather than trusted. */
function isValidTenant(value: unknown): value is TenantConfig {
  const t = value as Partial<TenantConfig> | null;
  return !!t && typeof t.id === "string" && Array.isArray(t.enabledModules) && t.enabledModules.length > 0;
}

/** Wraps a pre-multi-business session (a single `octopus.tenant` object)
 * into the list shape, so existing demo sessions keep working unchanged. */
function migrateLegacyTenant(): TenantConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_SINGLE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Omit<TenantConfig, "id"> & { id?: string };
    if (!Array.isArray(parsed.enabledModules) || parsed.enabledModules.length === 0) return [];
    return [{ ...parsed, id: parsed.id ?? generateTenantId() }];
  } catch {
    return [];
  }
}

function readState(): { businesses: TenantConfig[]; activeTenantId: string | null } {
  if (typeof window === "undefined") return { businesses: [], activeTenantId: null };

  try {
    const raw = window.localStorage.getItem(TENANTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown[];
      const businesses = parsed.filter(isValidTenant);
      const storedActiveId = window.localStorage.getItem(ACTIVE_ID_KEY);
      const activeTenantId = businesses.some((b) => b.id === storedActiveId)
        ? storedActiveId
        : businesses[0]?.id ?? null;
      return { businesses, activeTenantId };
    }
  } catch {
    // fall through to the legacy migration below
  }

  const migrated = migrateLegacyTenant();
  return { businesses: migrated, activeTenantId: migrated[0]?.id ?? null };
}

export function TenantConfigProvider({ children }: { children: ReactNode }) {
  const [businesses, setBusinesses] = useState<TenantConfig[]>(() => readState().businesses);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(() => readState().activeTenantId);

  useEffect(() => {
    if (businesses.length > 0) {
      window.localStorage.setItem(TENANTS_KEY, JSON.stringify(businesses));
      window.localStorage.removeItem(LEGACY_SINGLE_KEY);
    } else {
      window.localStorage.removeItem(TENANTS_KEY);
    }
  }, [businesses]);

  useEffect(() => {
    if (activeTenantId) {
      window.localStorage.setItem(ACTIVE_ID_KEY, activeTenantId);
    } else {
      window.localStorage.removeItem(ACTIVE_ID_KEY);
    }
  }, [activeTenantId]);

  const activeBusiness = useMemo(
    () => businesses.find((b) => b.id === activeTenantId) ?? null,
    [businesses, activeTenantId]
  );

  const activeModules = useMemo<ModuleId[]>(() => {
    if (!activeBusiness) return ALL_MODULE_IDS;
    // Base modules are part of the subscription and can never be missing,
    // even if a stale stored config somehow omits them.
    return Array.from(new Set([...baseModuleIds, ...activeBusiness.enabledModules]));
  }, [activeBusiness]);

  const isModuleEnabled = useCallback(
    (id: ModuleId) => activeModules.includes(id),
    [activeModules]
  );

  const price = useMemo(
    () => computePrice(activeModules, activeBusiness?.branchCount ?? 1),
    [activeModules, activeBusiness?.branchCount]
  );

  const createBusiness = useCallback((config: Omit<TenantConfig, "id" | "createdAt">) => {
    const next: TenantConfig = { ...config, id: generateTenantId(), createdAt: new Date().toISOString() };
    setBusinesses((prev) => [...prev, next]);
    setActiveTenantId(next.id);
  }, []);

  const switchBusiness = useCallback((id: string) => {
    setActiveTenantId(id);
  }, []);

  const updateModules = useCallback((modules: ModuleId[]) => {
    setBusinesses((prev) =>
      prev.map((b) => (b.id === activeTenantId ? { ...b, enabledModules: modules } : b))
    );
  }, [activeTenantId]);

  const resetConfig = useCallback(() => {
    setBusinesses([]);
    setActiveTenantId(null);
  }, []);

  const value: TenantConfigContextValue = {
    businesses,
    activeBusiness,
    activeTenantId,
    isProvisioned: businesses.length > 0,
    isModuleEnabled,
    price,
    createBusiness,
    switchBusiness,
    updateModules,
    resetConfig,
  };

  return <TenantConfigContext.Provider value={value}>{children}</TenantConfigContext.Provider>;
}

export function useTenantConfig(): TenantConfigContextValue {
  const ctx = useContext(TenantConfigContext);
  if (!ctx) throw new Error("useTenantConfig must be used within TenantConfigProvider");
  return ctx;
}
```

- [ ] **Step 2: Update `pages/onboarding/index.tsx` to call `createBusiness`**

Replace:
```ts
  const { saveConfig } = useTenantConfig();
```
with:
```ts
  const { createBusiness } = useTenantConfig();
```

Replace:
```ts
  function handleCreate() {
    if (!vertical || !type) return;
    saveConfig({
      vertical,
      businessType: type,
      enabledModules: enabled,
      branchCount,
      businessName: details.businessName.trim() || "My Business",
    });
    signIn(details.email.trim() || "owner@octopus.sa");
    navigate("/", { replace: true });
  }
```
with:
```ts
  function handleCreate() {
    if (!vertical || !type) return;
    createBusiness({
      vertical,
      businessType: type,
      enabledModules: enabled,
      branchCount,
      businessName: details.businessName.trim() || "My Business",
    });
    signIn(details.email.trim() || "owner@octopus.sa");
    navigate("/", { replace: true });
  }
```

- [ ] **Step 3: Typecheck**

Run (from `apps/merchant`): `npx tsc --noEmit`
Expected: no output. (`widgets/app-sidebar/index.tsx` only calls `isModuleEnabled`, which keeps the same signature, so it needs no change.)

- [ ] **Step 4: Manual check — migration and fresh flow**

1. In the dev server, open devtools → Application → Local Storage and manually set a legacy session to confirm migration:
   ```js
   localStorage.setItem("octopus.tenant", JSON.stringify({ vertical: "restaurants", businessType: "T2", enabledModules: ["core","orders","payments","tax","reports","bookings"], branchCount: 1, businessName: "Legacy Diner", createdAt: new Date().toISOString() }));
   localStorage.removeItem("octopus.tenants");
   localStorage.removeItem("octopus.activeTenantId");
   ```
   Reload the app. Confirm the sidebar still shows the Reservations group (bookings module) and `localStorage.getItem("octopus.tenants")` now holds a one-item array with a generated `id`, and `octopus.tenant` is gone after the next state write.
2. Clear all `octopus.*` keys and go through `/onboarding` fresh — confirm it still creates a business and lands on the dashboard with the right modules visible.

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src/app/providers/tenant-config-provider.tsx apps/merchant/src/pages/onboarding/index.tsx
git commit -m "Support multiple businesses per account in TenantConfigProvider"
```

---

### Task 4: i18n keys for the My Businesses page

**Files:**
- Modify: `packages/i18n/src/locales/en/index.ts`
- Modify: `packages/i18n/src/locales/ar/index.ts`

**Interfaces:**
- Produces: the `settings.businesses.*` keys Task 5 and Task 6 call `t(...)` with.

- [ ] **Step 1: Add English keys**

In `packages/i18n/src/locales/en/index.ts`, replace:
```ts
  "settings.branches.editNote": "Editing branches is coming soon in the demo",

  /* settings — devices */
```
with:
```ts
  "settings.branches.editNote": "Editing branches is coming soon in the demo",

  /* settings — businesses (multi-business switcher) */
  "settings.businesses.title": "My Businesses",
  "settings.businesses.subtitle": "Every business you run under this account, and which one is active right now",
  "settings.businesses.create": "Create New Business",
  "settings.businesses.active": "Active",
  "settings.businesses.switch": "Switch to this business",
  "settings.businesses.switched": "Switched to {name}",
  "settings.businesses.branchCount": "{n} branches",
  "settings.businesses.emptyTitle": "No businesses yet",
  "settings.businesses.emptyBody": "Create your first business to start using OCTOPUS",
  "settings.businesses.wizard.title": "Create a New Business",
  "settings.businesses.wizard.nameLabel": "Business Name",
  "settings.businesses.wizard.namePlaceholder": "e.g. Sunset Grill",
  "settings.businesses.wizard.create": "Create Business",
  "settings.businesses.created": "{name} created",

  /* settings — devices */
```

- [ ] **Step 2: Add Arabic keys**

In `packages/i18n/src/locales/ar/index.ts`, replace:
```ts
  "settings.branches.editNote": "تعديل الفروع قريبًا في النسخة التجريبية",

  /* settings — devices */
```
with:
```ts
  "settings.branches.editNote": "تعديل الفروع قريبًا في النسخة التجريبية",

  /* settings — businesses (multi-business switcher) */
  "settings.businesses.title": "أعمالي التجارية",
  "settings.businesses.subtitle": "جميع الأعمال التجارية التي تديرها بنفس الحساب، والعمل النشط حاليًا",
  "settings.businesses.create": "إنشاء عمل تجاري جديد",
  "settings.businesses.active": "نشط",
  "settings.businesses.switch": "التبديل إلى هذا العمل",
  "settings.businesses.switched": "تم التبديل إلى {name}",
  "settings.businesses.branchCount": "{n} فرع",
  "settings.businesses.emptyTitle": "لا توجد أعمال تجارية بعد",
  "settings.businesses.emptyBody": "أنشئ عملك التجاري الأول لبدء استخدام أوكتوبس",
  "settings.businesses.wizard.title": "إنشاء عمل تجاري جديد",
  "settings.businesses.wizard.nameLabel": "اسم العمل التجاري",
  "settings.businesses.wizard.namePlaceholder": "مثال: مطعم الغروب",
  "settings.businesses.wizard.create": "إنشاء العمل التجاري",
  "settings.businesses.created": "تم إنشاء {name}",

  /* settings — devices */
```

- [ ] **Step 3: Typecheck**

Run (from `apps/merchant`): `npx tsc --noEmit`
Expected: no output. This type-checks `packages/i18n` transitively via the `@i18n/index` alias, so a syntax error in either dictionary (e.g. a stray or missing comma) fails this build — a clean run confirms both files still parse.

- [ ] **Step 4: Commit**

```bash
git add packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "Add i18n keys for the My Businesses settings page"
```

---

### Task 5: `My Businesses` page — list, switch, routing, sidebar

Ships a working page: every business the account owns, which one is active, and a way to switch. The "create" button and modal are added in Task 6 so this task is reviewable on its own.

**Files:**
- Create: `apps/merchant/src/pages/settings/businesses/index.tsx`
- Modify: `apps/merchant/src/app/routes/registry.tsx`
- Modify: `apps/merchant/src/widgets/app-sidebar/index.tsx`

**Interfaces:**
- Consumes: `useTenantConfig()` and `TenantConfig` from Task 3; `getVertical`, `getRestaurantType` from `@/shared/catalog`; `settings.businesses.*` keys from Task 4.
- Produces: `BusinessesSettingsPage` component, exported for the router — and for Task 6 to extend in place.

- [ ] **Step 1: Create `pages/settings/businesses/index.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Building2, CircleCheck } from "lucide-react";
import { Badge, Button, EmptyState } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig, type TenantConfig } from "@/app/providers/tenant-config-provider";
import { getRestaurantType, getVertical } from "@/shared/catalog";

function formatCreatedAt(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
    numberingSystem: "latn",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function BusinessCard({
  business,
  active,
  onSwitch,
}: {
  business: TenantConfig;
  active: boolean;
  onSwitch: () => void;
}) {
  const { t, locale } = useI18n();
  const vertical = getVertical(business.vertical);
  const type = getRestaurantType(business.businessType);

  return (
    <article className="flex flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
            {business.businessName}
          </p>
          <p className="mt-1 text-[11px] text-[var(--octo-text-muted)]">
            {t("settings.businesses.branchCount").replace("{n}", String(business.branchCount))}
            {" · "}
            {formatCreatedAt(business.createdAt, locale)}
          </p>
        </div>
        {active && <Badge tone="success">{t("settings.businesses.active")}</Badge>}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {vertical && <Badge tone="neutral">{t(vertical.nameKey)}</Badge>}
        {type && <Badge tone="neutral">{t(type.nameKey)}</Badge>}
      </div>

      <div className="mt-auto pt-4">
        {active ? (
          <Button variant="secondary" size="sm" className="w-full" disabled>
            {t("settings.businesses.active")}
          </Button>
        ) : (
          <Button variant="primary" size="sm" className="w-full" onClick={onSwitch}>
            {t("settings.businesses.switch")}
          </Button>
        )}
      </div>
    </article>
  );
}

export function BusinessesSettingsPage() {
  const { t } = useI18n();
  const { businesses, activeTenantId, switchBusiness } = useTenantConfig();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  function handleSwitch(business: TenantConfig) {
    switchBusiness(business.id);
    setToast(t("settings.businesses.switched").replace("{name}", business.businessName));
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header>
        <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
          {t("settings.businesses.title")}
        </h1>
        <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
          {t("settings.businesses.subtitle")}
        </p>
      </header>

      <section className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
            {t("settings.businesses.title")}
          </h2>
          <span className="text-[11.5px] text-[var(--octo-text-faint)]">{businesses.length}</span>
        </div>

        {businesses.length === 0 ? (
          <EmptyState
            icon={<Building2 size={18} />}
            title={t("settings.businesses.emptyTitle")}
            description={t("settings.businesses.emptyBody")}
          />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                active={business.id === activeTenantId}
                onSwitch={() => handleSwitch(business)}
              />
            ))}
          </div>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-[9px] border border-[#22C55E]/20 bg-[#22C55E]/10 px-4 py-2.5 text-[12.5px] font-medium text-[#16a34a] shadow-lg">
          <CircleCheck size={14} className="text-[#22C55E]" />
          {toast}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Register the route**

In `apps/merchant/src/app/routes/registry.tsx`, insert this entry right before the `settings-business` entry (i.e. right after the `settings` bridge route):
```ts
  { id: "settings-businesses", path: "/settings/businesses", section: "Settings", page: "My Businesses",
    element: lazy(() => import("@/pages/settings/businesses").then(m => ({ default: m.BusinessesSettingsPage }))) },
```

So the surrounding block reads:
```ts
  { id: "settings",     path: "/settings",     section: "Settings",     page: "Integrations",
    element: lazy(() => import("@/pages/settings").then(m => ({ default: m.SettingsPage }))) },
  { id: "settings-businesses", path: "/settings/businesses", section: "Settings", page: "My Businesses",
    element: lazy(() => import("@/pages/settings/businesses").then(m => ({ default: m.BusinessesSettingsPage }))) },
  { id: "settings-business", path: "/settings/business", section: "Settings", page: "Business & Legal Entities",
    element: lazy(() => import("@/pages/settings/business").then(m => ({ default: m.BusinessSettingsPage }))) },
```

- [ ] **Step 3: Add the sidebar entry**

In `apps/merchant/src/widgets/app-sidebar/index.tsx`, replace:
```ts
const FOOTER_GROUPS: NavGroup[] = [
  { id: "settings", label: "Settings", icon: Settings,
    items: ["Business & Legal Entities", "Branches & Sections", "Devices & Printers", "Roles & Permissions", "Tax Profile", "Restaurant Type & Modules", "Integrations"] },
];
```
with:
```ts
const FOOTER_GROUPS: NavGroup[] = [
  { id: "settings", label: "Settings", icon: Settings,
    items: ["My Businesses", "Business & Legal Entities", "Branches & Sections", "Devices & Printers", "Roles & Permissions", "Tax Profile", "Restaurant Type & Modules", "Integrations"] },
];
```

Then replace:
```ts
  "Business & Legal Entities": "/settings/business",
```
with:
```ts
  "My Businesses": "/settings/businesses",
  "Business & Legal Entities": "/settings/business",
```

- [ ] **Step 4: Typecheck**

Run (from `apps/merchant`): `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Manual check**

1. Open the dev server, sign in (or complete onboarding if starting fresh), and click Settings in the sidebar — confirm "My Businesses" is the first sub-item and navigates to `/settings/businesses`.
2. Confirm the one existing business shows with the "Active" badge and a disabled "Active" button (no "Switch" button on it, since it's the only business).
3. Switch to Arabic (via whatever existing language control the app uses, or `localStorage.setItem("octopus.locale","ar")` + reload) and confirm the page mirrors correctly in RTL with no layout breakage.

- [ ] **Step 6: Commit**

```bash
git add apps/merchant/src/pages/settings/businesses apps/merchant/src/app/routes/registry.tsx apps/merchant/src/widgets/app-sidebar/index.tsx
git commit -m "Add My Businesses settings page with switch support"
```

---

### Task 6: Create Business modal wizard

Adds the "+ Create New Business" entry point and the compact modal wizard (name → vertical → type → questions → modules) that calls `createBusiness`.

**Files:**
- Modify: `apps/merchant/src/pages/settings/businesses/index.tsx`

**Interfaces:**
- Consumes: `VerticalStep`, `TypeStep`, `QuestionsStep`, `ModulesStep`, `type Answers` from `@/widgets/business-wizard` (Task 2); `createBusiness` from `useTenantConfig()` (Task 3); `defaultModulesFor`, `questionsFor`, `withDependencies`, `withoutDependents`, `baseModuleIds`, `type ModuleId`, `type TypeCode`, `type VerticalId` from `@/shared/catalog`; `Modal`, `Input` from `@ui/primitives`.

- [ ] **Step 1: Add the `CreateBusinessModal` component and wire it into the page**

Replace the full contents of `apps/merchant/src/pages/settings/businesses/index.tsx` with:

```tsx
import { useEffect, useMemo, useState } from "react";
import { Building2, CircleCheck, Plus } from "lucide-react";
import { Badge, Button, EmptyState, Input, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig, type TenantConfig } from "@/app/providers/tenant-config-provider";
import {
  baseModuleIds, defaultModulesFor, getRestaurantType, getVertical, questionsFor,
  withDependencies, withoutDependents,
  type ModuleId, type TypeCode, type VerticalId,
} from "@/shared/catalog";
import { VerticalStep, TypeStep, QuestionsStep, ModulesStep, type Answers } from "@/widgets/business-wizard";

const WIZARD_TOTAL_STEPS = 5;

function formatCreatedAt(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
    numberingSystem: "latn",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function BusinessCard({
  business,
  active,
  onSwitch,
}: {
  business: TenantConfig;
  active: boolean;
  onSwitch: () => void;
}) {
  const { t, locale } = useI18n();
  const vertical = getVertical(business.vertical);
  const type = getRestaurantType(business.businessType);

  return (
    <article className="flex flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
            {business.businessName}
          </p>
          <p className="mt-1 text-[11px] text-[var(--octo-text-muted)]">
            {t("settings.businesses.branchCount").replace("{n}", String(business.branchCount))}
            {" · "}
            {formatCreatedAt(business.createdAt, locale)}
          </p>
        </div>
        {active && <Badge tone="success">{t("settings.businesses.active")}</Badge>}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {vertical && <Badge tone="neutral">{t(vertical.nameKey)}</Badge>}
        {type && <Badge tone="neutral">{t(type.nameKey)}</Badge>}
      </div>

      <div className="mt-auto pt-4">
        {active ? (
          <Button variant="secondary" size="sm" className="w-full" disabled>
            {t("settings.businesses.active")}
          </Button>
        ) : (
          <Button variant="primary" size="sm" className="w-full" onClick={onSwitch}>
            {t("settings.businesses.switch")}
          </Button>
        )}
      </div>
    </article>
  );
}

function CreateBusinessModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const { t } = useI18n();
  const { createBusiness } = useTenantConfig();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState<VerticalId | null>(null);
  const [type, setType] = useState<TypeCode | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [enabled, setEnabled] = useState<ModuleId[]>([...baseModuleIds]);

  // Reset to a blank wizard every time it's reopened.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName("");
    setVertical(null);
    setType(null);
    setAnswers({});
    setEnabled([...baseModuleIds]);
  }, [open]);

  // Re-derive the module set whenever the type or an answer changes, same
  // rule the 10-step signup flow uses.
  useEffect(() => {
    if (!type) return;
    const fromType = defaultModulesFor(type);
    const fromAnswers: ModuleId[] = [];
    for (const question of questionsFor(type)) {
      const option = question.options.find((o) => o.id === answers[question.id]);
      if (option) fromAnswers.push(...option.enables);
    }
    setEnabled(withDependencies([...fromType, ...fromAnswers]));
  }, [type, answers]);

  const branchCount = useMemo(() => {
    if (!type) return 1;
    const question = questionsFor(type).find((q) => q.id === "branches");
    const option = question?.options.find((o) => o.id === answers.branches);
    return option?.branchCount ?? 1;
  }, [type, answers.branches]);

  function handleSelectType(code: TypeCode) {
    setType(code);
    setAnswers({});
  }

  function handleToggleModule(id: ModuleId, next: boolean) {
    setEnabled((prev) => (next ? withDependencies([...prev, id]) : withoutDependents(prev, id)));
  }

  function handleCreate() {
    if (!vertical || !type) return;
    const businessName = name.trim();
    createBusiness({
      businessName,
      vertical,
      businessType: type,
      enabledModules: enabled,
      branchCount,
    });
    onCreated(businessName);
  }

  const canContinue =
    step === 1 ? name.trim() !== "" :
    step === 2 ? vertical !== null :
    step === 3 ? type !== null :
    true;

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-2xl"
      title={t("settings.businesses.wizard.title")}
      footer={
        <>
          {step > 1 && (
            <Button variant="secondary" size="sm" onClick={() => setStep((s) => s - 1)}>
              {t("onboarding.back")}
            </Button>
          )}
          {step < WIZARD_TOTAL_STEPS ? (
            <Button variant="primary" size="sm" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
              {t("onboarding.next")}
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleCreate}>
              {t("settings.businesses.wizard.create")}
            </Button>
          )}
        </>
      }
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#0D6EFD]">
        {t("onboarding.step").replace("{n}", String(step)).replace("{total}", String(WIZARD_TOTAL_STEPS))}
      </p>

      <div className="octo-scroll mt-3 max-h-[55vh] overflow-y-auto pe-1">
        {step === 1 && (
          <Input
            label={t("settings.businesses.wizard.nameLabel")}
            placeholder={t("settings.businesses.wizard.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        )}
        {step === 2 && <VerticalStep selected={vertical} onSelect={setVertical} />}
        {step === 3 && <TypeStep selected={type} onSelect={handleSelectType} />}
        {step === 4 && type && (
          <QuestionsStep
            type={type}
            answers={answers}
            onAnswer={(questionId, optionId) => setAnswers((prev) => ({ ...prev, [questionId]: optionId }))}
          />
        )}
        {step === 5 && type && (
          <ModulesStep type={type} answers={answers} enabled={enabled} onToggle={handleToggleModule} />
        )}
      </div>
    </Modal>
  );
}

export function BusinessesSettingsPage() {
  const { t } = useI18n();
  const { businesses, activeTenantId, switchBusiness } = useTenantConfig();
  const [toast, setToast] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  function handleSwitch(business: TenantConfig) {
    switchBusiness(business.id);
    setToast(t("settings.businesses.switched").replace("{name}", business.businessName));
  }

  function handleCreated(name: string) {
    setWizardOpen(false);
    setToast(t("settings.businesses.created").replace("{name}", name));
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("settings.businesses.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("settings.businesses.subtitle")}
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setWizardOpen(true)}>
          {t("settings.businesses.create")}
        </Button>
      </header>

      <section className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
            {t("settings.businesses.title")}
          </h2>
          <span className="text-[11.5px] text-[var(--octo-text-faint)]">{businesses.length}</span>
        </div>

        {businesses.length === 0 ? (
          <EmptyState
            icon={<Building2 size={18} />}
            title={t("settings.businesses.emptyTitle")}
            description={t("settings.businesses.emptyBody")}
            action={
              <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setWizardOpen(true)}>
                {t("settings.businesses.create")}
              </Button>
            }
          />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                active={business.id === activeTenantId}
                onSwitch={() => handleSwitch(business)}
              />
            ))}
          </div>
        )}
      </section>

      <CreateBusinessModal open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={handleCreated} />

      {toast && (
        <div className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-[9px] border border-[#22C55E]/20 bg-[#22C55E]/10 px-4 py-2.5 text-[12.5px] font-medium text-[#16a34a] shadow-lg">
          <CircleCheck size={14} className="text-[#22C55E]" />
          {toast}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run (from `apps/merchant`): `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Manual check — full create-and-switch loop**

On `/settings/businesses`:
1. Click "Create New Business". Confirm the modal opens on step 1 of 5 with a name field, "Continue" disabled until you type a name.
2. Step through: name → vertical (confirm only "Restaurants" is selectable, the rest show "Coming soon" and cannot be picked, matching onboarding) → type (pick any of the 12) → qualifying questions (answer at least one) → modules review (confirm toggling a module works and updates the price-relevant `enabled` set — visually, the toggle switches and moves group between Recommended/Optional is not required, just confirm the switch itself flips).
3. Click "Create Business" on the last step. Confirm: the modal closes, a "created" toast appears, the new business now appears in the grid marked **Active**, and the previously-active business now shows a "Switch to this business" button instead of the Active badge.
4. Click "Switch to this business" on the original business. Confirm the Active badge moves back, a "switched" toast appears, and — open the sidebar — the nav groups update to reflect the original business's module set (e.g. if the two businesses picked different restaurant types with different recommended modules, the Reservations/Inventory groups should appear/disappear accordingly).
5. Refresh the page. Confirm both businesses and the active selection persisted (read from `localStorage.getItem("octopus.tenants")` and `octopus.activeTenantId")`).
6. Switch to Arabic and repeat step 1–2 briefly to confirm the modal lays out correctly RTL (buttons, step counter, back/continue order).

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/settings/businesses/index.tsx
git commit -m "Add Create Business modal wizard to My Businesses page"
```
