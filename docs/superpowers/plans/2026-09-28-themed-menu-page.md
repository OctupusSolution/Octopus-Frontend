# Themed Menu Page + Real Live Preview for the Menu Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The customer storefront gets a real menu page that honours every menu-theme setting (on the site's `/menu` and on the QR link `/c/{key}`), and the merchant's menu builder previews that exact page in an iframe that follows every unsaved edit.

**Architecture:** One storefront component, `ThemedMenu`, renders the backend's public menu document (`PublicMenuResponse`) with its theme. It is mounted at `/menu` (order mode), `/c/[key]` (view mode) and `/preview/menu` (a bare canvas the builder drives over `postMessage`, same pattern and trust rules as the Public Link canvas). The builder converts its in-memory menu into the same document (`draftMenuDocument`) on every edit. The backend adds delivery URLs to the document's media so images render. A menu's brand (colours, logo, hero, fonts) is stored on the menu's own theme.

**Tech Stack:** .NET 10 (backend Menu module), React 18, Next.js 14 App Router (storefront), Vite (merchant), TypeScript, Tailwind 3.4, Vitest 2, xUnit.

**Spec:** `docs/superpowers/specs/2026-09-28-themed-menu-page-design.md` (approved 2026-09-28).

## Global Constraints

- The public menu document is the backend's `PublicMenuResponse`; its TypeScript mirror is `PublicMenuDocument` in `packages/api-client/src/contracts/public-menu.ts`. Theme enum strings exactly: navigation `TopBar|SideDrawer|BottomBar|PillScroll`; section nav `IconAndText|TextOnly|IconOnly|ImageAndText`; card `Classic|CleanMinimal|ImageTop|ImageLeft`; item details `SamePage|Overlay|NewPage`; section display `List|Carousel|Grid`. Unknown strings fall back to the backend defaults `TopBar`, `IconAndText`, `Classic`, `SamePage`, `List`.
- Colours are `#rgb` / `#rrggbb` or null; null or malformed → the storefront's default for that variable.
- Money `amount` is in major units; `currency.minorUnits` sets the decimal places.
- Routes: storefront `/menu` (order mode), `/c/[key]` (view mode, no cart), `/preview/menu` (builder canvas). `/c/*` and `/preview/menu` render a bare document (no site header/footer) and never resolve a tenant from the host.
- Canvas protocol version `1`; channels builder → canvas `"octopus-menu-builder"`, canvas → builder `"octopus-menu-canvas"`. The canvas accepts messages only from `window.parent` at an origin in `MERCHANT_APP_ORIGINS` (dev adds `http://localhost:5290`, `http://127.0.0.1:5290`); the builder accepts messages only from its own iframe at the canvas origin. `/preview/menu` answers with the same headers as `/preview/builder` (`frame-ancestors 'self' <merchant origins>`, `private, no-store`, `noindex, nofollow`, `no-referrer`).
- Builder canvas origin: `import.meta.env.VITE_STOREFRONT_CANVAS_ORIGIN`, else `http://localhost:3000` in dev (`import.meta.env.DEV`), else `https://menu.octopus.sa`.
- No `ready` from the canvas within 8 s → the builder shows its existing in-app preview (`PreviewRail`) with a one-line note.
- The QR menu is view-only: no add buttons, no cart, no sticky cart bar.
- Commits: no `Co-Authored-By` or Claude attribution lines (repository owner's rule). Stage only the files the task names (never `git add -A`; never `apps/*/.dev.log`). LF endings, no BOM.
- Frontend commands run from the app folder (`cd apps/merchant` or `cd apps/customer`): `npx vitest run <path>`, `npx tsc --noEmit -p .`. Only `src/**/*.test.ts` files are collected (render tests use `createElement` + `renderToStaticMarkup`, never JSX in tests). Backend: `dotnet test tests/Octopus.UnitTests --filter <name>` from `E:\Octupus\octopus-backend`.
- Repos: `E:\Octupus\octopus-frontend` (branch `feature/public-link-us019`) and `E:\Octupus\octopus-backend` — the folder is spelled `Octupus`. Never write under `E:\Octopus`.

**Correction to the spec (ruling):** spec §3.5 says the offers pseudo-section is excluded from the draft document. That is wrong — the builder's offers live in the section with id `OFFERS_SECTION_ID` ("offers"), and the backend places offers inside sections. `draftMenuDocument` includes that section (when visible) with `Offer` entries, like any other section.

## Review Focus

1. **A menu image the server cannot resolve** (asset deleted, provider missing) → the page shows the storefront's stock picture, never a broken image. Pinned: Task 1 (`Url` stays null) and Task 3 (`mediaUrl` → placeholder).
2. **A theme value the storefront does not know** (a new enum string, a malformed colour, an unknown font code) → that option falls back to its default and the page still renders. Pinned: Task 3 tests.
3. **A half-typed item in the builder** (empty name, price 0, no section) → it is left out of the preview, never a blank card. Pinned: Task 8 tests.
4. **Opening `/c/{key}` for a revoked/unknown key** → the storefront's not-found page, identical for every reason. Pinned: Task 5 (the page calls `notFound()` on a null document) — manual check in Task 11.
5. **The QR menu showing ordering controls** → never: view mode renders no add button, cart or sticky bar. Pinned: Task 4 render test.

---

## File Structure

**Backend (`E:\Octupus\octopus-backend`)**
- `src/Modules/Menu/Octopus.Modules.Menu.Contracts/Dtos/PublicRead/PublicMenuResponse.cs` — `PublicMedia` gains `Url`.
- `src/Modules/Menu/Octopus.Modules.Menu.Application/Abstractions/IMediaAssetRepository.cs` + `Infrastructure/Persistence/Repositories/MediaAssetRepository.cs` — `GetAssetsAsync`.
- `src/Modules/Menu/Octopus.Modules.Menu.Application/PublicRead/PublicMenuMediaUrls.cs` (new) — fills `Url` for every media reference in a response.
- `…/PublicRead/GetPublicMenuByCode.cs` (`PublicMenuServer`) and `…/Menus/PreviewDraftQuery.cs` — call it.
- `tests/Octopus.UnitTests/Menu/Application/PublicRead/PublicMenuMediaUrlsTests.cs` (new), `tests/Octopus.UnitTests/Menu/Application/MenuTestDoubles.cs`.

**Shared (`packages/api-client/src/contracts`)**
- `public-menu.ts` (new) — `PublicMenuDocument` and parts. `menu-admin.ts` — `MenuPreview*` become aliases.
- `menu-preview.ts` (new) — the menu canvas protocol.

**Storefront (`apps/customer/src`)**
- `widgets/themed-menu/` (new): `menu-theme.ts` (pure theme mapping + money), `menu-model.ts` (pure document → view model), `themed-menu.tsx`, `category-nav.tsx`, `entry-card.tsx`, `section-block.tsx`, `item-details.tsx`, `index.ts`, tests.
- `shared/api/public-api.ts` — document fetchers. `shared/api/menu-document.ts` — keeps `menuFromDocument` (URL-aware already).
- `entities/menu-item/load.ts` — `loadMenuDocument`.
- `app/menu/page.tsx`, `app/c/[key]/page.tsx` (new), `app/preview/menu/page.tsx` (new), `views/menu-canvas/` (new), `shared/lib/merchant-origins.ts`, `middleware.ts`, `app/layout.tsx`.

**Merchant (`apps/merchant/src`)**
- `widgets/storefront-frame/` (new, moved from `pages/public-link`): `storefront-frame.tsx`, `frame-bridge.ts`, test — generic over a channel.
- `pages/menu/build/preview/draft-menu-document.ts` (new) + test; `pages/menu/build/preview/menu-preview-frame.tsx` (new); `pages/menu/build/preview/canvas-origin.ts` (new).
- `entities/menu/menu.ts` (`MenuBrand`), `entities/menu/menu-sync.ts` (brand pull/push), test.
- `pages/menu/build/theme/index.tsx` (brand from the menu), `theme/qr-panel.tsx` (real access code), delete `theme/public-url.ts`.
- `pages/menu/build/sections/index.tsx`, `items/index.tsx`, `review/customer-preview.tsx` — the frame.

---

### Task 1: Backend — delivery URLs in the public menu document

**Files:**
- Modify: `src/Modules/Menu/Octopus.Modules.Menu.Contracts/Dtos/PublicRead/PublicMenuResponse.cs:10-13`
- Modify: `src/Modules/Menu/Octopus.Modules.Menu.Application/Abstractions/IMediaAssetRepository.cs`
- Modify: `src/Modules/Menu/Octopus.Modules.Menu.Infrastructure/Persistence/Repositories/MediaAssetRepository.cs`
- Create: `src/Modules/Menu/Octopus.Modules.Menu.Application/PublicRead/PublicMenuMediaUrls.cs`
- Modify: `src/Modules/Menu/Octopus.Modules.Menu.Application/PublicRead/GetPublicMenuByCode.cs` (`PublicMenuServer`)
- Modify: `src/Modules/Menu/Octopus.Modules.Menu.Application/Menus/PreviewDraftQuery.cs` (`PreviewDraftQueryHandler`)
- Modify: the Menu module's DI registration (where `PublicMenuServer` is registered — `grep -rn "PublicMenuServer" src/Modules/Menu --include=*.cs`)
- Modify: `tests/Octopus.UnitTests/Menu/Application/MenuTestDoubles.cs` (`FakeMediaAssetRepository`)
- Test: `tests/Octopus.UnitTests/Menu/Application/PublicRead/PublicMenuMediaUrlsTests.cs`
- Modify: `specs/…` contract doc for the public menu read if one lists `PublicMedia` (`grep -rln "assetId" specs | xargs grep -ln "menu-codes"`), adding `url`.

**Interfaces:**
- Produces (JSON): every media object in the public menu read and the draft preview is `{ "assetId": "…", "kind": "Image", "url": "https://…" | null }`.

- [ ] **Step 1: Write the failing test** — `tests/Octopus.UnitTests/Menu/Application/PublicRead/PublicMenuMediaUrlsTests.cs`:

```csharp
using Octopus.Modules.Menu.Application.Abstractions;
using Octopus.Modules.Menu.Application.PublicRead;
using Octopus.Modules.Menu.Contracts.Dtos.PublicRead;
using Octopus.Modules.Menu.Domain.Identifiers;
using Octopus.Modules.Menu.Domain.Media;

namespace Octopus.UnitTests.Menu.Application.PublicRead;

public sealed class PublicMenuMediaUrlsTests
{
    private static readonly Guid Business = Guid.NewGuid();

    private sealed class FakeDeliveryUrls : IMediaDeliveryUrls
    {
        public string BuildUrl(string providerAssetId, MediaKind resourceType) => $"https://cdn.test/{resourceType}/{providerAssetId}";
    }

    private static MediaAsset Asset(Guid id, Guid business, string providerId) =>
        MediaAsset.Create(MediaAssetId.From(id), Guid.NewGuid(), business, providerId, 1, MediaKind.Image, "jpg", 10, 100, 100, null, DateTimeOffset.UtcNow);

    private static PublicTheme Theme(PublicMedia? logo, PublicMedia? hero) =>
        new(null, logo, hero, null, null, null, null, null, null, null, null, "TopBar", "IconAndText", "Classic", "SamePage", false, false);

    private static PublicMenuResponse Response(PublicMedia section, PublicMedia item, PublicMedia offer, PublicMedia logo) =>
        new(
            "Available", null, false, null, "en", ["en"],
            new PublicMenuHeader("Menu", Theme(logo, null)),
            [new PublicSection("Mains", null, section, "Grid", null, [new PublicEntry("i1", "Item"), new PublicEntry("o1", "Offer")])],
            new Dictionary<string, PublicItem>
            {
                ["i1"] = new("Burger", null, item, null, [], new PublicMoney(10m, "SAR"), [], new PublicAdvisories([], null), true, []),
            },
            new Dictionary<string, PublicModifierGroup>(),
            new Dictionary<string, PublicOffer>
            {
                ["o1"] = new("Combo", offer, null, false, [new PublicOfferComponent("i1", 1)],
                    new PublicOfferPricingRule("Fixed", new PublicMoney(8m, "SAR"), null, null, null),
                    new PublicOfferPrice(new PublicMoney(10m, "SAR"), new PublicMoney(8m, "SAR"), new PublicMoney(2m, "SAR"), 20m), true),
            },
            new PublicCurrency("SAR", 2),
            new PublicTax(false, null));

    [Fact]
    public async Task Every_media_reference_gets_its_delivery_url_and_an_unknown_asset_keeps_none()
    {
        Guid s = Guid.NewGuid(), i = Guid.NewGuid(), o = Guid.NewGuid(), l = Guid.NewGuid(), foreign = Guid.NewGuid();
        var repository = new FakeMediaAssetRepository();
        repository.SeedAsset(Asset(s, Business, "sec"));
        repository.SeedAsset(Asset(i, Business, "itm"));
        repository.SeedAsset(Asset(l, Business, "logo"));
        repository.SeedAsset(Asset(foreign, Guid.NewGuid(), "other")); // another business: must not resolve
        var resolver = new PublicMenuMediaUrls(repository, new FakeDeliveryUrls());

        PublicMenuResponse resolved = await resolver.ResolveAsync(
            Business,
            Response(new PublicMedia(s, "Image"), new PublicMedia(i, "Image"), new PublicMedia(foreign, "Image"), new PublicMedia(l, "Image")),
            CancellationToken.None);

        Assert.Equal("https://cdn.test/Image/sec", resolved.Sections[0].Image!.Url);
        Assert.Equal("https://cdn.test/Image/itm", resolved.Items["i1"].Image!.Url);
        Assert.Equal("https://cdn.test/Image/logo", resolved.Menu.Theme.Logo!.Url);
        Assert.Null(resolved.Offers["o1"].Image!.Url);
        Assert.Null(resolved.Menu.Theme.Hero);
    }

    [Fact]
    public async Task A_response_without_media_is_returned_unchanged()
    {
        var resolver = new PublicMenuMediaUrls(new FakeMediaAssetRepository(), new FakeDeliveryUrls());
        PublicMenuResponse bare = Response(null!, null!, null!, null!) with { Sections = [], Items = new Dictionary<string, PublicItem>(), Offers = new Dictionary<string, PublicOffer>() };
        Assert.Same(bare, await resolver.ResolveAsync(Business, bare, CancellationToken.None));
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `dotnet test tests/Octopus.UnitTests --filter "FullyQualifiedName~PublicMenuMediaUrlsTests"`
Expected: build FAIL — `PublicMenuMediaUrls` does not exist, `PublicMedia.Url` does not exist.

- [ ] **Step 3: Add `Url` to the contract** — replace lines 10-13 of `PublicMenuResponse.cs`:

```csharp
/// <summary>An image or video: the asset it is, and where a browser fetches it.</summary>
/// <param name="AssetId">The asset.</param>
/// <param name="Kind">Whether it is an image or a video.</param>
/// <param name="Url">The delivery URL, resolved by the read that served this response; <see langword="null"/> when the asset is no longer resolvable.</param>
public sealed record PublicMedia(Guid AssetId, string Kind, string? Url = null);
```

- [ ] **Step 4: Add the batch read** — in `IMediaAssetRepository` after `GetAssetAsync`:

```csharp
    /// <summary>Gets the verified assets of a business among <paramref name="assetIds"/>; ids of other businesses or unknown ids are simply absent.</summary>
    /// <param name="businessId">The owning business.</param>
    /// <param name="assetIds">The assets wanted.</param>
    /// <param name="cancellationToken">Cancels the read.</param>
    /// <returns>The assets found.</returns>
    Task<IReadOnlyList<MediaAsset>> GetAssetsAsync(
        Guid businessId, IReadOnlyCollection<MediaAssetId> assetIds, CancellationToken cancellationToken = default);
```

In `MediaAssetRepository` after `GetAssetAsync`:

```csharp
    /// <inheritdoc />
    public async Task<IReadOnlyList<MediaAsset>> GetAssetsAsync(
        Guid businessId, IReadOnlyCollection<MediaAssetId> assetIds, CancellationToken cancellationToken = default)
    {
        if (assetIds.Count == 0)
        {
            return [];
        }

        MenuDbContext context = await accessor.GetAsync(cancellationToken).ConfigureAwait(false);

        return await context.Set<MediaAsset>()
            .Where(asset => asset.BusinessId == businessId && assetIds.Contains(asset.Id))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
    }
```

In `FakeMediaAssetRepository` (MenuTestDoubles.cs) after `GetAssetAsync`:

```csharp
    public Task<IReadOnlyList<MediaAsset>> GetAssetsAsync(
        Guid businessId, IReadOnlyCollection<MediaAssetId> assetIds, CancellationToken cancellationToken = default)
        => Task.FromResult<IReadOnlyList<MediaAsset>>(
            [.. _assets.Where(asset => asset.BusinessId == businessId && assetIds.Contains(asset.Id))]);
```

- [ ] **Step 5: Create `PublicMenuMediaUrls.cs`**

```csharp
using Octopus.Modules.Menu.Application.Abstractions;
using Octopus.Modules.Menu.Contracts.Dtos.PublicRead;
using Octopus.Modules.Menu.Domain.Identifiers;
using Octopus.Modules.Menu.Domain.Media;

namespace Octopus.Modules.Menu.Application.PublicRead;

/// <summary>
/// Fills in where a browser fetches each image and video of a projected menu. The projection stays pure and names assets only;
/// this step, run by each read after projecting, resolves the business's verified assets to delivery URLs (ADR-049). An asset
/// that no longer resolves keeps a <see langword="null"/> URL, and the client shows its own placeholder.
/// </summary>
internal sealed class PublicMenuMediaUrls(IMediaAssetRepository assets, IMediaDeliveryUrls deliveryUrls)
{
    public async Task<PublicMenuResponse> ResolveAsync(Guid businessId, PublicMenuResponse response, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(response);

        HashSet<Guid> ids = [.. Referenced(response)];
        if (ids.Count == 0)
        {
            return response;
        }

        IReadOnlyList<MediaAsset> found = await assets
            .GetAssetsAsync(businessId, [.. ids.Select(MediaAssetId.From)], cancellationToken)
            .ConfigureAwait(false);

        Dictionary<Guid, string> urls = found.ToDictionary(
            asset => asset.Id.Value, asset => deliveryUrls.BuildUrl(asset.ProviderAssetId, asset.Kind));

        PublicMedia? With(PublicMedia? media) =>
            media is null ? null : media with { Url = urls.GetValueOrDefault(media.AssetId) };

        return response with
        {
            Menu = response.Menu with { Theme = response.Menu.Theme with { Logo = With(response.Menu.Theme.Logo), Hero = With(response.Menu.Theme.Hero) } },
            Sections = [.. response.Sections.Select(section => section with { Image = With(section.Image) })],
            Items = response.Items.ToDictionary(pair => pair.Key, pair => pair.Value with { Image = With(pair.Value.Image), Video = With(pair.Value.Video) }, StringComparer.Ordinal),
            Offers = response.Offers.ToDictionary(pair => pair.Key, pair => pair.Value with { Image = With(pair.Value.Image) }, StringComparer.Ordinal),
        };
    }

    private static IEnumerable<Guid> Referenced(PublicMenuResponse response)
    {
        IEnumerable<PublicMedia?> all =
        [
            response.Menu.Theme.Logo,
            response.Menu.Theme.Hero,
            .. response.Sections.Select(section => section.Image),
            .. response.Items.Values.SelectMany(item => new[] { item.Image, item.Video }),
            .. response.Offers.Values.Select(offer => offer.Image),
        ];
        return all.OfType<PublicMedia>().Select(media => media.AssetId);
    }
}
```

(If `MediaAssetId.From` or `.Value` is named differently, use the existing `MediaAssetId` factory/accessor used by `GetMediaAssetQueryHandler`.)

- [ ] **Step 6: Register and call it**

Register `PublicMenuMediaUrls` as scoped next to `PublicMenuServer` in the Menu module's DI. In `PublicMenuServer`, add the constructor parameter `PublicMenuMediaUrls mediaUrls` and change the projection line so the cached copy already carries URLs:

```csharp
        PublicMenuResponse response = cached ?? await mediaUrls.ResolveAsync(
            request.BusinessId,
            PublicMenuProjection.Project(
                document,
                snapshot.Overlay,
                availability,
                nextAvailableAtUtc,
                resolution.ServedAsFallback,
                printedLabel,
                request.PreferredLanguages,
                nowUtc,
                zone,
                request.SalesChannel),
            cancellationToken).ConfigureAwait(false);
```

In `PreviewDraftQueryHandler`, add the constructor parameter `PublicMenuMediaUrls mediaUrls` and return:

```csharp
        return await mediaUrls.ResolveAsync(
            query.BusinessId,
            PublicMenuProjection.Project(
                document,
                overlay,
                PublicAvailability.Available,
                nextAvailableAtUtc: null,
                servedAsFallback: false,
                locationLabel: null,
                query.PreferredLanguages),
            cancellationToken).ConfigureAwait(false);
```

Update every test that constructs `PublicMenuServer` or `PreviewDraftQueryHandler` (`grep -rln "new PublicMenuServer\|new PreviewDraftQueryHandler" tests`) to pass `new PublicMenuMediaUrls(new FakeMediaAssetRepository(), <a fake IMediaDeliveryUrls>)`.

- [ ] **Step 7: Run the tests**

Run: `dotnet test tests/Octopus.UnitTests --filter "FullyQualifiedName~Menu"` then `dotnet test tests/Octopus.ArchitectureTests`
Expected: PASS (the two new tests included). If an architecture rule forbids `PublicRead` from depending on `IMediaAssetRepository`, move `PublicMenuMediaUrls` to `Octopus.Modules.Menu.Application.Media` and keep everything else the same.

- [ ] **Step 8: Commit** (in `E:\Octupus\octopus-backend`)

```bash
git add src/Modules/Menu tests/Octopus.UnitTests/Menu specs
git commit -m "Serve delivery URLs with the public menu's images"
```

---

### Task 2: Shared contract — the public menu document and the menu canvas protocol

**Files:**
- Create: `packages/api-client/src/contracts/public-menu.ts`
- Create: `packages/api-client/src/contracts/menu-preview.ts`
- Modify: `packages/api-client/src/contracts/menu-admin.ts` (the `MenuPreview*` block, lines ~913-1027)
- Modify: `packages/api-client/src/index.ts`
- Test: `apps/customer/src/shared/lib/menu-preview-protocol.test.ts`

**Interfaces:**
- Produces: `PublicMenuDocument`, `PublicMenuTheme`, `PublicMenuSection`, `PublicMenuEntry`, `PublicMenuItem`, `PublicMenuOffer`, `PublicMenuModifierGroup`, `PublicMenuModifierOption`, `PublicMenuMedia`, `PublicMenuMoney`, `PublicMenuCurrency`; `MENU_PREVIEW_PATH` (`"/preview/menu"`), `MENU_PREVIEW_PROTOCOL` (`1`), `MENU_BUILDER_CHANNEL`, `MENU_CANVAS_CHANNEL`, `MenuRenderPayload`, `ToMenuCanvasBody`, `ToMenuCanvasMessage`, `MenuRenderMessage`, `FromMenuCanvasBody`, `FromMenuCanvasMessage`, `toMenuCanvas(body)`, `fromMenuCanvas(body)`, `isToMenuCanvasMessage(data)`, `isFromMenuCanvasMessage(data)`.

- [ ] **Step 1: Write the failing test** — `apps/customer/src/shared/lib/menu-preview-protocol.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  MENU_PREVIEW_PATH,
  fromMenuCanvas,
  isFromMenuCanvasMessage,
  isToMenuCanvasMessage,
  toMenuCanvas,
  type PublicMenuDocument,
} from "@octopus/api-client";

const document = { sections: [], items: {}, offers: {}, modifierGroups: {} } as unknown as PublicMenuDocument;

describe("menu preview protocol", () => {
  it("lives under the reserved preview segment", () => {
    expect(MENU_PREVIEW_PATH).toBe("/preview/menu");
  });

  it("recognises what it builds", () => {
    expect(isToMenuCanvasMessage(toMenuCanvas({ type: "render", document, mode: "order", selectable: true, highlightSectionRef: null }))).toBe(true);
    expect(isToMenuCanvasMessage(toMenuCanvas({ type: "scroll-to", anchor: "s0" }))).toBe(true);
    expect(isFromMenuCanvasMessage(fromMenuCanvas({ type: "ready" }))).toBe(true);
    expect(isFromMenuCanvasMessage(fromMenuCanvas({ type: "select-section", sectionRef: "s1" }))).toBe(true);
    expect(isFromMenuCanvasMessage(fromMenuCanvas({ type: "navigate", href: "/menu" }))).toBe(true);
  });

  it("ignores other versions, channels, the Public Link channels and bad shapes", () => {
    expect(isFromMenuCanvasMessage({ ...fromMenuCanvas({ type: "ready" }), protocol: 2 })).toBe(false);
    expect(isFromMenuCanvasMessage({ channel: "octopus-builder-canvas", protocol: 1, type: "ready" })).toBe(false);
    expect(isToMenuCanvasMessage({ ...toMenuCanvas({ type: "scroll-to", anchor: "a" }), channel: "octopus-builder" })).toBe(false);
    expect(isToMenuCanvasMessage({ channel: "octopus-menu-builder", protocol: 1, type: "render", document, mode: "sell", selectable: true, highlightSectionRef: null })).toBe(false);
    expect(isToMenuCanvasMessage({ channel: "octopus-menu-builder", protocol: 1, type: "render", document: null, mode: "view", selectable: true, highlightSectionRef: null })).toBe(false);
    expect(isFromMenuCanvasMessage({ ...fromMenuCanvas({ type: "select-section", sectionRef: "s0" }), sectionRef: 3 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/customer && npx vitest run src/shared/lib/menu-preview-protocol.test.ts`
Expected: FAIL — `toMenuCanvas is not a function`.

- [ ] **Step 3: Create `packages/api-client/src/contracts/public-menu.ts`**

```ts
// The anonymous public menu read (backend Menu module `PublicMenuResponse`, camelCase JSON), served by
//   GET /v1/public/menu-codes/{key}   (a scanned QR code)
//   GET /v1/public/site-menu/{key}    (a Public Link site's bound menu)
//   GET /menus/{menuId}/preview       (the builder's draft, admin)
// The storefront renders it; the menu builder produces the same shape from its unsaved draft for the live preview.
// Carries no internal ids: entries are addressed by response-local refs (i1, m1, o1).

export interface PublicMenuMoney {
  /** Major units, at the currency's precision. */
  amount: number;
  currency: string;
}

export interface PublicMenuMedia {
  assetId: string;
  /** "Image" | "Video". */
  kind: string;
  /** Where a browser fetches it; null when the server could not resolve it. */
  url?: string | null;
}

export interface PublicMenuItem {
  name: string;
  description: string | null;
  image: PublicMenuMedia | null;
  video: PublicMenuMedia | null;
  tags: string[];
  price: PublicMenuMoney | null;
  facts: { factCode: string; amount: number; unitCode: string }[];
  advisories: { labels: string[]; additionalInfo: string | null };
  isAvailable: boolean;
  modifierGroupRefs: string[];
}

export interface PublicMenuModifierOption {
  name: string;
  /** kind: "NoChange" | "AddAmount" | "FixedPrice". */
  effect: { kind: string; amount: PublicMenuMoney | null };
  isDefault: boolean;
  isAvailable: boolean;
}

export interface PublicMenuModifierGroup {
  promptLabel: string;
  helpText: string | null;
  /** "Single" | "Multiple". */
  selectionMode: string;
  minSelected: number;
  maxSelected: number | null;
  options: PublicMenuModifierOption[];
}

export interface PublicMenuOffer {
  name: string;
  image: PublicMenuMedia | null;
  badge: string | null;
  showSavingBadge: boolean;
  components: { itemRef: string; quantity: number }[];
  /** kind: "Fixed" | "DiscountPercent" | "DiscountAmount" | "Dynamic". */
  pricingRule: {
    kind: string;
    fixedPrice: PublicMenuMoney | null;
    discountPercent: number | null;
    discountAmount: PublicMenuMoney | null;
    dynamicBasePrice: PublicMenuMoney | null;
  };
  price: { referenceTotal: PublicMenuMoney; price: PublicMenuMoney; saving: PublicMenuMoney; savingPercent: number };
  isAvailable: boolean;
}

/** kind: "Item" | "Offer"; ref keys into `items` or `offers`. */
export interface PublicMenuEntry {
  ref: string;
  kind: string;
}

export interface PublicMenuSection {
  name: string;
  description: string | null;
  image: PublicMenuMedia | null;
  /** "List" | "Carousel" | "Grid". */
  displayStyle: string;
  color: string | null;
  entries: PublicMenuEntry[];
}

export interface PublicMenuTheme {
  presetCode: string | null;
  logo: PublicMenuMedia | null;
  hero: PublicMenuMedia | null;
  heroText: string | null;
  heroSubtext: string | null;
  titleFontCode: string | null;
  bodyFontCode: string | null;
  primaryColor: string | null;
  lightColor: string | null;
  accentColor: string | null;
  darkColor: string | null;
  /** "TopBar" | "SideDrawer" | "BottomBar" | "PillScroll". */
  navigationStyle: string;
  /** "IconAndText" | "TextOnly" | "IconOnly" | "ImageAndText". */
  sectionNavStyle: string;
  /** "Classic" | "CleanMinimal" | "ImageTop" | "ImageLeft". */
  cardStyle: string;
  /** "SamePage" | "Overlay" | "NewPage". */
  itemDetailsBehavior: string;
  stickyPrimaryAction: boolean;
  showItemTags: boolean;
}

export interface PublicMenuCurrency {
  code: string;
  minorUnits: number;
}

export interface PublicMenuDocument {
  /** "Available" | "PreOrder" | "NotAvailableNow". */
  availability: string;
  nextAvailableAtUtc: string | null;
  servedAsFallback: boolean;
  locationLabel: string | null;
  language: string;
  availableLanguages: string[];
  menu: { name: string; theme: PublicMenuTheme };
  sections: PublicMenuSection[];
  items: Record<string, PublicMenuItem>;
  modifierGroups: Record<string, PublicMenuModifierGroup>;
  offers: Record<string, PublicMenuOffer>;
  currency: PublicMenuCurrency | null;
  tax: { configured: boolean; pricesIncludeTax: boolean | null };
}
```

- [ ] **Step 4: Create `packages/api-client/src/contracts/menu-preview.ts`**

```ts
// The menu builder's live preview: the merchant console frames the storefront's /preview/menu canvas and drives it with
// postMessage. Same shape and trust rules as the Public Link canvas (builder-preview.ts), on its own channels so the two can
// never be confused. Both sides validate every message with these guards AND check the sender (origin and window).
import type { PublicMenuDocument } from "./public-menu";

export const MENU_PREVIEW_PROTOCOL = 1 as const;
/** Under the reserved `preview` first path segment, like the Public Link canvas. */
export const MENU_PREVIEW_PATH = "/preview/menu";
export const MENU_BUILDER_CHANNEL = "octopus-menu-builder" as const;
export const MENU_CANVAS_CHANNEL = "octopus-menu-canvas" as const;

export interface MenuRenderPayload {
  document: PublicMenuDocument;
  /** "order" shows add buttons and the sticky cart (the site); "view" never does (the QR menu). */
  mode: "order" | "view";
  /** Hover outlines and select-section clicks — only where the builder wires selection. */
  selectable: boolean;
  /** `s{index}` of the section being edited: outlined and scrolled into view. */
  highlightSectionRef: string | null;
}

export type ToMenuCanvasBody = ({ type: "render" } & MenuRenderPayload) | { type: "scroll-to"; anchor: string };
export type ToMenuCanvasMessage = ToMenuCanvasBody & { channel: typeof MENU_BUILDER_CHANNEL; protocol: typeof MENU_PREVIEW_PROTOCOL };
export type MenuRenderMessage = Extract<ToMenuCanvasMessage, { type: "render" }>;

export type FromMenuCanvasBody =
  | { type: "ready" }
  | { type: "navigate"; href: string }
  | { type: "select-section"; sectionRef: string };
export type FromMenuCanvasMessage = FromMenuCanvasBody & { channel: typeof MENU_CANVAS_CHANNEL; protocol: typeof MENU_PREVIEW_PROTOCOL };

export const toMenuCanvas = (body: ToMenuCanvasBody): ToMenuCanvasMessage => ({ ...body, channel: MENU_BUILDER_CHANNEL, protocol: MENU_PREVIEW_PROTOCOL });
export const fromMenuCanvas = (body: FromMenuCanvasBody): FromMenuCanvasMessage => ({ ...body, channel: MENU_CANVAS_CHANNEL, protocol: MENU_PREVIEW_PROTOCOL });

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function isToMenuCanvasMessage(data: unknown): data is ToMenuCanvasMessage {
  if (!isObject(data) || data.channel !== MENU_BUILDER_CHANNEL || data.protocol !== MENU_PREVIEW_PROTOCOL) return false;
  if (data.type === "render") {
    const doc = data.document;
    return (
      isObject(doc) &&
      Array.isArray(doc.sections) &&
      isObject(doc.items) &&
      isObject(doc.offers) &&
      (data.mode === "order" || data.mode === "view") &&
      typeof data.selectable === "boolean" &&
      (data.highlightSectionRef === null || typeof data.highlightSectionRef === "string")
    );
  }
  if (data.type === "scroll-to") return typeof data.anchor === "string";
  return false;
}

export function isFromMenuCanvasMessage(data: unknown): data is FromMenuCanvasMessage {
  if (!isObject(data) || data.channel !== MENU_CANVAS_CHANNEL || data.protocol !== MENU_PREVIEW_PROTOCOL) return false;
  switch (data.type) {
    case "ready":
      return true;
    case "navigate":
      return typeof data.href === "string";
    case "select-section":
      return typeof data.sectionRef === "string";
    default:
      return false;
  }
}
```

- [ ] **Step 5: Alias the admin preview types**

In `menu-admin.ts`, replace the bodies of `MenuPreviewMoney`, `MenuPreviewMedia`, `MenuPreviewSection`, `MenuPreviewItem`, `MenuPreviewModifierGroup`, `MenuPreviewOffer`, `MenuPreviewTheme` and `MenuPreviewResponse` with aliases (keep their doc comments; `GET /menus/{id}/preview` answers the public read's exact shape):

```ts
import type {
  PublicMenuDocument,
  PublicMenuItem,
  PublicMenuMedia,
  PublicMenuModifierGroup,
  PublicMenuMoney,
  PublicMenuOffer,
  PublicMenuSection,
  PublicMenuTheme,
} from "./public-menu";

export type MenuPreviewMoney = PublicMenuMoney;
export type MenuPreviewMedia = PublicMenuMedia;
export type MenuPreviewSection = PublicMenuSection;
export type MenuPreviewItem = PublicMenuItem;
export type MenuPreviewModifierGroup = PublicMenuModifierGroup;
export type MenuPreviewOffer = PublicMenuOffer;
export type MenuPreviewTheme = PublicMenuTheme;
export type MenuPreviewResponse = PublicMenuDocument;
```

(Put the `import type` at the top of the file with the other imports.) Add to `packages/api-client/src/index.ts` after `export * from "./contracts/builder-preview";`:

```ts
export * from "./contracts/public-menu";
export * from "./contracts/menu-preview";
```

- [ ] **Step 6: Run the tests and the type checks**

Run: `cd apps/customer && npx vitest run && npx tsc --noEmit -p .` then `cd ../merchant && npx tsc --noEmit -p . && npx vitest run`
Expected: all pass (3 new tests); both tsc exit 0. If merchant tsc fails because a caller relied on a narrower old `MenuPreview*` field type, fix the caller to the backend's shape (the aliases are authoritative).

- [ ] **Step 7: Commit**

```bash
git add packages/api-client/src/contracts/public-menu.ts packages/api-client/src/contracts/menu-preview.ts packages/api-client/src/contracts/menu-admin.ts packages/api-client/src/index.ts apps/customer/src/shared/lib/menu-preview-protocol.test.ts
git commit -m "Share the public menu document and the menu canvas protocol"
```

---

### Task 3: Storefront — theme and menu model (pure)

**Files:**
- Create: `apps/customer/src/widgets/themed-menu/menu-theme.ts`
- Create: `apps/customer/src/widgets/themed-menu/menu-model.ts`
- Test: `apps/customer/src/widgets/themed-menu/menu-theme.test.ts`, `apps/customer/src/widgets/themed-menu/menu-model.test.ts`

**Interfaces:**
- Consumes: `PublicMenuDocument`, `PublicMenuTheme`, `PublicMenuMoney`, `PublicMenuCurrency`, `PublicMenuMedia` (Task 2).
- Produces:
  - `type NavStyle = "top-bar" | "side-drawer" | "bottom-bar" | "pill-scroll"`, `type CategoryStyle = "icon-text" | "text-only" | "icons-only" | "image-text"`, `type CardStyle = "classic" | "clean-minimal" | "image-top" | "image-left"`, `type DetailsStyle = "same-page" | "overlay" | "new-page"`, `type DisplayStyle = "list" | "carousel" | "grid"`.
  - `menuLayout(theme): { nav: NavStyle; category: CategoryStyle; card: CardStyle; details: DetailsStyle; stickyCart: boolean; showTags: boolean }`, `displayStyleOf(value: string): DisplayStyle`.
  - `menuThemeStyle(theme): Record<string, string>` (CSS custom properties), `menuFontStack(code: string | null): string | null`, `safeColor(value: string | null | undefined): string | null`.
  - `formatMoney(money: PublicMenuMoney | null, currency: PublicMenuCurrency | null, currencyLabel: (code: string) => string): string`.
  - `mediaUrl(media: PublicMenuMedia | null | undefined, fallback: string | null): string | null`.
  - `interface MenuView { name; heroUrl; heroText; heroSubtext; logoUrl; sections: SectionView[]; availability: string; nextAvailableAtUtc: string | null }`, `interface SectionView { ref: string; name; description; imageUrl; displayStyle: DisplayStyle; color: string | null; entries: EntryView[] }`, `type EntryView = { kind: "item"; ref: string; name; description; imageUrl; price: string; available: boolean; tags: string[] } | { kind: "offer"; ref: string; name; imageUrl; price: string; was: string | null; badge: string | null; saving: string | null; available: boolean }`, `menuView(doc, currencyLabel): MenuView`. Section refs are `s{index}` in document order; an entry whose ref is missing from `items`/`offers` is skipped.

- [ ] **Step 1: Write the failing tests**

`apps/customer/src/widgets/themed-menu/menu-theme.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { PublicMenuTheme } from "@octopus/api-client";
import { displayStyleOf, formatMoney, mediaUrl, menuFontStack, menuLayout, menuThemeStyle, safeColor } from "./menu-theme";

const theme: PublicMenuTheme = {
  presetCode: null, logo: null, hero: null, heroText: null, heroSubtext: null, titleFontCode: "cairo", bodyFontCode: "unknown-face",
  primaryColor: "#ff0000", lightColor: "#FFF", accentColor: "red", darkColor: null,
  navigationStyle: "SideDrawer", sectionNavStyle: "ImageAndText", cardStyle: "ImageLeft", itemDetailsBehavior: "Overlay",
  stickyPrimaryAction: true, showItemTags: true,
};

describe("menu theme", () => {
  it("maps the backend's enum strings, and unknown ones to the backend defaults", () => {
    expect(menuLayout(theme)).toEqual({ nav: "side-drawer", category: "image-text", card: "image-left", details: "overlay", stickyCart: true, showTags: true });
    expect(menuLayout({ ...theme, navigationStyle: "Floating", sectionNavStyle: "", cardStyle: "x", itemDetailsBehavior: "y" })).toMatchObject({
      nav: "top-bar", category: "icon-text", card: "classic", details: "same-page",
    });
    expect(displayStyleOf("Carousel")).toBe("carousel");
    expect(displayStyleOf("Masonry")).toBe("list");
  });

  it("turns valid colours into storefront variables and ignores malformed ones", () => {
    expect(safeColor("#FFF")).toBe("#FFF");
    expect(safeColor("red")).toBeNull();
    expect(safeColor(null)).toBeNull();
    expect(menuThemeStyle(theme)).toEqual({ "--octo-brand": "#ff0000", "--octo-store-price": "#ff0000", "--octo-store-page": "#FFF" });
  });

  it("uses a loaded face for a known font code and nothing for an unknown one", () => {
    expect(menuFontStack("cairo")).toContain("var(--font-cairo-loaded)");
    expect(menuFontStack("unknown-face")).toBeNull();
    expect(menuFontStack(null)).toBeNull();
  });

  it("formats money at the currency's precision and labels it", () => {
    const label = (code: string) => (code === "SAR" ? "ر.س" : code);
    expect(formatMoney({ amount: 12.5, currency: "SAR" }, { code: "SAR", minorUnits: 2 }, label)).toBe("12.50 ر.س");
    expect(formatMoney({ amount: 3, currency: "KWD" }, { code: "KWD", minorUnits: 3 }, label)).toBe("3.000 KWD");
    expect(formatMoney({ amount: 7, currency: "SAR" }, null, label)).toBe("7");
    expect(formatMoney(null, null, label)).toBe("");
  });

  it("prefers a resolved media URL and falls back otherwise", () => {
    expect(mediaUrl({ assetId: "a", kind: "Image", url: "https://cdn/a.jpg" }, "/x.png")).toBe("https://cdn/a.jpg");
    expect(mediaUrl({ assetId: "a", kind: "Image", url: null }, "/x.png")).toBe("/x.png");
    expect(mediaUrl(null, null)).toBeNull();
  });
});
```

`apps/customer/src/widgets/themed-menu/menu-model.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { PublicMenuDocument } from "@octopus/api-client";
import { menuView } from "./menu-model";

const money = (amount: number) => ({ amount, currency: "SAR" });
const doc: PublicMenuDocument = {
  availability: "PreOrder", nextAvailableAtUtc: "2026-09-29T08:00:00Z", servedAsFallback: false, locationLabel: null,
  language: "ar", availableLanguages: ["ar"],
  menu: {
    name: "Lunch",
    theme: {
      presetCode: null, logo: { assetId: "l", kind: "Image", url: "https://cdn/l.png" }, hero: null, heroText: "Hi", heroSubtext: null,
      titleFontCode: null, bodyFontCode: null, primaryColor: null, lightColor: null, accentColor: null, darkColor: null,
      navigationStyle: "TopBar", sectionNavStyle: "IconAndText", cardStyle: "Classic", itemDetailsBehavior: "SamePage", stickyPrimaryAction: false, showItemTags: true,
    },
  },
  sections: [
    { name: "Mains", description: "Hot", image: null, displayStyle: "Grid", color: "#123456", entries: [{ ref: "i1", kind: "Item" }, { ref: "i9", kind: "Item" }, { ref: "o1", kind: "Offer" }] },
    { name: "Empty", description: null, image: null, displayStyle: "List", color: null, entries: [] },
  ],
  items: {
    i1: { name: "Burger", description: null, image: null, video: null, tags: ["Spicy"], price: money(25), facts: [], advisories: { labels: [], additionalInfo: null }, isAvailable: false, modifierGroupRefs: [] },
  },
  modifierGroups: {},
  offers: {
    o1: {
      name: "Combo", image: null, badge: "New", showSavingBadge: true, components: [{ itemRef: "i1", quantity: 2 }],
      pricingRule: { kind: "Fixed", fixedPrice: money(40), discountPercent: null, discountAmount: null, dynamicBasePrice: null },
      price: { referenceTotal: money(50), price: money(40), saving: money(10), savingPercent: 20 }, isAvailable: true,
    },
  },
  currency: { code: "SAR", minorUnits: 2 },
  tax: { configured: false, pricesIncludeTax: null },
};

describe("menuView", () => {
  const view = menuView(doc, (code) => code);

  it("keeps the document's sections in order with s{index} refs, skipping unknown entries", () => {
    expect(view.sections.map((s) => [s.ref, s.name, s.displayStyle, s.entries.length])).toEqual([
      ["s0", "Mains", "grid", 2],
      ["s1", "Empty", "list", 0],
    ]);
  });

  it("carries items and offers ready to draw", () => {
    expect(view.sections[0].entries[0]).toEqual({ kind: "item", ref: "i1", name: "Burger", description: "", imageUrl: null, price: "25.00 SAR", available: false, tags: ["Spicy"] });
    expect(view.sections[0].entries[1]).toEqual({ kind: "offer", ref: "o1", name: "Combo", imageUrl: null, price: "40.00 SAR", was: "50.00 SAR", badge: "New", saving: "20%", available: true });
  });

  it("carries brand and availability", () => {
    expect(view).toMatchObject({ name: "Lunch", logoUrl: "https://cdn/l.png", heroText: "Hi", heroUrl: null, availability: "PreOrder", nextAvailableAtUtc: "2026-09-29T08:00:00Z" });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd apps/customer && npx vitest run src/widgets/themed-menu`
Expected: FAIL — cannot find `./menu-theme` / `./menu-model`.

- [ ] **Step 3: Create `menu-theme.ts`**

```ts
// A menu's own presentation (PublicMenuTheme) -> what the storefront draws with. Every value is optional in practice: an
// unknown enum string, a malformed colour or an unknown font code falls back to the storefront default for that option,
// so a newer backend never breaks an older storefront.
import type { PublicMenuCurrency, PublicMenuMedia, PublicMenuMoney, PublicMenuTheme } from "@octopus/api-client";

export type NavStyle = "top-bar" | "side-drawer" | "bottom-bar" | "pill-scroll";
export type CategoryStyle = "icon-text" | "text-only" | "icons-only" | "image-text";
export type CardStyle = "classic" | "clean-minimal" | "image-top" | "image-left";
export type DetailsStyle = "same-page" | "overlay" | "new-page";
export type DisplayStyle = "list" | "carousel" | "grid";

const NAV: Record<string, NavStyle> = { TopBar: "top-bar", SideDrawer: "side-drawer", BottomBar: "bottom-bar", PillScroll: "pill-scroll" };
const CATEGORY: Record<string, CategoryStyle> = { IconAndText: "icon-text", TextOnly: "text-only", IconOnly: "icons-only", ImageAndText: "image-text" };
const CARD: Record<string, CardStyle> = { Classic: "classic", CleanMinimal: "clean-minimal", ImageTop: "image-top", ImageLeft: "image-left" };
const DETAILS: Record<string, DetailsStyle> = { SamePage: "same-page", Overlay: "overlay", NewPage: "new-page" };
const DISPLAY: Record<string, DisplayStyle> = { List: "list", Carousel: "carousel", Grid: "grid" };

export function menuLayout(theme: PublicMenuTheme) {
  return {
    nav: NAV[theme.navigationStyle] ?? "top-bar",
    category: CATEGORY[theme.sectionNavStyle] ?? "icon-text",
    card: CARD[theme.cardStyle] ?? "classic",
    details: DETAILS[theme.itemDetailsBehavior] ?? "same-page",
    stickyCart: theme.stickyPrimaryAction,
    showTags: theme.showItemTags,
  };
}

export const displayStyleOf = (value: string): DisplayStyle => DISPLAY[value] ?? "list";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
export const safeColor = (value: string | null | undefined): string | null => (value && HEX.test(value) ? value : null);

/** The menu's colours as the storefront CSS variables they drive (same mapping as the site theme, brand-theme.ts). */
export function menuThemeStyle(theme: PublicMenuTheme): Record<string, string> {
  const style: Record<string, string> = {};
  const primary = safeColor(theme.primaryColor);
  const light = safeColor(theme.lightColor);
  const dark = safeColor(theme.darkColor);
  if (primary) {
    style["--octo-brand"] = primary;
    style["--octo-store-price"] = primary;
  }
  if (light) style["--octo-store-page"] = light;
  if (dark) style["--octo-text-primary"] = dark;
  return style;
}

/** Font code -> the CSS variable app/layout.tsx registers for it (the menu font catalogue uses the same codes). */
const FONT_VAR: Record<string, string> = {
  inter: "var(--font-inter-loaded)",
  cairo: "var(--font-cairo-loaded)",
  tajawal: "var(--font-tajawal-loaded)",
  poppins: "var(--font-poppins-loaded)",
  "playfair-display": "var(--font-playfair-loaded)",
};

export function menuFontStack(code: string | null): string | null {
  const face = code ? FONT_VAR[code.toLowerCase()] : undefined;
  return face ? `${face}, var(--font-family-active)` : null;
}

export function formatMoney(money: PublicMenuMoney | null, currency: PublicMenuCurrency | null, currencyLabel: (code: string) => string): string {
  if (!money) return "";
  if (!currency) return String(money.amount);
  return `${money.amount.toFixed(currency.minorUnits)} ${currencyLabel(currency.code)}`;
}

export const mediaUrl = (media: PublicMenuMedia | null | undefined, fallback: string | null): string | null => media?.url || fallback;
```

- [ ] **Step 4: Create `menu-model.ts`**

```ts
// The public menu document -> what ThemedMenu draws: sections in order (ref s{index}), each entry resolved against the
// document's items/offers with its price already formatted. An entry whose ref is missing is skipped (a degraded document
// renders what it can).
import type { PublicMenuDocument } from "@octopus/api-client";
import { displayStyleOf, formatMoney, mediaUrl, type DisplayStyle } from "./menu-theme";

export type EntryView =
  | { kind: "item"; ref: string; name: string; description: string; imageUrl: string | null; price: string; available: boolean; tags: string[] }
  | { kind: "offer"; ref: string; name: string; imageUrl: string | null; price: string; was: string | null; badge: string | null; saving: string | null; available: boolean };

export interface SectionView {
  ref: string;
  name: string;
  description: string;
  imageUrl: string | null;
  displayStyle: DisplayStyle;
  color: string | null;
  entries: EntryView[];
}

export interface MenuView {
  name: string;
  logoUrl: string | null;
  heroUrl: string | null;
  heroText: string | null;
  heroSubtext: string | null;
  availability: string;
  nextAvailableAtUtc: string | null;
  sections: SectionView[];
}

export function menuView(doc: PublicMenuDocument, currencyLabel: (code: string) => string): MenuView {
  const money = (m: Parameters<typeof formatMoney>[0]) => formatMoney(m, doc.currency, currencyLabel);
  const sections = doc.sections.map((section, index): SectionView => ({
    ref: `s${index}`,
    name: section.name,
    description: section.description ?? "",
    imageUrl: mediaUrl(section.image, null),
    displayStyle: displayStyleOf(section.displayStyle),
    color: section.color,
    entries: section.entries.flatMap((entry): EntryView[] => {
      if (entry.kind === "Offer") {
        const offer = doc.offers[entry.ref];
        if (!offer) return [];
        const saves = offer.price.saving.amount > 0;
        return [
          {
            kind: "offer",
            ref: entry.ref,
            name: offer.name,
            imageUrl: mediaUrl(offer.image, null),
            price: money(offer.price.price),
            was: saves ? money(offer.price.referenceTotal) : null,
            badge: offer.badge,
            saving: offer.showSavingBadge && saves ? `${Math.round(offer.price.savingPercent)}%` : null,
            available: offer.isAvailable,
          },
        ];
      }
      const item = doc.items[entry.ref];
      if (!item) return [];
      return [
        {
          kind: "item",
          ref: entry.ref,
          name: item.name,
          description: item.description ?? "",
          imageUrl: mediaUrl(item.image, null),
          price: money(item.price),
          available: item.isAvailable,
          tags: item.tags,
        },
      ];
    }),
  }));
  return {
    name: doc.menu.name,
    logoUrl: mediaUrl(doc.menu.theme.logo, null),
    heroUrl: mediaUrl(doc.menu.theme.hero, null),
    heroText: doc.menu.theme.heroText,
    heroSubtext: doc.menu.theme.heroSubtext,
    availability: doc.availability,
    nextAvailableAtUtc: doc.nextAvailableAtUtc,
    sections,
  };
}
```

- [ ] **Step 5: Run the tests**

Run: `cd apps/customer && npx vitest run src/widgets/themed-menu && npx tsc --noEmit -p .`
Expected: PASS; tsc 0.

- [ ] **Step 6: Commit**

```bash
git add apps/customer/src/widgets/themed-menu/menu-theme.ts apps/customer/src/widgets/themed-menu/menu-model.ts apps/customer/src/widgets/themed-menu/menu-theme.test.ts apps/customer/src/widgets/themed-menu/menu-model.test.ts
git commit -m "Map a menu's own theme and document for the storefront"
```

---

### Task 4: Storefront — the `ThemedMenu` component

**Files:**
- Create: `apps/customer/src/widgets/themed-menu/entry-card.tsx`
- Create: `apps/customer/src/widgets/themed-menu/section-block.tsx`
- Create: `apps/customer/src/widgets/themed-menu/category-nav.tsx`
- Create: `apps/customer/src/widgets/themed-menu/item-details.tsx`
- Create: `apps/customer/src/widgets/themed-menu/themed-menu.tsx`
- Create: `apps/customer/src/widgets/themed-menu/index.ts`
- Modify: `packages/i18n/src/locales/en/index.ts`, `packages/i18n/src/locales/ar/index.ts` (keys below)
- Test: `apps/customer/src/widgets/themed-menu/themed-menu.test.ts`

**Interfaces:**
- Consumes: Task 3 (`menuView`, `menuLayout`, `menuThemeStyle`, `menuFontStack`, types); `menuFromDocument` (`@/shared/api/menu-document`); `AddToCartModal` (`@/features/cart/add-to-cart`, props `{ item: MenuItem | null; onClose }`); `useOrderingSession` (`@/entities/order`, has `state.lines`); `useI18n` (`@/app/providers`); `DoodlePattern` (`@/shared/ui`).
- Produces: `ThemedMenu({ document, mode, selectable?, highlightSectionRef?, header? }: { document: PublicMenuDocument; mode: "order" | "view"; selectable?: boolean; highlightSectionRef?: string | null; header?: "brand" | "none" })`. Every section wrapper carries `data-section-ref="s{index}"` and `id="s{index}"`; with `selectable` it also carries `data-selectable`.
- i18n keys (add to both locales): `store.menu.unavailable` ("Unavailable" / "غير متاح"), `store.menu.notAvailableNow` ("This menu is not being served right now." / "هذه القائمة غير متاحة الآن."), `store.menu.preOrder` ("Pre-order — served from {time}." / "طلب مسبق — تُقدَّم من {time}."), `store.menu.empty` ("This menu has no items yet." / "لا توجد أصناف في هذه القائمة بعد."), `store.menu.add` ("Add" / "أضف"), `store.menu.close` ("Close" / "إغلاق"), `store.menu.sections` ("Sections" / "الأقسام"), `store.menu.save` ("Save {n}" / "وفّر {n}").

- [ ] **Step 1: Write the failing render test** — `themed-menu.test.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublicMenuDocument } from "@octopus/api-client";
import { StoreI18nProvider } from "@/app/providers";
import { OrderingSessionProvider } from "@/entities/order";
import { ThemedMenu } from "./themed-menu";

const money = (amount: number) => ({ amount, currency: "SAR" });
function doc(themePatch: Partial<PublicMenuDocument["menu"]["theme"]> = {}, patch: Partial<PublicMenuDocument> = {}): PublicMenuDocument {
  return {
    availability: "Available", nextAvailableAtUtc: null, servedAsFallback: false, locationLabel: null, language: "en", availableLanguages: ["en"],
    menu: {
      name: "Lunch",
      theme: {
        presetCode: null, logo: null, hero: null, heroText: null, heroSubtext: null, titleFontCode: null, bodyFontCode: null,
        primaryColor: "#aa0000", lightColor: null, accentColor: null, darkColor: null,
        navigationStyle: "TopBar", sectionNavStyle: "TextOnly", cardStyle: "Classic", itemDetailsBehavior: "Overlay", stickyPrimaryAction: true, showItemTags: true,
        ...themePatch,
      },
    },
    sections: [
      { name: "Mains", description: null, image: null, displayStyle: "Grid", color: "#00aa00", entries: [{ ref: "i1", kind: "Item" }, { ref: "i2", kind: "Item" }] },
      { name: "Deals", description: null, image: null, displayStyle: "Carousel", color: null, entries: [{ ref: "o1", kind: "Offer" }] },
    ],
    items: {
      i1: { name: "Burger", description: "Beef", image: { assetId: "a", kind: "Image", url: "https://cdn/b.jpg" }, video: null, tags: ["Spicy"], price: money(25), facts: [], advisories: { labels: [], additionalInfo: null }, isAvailable: true, modifierGroupRefs: [] },
      i2: { name: "Soup", description: null, image: null, video: null, tags: [], price: money(9), facts: [], advisories: { labels: [], additionalInfo: null }, isAvailable: false, modifierGroupRefs: [] },
    },
    modifierGroups: {},
    offers: {
      o1: {
        name: "Combo", image: null, badge: null, showSavingBadge: true, components: [{ itemRef: "i1", quantity: 1 }],
        pricingRule: { kind: "Fixed", fixedPrice: money(20), discountPercent: null, discountAmount: null, dynamicBasePrice: null },
        price: { referenceTotal: money(25), price: money(20), saving: money(5), savingPercent: 20 }, isAvailable: true,
      },
    },
    currency: { code: "SAR", minorUnits: 2 },
    tax: { configured: false, pricesIncludeTax: null },
    ...patch,
  };
}

function render(document: PublicMenuDocument, mode: "order" | "view", selectable = false) {
  return renderToStaticMarkup(
    createElement(StoreI18nProvider, {
      locale: "en",
      children: createElement(OrderingSessionProvider, { persist: false, children: createElement(ThemedMenu, { document, mode, selectable }) }),
    })
  );
}

describe("ThemedMenu", () => {
  it("draws sections, items, offers, tags and prices with the menu's colours", () => {
    const html = render(doc(), "order");
    for (const text of ["Mains", "Deals", "Burger", "Soup", "Combo", "Spicy", "25.00", "20.00", "https://cdn/b.jpg", "#aa0000", "#00aa00"]) expect(html).toContain(text);
    expect(html).toContain('data-section-ref="s0"');
    expect(html).toContain("Unavailable");
  });

  it("renders every navigation, category, card and display style without failing", () => {
    for (const navigationStyle of ["TopBar", "SideDrawer", "BottomBar", "PillScroll", "Unknown"])
      for (const sectionNavStyle of ["IconAndText", "TextOnly", "IconOnly", "ImageAndText"])
        for (const cardStyle of ["Classic", "CleanMinimal", "ImageTop", "ImageLeft"]) {
          const html = render(doc({ navigationStyle, sectionNavStyle, cardStyle }), "order");
          expect(html).toContain("Burger");
        }
  });

  it("never shows ordering controls in view mode", () => {
    const order = render(doc(), "order");
    const view = render(doc(), "view");
    expect(order).toContain('data-menu-add="i1"');
    expect(order).toContain("data-sticky-cart");
    expect(view).not.toContain("data-menu-add");
    expect(view).not.toContain("data-sticky-cart");
  });

  it("hides tags when the theme says so and marks sections selectable only when asked", () => {
    expect(render(doc({ showItemTags: false }), "order")).not.toContain("Spicy");
    expect(render(doc(), "view", true)).toContain("data-selectable");
    expect(render(doc(), "view", false)).not.toContain("data-selectable");
  });

  it("explains a menu that is not served now, and an empty menu", () => {
    expect(render(doc({}, { availability: "NotAvailableNow" }), "view")).toContain("not being served right now");
    expect(render(doc({}, { sections: [] }), "view")).toContain("no items yet");
  });
});
```

(`OrderingSessionProvider` already accepts `persist` — added by the previous change; if it does not, add `persist?: boolean` defaulting to `true` there first.)

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/customer && npx vitest run src/widgets/themed-menu/themed-menu.test.ts`
Expected: FAIL — cannot find `./themed-menu`.

- [ ] **Step 2b: Align the storefront's menu reader with the real public read**

The backend names a modifier group's label `promptLabel` (and gives `minSelected`), but `apps/customer/src/shared/api/menu-document.ts` reads `name` / `isRequired` — so group labels are blank on the live storefront today, and `ThemedMenu` could not pass the shared `PublicMenuDocument` to it. In `menu-document.ts`, change the modifier-group part of `PublicMenuDocument` to accept both shapes (the Public Link canvas still sends `name`):

```ts
  modifierGroups: Record<string, {
    promptLabel?: string;
    name?: string;
    selectionMode: string;
    minSelected?: number;
    isRequired?: boolean;
    showAsRadio?: boolean;
    options: { id?: string; name: string; effect?: { amount?: { amount: number } | null }; isDefault?: boolean }[];
  }>;
```

and in `menuFromDocument` use `label: g.promptLabel ?? g.name ?? ""` and `required: g.isRequired ?? (g.minSelected ?? 0) > 0`. Add to `apps/customer/src/shared/api/public-api.test.ts` (or a new `menu-document.test.ts`) a case: a document whose group has `promptLabel: "Size", minSelected: 1` yields a modifier group with `label: "Size"` and `required: true`.

- [ ] **Step 3: Create `entry-card.tsx`** — the four card styles (visual reference: the builder's `StorefrontPreview` `productCard`, drawn at full size):

```tsx
"use client";

import { ShoppingBag, Tag } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers";
import type { CardStyle } from "./menu-theme";
import type { EntryView } from "./menu-model";

const STOCK = "/images/storefront/all.png";

export interface EntryCardProps {
  entry: EntryView;
  card: CardStyle;
  showTags: boolean;
  /** Present in order mode: opens the add-to-cart dialog for this item. */
  onAdd?: () => void;
  onOpen: () => void;
}

export function EntryCard({ entry, card, showTags, onAdd, onOpen }: EntryCardProps) {
  const { t } = useI18n();
  const image = entry.imageUrl ?? STOCK;
  const tags = entry.kind === "item" && showTags ? entry.tags : [];
  const badge = entry.kind === "offer" ? entry.badge : null;
  const saving = entry.kind === "offer" && entry.saving ? t("store.menu.save").replace("{n}", entry.saving) : null;

  const price = (
    <span className="flex flex-col items-end leading-tight">
      <span className="whitespace-nowrap text-[14px] font-bold text-[var(--octo-store-price)]">{entry.price}</span>
      {entry.kind === "offer" && entry.was && <span className="whitespace-nowrap text-[11px] text-[var(--octo-text-faint)] line-through">{entry.was}</span>}
    </span>
  );
  const add =
    onAdd && entry.available ? (
      <button
        type="button"
        data-menu-add={entry.ref}
        aria-label={t("store.menu.add")}
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-[var(--octo-brand)] text-white hover:opacity-90"
      >
        <ShoppingBag size={16} />
      </button>
    ) : null;
  const chips = (
    <span className="flex flex-wrap gap-1">
      {[badge, saving, ...tags].filter((x): x is string => Boolean(x)).map((label) => (
        <span key={label} className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--octo-brand)_12%,transparent)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--octo-brand)]">
          <Tag size={10} aria-hidden />
          {label}
        </span>
      ))}
    </span>
  );
  const unavailable = !entry.available && <span className="text-[11px] font-semibold text-[var(--octo-text-muted)]">{t("store.menu.unavailable")}</span>;
  const description = entry.kind === "item" && entry.description ? <p className="line-clamp-2 text-[12px] leading-[1.6] text-[var(--octo-text-muted)]">{entry.description}</p> : null;
  const shell = clsx("relative cursor-pointer text-start", !entry.available && "opacity-60");

  if (card === "clean-minimal") {
    return (
      <article onClick={onOpen} className={clsx(shell, "flex flex-col gap-1 border-b border-[var(--octo-border-card)] py-3")}>
        {chips}
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[15px] font-bold text-[var(--octo-text-primary)]">{entry.name}</h3>
          {price}
        </div>
        {description}
        <div className="flex items-center justify-between">{unavailable}{add}</div>
      </article>
    );
  }
  if (card === "image-left") {
    return (
      <article onClick={onOpen} className={clsx(shell, "flex gap-3 rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3")}>
        <img src={image} alt="" loading="lazy" className="h-[92px] w-[92px] shrink-0 rounded-xl bg-[var(--octo-store-soft)] object-cover" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {chips}
          <h3 className="truncate text-[14px] font-bold text-[var(--octo-text-primary)]">{entry.name}</h3>
          {description}
          <div className="mt-auto flex items-end justify-between gap-2">{price}{unavailable}{add}</div>
        </div>
      </article>
    );
  }
  if (card === "image-top") {
    return (
      <article onClick={onOpen} className={clsx(shell, "flex flex-col overflow-hidden rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]")}>
        <img src={image} alt="" loading="lazy" className="h-[150px] w-full bg-[var(--octo-store-soft)] object-cover" />
        <div className="flex flex-1 flex-col gap-1 p-3">
          {chips}
          <h3 className="truncate text-[14px] font-bold text-[var(--octo-text-primary)]">{entry.name}</h3>
          {description}
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">{add ?? unavailable}{price}</div>
        </div>
      </article>
    );
  }
  return (
    <article onClick={onOpen} className={clsx(shell, "flex flex-col rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3")}>
      {chips}
      <img src={image} alt="" loading="lazy" className="mx-auto mt-2 h-[110px] w-auto max-w-full object-contain" />
      <h3 className="mt-3 truncate text-[13px] font-bold text-[var(--octo-text-primary)]">{entry.name}</h3>
      {description}
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">{add ?? unavailable}{price}</div>
    </article>
  );
}
```

- [ ] **Step 4: Create `section-block.tsx`**

```tsx
"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import type { SectionView } from "./menu-model";

export function SectionBlock({ section, selectable, children }: { section: SectionView; selectable: boolean; children: ReactNode[] }) {
  const accent = section.color ?? "var(--octo-brand)";
  const layout =
    section.displayStyle === "carousel"
      ? "flex snap-x gap-4 overflow-x-auto pb-2 [&>*]:w-[240px] [&>*]:shrink-0 [&>*]:snap-start"
      : section.displayStyle === "grid"
        ? "grid grid-cols-2 gap-4 lg:grid-cols-4"
        : "grid grid-cols-1 gap-3 md:grid-cols-2";
  return (
    <section
      id={section.ref}
      data-section-ref={section.ref}
      data-selectable={selectable ? "" : undefined}
      className="flex scroll-mt-24 flex-col gap-4"
    >
      <h2 className="flex items-center gap-3">
        <span className="h-[26px] w-[4px] shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
        <span className="text-[22px] font-bold text-[var(--octo-text-primary)] sm:text-[26px]">{section.name}</span>
      </h2>
      {section.description && <p className="-mt-2 text-[13px] text-[var(--octo-text-muted)]">{section.description}</p>}
      <div className={clsx(layout)}>{children}</div>
    </section>
  );
}
```

- [ ] **Step 5: Create `category-nav.tsx`** — four navigation styles × four category styles:

```tsx
"use client";

import clsx from "clsx";
import { House, LayoutGrid, Menu as MenuIcon, ShoppingBag, User, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/app/providers";
import type { CategoryStyle, NavStyle } from "./menu-theme";
import type { SectionView } from "./menu-model";

const STOCK = "/images/storefront/all.png";

function Chip({ section, style, active, onClick }: { section: SectionView; style: CategoryStyle; active: boolean; onClick: () => void }) {
  const image = section.imageUrl ?? STOCK;
  const ring = active ? "var(--octo-brand)" : (section.color ?? "var(--octo-border-card)");
  if (style === "text-only") {
    return (
      <button type="button" onClick={onClick} className={clsx("shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-semibold", active ? "bg-[var(--octo-brand)] text-white" : "text-[var(--octo-text-secondary)]")} style={{ borderColor: ring }}>
        {section.name}
      </button>
    );
  }
  if (style === "image-text") {
    return (
      <button type="button" onClick={onClick} className="relative h-[72px] w-[120px] shrink-0 overflow-hidden rounded-xl border-b-[3px] text-start" style={{ borderBottomColor: ring }}>
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" aria-hidden />
        <span className="absolute inset-x-2 bottom-1.5 truncate text-[12px] font-semibold text-white">{section.name}</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} title={section.name} className="flex w-[64px] shrink-0 flex-col items-center gap-1">
      <span className="grid h-[52px] w-[52px] place-items-center overflow-hidden rounded-full border-2 bg-[var(--octo-store-soft)]" style={{ borderColor: ring }}>
        <img src={image} alt="" className="h-full w-full object-cover" />
      </span>
      {style === "icon-text" && <span className={clsx("w-full truncate text-center text-[11px] font-medium", active ? "text-[var(--octo-brand)]" : "text-[var(--octo-text-secondary)]")}>{section.name}</span>}
    </button>
  );
}

export interface CategoryNavProps {
  sections: SectionView[];
  nav: NavStyle;
  category: CategoryStyle;
  active: string | null;
  onJump: (ref: string) => void;
}

/** The strip (top bar, pills), the side drawer, or the bottom bar — how a customer moves between sections. */
export function CategoryNav({ sections, nav, category, active, onJump }: CategoryNavProps) {
  const { t } = useI18n();
  const [drawer, setDrawer] = useState(false);
  const chips = sections.map((s) => <Chip key={s.ref} section={s} style={category} active={active === s.ref} onClick={() => onJump(s.ref)} />);

  if (nav === "pill-scroll") {
    return (
      <nav className="sticky top-0 z-20 flex gap-2 overflow-x-auto border-b border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-2.5">
        {sections.map((s) => (
          <button key={s.ref} type="button" onClick={() => onJump(s.ref)} className={clsx("shrink-0 rounded-full px-3.5 py-1 text-[12.5px] font-semibold", active === s.ref ? "bg-[var(--octo-brand)] text-white" : "bg-[var(--octo-store-soft)] text-[var(--octo-text-secondary)]")}>
            {s.name}
          </button>
        ))}
      </nav>
    );
  }
  if (nav === "side-drawer") {
    return (
      <>
        <button type="button" onClick={() => setDrawer(true)} className="inline-flex items-center gap-2 rounded-full border border-[var(--octo-border-input)] px-4 py-2 text-[13px] font-medium">
          <MenuIcon size={16} aria-hidden />
          {t("store.menu.sections")}
        </button>
        {drawer && (
          <div className="fixed inset-0 z-40 flex" role="dialog">
            <aside className="flex w-[280px] flex-col gap-1 bg-[var(--octo-card)] p-4 shadow-xl">
              <button type="button" aria-label={t("store.menu.close")} onClick={() => setDrawer(false)} className="mb-2 self-end">
                <X size={18} />
              </button>
              {sections.map((s) => (
                <button key={s.ref} type="button" onClick={() => { setDrawer(false); onJump(s.ref); }} className={clsx("rounded-lg px-3 py-2 text-start text-[14px]", active === s.ref ? "bg-[var(--octo-store-soft)] font-semibold text-[var(--octo-brand)]" : "text-[var(--octo-text-secondary)]")}>
                  {s.name}
                </button>
              ))}
            </aside>
            <button type="button" aria-label={t("store.menu.close")} className="flex-1 bg-black/40" onClick={() => setDrawer(false)} />
          </div>
        )}
      </>
    );
  }
  return <nav className="flex gap-3 overflow-x-auto pb-1">{chips}</nav>;
}

/** The bottom bar of the "BottomBar" navigation style: fixed, four destinations, sections highlighted. */
export function BottomBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[var(--octo-border-card)] bg-[var(--octo-card)] py-2" aria-hidden>
      {[House, LayoutGrid, ShoppingBag, User].map((Icon, i) => (
        <span key={i} className={clsx("grid place-items-center", i === 1 ? "text-[var(--octo-brand)]" : "text-[var(--octo-text-muted)]")}>
          <Icon size={20} />
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create `item-details.tsx`** — the overlay used for "Overlay" details (and for "NewPage" in view mode):

```tsx
"use client";

import { X } from "lucide-react";
import { useI18n } from "@/app/providers";
import type { EntryView } from "./menu-model";

export function ItemDetails({ entry, onClose }: { entry: EntryView | null; onClose: () => void }) {
  const { t } = useI18n();
  if (!entry) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-label={entry.name} onClick={onClose}>
      <div className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-[var(--octo-card)]" onClick={(e) => e.stopPropagation()}>
        {entry.imageUrl && <img src={entry.imageUrl} alt="" className="h-[220px] w-full object-cover" />}
        <div className="flex flex-col gap-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[18px] font-bold text-[var(--octo-text-primary)]">{entry.name}</h3>
            <button type="button" aria-label={t("store.menu.close")} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          {entry.kind === "item" && entry.description && <p className="text-[13.5px] leading-[1.8] text-[var(--octo-text-secondary)]">{entry.description}</p>}
          <p className="text-[16px] font-bold text-[var(--octo-store-price)]">{entry.price}</p>
          {!entry.available && <p className="text-[12px] font-semibold text-[var(--octo-text-muted)]">{t("store.menu.unavailable")}</p>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create `themed-menu.tsx`**

```tsx
"use client";

// The customer's menu page, drawn from the public menu document with the menu's own theme. One component for every
// entry point: the site's /menu (order mode — add buttons, sticky cart), the QR link /c/{key} and the builder's canvas
// (view mode never shows ordering controls). Section wrappers carry data-section-ref="s{index}" so the builder canvas can
// outline and select them.
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import type { MenuItem, PublicMenuDocument } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { AddToCartModal } from "@/features/cart/add-to-cart";
import { menuFromDocument } from "@/shared/api/menu-document";
import { BottomBar, CategoryNav } from "./category-nav";
import { EntryCard } from "./entry-card";
import { ItemDetails } from "./item-details";
import { menuView, type EntryView } from "./menu-model";
import { menuFontStack, menuLayout, menuThemeStyle } from "./menu-theme";
import { SectionBlock } from "./section-block";

export interface ThemedMenuProps {
  document: PublicMenuDocument;
  mode: "order" | "view";
  selectable?: boolean;
  highlightSectionRef?: string | null;
  /** "brand": the menu's own logo/name/hero header (QR and canvas); "none": the site's header is already above. */
  header?: "brand" | "none";
}

export function ThemedMenu({ document, mode, selectable = false, highlightSectionRef = null, header = "brand" }: ThemedMenuProps) {
  const { t } = useI18n();
  const layout = menuLayout(document.menu.theme);
  const view = useMemo(() => menuView(document, (code) => (code === "SAR" ? t("store.currency") : code)), [document, t]);
  // The storefront's cart items, addressed by the same refs (menuFromDocument ids are `cat-{n}-{ref}`).
  const orderItems = useMemo(() => (mode === "order" ? menuFromDocument(document) : null), [document, mode]);
  const [adding, setAdding] = useState<MenuItem | null>(null);
  const [open, setOpen] = useState<EntryView | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(view.sections[0]?.ref ?? null);

  const style = { ...menuThemeStyle(document.menu.theme) } as CSSProperties & Record<string, string>;
  const body = menuFontStack(document.menu.theme.bodyFontCode);
  const title = menuFontStack(document.menu.theme.titleFontCode);
  if (body) style.fontFamily = body;
  if (title) style["--font-heading"] = title;

  function itemFor(sectionIndex: number, ref: string): MenuItem | null {
    return orderItems?.items.find((item) => item.id === `cat-${sectionIndex + 1}-${ref}`) ?? null;
  }
  function jump(ref: string) {
    setActive(ref);
    globalThis.document?.getElementById(ref)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function openEntry(sectionIndex: number, entry: EntryView) {
    if (layout.details === "same-page") setExpanded((cur) => (cur === entry.ref ? null : entry.ref));
    else setOpen(entry);
  }

  const status =
    view.availability === "NotAvailableNow"
      ? t("store.menu.notAvailableNow")
      : view.availability === "PreOrder"
        ? t("store.menu.preOrder").replace("{time}", view.nextAvailableAtUtc ? new Date(view.nextAvailableAtUtc).toLocaleString() : "")
        : null;

  return (
    <div className="min-h-full bg-[var(--octo-store-page)] text-[var(--octo-text-primary)]" style={style}>
      {highlightSectionRef && <style>{`[data-section-ref="${highlightSectionRef.replace(/"/g, "")}"]{outline:2px solid #0D6EFD;outline-offset:6px;border-radius:12px}`}</style>}
      {selectable && <style>{`[data-selectable]{cursor:pointer}[data-selectable]:hover{outline:1px dashed rgba(13,110,253,.5);outline-offset:6px;border-radius:12px}`}</style>}

      {header === "brand" && (
        <header className="relative isolate overflow-hidden">
          {view.heroUrl && <img src={view.heroUrl} alt="" className="h-[260px] w-full object-cover sm:h-[340px]" />}
          {view.heroUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" aria-hidden />}
          <div className={view.heroUrl ? "absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white" : "flex flex-col items-center gap-3 px-6 pt-10 text-center"}>
            {view.logoUrl ? <img src={view.logoUrl} alt={view.name} className="h-[56px] w-auto max-w-[180px] object-contain" /> : <p className="text-[22px] font-bold">{view.name}</p>}
            {view.heroText && <h1 className="max-w-[720px] text-[26px] font-bold sm:text-[36px]">{view.heroText}</h1>}
            {view.heroSubtext && <p className="max-w-[640px] text-[14px] opacity-85">{view.heroSubtext}</p>}
          </div>
        </header>
      )}

      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-8 pb-28 sm:px-6">
        {status && <p role="status" className="rounded-xl bg-[var(--octo-store-soft)] px-4 py-3 text-[13.5px] font-medium text-[var(--octo-text-secondary)]">{status}</p>}
        {view.sections.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-[var(--octo-text-muted)]">{t("store.menu.empty")}</p>
        ) : (
          <>
            <CategoryNav sections={view.sections} nav={layout.nav} category={layout.category} active={active} onJump={jump} />
            {view.sections.map((section, sectionIndex) => (
              <SectionBlock key={section.ref} section={section} selectable={selectable}>
                {section.entries.map((entry) => {
                  const orderItem = entry.kind === "item" ? itemFor(sectionIndex, entry.ref) : null;
                  const card = (
                    <EntryCard
                      key={entry.ref}
                      entry={entry}
                      card={layout.card}
                      showTags={layout.showTags}
                      onAdd={mode === "order" && orderItem ? () => setAdding(orderItem) : undefined}
                      onOpen={() => openEntry(sectionIndex, entry)}
                    />
                  );
                  if (layout.details === "new-page" && mode === "order" && orderItem) {
                    const slug = orderItems?.categories[sectionIndex]?.slug;
                    return (
                      <Link key={entry.ref} href={`/menu/${slug}/${orderItem.id}`} className="contents">
                        {card}
                      </Link>
                    );
                  }
                  return (
                    <div key={entry.ref} className="flex flex-col gap-2">
                      {card}
                      {expanded === entry.ref && entry.kind === "item" && entry.description && <p className="px-2 text-[13px] leading-[1.8] text-[var(--octo-text-secondary)]">{entry.description}</p>}
                    </div>
                  );
                })}
              </SectionBlock>
            ))}
          </>
        )}
      </div>

      {mode === "order" && layout.stickyCart && <StickyCart />}
      {layout.nav === "bottom-bar" && <BottomBar />}
      <ItemDetails entry={open} onClose={() => setOpen(null)} />
      {mode === "order" && <AddToCartModal item={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}

function StickyCart() {
  const { t } = useI18n();
  const { state } = useOrderingSession();
  const count = state.lines.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <Link href="/cart" data-sticky-cart className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-[560px] items-center justify-between rounded-2xl bg-[var(--octo-brand)] px-5 py-3 text-[14px] font-semibold text-white shadow-lg">
      <span className="inline-flex items-center gap-2">
        <ShoppingBag size={18} aria-hidden />
        {t("store.nav.cart")}
      </span>
      <span>{count}</span>
    </Link>
  );
}
```

`index.ts`:

```ts
export { ThemedMenu } from "./themed-menu";
export type { ThemedMenuProps } from "./themed-menu";
```

Add the eight i18n keys listed under Interfaces to `packages/i18n/src/locales/en/index.ts` and `ar/index.ts` next to the other `store.*` keys.

- [ ] **Step 8: Run the tests and type check**

Run: `cd apps/customer && npx vitest run && npx tsc --noEmit -p .`
Expected: all pass (5 new); tsc 0. If `useOrderingSession().state.lines` or `persist` differ from this plan, read `src/entities/order/session-provider.tsx` and adapt `StickyCart` / the test wrapper to its actual API.

- [ ] **Step 9: Commit**

```bash
git add apps/customer/src/widgets/themed-menu apps/customer/src/shared/api packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "Draw a menu with its own theme in the storefront"
```

---

### Task 5: Storefront — `/menu` and the QR link `/c/[key]`

**Files:**
- Modify: `apps/customer/src/shared/api/public-api.ts` (menu fetchers)
- Modify: `apps/customer/src/entities/menu-item/load.ts`
- Modify: `apps/customer/src/app/menu/page.tsx`
- Create: `apps/customer/src/app/c/[key]/page.tsx`
- Modify: `apps/customer/src/shared/lib/merchant-origins.ts` (`isBareDocumentPath`), `apps/customer/src/middleware.ts`
- Test: `apps/customer/src/shared/lib/merchant-origins.test.ts` (extend)

**Interfaces:**
- Consumes: `ThemedMenu` (Task 4); `PublicMenuDocument` (Task 2); existing `findMenuKey`, `requireStorefront`, `BUILDER_CANVAS_HEADER`.
- Produces: `fetchSiteMenuDocument(slug, key, lang): Promise<PublicMenuDocument | null>`, `fetchMenuDocumentByCode(key, lang, label): Promise<PublicMenuDocument | null>`, `loadMenuDocument(): Promise<PublicMenuDocument | null>`, `isBareDocumentPath(pathname): boolean` (true for `/preview/builder`, `/preview/menu`, `/c/<anything>`), `isCanvasPath(pathname): boolean` (the two preview routes).

- [ ] **Step 1: Write the failing test** — add to `merchant-origins.test.ts`:

```ts
import { isBareDocumentPath, isCanvasPath } from "./merchant-origins";

describe("bare documents", () => {
  it("covers both canvases and the QR menu, nothing else", () => {
    expect(isCanvasPath("/preview/builder")).toBe(true);
    expect(isCanvasPath("/preview/menu/")).toBe(true);
    expect(isCanvasPath("/c/abc")).toBe(false);
    expect(isBareDocumentPath("/c/abc")).toBe(true);
    expect(isBareDocumentPath("/c/")).toBe(false);
    expect(isBareDocumentPath("/menu")).toBe(false);
    expect(isBareDocumentPath("/preview/menu")).toBe(true);
  });
});
```

(Merge the import into the file's existing `./merchant-origins` import.)

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/customer && npx vitest run src/shared/lib/merchant-origins.test.ts`
Expected: FAIL — `isBareDocumentPath` not exported.

- [ ] **Step 3: Paths and middleware**

In `merchant-origins.ts` add (keep `isBuilderCanvasPath` for existing callers):

```ts
import { MENU_PREVIEW_PATH } from "@octopus/api-client";

const trimmed = (pathname: string) => pathname.replace(/\/+$/, "") || "/";

/** The two builder canvases (Public Link and menu): framable by the merchant console only. */
export const isCanvasPath = (pathname: string): boolean => {
  const path = trimmed(pathname);
  return path === BUILDER_PREVIEW_PATH || path === MENU_PREVIEW_PATH;
};

/** Pages drawn without the site's chrome and without resolving a tenant from the host: the canvases and the QR menu. */
export const isBareDocumentPath = (pathname: string): boolean => isCanvasPath(pathname) || /^\/c\/[^/]+/.test(pathname);
```

(Add `MENU_PREVIEW_PATH` to the existing `@octopus/api-client` import rather than a second import line.)

In `middleware.ts`, replace the canvas branch's condition and body so both canvases get the canvas headers and `/c/*` gets only the bare marker:

```ts
  if (isBareDocumentPath(request.nextUrl.pathname)) {
    const bareHeaders = new Headers(request.headers);
    bareHeaders.set(BUILDER_CANVAS_HEADER, "1");
    bareHeaders.delete(TENANT_SLUG_HEADER);
    bareHeaders.delete(SAMPLE_STOREFRONT_HEADER);
    const res = NextResponse.next({ request: { headers: bareHeaders } });
    if (isCanvasPath(request.nextUrl.pathname)) {
      for (const [k, v] of Object.entries(builderCanvasResponseHeaders(currentMerchantOrigins()))) res.headers.set(k, v);
    }
    return res;
  }
```

(Import `isBareDocumentPath, isCanvasPath` instead of `isBuilderCanvasPath` there.)

- [ ] **Step 4: Document fetchers** — in `public-api.ts`, add below `fetchSiteMenu`:

```ts
/** The site-bound menu as the full public document (theme, currency, offers, image URLs). */
export const fetchSiteMenuDocument = (slug: string, publicLinkKey: string, lang?: string | null) =>
  get<PublicMenuDocument>(slug, `/v1/public/site-menu/${encodeURIComponent(publicLinkKey)}${query({ lang })}`);

/** A scanned QR code's menu. The code alone names the business (no Host needed); every failure reads as null. */
export async function fetchMenuDocumentByCode(key: string, lang?: string | null, label?: string | null): Promise<PublicMenuDocument | null> {
  const path = `/v1/public/menu-codes/${encodeURIComponent(key)}${query({ lang, l: label })}`;
  const cacheKey = `code|${path}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value as PublicMenuDocument | null;
  let value: PublicMenuDocument | null = null;
  try {
    const res = await request(BASE.host, path);
    value = res.status >= 200 && res.status < 300 ? (JSON.parse(res.body) as PublicMenuDocument) : null;
  } catch {
    value = null;
  }
  cache.set(cacheKey, { at: Date.now(), ttl: value ? TTL_MS : MISS_TTL_MS, value });
  return value;
}
```

and add `type PublicMenuDocument` to the `@octopus/api-client` import.

In `entities/menu-item/load.ts` add:

```ts
/** The site's bound menu as the full document, or null (sample storefront, no bound menu). */
export const loadMenuDocument = cache(async (): Promise<PublicMenuDocument | null> => {
  const { sample, slug, language } = await requireStorefront();
  if (sample) return null;
  const key = await findMenuKey();
  return key ? fetchSiteMenuDocument(slug, key, language) : null;
});
```

(import `fetchSiteMenuDocument` and `type PublicMenuDocument`).

- [ ] **Step 5: The pages**

`app/menu/page.tsx` — a bound menu renders themed, the sample storefront keeps the mosaic:

```tsx
import { headers } from "next/headers";
import { loadMenu, loadMenuDocument } from "@/entities/menu-item/load";
import { TENANT_SLUG_HEADER } from "@/entities/tenant";
import { loadLocale, loadTenant } from "@/entities/tenant/load";
import { createTranslator } from "@/shared/i18n/translate";
import { MenuView } from "@/views/menu";
import { ThemedMenu } from "@/widgets/themed-menu";

export default async function MenuPage() {
  const document = await loadMenuDocument();
  if (document) return <ThemedMenu document={document} mode="order" header="none" />;

  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  await loadTenant(slug);
  const { categories } = await loadMenu(slug);
  const t = createTranslator(await loadLocale());
  return <MenuView categories={categories} homeLabel={t("store.nav.home")} menuLabel={t("store.nav.menu")} />;
}
```

`app/c/[key]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { defaultLocale, getDirection, locales, type Locale } from "@i18n/index";
import { StoreI18nProvider } from "@/app/providers";
import { fetchMenuDocumentByCode } from "@/shared/api/public-api";
import { ThemedMenu } from "@/widgets/themed-menu";

// A printed QR code's menu (Menu:PublicCodesBaseUri, e.g. https://menu.octopus.sa/c/{key}). View only: no cart, no site.
export const dynamic = "force-dynamic";

function preferred(): string | null {
  return headers().get("accept-language")?.split(",")[0]?.trim() || null;
}

export async function generateMetadata({ params }: { params: { key: string } }): Promise<Metadata> {
  const document = await fetchMenuDocumentByCode(params.key, preferred());
  return { title: document?.menu.name ?? "Menu" };
}

export default async function QrMenuPage({ params, searchParams }: { params: { key: string }; searchParams: { l?: string; lang?: string } }) {
  const document = await fetchMenuDocumentByCode(params.key, searchParams.lang ?? preferred(), searchParams.l ?? null);
  if (!document) notFound();
  const locale: Locale = (locales as readonly string[]).includes(document.language) ? (document.language as Locale) : defaultLocale;
  return (
    <StoreI18nProvider locale={locale}>
      <div dir={getDirection(locale)} lang={document.language}>
        <ThemedMenu document={document} mode="view" />
      </div>
    </StoreI18nProvider>
  );
}
```

- [ ] **Step 6: Run the tests and type check**

Run: `cd apps/customer && npx vitest run && npx tsc --noEmit -p .`
Expected: all pass; tsc 0.

- [ ] **Step 7: Commit**

```bash
git add apps/customer/src/shared/api/public-api.ts apps/customer/src/entities/menu-item/load.ts apps/customer/src/app/menu/page.tsx "apps/customer/src/app/c/[key]/page.tsx" apps/customer/src/shared/lib/merchant-origins.ts apps/customer/src/shared/lib/merchant-origins.test.ts apps/customer/src/middleware.ts
git commit -m "Serve the themed menu on the site and on its QR link"
```

---

### Task 6: Storefront — the `/preview/menu` canvas

**Files:**
- Create: `apps/customer/src/views/menu-canvas/menu-canvas.tsx`, `apps/customer/src/views/menu-canvas/canvas-messages.ts`, `apps/customer/src/views/menu-canvas/index.ts`
- Create: `apps/customer/src/app/preview/menu/page.tsx`
- Test: `apps/customer/src/views/menu-canvas/canvas-messages.test.ts`

**Interfaces:**
- Consumes: Task 2 protocol; `ThemedMenu` (Task 4); `canvasLinkTarget` (`@/views/builder-canvas/canvas-messages`); `currentMerchantOrigins`.
- Produces: `acceptToMenuCanvas(event, allowedOrigins, parent): ToMenuCanvasMessage | null`; route `/preview/menu`.

- [ ] **Step 1: Write the failing test** — `canvas-messages.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toCanvas, toMenuCanvas } from "@octopus/api-client";
import { acceptToMenuCanvas } from "./canvas-messages";

const parent = { name: "parent" };
const allowed = ["https://app.octopus.app"];
const scroll = toMenuCanvas({ type: "scroll-to", anchor: "s1" });

describe("acceptToMenuCanvas", () => {
  it("takes a menu message from the parent at an allowed origin", () => {
    expect(acceptToMenuCanvas({ origin: "https://app.octopus.app", source: parent, data: scroll }, allowed, parent)).toEqual(scroll);
  });
  it("ignores other windows, origins and the Public Link channel", () => {
    expect(acceptToMenuCanvas({ origin: "https://app.octopus.app", source: {}, data: scroll }, allowed, parent)).toBeNull();
    expect(acceptToMenuCanvas({ origin: "https://evil.test", source: parent, data: scroll }, allowed, parent)).toBeNull();
    expect(acceptToMenuCanvas({ origin: "https://app.octopus.app", source: parent, data: toCanvas({ type: "scroll-to", anchor: "x" }) }, allowed, parent)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/customer && npx vitest run src/views/menu-canvas`
Expected: FAIL — cannot find `./canvas-messages`.

- [ ] **Step 3: Create `canvas-messages.ts`**

```ts
import { isToMenuCanvasMessage, type ToMenuCanvasMessage } from "@octopus/api-client";

/** The message, when it comes from the parent window at an allowed origin on the menu channel; else null. */
export function acceptToMenuCanvas(
  event: { origin: string; source: unknown; data: unknown },
  allowedOrigins: readonly string[],
  parent: unknown
): ToMenuCanvasMessage | null {
  if (event.source !== parent || !allowedOrigins.includes(event.origin)) return null;
  return isToMenuCanvasMessage(event.data) ? event.data : null;
}
```

- [ ] **Step 4: Create `menu-canvas.tsx`** (same handshake, link interception and trust rules as `views/builder-canvas/builder-canvas.tsx`):

```tsx
"use client";

// The menu builder's live preview canvas (route /preview/menu). Renders nothing of its own: the merchant console frames it
// and sends the menu document with postMessage; it draws it with ThemedMenu. Clicks go back to the console (a section click
// selects it when the builder wires selection); nothing here ever navigates away.
import { useCallback, useEffect, useRef, useState } from "react";
import { fromMenuCanvas, type FromMenuCanvasBody, type MenuRenderMessage } from "@octopus/api-client";
import { defaultLocale, getDirection, locales, type Locale } from "@i18n/index";
import { StoreI18nProvider } from "@/app/providers";
import { canvasLinkTarget } from "@/views/builder-canvas/canvas-messages";
import { ThemedMenu } from "@/widgets/themed-menu";
import { acceptToMenuCanvas } from "./canvas-messages";

const ANNOUNCE_MS = 500;

function scrollToAnchor(anchor: string, tries = 10) {
  if (!anchor) return void window.scrollTo({ top: 0, behavior: "smooth" });
  const target = document.getElementById(anchor);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "nearest" });
  else if (tries > 0) window.setTimeout(() => scrollToAnchor(anchor, tries - 1), 150);
}

export function MenuCanvas({ allowedOrigins }: { allowedOrigins: string[] }) {
  const [render, setRender] = useState<MenuRenderMessage | null>(null);
  const parentOrigin = useRef<string | null>(null);

  const send = useCallback((body: FromMenuCanvasBody) => {
    if (parentOrigin.current) window.parent.postMessage(fromMenuCanvas(body), parentOrigin.current);
  }, []);

  useEffect(() => {
    if (window.parent === window) return;
    const onMessage = (event: MessageEvent) => {
      const message = acceptToMenuCanvas(event, allowedOrigins, window.parent);
      if (!message) return;
      if (!parentOrigin.current) parentOrigin.current = event.origin;
      if (message.type === "render") setRender(message);
      else scrollToAnchor(message.anchor);
    };
    window.addEventListener("message", onMessage);
    const announce = () => {
      if (!parentOrigin.current) window.parent.postMessage(fromMenuCanvas({ type: "ready" }), "*");
    };
    announce();
    const timer = window.setInterval(announce, ANNOUNCE_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(timer);
    };
  }, [allowedOrigins]);

  const highlight = render?.highlightSectionRef ?? null;
  useEffect(() => {
    if (highlight) scrollToAnchor(highlight);
  }, [highlight]);

  const selectable = render?.selectable ?? false;
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]");
      if (anchor) {
        event.preventDefault();
        const href = canvasLinkTarget(anchor.getAttribute("href") ?? "", window.location.origin);
        if (href) send({ type: "navigate", href });
        return;
      }
      if (!selectable || target?.closest("button, input, select, textarea, label, [role='dialog']")) return;
      const section = target?.closest<HTMLElement>("[data-section-ref]");
      if (section?.dataset.sectionRef) send({ type: "select-section", sectionRef: section.dataset.sectionRef });
    };
    const onSubmit = (event: Event) => event.preventDefault();
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [send, selectable]);

  if (!render) return <p className="mx-auto max-w-[480px] px-6 py-24 text-center text-[14px] text-[var(--octo-text-muted)]">This page shows your menu while you edit it in the builder.</p>;

  const locale: Locale = (locales as readonly string[]).includes(render.document.language) ? (render.document.language as Locale) : defaultLocale;
  return (
    <StoreI18nProvider locale={locale}>
      <div dir={getDirection(locale)} lang={render.document.language}>
        <ThemedMenu document={render.document} mode={render.mode} selectable={render.selectable} highlightSectionRef={render.highlightSectionRef} />
      </div>
    </StoreI18nProvider>
  );
}
```

`index.ts`: `export { MenuCanvas } from "./menu-canvas";`

`app/preview/menu/page.tsx`:

```tsx
import type { Metadata } from "next";
import { currentMerchantOrigins } from "@/shared/lib/merchant-origins";
import { MenuCanvas } from "@/views/menu-canvas";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

export default function MenuPreviewPage() {
  return <MenuCanvas allowedOrigins={currentMerchantOrigins()} />;
}
```

- [ ] **Step 5: Run the tests, type check, and check the route by hand**

Run: `cd apps/customer && npx vitest run && npx tsc --noEmit -p .` → all pass.
Run `npm run dev` in `apps/customer`, then `curl -sI http://localhost:3000/preview/menu` → 200 with `content-security-policy: frame-ancestors 'self' http://localhost:5290 http://127.0.0.1:5290`, and `x-robots-tag: noindex, nofollow`. Stop the server (and make sure no `node … start-server.js` process is left on port 3000).

- [ ] **Step 6: Commit**

```bash
git add apps/customer/src/views/menu-canvas apps/customer/src/app/preview/menu
git commit -m "Add the storefront canvas the menu builder's live preview drives"
```

---

### Task 7: Merchant — a generic storefront frame widget

The Public Link frame (`pages/public-link/ui/storefront-frame.tsx` + `_shared/frame-bridge.ts`) is moved to `widgets/storefront-frame` and made generic over a channel, so the menu builder can use it (a page may not import another page's internals). Public Link behaviour does not change.

**Files:**
- Create: `apps/merchant/src/widgets/storefront-frame/storefront-frame.tsx`, `frame-bridge.ts`, `frame-bridge.test.ts`, `index.ts`
- Delete: `apps/merchant/src/pages/public-link/ui/storefront-frame.tsx`, `apps/merchant/src/pages/public-link/_shared/frame-bridge.ts`, `apps/merchant/src/pages/public-link/_shared/frame-bridge.test.ts`
- Create: `apps/merchant/src/pages/public-link/_shared/site-canvas-channel.ts`
- Modify: `apps/merchant/src/pages/public-link/ui/live-preview-frame.tsx` (import + `channel` prop)

**Interfaces:**
- Produces:
  ```ts
  type CanvasEvent = { type: "ready" } | { type: "navigate"; href: string } | { type: "language"; language: string } | { type: "select-section"; id: string };
  interface CanvasChannel<P> { path: string; render(payload: P): unknown; scrollTo(anchor: string): unknown; accept(data: unknown): CanvasEvent | null }
  StorefrontFrame<P>(props: { channel: CanvasChannel<P>; origin; device: "desktop" | "tablet" | "mobile"; payload: P; scrollRequest; onNavigate; onLanguage?; onSelectSection?: (id: string) => void; onReady?; onUnavailable; height; maxCardWidth; title })
  canvasUrl(origin, path), acceptFromCanvas(event, expectedOrigin, frameWindow, accept), frameGeometry(...) (unchanged), READY_TIMEOUT_MS, FRAME_VIEWPORT_WIDTH = { desktop: 1280, tablet: 768, mobile: 390 }
  ```
  and `SITE_CANVAS_CHANNEL: CanvasChannel<BuilderRenderPayload>` for Public Link.

- [ ] **Step 1: Move and adapt the bridge test** — create `widgets/storefront-frame/frame-bridge.test.ts` from the old `_shared/frame-bridge.test.ts` with these changes: import from `./frame-bridge`; `canvasUrl` takes the path (`canvasUrl("http://ocean.localhost:3000", "/preview/builder")`); `acceptFromCanvas` takes an `accept` function as fourth argument (`(data) => (isFromCanvasMessage(data) ? { type: "ready" } : null)`), and the `storefrontOrigin` test stays in `pages/public-link/_shared/preview-url.test.ts` (move that single `it` there). Add:

```ts
it("maps a channel's own message into the frame's events", () => {
  const accept = (data: unknown) => (data === "hello" ? ({ type: "select-section", id: "s2" } as const) : null);
  expect(acceptFromCanvas({ origin: "o", source: frame, data: "hello" }, "o", frame, accept)).toEqual({ type: "select-section", id: "s2" });
  expect(acceptFromCanvas({ origin: "o", source: frame, data: "nope" }, "o", frame, accept)).toBeNull();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/merchant && npx vitest run src/widgets/storefront-frame`
Expected: FAIL — cannot find `./frame-bridge`.

- [ ] **Step 3: Create `widgets/storefront-frame/frame-bridge.ts`**

```ts
// Pure helpers of a framed storefront canvas: where it points, which messages to trust, and how the page is scaled into
// the card. Channel-agnostic: each canvas (Public Link site, menu) supplies how its own messages map to frame events.

/** Past this without a `ready`, the storefront is taken as unreachable and the host shows its own preview instead. */
export const READY_TIMEOUT_MS = 8000;

/** The viewport each device is laid out at (CSS px). */
export const FRAME_VIEWPORT_WIDTH = { desktop: 1280, tablet: 768, mobile: 390 } as const;
export type FrameDevice = keyof typeof FRAME_VIEWPORT_WIDTH;

export type CanvasEvent =
  | { type: "ready" }
  | { type: "navigate"; href: string }
  | { type: "language"; language: string }
  | { type: "select-section"; id: string };

export interface CanvasChannel<P> {
  /** The storefront route, e.g. "/preview/builder". */
  path: string;
  render(payload: P): unknown;
  scrollTo(anchor: string): unknown;
  /** The canvas's message as a frame event, or null when it is not one of this channel's (already shape-checked). */
  accept(data: unknown): CanvasEvent | null;
}

export const canvasUrl = (origin: string, path: string): string => `${origin.replace(/\/+$/, "")}${path}`;

export function acceptFromCanvas(
  event: { origin: string; source: unknown; data: unknown },
  expectedOrigin: string,
  frameWindow: unknown,
  accept: (data: unknown) => CanvasEvent | null
): CanvasEvent | null {
  if (!frameWindow || event.source !== frameWindow || event.origin !== expectedOrigin) return null;
  return accept(event.data);
}

export function frameGeometry(viewportWidth: number, cardWidth: number, cardHeight: number, maxCardWidth: number) {
  const drawnWidth = Math.min(cardWidth, maxCardWidth);
  const scale = viewportWidth > 0 && drawnWidth > 0 ? drawnWidth / viewportWidth : 0;
  return { drawnWidth, scale, frameHeight: scale > 0 ? Math.round(cardHeight / scale) : 0 };
}
```

- [ ] **Step 4: Create `widgets/storefront-frame/storefront-frame.tsx`** — the old component with the channel threaded through (behaviour identical):

```tsx
// A storefront canvas, framed: laid out at the device's real width and scaled into the card. Every change of `payload` is
// posted (at most once per animation frame) and re-posted whenever the canvas says it is ready. No `ready` within
// READY_TIMEOUT_MS -> `onUnavailable`. Messages are accepted only from this iframe's window at `origin`.
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { acceptFromCanvas, canvasUrl, frameGeometry, FRAME_VIEWPORT_WIDTH, READY_TIMEOUT_MS, type CanvasChannel, type FrameDevice } from "./frame-bridge";

export interface StorefrontFrameProps<P> {
  channel: CanvasChannel<P>;
  origin: string;
  device: FrameDevice;
  payload: P;
  /** Scroll the canvas to an anchor ("" = top) each time `id` changes. */
  scrollRequest: { anchor: string; id: number } | null;
  onNavigate: (href: string) => void;
  onLanguage?: (language: string) => void;
  onSelectSection?: (id: string) => void;
  onReady?: () => void;
  onUnavailable: () => void;
  height: number | string;
  maxCardWidth: number;
  title: string;
}

export function StorefrontFrame<P>({ channel, origin, device, payload, scrollRequest, height, maxCardWidth, title, ...handlers }: StorefrontFrameProps<P>) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [readyCount, setReadyCount] = useState(0);
  const latest = useRef(handlers);
  latest.current = handlers;
  const channelRef = useRef(channel);
  channelRef.current = channel;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => setSize({ width: box.clientWidth, height: box.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let ready = false;
    setReadyCount(0);
    const onMessage = (event: MessageEvent) => {
      const message = acceptFromCanvas(event, origin, frameRef.current?.contentWindow, (data) => channelRef.current.accept(data));
      if (!message) return;
      switch (message.type) {
        case "ready":
          ready = true;
          setReadyCount((n) => n + 1);
          latest.current.onReady?.();
          break;
        case "navigate":
          latest.current.onNavigate(message.href);
          break;
        case "language":
          latest.current.onLanguage?.(message.language);
          break;
        case "select-section":
          latest.current.onSelectSection?.(message.id);
          break;
      }
    };
    window.addEventListener("message", onMessage);
    const timer = window.setTimeout(() => {
      if (!ready) latest.current.onUnavailable();
    }, READY_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    };
  }, [origin]);

  useEffect(() => {
    if (readyCount === 0) return;
    const id = requestAnimationFrame(() => frameRef.current?.contentWindow?.postMessage(channelRef.current.render(payload), origin));
    return () => cancelAnimationFrame(id);
  }, [readyCount, payload, origin]);

  const scrollId = scrollRequest?.id ?? 0;
  useEffect(() => {
    if (readyCount === 0 || !scrollRequest) return;
    const id = requestAnimationFrame(() => frameRef.current?.contentWindow?.postMessage(channelRef.current.scrollTo(scrollRequest.anchor), origin));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyCount > 0, scrollId, origin]);

  const viewport = FRAME_VIEWPORT_WIDTH[device];
  const geo = frameGeometry(viewport, size.width, size.height, maxCardWidth);

  return (
    <div ref={boxRef} className="relative overflow-hidden rounded-xl border border-[var(--octo-border-card)] bg-[#f7f8fa]" style={{ height }}>
      {geo.scale > 0 && (
        <iframe
          ref={frameRef}
          src={canvasUrl(origin, channel.path)}
          title={title}
          sandbox="allow-scripts allow-same-origin allow-forms"
          className="absolute top-0 border-0 bg-white"
          style={{ left: Math.max(0, (size.width - geo.drawnWidth) / 2), width: viewport, height: geo.frameHeight, transform: `scale(${geo.scale})`, transformOrigin: "top left" }}
        />
      )}
      {readyCount === 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-[var(--octo-text-muted)]" aria-hidden>
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}
    </div>
  );
}
```

`index.ts`:

```ts
export { StorefrontFrame } from "./storefront-frame";
export type { StorefrontFrameProps } from "./storefront-frame";
export * from "./frame-bridge";
```

- [ ] **Step 5: Public Link uses it** — create `pages/public-link/_shared/site-canvas-channel.ts`:

```ts
import { BUILDER_PREVIEW_PATH, isFromCanvasMessage, toCanvas, type BuilderRenderPayload } from "@octopus/api-client";
import type { CanvasChannel } from "@/widgets/storefront-frame";

/** The Public Link site canvas (/preview/builder) as a frame channel. */
export const SITE_CANVAS_CHANNEL: CanvasChannel<BuilderRenderPayload> = {
  path: BUILDER_PREVIEW_PATH,
  render: (payload) => toCanvas({ type: "render", ...payload }),
  scrollTo: (anchor) => toCanvas({ type: "scroll-to", anchor }),
  accept: (data) => {
    if (!isFromCanvasMessage(data)) return null;
    return data.type === "select-section" ? { type: "select-section", id: data.sectionId } : data.type === "navigate" ? { type: "navigate", href: data.href } : data.type === "language" ? { type: "language", language: data.language } : { type: "ready" };
  },
};
```

In `pages/public-link/ui/live-preview-frame.tsx`: replace `import { StorefrontFrame } from "./storefront-frame";` with `import { StorefrontFrame } from "@/widgets/storefront-frame";` and `import { SITE_CANVAS_CHANNEL } from "../_shared/site-canvas-channel";`, and pass `channel={SITE_CANVAS_CHANNEL}` to `<StorefrontFrame …>`. Delete the three old files. Any other importer of the old files (`grep -rn "frame-bridge\|ui/storefront-frame" apps/merchant/src`) switches to `@/widgets/storefront-frame`.

- [ ] **Step 6: Run the tests and type check**

Run: `cd apps/merchant && npx vitest run && npx tsc --noEmit -p .`
Expected: all pass; tsc 0.

- [ ] **Step 7: Commit**

```bash
git add apps/merchant/src/widgets/storefront-frame apps/merchant/src/pages/public-link
git commit -m "Make the storefront frame a widget any builder can use"
```

---

### Task 8: Merchant — `draftMenuDocument`

**Files:**
- Create: `apps/merchant/src/pages/menu/build/preview/draft-menu-document.ts`
- Test: `apps/merchant/src/pages/menu/build/preview/draft-menu-document.test.ts`

**Interfaces:**
- Consumes: `Menu`, `Section`, `Item`, `Offer`, `MenuTheme`, `MenuBrand` (Task 9 adds `brand` to `MenuTheme`; this task reads `menu.theme.brand ?? null`, typed via a local structural type so it compiles before Task 9 — see Step 3), `OFFERS_SECTION_ID` (`@/entities/menu`), `PublicMenuDocument` (Task 2).
- Produces: `draftMenuDocument(menu: Menu, options: { currency: string | null; language: string; tagLabel?: (tag: string) => string }): { document: PublicMenuDocument; sectionIds: string[] }` — `sectionIds[i]` is the builder section id drawn as `s{i}`.

- [ ] **Step 1: Write the failing test** — `draft-menu-document.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Item, Menu, Offer, Section } from "@/entities/menu";
import { draftMenuDocument } from "./draft-menu-document";

function item(id: string, patch: Partial<Item> = {}): Item {
  return {
    id, name: id.toUpperCase(), shortName: "", description: "", sku: "", image: null, video: null, tags: [], status: "active",
    availability: { available: true, delivery: true, takeaway: true, dineIn: true }, schedule: { mode: "all-day" }, modifierGroups: [],
    pricing: { price: 10, vatRate: 15 }, nutrition: { calories: null, protein: null, carb: null, fat: null }, allergies: { allergens: [], note: "" },
    ...patch,
  };
}
function section(id: string, entries: (Item | Offer)[], patch: Partial<Section> = {}): Section {
  return { id, kind: "items", name: id, image: null, description: "", visibility: "visible", displayStyle: "grid", color: null, entries, ...patch };
}
const offer: Offer = {
  id: "of1", name: "Combo", slug: "combo", image: "data:image/png;base64,AA", status: "active", badge: "New", showSavingBadge: true,
  entries: [{ itemId: "a", qty: 2, price: 10 }], customerCanChange: false,
  pricing: { role: "fixed", offerPrice: 15, discount: null, vatRate: 15, excludeFromPromotions: false },
  availability: { from: null, to: null, window: null },
  channels: { dineIn: true, takeaway: true, delivery: true, kiosk: true, onlineOrdering: true, mobileApp: true },
};

function menu(sections: Section[], theme: Partial<Menu["theme"]> = {}): Menu {
  return {
    id: "m", name: "Lunch", cover: null, status: "draft", branchId: "b", sections,
    theme: { presetId: "ocean", navStyle: "pill-scroll", categoryStyle: "image-text", cardStyle: "image-left", itemDetails: "overlay", stickyAddToCart: true, showItemTags: true, ...theme },
    schedule: { type: "all-day", start: "", end: "", days: [], timezone: "", branchIds: [], fallbackMenuId: null, allowPreorderOutsideSchedule: false },
    channels: { pos: "off", publicLink: "off", tableQr: "off" } as Menu["channels"],
    updatedAt: "", publishedAt: null, version: 1,
  };
}

describe("draftMenuDocument", () => {
  const a = item("a", { image: "https://cdn/a.jpg", tags: ["chef-recommended"], modifierGroups: [
    { id: "g", name: "internal", type: "single", customerLabel: "Size", helpText: "", min: 1, max: 1, required: true, showAsRadio: true,
      options: [{ id: "o", name: "Large", subLabel: "", priceType: "add-amount", price: 3, isDefault: true, available: false }] },
  ] });
  const draft = menu([
    section("mains", [a, item("b", { name: "  " }), item("c", { status: "unavailable" })]),
    section("hidden", [item("d")], { visibility: "hidden" }),
    section("archived", [item("e")], { visibility: "archived" }),
    section("offers", [offer], { kind: "offers", displayStyle: "carousel" }),
  ]);
  const { document, sectionIds } = draftMenuDocument(draft, { currency: "SAR", language: "ar", tagLabel: (t) => `#${t}` });

  it("keeps only visible sections, in order, including the offers section", () => {
    expect(document.sections.map((s) => [s.name, s.displayStyle])).toEqual([["mains", "Grid"], ["offers", "Carousel"]]);
    expect(sectionIds).toEqual(["mains", "offers"]);
  });

  it("skips half-typed items and refs entries in order of first appearance", () => {
    expect(document.sections[0].entries).toEqual([{ ref: "i1", kind: "Item" }, { ref: "i2", kind: "Item" }]);
    expect(document.items.i1).toMatchObject({ name: "A", price: { amount: 10, currency: "SAR" }, tags: ["#chef-recommended"], isAvailable: true, image: { url: "https://cdn/a.jpg" }, modifierGroupRefs: ["m1"] });
    expect(document.items.i2.isAvailable).toBe(false);
  });

  it("carries modifier groups the way the public read does", () => {
    expect(document.modifierGroups.m1).toEqual({
      promptLabel: "Size", helpText: null, selectionMode: "Single", minSelected: 1, maxSelected: 1,
      options: [{ name: "Large", effect: { kind: "AddAmount", amount: { amount: 3, currency: "SAR" } }, isDefault: true, isAvailable: false }],
    });
  });

  it("prices offers from their components", () => {
    expect(document.sections[1].entries).toEqual([{ ref: "o1", kind: "Offer" }]);
    expect(document.offers.o1).toMatchObject({
      name: "Combo", badge: "New", showSavingBadge: true, components: [{ itemRef: "i1", quantity: 2 }], isAvailable: true,
      price: { referenceTotal: { amount: 20 }, price: { amount: 15 }, saving: { amount: 5 }, savingPercent: 25 },
      image: { url: "data:image/png;base64,AA" },
    });
  });

  it("maps the theme to the backend's vocabulary and carries the menu's brand", () => {
    expect(document.menu.theme).toMatchObject({ navigationStyle: "PillScroll", sectionNavStyle: "ImageAndText", cardStyle: "ImageLeft", itemDetailsBehavior: "Overlay", stickyPrimaryAction: true, showItemTags: true });
    const branded = draftMenuDocument(menu([], { brand: { colors: { primary: "#111111", light: "#eeeeee", accent: "#ff0000", dark: "#000000" }, logoUrl: "blob:x", heroUrl: "https://cdn/h.jpg", heroText: "Hi", heroSubtext: "" } } as Partial<Menu["theme"]>), { currency: null, language: "en" });
    expect(branded.document.menu.theme).toMatchObject({ primaryColor: "#111111", lightColor: "#eeeeee", logo: null, hero: { url: "https://cdn/h.jpg" }, heroText: "Hi", heroSubtext: null });
    expect(branded.document.currency).toBeNull();
  });

  it("gives the currency its precision", () => {
    expect(document.currency).toEqual({ code: "SAR", minorUnits: 2 });
    expect(draftMenuDocument(draft, { currency: "KWD", language: "ar" }).document.currency).toEqual({ code: "KWD", minorUnits: 3 });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/merchant && npx vitest run src/pages/menu/build/preview/draft-menu-document.test.ts`
Expected: FAIL — cannot find `./draft-menu-document`.

- [ ] **Step 3: Create `draft-menu-document.ts`**

```ts
// The builder's in-memory menu -> the public menu document the storefront renders (the backend's PublicMenuProjection,
// ported), so the live preview shows unsaved edits the way a customer will see them once published. Rules follow the
// backend: only visible sections, in order; entries addressed by refs assigned in order of first appearance (i{n}, m{n},
// o{n}); money in major units; availability "Available" (a preview answers "what would this look like"). An item with no
// name yet is mid-typing and is left out. Media carries the local URL (data: or delivery URL); blob: URLs are dropped —
// the canvas is another origin and cannot read them.
import type { PublicMenuDocument, PublicMenuItem, PublicMenuMedia, PublicMenuModifierGroup, PublicMenuMoney, PublicMenuOffer, PublicMenuSection } from "@octopus/api-client";
import type { Item, Menu, ModifierGroup, Offer } from "@/entities/menu";

const NAV = { "top-bar": "TopBar", "side-drawer": "SideDrawer", "bottom-bar": "BottomBar", "pill-scroll": "PillScroll" } as const;
const CATEGORY = { "icon-text": "IconAndText", "text-only": "TextOnly", "icons-only": "IconOnly", "image-text": "ImageAndText" } as const;
const CARD = { classic: "Classic", "clean-minimal": "CleanMinimal", "image-top": "ImageTop", "image-left": "ImageLeft" } as const;
const DETAILS = { "same-page": "SamePage", overlay: "Overlay", "new-page": "NewPage" } as const;
const DISPLAY = { list: "List", carousel: "Carousel", grid: "Grid" } as const;
const EFFECT = { "no-change": "NoChange", "add-amount": "AddAmount", fixed: "FixedPrice" } as const;

/** The menu's own brand (Task 9 adds it to MenuTheme); read structurally so this file does not depend on that task's order. */
interface BrandLike {
  colors: { primary: string; light: string; accent: string; dark: string };
  logoUrl: string | null;
  heroUrl: string | null;
  heroText: string;
  heroSubtext: string;
}

export interface DraftMenuOptions {
  /** ISO 4217 code from catalog settings; null when unknown. */
  currency: string | null;
  language: string;
  /** A tag code -> its display text (a customer sees the label, as the public read does). */
  tagLabel?: (tag: string) => string;
}

function minorUnits(code: string): number {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

const media = (url: string | null | undefined, kind = "Image"): PublicMenuMedia | null =>
  url && !url.startsWith("blob:") ? { assetId: "local", kind, url } : null;

export function draftMenuDocument(menu: Menu, options: DraftMenuOptions): { document: PublicMenuDocument; sectionIds: string[] } {
  const currencyCode = options.currency ?? "";
  const money = (amount: number): PublicMenuMoney => ({ amount, currency: currencyCode });
  const allItems = new Map<string, Item>();
  for (const s of menu.sections) if (s.kind === "items") for (const e of s.entries as Item[]) allItems.set(e.id, e);

  const items: Record<string, PublicMenuItem> = {};
  const itemRefs = new Map<string, string>();
  const groups: Record<string, PublicMenuModifierGroup> = {};
  const groupRefs = new Map<string, string>();
  const offers: Record<string, PublicMenuOffer> = {};
  const offerRefs = new Map<string, string>();

  const groupRef = (group: ModifierGroup): string => {
    const known = groupRefs.get(group.id);
    if (known) return known;
    const ref = `m${groupRefs.size + 1}`;
    groupRefs.set(group.id, ref);
    groups[ref] = {
      promptLabel: group.customerLabel || group.name,
      helpText: group.helpText || null,
      selectionMode: group.type === "single" ? "Single" : "Multiple",
      minSelected: group.min,
      maxSelected: group.max,
      options: group.options.map((o) => ({
        name: o.name,
        effect: { kind: EFFECT[o.priceType], amount: o.priceType === "no-change" ? null : money(o.price) },
        isDefault: o.isDefault,
        isAvailable: o.available,
      })),
    };
    return ref;
  };

  const itemRef = (item: Item): string | null => {
    if (item.name.trim() === "") return null;
    const known = itemRefs.get(item.id);
    if (known) return known;
    const ref = `i${itemRefs.size + 1}`;
    itemRefs.set(item.id, ref);
    items[ref] = {
      name: item.name,
      description: item.description || null,
      image: media(item.image),
      video: media(item.video, "Video"),
      tags: item.tags.map((tag) => options.tagLabel?.(tag) ?? tag),
      price: money(item.pricing.price),
      facts: (item.facts ?? []).map((f) => ({ factCode: f.factCode, amount: f.amount, unitCode: f.unitCode })),
      advisories: { labels: item.allergies.allergens, additionalInfo: item.allergies.note || null },
      isAvailable: item.status !== "unavailable" && item.availability.available,
      modifierGroupRefs: item.modifierGroups.map(groupRef),
    };
    return ref;
  };

  const offerRef = (offer: Offer): string | null => {
    if (offer.name.trim() === "") return null;
    const known = offerRefs.get(offer.id);
    if (known) return known;
    const ref = `o${offerRefs.size + 1}`;
    offerRefs.set(offer.id, ref);
    const components = offer.entries.flatMap((e) => {
      const component = allItems.get(e.itemId);
      const cRef = component ? itemRef(component) : null;
      return cRef ? [{ itemRef: cRef, quantity: e.qty, unit: component!.pricing.price, available: items[cRef].isAvailable }] : [];
    });
    const reference = components.reduce((sum, c) => sum + c.unit * c.quantity, 0);
    const price = offer.pricing.offerPrice;
    const saving = Math.max(0, reference - price);
    offers[ref] = {
      name: offer.name,
      image: media(offer.image),
      badge: offer.badge || null,
      showSavingBadge: offer.showSavingBadge,
      components: components.map(({ itemRef: r, quantity }) => ({ itemRef: r, quantity })),
      pricingRule: { kind: offer.pricing.role === "fixed" ? "Fixed" : offer.pricing.role === "dynamic" ? "Dynamic" : offer.pricing.discount?.type === "amount" ? "DiscountAmount" : "DiscountPercent", fixedPrice: offer.pricing.role === "fixed" ? money(price) : null, discountPercent: offer.pricing.discount?.type === "percent" ? offer.pricing.discount.value : null, discountAmount: offer.pricing.discount?.type === "amount" ? money(offer.pricing.discount.value) : null, dynamicBasePrice: offer.pricing.role === "dynamic" ? money(price) : null },
      price: { referenceTotal: money(reference), price: money(price), saving: money(saving), savingPercent: reference > 0 ? Math.round((saving / reference) * 10000) / 100 : 0 },
      isAvailable: offer.status === "active" && components.every((c) => c.available) && components.length === offer.entries.length,
    };
    return ref;
  };

  const sectionIds: string[] = [];
  const sections: PublicMenuSection[] = [];
  for (const section of menu.sections) {
    if (section.visibility !== "visible") continue;
    const entries = section.entries.flatMap((entry) => {
      if (section.kind === "offers") {
        const ref = offerRef(entry as Offer);
        return ref ? [{ ref, kind: "Offer" }] : [];
      }
      const ref = itemRef(entry as Item);
      return ref ? [{ ref, kind: "Item" }] : [];
    });
    sectionIds.push(section.id);
    sections.push({ name: section.name, description: section.description || null, image: media(section.image), displayStyle: DISPLAY[section.displayStyle], color: section.color, entries });
  }

  const brand = (menu.theme as { brand?: BrandLike | null }).brand ?? null;
  const theme = menu.theme;
  const document: PublicMenuDocument = {
    availability: "Available",
    nextAvailableAtUtc: null,
    servedAsFallback: false,
    locationLabel: null,
    language: options.language,
    availableLanguages: [options.language],
    menu: {
      name: menu.name,
      theme: {
        presetCode: theme.serverPresetCode ?? theme.presetId ?? null,
        logo: media(brand?.logoUrl),
        hero: media(brand?.heroUrl),
        heroText: brand?.heroText || null,
        heroSubtext: brand?.heroSubtext || null,
        titleFontCode: theme.titleFontCode ?? null,
        bodyFontCode: theme.bodyFontCode ?? null,
        primaryColor: brand?.colors.primary ?? null,
        lightColor: brand?.colors.light ?? null,
        accentColor: brand?.colors.accent ?? null,
        darkColor: brand?.colors.dark ?? null,
        navigationStyle: NAV[theme.navStyle],
        sectionNavStyle: CATEGORY[theme.categoryStyle],
        cardStyle: CARD[theme.cardStyle],
        itemDetailsBehavior: DETAILS[theme.itemDetails],
        stickyPrimaryAction: theme.stickyAddToCart,
        showItemTags: theme.showItemTags,
      },
    },
    sections,
    items,
    modifierGroups: groups,
    offers,
    currency: options.currency ? { code: options.currency, minorUnits: minorUnits(options.currency) } : null,
    tax: { configured: false, pricesIncludeTax: null },
  };
  return { document, sectionIds };
}
```

- [ ] **Step 4: Run the tests and type check**

Run: `cd apps/merchant && npx vitest run src/pages/menu/build/preview && npx tsc --noEmit -p .`
Expected: PASS; tsc 0. (The test's `brand` cast compiles before Task 9 because of `as Partial<Menu["theme"]>`.)

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src/pages/menu/build/preview/draft-menu-document.ts apps/merchant/src/pages/menu/build/preview/draft-menu-document.test.ts
git commit -m "Build the public menu document from the builder's draft"
```

---

### Task 9: Merchant — the menu's own brand on its theme

**Files:**
- Modify: `apps/merchant/src/entities/menu/menu.ts` (`MenuBrand`, `MenuTheme.brand`)
- Modify: `apps/merchant/src/entities/menu/menu-sync.ts` (brand pull and push)
- Modify: `apps/merchant/src/entities/menu/index.ts` if it re-exports types explicitly
- Test: `apps/merchant/src/entities/menu/menu-theme-brand.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface MenuBrand { colors: { primary: string; light: string; accent: string; dark: string }; logoUrl: string | null; heroUrl: string | null; heroText: string; heroSubtext: string }
  // MenuTheme gains: brand?: MenuBrand | null   (undefined = not loaded; null = the menu has none yet)
  export function brandColorsToServer(brand: MenuBrand | null | undefined, current: Pick<MenuThemeDto,"primaryColor"|"lightColor"|"accentColor"|"darkColor">)
  export function themeTextToServer(value: string, lang: string, current: LocalizedMap): LocalizedMap
  ```
  `pushTheme` sends the brand (colours; logo/hero uploaded with `uploadMedia(businessId, url, "ThemeLogo" | "ThemeHeroImage", "logo.png" | "hero.png", "menu")` when they are local data URLs, the known reference when they are delivery URLs (`knownMedia(url)`), `null` when removed); `pullSections` fills `theme.brand` from the server theme (resolving logo/hero with `mediaUrl(businessId, ref, "menu")`), or `null` when the server has no colours, logo or hero.

- [ ] **Step 1: Write the failing test** — `menu-theme-brand.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { brandColorsToServer, themeTextToServer } from "./menu-sync";

const current = { primaryColor: "#000000", lightColor: null, accentColor: null, darkColor: null };
const brand = { colors: { primary: "#aabbcc", light: "#ffffff", accent: "bad", dark: "#111" }, logoUrl: null, heroUrl: null, heroText: "", heroSubtext: "" };

describe("menu brand to the server", () => {
  it("sends valid colours, keeps the server's for a malformed one, and keeps all when the brand is not loaded", () => {
    expect(brandColorsToServer(brand, current)).toEqual({ primaryColor: "#aabbcc", lightColor: "#ffffff", accentColor: null, darkColor: "#111" });
    expect(brandColorsToServer(undefined, current)).toEqual(current);
    expect(brandColorsToServer(null, current)).toEqual(current);
  });

  it("writes hero text into the builder's language and clears it when blank", () => {
    expect(themeTextToServer("Hello", "en", { ar: "أهلاً" })).toEqual({ ar: "أهلاً", en: "Hello" });
    expect(themeTextToServer("  ", "en", { en: "old", ar: "x" })).toEqual({ ar: "x" });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/merchant && npx vitest run src/entities/menu/menu-theme-brand.test.ts`
Expected: FAIL — `brandColorsToServer` not exported.

- [ ] **Step 3: Types** — in `menu.ts`, above `MenuTheme`:

```ts
/** A menu's own brand, stored on its theme on the server (US-012): what its public page (site /menu, QR /c/{key}) is
 *  drawn in. Seeded from the Public Link site's brand the first time the Theme step opens a menu without one. */
export interface MenuBrand {
  colors: { primary: string; light: string; accent: string; dark: string };
  /** A delivery URL, or a data: URL picked and not yet uploaded. */
  logoUrl: string | null;
  heroUrl: string | null;
  heroText: string;
  heroSubtext: string;
}
```

and inside `MenuTheme` after `bodyFontCode`:

```ts
  /** undefined = not read from the server yet; null = the menu has no brand of its own yet. */
  brand?: MenuBrand | null;
```

- [ ] **Step 4: Sync** — in `menu-sync.ts`, replace the comment above `NAV` ("Colours, logo and hero are still owned by the site draft…") with "Card/navigation/item-detail choices and the menu's own brand (colours, logo, hero, hero text) live on the menu's theme in the API." Add, and use in `pushTheme` / `pullSections`:

```ts
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const validColor = (value: string | undefined, fallback: string | null) => (value && HEX.test(value) ? value : fallback);

export function brandColorsToServer(
  brand: MenuBrand | null | undefined,
  current: { primaryColor: string | null; lightColor: string | null; accentColor: string | null; darkColor: string | null }
) {
  if (!brand) return { primaryColor: current.primaryColor, lightColor: current.lightColor, accentColor: current.accentColor, darkColor: current.darkColor };
  return {
    primaryColor: validColor(brand.colors.primary, current.primaryColor),
    lightColor: validColor(brand.colors.light, current.lightColor),
    accentColor: validColor(brand.colors.accent, current.accentColor),
    darkColor: validColor(brand.colors.dark, current.darkColor),
  };
}

export function themeTextToServer(value: string, lang: string, current: Record<string, string>): Record<string, string> {
  const next = { ...current };
  if (value.trim()) next[lang] = value.trim();
  else delete next[lang];
  return next;
}

/** A theme image as the reference to save: uploaded when it is a fresh pick, the known reference when it is a delivery URL, none when removed. */
async function themeMedia(businessId: string, url: string | null, purpose: "ThemeLogo" | "ThemeHeroImage", current: MediaReferenceDto | null) {
  if (!url) return null;
  if (isLocalMedia(url)) return (await uploadMedia(businessId, url, purpose, purpose === "ThemeLogo" ? "logo.png" : "hero.png", "menu")).ref;
  return knownMedia(url) ?? current;
}

async function brandFromServer(businessId: string, t: Awaited<ReturnType<typeof getMenuTheme>>, lang: string): Promise<MenuBrand | null> {
  if (!t.primaryColor && !t.lightColor && !t.accentColor && !t.darkColor && !t.logo && !t.hero) return null;
  const [logoUrl, heroUrl] = await Promise.all([
    t.logo ? mediaUrl(businessId, t.logo, "menu").catch(() => null) : null,
    t.hero ? mediaUrl(businessId, t.hero, "menu").catch(() => null) : null,
  ]);
  const pick = (map: Record<string, string> | null | undefined) => map?.[lang] ?? Object.values(map ?? {})[0] ?? "";
  return {
    colors: { primary: t.primaryColor ?? "#0d6efd", light: t.lightColor ?? "#f7f8fa", accent: t.accentColor ?? "#0d6efd", dark: t.darkColor ?? "#16161d" },
    logoUrl,
    heroUrl,
    heroText: pick(t.heroText),
    heroSubtext: pick(t.heroSubtext),
  };
}
```

Import `isLocalMedia, knownMedia, mediaUrl, uploadMedia` from `@/shared/api/media`, `type MediaReferenceDto` from `@octopus/api-client`, and `type MenuBrand` from `./menu`. `pushTheme` gains a `lang: string` parameter (callers pass the builder's language — the same language `pushMenu` uses for names; if `pushMenu` has none, pass `"ar"` when the app locale is Arabic else `"en"` via its caller) and becomes:

```ts
async function pushTheme(businessId: string, menuId: string, theme: MenuTheme, lang: string): Promise<void> {
  const current = await getMenuTheme(businessId, menuId);
  const brand = theme.brand;
  await updateMenuTheme(businessId, menuId, {
    businessId,
    menuId,
    presetCode: theme.serverPresetCode !== undefined ? theme.serverPresetCode : current.presetCode,
    logo: brand === undefined ? current.logo : await themeMedia(businessId, brand?.logoUrl ?? null, "ThemeLogo", current.logo),
    hero: brand === undefined ? current.hero : await themeMedia(businessId, brand?.heroUrl ?? null, "ThemeHeroImage", current.hero),
    heroText: brand ? themeTextToServer(brand.heroText, lang, current.heroText ?? {}) : current.heroText,
    heroSubtext: brand ? themeTextToServer(brand.heroSubtext, lang, current.heroSubtext ?? {}) : current.heroSubtext,
    titleFontCode: theme.titleFontCode !== undefined ? theme.titleFontCode : current.titleFontCode,
    bodyFontCode: theme.bodyFontCode !== undefined ? theme.bodyFontCode : current.bodyFontCode,
    ...brandColorsToServer(brand, current),
    navigationStyle: NAV[theme.navStyle],
    sectionNavStyle: CATEGORY[theme.categoryStyle],
    cardStyle: CARD[theme.cardStyle],
    itemDetailsBehavior: DETAILS[theme.itemDetails],
    stickyPrimaryAction: theme.stickyAddToCart,
    showItemTags: theme.showItemTags,
    expectedVersion: null,
  });
}
```

In `pullSections`, where the theme is read (`themeFromServer(…)`), set the brand too: `theme: { ...themeFromServer(local.theme, serverTheme), brand: await brandFromServer(businessId, serverTheme, lang) }` (read the surrounding code for the exact variable names; `lang` as above).

- [ ] **Step 5: Run the tests and type check**

Run: `cd apps/merchant && npx vitest run src/entities/menu && npx tsc --noEmit -p .`
Expected: PASS; tsc 0.

- [ ] **Step 6: Commit**

```bash
git add apps/merchant/src/entities/menu
git commit -m "Store a menu's own brand on its theme"
```

---

### Task 10: Merchant — the Theme step edits the menu's brand, and shows the real QR code

**Files:**
- Modify: `apps/merchant/src/pages/menu/build/theme/index.tsx`
- Modify: `apps/merchant/src/pages/menu/build/theme/qr-panel.tsx`
- Delete: `apps/merchant/src/pages/menu/build/theme/public-url.ts` (and any importer)
- Create: `apps/merchant/src/pages/menu/build/theme/seed-brand.ts`
- Test: `apps/merchant/src/pages/menu/build/theme/seed-brand.test.ts`

**Interfaces:**
- Consumes: `MenuBrand` (Task 9), `useSiteDraft` (`@/entities/site-draft`), `listAccessCodes`, `createAccessCode` (`@octopus/api-client`), `MenuPreset.colors`.
- Produces: `seedBrand(site: SiteDraft, preset: MenuPreset | null): MenuBrand`; `QrPanel({ menuId }: { menuId: string })` showing the menu's active `MenuDirect` access code (`printableUrl`) or a "Create QR code" button.

- [ ] **Step 1: Write the failing test** — `seed-brand.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EMPTY_SITE_DRAFT } from "@/entities/site-draft";
import { seedBrand } from "./seed-brand";

describe("seedBrand", () => {
  it("starts from the site's brand", () => {
    const site = { ...EMPTY_SITE_DRAFT, brand: { ...EMPTY_SITE_DRAFT.brand, logoDataUrl: "https://cdn/logo.png" } };
    site.sectionSettings = { ...site.sectionSettings, hero: { ...site.sectionSettings.hero, heading: "Welcome", imageDataUrl: "https://cdn/h.jpg" } };
    expect(seedBrand(site, null)).toEqual({ colors: site.brand.colors, logoUrl: "https://cdn/logo.png", heroUrl: "https://cdn/h.jpg", heroText: "Welcome", heroSubtext: site.sectionSettings.hero.subheading });
  });

  it("takes the preset's colours when one is chosen", () => {
    const preset = { id: "p", labelKey: "p", styleId: "modern", colors: { primary: "#111111", light: "#eeeeee", accent: "#ff0000", dark: "#000000" } };
    expect(seedBrand(EMPTY_SITE_DRAFT, preset as never).colors).toEqual(preset.colors);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/merchant && npx vitest run src/pages/menu/build/theme/seed-brand.test.ts`
Expected: FAIL — cannot find `./seed-brand`.

- [ ] **Step 3: Create `seed-brand.ts`**

```ts
import type { MenuBrand } from "@/entities/menu";
import type { SiteDraft } from "@/entities/site-draft";
import type { MenuPreset } from "./presets";

/** A menu's first brand: the Public Link site's (logo, hero, colours), with a chosen preset's palette taking precedence. */
export function seedBrand(site: SiteDraft, preset: MenuPreset | null): MenuBrand {
  const hero = site.sectionSettings.hero;
  return {
    colors: preset ? { ...preset.colors } : { ...site.brand.colors },
    logoUrl: site.brand.logoDataUrl,
    heroUrl: hero.imageDataUrl,
    heroText: hero.heading,
    heroSubtext: hero.subheading,
  };
}
```

- [ ] **Step 4: Theme step** — in `theme/index.tsx`:

1. Keep `const { draft: site } = useSiteDraft();` (read-only now: drop `dispatch`).
2. Add, after `const theme = draft.theme;` and `patchTheme`:

```tsx
  // The menu's own brand. A menu read from the server without one (null) starts from the site's brand, once.
  const brand = theme.brand ?? null;
  useEffect(() => {
    if (theme.brand === null) patchTheme({ brand: seedBrand(site, presetFor(theme.presetId) ?? null) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.brand === null]);
  const shownBrand = brand ?? seedBrand(site, null);
  function patchBrand(patch: Partial<MenuBrand>) {
    patchTheme({ brand: { ...shownBrand, ...patch } });
  }
```

3. Replace every brand read/write in the JSX:
   - logo picker: `useFilePicker((dataUrl) => patchBrand({ logoUrl: dataUrl }))`; image `shownBrand.logoUrl`.
   - hero picker: `useFilePicker((dataUrl) => patchBrand({ heroUrl: dataUrl }))`; image `shownBrand.heroUrl`; remove button `patchBrand({ heroUrl: null })`.
   - hero text inputs: `value={shownBrand.heroText}` / `onChange={(e) => patchBrand({ heroText: e.target.value })}`, same for `heroSubtext`.
   - colours: `value={shownBrand.colors[field]}` / `onChange={(e) => patchBrand({ colors: { ...shownBrand.colors, [field]: e.target.value } })}`; `COLORS` typed `keyof MenuBrand["colors"]`.
   - `selectPreset`: `patchTheme({ presetId: preset.id, serverPresetCode: isServerPreset(preset.id) ? preset.id : undefined, brand: { ...shownBrand, colors: { ...preset.colors } } })` (one `patchTheme`, not two).
   - fonts: the two `<Select>`s read `theme.titleFontCode ?? site.brand.typography.en.titles` / `theme.bodyFontCode ?? site.brand.typography.en.body` and write only `patchTheme({ titleFontCode: e.target.value })` / `patchTheme({ bodyFontCode: e.target.value })` (the font list is already the platform's codes when it lists any).
   - `<PreviewRail menu={draft} composition="menu" site={site} />` stays for now (Task 11 replaces it); remove the `publicMenuUrl` import and `url` constant; render `<QrPanel menuId={draft.id} />`.
4. Imports: `useEffect`, `type MenuBrand`, `seedBrand`.

- [ ] **Step 5: The real QR code** — rewrite `qr-panel.tsx` around the menu's access code (keep its card chrome, headings, the `QrCode` component and the table-QR modal if present; the table QR appends `?l=Table%20{n}` to `printableUrl`):

```tsx
// The menu's real QR code: its active direct access code (GET /access-codes), printed as `printableUrl`
// (Menu:PublicCodesBaseUri/c/{key}). A menu without one gets a Create button (POST /access-codes, kind MenuDirect).
import { useCallback, useEffect, useState } from "react";
import { createAccessCode, listAccessCodes, type AccessCodeResponse } from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
// …keep the existing imports the panel already uses (QrCode, Button, icons)…

const newKey = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function QrPanel({ menuId }: { menuId: string }) {
  const { t } = useI18n();
  const { activeBusinessId } = useAuth();
  const [code, setCode] = useState<AccessCodeResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "creating" | "error">("loading");

  const load = useCallback(async () => {
    if (!activeBusinessId) return;
    setState("loading");
    try {
      const all = await listAccessCodes(activeBusinessId);
      const list = Array.isArray(all) ? all : (all.data ?? []);
      setCode(list.find((c) => c.menuId === menuId && c.kind === "MenuDirect" && c.status === "Active") ?? null);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [activeBusinessId, menuId]);
  useEffect(() => void load(), [load]);

  async function create() {
    if (!activeBusinessId) return;
    setState("creating");
    try {
      setCode(await createAccessCode(activeBusinessId, { businessId: activeBusinessId, kind: "MenuDirect", branchId: null, menuId }, newKey()));
      setState("ready");
    } catch {
      setState("error");
    }
  }
  // Render: when `code` → the existing QR card with `code.printableUrl` (QR image, the URL as a link, copy button);
  // when ready and no code → t("menuTheme.qr.none") + a button t("menuTheme.qr.create") calling create();
  // loading/creating → a spinner line; error → t("menuTheme.qr.error") + retry (load()).
}
```

Write the JSX for those four states reusing the panel's existing markup and classes. Add i18n keys `menuTheme.qr.none` ("This menu has no QR code yet." / "لا يوجد QR لهذه القائمة بعد."), `menuTheme.qr.create` ("Create QR code" / "إنشاء QR"), `menuTheme.qr.error` ("Couldn't load the QR code." / "تعذّر تحميل QR.") to `packages/i18n/src/locales/{en,ar}/index.ts`. (`listAccessCodes` returns a list envelope — check its return type in `packages/api-client/src/lib/menu-admin-client.ts` and read `.data` if so; the line above handles both.) Delete `theme/public-url.ts`.

- [ ] **Step 6: Run the tests and type check**

Run: `cd apps/merchant && npx vitest run && npx tsc --noEmit -p .`
Expected: all pass; tsc 0.

- [ ] **Step 7: Commit**

```bash
git add apps/merchant/src/pages/menu/build/theme packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "Edit the menu's own brand and show its real QR code"
```

---

### Task 11: Merchant — the menu builder previews the real storefront

**Files:**
- Create: `apps/merchant/src/pages/menu/build/preview/canvas-origin.ts`
- Create: `apps/merchant/src/pages/menu/build/preview/menu-canvas-channel.ts`
- Create: `apps/merchant/src/pages/menu/build/preview/menu-preview-frame.tsx`
- Modify: `apps/merchant/src/pages/menu/build/theme/index.tsx`, `sections/index.tsx`, `items/index.tsx` (replace `<PreviewRail …/>`), `review/customer-preview.tsx` (frame instead of its own markup)
- Modify: `apps/merchant/.env.example`, `packages/i18n/src/locales/{en,ar}/index.ts`
- Test: `apps/merchant/src/pages/menu/build/preview/menu-canvas-channel.test.ts`

**Interfaces:**
- Consumes: Task 7 (`StorefrontFrame`, `CanvasChannel`), Task 8 (`draftMenuDocument`), Task 2 protocol, `PreviewRail` (fallback), `useMenuCurrency`, `useDraft`.
- Produces: `canvasOrigin(): string`; `MENU_CANVAS_CHANNEL: CanvasChannel<MenuRenderPayload>`; `MenuPreviewFrame({ menu, selectedSectionId?, onSelectSection?, mode?, site? })`.

- [ ] **Step 1: Write the failing test** — `menu-canvas-channel.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fromCanvas, fromMenuCanvas } from "@octopus/api-client";
import { MENU_CANVAS_CHANNEL } from "./menu-canvas-channel";
import { canvasOrigin } from "./canvas-origin";

describe("menu canvas channel", () => {
  it("points at /preview/menu and maps the canvas's messages", () => {
    expect(MENU_CANVAS_CHANNEL.path).toBe("/preview/menu");
    expect(MENU_CANVAS_CHANNEL.accept(fromMenuCanvas({ type: "select-section", sectionRef: "s2" }))).toEqual({ type: "select-section", id: "s2" });
    expect(MENU_CANVAS_CHANNEL.accept(fromMenuCanvas({ type: "ready" }))).toEqual({ type: "ready" });
    expect(MENU_CANVAS_CHANNEL.accept(fromCanvas({ type: "ready" }))).toBeNull();
  });

  it("uses the configured canvas origin, else the dev storefront in development", () => {
    expect(canvasOrigin({ VITE_STOREFRONT_CANVAS_ORIGIN: "https://menu.example/", DEV: false })).toBe("https://menu.example");
    expect(canvasOrigin({ DEV: true })).toBe("http://localhost:3000");
    expect(canvasOrigin({ DEV: false })).toBe("https://menu.octopus.sa");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/merchant && npx vitest run src/pages/menu/build/preview/menu-canvas-channel.test.ts`
Expected: FAIL — cannot find `./menu-canvas-channel`.

- [ ] **Step 3: Create the channel and origin**

`canvas-origin.ts`:

```ts
/** Where the storefront's menu canvas lives. It needs no tenant, so one origin serves every business: the QR host in
 *  production, the storefront dev server in development, or VITE_STOREFRONT_CANVAS_ORIGIN when set. */
export function canvasOrigin(env: { VITE_STOREFRONT_CANVAS_ORIGIN?: string; DEV?: boolean } = import.meta.env): string {
  const configured = env.VITE_STOREFRONT_CANVAS_ORIGIN?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  return env.DEV ? "http://localhost:3000" : "https://menu.octopus.sa";
}
```

`menu-canvas-channel.ts`:

```ts
import { MENU_PREVIEW_PATH, isFromMenuCanvasMessage, toMenuCanvas, type MenuRenderPayload } from "@octopus/api-client";
import type { CanvasChannel } from "@/widgets/storefront-frame";

export const MENU_CANVAS_CHANNEL: CanvasChannel<MenuRenderPayload> = {
  path: MENU_PREVIEW_PATH,
  render: (payload) => toMenuCanvas({ type: "render", ...payload }),
  scrollTo: (anchor) => toMenuCanvas({ type: "scroll-to", anchor }),
  accept: (data) => {
    if (!isFromMenuCanvasMessage(data)) return null;
    if (data.type === "select-section") return { type: "select-section", id: data.sectionRef };
    if (data.type === "navigate") return { type: "navigate", href: data.href };
    return { type: "ready" };
  },
};
```

- [ ] **Step 4: Create `menu-preview-frame.tsx`**

```tsx
// "Live Preview — how it appears to your customers": the real storefront menu page, framed, drawn from the menu held in
// memory (draftMenuDocument), so every edit shows before Save. Falls back to the builder's own drawing (PreviewRail) when
// the storefront canvas does not answer within 8 s.
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Monitor, Smartphone } from "lucide-react";
import type { Menu } from "@/entities/menu";
import { useMenuCurrency } from "@/entities/menu/use-menu-resource";
import type { SiteDraft } from "@/entities/site-draft";
import { useI18n } from "@/app/providers/i18n-provider";
import { StorefrontFrame, type FrameDevice } from "@/widgets/storefront-frame";
import { PreviewRail } from "../preview-rail";
import { canvasOrigin } from "./canvas-origin";
import { draftMenuDocument } from "./draft-menu-document";
import { MENU_CANVAS_CHANNEL } from "./menu-canvas-channel";

const TAG_KEYS: Record<string, string> = {
  "chef-recommended": "menuWiz.item.tag.chef",
  "top-selling": "menuWiz.item.tag.top",
  "most-ordered": "menuWiz.item.tag.most",
  "healthy-choice": "menuWiz.item.tag.healthy",
};
const MAX_CARD: Record<FrameDevice, number> = { desktop: Infinity, tablet: 520, mobile: 320 };

export interface MenuPreviewFrameProps {
  menu: Menu;
  /** The builder section being edited: outlined in the page. */
  selectedSectionId?: string | null;
  /** A section clicked in the page. */
  onSelectSection?: (sectionId: string) => void;
  /** "order" shows the site's add buttons and sticky cart. */
  mode?: "order" | "view";
  /** Fallback drawing only: the brand PreviewRail uses. */
  site?: SiteDraft;
  height?: number | string;
}

export function MenuPreviewFrame({ menu, selectedSectionId = null, onSelectSection, mode = "order", site, height = 760 }: MenuPreviewFrameProps) {
  const { t, locale } = useI18n();
  const currency = useMenuCurrency();
  const [device, setDevice] = useState<FrameDevice>("desktop");
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const origin = canvasOrigin();

  const { document, sectionIds } = useMemo(
    () => draftMenuDocument(menu, { currency: currency.data ?? null, language: locale === "ar" ? "ar" : "en", tagLabel: (tag) => (TAG_KEYS[tag] ? t(TAG_KEYS[tag]) : tag) }),
    [menu, currency.data, locale, t]
  );
  const highlight = selectedSectionId ? sectionIds.indexOf(selectedSectionId) : -1;
  const payload = useMemo(
    () => ({ document, mode, selectable: Boolean(onSelectSection), highlightSectionRef: highlight >= 0 ? `s${highlight}` : null }),
    [document, mode, onSelectSection, highlight]
  );

  if (failed) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[11.5px] text-[var(--octo-text-muted)]">{t("menuWiz.preview.fallback")}</p>
        <PreviewRail menu={menu} composition="menu" site={site} />
      </div>
    );
  }

  return (
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuWiz.preview.title")}
            {ready && <span className="rounded-full bg-[#16a34a]/10 px-2 py-0.5 text-[10.5px] font-semibold text-[#16a34a]">{t("menuWiz.preview.real")}</span>}
          </h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--octo-text-secondary)]">{t("menuWiz.preview.hint")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-[9px] border border-[var(--octo-border-card)] p-1">
          {([["desktop", Monitor], ["mobile", Smartphone]] as const).map(([id, Icon]) => (
            <button key={id} type="button" aria-label={id} aria-pressed={device === id} onClick={() => setDevice(id)} className={clsx("rounded-[7px] p-1.5", device === id ? "bg-[var(--octo-selected)] text-[var(--octo-accent)]" : "text-[var(--octo-text-muted)]")}>
              <Icon size={16} aria-hidden />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <StorefrontFrame
          channel={MENU_CANVAS_CHANNEL}
          origin={origin}
          device={device}
          payload={payload}
          scrollRequest={null}
          onNavigate={() => undefined}
          onSelectSection={(ref) => {
            const index = Number(ref.replace(/^s/, ""));
            const id = sectionIds[index];
            if (id && onSelectSection) onSelectSection(id);
          }}
          onReady={() => setReady(true)}
          onUnavailable={() => setFailed(true)}
          height={height}
          maxCardWidth={MAX_CARD[device]}
          title={menu.name}
        />
      </div>
    </section>
  );
}
```

i18n (both locales): `menuWiz.preview.real` ("Your real menu" / "قائمتك الحقيقية"), `menuWiz.preview.fallback` ("Your storefront could not be reached, so the builder's own preview is shown." / "تعذّر الوصول إلى موقعك، لذا تُعرض معاينة أداة البناء.").

- [ ] **Step 5: Wire the steps**

- `theme/index.tsx`: replace `<PreviewRail menu={draft} composition="menu" site={site} />` with `<MenuPreviewFrame menu={draft} site={site} />`.
- `sections/index.tsx` and `items/index.tsx`: replace `<PreviewRail menu={draft} />` with `<MenuPreviewFrame menu={draft} selectedSectionId={<the step's selected section id>} onSelectSection={<the step's section select handler>} />` — read each file for the state that holds the selected section; if the step has no section selection, omit both props.
- `review/customer-preview.tsx`: inside its modal, render `<MenuPreviewFrame menu={draft} mode="order" height="calc(100vh - 180px)" />` instead of the bespoke markup that draws the `previewDraft()` response (remove that markup and the now-unused `previewDraft` call; keep the modal and its open/close button). Its `draft` comes from `useDraft()`.
- `apps/merchant/.env.example`: append

```
# Where the storefront's menu canvas (/preview/menu) is served for the menu builder's live preview.
# Default: http://localhost:3000 in development, https://menu.octopus.sa in production.
VITE_STOREFRONT_CANVAS_ORIGIN=
```

- [ ] **Step 6: Run every check**

Run: `cd apps/merchant && npx tsc --noEmit -p . && npx vitest run` then `cd ../customer && npx tsc --noEmit -p . && npx vitest run`
Expected: tsc 0 in both; all tests pass.

- [ ] **Step 7: Manual end-to-end (owner)**

Backend (AdminApi :8081, PublicApi :8082) running; `npm run dev` in `apps/customer` (:3000) and `apps/merchant` (:5290); signed in.
1. Menu builder → Theme step: the preview card shows "Your real menu"; dev tools show an iframe at `http://localhost:3000/preview/menu`.
2. Change card style, category style, navigation style, sticky cart, tags, a colour, the logo → the framed page changes immediately, before Save.
3. Items step: rename an item and change its price → immediate. Sections step: switch a section to Carousel, hide a section → immediate; clicking a section in the frame selects it.
4. Save & continue, publish the menu. Theme step → "Create QR code" → open its `printableUrl` path on the dev storefront (`http://localhost:3000/c/{key}`): same page as the preview, no add buttons, no cart.
5. A site with this menu bound: `http://{slug}.localhost:3000/menu` shows the themed page with add buttons and sticky cart.
6. `http://localhost:3000/c/not-a-key` → not-found page.
7. Stop the storefront, reload the builder → after ~8 s the note and the old drawing.

- [ ] **Step 8: Commit**

```bash
git add apps/merchant/src/pages/menu/build apps/merchant/.env.example packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "Preview the real storefront menu in the menu builder"
```
