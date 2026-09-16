// The shell Sign In and Create Account share: a blue gradient panel carrying
// the product shot on the left, a white form card on the right. Below lg the
// panel drops out entirely and the card owns the screen — the collage is
// decoration, and shrinking it to phone width would just make it illegible.
import type { ReactNode } from "react";

const LOGO_URL = new URL("../../../../../assets/Logo/OCTOPUS LOGO.svg", import.meta.url).href;
const DASHBOARD_URL = new URL("../../../../../assets/login/dashboard-mockup.png", import.meta.url).href;

// Stacked quarterly bars, as a percentage of the plot height: [teal, blue, violet].
const BARS = [
  [40, 13, 7], [44, 15, 8], [48, 17, 9], [52, 18, 10],
  [56, 20, 11], [60, 21, 12], [64, 23, 13], [68, 24, 14],
];
const QUARTERS = ["Q3 24", "Q4 24", "Q1 25", "Q2 25", "Q3 25", "Q4 25", "Q1 26", "Q2 26"];
const LEGEND = [
  { label: "Dine-in", color: "#22B8A6" },
  { label: "Takeaway", color: "#2BC0B4" },
  { label: "Delivery", color: "#3B82F6" },
  { label: "Kiosk", color: "#8B7CF6" },
  { label: "Aggregator", color: "#6D5BE0" },
];

/** One of the two chart cards floating over the product shot. Drawn rather
 *  than photographed so it stays sharp at any density and tracks the brand
 *  palette instead of being baked into a PNG. */
function RevenueCard({
  className,
  compact = false,
  plotHeight,
}: {
  className?: string;
  compact?: boolean;
  plotHeight: number;
}) {
  return (
    <div className={`rounded-2xl bg-white p-3 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)] ${className ?? ""}`}>
      <p className={compact ? "text-[9px] font-semibold text-[#0B1B3F]" : "text-[13px] font-semibold text-[#0B1B3F]"}>
        Revenue by Channel
      </p>

      {!compact && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {LEGEND.map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1 text-[9.5px] text-[#5B6478]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* h-full on each column is load-bearing: the segments size themselves
          as a percentage, and a percentage of an auto-height parent is zero. */}
      <div className="mt-2 flex items-end justify-between gap-[3px]" style={{ height: plotHeight }}>
        {BARS.map((segments, index) => (
          <div key={QUARTERS[index]} className="flex h-full flex-1 flex-col justify-end gap-[1.5px]">
            <div className="rounded-t-[2px] bg-[#8B7CF6]" style={{ height: `${segments[2]}%` }} />
            <div className="bg-[#4C7DF0]" style={{ height: `${segments[1]}%` }} />
            <div className="rounded-b-[2px] bg-[#2BC0B4]" style={{ height: `${segments[0]}%` }} />
          </div>
        ))}
      </div>

      {!compact && (
        <div className="mt-1.5 flex justify-between">
          {QUARTERS.map((q) => (
            <span key={q} className="flex-1 text-center text-[8.5px] text-[#8B94A7]">{q}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function AuthLayout({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading: string;
  children: ReactNode;
}) {
  return (
    // Light-only, the same call the Setup wizard makes: these frames are drawn
    // light and nothing in them has a dark counterpart — the white form card
    // is defined by its shadow, so under the dark palette card and page both
    // resolve to #1a1f2b and the card disappears. Re-declaring the light
    // palette here beats the dark one on <html> for this subtree alone, so a
    // merchant running the console dark keeps that choice everywhere else.
    <div data-theme="light" className="flex min-h-screen bg-[var(--octo-card)]">
      {/* Brand panel */}
      <div className="octo-auth-gradient relative hidden w-[49%] shrink-0 flex-col justify-between overflow-hidden rounded-e-[28px] px-12 py-10 lg:flex">
        <div className="flex items-center gap-2.5">
          {/* The mark ships in brand colour; on the blue panel it has to read
              as a white silhouette, which is a filter rather than a 2nd file. */}
          <img
            src={LOGO_URL}
            alt="OCTOPUS logo"
            width={34}
            height={34}
            className="object-contain brightness-0 invert"
          />
          <span className="text-[19px] font-bold tracking-tight text-white">OCTOPUS</span>
        </div>

        {/* Product shot collage. Deliberately bleeds past the panel's start
            edge — the frame lets it run off-canvas rather than sit boxed in. */}
        {/* dir="ltr" even in Arabic: the panel itself mirrors, but a chart is
            data — flipping it turns a rising revenue trend into a falling one. */}
        <div dir="ltr" className="relative mx-auto my-6 aspect-[16/11] w-full max-w-[640px]">
          <img
            src={DASHBOARD_URL}
            alt=""
            className="absolute start-[8%] top-[14%] w-[92%] rounded-lg shadow-[0_30px_70px_-24px_rgba(11,27,63,0.45)]"
          />
          <RevenueCard compact plotHeight={54} className="absolute -start-[2%] top-0 w-[26%] -rotate-[9deg]" />
          <RevenueCard plotHeight={92} className="absolute bottom-[2%] start-[44%] w-[56%]" />
        </div>

        <div>
          <h1 className="max-w-[560px] text-[46px] font-extrabold leading-[1.08] tracking-tight text-[#0B1B3F]">
            {heading}
          </h1>
          <p className="mt-5 max-w-[520px] text-[16px] text-[#4A5568]">{subheading}</p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[700px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src={LOGO_URL} alt="OCTOPUS logo" width={30} height={30} className="object-contain" />
            <span className="text-[17px] font-bold tracking-tight text-[var(--octo-text-primary)]">OCTOPUS</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
