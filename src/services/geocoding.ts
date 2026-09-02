// src/services/geocoding.ts
// Address autocomplete + reverse geocoding via Nominatim (OpenStreetMap).
// No API key required — the merchant app uses the same service for its address
// picker. Results are restricted to the Philippines.

const NOMINATIM_UA = "LalabaCustomerApp/1.0 (support@lalaba.ph)";
const BASE = "https://nominatim.openstreetmap.org";

interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  suburb?: string;
  village?: string;
  neighbourhood?: string;
  quarter?: string;
  city?: string;
  town?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  postcode?: string;
}

interface NominatimResult {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
}

/** A place suggestion, already mapped onto the BE's AddressInput shape. */
export interface PlaceSuggestion {
  id: string;
  /** Bold first line — the most specific part of the place name. */
  title: string;
  /** Muted second line — the rest of the display name. */
  subtitle: string;
  latitude: number;
  longitude: number;
  streetAddress: string;
  barangayName: string;
  cityMunicipalityName: string;
  provinceName: string;
  regionName: string;
  zipCode: string;
}

function mapResult(r: NominatimResult): PlaceSuggestion {
  const a = r.address ?? {};
  const parts = r.display_name.split(",").map((p) => p.trim());
  const street = [a.house_number, a.road ?? a.pedestrian].filter(Boolean).join(" ");
  return {
    id: String(r.place_id),
    title: parts[0] ?? r.display_name,
    subtitle: parts.slice(1).join(", ").replace(/,?\s*Philippines$/i, ""),
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
    streetAddress: street,
    barangayName: a.suburb ?? a.village ?? a.neighbourhood ?? a.quarter ?? "",
    cityMunicipalityName: a.city ?? a.town ?? a.municipality ?? a.county ?? "",
    provinceName: a.state ?? "",
    regionName: a.region ?? (a.state === "Metro Manila" ? "National Capital Region" : ""),
    zipCode: a.postcode ?? "",
  };
}

/**
 * Autocomplete Philippine places. Returns [] for short queries, network errors
 * or aborted requests — the caller just shows nothing.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 3) return [];
  try {
    const url =
      `${BASE}/search?format=json&countrycodes=ph&limit=6&addressdetails=1` +
      `&accept-language=en&q=${encodeURIComponent(query.trim())}`;
    const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_UA }, signal });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimResult[];
    return data.map(mapResult);
  } catch {
    return [];
  }
}

/** Reverse geocode a coordinate to a suggestion, or null if unavailable. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<PlaceSuggestion | null> {
  try {
    const url =
      `${BASE}/reverse?format=json&addressdetails=1&zoom=17&accept-language=en` +
      `&lat=${latitude}&lon=${longitude}`;
    const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_UA } });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult;
    if (!data?.display_name) return null;
    return mapResult(data);
  } catch {
    return null;
  }
}

/** "Barangay, City" short label for a suggestion — used for the GPS row. */
export function shortLocality(s: PlaceSuggestion): string {
  return [s.cityMunicipalityName, s.provinceName].filter(Boolean).join(", ") || s.subtitle;
}
