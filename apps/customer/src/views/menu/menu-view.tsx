import type { MenuCategory } from "@octopus/api-client";
import { Breadcrumb, SectionHeading } from "@/shared/ui";
import { CategoryMosaic } from "@/widgets/category-mosaic";

export interface MenuViewProps {
  categories: MenuCategory[];
  homeLabel: string;
  menuLabel: string;
}

/** No design was supplied for this screen, but the nav links to it and every
 *  breadcrumb passes through it. It reuses the home page's mosaic rather than
 *  inventing a layout. Labels arrive as props because this is a server
 *  component and useI18n is a client hook. */
export function MenuView({ categories, homeLabel, menuLabel }: MenuViewProps) {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-8 sm:px-6">
      <Breadcrumb items={[{ label: homeLabel, href: "/" }, { label: menuLabel }]} />
      <SectionHeading id="products" title={menuLabel} />
      <CategoryMosaic categories={categories} />
    </div>
  );
}
