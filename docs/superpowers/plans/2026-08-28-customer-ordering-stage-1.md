# Customer Ordering Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the customisable-product page variant and the redesigned cart, on top of one shared line-pricing calculation.

**Architecture:** The existing product page and cart are extended in place — no new routes and no separate view for customisable products. Three optional flags on `MenuItem` drive the new UI; one tested pure function in `shared/lib/storefront.ts` supplies the base/additions split that both the cart and the product banner need. Editing a cart line round-trips through the product page via a `?line=` query parameter.

**Tech Stack:** Next.js 14.2 App Router, React 18.3, TypeScript 5.5, Tailwind 3.4, `lucide-react`, vitest.

**Spec:** `docs/superpowers/specs/2026-08-28-customer-ordering-stage-1-design.md`

## Global Constraints

- **RTL is mandatory.** Logical Tailwind classes only: `ms- me- ps- pe- text-start text-end border-s border-e`. Never `ml- mr- pl- pr- text-left text-right border-l border-r`.
- **TypeScript only.** No `any`.
- **FSD import direction is strictly downward.** `app → views → widgets → features → entities → shared`. Every slice exposes exactly one `index.ts`.
- **Define components at module scope**, never inside another render body.
- **No new dependencies.**
- **Do not touch** `packages/ui/src/index.ts`, `packages/ui/src/primitives/index.ts`, `packages/i18n/src/index.ts`, `apps/merchant/**`, `apps/admin/**`, `apps/website/**`, root `package.json`, `turbo.json`, `tsconfig.base.json`.
- **Colours** come from the shared palette plus the four `--octo-store-*` tokens already defined. Never invent a hex value.
- **All UI chrome goes through `t()`**; dish names and option labels stay merchant data.
- **Currency:** amounts render through `formatAmount()` with the word from `store.currency`. Never call `formatSar` in storefront UI.
- **Candles cost 30, not 20** — the comp's chip disagrees with its own banner and 183.00 is the load-bearing total.
- **Every task ends with `npx tsc --noEmit` clean from `apps/customer`.**

---

## File Structure

| File | Responsibility |
|---|---|
| `packages/api-client/src/contracts/menu.ts` | `note` on options; `customisable`, `allowsCustomerImage`, `caloriesApprox` on items; cake groups; donut |
| `packages/api-client/src/contracts/order.ts` | `groupLabel` on `OrderLineModifier`; image name/size on `OrderLine` |
| `packages/i18n/src/locales/{ar,en}/index.ts` | `store.cart.*`, `store.product.upload*`, `store.product.total*` |
| `apps/customer/src/shared/lib/storefront.ts` | `computeLinePricing`, `computeCartPricing` |
| `apps/customer/src/shared/lib/storefront.test.ts` | Their tests |
| `apps/customer/src/entities/order/session-provider.tsx` | `replaceLine`, image fields on `ADD_LINE` |
| `apps/customer/src/features/cart/attach-image/` | The customer image field |
| `apps/customer/src/widgets/price-breakdown/` | The dashed price banner |
| `apps/customer/src/widgets/product-customizer/` | Option notes, visible prices, image slot |
| `apps/customer/src/widgets/cart-lines/` | The cart's line cards |
| `apps/customer/src/widgets/cart-totals/` | The summary panel |
| `apps/customer/src/views/product/product-view.tsx` | Banner, image state, edit mode |
| `apps/customer/src/views/cart/cart-view.tsx` | Two-column layout |
| `apps/customer/src/app/cart/page.tsx` | Passes the menu down for thumbnails |

---

## Task 1: Contract and mock

**Files:**
- Modify: `packages/api-client/src/contracts/menu.ts`
- Modify: `packages/api-client/src/contracts/order.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `MenuItemModifierOption.note`, `MenuItem.customisable`, `MenuItem.allowsCustomerImage`, `MenuItem.caloriesApprox`, `OrderLineModifier.groupLabel`, `OrderLine.customerImageName`, `OrderLine.customerImageSize`, mock items `item-molten-cake` (customisable) and `item-donut`

- [ ] **Step 1: Add `note` to `MenuItemModifierOption`**

```ts
export interface MenuItemModifierOption {
  id: string;
  label: string;
  priceDeltaSar: number;
  /** "تكفي 8 افراد" — a qualifier shown under the option's label. */
  note?: string;
}
```

- [ ] **Step 2: Add the three item flags**

Append to `MenuItem`, after `inStock`:

```ts
  /** Price is assembled from choices rather than announced, so the product
   *  page shows a running breakdown. */
  customisable?: boolean;
  allowsCustomerImage?: boolean;
  /** Renders "900+ سعر حراري" rather than an exact figure. */
  caloriesApprox?: boolean;
```

- [ ] **Step 3: Extend `OrderLineModifier` and `OrderLine` in `order.ts`**

```ts
export interface OrderLineModifier {
  groupId: string;
  /** "الحجم". The cart prints the group name beside the option, and a
   *  persisted line must not have to re-open the menu to find it. */
  groupLabel?: string;
  optionId: string;
  label: string;
  priceDeltaSar: number;
}

export interface OrderLine {
  lineId: string;
  menuItemId: string;
  name: string;
  unitPriceSar: number;
  quantity: number;
  modifiers: OrderLineModifier[];
  notes: string;
  /** Name and size only — never the bytes. The cart persists to
   *  localStorage and a base64 image would risk the whole quota. */
  customerImageName?: string;
  customerImageSize?: number;
}
```

- [ ] **Step 4: Turn the cake into the customisable example**

Replace the `item-molten-cake` entry's tail (from `rating:` onward) with:

```ts
    rating: 4.6,
    calories: 900,
    caloriesApprox: true,
    allergens: ["gluten", "dairy", "eggs"],
    badges: ["best_seller"],
    customisable: true,
    allowsCustomerImage: true,
    modifierGroups: [
      {
        id: "grp-cake-size", label: "إختر الحجم", required: true, multiple: false, display: "pills",
        options: [
          { id: "opt-cake-medium", label: "متوسط", note: "تكفي 8 افراد", priceDeltaSar: 0 },
          { id: "opt-cake-large", label: "كبيرة", note: "تكفي 10+ افراد", priceDeltaSar: 40 },
          { id: "opt-cake-custom", label: "حجم مخصوص", priceDeltaSar: 0 },
        ],
      },
      {
        id: "grp-cake-flavour", label: "اختر النكهة", required: true, multiple: false, display: "pills",
        options: [
          { id: "opt-flavour-chocolate", label: "شوكولاتة", priceDeltaSar: 0 },
          { id: "opt-flavour-vanilla", label: "فانيليا", priceDeltaSar: 0 },
          { id: "opt-flavour-red-velvet", label: "ريد فيلفيت", priceDeltaSar: 10 },
        ],
      },
      {
        id: "grp-cake-extras", label: "الإضافات", required: false, multiple: true, display: "accordion",
        options: [
          // The comp's chip says +20 while its own banner totals on 30.
          // 183.00 recurs across four screens, so 30 is what the design is built on.
          { id: "opt-cake-candles", label: "شموع", priceDeltaSar: 30 },
          { id: "opt-cake-message", label: "رسالة على الكيك", priceDeltaSar: 30 },
        ],
      },
    ],
```

Its `description` becomes «كيكة إسفنجية محضرة حسب اختيارك، مناسبة لأعياد الميلاد والمناسبات الخاصة.» and `priceFrom: true` and `priceSar: 153` stay as they are.

- [ ] **Step 5: Add the donut, after `item-umm-ali`**

Carries `cake.png`; no donut photograph exists and none is coming.

```ts
  {
    id: "item-donut",
    categoryId: "cat-desserts",
    name: "دونات",
    description: "دوناتس طازجة وهشة، محشوة بحشوة لذيذة ومغطاة بطبقة حلوة وشهية.",
    priceSar: 50,
    compareAtPriceSar: 70,
    imageUrl: `${IMG}/cake.png`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.5,
    calories: 350,
    allergens: ["gluten", "dairy", "eggs"],
    badges: ["best_seller", "offer"],
    modifierGroups: [],
  },
```

- [ ] **Step 6: Verify**

Run from `apps/customer`: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add packages/api-client/src/contracts
git commit -m "feat(api-client): model customisable products and line images"
```

---

## Task 2: Line pricing

**Files:**
- Modify: `apps/customer/src/shared/lib/storefront.ts`
- Modify: `apps/customer/src/shared/lib/storefront.test.ts`

**Interfaces:**
- Consumes: `OrderLine` from Task 1
- Produces: `LinePricing`, `computeLinePricing(line: OrderLine): LinePricing`, `computeCartPricing(lines: readonly OrderLine[]): LinePricing`

- [ ] **Step 1: Write the failing tests**

Append to `storefront.test.ts`, and add `OrderLine` to the existing type import:

```ts
describe("computeLinePricing", () => {
  function line(overrides: Partial<OrderLine> = {}): OrderLine {
    return {
      lineId: "l1", menuItemId: "m1", name: "x", unitPriceSar: 153,
      quantity: 1, modifiers: [], notes: "", ...overrides,
    };
  }

  it("splits the cake's 153 base and 30 of candles into the comp's 183 total", () => {
    expect(computeLinePricing(line({
      modifiers: [{ groupId: "g", optionId: "o", label: "شموع", priceDeltaSar: 30 }],
    }))).toEqual({ baseSar: 153, addonsSar: 30, totalSar: 183 });
  });

  it("reports no additions for a line without modifiers", () => {
    expect(computeLinePricing(line())).toEqual({ baseSar: 153, addonsSar: 0, totalSar: 153 });
  });

  it("multiplies both halves by the quantity", () => {
    expect(computeLinePricing(line({
      quantity: 3,
      modifiers: [{ groupId: "g", optionId: "o", label: "شموع", priceDeltaSar: 30 }],
    }))).toEqual({ baseSar: 459, addonsSar: 90, totalSar: 549 });
  });

  it("counts a free modifier as no addition at all", () => {
    expect(computeLinePricing(line({
      modifiers: [{ groupId: "g", optionId: "o", label: "شوكولاتة", priceDeltaSar: 0 }],
    })).addonsSar).toBe(0);
  });

  it("sums several modifiers", () => {
    expect(computeLinePricing(line({
      modifiers: [
        { groupId: "g", optionId: "a", label: "شموع", priceDeltaSar: 30 },
        { groupId: "g", optionId: "b", label: "رسالة", priceDeltaSar: 30 },
      ],
    })).addonsSar).toBe(60);
  });
});

describe("computeCartPricing", () => {
  const a: OrderLine = {
    lineId: "a", menuItemId: "m1", name: "cake", unitPriceSar: 153, quantity: 1,
    modifiers: [{ groupId: "g", optionId: "o", label: "شموع", priceDeltaSar: 30 }], notes: "",
  };
  const b: OrderLine = {
    lineId: "b", menuItemId: "m2", name: "donut", unitPriceSar: 50, quantity: 2,
    modifiers: [], notes: "",
  };

  it("adds the lines up, keeping the split", () => {
    expect(computeCartPricing([a, b])).toEqual({ baseSar: 253, addonsSar: 30, totalSar: 283 });
  });

  it("is all zeroes for an empty cart", () => {
    expect(computeCartPricing([])).toEqual({ baseSar: 0, addonsSar: 0, totalSar: 0 });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run from `apps/customer`: `npx vitest run`
Expected: FAIL — `computeLinePricing` is not exported.

- [ ] **Step 3: Implement**

Add to `storefront.ts`, importing `OrderLine` alongside the existing types:

```ts
export interface LinePricing {
  baseSar: number;
  addonsSar: number;
  totalSar: number;
}

/** The cart shows the base price and the paid additions on separate rows, so
 *  the two are kept apart rather than folded into one total. */
export function computeLinePricing(line: OrderLine): LinePricing {
  const baseSar = line.unitPriceSar * line.quantity;
  const addonsSar =
    line.modifiers.reduce((sum, modifier) => sum + modifier.priceDeltaSar, 0) * line.quantity;
  return { baseSar, addonsSar, totalSar: baseSar + addonsSar };
}

export function computeCartPricing(lines: readonly OrderLine[]): LinePricing {
  return lines.reduce<LinePricing>(
    (running, line) => {
      const priced = computeLinePricing(line);
      return {
        baseSar: running.baseSar + priced.baseSar,
        addonsSar: running.addonsSar + priced.addonsSar,
        totalSar: running.totalSar + priced.totalSar,
      };
    },
    { baseSar: 0, addonsSar: 0, totalSar: 0 },
  );
}
```

- [ ] **Step 4: Run them to verify they pass**

Run from `apps/customer`: `npx vitest run`
Expected: PASS, 35 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/customer/src/shared/lib
git commit -m "feat(customer): split line pricing into base and additions"
```

---

## Task 3: Session actions and i18n keys

**Files:**
- Modify: `apps/customer/src/entities/order/session-provider.tsx`
- Modify: `packages/i18n/src/locales/ar/index.ts`
- Modify: `packages/i18n/src/locales/en/index.ts`

**Interfaces:**
- Consumes: `OrderLine` fields from Task 1
- Produces: `addLine(..., customerImageName?, customerImageSize?)`, `replaceLine(lineId, menuItemId, name, unitPriceSar, quantity, modifiers, notes, customerImageName?, customerImageSize?)`; the `store.cart.*` and new `store.product.*` keys

- [ ] **Step 1: Extend the reducer's `ADD_LINE` and add `REPLACE_LINE`**

In the `Action` union, add the two optional image fields to `ADD_LINE` and add:

```ts
  | {
      type: "REPLACE_LINE";
      lineId: string;
      menuItemId: string;
      name: string;
      unitPriceSar: number;
      quantity: number;
      modifiers: OrderLineModifier[];
      notes: string;
      customerImageName?: string;
      customerImageSize?: number;
    }
```

In the reducer, carry the image fields through `ADD_LINE`, and add:

```ts
    case "REPLACE_LINE":
      // A stale ?line= link must not strand the customer: an unknown id
      // leaves the cart untouched rather than throwing.
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.lineId === action.lineId
            ? {
                ...line,
                menuItemId: action.menuItemId,
                name: action.name,
                unitPriceSar: action.unitPriceSar,
                quantity: action.quantity,
                modifiers: action.modifiers,
                notes: action.notes,
                customerImageName: action.customerImageName,
                customerImageSize: action.customerImageSize,
              }
            : line,
        ),
      };
```

Widen `addLine` in `OrderingSessionContextValue` with the two optional
parameters, add `replaceLine` with the signature in **Produces**, and wire both
to their dispatches.

- [ ] **Step 2: Add the Arabic keys**

Before the closing brace of `export const ar = {`:

```ts
  "store.product.totalTitle": "إجمالي السعر",
  "store.product.totalLine": "الإجمالي",
  "store.product.addonLine": "إضافة {name}",
  "store.product.caloriesApprox": "{n}+ سعر حراري",
  "store.product.attachImage": "إرفق الصورة",
  "store.product.attachHint": "ارفع صورة للتصميم الذي ترغب في تنفيذه.",
  "store.product.attachLocalOnly": "الصورة للمعاينة فقط ولا تُرسل مع الطلب بعد.",
  "store.product.attachRemove": "إزالة الصورة",
  "store.product.update": "تحديث الطلب",

  "store.cart.title": "سلة الطلبات",
  "store.cart.empty": "السلة فارغة",
  "store.cart.browse": "تصفح القائمة",
  "store.cart.quantity": "العدد",
  "store.cart.edit": "تعديل المنتج",
  "store.cart.remove": "حذف",
  "store.cart.promoPlaceholder": "أدخل كود الخصم",
  "store.cart.promoApply": "تطبيق",
  "store.cart.promoInvalid": "كود غير صالح أو منتهي الصلاحية",
  "store.cart.basePrice": "السعر الأساسي:",
  "store.cart.addons": "الإضافات:",
  "store.cart.discount": "الخصم:",
  "store.cart.total": "الإجمالي",
  "store.cart.feesNotice": "رسوم التوصيل والخدمة تُحدد بعد اختيار طريقة استلام الطلب.",
  "store.cart.continue": "متابعة الطلب",
  "store.cart.alsoBuy": "يمكنك الشراء ايضا",
  "store.cart.attachedImage": "الصورة المرفقة: {name}",
```

- [ ] **Step 3: Add the matching English keys**

Same keys, same order, in `en/index.ts`:

```ts
  "store.product.totalTitle": "Total price",
  "store.product.totalLine": "Total",
  "store.product.addonLine": "{name} add-on",
  "store.product.caloriesApprox": "{n}+ calories",
  "store.product.attachImage": "Attach an image",
  "store.product.attachHint": "Upload a picture of the design you would like made.",
  "store.product.attachLocalOnly": "The image is a preview only and is not sent with the order yet.",
  "store.product.attachRemove": "Remove image",
  "store.product.update": "Update order",

  "store.cart.title": "Your basket",
  "store.cart.empty": "Your basket is empty",
  "store.cart.browse": "Browse the menu",
  "store.cart.quantity": "Quantity",
  "store.cart.edit": "Edit item",
  "store.cart.remove": "Remove",
  "store.cart.promoPlaceholder": "Enter a promo code",
  "store.cart.promoApply": "Apply",
  "store.cart.promoInvalid": "That code is not valid or has expired",
  "store.cart.basePrice": "Base price:",
  "store.cart.addons": "Add-ons:",
  "store.cart.discount": "Discount:",
  "store.cart.total": "Total",
  "store.cart.feesNotice": "Delivery and service fees are set once you choose how to receive your order.",
  "store.cart.continue": "Continue",
  "store.cart.alsoBuy": "You might also like",
  "store.cart.attachedImage": "Attached image: {name}",
```

- [ ] **Step 4: Verify**

Run from `apps/customer`: `npx vitest run` — the key-parity test must still pass.
Then `npx tsc --noEmit` — expected: no output.

- [ ] **Step 5: Commit**

```bash
git add apps/customer/src/entities/order packages/i18n/src/locales
git commit -m "feat(customer): add line replacement and stage-1 storefront keys"
```

---

## Task 4: The price banner and the image field

**Files:**
- Create: `apps/customer/src/widgets/price-breakdown/{price-breakdown.tsx,index.ts}`
- Create: `apps/customer/src/features/cart/attach-image/{attach-image.tsx,index.ts}`

**Interfaces:**
- Consumes: `useI18n`, `formatAmount`, keys from Task 3
- Produces:
  - `PriceBreakdownRow = { label: string; amountSar: number }`
  - `<PriceBreakdown rows={PriceBreakdownRow[]} totalSar={number} />`
  - `AttachedImage = { name: string; size: number; previewUrl: string }`
  - `<AttachImage value={AttachedImage | null} onChange={(next: AttachedImage | null) => void} />`

- [ ] **Step 1: Build `price-breakdown.tsx`**

```tsx
"use client";

import { ReceiptText } from "lucide-react";
import { useI18n } from "@/app/providers";
import { formatAmount } from "@/shared/lib/pricing";

export interface PriceBreakdownRow {
  label: string;
  amountSar: number;
}

export interface PriceBreakdownProps {
  rows: PriceBreakdownRow[];
  totalSar: number;
}

export function PriceBreakdown({ rows, totalSar }: PriceBreakdownProps) {
  const { t } = useI18n();
  const currency = t("store.currency");

  return (
    <section className="rounded-xl border-2 border-dashed border-[#0D6EFD] bg-[var(--octo-selected)] p-5">
      <h2 className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--octo-text-secondary)]">
        <ReceiptText size={15} className="text-[#0D6EFD]" aria-hidden="true" />
        {t("store.product.totalTitle")}
      </h2>

      <dl className="mt-3 flex flex-col gap-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-[12.5px]">
            <dt className="text-[var(--octo-text-secondary)]">{row.label}</dt>
            <dd className="font-semibold text-[var(--octo-text-primary)]">
              {formatAmount(row.amountSar)} <span className="text-[10px]">{currency}</span>
            </dd>
          </div>
        ))}

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#0D6EFD]/25 pt-2.5">
          <dt className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
            {t("store.product.totalLine")}
          </dt>
          <dd className="text-[17px] font-bold text-[#0D6EFD]">
            {formatAmount(totalSar)} <span className="text-[11px]">{currency}</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
```

- [ ] **Step 2: Build `attach-image.tsx`**

The preview is an object URL, revoked when it is replaced or cleared so the
page does not leak one blob per attempt. Only the name and size ever leave
this component.

```tsx
"use client";

import { Upload, X } from "lucide-react";
import { useEffect, useRef, type ChangeEvent } from "react";
import { useI18n } from "@/app/providers";

export interface AttachedImage {
  name: string;
  size: number;
  previewUrl: string;
}

export interface AttachImageProps {
  value: AttachedImage | null;
  onChange: (next: AttachedImage | null) => void;
}

export function AttachImage({ value, onChange }: AttachImageProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    urlRef.current = value?.previewUrl ?? null;
  }, [value]);

  // Revoke on unmount only; swapping revokes eagerly in handleChange.
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (value) URL.revokeObjectURL(value.previewUrl);
    onChange({ name: file.name, size: file.size, previewUrl: URL.createObjectURL(file) });
  }

  function handleClear() {
    if (value) URL.revokeObjectURL(value.previewUrl);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
        {t("store.product.attachImage")}
      </p>

      {value ? (
        <div className="flex items-center gap-3 rounded-[10px] border border-[var(--octo-border-input)] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.previewUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
          <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--octo-text-secondary)]">
            {value.name}
          </span>
          <button
            type="button"
            aria-label={t("store.product.attachRemove")}
            onClick={handleClear}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)] hover:text-[#EF4444]"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-[10px] border border-dashed border-[var(--octo-border-input)] px-4 py-6 text-center transition-colors hover:bg-[var(--octo-hover)]"
        >
          <Upload size={18} className="text-[var(--octo-text-muted)]" aria-hidden="true" />
          <span className="text-[11.5px] text-[var(--octo-text-muted)]">
            {t("store.product.attachHint")}
          </span>
        </button>
      )}

      {/* No backend exists. Saying so beats implying the kitchen will see it. */}
      <p className="text-[10.5px] text-[var(--octo-text-faint)]">
        {t("store.product.attachLocalOnly")}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create the barrels**

`price-breakdown/index.ts`:

```ts
export { PriceBreakdown } from "./price-breakdown";
export type { PriceBreakdownProps, PriceBreakdownRow } from "./price-breakdown";
```

`attach-image/index.ts`:

```ts
export { AttachImage } from "./attach-image";
export type { AttachImageProps, AttachedImage } from "./attach-image";
```

- [ ] **Step 4: Verify**

Run from `apps/customer`: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add apps/customer/src/widgets/price-breakdown apps/customer/src/features/cart/attach-image
git commit -m "feat(customer): add the price breakdown banner and image field"
```

---

## Task 5: Customizer — notes, visible prices, image slot

**Files:**
- Modify: `apps/customer/src/shared/ui/option-pill.tsx`
- Modify: `apps/customer/src/widgets/product-customizer/product-customizer.tsx`
- Modify: `apps/customer/src/widgets/product-customizer/index.ts`

**Interfaces:**
- Consumes: `MenuItemModifierOption.note` (Task 1), `<AttachImage>` (Task 4)
- Produces: `<OptionPill label note? priceDeltaSar? selected multiple? onSelect />`, `<ProductCustomizer groups selections onChange imageSlot? />`

- [ ] **Step 1: Widen `OptionPill`**

Add two optional props and render them. The note sits under the label; the
price follows the label on the same line.

```tsx
export interface OptionPillProps {
  label: string;
  /** "تكفي 8 افراد" */
  note?: string;
  /** Rendered as "+30 ر.س" when non-zero, so the cost is on the control
   *  rather than only in the total. */
  priceDeltaSar?: number;
  selected: boolean;
  multiple?: boolean;
  onSelect: () => void;
}
```

Inside, call `useI18n()` for `store.currency`, change the button to
`items-start` with `py-2`, and replace the bare `{label}` with:

```tsx
      <span className="flex flex-col items-start gap-0.5 text-start">
        <span>
          {label}
          {priceDeltaSar !== undefined && priceDeltaSar > 0 && (
            <span className="ms-1.5 text-[9.5px] font-semibold text-[#0D6EFD]">
              +{formatAmount(priceDeltaSar)}{t("store.currency")}
            </span>
          )}
        </span>
        {note && <span className="text-[10px] text-[var(--octo-text-muted)]">{note}</span>}
      </span>
```

Add `"use client"` stays as-is, and import `useI18n` and `formatAmount`.

- [ ] **Step 2: Pass the new props from the customizer**

In `product-customizer.tsx`, inside `pillsFor`, extend the `<OptionPill>` call:

```tsx
          <OptionPill
            key={option.id}
            label={option.label}
            note={option.note}
            priceDeltaSar={option.priceDeltaSar}
            multiple={group.multiple}
            selected={chosen.includes(option.id)}
            onSelect={() => { /* unchanged */ }}
          />
```

- [ ] **Step 3: Add the image slot**

Add to `ProductCustomizerProps`:

```ts
  /** Rendered above the first group. The design puts "إرفق الصورة" first,
   *  before any choice. */
  imageSlot?: ReactNode;
```

Render it as the first child of the `mt-5 flex flex-col gap-5` column, before
the groups map. Change the early return so the card still renders when there
are no groups but there is an image slot:

```tsx
  if (groups.length === 0 && !imageSlot) return null;
```

- [ ] **Step 4: Verify**

Run from `apps/customer`: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add apps/customer/src/shared/ui/option-pill.tsx apps/customer/src/widgets/product-customizer
git commit -m "feat(customer): show option notes and prices, and host the image field"
```

---

## Task 6: Product view — banner, image, edit mode

**Files:**
- Modify: `apps/customer/src/views/product/product-view.tsx`
- Modify: `apps/customer/src/app/menu/[category]/[item]/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–5
- Produces: a product page that reads `?line=` and replaces rather than appends

- [ ] **Step 1: Read the edit target**

`ProductView` gains `useSearchParams()` from `next/navigation`:

```tsx
  const searchParams = useSearchParams();
  const editingLineId = searchParams.get("line");
  const editingLine = state.lines.find((l) => l.lineId === editingLineId) ?? null;
```

`useOrderingSession()` now destructures `{ state, addLine, replaceLine }`.

- [ ] **Step 2: Seed from the line being edited**

Replace the `initialSelections` seeding so an edit restores what was chosen:

```tsx
function selectionsFrom(item: MenuItem, line: OrderLine | null): ModifierSelections {
  const seeded: ModifierSelections = {};
  for (const group of item.modifierGroups) {
    const fromLine = line?.modifiers.filter((m) => m.groupId === group.id).map((m) => m.optionId);
    if (fromLine && fromLine.length > 0) {
      seeded[group.id] = fromLine;
      continue;
    }
    // Required single-choice groups start on their first option, which is
    // what the design shows — every pill row has one already lit.
    seeded[group.id] =
      group.required && !group.multiple && group.options.length > 0 ? [group.options[0].id] : [];
  }
  return seeded;
}
```

Seed `useState` with `() => selectionsFrom(item, editingLine)` and quantity with
`() => editingLine?.quantity ?? 1`.

- [ ] **Step 3: Hold the attached image**

```tsx
  const [image, setImage] = useState<AttachedImage | null>(null);
```

An edit cannot restore the preview — only the name was persisted — so the field
starts empty and the previously attached name is shown beneath it as plain text
when `editingLine?.customerImageName` is set and no new file has been chosen.

- [ ] **Step 4: Build the banner rows**

```tsx
  const selectedOptions = item.modifierGroups.flatMap((group) =>
    (selections[group.id] ?? []).flatMap((optionId) => {
      const option = group.options.find((o) => o.id === optionId);
      return option ? [{ group, option }] : [];
    }),
  );

  const breakdownRows = [
    { label: item.name, amountSar: item.priceSar },
    ...selectedOptions
      .filter(({ option }) => option.priceDeltaSar > 0)
      .map(({ option }) => ({
        label: t("store.product.addonLine", { name: option.label }),
        amountSar: option.priceDeltaSar,
      })),
  ];
  const breakdownTotal = breakdownRows.reduce((sum, row) => sum + row.amountSar, 0);
```

Render `{item.customisable && <PriceBreakdown rows={breakdownRows} totalSar={breakdownTotal} />}`
directly under the `SectionHeading`, above the two-column grid.

- [ ] **Step 5: Use the approximate-calorie key**

```tsx
  {t(item.caloriesApprox ? "store.product.caloriesApprox" : "store.product.calories",
     { n: item.calories })}
```

- [ ] **Step 6: Pass the image slot into the customizer**

```tsx
  <ProductCustomizer
    groups={item.modifierGroups}
    selections={selections}
    onChange={(groupId, optionIds) => setSelections((prev) => ({ ...prev, [groupId]: optionIds }))}
    imageSlot={item.allowsCustomerImage ? <AttachImage value={image} onChange={setImage} /> : undefined}
  />
```

- [ ] **Step 7: Carry `groupLabel` and the image through the submit**

In `handleAdd`, the modifier mapping gains `groupLabel: group.label`, and the
call branches:

```tsx
    const imageName = image?.name ?? editingLine?.customerImageName;
    const imageSize = image?.size ?? editingLine?.customerImageSize;

    if (editingLine) {
      replaceLine(editingLine.lineId, item.id, item.name, item.priceSar, quantity,
                  modifiers, "", imageName, imageSize);
    } else {
      addLine(item.id, item.name, item.priceSar, quantity, modifiers, "", imageName, imageSize);
    }
    router.push("/cart");
```

The button label becomes
`soldOut ? t("store.product.outOfStock") : t(editingLine ? "store.product.update" : "store.product.addToCart")`.

- [ ] **Step 8: Wrap the route in Suspense**

`useSearchParams()` forces a client bundle boundary; without a `<Suspense>` the
production build fails on `/menu/[category]/[item]`. In the page, wrap the
`<ProductView …/>` in `<Suspense fallback={null}>` imported from `react`.

- [ ] **Step 9: Verify**

Run from `apps/customer`: `npx tsc --noEmit` — expected: no output.
Then `npm run build` — expected: succeeds. A "useSearchParams should be wrapped
in a suspense boundary" error means Step 8 was missed.

- [ ] **Step 10: Commit**

```bash
git add apps/customer/src/views/product apps/customer/src/app/menu
git commit -m "feat(customer): build the customisable product page"
```

---

## Task 7: Cart line cards and totals panel

**Files:**
- Create: `apps/customer/src/widgets/cart-lines/{cart-lines.tsx,index.ts}`
- Create: `apps/customer/src/widgets/cart-totals/{cart-totals.tsx,index.ts}`
- Delete: `apps/customer/src/widgets/cart-summary/`

**Interfaces:**
- Consumes: `computeLinePricing`, `computeCartPricing` (Task 2); `QuantityStepper`; keys from Task 3
- Produces:
  - `<CartLines lines imageFor hrefFor onQuantityChange onRemove />` where `imageFor: (line: OrderLine) => string | null` and `hrefFor: (line: OrderLine) => string`
  - `<CartTotals pricing discountSar onContinue />`

- [ ] **Step 1: Build `cart-lines.tsx`**

Each card: thumbnail on the soft surface at the start, name, one muted row per
modifier group, the attached file name when present, the line total in blue,
then the quantity row and the edit/remove footer.

Group the modifiers by `groupLabel` so «الحجم : متوسط» and «الإضافات : شموع»
each get one row:

```tsx
function groupedModifiers(line: OrderLine): { label: string; values: string }[] {
  const order: string[] = [];
  const byGroup = new Map<string, string[]>();
  for (const modifier of line.modifiers) {
    const key = modifier.groupLabel ?? "";
    if (!byGroup.has(key)) { byGroup.set(key, []); order.push(key); }
    byGroup.get(key)?.push(modifier.label);
  }
  // A line saved before groupLabel existed has no group name; its options
  // still show, on a row of their own.
  return order.map((label) => ({ label, values: (byGroup.get(label) ?? []).join(" - ") }));
}
```

Card shell: `rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4 flex flex-col gap-4`.
Thumbnail: `h-[86px] w-[86px] shrink-0 rounded-xl bg-[var(--octo-store-soft)] object-contain p-2`,
omitted entirely when `imageFor` returns null.
Quantity row: the label at 12.5px semibold, then a
`rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2` row holding
`<QuantityStepper value={line.quantity} onChange={…} min={1} />`.
Footer: «تعديل المنتج» as a `<Link href={hrefFor(line)}>` styled
`rounded-[10px] border border-[var(--octo-border-input)] px-4 py-2 text-[12px]`,
and «حذف» as a `text-[12px] font-medium text-[#EF4444]` button.

- [ ] **Step 2: Build `cart-totals.tsx`**

```tsx
"use client";

import { AlertCircle } from "lucide-react";
import { useI18n } from "@/app/providers";
import { ApplyPromo } from "@/features/cart/apply-promo";
import { formatAmount } from "@/shared/lib/pricing";
import type { LinePricing } from "@/shared/lib/storefront";

export interface CartTotalsProps {
  pricing: LinePricing;
  discountSar: number;
  onContinue: () => void;
}

export function CartTotals({ pricing, discountSar, onContinue }: CartTotalsProps) {
  const { t } = useI18n();
  const currency = t("store.currency");
  const money = (n: number) => `${formatAmount(n)} ${currency}`;

  return (
    <aside className="flex flex-col gap-4 rounded-2xl bg-[var(--octo-store-soft)] p-5">
      <ApplyPromo />

      <dl className="flex flex-col gap-2.5 text-[12.5px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[var(--octo-text-secondary)]">{t("store.cart.basePrice")}</dt>
          <dd className="text-[var(--octo-text-primary)]">{money(pricing.baseSar)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[var(--octo-text-secondary)]">{t("store.cart.addons")}</dt>
          <dd className="text-[var(--octo-text-primary)]">{money(pricing.addonsSar)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[var(--octo-text-secondary)]">{t("store.cart.discount")}</dt>
          <dd className="text-[var(--octo-text-primary)]">
            {discountSar > 0 ? `-${money(discountSar)}` : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--octo-border-card)] pt-3">
          <dt className="text-[15px] font-bold text-[var(--octo-text-primary)]">
            {t("store.cart.total")}
          </dt>
          <dd className="text-[17px] font-bold text-[#0D6EFD]">
            {money(pricing.totalSar - discountSar)}
          </dd>
        </div>
      </dl>

      <p className="flex items-start gap-2 rounded-[10px] bg-[var(--octo-store-notice)] p-3 text-[11.5px] leading-[1.7] text-[#B45309]">
        <AlertCircle size={15} className="mt-0.5 shrink-0 text-[#F59E0B]" aria-hidden="true" />
        {t("store.cart.feesNotice")}
      </p>

      <button
        type="button"
        onClick={onContinue}
        className="rounded-[10px] bg-[#0D6EFD] px-6 py-3 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        {t("store.cart.continue")}
      </button>
    </aside>
  );
}
```

- [ ] **Step 3: Restyle `ApplyPromo` to the fused control**

Rewrite its markup as a single `flex overflow-hidden rounded-[10px] border
border-[var(--octo-border-input)] bg-[var(--octo-card)]` holding a bare input
placeholdered `store.cart.promoPlaceholder` and a
`shrink-0 bg-[var(--octo-track)] px-5 text-[12.5px] font-semibold` submit
reading `store.cart.promoApply`. Keep its existing `isValidPromoCode` logic and
`applyPromo` call; move the error string to `store.cart.promoInvalid`.

- [ ] **Step 4: Create the barrels and delete `cart-summary`**

```bash
rm -rf apps/customer/src/widgets/cart-summary
```

`cart-lines/index.ts` and `cart-totals/index.ts` each export their component and
its props type.

- [ ] **Step 5: Verify**

Run from `apps/customer`: `npx tsc --noEmit`
Expected: one error — `views/cart/cart-view.tsx` still imports the deleted
`cart-summary`. Task 8 rewrites it.

- [ ] **Step 6: Commit**

```bash
git add apps/customer/src
git commit -m "feat(customer): build the cart line cards and totals panel"
```

---

## Task 8: Cart view and page

**Files:**
- Modify: `apps/customer/src/views/cart/cart-view.tsx`
- Modify: `apps/customer/src/app/cart/page.tsx`

**Interfaces:**
- Consumes: `<CartLines>`, `<CartTotals>` (Task 7); `relatedItems`, `bestSellers`, `computeCartPricing` (Task 2)
- Produces: `<CartView tenant categories items />`

- [ ] **Step 1: Rewrite `cart-view.tsx`**

Props become `{ tenant: Tenant; categories: MenuCategory[]; items: MenuItem[] }`.

Derive, at the top:

```tsx
  const lastLine = state.lines[state.lines.length - 1] ?? null;
  const lastItem = lastLine ? items.find((i) => i.id === lastLine.menuItemId) ?? null : null;
  const lastCategory = lastItem ? categories.find((c) => c.id === lastItem.categoryId) ?? null : null;

  const pricing = computeCartPricing(state.lines);
  const discountSar = state.promoCode ? computePromoDiscountSar(pricing.totalSar, state.promoCode) : 0;

  const suggestions = lastItem ? relatedItems(items, lastItem) : bestSellers(items);
```

Breadcrumb: home, menu, then — when `lastCategory` and `lastItem` exist — the
category and the item, then «سلة الطلبات». With an empty cart it is just home
and «سلة الطلبات».

Heading row: `SectionHeading` with `store.cart.title` plus
`({state.lines.length})` in muted 15px.

Body when the cart has lines: `grid gap-6 lg:grid-cols-[1.6fr_1fr]` holding
`<CartLines>` and `<CartTotals>`. `imageFor` resolves
`items.find((i) => i.id === line.menuItemId)?.imageUrl ?? null`; `hrefFor`
builds `/menu/{category.slug}/{item.id}?line={line.lineId}`, falling back to
`/menu` when either is missing. `onContinue` routes to `/checkout`.

Below the grid: `<ProductRow id="also-buy" title={t("store.cart.alsoBuy")}
items={suggestions} hrefFor={…} onAdd={…} />`, where `onAdd` opens the existing
`AddToCartModal`.

Empty cart: keep the existing `EmptyState` with `store.cart.empty` and a link
to `/menu` reading `store.cart.browse`.

- [ ] **Step 2: Pass the menu from the page**

```tsx
import { headers } from "next/headers";
import { getMenuForTenant } from "@/entities/menu-item";
import { getTenantBySlug, TENANT_SLUG_HEADER } from "@/entities/tenant";
import { CartView } from "@/views/cart";

export default function CartPage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = getTenantBySlug(slug);
  const { categories, items } = getMenuForTenant(tenant.id);

  return <CartView tenant={tenant} categories={categories} items={items} />;
}
```

- [ ] **Step 3: Verify**

Run from `apps/customer`: `npx tsc --noEmit` — expected: no output.
Then `npx vitest run` — expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add apps/customer/src
git commit -m "feat(customer): rebuild the cart as lines and a totals panel"
```

---

## Task 9: Verification pass

**Files:** none changed unless a check fails.

- [ ] **Step 1: Physical direction classes**

```bash
grep -rnE "\b(ml|mr|pl|pr)-[0-9]|text-(left|right)\b|border-(l|r)-" apps/customer/src
```

Expected: no output.

- [ ] **Step 2: Hardcoded Arabic in the changed slices**

```bash
grep -rn '[ء-ي]' apps/customer/src/widgets/cart-lines apps/customer/src/widgets/cart-totals \
  apps/customer/src/widgets/price-breakdown apps/customer/src/features/cart/attach-image \
  apps/customer/src/views/cart apps/customer/src/views/product
```

Expected: no output — every string goes through `t()`.

- [ ] **Step 3: Tests and typecheck**

Run from `apps/customer`: `npx vitest run` then `npx tsc --noEmit`.
Expected: 35 tests pass; typecheck silent.

- [ ] **Step 4: Production build and route sweep**

```bash
cd apps/customer && npm run build && npx next start -p 3100
```

Then check `/`, `/menu`, `/menu/desserts`, `/menu/desserts/item-molten-cake`,
`/menu/desserts/item-donut`, `/cart`, `/checkout` all return 200, in `ar` and
with the `octo_locale=en` cookie.

- [ ] **Step 5: Confirm the arithmetic on the rendered page**

On `/menu/desserts/item-molten-cake` with متوسط, شوكولاتة and شموع selected the
banner must read 153.00, 30.00 and a 183.00 total. Add it, and `/cart` must read
السعر الأساسي 153.00, الإضافات 30.00, الإجمالي 183.00.

- [ ] **Step 6: Confirm editing replaces rather than appends**

From `/cart`, follow «تعديل المنتج», change the size, and submit. The cart must
still hold one line, at the new price.

- [ ] **Step 7: Commit any fixes**

```bash
git add apps/customer/src
git commit -m "fix(customer): address stage-1 verification findings"
```

---

## Self-Review

**Spec coverage.** §4.1 option `note` → Task 1 Step 1 and Task 5 Step 1. §4.2
item flags → Task 1 Step 2. §4.3 line image fields → Task 1 Step 3, Task 3
Step 1. §4.4 `groupLabel` → Task 1 Step 3, carried in Task 6 Step 7, consumed in
Task 7 Step 1. §4.5 mock → Task 1 Steps 4–5. §5 pricing → Task 2. §6.1 product
page → Tasks 4, 5, 6. §6.2 cart → Tasks 7, 8. §6.3 editing → Task 3 Step 1 and
Task 6 Steps 1, 2, 7. §7 verification → Task 9. §3's four resolutions: candles
at 30 → Task 1 Step 4; three cake sizes → Task 1 Step 4; the cart pricing what
is actually in it → Task 8 Step 1; the dine-in arithmetic is stage 2.

**Naming consistency.** `LinePricing`, `computeLinePricing`, `computeCartPricing`,
`AttachedImage`, `AttachImage`, `PriceBreakdown`, `PriceBreakdownRow`,
`CartLines`, `CartTotals`, `replaceLine`, `selectionsFrom` are each defined once
and referenced identically afterwards. `imageFor` and `hrefFor` keep the same
signatures between Task 7's definition and Task 8's use.

**Known ordering constraint.** Task 7 deletes `cart-summary` and leaves one
deliberate broken import that Task 8 Step 1 resolves; it is called out in Task 7
Step 5 so an executor does not mistake it for a failure. Tasks 7→8 must run in
order. Task 6 Step 8's Suspense boundary is required by Step 1's
`useSearchParams` — skipping it fails the production build, not the typecheck.
