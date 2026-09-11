// A stand-in for the reader until there is a backend that reads menus.
//
// Two things live here: the fixture a "detection" returns, and the clock that
// plays it back. Both are pure. The clock in particular is a function of
// elapsed time rather than a sequence of timers, so the progress bar, the
// checklist, the live counts and the preview boxes cannot drift apart — they
// are all the same number looked at four ways — and a test can ask what the
// screen shows at 3.2s without waiting 3.2s.
//
// Swapping this for a real service changes the page's session store and this
// file; the screens only ever see a DetectionResult and a DetectionProgress.

import {
  flatItems,
  summarizeItems,
  type DetectedItem,
  type DetectionResult,
  type DetectionSummary,
  type IssueKind,
} from "./ai-import";

export const UPLOAD_MS = 800;
export const PROCESSING_MS = 6500;

export const DETECTION_STEPS = [
  "extractText",
  "detectSections",
  "detectItems",
  "extractDescriptions",
  "mapAllergens",
  "finalizeScores",
] as const;
export type DetectionStep = (typeof DETECTION_STEPS)[number];
export type StepState = "done" | "active" | "pending";

/* ------------------------------------------------------------------ fixture */

type Row = [name: string, description: string, price: number | null, confidence: number, extra?: Partial<DetectedItem>];

// Sized so the summary reads 8 sections / 64 items / 59 high / 5 need review,
// with the five split 2 price-unclear, 2 description-short, 1 allergen-missing.
// Those five are the only rows below 90.
const FIXTURE: [section: string, rows: Row[]][] = [
  ["Starters", [
    ["Truffle Arancini", "Crispy risotto balls, truffle aioli", 38, 98, { allergens: ["gluten", "dairy"], dietary: ["vegetarian"] }],
    ["Burrata & Heirloom Tomatoes", "Basil oil, aged balsamic", 56, 96, { allergens: ["dairy"], dietary: ["vegetarian"] }],
    ["Lobster Bisque", "Rich lobster soup, chives", 52, 96, { allergens: ["shellfish", "dairy"] }],
    ["Hummus Trio", "Classic, beetroot and roasted pepper", 28, 95, { allergens: ["sesame"], dietary: ["vegan"] }],
    ["Crispy Calamari", "Lemon aioli, chilli salt", 42, 93, { allergens: ["fish", "eggs"] }],
    ["Beef Carpaccio", "Rocket, parmesan, capers", 48, 94, { allergens: ["dairy"], dietary: ["high-protein"] }],
    ["Stuffed Vine Leaves", "Rice, herbs, pomegranate molasses", 26, 92, { dietary: ["vegan"] }],
    ["Soup of the Day", "", null, 62, { issues: ["price-unclear"] }],
  ]],
  ["Salads", [
    ["Caesar Salad", "Romaine, parmesan, croutons, caesar dressing", 36, 97, { allergens: ["gluten", "dairy", "eggs"] }],
    ["Quinoa & Avocado Salad", "Mixed greens, lime dressing", 42, 94, { dietary: ["vegan", "gluten-free"] }],
    ["Greek Salad", "Feta, olives, cucumber, tomatoes", 34, 96, { allergens: ["dairy"], dietary: ["vegetarian"] }],
    ["Fattoush", "Crispy bread, sumac, pomegranate", 30, 95, { allergens: ["gluten"], dietary: ["vegan"] }],
    ["Grilled Halloumi Salad", "Watermelon, mint, pistachio", 44, 92, { allergens: ["dairy", "nuts"] }],
    ["Tabbouleh", "Parsley", 26, 78, { issues: ["description-short"], dietary: ["vegan"] }],
  ]],
  ["Mains", [
    ["Grilled Salmon", "Served with seasonal vegetables", 88, 97, { allergens: ["fish", "dairy"], dietary: ["high-protein", "gluten-free"] }],
    ["Chicken Supreme", "Mashed potatoes, green beans, mushroom sauce", 72, 95, { allergens: ["dairy"], dietary: ["high-protein"] }],
    ["Beef Tenderloin", "Grilled to perfection, red wine jus", 120, 96, { allergens: ["dairy"], dietary: ["high-protein"] }],
    ["Pasta Alfredo", "Creamy parmesan sauce, herb garnish", 64, 93, { allergens: ["gluten", "dairy"] }],
    ["Seafood Risotto", "Prawns, calamari, mussels", 78, 91, { allergens: ["shellfish", "dairy"] }],
    ["Lamb Chops", "Herb crust, rosemary jus", 110, 92, { dietary: ["high-protein"] }],
    ["Grilled Sea Bass", "Lemon butter sauce, seasonal veggies", 75, 92, { allergens: ["fish", "dairy"] }],
    ["Mixed Grill", "Kofta, shish tawook, lamb cutlets", 98, 94, { dietary: ["high-protein", "halal"] }],
    ["Chicken Biryani", "Basmati rice, raita, fried onions", 58, 95, { allergens: ["dairy"], dietary: ["halal", "spicy"] }],
    ["Vegetable Tagine", "Chickpeas, apricots, couscous", 52, 93, { allergens: ["gluten"], dietary: ["vegan"] }],
    ["Butter Chicken", "Tomato cream sauce, naan bread", 62, 96, { allergens: ["dairy", "gluten"], dietary: ["halal"] }],
    ["Catch of the Day", "Market fish, grilled or fried", null, 58, { allergens: ["fish"], issues: ["price-unclear"] }],
  ]],
  ["Pasta", [
    ["Spaghetti Bolognese", "Slow-cooked beef ragù, parmesan", 54, 96, { allergens: ["gluten", "dairy"] }],
    ["Penne Arrabbiata", "Spicy tomato sauce, garlic, basil", 46, 95, { allergens: ["gluten"], dietary: ["vegan", "spicy"] }],
    ["Fettuccine Carbonara", "Beef bacon, egg yolk, pecorino", 58, 94, { allergens: ["gluten", "eggs", "dairy"] }],
    ["Lobster Linguine", "Cherry tomatoes, chilli, white wine", 96, 92, { allergens: ["gluten", "shellfish"] }],
    ["Pesto Gnocchi", "Basil pesto, pine nuts, parmesan", 52, 93, { allergens: ["gluten", "nuts", "dairy"] }],
    ["Mushroom Ravioli", "Sage butter, truffle shavings", 60, 91, { allergens: ["gluten", "dairy", "eggs"], dietary: ["vegetarian"] }],
    ["Lasagne al Forno", "Layered beef ragù, béchamel", 56, 95, { allergens: ["gluten", "dairy"] }],
    ["Shrimp Aglio e Olio", "Garlic, olive oil, parsley, chilli", 64, 90, { allergens: ["gluten", "shellfish"] }],
  ]],
  ["Burgers", [
    ["Classic Beef Burger", "Cheddar, pickles, house sauce, fries", 49, 97, { allergens: ["gluten", "dairy"] }],
    ["Truffle Mushroom Burger", "Swiss cheese, truffle mayo", 58, 95, { allergens: ["gluten", "dairy", "eggs"] }],
    ["Crispy Chicken Burger", "Coleslaw, spicy mayo, brioche bun", 44, 96, { allergens: ["gluten", "eggs"], dietary: ["spicy"] }],
    ["Double Smash Burger", "Two patties, american cheese, onions", 62, 94, { allergens: ["gluten", "dairy"] }],
    ["Plant-Based Burger", "Beyond patty, vegan cheese, lettuce", 52, 93, { allergens: ["gluten", "soy"], dietary: ["vegan"] }],
    ["Lamb Kofta Burger", "Tzatziki, pickled onions, pita bun", 54, 92, { allergens: ["gluten", "dairy"] }],
    ["Kids Mini Burger", "Beef slider with fries and ketchup", 32, 95, { allergens: ["gluten"] }],
  ]],
  ["Sandwiches", [
    ["Club Sandwich", "Chicken, turkey bacon, egg, fries", 42, 96, { allergens: ["gluten", "eggs"] }],
    ["Steak Sandwich", "Caramelised onions, mustard mayo", 56, 94, { allergens: ["gluten", "eggs"] }],
    ["Halloumi Wrap", "Grilled vegetables, pesto", 38, 93, { allergens: ["gluten", "dairy", "nuts"], dietary: ["vegetarian"] }],
    ["Tuna Melt", "Cheddar, red onion, sourdough", 36, 91, { allergens: ["gluten", "fish", "dairy"] }],
    ["Chicken Shawarma", "Garlic toum, pickles, fries", 34, 97, { allergens: ["gluten"], dietary: ["halal"] }],
    ["Falafel Pita", "Tahini, salad, pickled turnip", 28, 95, { allergens: ["gluten", "sesame"], dietary: ["vegan"] }],
    ["Grilled Cheese", "Toast", 30, 84, { issues: ["description-short"], allergens: ["gluten", "dairy"], dietary: ["vegetarian"] }],
  ]],
  ["Desserts", [
    ["Chocolate Lava Cake", "Vanilla ice cream", 36, 96, { allergens: ["gluten", "dairy", "eggs"], dietary: ["vegetarian"] }],
    ["Cheesecake", "Berry compote", 32, 94, { allergens: ["gluten", "dairy", "eggs"] }],
    ["Tiramisu", "Classic Italian recipe", 34, 96, { allergens: ["gluten", "dairy", "eggs"] }],
    ["Kunafa", "Sweet cheese, pistachio, rose syrup", 38, 95, { allergens: ["gluten", "dairy", "nuts"] }],
    ["Crème Brûlée", "Madagascar vanilla, caramel crust", 30, 93, { allergens: ["dairy", "eggs"] }],
    ["Date Pudding", "Toffee sauce, clotted cream", 32, 92, { allergens: ["gluten", "dairy"] }],
    ["Fresh Fruit Platter", "Seasonal fruits, mint syrup", 28, 97, { dietary: ["vegan", "gluten-free"] }],
    ["Pistachio Ice Cream Trio", "Three scoops with wafer crumbs", 26, 88, { issues: ["allergen-missing"] }],
  ]],
  ["Drinks", [
    ["Fresh Orange Juice", "Freshly squeezed oranges", 18, 99, { dietary: ["vegan"] }],
    ["Lemonade", "Fresh lemon, a touch of mint", 16, 98, { dietary: ["vegan"] }],
    ["Iced Latte", "Double espresso over cold milk", 20, 97, { allergens: ["dairy"] }],
    ["Mango Smoothie", "Mango, banana, yoghurt", 22, 96, { allergens: ["dairy"], dietary: ["vegetarian"] }],
    ["Mint Lemonade", "Blended lemon and fresh mint", 18, 95, { dietary: ["vegan"] }],
    ["Arabic Coffee", "Cardamom, served with dates", 14, 94, { dietary: ["vegan"] }],
    ["Karak Tea", "Spiced milk tea, saffron", 12, 93, { allergens: ["dairy"] }],
    ["Sparkling Water", "Chilled San Pellegrino 500ml", 12, 99, { dietary: ["vegan"] }],
  ]],
];

// Warm, food-like pairs; one per section so a table of mains does not look
// like a table of drinks.
const DISH_TONES: [plate: string, food: string, garnish: string][] = [
  ["#f4efe6", "#d9a05b", "#6b8e4e"],
  ["#eef3ea", "#8fbf6a", "#d65a4a"],
  ["#f3ede6", "#c7773f", "#5f8b4c"],
  ["#f6f0e2", "#e8c27a", "#7a9a5a"],
  ["#f2ece4", "#9a5a35", "#e0b050"],
  ["#f5efe5", "#d8b07a", "#b85c3c"],
  ["#f7eee9", "#6b3a2a", "#e6a6b0"],
  ["#eef4f6", "#f2a33a", "#79b85a"],
];

/** A small plated-dish illustration as an SVG data URL. There are no food
 *  photographs in the asset set, and a data URL is the same kind of string an
 *  uploaded photo becomes (see use-file-picker), so it flows into the builder
 *  like one. Varies by index so neighbouring rows are distinguishable. */
export function dishArt(sectionIndex: number, itemIndex: number): string {
  const [plate, sectionFood, garnish] = DISH_TONES[sectionIndex % DISH_TONES.length];
  // The section sets the plate and garnish; the food itself shifts per item so
  // a column of starters is not eight copies of one picture.
  const food = [sectionFood, ...DISH_TONES.map((tone) => tone[1])][(itemIndex * 3) % (DISH_TONES.length + 1)];
  const r = 15 + ((itemIndex * 7) % 6);
  const dx = ((itemIndex * 13) % 9) - 4;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 72">` +
    `<rect width="96" height="72" fill="#3b2f2a"/>` +
    `<ellipse cx="48" cy="38" rx="40" ry="30" fill="#00000033"/>` +
    `<ellipse cx="48" cy="36" rx="38" ry="28" fill="${plate}"/>` +
    `<ellipse cx="48" cy="36" rx="29" ry="21" fill="none" stroke="#00000014" stroke-width="2"/>` +
    `<ellipse cx="${48 + dx}" cy="36" rx="${r}" ry="${r * 0.72}" fill="${food}"/>` +
    `<circle cx="${40 + dx}" cy="31" r="4" fill="${garnish}"/>` +
    `<circle cx="${55 + dx}" cy="40" r="3.5" fill="${garnish}"/>` +
    `<circle cx="${50 + dx}" cy="29" r="2.5" fill="#ffffffaa"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The detection the mock reader "finds" in any file. Ids are stable so tests
 *  and screenshots can address a particular item. */
export function mockDetection(fileName: string): DetectionResult {
  return {
    restaurant: { name: "Ocean View", tagline: "Restaurant" },
    fileName,
    pages: 2,
    sections: FIXTURE.map(([name, rows], s) => ({
      id: `ai-s${s + 1}`,
      name,
      items: rows.map(([itemName, description, price, confidence, extra], i) => ({
        id: `ai-s${s + 1}-i${i + 1}`,
        name: itemName,
        description,
        price,
        confidence,
        allergens: [],
        dietary: [],
        image: dishArt(s, i),
        issues: [] as IssueKind[],
        reviewed: false,
        ...extra,
      })),
    })),
  };
}

/* -------------------------------------------------------------------- clock */

export interface DetectionProgress {
  /** 0–100, whole. */
  percent: number;
  steps: StepState[];
  /** Live counts over what has been "found" so far. */
  summary: DetectionSummary;
  /** Ids of the items whose boxes the preview may draw so far. */
  revealed: ReadonlySet<string>;
  /** Sections whose heading the preview may draw so far. */
  revealedSections: number;
  done: boolean;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** What the processing screen shows `elapsedMs` into processing (upload time
 *  excluded). Sections appear during step 2, items during steps 3–4, and the
 *  confidence counts only settle once items are found, so "59 high" is never
 *  claimed about items not yet on screen. */
export function detectionProgress(elapsedMs: number, result: DetectionResult): DetectionProgress {
  const f = clamp01(elapsedMs / PROCESSING_MS);
  const stepSpan = 1 / DETECTION_STEPS.length;
  const steps = DETECTION_STEPS.map((_, i): StepState => {
    if (f >= (i + 1) * stepSpan || f === 1) return "done";
    if (f >= i * stepSpan) return "active";
    return "pending";
  });

  const all = flatItems(result);
  const sectionShare = clamp01((f - stepSpan) / stepSpan);
  const itemShare = clamp01((f - 2 * stepSpan) / (2 * stepSpan));
  const revealedSections = Math.round(result.sections.length * sectionShare);
  const itemCount = Math.round(all.length * itemShare);
  const found = all.slice(0, itemCount);

  return {
    percent: Math.round(f * 100),
    steps,
    summary: summarizeItems(revealedSections, found),
    revealed: new Set(found.map((i) => i.id)),
    revealedSections,
    done: f === 1,
  };
}
