// apps/merchant/src/pages/customers/_shared/empty-illustration.tsx
// Line illustration from CRM-Empty state.png: three stars over a group of
// three people resting on an open hand. Stroke-only, drawn in currentColor.
const STAR = "M0 -13 L3.8 -4.2 L13 -4 L5.8 2 L8.2 11.5 L0 6.3 L-8.2 11.5 L-5.8 2 L-13 -4 L-3.8 -4.2 Z";

export function EmptyCustomersIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 280" width="190" height="205" fill="none" aria-hidden="true" className={className}>
      <g stroke="currentColor" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round">
        <path d={STAR} transform="translate(70 42)" />
        <path d={STAR} transform="translate(130 26) scale(1.1)" />
        <path d={STAR} transform="translate(190 42)" />
        {/* side people */}
        <circle cx="72" cy="98" r="15" />
        <path d="M44 146 v-4 a22 22 0 0 1 22 -20 h12" />
        <circle cx="188" cy="98" r="15" />
        <path d="M216 146 v-4 a22 22 0 0 0 -22 -20 h-12" />
        {/* centre person */}
        <circle cx="130" cy="88" r="20" />
        <path d="M88 154 v-6 a30 30 0 0 1 30 -30 h24 a30 30 0 0 1 30 30 v6 z" />
        <path d="M44 146 h40 M176 146 h40" />
        {/* hand */}
        <path d="M22 208 l40 -22 c10 -6 24 -8 36 -2 l22 10 c8 4 8 16 -2 18 l-34 2" />
        <path d="M92 226 c26 4 58 0 84 -16 l52 -30 c10 -6 22 4 14 14 c-22 24 -60 50 -100 58 c-24 4 -46 0 -70 -8" />
        <path d="M8 214 l18 -10 l38 66 l-18 10 z" />
      </g>
    </svg>
  );
}
