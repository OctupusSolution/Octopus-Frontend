/** The faint food line-art behind the category tiles. An inline <pattern>
 *  rather than an image file: it costs no request, and drawing in
 *  `currentColor` lets a caller tint it to whatever surface it sits on. */
export function DoodlePattern({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <defs>
        <pattern id="octo-doodle" width="88" height="88" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
            <circle cx="18" cy="18" r="8" />
            <path d="M12 18h12M18 12v12" />
            <path d="M58 10v18M62 10v18M54 10c0 8 8 8 8 0" />
            <path d="M20 58c0-7 6-12 13-12s13 5 13 12z" />
            <path d="M18 62h30" />
            <path d="M66 52a9 9 0 1 0 .01 0M70 58l6 6" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#octo-doodle)" />
    </svg>
  );
}
