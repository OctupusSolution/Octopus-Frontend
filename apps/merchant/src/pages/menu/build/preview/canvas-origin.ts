/** Where the storefront's menu canvas lives. It needs no tenant, so one origin serves every business: the QR host in
 *  production, the storefront dev server in development, or VITE_STOREFRONT_CANVAS_ORIGIN when set. */
export function canvasOrigin(env: { VITE_STOREFRONT_CANVAS_ORIGIN?: string; DEV?: boolean } = import.meta.env): string {
  const configured = env.VITE_STOREFRONT_CANVAS_ORIGIN?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  return env.DEV ? "http://localhost:3000" : "https://menu.octopus.sa";
}
