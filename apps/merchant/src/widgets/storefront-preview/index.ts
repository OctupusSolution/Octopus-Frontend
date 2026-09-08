// TS 5's `moduleResolution: "bundler"` rejects an explicit `.tsx` import
// specifier (TS5097) without `allowImportingTsExtensions`, so the component
// lives in its own file rather than sharing the `index` name with this
// barrel.
export * from "./storefront-preview";
export * from "./model";
