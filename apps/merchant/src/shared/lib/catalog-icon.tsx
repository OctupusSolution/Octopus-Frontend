// The catalog stores icons as names rather than component references, so it
// stays plain serialisable data that a real API could return unchanged.
// This is the one place those names become components.
import {
  UtensilsCrossed, Stethoscope, PawPrint, Scissors, ShoppingBag,
  Wine, Users, Zap, Coffee, Croissant, ChefHat, Truck, Utensils,
  PartyPopper, Flame, Palmtree, Home,
  Settings, ClipboardList, CreditCard, ReceiptText, BarChart3,
  CalendarClock, Package, Megaphone, UserCog, Wallet, MessageCircle, Plug,
  Heart, Building2, TrendingDown, Sparkles, ShieldCheck, MapPin, Bell, Repeat,
  Box, Blocks,
} from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  UtensilsCrossed, Stethoscope, PawPrint, Scissors, ShoppingBag,
  Wine, Users, Zap, Coffee, Croissant, ChefHat, Truck, Utensils,
  PartyPopper, Flame, Palmtree, Home,
  Settings, ClipboardList, CreditCard, ReceiptText, BarChart3,
  CalendarClock, Package, Megaphone, UserCog, Wallet, MessageCircle, Plug,
  Heart, Building2, TrendingDown, Sparkles, ShieldCheck, MapPin, Bell, Repeat,
  Blocks,
};

export function CatalogIcon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const Component = ICONS[name] ?? Box;
  return <Component size={size} className={className} />;
}
