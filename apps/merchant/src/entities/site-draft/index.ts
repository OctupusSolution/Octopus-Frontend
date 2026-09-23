// entities/site-draft — the merchant's public storefront draft.
//
// It lived in pages/public-link/_shared/ while that page was its only consumer.
// The menu wizard's Theme step is the second: logo, the four colours,
// typography and hero are one thing the merchant owns, not two copies that
// drift, so setting the logo in the menu builder sets it in the Public Link
// Builder and the reverse. A page may not import another page's internals, so
// the files came down a layer rather than the import going sideways.
//
// preview-model.ts deliberately stayed behind. It pulls in three catalogs and a
// cross-page import of `dnsLabel` from pages/onboarding, and dragging that into
// entities/ would move a layer violation rather than fix one. The menu wizard
// has its own adapter and does not need it.

export * from "./site-draft";
export * from "./site-draft-storage";
export * from "./use-site-draft";
export * from "./theme-catalog";
export * from "./public-link-sync";
export * from "./site-fonts";
