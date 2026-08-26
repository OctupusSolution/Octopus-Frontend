import Link from "next/link";
import type { MenuCategory } from "@octopus/api-client";
import { DoodlePattern } from "@/shared/ui";

export interface CategoryMosaicProps {
  categories: MenuCategory[];
}

// The design does not lay these out in an even row — one column runs tall
// through both rows, which is what gives the block its magazine look. Each
// entry names the slug it wants and the grid area it occupies.
const LAYOUT: readonly { slug: string; className: string }[] = [
  { slug: "desserts", className: "lg:col-start-1 lg:row-start-1" },
  { slug: "main", className: "lg:col-start-2 lg:row-span-2 lg:row-start-1" },
  { slug: "breakfast", className: "lg:col-start-3 lg:row-start-1" },
  { slug: "drinks", className: "lg:col-start-1 lg:row-start-2" },
  { slug: "lunch", className: "lg:col-start-3 lg:row-start-2" },
];

export function CategoryMosaic({ categories }: CategoryMosaicProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[210px_210px]">
      {LAYOUT.map((slot, index) => {
        const category = categories.find((c) => c.slug === slot.slug);
        // A menu without this category simply leaves the slot empty rather
        // than throwing on a tile nobody asked for.
        if (!category) return null;

        const tall = slot.className.includes("row-span-2");

        return (
          <Link
            key={category.id}
            href={`/menu/${category.slug}`}
            className={`group relative flex overflow-hidden rounded-[20px] bg-[var(--octo-store-soft)] p-5 transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] ${
              tall ? "flex-col" : index % 2 === 0 ? "flex-row" : "flex-row-reverse"
            } ${slot.className} min-h-[190px]`}
          >
            <DoodlePattern className="absolute inset-0 h-full w-full text-[#dfe3e8] opacity-50" />

            <span
              className={`relative z-10 text-[18px] font-bold text-[var(--octo-text-primary)] sm:text-[20px] ${
                tall ? "text-center" : "flex flex-1 items-center"
              }`}
            >
              {category.name}
            </span>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={category.imageUrl}
              alt=""
              loading="lazy"
              className={`relative z-10 object-contain transition-transform duration-300 group-hover:scale-105 ${
                tall ? "mt-3 h-full min-h-0 w-full" : "h-full w-1/2"
              }`}
            />
          </Link>
        );
      })}
    </div>
  );
}
