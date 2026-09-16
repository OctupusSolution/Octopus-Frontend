export interface PageHeadingProps {
  title: string;
  /** The line under the rule. Only the fulfillment sub-screens carry one. */
  subtitle?: string;
}

/** The storefront's page title: a brand rule at the inline start, the title at
 *  48px, and an optional line of guidance beneath. `SectionHeading` is the
 *  smaller in-page variant and stays as it is. */
export function PageHeading({ title, subtitle }: PageHeadingProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center border-s-[5px] border-[var(--color-ocean-blue)] px-3 sm:h-12">
        <h1 className="text-[28px] font-bold leading-none text-[var(--color-gray-900)] sm:text-[48px]">
          {title}
        </h1>
      </div>
      {subtitle && (
        <p className="text-[18px] leading-none text-[var(--octo-store-body)] sm:text-[24px]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
