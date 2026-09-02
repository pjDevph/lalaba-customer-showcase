// src/theme/icons.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Curated Lucide icon set for the Lalaba customer app, exposed by semantic name.
// 2px stroke, currentColor by default. Import the raw components directly, or use
// the typed <Icon name="..." /> helper when a name string is more convenient.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import {
  Truck,
  Store,
  Home,
  Scale,
  ShieldCheck,
  Camera,
  Images,
  Star,
  FileText,
  MessageCircle,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Ticket,
  Wallet,
  Search,
  ChevronRight,
  Check,
  X,
  Plus,
  Minus,
  Heart,
  ArrowLeft,
  ArrowUpDown,
  SlidersHorizontal,
  Clock,
  Bell,
  Info,
  CircleCheck,
  CircleAlert,
  Settings,
  UserRound,
  Mail,
  LogOut,
  Navigation,
  ShoppingBasket,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react-native";
import { C } from "./tokens";

// Re-export the raw components for direct use.
export {
  Truck,
  Store,
  Home,
  Scale,
  ShieldCheck,
  Camera,
  Images,
  Star,
  FileText,
  MessageCircle,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Ticket,
  Wallet,
  Search,
  ChevronRight,
  Check,
  X,
  Plus,
  Minus,
  Heart,
  ArrowLeft,
  ArrowUpDown,
  SlidersHorizontal,
  Clock,
  Info,
  CircleCheck,
  CircleAlert,
  Settings,
  UserRound,
  Mail,
  LogOut,
  Navigation,
  ShoppingBasket,
  LifeBuoy,
};
export type { LucideIcon };

// Semantic name → component registry.
export const ICONS = {
  truck: Truck,
  store: Store,
  home: Home,
  scale: Scale,
  shieldCheck: ShieldCheck,
  camera: Camera,
  images: Images,
  star: Star,
  fileText: FileText,
  messageCircle: MessageCircle,
  phone: Phone,
  mapPin: MapPin,
  calendar: Calendar,
  creditCard: CreditCard,
  ticket: Ticket,
  wallet: Wallet,
  search: Search,
  chevronRight: ChevronRight,
  check: Check,
  x: X,
  plus: Plus,
  minus: Minus,
  heart: Heart,
  arrowLeft: ArrowLeft,
  arrowUpDown: ArrowUpDown,
  slidersHorizontal: SlidersHorizontal,
  clock: Clock,
  bell: Bell,
  info: Info,
  circleCheck: CircleCheck,
  circleAlert: CircleAlert,
  settings: Settings,
  userRound: UserRound,
  mail: Mail,
  logOut: LogOut,
  navigation: Navigation,
  shoppingBasket: ShoppingBasket,
  lifeBuoy: LifeBuoy,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 22, color = C.ink, strokeWidth = 2 }: Readonly<IconProps>) {
  const Cmp = ICONS[name];
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}
