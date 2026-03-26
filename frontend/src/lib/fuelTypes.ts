// Canonical fuel type definitions — abbreviation, color, and display name.
// Keep in sync with backend DB values.

export interface FuelTypeMeta {
  abbr: string;       // Short label shown in badges/chips
  color: string;      // Hex color for badge background accent
  label: string;      // Full Thai display name
}

const FUEL_META: Record<string, FuelTypeMeta> = {
  // ── Standard diesel ──────────────────────────────────────────────────
  'Diesel B7':    { abbr: 'B7',     color: '#ffd166', label: 'ดีเซล B7' },
  'Hi-Diesel':    { abbr: 'Hi-D',   color: '#ff9a3d', label: 'ไฮ-ดีเซล' },
  'Hi-Premium':   { abbr: 'Hi-P',   color: '#f59e0b', label: 'ไฮ-พรีเมียม' },

  // ── Gasohol / Ethanol ────────────────────────────────────────────────
  'Gasohol 95':   { abbr: 'G95',    color: '#2fe08d', label: 'แก๊สโซฮอล์ 95' },
  'Gasohol 91':   { abbr: 'G91',    color: '#67a6ff', label: 'แก๊สโซฮอล์ 91' },
  'Gasohol 97':   { abbr: 'Hi-97',  color: '#f59e0b', label: 'แก๊สโซฮอล์ 97' },
  'E20':          { abbr: 'E20',    color: '#32d9ff', label: 'เอทานอล E20' },
  'E85':          { abbr: 'E85',    color: '#a855f7', label: 'เอทานอล E85' },

  // ── NGV / LPG ────────────────────────────────────────────────────────
  'NGV':          { abbr: 'NGV',    color: '#69f0ae', label: 'NGV' },
  'LPG':          { abbr: 'LPG',    color: '#bd80f5', label: 'LPG' },
};

// Fuzzy fallback: match by lowercase keyword
function fuzzyMatch(raw: string): FuelTypeMeta | null {
  const t = raw.toLowerCase().replace(/[\s_-]/g, '');
  if (t.includes('hi') && t.includes('diesel')) return FUEL_META['Hi-Diesel'];
  if (t.includes('premium') && t.includes('diesel')) return FUEL_META['Hi-Diesel'];
  if (t.includes('hipremium')) return FUEL_META['Hi-Premium'];
  if (t.includes('97'))   return FUEL_META['Gasohol 97'];
  if (t.includes('95'))   return FUEL_META['Gasohol 95'];
  if (t.includes('91'))   return FUEL_META['Gasohol 91'];
  if (t.includes('e85'))  return FUEL_META['E85'];
  if (t.includes('e20'))  return FUEL_META['E20'];
  if (t.includes('b7') || (t.includes('diesel') && !t.includes('hi'))) return FUEL_META['Diesel B7'];
  if (t.includes('ngv'))  return FUEL_META['NGV'];
  if (t.includes('lpg'))  return FUEL_META['LPG'];
  return null;
}

export function getFuelMeta(fuelType: string): FuelTypeMeta {
  return (
    FUEL_META[fuelType] ??
    fuzzyMatch(fuelType) ?? {
      abbr: fuelType.slice(0, 4).toUpperCase(),
      color: '#9aa4b2',
      label: fuelType,
    }
  );
}

export function getFuelAbbr(fuelType: string): string {
  return getFuelMeta(fuelType).abbr;
}

export function getFuelColor(fuelType: string): string {
  return getFuelMeta(fuelType).color;
}
