# Customer Storefront — Design

Date: 2026-08-26
Status: approved for planning
Scope: `apps/customer` — four screens (home, menu index, category listing with
filters, product details), plus the shared header and footer they hang off.

---

## 1. Why

`apps/customer` is a scaffold. Its home page is a "pick a fulfillment method"
gate, its menu is an ungrouped list of cards, and there is no product page at
all. The four supplied designs describe a real storefront: a marketing home
page, a browsable menu, a filterable category listing, and a product page with
modifiers and allergen disclosure.

This spec covers all four together because they share one header, one footer,
one product card and one data contract. Splitting them would mean designing the
same pieces twice.

---

## 2. Decisions taken before this spec

| Question | Decision |
|---|---|
| Fulfillment gate on `/` | Removed. Delivery/takeaway/dine-in moves to cart/checkout. Browsing is open to everyone. |
| Where the new fields live | `packages/api-client/src/contracts/menu.ts`. Every new field is optional so existing readers keep compiling. |
| Localisation | i18n keys for UI chrome only. Dish names and descriptions stay merchant data, returned as-is. |
| Missing imagery | Reuse the eight real assets in `apps/assets/public-link/`; repeat them where the design shows more. The patterned tile backdrop is an inline SVG, not a file. |
| Nav links without designs | إحجز طاولة → existing `/booking`, تتبع الطلب → existing `/orders`. The other three are anchors on the home page. Neither existing page is touched. |
| Component home | Everything lives in `apps/customer`. `packages/ui` and `packages/config` are not modified. |
| Tests | Add vitest to `apps/customer` for the pure logic in `shared/lib/storefront.ts` only. No UI tests. |

---

## 3. Data contract

### 3.1 Two levels of grouping, not one

The breadcrumb on the product page reads الرئيسية ‹ القائمة ‹ الغداء ‹ البرجر.
"الغداء" is a **category**; "البرجر" is a **group**. They are different axes and
the design uses both on the same screen, so the contract models both.

```ts
export type MenuGroupId =
  | "all" | "chicken" | "meat" | "burger" | "pizza"
  | "sides" | "appetizers" | "salads";

export type AllergenId =
  | "gluten" | "dairy" | "eggs" | "nuts" | "soy" | "seafood";

export type DietaryId =
  | "vegetarian" | "vegan" | "gluten_free" | "spicy" | "healthy";

export type MenuItemBadge = "best_seller" | "offer" | "new";

export interface MenuGroup {
  id: MenuGroupId;
  imageUrl: string;   // the round chip photo
}
```

`MenuGroup` carries no `name`. Group labels are UI chrome, not merchant data, so
they resolve through i18n (`store.group.burger`). Categories keep their `name`
because a merchant names their own categories.

### 3.2 Additions to `MenuItem`

All optional. `add-to-cart-modal`, the cart, the checkout and order tracking
read `MenuItem` today and must keep compiling untouched.

```ts
images?: string[];           // gallery; imageUrl stays the primary
compareAtPriceSar?: number;  // the struck-through 170.00
priceFrom?: boolean;         // renders "السعر يبدأ من" instead of a struck price
rating?: number;             // 4.5
calories?: number;           // 900
allergens?: AllergenId[];
badges?: MenuItemBadge[];
group?: MenuGroupId;
dietary?: DietaryId[];
inStock?: boolean;           // drives the "متوفر" filter; absent means true
```

The discount percentage is **derived**, never stored:
`round((1 - priceSar / compareAtPriceSar) * 100)`. 153 against 170 gives 10%,
which is what the design shows. Storing it invites the two numbers to disagree.

### 3.3 Addition to `MenuItemModifierGroup`

```ts
display?: "pills" | "accordion";   // default "pills"
```

The product page renders الحجم, نوع الخبز and مستوى التوابل as rows of radio
pills, and الإضافات and مستوى الطهي as collapsed accordions. An explicit flag
beats a heuristic on option count, which would silently change layout the first
time a merchant adds a fourth sauce.

### 3.4 Mock data

Grow `ITEMS` to roughly 24 items spread across the five categories and eight
groups, with real-looking ratings, calories, allergens, compare-at prices and
dietary tags. Sparse mock data makes the six filters look broken when they are
not.

Images map to the eight real assets, copied into
`apps/customer/public/images/storefront/`:

| Asset | Used for |
|---|---|
| `hero.webp` | home hero |
| `dish-1.webp` | chicken burger — the repeated best-seller and the gallery |
| `dish-2.webp` | كيك مناسبات مخصوص, the "starting from" card |
| `dish-3.webp` | الغداء tile, meat dishes |
| `cat-mains.webp` `cat-breakfast.webp` `cat-desserts.webp` `cat-drinks.webp` | category tiles and round chips |

Chips reuse these until real chip photography arrives. Repetition is visible and
honest; invented variety would not be.

---

## 4. Architecture

```
app/
  globals.css                       --octo-store-* surface tokens
  providers/i18n-provider.tsx       new — the customer app has no provider today
  layout.tsx                        wraps in the provider, new header + footer
  page.tsx                          home
  menu/page.tsx                     all categories
  menu/[category]/page.tsx          listing + filters
  menu/[category]/[item]/page.tsx   product details

shared/ui/    section-heading · product-card · price-block · rating-stars
              option-pill · accordion-row · quantity-stepper · breadcrumb
              doodle-pattern
shared/lib/   storefront.ts   pure: discount, filtering, best-seller/offer/related
              pricing.ts      + formatAmount()

widgets/      site-header · site-footer · store-hero · category-mosaic
              product-row · category-chip-rail · menu-filter-bar
              product-gallery · product-customizer · allergen-panel

views/        landing · menu · category (new) · product (new)
features/menu/  filter-items · toggle-favorite
```

Rewritten in full: `site-header`, `site-footer`, `landing-view`, `menu-view`,
`product-card`, `section-heading`, `quantity-stepper`.

Untouched: cart, checkout, order tracking, `select-fulfillment` (which moves to
checkout), `add-to-cart-modal`.

Import direction stays strictly downward, per AGENTS.md §4. Every slice exposes
one `index.ts`.

### 4.1 Filter state lives in the URL

`/menu/lunch?group=burger&best=1&available=1&price=100-200&diet=spicy`

Server-rendered, shareable, and the browser back button works. A `useState` in
the view would lose all three.

### 4.2 Currency

`formatSar` in `packages/api-client` returns `"SAR 153.00"`. The design shows
`153.00` with `ر.س` beside it at a smaller size. `money.ts` is shared with the
merchant console and is not modified. Instead `shared/lib/pricing.ts` gains
`formatAmount(n): string` returning `"153.00"`, and the currency word comes from
the `store.currency` key.

---

## 5. Design tokens

The AGENTS.md palette targets the merchant console; its page background
`#e9eaec` is far darker than the storefront designs. Four storefront surfaces
are added as customer-scoped variables in `apps/customer/src/app/globals.css`.
The shared palette is not modified, and every brand, text and semantic colour
still comes from it.

```css
--octo-store-page:    #F7F8FA;   /* page background */
--octo-store-soft:    #F1F3F5;   /* category tiles, chip rail, thumbnails */
--octo-store-footer:  #E7EDF4;   /* footer wash */
--octo-store-notice:  #FFF6E8;   /* allergen panel */
```

Reused unchanged from the shared palette: `#0D6EFD` primary, `#22C55E` /
`#16a34a` for the discount pill, `#F59E0B` for the allergen icon and star fill,
`#ececf0` card borders, and the full text ramp.

RTL is expressed with logical properties throughout — `ms/me`, `ps/pe`,
`text-start/text-end`, `border-s/border-e`. No `left`/`right` anywhere.

---

## 6. The screens

### 6.1 Header (shared)

Sticky white bar, 56px, bottom border `#ececf0`, content in `max-w-[1200px]`.

- Start: octopus logo, 30px.
- Centre: seven links at 13.5px, 26px apart — الرئيسية · القائمة · المنتجات ·
  الاكثر مبيعا · اقوى العروض · إحجز طاولة · تتبع الطلب. Active link is
  `#0D6EFD` with a 2px underline; the rest are `#16161d`.
- End: a language pill (bordered, `Languages` icon, «العربية»), then a 38px
  blue rounded-square button with a white `ShoppingBag` and the cart count.
- Below `md`, links collapse into a drawer behind a hamburger.

### 6.2 Footer (shared)

`--octo-store-footer` wash, `max-w-[1200px]`, five columns from the start edge:

1. Brand — logo, the "نقدم لك تجربة طعام مميزة…" paragraph, «تابعنا», three
   social circles (Instagram, Facebook, LinkedIn).
2. استكشف — الرئيسية · القائمة · الأكثر مبيعًا · العروض
3. معلومات — تواصل معنا · سياسة الخصوصية · الشروط والأحكام
4. زورونا — pin «الرياض، المملكة العربية السعودية» · clock «يومياً 11:00 ص – 12:00 ص»
5. تواصل معنا (widest, at the end) — «انضم إلينا اليوم واستمتع بمزايا حصرية!»,
   an email field placeholdered «ادخل البريد الالكتروني», and a blue «إرسال»
   button fused to its end.

### 6.3 Product card (shared by four sections)

White, 16px radius, `#ececf0` border.

- Top row: outlined heart in a white circle at the start; a «الاكثر مبيعا»
  chip at the end — small blue circle with a flame, label on a pale blue field.
- Product image, `object-contain`, 110px tall, centred.
- Row: name, 13px semibold, at the start · a filled amber star and «4.5» at the end.
- Description, two lines maximum, `#8b8b93`, 11px.
- Bottom row: a 34px blue circular bag button at the **start**; the price block
  at the **end** — «153.00 ر.س» blue and bold over a struck grey «170.00 ر.س».
  When `priceFrom` is set, «السعر يبدأ من» replaces the struck line.

### 6.4 Home — `/`

- **Hero**: `hero.webp` full-bleed, ~600px, under a black gradient. Centred
  white headline at ~44px, «نكهة تُصنع بشغف، وتُحفظ في الذاكرة»; a ~15px
  paragraph capped at 720px; two transparent white-bordered pills with list
  icons — «عرض القائمة» and «إحجز طاولة».
- **القائمة**: section heading (4px blue bar + 28px bold), then a five-tile
  mosaic over three columns — start column الحلويات above المشروبات; middle
  column الأطباق الرئيسية spanning both rows; end column الإفطار above الغداء.
  Each tile is `--octo-store-soft` at 20px radius, carries the inline SVG food
  doodle pattern, and splits into a bleeding dish photo on one half and a 20px
  bold label on the other — alternating direction tile to tile.
- **الاكثر مبيعا**: four product cards.
- **اقوى العروض**: four product cards.

### 6.5 Menu index — `/menu`

No design was supplied for this screen, but the nav links to it and every
breadcrumb passes through it, so it cannot be skipped. It reuses pieces that
already exist rather than inventing a layout: breadcrumb الرئيسية ‹ القائمة, the
same section heading, and the same mosaic as the home page's القائمة section at
full page width. Each tile links to `/menu/[category]`.

### 6.6 Category listing — `/menu/[category]`

- Breadcrumb: الرئيسية ‹ القائمة ‹ الغداء
- Title row: blue bar + «الوجبات المتاحة» at 28px bold + a grey count in
  parentheses. The design reads «(500)»; the real number is the count of items
  matching the active category, chip and filters, so it changes as they change.
  A frozen 500 next to twenty-four visible cards would be a lie on the page. At
  the end, a «تصفية» button with a `SlidersHorizontal` icon — outlined when closed,
  **solid blue with white content** when open.
- **Filter bar** (only when open): white strip, 12px radius, six cells split by
  vertical rules, from the start: «الاكثر مبيعا» + checkbox (the whole cell
  turns `#eef4ff` with a blue border when active) · «السعر» ▾ ·
  «مسببات للحساسية» ▾ · «التفضيلات الغذائية» ▾ · «نوع الوجبة» ▾ · and at the
  end «متوفر» + checkbox.
- **Chip rail**: a `#F4F5F7` card at 20px radius holding eight items — a 74px
  white circle with the food photo inside and a 12px bold label beneath. The
  active chip gets a 2px blue ring and blue label. Order from the start: الكل ·
  وجبات الدجاج · اللحوم · البرجر · البيتزا · الجانبيات · المقبلات · السلطات.
  Scrolls horizontally on narrow screens.
- **Grid**: four columns on desktop, two on tablet, one on mobile.

### 6.7 Product details — `/menu/[category]/[item]`

- Breadcrumb: الرئيسية ‹ القائمة ‹ الغداء ‹ البرجر
- Heading: blue bar + «تفاصيل المنتج», 30px bold.
- **Start column**:
  - Large image in a white 20px-radius card.
  - Beside it, three 140px square thumbnails on `--octo-store-soft`; the active
    one carries a blue ring.
  - Beneath, the **allergen panel** on `--octo-store-notice` at 20px radius —
    an amber ⓘ and «معلومات الحساسية» in amber bold, the full warning
    paragraph, «المنتج يحتوي على:», then three chips each pairing a wheat glyph
    with a label: جلوتين · ألبان · بيض.
- **End column**:
  - Five filled amber stars and «(4.5)» at the end.
  - Name at 30px bold, then the full description.
  - A pale blue calorie pill: flame + «900 سعر حراري».
  - Price row: «153.00 ر.س» blue bold at 34px over a soft blue brush swash,
    a struck «170.00 ر.س» beside it, and a green «خصم %10» pill at the end.
  - **«خصص طلبك» card** — white, 20px radius, soft shadow:
    - «إختر الحجم» — from the start: صغير · متوسط · كبير · **عائلي** (selected:
      blue border, `#eef4ff` fill, blue dot)
    - «نوع الخبز» — **خبز ابيض** · خبز اسمر · بدون خبز
    - «مستوى التوابل» — **حار** · متوسط · عادي
    - Two collapsed accordion rows with a chevron at the end: «الإضافات» and
      «مستوى الطهي»
  - Final row: «العدد» above; at the start a pill stepper `[+] 1 [−]` with the
    plus as a filled blue circle at the start edge; at the end a wide blue
    «إضافة إلي السلة» button.
- **جربها مع**: blue bar + heading, then four product cards.

---

## 7. Behaviour

| Control | Behaviour |
|---|---|
| «تصفية» | Toggles the filter bar. No URL change on its own. |
| Filter cells | Write to the query string; the server re-renders the grid. |
| Chip rail | Sets `?group=`; «الكل» clears it. |
| Card bag button | Opens the existing `AddToCartModal`. |
| Heart | Client-only favourite, held in `localStorage`. It is decoration until a customer account exists, and the spec says so rather than implying a synced wishlist. |
| Product page add-to-cart | Builds an `OrderLine` from the selected modifiers and the quantity, through the existing ordering session. |
| Newsletter «إرسال» | Client-side validation and an inline confirmation. There is no endpoint; it does not pretend to have one. |
| Language pill | Existing cookie-and-refresh switch, restyled. Now actually swaps text, since chrome is keyed. |

---

## 8. Verification

- `npx tsc --noEmit` in `apps/customer` prints nothing.
- `npx vitest run` in `apps/customer` passes — covering discount derivation,
  every filter combination, and best-seller / offer / related derivation.
- `npm run build` in `apps/customer` succeeds.
- Every screen is checked at 1440, 768 and 390 in both `ar` (RTL) and `en`
  (LTR), with no horizontal page scroll and no console errors.
- `grep` for `ml-|mr-|pl-|pr-|text-left|text-right|border-l|border-r` across the
  new files returns nothing.

---

## 9. Out of scope

The booking page, order tracking, cart and checkout redesigns; real
authentication or a synced wishlist; a live newsletter endpoint; merchant
branding applied to the storefront (colour, logo and typeface per tenant, as the
merchant onboarding preview does); search.
