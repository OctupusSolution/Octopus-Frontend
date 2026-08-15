// Mock data for the Delivery module (Dispatch Board, Zones, Drivers,
// Aggregator Channels). Stands in for @octopus/api-client until the backend
// publishes a real OpenAPI spec — shape mirrors what a real query would
// return, so swapping this for TanStack Query hooks later is a drop-in change.

/* ------------------------------------------------------------- zone shapes */
// Deterministic irregular-polygon generator (no chart library, no Math.random)
// so every zone gets a distinct but stable "simple shape" for its thumbnail
// and for its placement on the mini overview map.
export function polygon(cx: number, cy: number, r: number, sides: number, seed: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const wobble = 0.72 + 0.28 * Math.abs(Math.sin(seed * (i + 1) * 1.7));
    const x = cx + r * wobble * Math.cos(angle);
    const y = cy + r * wobble * Math.sin(angle);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

/* ----------------------------------------------------------------- zones */

export type City = "Riyadh" | "Jeddah" | "Dammam" | "Khobar";

export interface FeeBand {
  band: string;
  fee: number;
}

export interface BlackoutWindow {
  day: string;
  start: string;
  end: string;
  reason: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  city: City;
  color: string;
  districts: string[];
  fee: number;
  minOrder: number;
  avgDeliveryMin: number;
  active: boolean;
  sizeKm2: number;
  /** normalised 0-40 viewBox shape, reused for the card thumbnail */
  thumbShape: string;
  /** approximate real-world center, for the coverage map */
  lat: number;
  lng: number;
  feeRules: FeeBand[];
  surgeEnabled: boolean;
  blackoutHours: BlackoutWindow[];
}

const ZONE_SEED: Array<{
  id: string;
  name: string;
  city: City;
  color: string;
  districts: string[];
  fee: number;
  minOrder: number;
  avgDeliveryMin: number;
  sizeKm2: number;
  lat: number;
  lng: number;
  seed: number;
  surgeEnabled: boolean;
}> = [
  { id: "zn-olaya-n", name: "Olaya North", city: "Riyadh", color: "#2ec9c0", districts: ["Olaya", "King Fahd"], fee: 12, minOrder: 60, avgDeliveryMin: 28, sizeKm2: 14.6, lat: 24.6940, lng: 46.6850, seed: 1.1, surgeEnabled: true },
  { id: "zn-olaya-s", name: "Olaya South", city: "Riyadh", color: "#22c9d9", districts: ["Al Mohammadiyah", "Sahafah"], fee: 9, minOrder: 50, avgDeliveryMin: 26, sizeKm2: 9.8, lat: 24.7450, lng: 46.6300, seed: 2.3, surgeEnabled: false },
  { id: "zn-narjis", name: "Narjis", city: "Riyadh", color: "#5b8def", districts: ["Narjis", "Al Yasmin"], fee: 14, minOrder: 70, avgDeliveryMin: 32, sizeKm2: 11.2, lat: 24.8300, lng: 46.6500, seed: 3.7, surgeEnabled: true },
  { id: "zn-malqa", name: "Al Malqa", city: "Riyadh", color: "#8b7cf0", districts: ["Malqa", "Al Nargis West"], fee: 15, minOrder: 75, avgDeliveryMin: 34, sizeKm2: 10.4, lat: 24.8100, lng: 46.6100, seed: 4.2, surgeEnabled: false },
  { id: "zn-hittin", name: "Hittin", city: "Riyadh", color: "#4c35d4", districts: ["Hittin", "Al Aqiq"], fee: 12, minOrder: 65, avgDeliveryMin: 30, sizeKm2: 9.1, lat: 24.7700, lng: 46.6000, seed: 5.6, surgeEnabled: false },
  { id: "zn-sulaimaniyah", name: "Sulaimaniyah", city: "Riyadh", color: "#a78bfa", districts: ["Sulaimaniyah", "Al Muruj"], fee: 9, minOrder: 45, avgDeliveryMin: 24, sizeKm2: 7.8, lat: 24.7100, lng: 46.6700, seed: 6.4, surgeEnabled: false },
  { id: "zn-corniche-jed", name: "Corniche North", city: "Jeddah", color: "#60a5fa", districts: ["Corniche", "Al Shatea"], fee: 11, minOrder: 55, avgDeliveryMin: 27, sizeKm2: 10.9, lat: 21.5700, lng: 39.1300, seed: 7.9, surgeEnabled: true },
  { id: "zn-rawdah", name: "Al Rawdah", city: "Jeddah", color: "#a3e635", districts: ["Rawdah", "Zahra"], fee: 11, minOrder: 55, avgDeliveryMin: 29, sizeKm2: 9.5, lat: 21.5800, lng: 39.1700, seed: 8.3, surgeEnabled: false },
  { id: "zn-hamra", name: "Al Hamra", city: "Jeddah", color: "#fb923c", districts: ["Hamra", "Andalus"], fee: 15, minOrder: 80, avgDeliveryMin: 36, sizeKm2: 12.1, lat: 21.5500, lng: 39.1600, seed: 9.1, surgeEnabled: true },
  { id: "zn-corniche-dmm", name: "Dammam Corniche", city: "Dammam", color: "#f472b6", districts: ["Corniche", "Al Shati"], fee: 10, minOrder: 50, avgDeliveryMin: 25, sizeKm2: 8.9, lat: 26.4500, lng: 50.1000, seed: 10.5, surgeEnabled: false },
  { id: "zn-faisaliyah", name: "Al Faisaliyah", city: "Dammam", color: "#34d399", districts: ["Faisaliyah", "Al Adama"], fee: 12, minOrder: 60, avgDeliveryMin: 31, sizeKm2: 10.1, lat: 26.3800, lng: 50.1200, seed: 11.2, surgeEnabled: false },
  { id: "zn-rakah", name: "Khobar Rakah", city: "Khobar", color: "#facc15", districts: ["Rakah", "Al Aqrabiyah"], fee: 9, minOrder: 45, avgDeliveryMin: 23, sizeKm2: 7.2, lat: 26.3000, lng: 50.2100, seed: 12.6, surgeEnabled: false },
];

export const deliveryZones: readonly DeliveryZone[] = ZONE_SEED.map((z) => ({
  id: z.id,
  name: z.name,
  city: z.city,
  color: z.color,
  districts: z.districts,
  fee: z.fee,
  minOrder: z.minOrder,
  avgDeliveryMin: z.avgDeliveryMin,
  active: true,
  sizeKm2: z.sizeKm2,
  thumbShape: polygon(20, 20, 16, 6, z.seed),
  lat: z.lat,
  lng: z.lng,
  feeRules: [
    { band: "0–3 km", fee: z.fee },
    { band: "3–6 km", fee: z.fee + 5 },
    { band: "6–10 km", fee: z.fee + 10 },
    { band: "10+ km", fee: z.fee + 18 },
  ],
  surgeEnabled: z.surgeEnabled,
  blackoutHours: [
    { day: "Friday", start: "12:00", end: "13:30", reason: "Jumu'ah prayer" },
    ...(z.city === "Riyadh" ? [{ day: "Daily", start: "14:00", end: "16:00", reason: "Asr prayer + kitchen changeover" }] : []),
  ],
}));

export const uncoveredRequestsCount = 34;

/* ---------------------------------------------------------------- drivers */

export type VehicleType = "Motorcycle" | "Car";
export type DriverStatus = "Online" | "On Delivery" | "Break" | "Offline";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: VehicleType;
  zone: string;
  status: DriverStatus;
  activeOrder: string | null;
  deliveriesToday: number;
  avgTimeMin: number;
  rating: number;
  totalDeliveries: number;
  earningsThisMonth: number;
}

export const drivers: readonly Driver[] = [
  // Status mix (7 Online · 11 On Delivery · 3 Break · 4 Offline) yields the
  // exact dispatch KPIs: 18 online, 11 on delivery, avg 4.7, 284 today.
  { id: "drv-01", name: "Abdullah Al-Shammari", phone: "+966 50 123 4501", vehicle: "Motorcycle", zone: "Olaya North", status: "On Delivery", activeOrder: "ORD-10432", deliveriesToday: 17, avgTimeMin: 24, rating: 4.9, totalDeliveries: 3120, earningsThisMonth: 5840 },
  { id: "drv-02", name: "Turki Al-Anzi", phone: "+966 55 234 5502", vehicle: "Motorcycle", zone: "Narjis", status: "On Delivery", activeOrder: "ORD-10430", deliveriesToday: 16, avgTimeMin: 29, rating: 4.9, totalDeliveries: 2210, earningsThisMonth: 4920 },
  { id: "drv-03", name: "Yousef Al-Rashidi", phone: "+966 54 345 6503", vehicle: "Car", zone: "Corniche North", status: "On Delivery", activeOrder: "ORD-10428", deliveriesToday: 16, avgTimeMin: 33, rating: 4.9, totalDeliveries: 1840, earningsThisMonth: 4310 },
  { id: "drv-04", name: "Bandar Al-Juhani", phone: "+966 56 456 7504", vehicle: "Motorcycle", zone: "Olaya North", status: "Online", activeOrder: null, deliveriesToday: 15, avgTimeMin: 22, rating: 4.8, totalDeliveries: 3980, earningsThisMonth: 6210 },
  { id: "drv-05", name: "Salem Al-Ghamdi", phone: "+966 50 567 8505", vehicle: "Motorcycle", zone: "Dammam Corniche", status: "On Delivery", activeOrder: "ORD-10424", deliveriesToday: 15, avgTimeMin: 26, rating: 4.8, totalDeliveries: 2650, earningsThisMonth: 5390 },
  { id: "drv-06", name: "Rania Al-Amri", phone: "+966 53 678 9506", vehicle: "Car", zone: "Narjis", status: "Online", activeOrder: null, deliveriesToday: 14, avgTimeMin: 27, rating: 4.8, totalDeliveries: 1590, earningsThisMonth: 3870 },
  { id: "drv-07", name: "Maha Al-Tamimi", phone: "+966 55 789 0507", vehicle: "Motorcycle", zone: "Al Rawdah", status: "On Delivery", activeOrder: "ORD-10420", deliveriesToday: 15, avgTimeMin: 25, rating: 4.8, totalDeliveries: 2980, earningsThisMonth: 5710 },
  { id: "drv-08", name: "Dana Al-Otaibi", phone: "+966 54 890 1508", vehicle: "Motorcycle", zone: "Olaya North", status: "On Delivery", activeOrder: "ORD-10418", deliveriesToday: 14, avgTimeMin: 23, rating: 4.7, totalDeliveries: 4120, earningsThisMonth: 6480 },
  { id: "drv-09", name: "Fahad Al-Rashid", phone: "+966 56 901 2509", vehicle: "Motorcycle", zone: "Al Malqa", status: "Break", activeOrder: null, deliveriesToday: 12, avgTimeMin: 31, rating: 4.7, totalDeliveries: 1240, earningsThisMonth: 3020 },
  { id: "drv-10", name: "Reem Al-Anazi", phone: "+966 50 012 3510", vehicle: "Car", zone: "Hittin", status: "Online", activeOrder: null, deliveriesToday: 14, avgTimeMin: 30, rating: 4.7, totalDeliveries: 1970, earningsThisMonth: 4460 },
  { id: "drv-11", name: "Omar Al-Juhani", phone: "+966 55 123 4511", vehicle: "Motorcycle", zone: "Sulaimaniyah", status: "Online", activeOrder: null, deliveriesToday: 13, avgTimeMin: 21, rating: 4.7, totalDeliveries: 2410, earningsThisMonth: 4980 },
  { id: "drv-12", name: "Abdulaziz Al-Shehri", phone: "+966 54 234 5512", vehicle: "Motorcycle", zone: "Al Hamra", status: "On Delivery", activeOrder: "ORD-10416", deliveriesToday: 14, avgTimeMin: 34, rating: 4.7, totalDeliveries: 1680, earningsThisMonth: 3940 },
  { id: "drv-13", name: "Lama Al-Qurashi", phone: "+966 53 345 6513", vehicle: "Car", zone: "Al Faisaliyah", status: "Offline", activeOrder: null, deliveriesToday: 0, avgTimeMin: 28, rating: 4.7, totalDeliveries: 980, earningsThisMonth: 2150 },
  { id: "drv-14", name: "Yazeed Al-Amri", phone: "+966 56 456 7514", vehicle: "Motorcycle", zone: "Khobar Rakah", status: "On Delivery", activeOrder: "ORD-10414", deliveriesToday: 13, avgTimeMin: 20, rating: 4.6, totalDeliveries: 3560, earningsThisMonth: 6050 },
  { id: "drv-15", name: "Sultan Al-Zahrani", phone: "+966 50 567 8515", vehicle: "Motorcycle", zone: "Olaya South", status: "Online", activeOrder: null, deliveriesToday: 13, avgTimeMin: 25, rating: 4.6, totalDeliveries: 2050, earningsThisMonth: 4390 },
  { id: "drv-16", name: "Ghada Al-Harthi", phone: "+966 55 678 9516", vehicle: "Car", zone: "Corniche North", status: "Break", activeOrder: null, deliveriesToday: 10, avgTimeMin: 32, rating: 4.6, totalDeliveries: 1120, earningsThisMonth: 2680 },
  { id: "drv-17", name: "Bandar Al-Dosari", phone: "+966 54 789 0517", vehicle: "Motorcycle", zone: "Narjis", status: "On Delivery", activeOrder: "ORD-10412", deliveriesToday: 13, avgTimeMin: 27, rating: 4.6, totalDeliveries: 2790, earningsThisMonth: 5220 },
  { id: "drv-18", name: "Alanoud Al-Saud", phone: "+966 56 890 1518", vehicle: "Car", zone: "Al Rawdah", status: "Offline", activeOrder: null, deliveriesToday: 0, avgTimeMin: 29, rating: 4.6, totalDeliveries: 760, earningsThisMonth: 1840 },
  { id: "drv-19", name: "Naif Al-Qahtani", phone: "+966 50 901 2519", vehicle: "Motorcycle", zone: "Al Malqa", status: "On Delivery", activeOrder: "ORD-10408", deliveriesToday: 14, avgTimeMin: 24, rating: 4.6, totalDeliveries: 3340, earningsThisMonth: 5760 },
  { id: "drv-20", name: "Aisha Al-Rasheed", phone: "+966 55 012 3520", vehicle: "Motorcycle", zone: "Hittin", status: "Online", activeOrder: null, deliveriesToday: 12, avgTimeMin: 23, rating: 4.5, totalDeliveries: 1890, earningsThisMonth: 4120 },
  { id: "drv-21", name: "Saud Al-Muwallad", phone: "+966 54 123 4521", vehicle: "Motorcycle", zone: "Dammam Corniche", status: "On Delivery", activeOrder: "ORD-10404", deliveriesToday: 13, avgTimeMin: 26, rating: 4.5, totalDeliveries: 3870, earningsThisMonth: 6180 },
  { id: "drv-22", name: "Haifa Al-Malki", phone: "+966 53 234 5522", vehicle: "Car", zone: "Al Hamra", status: "Offline", activeOrder: null, deliveriesToday: 0, avgTimeMin: 33, rating: 4.5, totalDeliveries: 640, earningsThisMonth: 1520 },
  { id: "drv-23", name: "Khalid Al-Otaibi", phone: "+966 56 345 6523", vehicle: "Motorcycle", zone: "Al Faisaliyah", status: "Break", activeOrder: null, deliveriesToday: 8, avgTimeMin: 30, rating: 4.5, totalDeliveries: 1360, earningsThisMonth: 3210 },
  { id: "drv-24", name: "Noura Al-Ghamdi", phone: "+966 50 456 7524", vehicle: "Motorcycle", zone: "Sulaimaniyah", status: "Online", activeOrder: null, deliveriesToday: 13, avgTimeMin: 22, rating: 4.4, totalDeliveries: 2130, earningsThisMonth: 4570 },
  { id: "drv-25", name: "Faisal Al-Dosari", phone: "+966 55 567 8525", vehicle: "Motorcycle", zone: "Khobar Rakah", status: "Offline", activeOrder: null, deliveriesToday: 0, avgTimeMin: 27, rating: 4.3, totalDeliveries: 1470, earningsThisMonth: 3330 },
] as const;

/* --------------------------------------------------------------- dispatch */

export type DispatchStage = "Unassigned" | "Assigned" | "Picked Up" | "On the Way" | "Delivered";

export interface DispatchOrder {
  id: string;
  orderNumber: string;
  customer: string;
  zone: string;
  driver: string | null;
  stage: DispatchStage;
  elapsedMinutes: number;
  itemCount: number;
  total: number;
}

const CUSTOMER_NAMES = [
  "Faisal Al-Otaibi", "Sara Al-Qahtani", "Mohammed Al-Harbi", "Layla Al-Zahrani", "Noura Al-Dosari",
  "Khalid Al-Mutairi", "Hind Al-Ghamdi", "Amal Al-Subai'i", "Fahad Al-Rashid", "Reem Al-Anazi",
  "Omar Al-Juhani", "Maha Al-Tamimi", "Abdulaziz Al-Shehri", "Lama Al-Qurashi", "Yazeed Al-Amri",
  "Sultan Al-Zahrani", "Ghada Al-Harthi", "Bandar Al-Dosari", "Alanoud Al-Saud", "Turki Al-Ghamdi",
  "Haifa Al-Malki", "Naif Al-Qahtani", "Aisha Al-Rasheed", "Saud Al-Muwallad", "Dana Al-Otaibi",
  "Mansour Al-Harbi", "Jawaher Al-Subaie", "Rakan Al-Enezi", "Shatha Al-Qahtani", "Talal Al-Zahrani",
  "Wafa Al-Ghamdi", "Nasser Al-Dosari", "Areej Al-Otaibi", "Hamad Al-Shammari", "Sara Al-Mutairi",
  "Ibrahim Al-Amri", "Munira Al-Harthi", "Fahd Al-Qurashi", "Rawan Al-Anzi", "Mishaal Al-Rashidi",
  "Latifah Al-Saud", "Ziyad Al-Juhani", "Nawal Al-Ghamdi", "Abdullah Al-Otaibi", "Sami Al-Dosari",
  "Manal Al-Qahtani", "Waleed Al-Zahrani", "Fatimah Al-Shehri",
];

const ZONE_NAMES = deliveryZones.map((z) => z.name);
const DRIVER_NAMES = drivers.map((d) => d.name);

function buildDispatchOrders(): DispatchOrder[] {
  // Stage plan: 7 Unassigned, 9 Assigned, 8 Picked Up, 15 On the Way, 8 Delivered = 47.
  const plan: Array<{ stage: DispatchStage; count: number }> = [
    { stage: "Unassigned", count: 7 },
    { stage: "Assigned", count: 9 },
    { stage: "Picked Up", count: 8 },
    { stage: "On the Way", count: 15 },
    { stage: "Delivered", count: 8 },
  ];
  // Exactly 5 late (>30 min, non-delivered) orders — indices into their stage slice.
  const lateSlots = new Set(["Assigned:2", "Picked Up:1", "Picked Up:5", "On the Way:3", "On the Way:9"]);

  let orderSeq = 10432;
  let rowIndex = 0;
  const rows: DispatchOrder[] = [];

  for (const { stage, count } of plan) {
    for (let i = 0; i < count; i++) {
      const customer = CUSTOMER_NAMES[rowIndex % CUSTOMER_NAMES.length];
      const zone = ZONE_NAMES[rowIndex % ZONE_NAMES.length];
      const isLate = lateSlots.has(`${stage}:${i}`);
      const elapsedMinutes =
        stage === "Unassigned"
          ? 2 + ((rowIndex * 3) % 10)
          : stage === "Delivered"
          ? 18 + ((rowIndex * 5) % 25)
          : isLate
          ? 31 + ((rowIndex * 2) % 14)
          : 3 + ((rowIndex * 4) % 26);
      const driver = stage === "Unassigned" ? null : DRIVER_NAMES[rowIndex % DRIVER_NAMES.length];
      const itemCount = 1 + ((rowIndex * 2) % 6);
      const total = 42 + ((rowIndex * 17) % 180);

      rows.push({
        id: `DSP-${500 - rowIndex}`,
        orderNumber: `ORD-${orderSeq - rowIndex}`,
        customer,
        zone,
        driver,
        stage,
        elapsedMinutes,
        itemCount,
        total,
      });
      rowIndex++;
    }
  }
  return rows;
}

export const dispatchOrders: readonly DispatchOrder[] = buildDispatchOrders();

export const dispatchStageOrder: readonly DispatchStage[] = [
  "Unassigned",
  "Assigned",
  "Picked Up",
  "On the Way",
  "Delivered",
];

/* ------------------------------------------------------------ aggregators */

export type AggregatorId = "hungerstation" | "jahez" | "keeta" | "toyou" | "ownapp";
export type AggregatorStatus = "Connected" | "Error" | "Not Connected" | "Syncing";
export type MenuSyncStatus = "Synced" | "Syncing" | "Out of Sync";

export interface AggregatorPartner {
  id: AggregatorId;
  name: string;
  brandColor: string;
  status: AggregatorStatus;
  ordersToday: number;
  revenueToday: number;
  commissionPercent: number;
  avgPrepTimeMin: number;
  autoAccept: boolean;
  menuSyncStatus: MenuSyncStatus;
  lastSyncMinutesAgo: number | null;
  outOfSyncItems: number;
}

export const aggregatorPartners: readonly AggregatorPartner[] = [
  { id: "hungerstation", name: "HungerStation", brandColor: "#F36F21", status: "Connected", ordersToday: 145, revenueToday: 21800, commissionPercent: 22, avgPrepTimeMin: 24, autoAccept: true, menuSyncStatus: "Synced", lastSyncMinutesAgo: 6, outOfSyncItems: 0 },
  { id: "jahez", name: "Jahez", brandColor: "#FF3D3D", status: "Connected", ordersToday: 118, revenueToday: 17200, commissionPercent: 20, avgPrepTimeMin: 22, autoAccept: true, menuSyncStatus: "Synced", lastSyncMinutesAgo: 12, outOfSyncItems: 0 },
  { id: "keeta", name: "Keeta", brandColor: "#FFC300", status: "Syncing", ordersToday: 62, revenueToday: 8600, commissionPercent: 18, avgPrepTimeMin: 27, autoAccept: false, menuSyncStatus: "Syncing", lastSyncMinutesAgo: 1, outOfSyncItems: 3 },
  { id: "toyou", name: "ToYou", brandColor: "#7C3AED", status: "Error", ordersToday: 34, revenueToday: 4700, commissionPercent: 30, avgPrepTimeMin: 25, autoAccept: true, menuSyncStatus: "Out of Sync", lastSyncMinutesAgo: 186, outOfSyncItems: 11 },
  { id: "ownapp", name: "Own App", brandColor: "#0D6EFD", status: "Connected", ordersToday: 53, revenueToday: 10100, commissionPercent: 0, avgPrepTimeMin: 19, autoAccept: true, menuSyncStatus: "Synced", lastSyncMinutesAgo: 2, outOfSyncItems: 0 },
] as const;
