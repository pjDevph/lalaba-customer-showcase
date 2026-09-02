// src/lib/recentSearches.ts
// Session-scoped recent searches, shared by the Home search overlay and the
// full search-results screen (module-level so they survive remounts).

export const RECENTS: string[] = ["wash and fold", "comforter cleaning", "CleanWave"];

export function pushRecent(term: string): void {
  const t = term.trim();
  if (!t) return;
  const existing = RECENTS.indexOf(t);
  if (existing >= 0) RECENTS.splice(existing, 1);
  RECENTS.unshift(t);
  if (RECENTS.length > 8) RECENTS.length = 8;
}

export function clearRecents(): void {
  RECENTS.length = 0;
}
