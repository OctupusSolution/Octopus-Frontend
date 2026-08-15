// Mock data for the Merchant Menu module (6 pages: Items, Modifiers, Combos,
// Pricing, Schedules, Availability). Stands in for @octopus/api-client until
// the backend publishes a real OpenAPI spec. Shapes mirror what real
// `useMenuItems()` / `useModifierGroups()` / `useCombos()` / `usePriceLists()`
// / `useMenuSchedules()` / `useAvailabilityBoard()` queries would return, so
// swapping these for TanStack Query hooks later is a drop-in change.
//
// Derived numbers (margins, KPI totals, revenue share, counters) are computed
// from the raw rows below rather than hand-typed, so the dataset stays
// internally consistent by construction.

import type { KpiCard } from "@/shared/api/mock-dashboard";

/* -------------------------------------------------------------------- shared */

export const branches = [
  "Riyadh - Olaya",
  "Riyadh - Narjis",
  "Jeddah - Corniche",
  "Dammam - Corniche",
  "Khobar - Rakah",
] as const;
export type Branch = (typeof branches)[number];

/* -------------------------------------------------------------- Categories */

export type MenuCategoryId =
  | "all"
  | "appetizers"
  | "main-courses"
  | "grills"
  | "beverages"
  | "desserts"
  | "combos";

export interface MenuCategoryOption {
  id: MenuCategoryId;
  label: string;
}

export const menuCategories: readonly MenuCategoryOption[] = [
  { id: "all", label: "All" },
  { id: "appetizers", label: "Appetizers" },
  { id: "main-courses", label: "Main Courses" },
  { id: "grills", label: "Grills" },
  { id: "beverages", label: "Beverages" },
  { id: "desserts", label: "Desserts" },
  { id: "combos", label: "Combos" },
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  appetizers: "Appetizers",
  "main-courses": "Main Courses",
  grills: "Grills",
  beverages: "Beverages",
  desserts: "Desserts",
  combos: "Combos",
};

/* -------------------------------------------------------------------- Items */

export type MenuItemStatus = "Available" | "86'd" | "Scheduled" | "Draft";
export type MenuChannel = "Dine-in" | "Delivery" | "Takeaway" | "Kiosk" | "Aggregator";

interface RawMenuItem {
  id: string;
  nameEn: string;
  nameAr: string;
  category: string;
  price: number;
  cost: number;
  modifiers: number;
  channels: MenuChannel[];
  status: MenuItemStatus;
}

export interface MenuItemRow extends RawMenuItem {
  categoryLabel: string;
  marginPct: number;
}

const RAW_ITEMS: readonly RawMenuItem[] = [
  { id: "itm-001", nameEn: "Chicken Shawarma", nameAr: "شاورما دجاج", category: "main-courses", price: 22, cost: 9, modifiers: 4, channels: ["Dine-in", "Delivery", "Takeaway"], status: "Available" },
  { id: "itm-002", nameEn: "Lamb Mandi", nameAr: "مندي لحم", category: "main-courses", price: 58, cost: 26, modifiers: 3, channels: ["Dine-in", "Delivery", "Takeaway"], status: "Available" },
  { id: "itm-003", nameEn: "Grilled Kabsa Chicken", nameAr: "كبسة دجاج مشوي", category: "main-courses", price: 42, cost: 18, modifiers: 3, channels: ["Dine-in", "Delivery"], status: "Available" },
  { id: "itm-004", nameEn: "Chicken Machboos", nameAr: "مجبوس دجاج", category: "main-courses", price: 38, cost: 17, modifiers: 2, channels: ["Dine-in", "Delivery", "Takeaway"], status: "Available" },
  { id: "itm-005", nameEn: "Lamb Kabsa", nameAr: "كبسة لحم", category: "main-courses", price: 62, cost: 30, modifiers: 3, channels: ["Dine-in", "Delivery"], status: "Available" },
  { id: "itm-006", nameEn: "Chicken Biryani", nameAr: "برياني دجاج", category: "main-courses", price: 34, cost: 15, modifiers: 2, channels: ["Dine-in", "Delivery", "Takeaway", "Aggregator"], status: "Available" },
  { id: "itm-007", nameEn: "Molokhia with Chicken", nameAr: "ملوخية بالدجاج", category: "main-courses", price: 36, cost: 16, modifiers: 1, channels: ["Dine-in"], status: "Draft" },
  { id: "itm-008", nameEn: "Grilled Hammour", nameAr: "هامور مشوي", category: "main-courses", price: 88, cost: 58, modifiers: 2, channels: ["Dine-in", "Delivery"], status: "86'd" },
  { id: "itm-009", nameEn: "Saleeg", nameAr: "صليق", category: "main-courses", price: 40, cost: 19, modifiers: 2, channels: ["Dine-in", "Takeaway"], status: "Available" },

  { id: "itm-010", nameEn: "Hummus", nameAr: "حمص", category: "appetizers", price: 14, cost: 4.5, modifiers: 2, channels: ["Dine-in", "Takeaway", "Delivery"], status: "Available" },
  { id: "itm-011", nameEn: "Fattoush Salad", nameAr: "سلطة فتوش", category: "appetizers", price: 17, cost: 6, modifiers: 2, channels: ["Dine-in", "Takeaway", "Delivery"], status: "Available" },
  { id: "itm-012", nameEn: "Chicken Wings", nameAr: "أجنحة دجاج", category: "appetizers", price: 26, cost: 11, modifiers: 3, channels: ["Dine-in", "Delivery", "Takeaway"], status: "Available" },
  { id: "itm-013", nameEn: "Moutabal", nameAr: "متبل", category: "appetizers", price: 15, cost: 5, modifiers: 1, channels: ["Dine-in", "Takeaway"], status: "Available" },
  { id: "itm-014", nameEn: "Sambousek", nameAr: "سمبوسة", category: "appetizers", price: 18, cost: 6.5, modifiers: 1, channels: ["Dine-in", "Delivery", "Takeaway"], status: "Available" },
  { id: "itm-015", nameEn: "Warak Enab", nameAr: "ورق عنب", category: "appetizers", price: 22, cost: 9, modifiers: 0, channels: ["Dine-in", "Takeaway"], status: "Scheduled" },
  { id: "itm-016", nameEn: "Kibbeh", nameAr: "كبة", category: "appetizers", price: 24, cost: 10, modifiers: 1, channels: ["Dine-in", "Delivery"], status: "Available" },

  { id: "itm-017", nameEn: "Mixed Grill", nameAr: "مشاوي مشكلة", category: "grills", price: 74, cost: 34, modifiers: 5, channels: ["Dine-in", "Delivery"], status: "Available" },
  { id: "itm-018", nameEn: "Lamb Chops", nameAr: "ريش غنم", category: "grills", price: 96, cost: 62, modifiers: 4, channels: ["Dine-in"], status: "86'd" },
  { id: "itm-019", nameEn: "Chicken Tikka", nameAr: "تكة دجاج", category: "grills", price: 46, cost: 21, modifiers: 4, channels: ["Dine-in", "Delivery", "Takeaway"], status: "Available" },
  { id: "itm-020", nameEn: "Shish Tawook", nameAr: "شيش طاووق", category: "grills", price: 44, cost: 20, modifiers: 4, channels: ["Dine-in", "Delivery", "Takeaway"], status: "Available" },
  { id: "itm-021", nameEn: "Kofta Kebab", nameAr: "كباب كفتة", category: "grills", price: 48, cost: 23, modifiers: 3, channels: ["Dine-in", "Delivery"], status: "86'd" },
  { id: "itm-022", nameEn: "Lamb Kebab", nameAr: "كباب لحم", category: "grills", price: 68, cost: 34, modifiers: 3, channels: ["Dine-in", "Delivery"], status: "Available" },
  { id: "itm-023", nameEn: "Grilled Chicken Half", nameAr: "نصف دجاجة مشوية", category: "grills", price: 39, cost: 17, modifiers: 3, channels: ["Dine-in", "Delivery", "Takeaway", "Kiosk"], status: "Available" },

  { id: "itm-024", nameEn: "Saudi Coffee", nameAr: "قهوة سعودية", category: "beverages", price: 12, cost: 3, modifiers: 0, channels: ["Dine-in", "Takeaway"], status: "Available" },
  { id: "itm-025", nameEn: "Fresh Mint Lemonade", nameAr: "ليمون بالنعناع", category: "beverages", price: 13, cost: 3.5, modifiers: 1, channels: ["Dine-in", "Takeaway", "Delivery"], status: "Available" },
  { id: "itm-026", nameEn: "Karak Tea", nameAr: "شاي كرك", category: "beverages", price: 10, cost: 2.2, modifiers: 0, channels: ["Dine-in", "Takeaway"], status: "Available" },
  { id: "itm-027", nameEn: "Laban", nameAr: "لبن", category: "beverages", price: 9, cost: 2.5, modifiers: 0, channels: ["Dine-in", "Takeaway", "Delivery"], status: "Available" },
  { id: "itm-028", nameEn: "Fresh Orange Juice", nameAr: "عصير برتقال طازج", category: "beverages", price: 16, cost: 5, modifiers: 0, channels: ["Dine-in", "Takeaway"], status: "Available" },
  { id: "itm-029", nameEn: "Soft Drink Can", nameAr: "مشروب غازي", category: "beverages", price: 8, cost: 2.8, modifiers: 0, channels: ["Dine-in", "Takeaway", "Delivery", "Kiosk"], status: "Available" },

  { id: "itm-030", nameEn: "Kunafa", nameAr: "كنافة", category: "desserts", price: 19, cost: 7, modifiers: 1, channels: ["Dine-in", "Takeaway", "Delivery"], status: "Scheduled" },
  { id: "itm-031", nameEn: "Umm Ali", nameAr: "أم علي", category: "desserts", price: 21, cost: 8, modifiers: 0, channels: ["Dine-in", "Delivery"], status: "86'd" },
  { id: "itm-032", nameEn: "Basbousa", nameAr: "بسبوسة", category: "desserts", price: 16, cost: 5.5, modifiers: 0, channels: ["Dine-in", "Takeaway"], status: "Available" },
  { id: "itm-033", nameEn: "Luqaimat", nameAr: "لقيمات", category: "desserts", price: 18, cost: 6, modifiers: 0, channels: ["Dine-in", "Takeaway", "Delivery"], status: "Scheduled" },
  { id: "itm-034", nameEn: "Muhalabia", nameAr: "مهلبية", category: "desserts", price: 14, cost: 4.5, modifiers: 0, channels: ["Dine-in", "Takeaway"], status: "Available" },

  { id: "itm-035", nameEn: "Family Feast", nameAr: "وجبة العائلة", category: "combos", price: 149, cost: 66, modifiers: 2, channels: ["Dine-in", "Delivery", "Takeaway"], status: "Available" },
  { id: "itm-036", nameEn: "Grill Duo Meal", nameAr: "وجبة المشاوي الثنائية", category: "combos", price: 89, cost: 40, modifiers: 2, channels: ["Dine-in", "Delivery"], status: "Draft" },
] as const;

export const menuItems: readonly MenuItemRow[] = RAW_ITEMS.map((item) => ({
  ...item,
  categoryLabel: CATEGORY_LABEL[item.category] ?? item.category,
  marginPct: Math.round(((item.price - item.cost) / item.price) * 1000) / 10,
}));

// Category list for the /menu/items left rail, with live item counts.
export const menuCategoryCounts: readonly { id: string; label: string; count: number }[] =
  Object.keys(CATEGORY_LABEL).map((id) => ({
    id,
    label: CATEGORY_LABEL[id],
    count: menuItems.filter((item) => item.category === id).length,
  }));

/* ------------------------------------------------------------------ KPI row */

const activeItemCount = menuItems.filter((i) => i.status === "Available").length;
const unavailableItemCount = menuItems.filter((i) => i.status === "86'd").length;
const avgItemPrice = menuItems.reduce((sum, i) => sum + i.price, 0) / menuItems.length;

export const menuStats: readonly KpiCard[] = [
  {
    id: "total-items",
    label: "TOTAL ITEMS",
    value: String(menuItems.length),
    delta: "+4.1%",
    deltaNote: "vs last month",
    color: "#a78bfa",
    sparkline: [30, 32, 31, 34, 33, 36, 35, 38, 37, 40, 39, 42, 41, 44, 43, 46],
  },
  {
    id: "active-items",
    label: "ACTIVE ITEMS",
    value: String(activeItemCount),
    delta: "+3.2%",
    deltaNote: "vs last month",
    color: "#60a5fa",
    sparkline: [28, 30, 29, 32, 31, 34, 33, 36, 35, 38, 37, 39, 38, 41, 40, 43],
  },
  {
    id: "unavailable-items",
    label: "UNAVAILABLE (86'D)",
    value: String(unavailableItemCount),
    delta: "-1.8%",
    deltaNote: "vs last month",
    color: "#fb923c",
    sparkline: [20, 19, 21, 18, 20, 17, 19, 16, 18, 15, 17, 14, 16, 13, 15, 13],
  },
  {
    id: "avg-item-price",
    label: "AVG ITEM PRICE",
    value: `SAR ${avgItemPrice.toFixed(2)}`,
    delta: "+2.4%",
    deltaNote: "vs last month",
    color: "#a3e635",
    sparkline: [24, 25, 24, 26, 25, 27, 26, 28, 27, 29, 28, 30, 29, 31, 30, 32],
  },
] as const;

/* --------------------------------------------------------------- Modifiers */

export type ModifierSelectionRule = "Single choice" | "Multiple choice";

export interface ModifierOption {
  id: string;
  nameEn: string;
  nameAr: string;
  /** null = "Free" */
  priceDelta: number | null;
  isDefault: boolean;
  available: boolean;
  linkedItemsCount: number;
}

export interface ModifierGroup {
  id: string;
  nameEn: string;
  nameAr: string;
  selectionRule: ModifierSelectionRule;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
  appliedItemNames: string[];
}

export const modifierGroups: readonly ModifierGroup[] = [
  {
    id: "mod-size",
    nameEn: "Size",
    nameAr: "الحجم",
    selectionRule: "Single choice",
    required: true,
    minSelect: 1,
    maxSelect: 1,
    options: [
      { id: "size-sm", nameEn: "Small", nameAr: "صغير", priceDelta: null, isDefault: true, available: true, linkedItemsCount: 21 },
      { id: "size-md", nameEn: "Medium", nameAr: "وسط", priceDelta: 5, isDefault: false, available: true, linkedItemsCount: 21 },
      { id: "size-lg", nameEn: "Large", nameAr: "كبير", priceDelta: 10, isDefault: false, available: true, linkedItemsCount: 21 },
    ],
    appliedItemNames: [
      "Chicken Shawarma", "Lamb Mandi", "Grilled Kabsa Chicken", "Chicken Machboos", "Lamb Kabsa",
      "Chicken Biryani", "Saleeg", "Mixed Grill", "Chicken Tikka", "Shish Tawook", "Kofta Kebab",
      "Lamb Kebab", "Grilled Chicken Half", "Saudi Coffee", "Fresh Mint Lemonade", "Karak Tea",
      "Laban", "Fresh Orange Juice", "Soft Drink Can", "Family Feast", "Grill Duo Meal",
    ],
  },
  {
    id: "mod-spice",
    nameEn: "Spice Level",
    nameAr: "درجة الحرارة",
    selectionRule: "Single choice",
    required: true,
    minSelect: 1,
    maxSelect: 1,
    options: [
      { id: "spice-mild", nameEn: "Mild", nameAr: "خفيف", priceDelta: null, isDefault: true, available: true, linkedItemsCount: 14 },
      { id: "spice-med", nameEn: "Medium", nameAr: "متوسط", priceDelta: null, isDefault: false, available: true, linkedItemsCount: 14 },
      { id: "spice-hot", nameEn: "Hot", nameAr: "حار", priceDelta: null, isDefault: false, available: true, linkedItemsCount: 14 },
    ],
    appliedItemNames: [
      "Mixed Grill", "Lamb Chops", "Chicken Tikka", "Shish Tawook", "Kofta Kebab", "Lamb Kebab",
      "Grilled Chicken Half", "Chicken Shawarma", "Lamb Mandi", "Grilled Kabsa Chicken",
      "Chicken Machboos", "Lamb Kabsa", "Chicken Biryani", "Grilled Hammour",
    ],
  },
  {
    id: "mod-addons",
    nameEn: "Add-ons",
    nameAr: "إضافات",
    selectionRule: "Multiple choice",
    required: false,
    minSelect: 0,
    maxSelect: 4,
    options: [
      { id: "addon-cheese", nameEn: "Extra Cheese", nameAr: "جبن إضافي", priceDelta: 6, isDefault: false, available: true, linkedItemsCount: 19 },
      { id: "addon-sauce", nameEn: "Extra Sauce", nameAr: "صوص إضافي", priceDelta: 3, isDefault: false, available: true, linkedItemsCount: 19 },
      { id: "addon-fries", nameEn: "Fries Side", nameAr: "بطاطس جانبية", priceDelta: 8, isDefault: false, available: true, linkedItemsCount: 19 },
      { id: "addon-meat", nameEn: "Extra Meat", nameAr: "لحم إضافي", priceDelta: 12, isDefault: false, available: false, linkedItemsCount: 19 },
    ],
    appliedItemNames: [
      "Chicken Shawarma", "Lamb Mandi", "Grilled Kabsa Chicken", "Chicken Machboos", "Lamb Kabsa",
      "Chicken Biryani", "Mixed Grill", "Chicken Tikka", "Shish Tawook", "Kofta Kebab", "Lamb Kebab",
      "Grilled Chicken Half", "Hummus", "Fattoush Salad", "Chicken Wings", "Sambousek", "Kibbeh",
      "Family Feast", "Grill Duo Meal",
    ],
  },
  {
    id: "mod-bread",
    nameEn: "Bread Choice",
    nameAr: "نوع الخبز",
    selectionRule: "Single choice",
    required: true,
    minSelect: 1,
    maxSelect: 1,
    options: [
      { id: "bread-white", nameEn: "White Bread", nameAr: "خبز أبيض", priceDelta: null, isDefault: true, available: true, linkedItemsCount: 6 },
      { id: "bread-saj", nameEn: "Saj Bread", nameAr: "خبز صاج", priceDelta: null, isDefault: false, available: true, linkedItemsCount: 6 },
    ],
    appliedItemNames: [
      "Chicken Shawarma", "Chicken Tikka", "Shish Tawook", "Kofta Kebab", "Lamb Kebab", "Grilled Chicken Half",
    ],
  },
  {
    id: "mod-sauce",
    nameEn: "Sauce",
    nameAr: "الصوص",
    selectionRule: "Multiple choice",
    required: false,
    minSelect: 0,
    maxSelect: 3,
    options: [
      { id: "sauce-garlic", nameEn: "Garlic Sauce", nameAr: "صوص ثوم", priceDelta: null, isDefault: true, available: true, linkedItemsCount: 12 },
      { id: "sauce-tahini", nameEn: "Tahini", nameAr: "طحينة", priceDelta: null, isDefault: false, available: true, linkedItemsCount: 12 },
      { id: "sauce-harissa", nameEn: "Spicy Harissa", nameAr: "هريسة حارة", priceDelta: 2, isDefault: false, available: true, linkedItemsCount: 12 },
    ],
    appliedItemNames: [
      "Mixed Grill", "Lamb Chops", "Chicken Tikka", "Shish Tawook", "Kofta Kebab", "Lamb Kebab",
      "Grilled Chicken Half", "Chicken Shawarma", "Hummus", "Moutabal", "Chicken Wings", "Family Feast",
    ],
  },
  {
    id: "mod-cooking",
    nameEn: "Cooking Preference",
    nameAr: "درجة الطهي",
    selectionRule: "Single choice",
    required: true,
    minSelect: 1,
    maxSelect: 1,
    options: [
      { id: "cook-welldone", nameEn: "Well Done", nameAr: "ناضج جيداً", priceDelta: null, isDefault: true, available: true, linkedItemsCount: 7 },
      { id: "cook-medium", nameEn: "Medium", nameAr: "متوسط النضج", priceDelta: null, isDefault: false, available: true, linkedItemsCount: 7 },
      { id: "cook-rare", nameEn: "Rare", nameAr: "قليل النضج", priceDelta: null, isDefault: false, available: true, linkedItemsCount: 7 },
    ],
    appliedItemNames: [
      "Lamb Chops", "Lamb Kebab", "Chicken Tikka", "Shish Tawook", "Kofta Kebab",
      "Grilled Chicken Half", "Mixed Grill",
    ],
  },
] as const;

/* ------------------------------------------------------------------- Combos */

export type ComboStatus = "Active" | "Inactive" | "Draft";

export interface ComboComponent {
  itemNameEn: string;
  qty: number;
}

interface RawCombo {
  id: string;
  nameEn: string;
  nameAr: string;
  components: ComboComponent[];
  individualTotal: number;
  comboPrice: number;
  cost: number;
  availabilityWindow: string;
  status: ComboStatus;
  unitsSoldMonth: number;
}

const RAW_COMBOS: readonly RawCombo[] = [
  { id: "cmb-01", nameEn: "Family Feast", nameAr: "وجبة العائلة", components: [{ itemNameEn: "Mixed Grill", qty: 1 }, { itemNameEn: "Soft Drink Can", qty: 2 }, { itemNameEn: "Hummus", qty: 1 }, { itemNameEn: "Kunafa", qty: 1 }], individualTotal: 123, comboPrice: 99, cost: 46, availabilityWindow: "All day", status: "Active", unitsSoldMonth: 420 },
  { id: "cmb-02", nameEn: "Grill Duo Meal", nameAr: "وجبة المشاوي الثنائية", components: [{ itemNameEn: "Chicken Tikka", qty: 1 }, { itemNameEn: "Shish Tawook", qty: 1 }, { itemNameEn: "Soft Drink Can", qty: 2 }], individualTotal: 106, comboPrice: 89, cost: 40, availabilityWindow: "12:00 PM – 11:00 PM", status: "Draft", unitsSoldMonth: 60 },
  { id: "cmb-03", nameEn: "Shawarma Duo", nameAr: "شاورما ثنائية", components: [{ itemNameEn: "Chicken Shawarma", qty: 2 }, { itemNameEn: "Fresh Mint Lemonade", qty: 1 }], individualTotal: 57, comboPrice: 48, cost: 22, availabilityWindow: "All day", status: "Active", unitsSoldMonth: 260 },
  { id: "cmb-04", nameEn: "Mandi Feast for 4", nameAr: "وجبة المندي العائلية", components: [{ itemNameEn: "Lamb Mandi", qty: 2 }, { itemNameEn: "Soft Drink Can", qty: 4 }, { itemNameEn: "Hummus", qty: 2 }], individualTotal: 176, comboPrice: 149, cost: 78, availabilityWindow: "All day", status: "Active", unitsSoldMonth: 140 },
  { id: "cmb-05", nameEn: "Breakfast Karak Combo", nameAr: "كومبو الفطور بالكرك", components: [{ itemNameEn: "Karak Tea", qty: 1 }, { itemNameEn: "Sambousek", qty: 1 }, { itemNameEn: "Basbousa", qty: 1 }], individualTotal: 44, comboPrice: 36, cost: 16, availabilityWindow: "7:00 AM – 11:00 AM", status: "Active", unitsSoldMonth: 300 },
  { id: "cmb-06", nameEn: "Lunch Kabsa Combo", nameAr: "كومبو كبسة الغداء", components: [{ itemNameEn: "Chicken Machboos", qty: 1 }, { itemNameEn: "Fattoush Salad", qty: 1 }, { itemNameEn: "Laban", qty: 1 }], individualTotal: 64, comboPrice: 54, cost: 27, availabilityWindow: "12:00 PM – 4:00 PM", status: "Active", unitsSoldMonth: 220 },
  { id: "cmb-07", nameEn: "Grill Trio", nameAr: "ثلاثية المشاوي", components: [{ itemNameEn: "Kofta Kebab", qty: 1 }, { itemNameEn: "Lamb Kebab", qty: 1 }, { itemNameEn: "Grilled Chicken Half", qty: 1 }], individualTotal: 155, comboPrice: 132, cost: 65, availabilityWindow: "All day", status: "Active", unitsSoldMonth: 150 },
  { id: "cmb-08", nameEn: "Seafood Special", nameAr: "عرض المأكولات البحرية", components: [{ itemNameEn: "Grilled Hammour", qty: 1 }, { itemNameEn: "Fattoush Salad", qty: 1 }, { itemNameEn: "Fresh Orange Juice", qty: 1 }], individualTotal: 121, comboPrice: 104, cost: 58, availabilityWindow: "All day", status: "Active", unitsSoldMonth: 90 },
  { id: "cmb-09", nameEn: "Family Biryani Bundle", nameAr: "حزمة برياني العائلة", components: [{ itemNameEn: "Chicken Biryani", qty: 2 }, { itemNameEn: "Laban", qty: 2 }, { itemNameEn: "Muhalabia", qty: 1 }], individualTotal: 100, comboPrice: 84, cost: 40, availabilityWindow: "All day", status: "Active", unitsSoldMonth: 180 },
  { id: "cmb-10", nameEn: "Kids Combo", nameAr: "كومبو الأطفال", components: [{ itemNameEn: "Chicken Wings", qty: 1 }, { itemNameEn: "Soft Drink Can", qty: 1 }, { itemNameEn: "Luqaimat", qty: 1 }], individualTotal: 52, comboPrice: 42, cost: 18, availabilityWindow: "All day", status: "Active", unitsSoldMonth: 210 },
  { id: "cmb-11", nameEn: "Ramadan Iftar Set", nameAr: "طقم إفطار رمضان", components: [{ itemNameEn: "Lamb Kabsa", qty: 1 }, { itemNameEn: "Molokhia with Chicken", qty: 1 }, { itemNameEn: "Laban", qty: 2 }, { itemNameEn: "Basbousa", qty: 1 }], individualTotal: 132, comboPrice: 112, cost: 55, availabilityWindow: "Ramadan — Maghrib to Isha", status: "Active", unitsSoldMonth: 70 },
  { id: "cmb-12", nameEn: "Weekend Grill Feast", nameAr: "وليمة مشاوي نهاية الأسبوع", components: [{ itemNameEn: "Mixed Grill", qty: 1 }, { itemNameEn: "Lamb Chops", qty: 1 }, { itemNameEn: "Soft Drink Can", qty: 2 }], individualTotal: 186, comboPrice: 159, cost: 88, availabilityWindow: "Fri – Sat only", status: "Active", unitsSoldMonth: 130 },
  { id: "cmb-13", nameEn: "Sandwich & Drink", nameAr: "ساندويتش ومشروب", components: [{ itemNameEn: "Chicken Shawarma", qty: 1 }, { itemNameEn: "Fresh Mint Lemonade", qty: 1 }], individualTotal: 35, comboPrice: 29, cost: 13, availabilityWindow: "All day", status: "Active", unitsSoldMonth: 340 },
  { id: "cmb-14", nameEn: "Vegetarian Combo", nameAr: "كومبو نباتي", components: [{ itemNameEn: "Hummus", qty: 1 }, { itemNameEn: "Moutabal", qty: 1 }, { itemNameEn: "Warak Enab", qty: 1 }, { itemNameEn: "Fresh Orange Juice", qty: 1 }], individualTotal: 67, comboPrice: 56, cost: 24, availabilityWindow: "All day", status: "Active", unitsSoldMonth: 160 },
  { id: "cmb-15", nameEn: "Corporate Lunch Box", nameAr: "علبة غداء الشركات", components: [{ itemNameEn: "Chicken Machboos", qty: 1 }, { itemNameEn: "Fattoush Salad", qty: 1 }, { itemNameEn: "Basbousa", qty: 1 }, { itemNameEn: "Soft Drink Can", qty: 1 }], individualTotal: 79, comboPrice: 66, cost: 32, availabilityWindow: "11:00 AM – 3:00 PM", status: "Inactive", unitsSoldMonth: 50 },
  { id: "cmb-16", nameEn: "Old Value Meal", nameAr: "وجبة القيمة السابقة", components: [{ itemNameEn: "Kibbeh", qty: 1 }, { itemNameEn: "Soft Drink Can", qty: 1 }], individualTotal: 32, comboPrice: 27, cost: 15, availabilityWindow: "Discontinued", status: "Inactive", unitsSoldMonth: 20 },
];

export interface ComboRow extends RawCombo {
  saving: number;
  marginPct: number;
}

export const combos: readonly ComboRow[] = RAW_COMBOS.map((c) => ({
  ...c,
  saving: Math.round((c.individualTotal - c.comboPrice) * 100) / 100,
  marginPct: Math.round(((c.comboPrice - c.cost) / c.comboPrice) * 1000) / 10,
}));

const ESTIMATED_MONTHLY_REVENUE = 930_000;
const comboMonthlyRevenue = combos.reduce((sum, c) => sum + c.comboPrice * c.unitsSoldMonth, 0);
const activeComboCount = combos.filter((c) => c.status === "Active").length;
const avgComboMargin = combos.reduce((sum, c) => sum + c.marginPct, 0) / combos.length;
const bestSellerCombo = combos.reduce((best, c) => (c.unitsSoldMonth > best.unitsSoldMonth ? c : best), combos[0]);

export const comboStats: readonly KpiCard[] = [
  {
    id: "active-combos",
    label: "ACTIVE COMBOS",
    value: String(activeComboCount),
    delta: "+2 this month",
    deltaNote: "new launches",
    color: "#a78bfa",
    sparkline: [10, 11, 11, 12, 12, 13, 12, 13, 13, 14, 13, 14, 14, 13, 13, 13],
  },
  {
    id: "combo-revenue-share",
    label: "COMBO REVENUE SHARE",
    value: `${((comboMonthlyRevenue / ESTIMATED_MONTHLY_REVENUE) * 100).toFixed(1)}%`,
    delta: "+1.6%",
    deltaNote: "vs last month",
    color: "#60a5fa",
    sparkline: [17, 18, 17, 19, 18, 20, 19, 20, 21, 20, 21, 22, 21, 22, 22, 22],
  },
  {
    id: "avg-combo-margin",
    label: "AVG COMBO MARGIN",
    value: `${avgComboMargin.toFixed(1)}%`,
    delta: "+0.8%",
    deltaNote: "vs last month",
    color: "#a3e635",
    sparkline: [48, 49, 49, 50, 50, 51, 50, 51, 51, 52, 51, 52, 52, 51, 51, 52],
  },
  {
    id: "best-seller-combo",
    label: "BEST SELLER",
    value: bestSellerCombo.nameEn,
    delta: `${bestSellerCombo.unitsSoldMonth}/mo`,
    deltaNote: "units sold",
    color: "#fb923c",
    sparkline: [30, 32, 34, 33, 36, 38, 37, 40, 39, 41, 40, 42, 41, 43, 42, 44],
  },
] as const;

/* ------------------------------------------------------------ Price lists */

export type PriceChannel = "dineIn" | "takeaway" | "delivery" | "kiosk" | "hungerstation" | "jahez";

export const priceChannels: readonly { id: PriceChannel; label: string }[] = [
  { id: "dineIn", label: "Dine-in" },
  { id: "takeaway", label: "Takeaway" },
  { id: "delivery", label: "Delivery" },
  { id: "kiosk", label: "Kiosk" },
  { id: "hungerstation", label: "HungerStation" },
  { id: "jahez", label: "Jahez" },
] as const;

export interface PriceList {
  id: string;
  nameEn: string;
  channelMultipliers: Record<PriceChannel, number>;
}

export const priceLists: readonly PriceList[] = [
  { id: "standard", nameEn: "Standard", channelMultipliers: { dineIn: 1.0, takeaway: 1.0, delivery: 1.1, kiosk: 1.0, hungerstation: 1.15, jahez: 1.15 } },
  { id: "delivery-uplift", nameEn: "Delivery Uplift", channelMultipliers: { dineIn: 1.0, takeaway: 1.0, delivery: 1.18, kiosk: 1.0, hungerstation: 1.22, jahez: 1.22 } },
  { id: "aggregator", nameEn: "Aggregator", channelMultipliers: { dineIn: 1.0, takeaway: 1.0, delivery: 1.12, kiosk: 1.0, hungerstation: 1.28, jahez: 1.3 } },
  { id: "ramadan-buffet", nameEn: "Ramadan Buffet", channelMultipliers: { dineIn: 1.35, takeaway: 1.3, delivery: 1.45, kiosk: 1.3, hungerstation: 1.5, jahez: 1.5 } },
  { id: "corporate", nameEn: "Corporate", channelMultipliers: { dineIn: 0.9, takeaway: 0.9, delivery: 0.95, kiosk: 0.9, hungerstation: 1.0, jahez: 1.0 } },
  { id: "happy-hour", nameEn: "Happy Hour", channelMultipliers: { dineIn: 0.8, takeaway: 0.85, delivery: 0.95, kiosk: 0.85, hungerstation: 1.05, jahez: 1.05 } },
] as const;

// Small regional adjustment so the branch selector meaningfully changes the
// matrix, not just a decorative control.
export const branchPriceFactor: Record<Branch, number> = {
  "Riyadh - Olaya": 1.0,
  "Riyadh - Narjis": 1.0,
  "Jeddah - Corniche": 1.03,
  "Dammam - Corniche": 1.05,
  "Khobar - Rakah": 1.02,
};

export const pricingItems: readonly { itemId: string; itemNameEn: string; basePrice: number }[] = menuItems.map(
  (item) => ({ itemId: item.id, itemNameEn: item.nameEn, basePrice: item.price })
);

export const effectiveDateRanges = ["This week", "Next 30 days", "Ramadan 1448", "Q1 2026"] as const;

/* --------------------------------------------------------- Schedules page */

export interface DayPart {
  id: string;
  nameEn: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm", may cross midnight
  activeDays: boolean[]; // [Sun..Sat]
  attachedMenus: string[];
}

export const dayParts: readonly DayPart[] = [
  { id: "dp-breakfast", nameEn: "Breakfast", startTime: "07:00", endTime: "11:00", activeDays: [true, true, true, true, true, true, true], attachedMenus: ["Breakfast Menu"] },
  { id: "dp-lunch", nameEn: "Lunch", startTime: "11:30", endTime: "16:00", activeDays: [true, true, true, true, true, true, true], attachedMenus: ["Main Menu", "Combos"] },
  { id: "dp-dinner", nameEn: "Dinner", startTime: "16:30", endTime: "23:30", activeDays: [true, true, true, true, true, true, true], attachedMenus: ["Main Menu", "Grills Menu", "Combos"] },
  { id: "dp-late-night", nameEn: "Late Night", startTime: "23:30", endTime: "02:00", activeDays: [false, false, false, false, true, true, true], attachedMenus: ["Late Night Menu"] },
];

export interface RamadanProfile {
  hijriRangeLabel: string;
  iftarTime: string;
  suhoorWindow: string;
  ramadanMenu: string;
  ramadanModeEnabled: boolean;
}

export const ramadanProfile: RamadanProfile = {
  hijriRangeLabel: "1 – 30 Ramadan 1448",
  iftarTime: "18:42",
  suhoorWindow: "01:30 – 04:00",
  ramadanMenu: "Ramadan Buffet Menu",
  ramadanModeEnabled: false,
};

export type SpecialDayStatus = "Active" | "Scheduled" | "Expired";

export interface SpecialDay {
  id: string;
  dateGregorian: string;
  dateHijri: string;
  occasionEn: string;
  overrideApplied: string;
  status: SpecialDayStatus;
}

export const specialDays: readonly SpecialDay[] = [
  { id: "sd-01", dateGregorian: "23 Sep 2026", dateHijri: "12 Rabi' al-Awwal 1448", occasionEn: "Saudi National Day", overrideApplied: "National Day Menu", status: "Scheduled" },
  { id: "sd-02", dateGregorian: "19 Mar 2027", dateHijri: "1 Shawwal 1448", occasionEn: "Eid Al-Fitr", overrideApplied: "Eid Buffet Menu", status: "Scheduled" },
  { id: "sd-03", dateGregorian: "22 Feb 2027", dateHijri: "5 Ramadan 1448", occasionEn: "Founding Day", overrideApplied: "Founding Day Specials", status: "Scheduled" },
  { id: "sd-04", dateGregorian: "26 May 2027", dateHijri: "8 Dhu al-Hijjah 1448", occasionEn: "Eid Al-Adha", overrideApplied: "Eid Buffet Menu", status: "Scheduled" },
  { id: "sd-05", dateGregorian: "9 Aug 2026", dateHijri: "25 Safar 1448", occasionEn: "Founders Anniversary", overrideApplied: "Anniversary Promo Menu", status: "Active" },
];

/* ----------------------------------------------------- Availability board */

export type AvailabilityStatus = "Available" | "Low Stock" | "86'd";
export type EightySixReason = "Out of stock" | "Quality issue" | "Supplier delay" | "Prep time";

export interface AvailabilityCard {
  id: string;
  nameEn: string;
  nameAr: string;
  categoryLabel: string;
  branch: Branch;
  status: AvailabilityStatus;
  remainingCount?: number;
  by?: string;
  at?: string;
  reason?: EightySixReason;
}

export const availabilityBoard: readonly AvailabilityCard[] = [
  { id: "av-01", nameEn: "Chicken Shawarma", nameAr: "شاورما دجاج", categoryLabel: "Main Courses", branch: "Riyadh - Olaya", status: "Available" },
  { id: "av-02", nameEn: "Mixed Grill", nameAr: "مشاوي مشكلة", categoryLabel: "Grills", branch: "Jeddah - Corniche", status: "Available" },
  { id: "av-03", nameEn: "Hummus", nameAr: "حمص", categoryLabel: "Appetizers", branch: "Riyadh - Narjis", status: "Available" },
  { id: "av-04", nameEn: "Fresh Mint Lemonade", nameAr: "ليمون بالنعناع", categoryLabel: "Beverages", branch: "Khobar - Rakah", status: "Available" },
  { id: "av-05", nameEn: "Kunafa", nameAr: "كنافة", categoryLabel: "Desserts", branch: "Dammam - Corniche", status: "Available" },

  { id: "av-06", nameEn: "Lamb Chops", nameAr: "ريش غنم", categoryLabel: "Grills", branch: "Riyadh - Olaya", status: "Low Stock", remainingCount: 4 },
  { id: "av-07", nameEn: "Grilled Hammour", nameAr: "هامور مشوي", categoryLabel: "Main Courses", branch: "Jeddah - Corniche", status: "Low Stock", remainingCount: 3 },
  { id: "av-08", nameEn: "Karak Tea", nameAr: "شاي كرك", categoryLabel: "Beverages", branch: "Riyadh - Narjis", status: "Low Stock", remainingCount: 6 },
  { id: "av-09", nameEn: "Chicken Wings", nameAr: "أجنحة دجاج", categoryLabel: "Appetizers", branch: "Dammam - Corniche", status: "Low Stock", remainingCount: 8 },

  { id: "av-10", nameEn: "Lamb Kebab", nameAr: "كباب لحم", categoryLabel: "Grills", branch: "Riyadh - Olaya", status: "86'd", by: "Ahmed Al-Otaibi", at: "2 hr ago", reason: "Out of stock" },
  { id: "av-11", nameEn: "Umm Ali", nameAr: "أم علي", categoryLabel: "Desserts", branch: "Jeddah - Corniche", status: "86'd", by: "Fatima Al-Zahrani", at: "45 min ago", reason: "Prep time" },
  { id: "av-12", nameEn: "Molokhia with Chicken", nameAr: "ملوخية بالدجاج", categoryLabel: "Main Courses", branch: "Dammam - Corniche", status: "86'd", by: "Khalid Al-Harbi", at: "3 hr ago", reason: "Supplier delay" },
];
