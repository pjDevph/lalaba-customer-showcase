// src/theme/tokens.ts
// ─────────────────────────────────────────────────────────────────────────────
// Lalaba "Clean Trust" design tokens — the single source of truth for the
// customer app's visual language, ported from the Lalaba Design System.
// Components style via these tokens (inline style objects), matching the
// established pattern in the merchant app's src/theme/tokens.ts.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Color ────────────────────────────────────────────────────────────────────
export const C = {
  // Brand blue — the Lalaba icon blue, shared 1:1 with the partner app's
  // brand500/600 so both apps read as one brand on screen.
  primary: "#00AEEF",
  primaryPressed: "#0088CC",
  /** Primary on light surfaces (text + icons). #00AEEF is only ~2.2:1 on white,
   *  so anything that has to be *read* uses this darker step (partner brand700). */
  primaryText: "#0066A0",
  primaryTint: "#E6F7FE",
  primaryTint2: "#D0F0FD",
  /** Brand navy — the wordmark ink, used for the deep-blue plates. */
  navy: "#002E52",
  /** Accent yellow from the logo swoosh. Highlights only, never text on white. */
  accent: "#E9E95D",

  // Home Washer accent — unified onto brand blue (was a standalone teal
  // sub-brand; dropped 2026-08-21). Kept as its own token, not a raw C.primary
  // alias, since 10+ files key off C.washer/C.washerTint directly.
  washer: "#00AEEF",
  washerTint: "#E6F7FE",

  // Ink / text
  ink: "#172033",
  textPrimary: "#172033",
  textSecondary: "#475569",
  textMuted: "#667085",
  textTertiary: "#94A3B8",
  textInverse: "#FFFFFF",

  // Surfaces
  bg: "#F7F9FC", // screen background (slightly off-white)
  surface: "#FFFFFF",
  surfaceAlt: "#F1F5F9",
  surfaceSubtle: "#EEF2F7",
  overlay: "rgba(15, 23, 42, 0.5)",

  // Borders
  border: "#D9E1EA",
  borderSubtle: "#EEF2F7",
  borderStrong: "#CBD5E1",

  // Status
  success: "#168A55",
  successTint: "#E8F7EE",
  warning: "#F5A623",
  warningText: "#C77800",
  warningTint: "#FFF4E0",
  error: "#C9362B",
  errorTint: "#FEECEA",
  info: "#0EA5E9",
  infoTint: "#E0F2FE",

  // Proof / audit
  proofVerified: "#168A55",
  proofPending: "#F5A623",

  // Social
  google: "#EA4335",
  apple: "#000000",
} as const;

// ─── Spacing (4px base) ───────────────────────────────────────────────────────
export const SP = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  screen: 16, // mobile edge inset
  touch: 44, // min touch target
  tabBar: 72, // bottom nav height
  topBar: 56,
} as const;

// ─── Radius ───────────────────────────────────────────────────────────────────
export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 10, // inputs
  button: 12, // CTAs — the board renders every button at 12px
  lg: 14,
  xl: 18, // cards
  "2xl": 24, // modals
  "3xl": 32, // sheets / phone frame
  pill: 9999,
  full: 9999,
} as const;

// ─── Shadows (RN style objects) ───────────────────────────────────────────────
export const SHADOW = {
  none: {},
  sm: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  brand: {
    shadowColor: "#00AEEF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const FONT = {
  sans: "Plus Jakarta Sans",
  mono: "JetBrains Mono",
} as const;

// Type roles: [fontSize, fontWeight, lineHeight?]
export const TYPE = {
  pageTitle: { fontSize: 24, fontWeight: "700" as const, color: C.ink },
  section: { fontSize: 20, fontWeight: "700" as const, color: C.ink },
  cardTitle: { fontSize: 16, fontWeight: "600" as const, color: C.ink },
  subheading: { fontSize: 18, fontWeight: "600" as const, color: C.ink },
  body: { fontSize: 15, fontWeight: "400" as const, color: C.textPrimary },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const, color: C.ink },
  label: { fontSize: 13, fontWeight: "600" as const, color: C.ink },
  meta: { fontSize: 13, fontWeight: "400" as const, color: C.textMuted },
  caption: { fontSize: 12, fontWeight: "400" as const, color: C.textMuted },
  badge: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  data: { fontSize: 20, fontWeight: "700" as const, color: C.ink },
} as const;

// ─── Currency / units (PH locale, per DS content rules) ───────────────────────
// Money is centavos on the wire — always format from centavos.
// Prices are shown as whole pesos (no decimals) across the customer app —
// rounded for display. Pass { decimals: true } for the rare place that needs
// centavos precision.
export function peso(centavos: number, opts: { decimals?: boolean } = {}): string {
  const value = (centavos ?? 0) / 100;
  const decimals = opts.decimals === true;
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })}`;
}
export function kg(value: number): string {
  return `${value} kg`;
}
export function km(value: number): string {
  return `${value.toFixed(1)} km`;
}
// PH mobile: +63 917 123 4567 (input stored as 09XXXXXXXXX)
export function formatPhone(local: string): string {
  const digits = (local ?? "").replace(/\D/g, "").replace(/^0/, "");
  if (digits.length !== 10) return local;
  return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

// ─── Component presets ────────────────────────────────────────────────────────
export const COMP = {
  screen: { flex: 1, backgroundColor: C.bg },
  card: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: C.border,
    padding: SP.lg,
    ...SHADOW.sm,
  },
  input: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: SP.base,
    paddingVertical: SP.md,
    fontSize: 15,
    color: C.ink,
  },
} as const;

export type ProviderAccent = "merchant" | "washer";
export function accentColor(type: ProviderAccent): string {
  return type === "washer" ? C.washer : C.primary;
}
export function accentTint(type: ProviderAccent): string {
  return type === "washer" ? C.washerTint : C.primaryTint;
}
