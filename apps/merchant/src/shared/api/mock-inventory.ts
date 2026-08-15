// Mock data for the Inventory module (ingredients, recipes, purchasing, counts,
// waste, transfers, production). Shape mirrors what real `useIngredients()` /
// `useRecipes()` / `usePurchaseOrders()` / ... queries would return, so swapping
// these for TanStack Query hooks later is a drop-in change per file.

import type { KpiCard } from "@/shared/api/mock-dashboard";

export const BRANCHES = [
  "Riyadh - Olaya",
  "Riyadh - Narjis",
  "Jeddah - Corniche",
  "Dammam - Corniche",
  "Khobar - Rakah",
] as const;
export type Branch = (typeof BRANCHES)[number];

export const SUPPLIERS = ["Almarai", "Sadafco", "Nadec", "Tamimi Markets", "Local Supplier"] as const;
export type Supplier = (typeof SUPPLIERS)[number];

const STAFF_NAMES = [
  "Faisal Al-Otaibi",
  "Sara Al-Qahtani",
  "Mohammed Al-Harbi",
  "Layla Al-Zahrani",
  "Abdullah Al-Shammari",
  "Noura Al-Dosari",
  "Khalid Al-Mutairi",
  "Hind Al-Ghamdi",
  "Turki Al-Anzi",
  "Amal Al-Subai'i",
];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function money(n: number): string {
  return `SAR ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ================================================================== INGREDIENTS */

export type StockUnit = "kg" | "L" | "pcs" | "box";
export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";
export type IngredientCategory =
  | "Produce"
  | "Meat & Poultry"
  | "Seafood"
  | "Dry Goods"
  | "Spices & Sauces"
  | "Dairy"
  | "Bakery"
  | "Beverages";

export interface StockRow {
  id: string;
  ingredient: string;
  ingredientAr: string;
  category: IngredientCategory;
  supplier: Supplier;
  onHand: number;
  unit: StockUnit;
  parLevel: number;
  branch: Branch;
  status: StockStatus;
  lastReceived: string;
  unitCost: number;
}

const INGREDIENT_SEED: readonly [string, string, IngredientCategory, StockUnit, number][] = [
  ["Chicken Breast", "صدور دجاج", "Meat & Poultry", "kg", 24],
  ["Chicken Thigh", "أفخاذ دجاج", "Meat & Poultry", "kg", 19],
  ["Lamb Shoulder", "كتف غنم", "Meat & Poultry", "kg", 55],
  ["Beef Tenderloin", "لحم بقر فيليه", "Meat & Poultry", "kg", 68],
  ["Ground Beef", "لحم بقر مفروم", "Meat & Poultry", "kg", 38],
  ["Minced Lamb", "لحم غنم مفروم", "Meat & Poultry", "kg", 46],
  ["Whole Chicken", "دجاج كامل", "Meat & Poultry", "kg", 16],
  ["Shrimp", "روبيان", "Seafood", "kg", 62],
  ["Salmon Fillet", "فيليه سلمون", "Seafood", "kg", 74],
  ["Hammour Fillet", "فيليه هامور", "Seafood", "kg", 58],
  ["Basmati Rice", "أرز بسمتي", "Dry Goods", "kg", 7.5],
  ["Bulgur Wheat", "برغل", "Dry Goods", "kg", 6],
  ["Chickpeas (dry)", "حمص جاف", "Dry Goods", "kg", 8],
  ["Lentils (red)", "عدس أحمر", "Dry Goods", "kg", 6.5],
  ["Freekeh", "فريكة", "Dry Goods", "kg", 12],
  ["All-Purpose Flour", "دقيق أبيض", "Dry Goods", "kg", 3.2],
  ["Semolina", "سميد", "Dry Goods", "kg", 4],
  ["Cooking Oil", "زيت طهي", "Dry Goods", "L", 9],
  ["Olive Oil", "زيت زيتون", "Dry Goods", "L", 28],
  ["Tahini", "طحينة", "Dry Goods", "box", 32],
  ["Sugar", "سكر", "Dry Goods", "kg", 3],
  ["Salt", "ملح", "Dry Goods", "kg", 1.5],
  ["Black Pepper", "فلفل أسود", "Spices & Sauces", "kg", 55],
  ["Cumin", "كمون", "Spices & Sauces", "kg", 30],
  ["Sumac", "سماق", "Spices & Sauces", "kg", 34],
  ["Cardamom", "هيل", "Spices & Sauces", "kg", 120],
  ["Saffron", "زعفران", "Spices & Sauces", "box", 210],
  ["Tomato Paste", "معجون طماطم", "Spices & Sauces", "box", 18],
  ["Garlic Paste", "معجون ثوم", "Spices & Sauces", "box", 14],
  ["Fresh Milk", "حليب طازج", "Dairy", "L", 4.2],
  ["Labneh", "لبنة", "Dairy", "kg", 12],
  ["Mozzarella Cheese", "جبنة موزاريلا", "Dairy", "kg", 32],
  ["Halloumi Cheese", "جبنة حلوم", "Dairy", "kg", 38],
  ["Feta Cheese", "جبنة فيتا", "Dairy", "kg", 30],
  ["Butter", "زبدة", "Dairy", "kg", 26],
  ["Fresh Cream", "كريمة طازجة", "Dairy", "L", 18],
  ["Yogurt", "زبادي", "Dairy", "kg", 8],
  ["Eggs", "بيض", "Dairy", "box", 16],
  ["Tomatoes", "طماطم", "Produce", "kg", 5],
  ["Cucumber", "خيار", "Produce", "kg", 4],
  ["Onions", "بصل", "Produce", "kg", 3],
  ["Garlic", "ثوم", "Produce", "kg", 12],
  ["Lemons", "ليمون", "Produce", "kg", 6],
  ["Parsley", "بقدونس", "Produce", "kg", 8],
  ["Mint", "نعناع", "Produce", "kg", 9],
  ["Lettuce", "خس", "Produce", "kg", 5.5],
  ["Bell Peppers", "فلفل رومي", "Produce", "kg", 7],
  ["Potatoes", "بطاطس", "Produce", "kg", 3.5],
  ["Avocado", "أفوكادو", "Produce", "kg", 22],
  ["Dates", "تمر", "Produce", "kg", 18],
  ["Pita Bread", "خبز بيتا", "Bakery", "pcs", 0.4],
  ["Saj Bread", "خبز صاج", "Bakery", "pcs", 0.6],
  ["Burger Buns", "خبز برجر", "Bakery", "pcs", 1.1],
  ["Kunafa Dough", "عجينة كنافة", "Bakery", "box", 22],
  ["Puff Pastry", "عجين مورقة", "Bakery", "box", 26],
  ["Saudi Coffee Beans", "بن سعودي", "Beverages", "kg", 45],
  ["Arabic Tea", "شاي عربي", "Beverages", "kg", 26],
  ["Rose Water", "ماء ورد", "Beverages", "L", 14],
  ["Orange Juice Concentrate", "عصير برتقال مركز", "Beverages", "L", 11],
];

export const stockRows: readonly StockRow[] = INGREDIENT_SEED.map(([ingredient, ingredientAr, category, unit, unitCost], i) => {
  const parLevel = 15 + ((i * 13) % 60);
  const isOut = i % 10 === 0;
  const isLow = !isOut && i % 3 === 0;
  const status: StockStatus = isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock";
  const onHand = isOut ? 0 : isLow ? Math.max(1, Math.round(parLevel * 0.55) - (i % 5)) : parLevel + 5 + (i % 20);
  const day = isOut ? 26 + (i % 3) : 1 + ((i * 3) % 9);
  const month = isOut ? "07" : "08";
  return {
    id: `sku-${pad2(i + 1)}`,
    ingredient,
    ingredientAr,
    category,
    supplier: pick(SUPPLIERS, i),
    onHand,
    unit,
    parLevel,
    branch: pick(BRANCHES, i + 2),
    status,
    lastReceived: `2026-${month}-${pad2(day)}`,
    unitCost,
  };
});

export const ingredientKpis: readonly KpiCard[] = [
  {
    id: "total-skus",
    label: "TOTAL SKUS",
    value: "342",
    delta: "+6",
    deltaNote: "vs last month",
    color: "#a78bfa",
    sparkline: [30, 32, 31, 34, 33, 35, 34, 36, 35, 37, 36, 38, 37, 39, 38, 40],
  },
  {
    id: "low-stock-alerts",
    label: "LOW STOCK ALERTS",
    value: "18",
    delta: "+5",
    deltaNote: "vs last week — needs attention",
    color: "#fb923c",
    sparkline: [10, 11, 10, 12, 13, 12, 14, 13, 15, 14, 16, 15, 17, 16, 18, 18],
  },
  {
    id: "stock-value",
    label: "STOCK VALUE",
    value: "SAR 412.8K",
    delta: "+3.1%",
    deltaNote: "vs last month",
    color: "#60a5fa",
    sparkline: [340, 348, 355, 360, 368, 372, 380, 385, 390, 395, 400, 402, 405, 408, 410, 412],
  },
  {
    id: "waste-this-month",
    label: "WASTE THIS MONTH",
    value: "SAR 6.2K",
    delta: "+0.8K",
    deltaNote: "vs last month",
    color: "#fb923c",
    sparkline: [3.5, 3.8, 4.0, 4.2, 4.6, 4.9, 5.1, 5.3, 5.5, 5.6, 5.8, 5.9, 6.0, 6.1, 6.1, 6.2],
  },
] as const;

/* ================================================================== RECIPES */

export interface RecipeIngredientLine {
  ingredientId: string;
  qty: number;
  unit: StockUnit;
  isSubRecipe?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  yieldPortions: number;
  portionSize: string;
  sellingPrice: number;
  lines: readonly RecipeIngredientLine[];
}

function ing(name: string): string {
  const row = stockRows.find((r) => r.ingredient === name);
  if (!row) throw new Error(`unknown ingredient ${name}`);
  return row.id;
}

const RECIPE_SEED: readonly Omit<Recipe, "id">[] = [
  { name: "Chicken Shawarma Plate", nameAr: "صحن شاورما دجاج", category: "Mains", yieldPortions: 1, portionSize: "1 plate (320g)", sellingPrice: 32,
    lines: [{ ingredientId: ing("Chicken Thigh"), qty: 0.22, unit: "kg" }, { ingredientId: ing("Pita Bread"), qty: 2, unit: "pcs", isSubRecipe: true }, { ingredientId: ing("Garlic Paste"), qty: 0.02, unit: "box" }, { ingredientId: ing("Tomatoes"), qty: 0.05, unit: "kg" }, { ingredientId: ing("Cooking Oil"), qty: 0.02, unit: "L" }] },
  { name: "Lamb Mandi", nameAr: "مندي لحم", category: "Mains", yieldPortions: 4, portionSize: "family (4 portions)", sellingPrice: 145,
    lines: [{ ingredientId: ing("Lamb Shoulder"), qty: 1.4, unit: "kg" }, { ingredientId: ing("Basmati Rice"), qty: 0.8, unit: "kg" }, { ingredientId: ing("Cardamom"), qty: 0.01, unit: "kg" }, { ingredientId: ing("Onions"), qty: 0.2, unit: "kg" }, { ingredientId: ing("Cooking Oil"), qty: 0.05, unit: "L" }] },
  { name: "Grilled Hammour", nameAr: "هامور مشوي", category: "Mains", yieldPortions: 1, portionSize: "1 fillet (280g)", sellingPrice: 68,
    lines: [{ ingredientId: ing("Hammour Fillet"), qty: 0.28, unit: "kg" }, { ingredientId: ing("Lemons"), qty: 0.05, unit: "kg" }, { ingredientId: ing("Olive Oil"), qty: 0.02, unit: "L" }, { ingredientId: ing("Garlic"), qty: 0.01, unit: "kg" }] },
  { name: "Chicken Mandi", nameAr: "مندي دجاج", category: "Mains", yieldPortions: 2, portionSize: "half chicken", sellingPrice: 58,
    lines: [{ ingredientId: ing("Whole Chicken"), qty: 0.9, unit: "kg" }, { ingredientId: ing("Basmati Rice"), qty: 0.5, unit: "kg" }, { ingredientId: ing("Cardamom"), qty: 0.008, unit: "kg" }, { ingredientId: ing("Onions"), qty: 0.15, unit: "kg" }] },
  { name: "Beef Burger", nameAr: "برجر لحم", category: "Burgers", yieldPortions: 1, portionSize: "1 burger", sellingPrice: 28,
    lines: [{ ingredientId: ing("Ground Beef"), qty: 0.16, unit: "kg" }, { ingredientId: ing("Burger Buns"), qty: 1, unit: "pcs", isSubRecipe: true }, { ingredientId: ing("Mozzarella Cheese"), qty: 0.03, unit: "kg" }, { ingredientId: ing("Lettuce"), qty: 0.02, unit: "kg" }, { ingredientId: ing("Tomatoes"), qty: 0.03, unit: "kg" }] },
  { name: "Chicken Burger", nameAr: "برجر دجاج", category: "Burgers", yieldPortions: 1, portionSize: "1 burger", sellingPrice: 24,
    lines: [{ ingredientId: ing("Chicken Breast"), qty: 0.15, unit: "kg" }, { ingredientId: ing("Burger Buns"), qty: 1, unit: "pcs", isSubRecipe: true }, { ingredientId: ing("Lettuce"), qty: 0.02, unit: "kg" }, { ingredientId: ing("Cooking Oil"), qty: 0.02, unit: "L" }] },
  { name: "Falafel Wrap", nameAr: "لفة فلافل", category: "Wraps", yieldPortions: 1, portionSize: "1 wrap", sellingPrice: 16,
    lines: [{ ingredientId: ing("Chickpeas (dry)"), qty: 0.12, unit: "kg" }, { ingredientId: ing("Saj Bread"), qty: 1, unit: "pcs", isSubRecipe: true }, { ingredientId: ing("Tahini"), qty: 0.03, unit: "box" }, { ingredientId: ing("Parsley"), qty: 0.01, unit: "kg" }] },
  { name: "Hummus Plate", nameAr: "صحن حمص", category: "Starters", yieldPortions: 1, portionSize: "1 plate", sellingPrice: 18,
    lines: [{ ingredientId: ing("Chickpeas (dry)"), qty: 0.15, unit: "kg" }, { ingredientId: ing("Tahini"), qty: 0.05, unit: "box" }, { ingredientId: ing("Olive Oil"), qty: 0.02, unit: "L" }, { ingredientId: ing("Pita Bread"), qty: 2, unit: "pcs", isSubRecipe: true }] },
  { name: "Fattoush Salad", nameAr: "سلطة فتوش", category: "Salads", yieldPortions: 1, portionSize: "1 bowl", sellingPrice: 22,
    lines: [{ ingredientId: ing("Lettuce"), qty: 0.08, unit: "kg" }, { ingredientId: ing("Tomatoes"), qty: 0.06, unit: "kg" }, { ingredientId: ing("Cucumber"), qty: 0.06, unit: "kg" }, { ingredientId: ing("Sumac"), qty: 0.005, unit: "kg" }, { ingredientId: ing("Pita Bread"), qty: 1, unit: "pcs", isSubRecipe: true }] },
  { name: "Tabbouleh", nameAr: "تبولة", category: "Salads", yieldPortions: 1, portionSize: "1 bowl", sellingPrice: 20,
    lines: [{ ingredientId: ing("Bulgur Wheat"), qty: 0.05, unit: "kg" }, { ingredientId: ing("Parsley"), qty: 0.08, unit: "kg" }, { ingredientId: ing("Tomatoes"), qty: 0.05, unit: "kg" }, { ingredientId: ing("Lemons"), qty: 0.03, unit: "kg" }] },
  { name: "Kunafa", nameAr: "كنافة", category: "Desserts", yieldPortions: 4, portionSize: "tray (4 portions)", sellingPrice: 48,
    lines: [{ ingredientId: ing("Kunafa Dough"), qty: 0.5, unit: "box" }, { ingredientId: ing("Halloumi Cheese"), qty: 0.3, unit: "kg" }, { ingredientId: ing("Butter"), qty: 0.15, unit: "kg" }, { ingredientId: ing("Rose Water"), qty: 0.02, unit: "L" }] },
  { name: "Umm Ali", nameAr: "أم علي", category: "Desserts", yieldPortions: 2, portionSize: "2 bowls", sellingPrice: 26,
    lines: [{ ingredientId: ing("Puff Pastry"), qty: 0.2, unit: "box" }, { ingredientId: ing("Fresh Milk"), qty: 0.4, unit: "L" }, { ingredientId: ing("Fresh Cream"), qty: 0.1, unit: "L" }, { ingredientId: ing("Sugar"), qty: 0.05, unit: "kg" }] },
  { name: "Arabic Coffee", nameAr: "قهوة عربية", category: "Beverages", yieldPortions: 4, portionSize: "dallah (4 cups)", sellingPrice: 20,
    lines: [{ ingredientId: ing("Saudi Coffee Beans"), qty: 0.05, unit: "kg" }, { ingredientId: ing("Cardamom"), qty: 0.005, unit: "kg" }, { ingredientId: ing("Saffron"), qty: 0.002, unit: "box" }] },
  { name: "Karak Tea", nameAr: "شاي كرك", category: "Beverages", yieldPortions: 1, portionSize: "1 cup", sellingPrice: 8,
    lines: [{ ingredientId: ing("Arabic Tea"), qty: 0.01, unit: "kg" }, { ingredientId: ing("Fresh Milk"), qty: 0.1, unit: "L" }, { ingredientId: ing("Sugar"), qty: 0.02, unit: "kg" }] },
  { name: "Chicken Kabsa", nameAr: "كبسة دجاج", category: "Mains", yieldPortions: 4, portionSize: "family (4 portions)", sellingPrice: 96,
    lines: [{ ingredientId: ing("Whole Chicken"), qty: 1.1, unit: "kg" }, { ingredientId: ing("Basmati Rice"), qty: 0.7, unit: "kg" }, { ingredientId: ing("Tomato Paste"), qty: 0.1, unit: "box" }, { ingredientId: ing("Cumin"), qty: 0.01, unit: "kg" }, { ingredientId: ing("Onions"), qty: 0.2, unit: "kg" }] },
  { name: "Lamb Kabsa", nameAr: "كبسة لحم", category: "Mains", yieldPortions: 4, portionSize: "family (4 portions)", sellingPrice: 135,
    lines: [{ ingredientId: ing("Lamb Shoulder"), qty: 1.2, unit: "kg" }, { ingredientId: ing("Basmati Rice"), qty: 0.7, unit: "kg" }, { ingredientId: ing("Tomato Paste"), qty: 0.1, unit: "box" }, { ingredientId: ing("Cumin"), qty: 0.01, unit: "kg" }] },
  { name: "Mixed Grill", nameAr: "مشاوي مشكلة", category: "Mains", yieldPortions: 2, portionSize: "sharing platter", sellingPrice: 110,
    lines: [{ ingredientId: ing("Lamb Shoulder"), qty: 0.25, unit: "kg" }, { ingredientId: ing("Chicken Thigh"), qty: 0.25, unit: "kg" }, { ingredientId: ing("Minced Lamb"), qty: 0.25, unit: "kg" }, { ingredientId: ing("Onions"), qty: 0.1, unit: "kg" }, { ingredientId: ing("Parsley"), qty: 0.02, unit: "kg" }] },
  { name: "Shrimp Alfredo", nameAr: "روبيان ألفريدو", category: "Pasta", yieldPortions: 1, portionSize: "1 plate", sellingPrice: 62,
    lines: [{ ingredientId: ing("Shrimp"), qty: 0.18, unit: "kg" }, { ingredientId: ing("Fresh Cream"), qty: 0.15, unit: "L" }, { ingredientId: ing("Butter"), qty: 0.03, unit: "kg" }, { ingredientId: ing("Garlic"), qty: 0.01, unit: "kg" }] },
  { name: "Salmon Teriyaki Bowl", nameAr: "سلمون تيرياكي", category: "Mains", yieldPortions: 1, portionSize: "1 bowl", sellingPrice: 58,
    lines: [{ ingredientId: ing("Salmon Fillet"), qty: 0.2, unit: "kg" }, { ingredientId: ing("Basmati Rice"), qty: 0.18, unit: "kg" }, { ingredientId: ing("Bell Peppers"), qty: 0.05, unit: "kg" }] },
  { name: "Beef Tenderloin Steak", nameAr: "ستيك فيليه بقري", category: "Mains", yieldPortions: 1, portionSize: "1 steak (250g)", sellingPrice: 95,
    lines: [{ ingredientId: ing("Beef Tenderloin"), qty: 0.25, unit: "kg" }, { ingredientId: ing("Butter"), qty: 0.02, unit: "kg" }, { ingredientId: ing("Potatoes"), qty: 0.2, unit: "kg" }, { ingredientId: ing("Garlic"), qty: 0.01, unit: "kg" }] },
  { name: "Chicken Caesar Salad", nameAr: "سلطة سيزر بالدجاج", category: "Salads", yieldPortions: 1, portionSize: "1 bowl", sellingPrice: 30,
    lines: [{ ingredientId: ing("Chicken Breast"), qty: 0.12, unit: "kg" }, { ingredientId: ing("Lettuce"), qty: 0.1, unit: "kg" }, { ingredientId: ing("Feta Cheese"), qty: 0.02, unit: "kg" }, { ingredientId: ing("Eggs"), qty: 0.2, unit: "box" }] },
  { name: "Margherita Pizza", nameAr: "بيتزا مارغريتا", category: "Pizza", yieldPortions: 2, portionSize: "12-inch pizza", sellingPrice: 38,
    lines: [{ ingredientId: ing("All-Purpose Flour"), qty: 0.25, unit: "kg" }, { ingredientId: ing("Mozzarella Cheese"), qty: 0.15, unit: "kg" }, { ingredientId: ing("Tomato Paste"), qty: 0.1, unit: "box" }, { ingredientId: ing("Olive Oil"), qty: 0.02, unit: "L" }] },
  { name: "Chicken Shawarma Sandwich", nameAr: "ساندويش شاورما دجاج", category: "Wraps", yieldPortions: 1, portionSize: "1 sandwich", sellingPrice: 14,
    lines: [{ ingredientId: ing("Chicken Thigh"), qty: 0.12, unit: "kg" }, { ingredientId: ing("Saj Bread"), qty: 1, unit: "pcs", isSubRecipe: true }, { ingredientId: ing("Garlic Paste"), qty: 0.01, unit: "box" }] },
  { name: "Foul Medames", nameAr: "فول مدمس", category: "Starters", yieldPortions: 1, portionSize: "1 bowl", sellingPrice: 12,
    lines: [{ ingredientId: ing("Chickpeas (dry)"), qty: 0.1, unit: "kg" }, { ingredientId: ing("Olive Oil"), qty: 0.02, unit: "L" }, { ingredientId: ing("Lemons"), qty: 0.02, unit: "kg" }, { ingredientId: ing("Garlic"), qty: 0.01, unit: "kg" }] },
  { name: "Manakish Zaatar", nameAr: "مناقيش زعتر", category: "Bakery", yieldPortions: 1, portionSize: "1 piece", sellingPrice: 9,
    lines: [{ ingredientId: ing("All-Purpose Flour"), qty: 0.12, unit: "kg" }, { ingredientId: ing("Olive Oil"), qty: 0.03, unit: "L" }, { ingredientId: ing("Sumac"), qty: 0.01, unit: "kg" }] },
  { name: "Saj Chicken Wrap", nameAr: "لفة دجاج صاج", category: "Wraps", yieldPortions: 1, portionSize: "1 wrap", sellingPrice: 17,
    lines: [{ ingredientId: ing("Chicken Breast"), qty: 0.14, unit: "kg" }, { ingredientId: ing("Saj Bread"), qty: 1, unit: "pcs", isSubRecipe: true }, { ingredientId: ing("Labneh"), qty: 0.03, unit: "kg" }, { ingredientId: ing("Mint"), qty: 0.01, unit: "kg" }] },
  { name: "Kunafa Cheese Roll", nameAr: "أصابع كنافة بالجبن", category: "Desserts", yieldPortions: 1, portionSize: "3 rolls", sellingPrice: 16,
    lines: [{ ingredientId: ing("Kunafa Dough"), qty: 0.1, unit: "box" }, { ingredientId: ing("Halloumi Cheese"), qty: 0.08, unit: "kg" }, { ingredientId: ing("Butter"), qty: 0.02, unit: "kg" }] },
  { name: "Halloumi Fries", nameAr: "أصابع حلوم مقلية", category: "Starters", yieldPortions: 1, portionSize: "1 plate", sellingPrice: 24,
    lines: [{ ingredientId: ing("Halloumi Cheese"), qty: 0.18, unit: "kg" }, { ingredientId: ing("All-Purpose Flour"), qty: 0.03, unit: "kg" }, { ingredientId: ing("Cooking Oil"), qty: 0.06, unit: "L" }] },
];

export const recipes: readonly Recipe[] = RECIPE_SEED.map((r, i) => ({ id: `recipe-${pad2(i + 1)}`, ...r }));

const unitCostById = new Map(stockRows.map((r) => [r.id, r.unitCost] as const));

export function recipeIngredientsCost(recipe: Recipe): number {
  return recipe.lines.reduce((sum, line) => sum + line.qty * (unitCostById.get(line.ingredientId) ?? 0), 0);
}
export function recipeLabourCost(recipe: Recipe): number {
  return recipeIngredientsCost(recipe) * 0.35;
}
export function recipeOverheadCost(recipe: Recipe): number {
  return recipeIngredientsCost(recipe) * 0.15;
}
export function recipeTotalCost(recipe: Recipe): number {
  return recipeIngredientsCost(recipe) + recipeLabourCost(recipe) + recipeOverheadCost(recipe);
}
export function recipeFoodCostPct(recipe: Recipe): number {
  return (recipeIngredientsCost(recipe) / recipe.sellingPrice) * 100;
}
export function recipeGrossMargin(recipe: Recipe): number {
  return recipe.sellingPrice - recipeTotalCost(recipe);
}

/* ================================================================== PURCHASING */

export type POStatus = "Draft" | "Sent" | "Partially Received" | "Received" | "Cancelled" | "Overdue";

export interface POLine {
  ingredientId: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  supplier: Supplier;
  branch: Branch;
  status: POStatus;
  expectedDate: string;
  lines: readonly POLine[];
}

const PO_STATUS_CYCLE: readonly POStatus[] = ["Draft", "Sent", "Partially Received", "Received", "Received", "Cancelled", "Overdue"];

function buildPOLines(seedIndex: number, status: POStatus): readonly POLine[] {
  const count = 2 + (seedIndex % 4);
  const lines: POLine[] = [];
  for (let j = 0; j < count; j++) {
    const row = stockRows[(seedIndex * 5 + j * 7) % stockRows.length];
    const orderedQty = 10 + ((seedIndex + j) * 3) % 60;
    let receivedQty = 0;
    if (status === "Received") receivedQty = orderedQty;
    else if (status === "Partially Received") receivedQty = Math.round(orderedQty * 0.55);
    else if (status === "Overdue") receivedQty = Math.round(orderedQty * 0.2);
    lines.push({ ingredientId: row.id, orderedQty, receivedQty, unitCost: row.unitCost });
  }
  return lines;
}

export const purchaseOrders: readonly PurchaseOrder[] = Array.from({ length: 18 }, (_, i) => {
  const status = pick(PO_STATUS_CYCLE, i);
  const lines = buildPOLines(i, status);
  const day = 1 + ((i * 4) % 20);
  return {
    id: `PO-${2600 + i}`,
    supplier: pick(SUPPLIERS, i),
    branch: pick(BRANCHES, i + 1),
    status,
    expectedDate: `2026-08-${pad2(day)}`,
    lines,
  };
});

export function poTotal(po: PurchaseOrder): number {
  return po.lines.reduce((sum, l) => sum + l.orderedQty * l.unitCost, 0);
}
export function poReceivedPct(po: PurchaseOrder): number {
  const ordered = po.lines.reduce((sum, l) => sum + l.orderedQty, 0);
  const received = po.lines.reduce((sum, l) => sum + l.receivedQty, 0);
  return ordered === 0 ? 0 : Math.round((received / ordered) * 100);
}

export const purchasingKpis: readonly KpiCard[] = [
  { id: "open-pos", label: "OPEN POS", value: "14", delta: "+2", deltaNote: "vs last week", color: "#a78bfa", sparkline: [8, 9, 8, 10, 11, 10, 12, 11, 13, 12, 13, 14, 13, 14, 14, 14] },
  { id: "pending-receipt", label: "PENDING RECEIPT", value: "6", delta: "+1", deltaNote: "vs last week", color: "#fb923c", sparkline: [3, 4, 3, 5, 4, 5, 6, 5, 6, 5, 6, 7, 6, 6, 6, 6] },
  { id: "spend-month", label: "SPEND THIS MONTH", value: "SAR 284K", delta: "+4.6%", deltaNote: "vs last month", color: "#60a5fa", sparkline: [220, 228, 235, 240, 248, 252, 258, 262, 268, 272, 276, 278, 280, 282, 283, 284] },
  { id: "overdue-deliveries", label: "OVERDUE DELIVERIES", value: "2", delta: "+1", deltaNote: "vs last week — needs attention", color: "#fb923c", sparkline: [0, 0, 1, 0, 1, 1, 0, 1, 1, 2, 1, 2, 1, 2, 2, 2] },
] as const;

/* ================================================================== STOCK COUNTS */

export type CountType = "Full" | "Spot" | "Cycle";
export type CountStatus = "In Progress" | "Pending Review" | "Approved";

export interface CountVarianceLine {
  ingredientId: string;
  expected: number;
  counted: number;
  unit: StockUnit;
}

export interface StockCount {
  id: string;
  date: string;
  branch: Branch;
  type: CountType;
  countedBy: string;
  itemsCounted: number;
  status: CountStatus;
  lines: readonly CountVarianceLine[];
}

const COUNT_TYPES: readonly CountType[] = ["Full", "Spot", "Cycle"];
const COUNT_STATUSES: readonly CountStatus[] = ["Approved", "Approved", "Pending Review", "In Progress"];

function buildCountLines(seedIndex: number): readonly CountVarianceLine[] {
  const count = 12 + (seedIndex % 6);
  const lines: CountVarianceLine[] = [];
  for (let j = 0; j < count; j++) {
    const row = stockRows[(seedIndex * 9 + j * 11) % stockRows.length];
    const expected = 20 + ((seedIndex + j * 3) % 80);
    const driftPct = ((((seedIndex * 7 + j * 5) % 21) - 10) / 100);
    const counted = Math.max(0, Math.round(expected * (1 + driftPct)));
    lines.push({ ingredientId: row.id, expected, counted, unit: row.unit });
  }
  return lines.sort((a, b) => Math.abs(b.counted - b.expected) * unitCostFor(b) - Math.abs(a.counted - a.expected) * unitCostFor(a));
}
function unitCostFor(line: CountVarianceLine): number {
  return unitCostById.get(line.ingredientId) ?? 0;
}

export const stockCounts: readonly StockCount[] = Array.from({ length: 8 }, (_, i) => {
  const day = 2 + i * 3;
  return {
    id: `CNT-${pad2(i + 1)}`,
    date: `2026-08-${pad2(Math.min(day, 28))}`,
    branch: pick(BRANCHES, i),
    type: pick(COUNT_TYPES, i),
    countedBy: pick(STAFF_NAMES, i + 3),
    itemsCounted: 120 + i * 22,
    status: pick(COUNT_STATUSES, i),
    lines: buildCountLines(i),
  };
});

export function countVarianceValue(count: StockCount): number {
  return count.lines.reduce((sum, l) => sum + (l.counted - l.expected) * unitCostFor(l), 0);
}
export function countVariancePct(count: StockCount): number {
  const expectedTotal = count.lines.reduce((sum, l) => sum + l.expected * unitCostFor(l), 0);
  return expectedTotal === 0 ? 0 : (countVarianceValue(count) / expectedTotal) * 100;
}

export const countsKpis: readonly KpiCard[] = [
  { id: "counts-month", label: "COUNTS THIS MONTH", value: "8", delta: "+2", deltaNote: "vs last month", color: "#a78bfa", sparkline: [4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 8, 8] },
  { id: "items-counted", label: "ITEMS COUNTED", value: "1,284", delta: "+9.4%", deltaNote: "vs last cycle", color: "#60a5fa", sparkline: [800, 850, 880, 920, 960, 1000, 1040, 1080, 1110, 1150, 1180, 1210, 1230, 1250, 1270, 1284] },
  { id: "total-variance", label: "TOTAL VARIANCE", value: "−SAR 4.2K", delta: "−0.6K", deltaNote: "vs last cycle", color: "#fb923c", sparkline: [2.1, 2.4, 2.6, 2.9, 3.1, 3.3, 3.5, 3.6, 3.7, 3.8, 3.9, 4.0, 4.0, 4.1, 4.1, 4.2] },
  { id: "accuracy", label: "ACCURACY", value: "96.8%", delta: "+0.4%", deltaNote: "vs last cycle", color: "#a3e635", sparkline: [94, 94.2, 94.5, 94.8, 95, 95.3, 95.6, 95.8, 96, 96.2, 96.3, 96.5, 96.6, 96.7, 96.7, 96.8] },
] as const;

/* ================================================================== WASTE */

export type WasteReason = "Expired" | "Spoiled" | "Prep Error" | "Customer Return" | "Overproduction" | "Damaged in Transit";
export const WASTE_REASONS: readonly WasteReason[] = ["Expired", "Spoiled", "Prep Error", "Customer Return", "Overproduction", "Damaged in Transit"];
export const WASTE_REASON_COLOR: Record<WasteReason, string> = {
  Expired: "#EF4444",
  Spoiled: "#F59E0B",
  "Prep Error": "#8b7cf0",
  "Customer Return": "#3B82F6",
  Overproduction: "#22C55E",
  "Damaged in Transit": "#6b6b74",
};

export interface WasteEntry {
  id: string;
  date: string;
  item: string;
  qty: number;
  unit: StockUnit;
  cost: number;
  reason: WasteReason;
  branch: Branch;
  loggedBy: string;
}

export const wasteEntries: readonly WasteEntry[] = Array.from({ length: 46 }, (_, i) => {
  const row = stockRows[(i * 7) % stockRows.length];
  const qty = Math.max(1, Math.round(((i * 3) % 12) + 1));
  const day = 1 + (i % 28);
  return {
    id: `waste-${pad2(i + 1)}`,
    date: `2026-08-${pad2(day)}`,
    item: row.ingredient,
    qty,
    unit: row.unit,
    cost: Math.round(qty * row.unitCost * 100) / 100,
    reason: pick(WASTE_REASONS, i),
    branch: pick(BRANCHES, i + 1),
    loggedBy: pick(STAFF_NAMES, i),
  };
});

export const wasteKpis: readonly KpiCard[] = [
  { id: "waste-month", label: "WASTE THIS MONTH", value: "SAR 6.2K", delta: "+0.8K", deltaNote: "vs last month", color: "#fb923c", sparkline: [3.5, 3.8, 4.0, 4.2, 4.6, 4.9, 5.1, 5.3, 5.5, 5.6, 5.8, 5.9, 6.0, 6.1, 6.1, 6.2] },
  { id: "waste-pct-sales", label: "% OF SALES", value: "1.8%", delta: "−0.2%", deltaNote: "vs last month", color: "#60a5fa", sparkline: [2.2, 2.1, 2.1, 2.0, 2.0, 1.9, 1.9, 1.9, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8] },
  { id: "top-reason", label: "TOP WASTE REASON", value: "Expired", delta: "—", deltaNote: "this month", color: "#a78bfa", sparkline: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { id: "waste-trend", label: "TREND", value: "−12%", delta: "−12%", deltaNote: "vs last month", color: "#a3e635", sparkline: [7.5, 7.3, 7.1, 6.9, 6.8, 6.6, 6.5, 6.4, 6.3, 6.3, 6.2, 6.2, 6.2, 6.2, 6.2, 6.2] },
] as const;

export interface WasteWeekBucket {
  weekLabel: string;
  byReason: Record<WasteReason, number>;
}
export const wasteByWeek: readonly WasteWeekBucket[] = (() => {
  const weeks: WasteWeekBucket[] = Array.from({ length: 5 }, (_, w) => ({
    weekLabel: `W${w + 1}`,
    byReason: Object.fromEntries(WASTE_REASONS.map((r) => [r, 0])) as Record<WasteReason, number>,
  }));
  for (const entry of wasteEntries) {
    const dayOfMonth = Number(entry.date.slice(-2));
    const weekIndex = Math.min(4, Math.floor((dayOfMonth - 1) / 7));
    weeks[weekIndex].byReason[entry.reason] = Math.round((weeks[weekIndex].byReason[entry.reason] + entry.cost) * 100) / 100;
  }
  return weeks;
})();

/* ================================================================== TRANSFERS */

export type TransferStatus = "Requested" | "Approved" | "In Transit" | "Received" | "Rejected";

export interface TransferLine {
  ingredientId: string;
  sentQty: number;
  receivedQty: number | null;
  unit: StockUnit;
}

export interface Transfer {
  id: string;
  fromBranch: Branch;
  toBranch: Branch;
  status: TransferStatus;
  requested: string;
  lines: readonly TransferLine[];
}

const TRANSFER_STATUS_CYCLE: readonly TransferStatus[] = ["In Transit", "Received", "Received", "Approved", "Requested", "Rejected", "In Transit"];

function buildTransferLines(seedIndex: number, status: TransferStatus): readonly TransferLine[] {
  const count = 2 + (seedIndex % 4);
  const lines: TransferLine[] = [];
  for (let j = 0; j < count; j++) {
    const row = stockRows[(seedIndex * 6 + j * 8) % stockRows.length];
    const sentQty = 5 + ((seedIndex + j) * 4) % 40;
    let receivedQty: number | null = null;
    if (status === "Received") receivedQty = j === 0 ? sentQty - 1 : sentQty;
    lines.push({ ingredientId: row.id, sentQty, receivedQty, unit: row.unit });
  }
  return lines;
}

export const transfers: readonly Transfer[] = Array.from({ length: 22 }, (_, i) => {
  const status = pick(TRANSFER_STATUS_CYCLE, i);
  const fromIdx = i % BRANCHES.length;
  let toIdx = (i + 2) % BRANCHES.length;
  if (toIdx === fromIdx) toIdx = (toIdx + 1) % BRANCHES.length;
  const day = 1 + ((i * 5) % 27);
  return {
    id: `TRF-${380 + i}`,
    fromBranch: BRANCHES[fromIdx],
    toBranch: BRANCHES[toIdx],
    status,
    requested: `2026-08-${pad2(day)}`,
    lines: buildTransferLines(i, status),
  };
});

export function transferValue(t: Transfer): number {
  return t.lines.reduce((sum, l) => sum + l.sentQty * (unitCostById.get(l.ingredientId) ?? 0), 0);
}

export const transfersKpis: readonly KpiCard[] = [
  { id: "in-transit", label: "IN TRANSIT", value: "7", delta: "+2", deltaNote: "vs yesterday", color: "#3B82F6", sparkline: [4, 5, 4, 5, 6, 5, 6, 5, 6, 7, 6, 7, 6, 7, 7, 7] },
  { id: "completed-week", label: "COMPLETED THIS WEEK", value: "23", delta: "+5", deltaNote: "vs last week", color: "#a3e635", sparkline: [12, 13, 14, 15, 16, 17, 18, 18, 19, 20, 20, 21, 22, 22, 23, 23] },
  { id: "value-in-transit", label: "VALUE IN TRANSIT", value: "SAR 18.4K", delta: "+2.1K", deltaNote: "vs yesterday", color: "#60a5fa", sparkline: [12, 13, 13.5, 14, 15, 15.5, 16, 16.5, 17, 17.3, 17.6, 17.9, 18.1, 18.2, 18.3, 18.4] },
  { id: "avg-transfer-time", label: "AVG TRANSFER TIME", value: "4.2 hrs", delta: "−0.3 hrs", deltaNote: "vs last week", color: "#a78bfa", sparkline: [5.2, 5.1, 5, 4.9, 4.8, 4.7, 4.6, 4.5, 4.4, 4.4, 4.3, 4.3, 4.2, 4.2, 4.2, 4.2] },
] as const;

/* ================================================================== PRODUCTION */

export type BatchStatus = "Planned" | "In Progress" | "Completed" | "Failed";

export interface ConsumedLine {
  ingredientId: string;
  theoretical: number;
  actual: number;
  unit: StockUnit;
}

export interface ProductionBatch {
  id: string;
  recipeId: string;
  plannedQty: number;
  actualYield: number;
  branch: Branch;
  started: string;
  status: BatchStatus;
  operator: string;
  notes: string;
  consumed: readonly ConsumedLine[];
}

const BATCH_STATUS_CYCLE: readonly BatchStatus[] = ["Completed", "Completed", "In Progress", "Planned", "Completed", "Failed", "Completed"];
const BATCH_NOTES = [
  "Standard prep, no issues.",
  "Ran short on garnish, substituted from pantry stock.",
  "Oven ran hot, slightly over-browned first tray.",
  "Extra batch requested for weekend rush.",
  "Delayed start — supplier delivery late.",
  "Quality check passed, no deviations.",
];

export const productionBatches: readonly ProductionBatch[] = Array.from({ length: 17 }, (_, i) => {
  const recipe = recipes[i % recipes.length];
  const status = pick(BATCH_STATUS_CYCLE, i);
  const plannedQty = 20 + ((i * 7) % 60);
  const yieldDriftPct = ((((i * 11) % 17) - 8) / 100);
  const actualYield = status === "Planned" ? 0 : Math.max(0, Math.round(plannedQty * (1 + yieldDriftPct)));
  const consumed: ConsumedLine[] = recipe.lines.map((line) => {
    const theoretical = Math.round(line.qty * plannedQty * 1000) / 1000;
    const actual = Math.round(theoretical * (1 + yieldDriftPct * 0.6) * 1000) / 1000;
    return { ingredientId: line.ingredientId, theoretical, actual, unit: line.unit };
  });
  const hour = 6 + (i % 12);
  return {
    id: `BATCH-${pad2(i + 1)}`,
    recipeId: recipe.id,
    plannedQty,
    actualYield,
    branch: pick(BRANCHES, i + 4),
    started: `2026-08-09 ${pad2(hour)}:${i % 2 === 0 ? "00" : "30"}`,
    status,
    operator: pick(STAFF_NAMES, i + 6),
    notes: pick(BATCH_NOTES, i),
    consumed,
  };
});

export function batchYieldVariancePct(batch: ProductionBatch): number {
  if (batch.plannedQty === 0) return 0;
  return ((batch.actualYield - batch.plannedQty) / batch.plannedQty) * 100;
}

export const productionKpis: readonly KpiCard[] = [
  { id: "batches-today", label: "BATCHES TODAY", value: "18", delta: "+3", deltaNote: "vs yesterday", color: "#a78bfa", sparkline: [10, 11, 12, 12, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 18] },
  { id: "in-progress", label: "IN PROGRESS", value: "5", delta: "+1", deltaNote: "right now", color: "#3B82F6", sparkline: [2, 3, 2, 3, 4, 3, 4, 3, 4, 5, 4, 5, 4, 5, 5, 5] },
  { id: "yield-variance", label: "YIELD VARIANCE", value: "−2.1%", delta: "−0.4%", deltaNote: "vs last week", color: "#fb923c", sparkline: [3.5, 3.3, 3.2, 3, 2.9, 2.8, 2.7, 2.6, 2.5, 2.4, 2.3, 2.3, 2.2, 2.2, 2.1, 2.1] },
  { id: "prep-cost", label: "PREP COST", value: "SAR 12.4K", delta: "+5.2%", deltaNote: "vs last week", color: "#60a5fa", sparkline: [9.5, 9.8, 10, 10.3, 10.6, 10.9, 11.1, 11.4, 11.6, 11.8, 12, 12.1, 12.2, 12.3, 12.3, 12.4] },
] as const;

export { money as formatMoney };
