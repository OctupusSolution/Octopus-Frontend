import type { OrderChannel } from "./order";

/** The round chips the storefront listing shows above its grid. A second axis
 *  from the category: a category is what the merchant named a section of their
 *  menu, a group is what kind of food an item is. The listing uses both. */
export type MenuGroupId =
  | "all" | "chicken" | "meat" | "burger" | "pizza"
  | "sides" | "appetizers" | "salads";

export type AllergenId =
  | "gluten" | "dairy" | "eggs" | "nuts" | "soy" | "seafood";

export type DietaryId =
  | "vegetarian" | "vegan" | "gluten_free" | "spicy" | "healthy";

export type MenuItemBadge = "best_seller" | "offer" | "new";

/** Labels are UI chrome, resolved through i18n (`store.group.<id>`), so a group
 *  carries no name of its own — unlike a category, which a merchant names. */
export interface MenuGroup {
  id: MenuGroupId;
  imageUrl: string;
}

export interface MenuItemModifierOption {
  id: string;
  label: string;
  priceDeltaSar: number;
}

export interface MenuItemModifierGroup {
  id: string;
  label: string;
  required: boolean;
  multiple: boolean;
  options: MenuItemModifierOption[];
  // The product page draws short single-choice groups as radio pills and long
  // or optional ones as collapsed accordions. An explicit flag beats counting
  // options, which would silently relayout when a merchant adds a sauce.
  display?: "pills" | "accordion";
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceSar: number;
  imageUrl: string;
  available: boolean;
  availableFor: OrderChannel[];
  modifierGroups: MenuItemModifierGroup[];

  // Storefront display fields. All optional: the cart, checkout, order tracking
  // and the add-to-cart modal read MenuItem and must keep working without them.
  images?: string[];
  compareAtPriceSar?: number;
  priceFrom?: boolean;
  rating?: number;
  calories?: number;
  allergens?: AllergenId[];
  badges?: MenuItemBadge[];
  group?: MenuGroupId;
  dietary?: DietaryId[];
  inStock?: boolean;
}

export interface MenuCategory {
  id: string;
  /** URL segment. Required — every category needs one, and this file is the
   *  only place categories are constructed. */
  slug: string;
  name: string;
  imageUrl: string;
}

const IMG = "/images/storefront";

const CATEGORIES: readonly MenuCategory[] = [
  { id: "cat-main", slug: "main", name: "الأطباق الرئيسية", imageUrl: `${IMG}/cat-mains.webp` },
  { id: "cat-breakfast", slug: "breakfast", name: "الإفطار", imageUrl: `${IMG}/cat-breakfast.webp` },
  { id: "cat-lunch", slug: "lunch", name: "الغداء", imageUrl: `${IMG}/dish-3.webp` },
  { id: "cat-desserts", slug: "desserts", name: "الحلويات", imageUrl: `${IMG}/cat-desserts.webp` },
  { id: "cat-drinks", slug: "drinks", name: "المشروبات", imageUrl: `${IMG}/cat-drinks.webp` },
];

// Reading order of the chip rail, from the start edge. Only eight photographs
// exist, so chips repeat them; the repetition is deliberate and visible rather
// than invented variety.
const MENU_GROUPS: readonly MenuGroup[] = [
  { id: "all", imageUrl: `${IMG}/cat-mains.webp` },
  { id: "chicken", imageUrl: `${IMG}/dish-1.webp` },
  { id: "meat", imageUrl: `${IMG}/dish-3.webp` },
  { id: "burger", imageUrl: `${IMG}/dish-1.webp` },
  { id: "pizza", imageUrl: `${IMG}/cat-desserts.webp` },
  { id: "sides", imageUrl: `${IMG}/cat-breakfast.webp` },
  { id: "appetizers", imageUrl: `${IMG}/cat-mains.webp` },
  { id: "salads", imageUrl: `${IMG}/cat-drinks.webp` },
];

const ALL_CHANNELS: OrderChannel[] = ["delivery", "takeaway", "dine_in"];

// Item ids are load-bearing: the cart persists `menuItemId` in localStorage, so
// renaming one orphans a live cart. Existing ids are kept as they are.
const ITEMS: readonly MenuItem[] = [
  {
    id: "item-classic-chicken-burger",
    categoryId: "cat-main",
    name: "برجر دجاج كلاسيك",
    description:
      "قطعة دجاج مقرمشة وذهبية، تعلوها جبنة ذائبة وخس طازج مع صوص كلاسيك غني داخل خبز بريوش طري.",
    priceSar: 153,
    compareAtPriceSar: 170,
    imageUrl: `${IMG}/dish-1.webp`,
    images: [`${IMG}/dish-1.webp`, `${IMG}/dish-1.webp`, `${IMG}/dish-1.webp`],
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.5,
    calories: 900,
    allergens: ["gluten", "dairy", "eggs"],
    badges: ["best_seller", "offer"],
    group: "burger",
    dietary: ["spicy"],
    modifierGroups: [
      {
        id: "grp-size", label: "إختر الحجم", required: true, multiple: false, display: "pills",
        options: [
          { id: "opt-size-small", label: "صغير", priceDeltaSar: 0 },
          { id: "opt-size-medium", label: "متوسط", priceDeltaSar: 15 },
          { id: "opt-size-large", label: "كبير", priceDeltaSar: 30 },
          { id: "opt-size-family", label: "عائلي", priceDeltaSar: 55 },
        ],
      },
      {
        id: "grp-bread", label: "نوع الخبز", required: true, multiple: false, display: "pills",
        options: [
          { id: "opt-bread-white", label: "خبز ابيض", priceDeltaSar: 0 },
          { id: "opt-bread-brown", label: "خبز اسمر", priceDeltaSar: 0 },
          { id: "opt-bread-none", label: "بدون خبز", priceDeltaSar: 0 },
        ],
      },
      {
        id: "grp-spice", label: "مستوى التوابل", required: true, multiple: false, display: "pills",
        options: [
          { id: "opt-spice-hot", label: "حار", priceDeltaSar: 0 },
          { id: "opt-spice-medium", label: "متوسط", priceDeltaSar: 0 },
          { id: "opt-spice-plain", label: "عادي", priceDeltaSar: 0 },
        ],
      },
      {
        id: "grp-extras", label: "الإضافات", required: false, multiple: true, display: "accordion",
        options: [
          { id: "opt-extra-cheese", label: "جبنة إضافية", priceDeltaSar: 12 },
          { id: "opt-extra-bacon", label: "بيكون", priceDeltaSar: 18 },
          { id: "opt-extra-spicy", label: "صلصة حارة", priceDeltaSar: 5 },
        ],
      },
      {
        id: "grp-doneness", label: "مستوى الطهي", required: false, multiple: false, display: "accordion",
        options: [
          { id: "opt-done-medium", label: "وسط", priceDeltaSar: 0 },
          { id: "opt-done-well", label: "ناضج تماماً", priceDeltaSar: 0 },
        ],
      },
    ],
  },
  {
    id: "item-mashawi-table",
    categoryId: "cat-main",
    name: "طبق مشاوي على الطاولة",
    description: "تشكيلة مشاوي مشوية على الفحم تُقدم طازجة داخل المطعم فقط.",
    priceSar: 210,
    imageUrl: `${IMG}/dish-3.webp`,
    available: true,
    // The one deliberate stock-out, so the «متوفر» filter is demonstrably doing
    // something rather than matching everything.
    inStock: false,
    availableFor: ["dine_in"],
    rating: 4.7,
    calories: 1250,
    allergens: [],
    group: "meat",
    modifierGroups: [],
  },
  {
    id: "item-beef-burger",
    categoryId: "cat-main",
    name: "برجر لحم بقري",
    description: "قطعة لحم بقري مشوية مع جبنة شيدر وصلصة باربكيو داخل خبز محمّص.",
    priceSar: 168,
    compareAtPriceSar: 195,
    imageUrl: `${IMG}/dish-1.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.6,
    calories: 980,
    allergens: ["gluten", "dairy"],
    badges: ["best_seller"],
    group: "burger",
    modifierGroups: [],
  },
  {
    id: "item-grilled-chicken-platter",
    categoryId: "cat-main",
    name: "طبق دجاج مشوي",
    description: "صدر دجاج مشوي مع أرز وخضار مشكلة وصلصة الأعشاب.",
    priceSar: 145,
    imageUrl: `${IMG}/cat-mains.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.4,
    calories: 720,
    allergens: ["dairy"],
    group: "chicken",
    dietary: ["healthy"],
    modifierGroups: [],
  },
  {
    id: "item-shawarma-plate",
    categoryId: "cat-main",
    name: "طبق شاورما دجاج",
    description: "شاورما دجاج متبلة تُقدم مع أرز وثوم وبطاطس مقلية.",
    priceSar: 132,
    compareAtPriceSar: 150,
    imageUrl: `${IMG}/cat-mains.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.3,
    calories: 810,
    allergens: ["gluten", "dairy"],
    badges: ["offer"],
    group: "chicken",
    modifierGroups: [],
  },
  {
    id: "item-margherita-pizza",
    categoryId: "cat-main",
    name: "بيتزا مارجريتا",
    description: "عجينة رقيقة مع صلصة طماطم وجبنة موزاريلا وريحان طازج.",
    priceSar: 96,
    compareAtPriceSar: 120,
    imageUrl: `${IMG}/cat-desserts.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.2,
    calories: 690,
    allergens: ["gluten", "dairy"],
    badges: ["offer"],
    group: "pizza",
    dietary: ["vegetarian"],
    modifierGroups: [],
  },
  {
    id: "item-pepperoni-pizza",
    categoryId: "cat-main",
    name: "بيتزا بيبروني",
    description: "شرائح بيبروني حارة فوق طبقة سخية من الموزاريلا الذائبة.",
    priceSar: 112,
    imageUrl: `${IMG}/cat-desserts.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.5,
    calories: 880,
    allergens: ["gluten", "dairy"],
    badges: ["best_seller"],
    group: "pizza",
    dietary: ["spicy"],
    modifierGroups: [],
  },
  {
    id: "item-loaded-fries",
    categoryId: "cat-main",
    name: "بطاطس محمّلة بالجبن",
    description: "بطاطس مقرمشة تعلوها جبنة ذائبة وصلصة الثوم والبقدونس.",
    priceSar: 38,
    compareAtPriceSar: 48,
    imageUrl: `${IMG}/cat-breakfast.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.1,
    calories: 560,
    allergens: ["dairy"],
    badges: ["offer"],
    group: "sides",
    dietary: ["vegetarian"],
    modifierGroups: [],
  },
  {
    id: "item-mozzarella-sticks",
    categoryId: "cat-main",
    name: "أصابع الموزاريلا",
    description: "أصابع جبنة موزاريلا مقرمشة تُقدم مع صلصة المارينارا.",
    priceSar: 44,
    imageUrl: `${IMG}/cat-mains.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.3,
    calories: 430,
    allergens: ["gluten", "dairy"],
    group: "appetizers",
    dietary: ["vegetarian"],
    modifierGroups: [],
  },

  {
    id: "item-shakshuka",
    categoryId: "cat-breakfast",
    name: "شكشوكة",
    description: "بيض مطهو مع صلصة الطماطم والفلفل والبهارات الشرقية.",
    priceSar: 68,
    imageUrl: `${IMG}/cat-breakfast.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.4,
    calories: 380,
    allergens: ["eggs"],
    group: "sides",
    dietary: ["vegetarian"],
    modifierGroups: [],
  },
  {
    id: "item-foul-medames",
    categoryId: "cat-breakfast",
    name: "فول مدمس",
    description: "فول مدمس بزيت الزيتون والكمون يُقدم مع خبز طازج.",
    priceSar: 45,
    imageUrl: `${IMG}/cat-breakfast.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.2,
    calories: 320,
    allergens: ["gluten"],
    group: "sides",
    dietary: ["vegetarian", "vegan", "healthy"],
    modifierGroups: [],
  },
  {
    id: "item-breakfast-platter",
    categoryId: "cat-breakfast",
    name: "طبق فطور شرقي",
    description: "تشكيلة فطور شرقي مع جبنة وزيتون وعسل ومربى وخبز ساخن.",
    priceSar: 89,
    compareAtPriceSar: 105,
    imageUrl: `${IMG}/cat-breakfast.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.5,
    calories: 640,
    allergens: ["gluten", "dairy"],
    badges: ["offer"],
    group: "sides",
    dietary: ["vegetarian"],
    modifierGroups: [],
  },
  {
    id: "item-pancakes",
    categoryId: "cat-breakfast",
    name: "بان كيك",
    description: "بان كيك طري يُقدم مع شراب القيقب والفواكه الطازجة.",
    priceSar: 58,
    imageUrl: `${IMG}/cat-breakfast.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.6,
    calories: 520,
    allergens: ["gluten", "dairy", "eggs"],
    badges: ["best_seller"],
    group: "sides",
    dietary: ["vegetarian"],
    modifierGroups: [],
  },

  {
    id: "item-kabsa",
    categoryId: "cat-lunch",
    name: "كبسة دجاج",
    description: "أرز بسمتي متبل مع دجاج مشوي وبهارات كبسة أصلية.",
    priceSar: 98,
    compareAtPriceSar: 115,
    imageUrl: `${IMG}/cat-mains.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.7,
    calories: 850,
    allergens: [],
    badges: ["best_seller", "offer"],
    group: "chicken",
    modifierGroups: [],
  },
  {
    id: "item-mandi",
    categoryId: "cat-lunch",
    name: "مندي لحم",
    description: "لحم ضأن طري مطهو على الطريقة اليمنية مع أرز مندي ومكسرات.",
    priceSar: 125,
    imageUrl: `${IMG}/dish-3.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.8,
    calories: 980,
    allergens: ["nuts"],
    badges: ["best_seller"],
    group: "meat",
    modifierGroups: [],
  },
  {
    id: "item-grilled-fish",
    categoryId: "cat-lunch",
    name: "سمك مشوي",
    description: "سمك طازج مشوي مع أرز وسلطة خضراء وليمون.",
    priceSar: 138,
    imageUrl: `${IMG}/dish-3.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.4,
    calories: 610,
    allergens: ["seafood"],
    group: "meat",
    dietary: ["healthy"],
    modifierGroups: [],
  },
  {
    id: "item-caesar-salad",
    categoryId: "cat-lunch",
    name: "سلطة سيزر",
    description: "خس روماني مقرمش مع صلصة سيزر وجبنة بارميزان وقطع خبز محمّص.",
    priceSar: 55,
    compareAtPriceSar: 68,
    imageUrl: `${IMG}/cat-drinks.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.2,
    calories: 340,
    allergens: ["gluten", "dairy", "eggs"],
    badges: ["offer"],
    group: "salads",
    dietary: ["healthy"],
    modifierGroups: [],
  },
  {
    id: "item-fattoush",
    categoryId: "cat-lunch",
    name: "فتوش",
    description: "خضار طازجة مقطعة مع خبز مقرمش ودبس الرمان وزيت الزيتون.",
    priceSar: 42,
    imageUrl: `${IMG}/cat-drinks.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.3,
    calories: 260,
    allergens: ["gluten"],
    group: "salads",
    dietary: ["vegetarian", "vegan", "healthy"],
    modifierGroups: [],
  },

  {
    id: "item-molten-cake",
    categoryId: "cat-desserts",
    name: "كيك مناسبات مخصوص",
    description:
      "كيك إسفنجي محضّر حسب اختيارك، مناسب لأعياد الميلاد والمناسبات الخاصة ويتم تجهيزه بناءً على رغبتك في الطلب.",
    priceSar: 153,
    // Priced per size on request, so there is no single "was" price to strike
    // through — the card says «السعر يبدأ من» instead.
    priceFrom: true,
    imageUrl: `${IMG}/dish-2.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.6,
    calories: 480,
    allergens: ["gluten", "dairy", "eggs"],
    badges: ["best_seller"],
    modifierGroups: [],
  },
  {
    id: "item-kunafa",
    categoryId: "cat-desserts",
    name: "كنافة نابلسية",
    description: "كنافة ساخنة بجبنة طرية وقطر عربي وفستق حلبي.",
    priceSar: 38,
    compareAtPriceSar: 45,
    imageUrl: `${IMG}/cat-desserts.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.7,
    calories: 420,
    allergens: ["gluten", "dairy", "nuts"],
    badges: ["offer"],
    modifierGroups: [],
  },
  {
    id: "item-umm-ali",
    categoryId: "cat-desserts",
    name: "أم علي",
    description: "حلا مصري ساخن بالحليب والمكسرات والقشطة.",
    priceSar: 35,
    imageUrl: `${IMG}/cat-desserts.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.5,
    calories: 390,
    allergens: ["gluten", "dairy", "nuts"],
    modifierGroups: [],
  },

  {
    id: "item-fresh-juice",
    categoryId: "cat-drinks",
    name: "عصير فواكه طازج",
    description: "عصير طبيعي معصور طازجاً من فواكه الموسم.",
    priceSar: 22,
    imageUrl: `${IMG}/cat-drinks.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.4,
    calories: 140,
    allergens: [],
    dietary: ["vegan", "vegetarian", "healthy"],
    modifierGroups: [],
  },
  {
    id: "item-arabic-coffee",
    categoryId: "cat-drinks",
    name: "قهوة عربية",
    description: "قهوة عربية أصيلة بالهيل تُقدم مع التمر.",
    priceSar: 18,
    imageUrl: `${IMG}/cat-drinks.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.6,
    calories: 15,
    allergens: [],
    dietary: ["vegan", "vegetarian"],
    modifierGroups: [],
  },
  {
    id: "item-soft-drink",
    categoryId: "cat-drinks",
    name: "مشروب غازي",
    description: "مشروب غازي بارد بعدة نكهات.",
    priceSar: 12,
    imageUrl: `${IMG}/cat-drinks.webp`,
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4,
    calories: 180,
    allergens: [],
    modifierGroups: [],
  },
];

export function getMenuForTenant(tenantId: string): { categories: MenuCategory[]; items: MenuItem[] } {
  void tenantId;
  return { categories: [...CATEGORIES], items: [...ITEMS] };
}

export function getMenuGroups(): MenuGroup[] {
  return [...MENU_GROUPS];
}
