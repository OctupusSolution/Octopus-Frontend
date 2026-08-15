import type { OrderChannel } from "./order";

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
}

export interface MenuCategory {
  id: string;
  name: string;
  imageUrl: string;
}

const CATEGORIES: readonly MenuCategory[] = [
  { id: "cat-main", name: "الأطباق الرئيسية", imageUrl: "/images/categories/main.jpg" },
  { id: "cat-breakfast", name: "الإفطار", imageUrl: "/images/categories/breakfast.jpg" },
  { id: "cat-lunch", name: "الغداء", imageUrl: "/images/categories/lunch.jpg" },
  { id: "cat-desserts", name: "الحلويات", imageUrl: "/images/categories/desserts.jpg" },
  { id: "cat-drinks", name: "المشروبات", imageUrl: "/images/categories/drinks.jpg" },
];

const ALL_CHANNELS: OrderChannel[] = ["delivery", "takeaway", "dine_in"];

const ITEMS: readonly MenuItem[] = [
  {
    id: "item-classic-chicken-burger",
    categoryId: "cat-main",
    name: "برجر دجاج كلاسيك",
    description: "قطعة دجاج مقرمشة مع خس وطماطم وصلصة خاصة في خبز طازج.",
    priceSar: 153,
    imageUrl: "/images/menu/burger-01.jpg",
    available: true,
    availableFor: ["delivery", "takeaway", "dine_in"],
    modifierGroups: [
      {
        id: "grp-size",
        label: "الحجم",
        required: true,
        multiple: false,
        options: [
          { id: "opt-size-small", label: "صغير", priceDeltaSar: 0 },
          { id: "opt-size-medium", label: "وسط", priceDeltaSar: 15 },
          { id: "opt-size-large", label: "كبير", priceDeltaSar: 30 },
        ],
      },
      {
        id: "grp-bread",
        label: "نوع الخبز",
        required: true,
        multiple: false,
        options: [
          { id: "opt-bread-white", label: "أبيض", priceDeltaSar: 0 },
          { id: "opt-bread-brown", label: "أسمر", priceDeltaSar: 0 },
          { id: "opt-bread-sesame", label: "سمسم", priceDeltaSar: 0 },
        ],
      },
      {
        id: "grp-extras",
        label: "الإضافات",
        required: false,
        multiple: true,
        options: [
          { id: "opt-extra-cheese", label: "جبنة إضافية", priceDeltaSar: 12 },
          { id: "opt-extra-bacon", label: "بيكون", priceDeltaSar: 18 },
          { id: "opt-extra-spicy", label: "صلصة حارة", priceDeltaSar: 5 },
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
    imageUrl: "/images/menu/mashawi-01.jpg",
    available: true,
    availableFor: ["dine_in"],
    modifierGroups: [],
  },
  {
    id: "item-beef-burger",
    categoryId: "cat-main",
    name: "برجر لحم بقري",
    description: "قطعة لحم بقري مشوية مع جبنة شيدر وصلصة باربكيو.",
    priceSar: 168,
    imageUrl: "/images/menu/burger-02.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
  {
    id: "item-grilled-chicken-platter",
    categoryId: "cat-main",
    name: "طبق دجاج مشوي",
    description: "صدر دجاج مشوي مع أرز وخضار مشكلة.",
    priceSar: 145,
    imageUrl: "/images/menu/platter-01.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
  {
    id: "item-shawarma-plate",
    categoryId: "cat-main",
    name: "طبق شاورما دجاج",
    description: "شاورما دجاج متبلة تُقدم مع أرز وثوم وبطاطس.",
    priceSar: 132,
    imageUrl: "/images/menu/platter-02.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
  {
    id: "item-shakshuka",
    categoryId: "cat-breakfast",
    name: "شكشوكة",
    description: "بيض مطهو مع صلصة الطماطم والفلفل والبهارات.",
    priceSar: 68,
    imageUrl: "/images/menu/breakfast-01.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
  {
    id: "item-foul-medames",
    categoryId: "cat-breakfast",
    name: "فول مدمس",
    description: "فول مدمس بزيت الزيتون والكمون يُقدم مع خبز طازج.",
    priceSar: 45,
    imageUrl: "/images/menu/breakfast-02.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
  {
    id: "item-breakfast-platter",
    categoryId: "cat-breakfast",
    name: "طبق فطور شرقي",
    description: "تشكيلة فطور شرقي مع جبنة وزيتون وعسل ومربى.",
    priceSar: 89,
    imageUrl: "/images/menu/breakfast-03.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
  {
    id: "item-pancakes",
    categoryId: "cat-breakfast",
    name: "بان كيك",
    description: "بان كيك طري يُقدم مع شراب القيقب والفواكه الطازجة.",
    priceSar: 58,
    imageUrl: "/images/menu/breakfast-04.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
  {
    id: "item-kabsa",
    categoryId: "cat-lunch",
    name: "كبسة دجاج",
    description: "أرز بسمتي متبل مع دجاج مشوي وبهارات كبسة أصلية.",
    priceSar: 98,
    imageUrl: "/images/menu/lunch-01.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
  {
    id: "item-mandi",
    categoryId: "cat-lunch",
    name: "مندي لحم",
    description: "لحم ضأن طري مطهو على الطريقة اليمنية مع أرز مندي.",
    priceSar: 125,
    imageUrl: "/images/menu/lunch-02.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
  {
    id: "item-grilled-fish",
    categoryId: "cat-lunch",
    name: "سمك مشوي",
    description: "سمك طازج مشوي مع أرز وسلطة خضراء.",
    priceSar: 138,
    imageUrl: "/images/menu/lunch-03.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
  {
    id: "item-molten-cake",
    categoryId: "cat-desserts",
    name: "كيك الشوكولاتة الذائب",
    description: "كيك شوكولاتة دافئ بحشوة ذائبة يُقدم مع آيس كريم الفانيليا.",
    priceSar: 42,
    imageUrl: "/images/menu/dessert-01.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
  {
    id: "item-kunafa",
    categoryId: "cat-desserts",
    name: "كنافة نابلسية",
    description: "كنافة ساخنة بجبنة طرية وقطر عربي.",
    priceSar: 38,
    imageUrl: "/images/menu/dessert-02.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
  {
    id: "item-umm-ali",
    categoryId: "cat-desserts",
    name: "أم علي",
    description: "حلا مصري ساخن بالحليب والمكسرات والقشطة.",
    priceSar: 35,
    imageUrl: "/images/menu/dessert-03.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
  {
    id: "item-fresh-juice",
    categoryId: "cat-drinks",
    name: "عصير فواكه طازج",
    description: "عصير طبيعي معصور طازجاً من فواكه الموسم.",
    priceSar: 22,
    imageUrl: "/images/menu/drink-01.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
  {
    id: "item-arabic-coffee",
    categoryId: "cat-drinks",
    name: "قهوة عربية",
    description: "قهوة عربية أصيلة تُقدم مع التمر.",
    priceSar: 18,
    imageUrl: "/images/menu/drink-02.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
  {
    id: "item-soft-drink",
    categoryId: "cat-drinks",
    name: "مشروب غازي",
    description: "مشروب غازي بارد بعدة نكهات.",
    priceSar: 12,
    imageUrl: "/images/menu/drink-03.jpg",
    available: true,
    availableFor: ALL_CHANNELS,
    modifierGroups: [],
  },
];

export function getMenuForTenant(tenantId: string): { categories: MenuCategory[]; items: MenuItem[] } {
  void tenantId;
  return { categories: [...CATEGORIES], items: [...ITEMS] };
}
