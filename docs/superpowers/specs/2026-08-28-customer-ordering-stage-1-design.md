# Customer Ordering, Stage 1 — Design

Date: 2026-08-28
Status: approved for planning
Scope: `apps/customer` — the customisable-product page variant and the
redesigned cart, plus the line-level pricing they share.

Stage 2, specified separately, covers the four fulfillment paths: the chooser,
dine-in, branch pickup, and the two paths that have no comp yet.

---

## 1. Why

Two of the five supplied comps belong together. The cake page introduces a
product whose price is built from choices rather than announced, and the cart
has to show that same split back — base price on one line, additions on
another. They share one calculation, so they share one spec.

The cart's own comp draws the boundary: an amber notice reading «رسوم التوصيل
والخدمة تُحدد بعد اختيار طريقة استلام الطلب». Delivery fees, service fees, tip
and VAT are deliberately **not** in the cart. They arrive with the fulfillment
choice, in stage 2.

---

## 2. Decisions taken before this spec

| Question | Decision |
|---|---|
| Splitting the five comps | Two stages. This is stage 1. |
| Customer image upload | Local preview only. The order line stores the file's **name and size**, never the bytes — there is no backend and no file storage. The UI says so rather than implying the kitchen will see it. |
| Price banner | Shown for products flagged `customisable`, not for every product. The burger comp has no banner despite a paid size being pre-selected, so "any paid selection" is not the rule the design follows. |
| The donut | Added to the mock with the comp's numbers, carrying the cake photograph. No donut image exists and none is coming. |
| Extending vs. branching | The existing product page and cart are extended in place. A separate view for customisable products would duplicate the gallery, the allergen panel and the related row for no gain. |

---

## 3. Contradictions in the comps, and how they are resolved

The comps disagree with themselves in four places. Each is resolved here rather
than reproduced.

**Candles cost 30, not 20.** The addon chip reads «شموع +20ر.س» while the price
banner itemises «إضافة شموع: 30.00» and totals 183.00. **30 wins**: 183.00 is
the number that recurs across four separate screens — product, cart, fulfillment
chooser and dine-in — so it is what the design is actually built on. The chip
will read +30 and the arithmetic closes.

**The cake has three sizes, not four.** «متوسط "تكفي 8 افراد"» appears twice,
character for character. One is dropped, leaving متوسط, كبيرة and حجم مخصوص.

**The cart line's numbers belong to the cake.** The comp shows a برجر with
additions «جبن - هالبينو» priced 153 + 30 = 183 — the cake's figures on the
burger's card. The implementation prices whatever is actually in the cart.

**Tip and VAT arithmetic** (dine-in comp) is inconsistent too, but that screen
is stage 2 and the discrepancies are recorded there, not here.

---

## 4. Data contract

### 4.1 Additions to `MenuItemModifierOption`

```ts
note?: string;   // "تكفي 8 افراد" — sits under the option label
```

The option's `priceDeltaSar` is already there; what changes is that a non-zero
delta becomes **visible on the control** as `+30 ر.س`, instead of only moving
the total silently.

### 4.2 Additions to `MenuItem`

```ts
customisable?: boolean;         // draws the price-breakdown banner
allowsCustomerImage?: boolean;  // draws the "إرفق الصورة" field
caloriesApprox?: boolean;       // renders "900+ سعر حراري"
```

All optional, like every storefront field added in the previous stage, so
nothing that reads `MenuItem` today needs changing.

### 4.3 Addition to `OrderLine`

```ts
customerImageName?: string;   // "birthday.jpg"
customerImageSize?: number;   // bytes
```

Two scalars, not a blob. `OrderLine` is persisted to `localStorage`; a base64
image would risk blowing the ~5MB quota and taking the whole cart with it.

### 4.4 Addition to `OrderLineModifier`

```ts
groupLabel?: string;   // "الحجم"
```

The cart draws «الحجم : متوسط» — the group's name, not just the option's. A
modifier currently carries `groupId` but no readable group name, and making the
cart re-open the menu to translate an id into a label would couple a persisted
cart to a menu that may have changed under it. Optional, so lines saved before
this change still render (their group line is simply omitted).

### 4.5 Mock additions

`item-molten-cake` (كيك مناسبات مخصوص) becomes the worked example: flagged
`customisable` and `allowsCustomerImage`, `caloriesApprox: true`, and given
three modifier groups —

- **إختر الحجم** (required, pills): متوسط «تكفي 8 افراد» +0 · كبيرة «تكفي 10+ افراد» +40 · حجم مخصوص +0
- **اختر النكهة** (required, pills): شوكولاتة +0 · فانيليا +0 · ريد فيلفيت +10
- **الإضافات** (optional, multiple, accordion): شموع +30 · رسالة على الكيك +30

A new `item-donut` (دونات, 50.00 against 70.00, rating 4.5, cat-desserts,
`badges: ["best_seller", "offer"]`) carries `cake.png` until a donut photograph
exists.

---

## 5. Pricing

One function, in `shared/lib/storefront.ts`, tested:

```ts
export interface LinePricing {
  baseSar: number;    // unitPriceSar × quantity
  addonsSar: number;  // Σ(modifier.priceDeltaSar) × quantity
  totalSar: number;   // baseSar + addonsSar
}

export function computeLinePricing(line: OrderLine): LinePricing;
export function computeCartPricing(lines: readonly OrderLine[]): LinePricing;
```

`computeLineTotalSar` already exists in `pricing.ts` and returns only the total.
It stays, and `computeLinePricing` supersedes it for anything that needs the
split; the cart uses the new one.

The banner on the product page needs something different again — a line **per
selected paid option, by name**. That is a view concern computed from the
current selections, not from an `OrderLine`, so it lives in the product view
rather than in `storefront.ts`.

---

## 6. The screens

### 6.1 Product page — customisable variant

Everything from the existing product page stays. Added, in order:

- **Price banner**, above the two columns, only when `item.customisable`: a
  dashed `#0D6EFD` border at 12px radius on a pale blue field, headed «إجمالي
  السعر» with a receipt icon at the start. One row per line — the product at
  its base price, then each selected option whose `priceDeltaSar` is non-zero,
  labelled «إضافة {option}» — then a ruled «الإجمالي» row in bold blue.
- **إرفق الصورة**, first field inside «خصص طلبك» when `allowsCustomerImage`: a
  dashed-border drop zone with an upload glyph and the hint «ارفع صورة للتصميم
  الذي ترغب في تنفيذه». On selection it shows a thumbnail, the file name and a
  remove control, plus a plain sentence that the image is a preview and is not
  sent anywhere yet.
- **Option notes**: an option with a `note` renders it beneath its label at
  11px in muted text, inside the same pill.
- **Priced options**: an option with a non-zero delta appends `+{n} ر.س` at
  9.5px after its label.
- **Approximate calories**: `caloriesApprox` renders «900+ سعر حراري».

The cake carries no `compareAtPriceSar`, so the discount pill and struck price
are already absent — no change needed.

### 6.2 Cart — `/cart`

Breadcrumb: الرئيسية ‹ القائمة ‹ {category} ‹ {item} ‹ سلة الطلبات, derived
from the most recently added line. With an empty cart it collapses to
الرئيسية ‹ سلة الطلبات.

Heading: blue bar + «سلة الطلبات» + the live line count in parentheses.

Two columns, `lg:grid-cols-[1.6fr_1fr]`:

**Lines** (start). Each a white card at 16px radius:
- Product thumbnail on `--octo-store-soft` at the start — `OrderLine` holds no
  image, so `/cart/page.tsx` passes the menu down and the view resolves each
  line's photograph by `menuItemId`, falling back to no thumbnail for a line
  whose product has since left the menu. Name beside it, then
  one muted line per modifier group in use («الحجم : متوسط»,
  «الإضافات : شموع»), then the line total in bold blue. The attached image, when
  present, shows as its file name on its own muted line.
- «العدد» label, then a full-width bordered row holding the existing
  `QuantityStepper`.
- A footer row: «تعديل المنتج» (bordered) and «حذف» (red, text only).

**Summary** (end), one card on `--octo-store-soft` at 16px radius:
- Promo field and «تطبيق» button, fused, reusing the existing `ApplyPromo`
  logic and its `PROMO_CODES`.
- Rows: السعر الأساسي · الإضافات · الخصم (an em dash when none) · a ruled
  **الإجمالي** in bold blue.
- An amber notice on `--octo-store-notice`: «رسوم التوصيل والخدمة تُحدد بعد
  اختيار طريقة استلام الطلب.»
- «متابعة الطلب», full-width blue. It points at `/checkout` in this stage and
  becomes the fulfillment chooser in stage 2.

Below both columns: «يمكنك الشراء ايضا», the existing `ProductRow`, fed by
`relatedItems` against the most recently added line and falling back to
`bestSellers` when the cart is empty.

The empty cart keeps the existing `EmptyState` and its link to the menu.

### 6.3 Editing a line

«تعديل المنتج» navigates to `/menu/{category}/{item}?line={lineId}`. The
product view reads that line from the ordering session and seeds its selections,
quantity and attached file name from it. The primary button then reads
«تحديث الطلب» and **replaces** the line rather than appending a second one.

`OrderingSessionProvider` gains one action for this:

```ts
replaceLine(lineId: string, menuItemId: string, name: string, unitPriceSar: number,
            quantity: number, modifiers: OrderLineModifier[], notes: string,
            customerImageName?: string, customerImageSize?: number): void
```

An unknown `lineId` is ignored and the page behaves as a normal add — a stale
link should not strand the customer on a broken page.

---

## 7. Verification

- `npx tsc --noEmit` in `apps/customer` prints nothing.
- `npx vitest run` passes, including new cases for `computeLinePricing`:
  base-only lines, lines with paid modifiers, quantities above one, and zero-
  delta modifiers contributing nothing.
- `npm run build` succeeds.
- On a production build: `/cart` and the cake page render in both `ar` and
  `en`, the banner totals 183.00 for the default cake selection plus candles,
  the cart's split reads 153.00 / 30.00 / 183.00, and «تعديل المنتج» round-trips
  a line without duplicating it.
- `grep` for physical direction classes across the changed files returns
  nothing.

---

## 8. Out of scope

Delivery, service and any other fee; tip; VAT; the fulfillment chooser and the
four paths behind it; real file upload or storage; a checkout redesign; branch
data, opening hours or scheduling.
