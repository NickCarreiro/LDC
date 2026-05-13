// ── Vision statement keyword weighting engine ────────────────────────────────
//
// Organizers define keyword → theme → weight mappings.
// scoreVisionCompatibility() extracts theme profiles from free-text vision
// statements and returns a normalized 0-20 compatibility contribution.

export type Theme =
  | "faith_practice"
  | "family_orientation"
  | "parish_life"
  | "homeschooling"
  | "service"
  | "simple_living"
  | "discernment"
  | "hospitality";

export const THEME_LABELS: Record<Theme, string> = {
  faith_practice: "Faith Practice",
  family_orientation: "Family Orientation",
  parish_life: "Parish Life",
  homeschooling: "Homeschooling",
  service: "Service",
  simple_living: "Simple Living",
  discernment: "Discernment",
  hospitality: "Hospitality",
};

export const ALL_THEMES = Object.keys(THEME_LABELS) as Theme[];

export interface KeywordWeight {
  id: string;
  pattern: string;      // case-insensitive substring match
  theme: Theme;
  weight: number;       // 0.5 = light · 1.0 = standard · 1.5 = strong · 2.0 = defining
}

export const DEFAULT_KEYWORDS: KeywordWeight[] = [
  // Faith practice
  { id: "k01", pattern: "mass",           theme: "faith_practice",    weight: 1.5 },
  { id: "k02", pattern: "sacrament",      theme: "faith_practice",    weight: 1.5 },
  { id: "k03", pattern: "rosary",         theme: "faith_practice",    weight: 1.5 },
  { id: "k04", pattern: "confession",     theme: "faith_practice",    weight: 1.2 },
  { id: "k05", pattern: "adoration",      theme: "faith_practice",    weight: 1.2 },
  { id: "k06", pattern: "eucharist",      theme: "faith_practice",    weight: 1.5 },
  { id: "k07", pattern: "prayer",         theme: "faith_practice",    weight: 1.0 },
  { id: "k08", pattern: "faith",          theme: "faith_practice",    weight: 0.8 },

  // Family orientation
  { id: "k10", pattern: "children",       theme: "family_orientation", weight: 1.5 },
  { id: "k11", pattern: "large family",   theme: "family_orientation", weight: 2.0 },
  { id: "k12", pattern: "open to life",   theme: "family_orientation", weight: 2.0 },
  { id: "k13", pattern: "openness to",    theme: "family_orientation", weight: 1.2 },
  { id: "k14", pattern: "family",         theme: "family_orientation", weight: 0.8 },
  { id: "k15", pattern: "raising",        theme: "family_orientation", weight: 1.0 },
  { id: "k16", pattern: "domestic",       theme: "family_orientation", weight: 1.3 },

  // Parish life
  { id: "k20", pattern: "parish",         theme: "parish_life",       weight: 1.5 },
  { id: "k21", pattern: "community",      theme: "parish_life",       weight: 1.0 },
  { id: "k22", pattern: "parish life",    theme: "parish_life",       weight: 2.0 },
  { id: "k23", pattern: "church",         theme: "parish_life",       weight: 0.8 },

  // Homeschooling
  { id: "k30", pattern: "homeschool",     theme: "homeschooling",     weight: 2.0 },
  { id: "k31", pattern: "classical",      theme: "homeschooling",     weight: 1.5 },
  { id: "k32", pattern: "home education", theme: "homeschooling",     weight: 2.0 },

  // Service
  { id: "k40", pattern: "service",        theme: "service",           weight: 1.2 },
  { id: "k41", pattern: "serving",        theme: "service",           weight: 1.0 },
  { id: "k42", pattern: "mission",        theme: "service",           weight: 1.2 },
  { id: "k43", pattern: "apostolate",     theme: "service",           weight: 1.5 },
  { id: "k44", pattern: "volunteer",      theme: "service",           weight: 1.0 },

  // Simple living
  { id: "k50", pattern: "simple",         theme: "simple_living",     weight: 1.2 },
  { id: "k51", pattern: "frugal",         theme: "simple_living",     weight: 1.5 },
  { id: "k52", pattern: "rural",          theme: "simple_living",     weight: 1.3 },
  { id: "k53", pattern: "slow",           theme: "simple_living",     weight: 1.0 },
  { id: "k54", pattern: "honest work",    theme: "simple_living",     weight: 1.5 },

  // Discernment
  { id: "k60", pattern: "vocation",       theme: "discernment",       weight: 1.5 },
  { id: "k61", pattern: "holiness",       theme: "discernment",       weight: 1.5 },
  { id: "k62", pattern: "sanctif",        theme: "discernment",       weight: 1.5 },
  { id: "k63", pattern: "heaven",         theme: "discernment",       weight: 1.3 },
  { id: "k64", pattern: "virtue",         theme: "discernment",       weight: 1.2 },
  { id: "k65", pattern: "discernment",    theme: "discernment",       weight: 1.5 },

  // Hospitality
  { id: "k70", pattern: "hospitality",    theme: "hospitality",       weight: 1.5 },
  { id: "k71", pattern: "welcom",         theme: "hospitality",       weight: 1.2 },
  { id: "k72", pattern: "home",           theme: "hospitality",       weight: 0.7 },
  { id: "k73", pattern: "gathering",      theme: "hospitality",       weight: 1.0 },
];

// ── Core extraction ───────────────────────────────────────────────────────────

export type ThemeProfile = Partial<Record<Theme, number>>;

export function extractThemeProfile(vision: string, keywords: KeywordWeight[]): ThemeProfile {
  if (!vision) return {};
  const lower = vision.toLowerCase();
  const profile: ThemeProfile = {};
  for (const kw of keywords) {
    if (lower.includes(kw.pattern.toLowerCase())) {
      profile[kw.theme] = (profile[kw.theme] ?? 0) + kw.weight;
    }
  }
  return profile;
}

// Returns the themes that both participants share (non-zero in both profiles)
export function sharedThemes(a: ThemeProfile, b: ThemeProfile): Theme[] {
  return ALL_THEMES.filter((t) => (a[t] ?? 0) > 0 && (b[t] ?? 0) > 0);
}

// Returns a 0–20 score contribution from vision text compatibility
export function scoreVisionCompatibility(
  profileA: ThemeProfile,
  profileB: ThemeProfile,
): number {
  let raw = 0;
  for (const theme of ALL_THEMES) {
    const a = profileA[theme] ?? 0;
    const b = profileB[theme] ?? 0;
    if (a > 0 && b > 0) raw += Math.min(a, b);
  }
  // Normalize: cap at 20, scale so that 3 shared strong themes ≈ 15 pts
  return Math.min(20, raw * 2.5);
}
