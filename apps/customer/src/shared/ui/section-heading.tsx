export interface SectionHeadingProps {
  title: string;
  /** Anchor target for the nav's in-page links. */
  id?: string;
}

export function SectionHeading({ title, id }: SectionHeadingProps) {
  return (
    <h2 id={id} className="flex scroll-mt-20 items-center gap-3">
      <span className="h-[26px] w-[4px] shrink-0 rounded-full bg-[#0D6EFD]" aria-hidden="true" />
      <span className="text-[22px] font-bold text-[var(--octo-text-primary)] sm:text-[28px]">
        {title}
      </span>
    </h2>
  );
}
