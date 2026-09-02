// src/types/api.ts
// ─────────────────────────────────────────────────────────────────────────────
// SHARED API TYPES — string-literal unions + object shapes that mirror the
// backend GraphQL SDL (LALABA_BE_DEV/src/schema.gql) exactly.
//
// ⚠️ ENUM CASING: GraphQL transmits the *SDL enum member name* on the wire, and
// the SDL names are UPPERCASE (e.g. `MERCHANT`, `PROVIDER_PICKUP`, `FREE_BATCH`)
// even though the backend maps them to lowercase internal values. So responses
// and variables use the UPPERCASE names — the unions below match the SDL, which
// is what actually crosses the wire. (This intentionally differs from the
// lowercase examples in the build brief; the lowercase strings are the BE's
// private internal values and never appear in GraphQL JSON.)
//
// MONEY: integer centavos on the wire. `Centavos` documents that intent; never
// format here — screens use peso() from src/theme/tokens.ts.

// ─────────────────────────────────────────────────────────────────────────────
// This module was a single 637-line file. It is now a barrel over one module
// per domain so no consumer had to change: `@/types/api` remains the single
// import surface, exactly as before.
// ─────────────────────────────────────────────────────────────────────────────

export * from "../enums";
export * from "./geo";
export * from "./identity";
export * from "./discovery";
export * from "./orders";
export * from "./ratings";
export * from "./chat";
export * from "./support";
