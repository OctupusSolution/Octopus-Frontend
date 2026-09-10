# OCTOPUS — Postman collection

The backend contract for four areas of the merchant console (`apps/merchant`), ready to
hand to the backend team.

| Folder | Covers |
|---|---|
| **01 · Login & Account** | Sign in (password, Google/Apple/Microsoft), create account + email code, forgot password, session |
| **02 · Setup** | The 7-step business setup wizard, its reference data, price quote, payment and go-live |
| **03 · Menu** | Menu library, the 4-step builder (Sections → Items → Theme → Review & Publish), modifiers, offers, media upload, AI import (deferred) |
| **04 · Public Link** | The 7-step storefront builder (Theme → Brand → Pages → Navigation → Customize → Preview → Publish) |

| File | What it is |
|---|---|
| `OCTOPUS-Merchant-API.postman_collection.json` | The collection |
| `OCTOPUS-Local.postman_environment.json` | Every variable, pointing at `http://localhost:4000` |
| `OCTOPUS-Staging.postman_environment.json` | Same variables, empty values, staging host |

## Import

Postman → **Import** → drop all three files → pick **OCTOPUS · Local** at the top right.

## Run it

1. **01 · Login & Account → 1.1 → Login.** Saves `accessToken`, `refreshToken`, `userId`,
   `tenantId`. Every other request authenticates from them.
2. Work down the folders. They are numbered in the order a merchant meets them, and inside
   each folder the requests run in dependency order: every *Create / Add* request saves the
   new id (`onboardingId`, `menuId`, `sectionId`, `itemId`, `groupId`, `optionId`, `offerId`,
   `mediaUrl`, …) so the requests after it work without copy-pasting.

## What every request tells you

Each description follows the same layout:

1. **Status** — 🟡 *Planned*: the screen is built on a typed mock and needs this API.
   🔴 *Deferred*: only the entry point exists (AI menu import).
2. What the request does.
3. **Rules the API must enforce** — the business rules the front-end already applies. The
   client cannot be trusted, so the API applies them too.
4. **Saves to environment** — the variable written on success.
5. **Screen** and **Shape source** — where it is used and where its type lives in the code.

Every request has **saved example responses**, including its error cases.

## Conventions

- **Base path** `/api/v1`.
- **Auth** — collection-level `Bearer {{accessToken}}`; sign-in, sign-up and password
  recovery are *no auth*.
- **Tenancy** — `X-Tenant-Id` on every authenticated request; `X-Branch-Id` present but
  disabled (tick it to scope to one branch).
- **Language** — `Accept-Language: {{locale}}` (`ar` | `en`).
- **Lists** — `{ "data": [...], "meta": { "page", "pageSize", "total" } }`.
- **Errors** — `{ "error": { "code", "message", "details" } }`. `401` not signed in ·
  `403` not allowed · `404` not found · `409` conflict · `422` validation (per-field reasons
  in `details`) · `429` rate limited. A collection-level test checks every error uses this
  envelope.
- **Money** — SAR, a JSON number, at most 2 decimals. **The server computes every total**;
  the client never sends one.
- **Dates** — ISO-8601 UTC. Times of day are `HH:mm` in the menu's timezone.
- **Concurrency** — the menu and the site draft carry a `version`. Writes send the version
  they read; a stale one gets `409 version_conflict`.
- **Media** — upload with *03 · Menu → 3.8 Media*, then send the returned `url`.

## Decisions already made (do not re-derive from the design files)

- **Offer saving** compares the two **VAT-inclusive** totals. For burger 90 + fries 20 +
  drink 20 sold at 100: individual total SAR 149.5, offer total SAR 115, saving
  **SAR 34.5 = 23%**. The design file shows SAR 49.5, which contradicts its own 23%.
- **Every menu has one built-in `offers` section** that cannot be deleted and always stays
  last.
- **The brand (logo, colours, fonts, hero) is one record** shared by *03 · Menu → Theme* and
  *04 · Public Link → Brand*.
- **Nutrition values are `null` when not entered**, never `0`.
- **An unavailable option never adds to a price**, even when it is marked as the default.

## Regenerating

The JSON is generated — edit the sources in `_generator/`, never the JSON.

```bash
node docs/postman/_generator/build.js docs/postman
```

- `_generator/lib.js` — request and folder builders, example/error helpers, test snippets,
  the `saves` → environment script, path-variable samples.
- `_generator/s01-auth.js` · `s02-setup.js` · `s03-menu.js` · `s04-public-link.js` — one
  file per top-level folder.
- `_generator/build.js` — assembles the collection, stamps tenancy/language headers, writes
  both environments from **one** variable list, fails the build if a request uses a
  `{{variable}}` the environments do not define, and prints a per-folder count.
