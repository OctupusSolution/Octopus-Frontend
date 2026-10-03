/** The font code a menu's theme may carry to the server: the platform's own
 *  spelling of `pick` when GET /theme-presets lists it, else undefined. The API
 *  refuses a code it does not list (UnknownFont) and would fail the whole menu
 *  save; undefined makes pushTheme keep the server's current font instead. */
export function serverFontCode(pick: string, serverFonts: readonly string[]): string | undefined {
  return serverFonts.find((code) => code.toLowerCase() === pick.toLowerCase());
}
