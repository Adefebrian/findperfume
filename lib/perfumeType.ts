// Brand -> perfume "type" classification (dupe / designer / niche).
// The DB has no type column, but brand is a strong signal. Curated sets cover
// the bulk of the catalogue by popularity; unknown brands return null and are
// only excluded when the user picks a specific type (the "any" filter keeps all).

export type PerfumeType = "dupe" | "designer" | "niche";

// Clone / inspired-by / budget houses (mostly Middle-East clone & cheap clone lines).
const DUPE = new Set(
  [
    "The Dua Brand", "Armaf", "Lattafa", "Al Haramain", "Ajmal", "Al Rehab", "Rasasi",
    "Khalis", "Nabeel", "Hamidi Oud & Perfumes", "Fragrance World", "Asgharali",
    "Swiss Arabian", "Emper", "Ard Al Zaafaran", "Khadlaj", "Maison Alhambra", "Surrati",
    "Ahmed Al Maghribi", "Arabian Oud", "Naseem", "Maison Anthony Marmin", "French Avenue",
    "Estiara", "EMES", "Coral Perfumes", "Yaaseen", "El Nabil", "Federico Mahora", "La Rive",
    "Création Lamis", "Dorall Collection", "Milton-Lloyd", "Alexandria Fragrances",
    "Paris Corner", "Adopt'", "Zara", "Dorall", "Lattafa Pride", "Maison Asrar",
  ].map((s) => s.toLowerCase())
);

// Fashion houses, celebrity & prestige mainstream / department-store brands.
const DESIGNER = new Set(
  [
    "Guerlain", "Dior", "Christian Dior", "Chanel", "Givenchy", "Calvin Klein", "Coty",
    "Giorgio Armani", "Armani", "Yves Saint Laurent", "Bvlgari", "Cartier", "Hugo Boss",
    "Kenzo", "Mugler", "Thierry Mugler", "DKNY", "Dolce & Gabbana", "Lancôme",
    "Estēe Lauder", "Estée Lauder", "Jo Malone", "Yardley", "Jeanne Arthes", "Ulric de Varens",
    "Versace", "Gucci", "Prada", "Burberry", "Paco Rabanne", "Jean Paul Gaultier",
    "Carolina Herrera", "Marc Jacobs", "Montblanc", "Viktor&Rolf", "Valentino", "Tom Ford",
    "Avon", "Oriflame", "Yves Rocher", "Victoria's Secret", "Bath & Body Works", "O Boticário",
    "Natura", "Lush", "The Body Shop", "L'Occitane en Provence", "Demeter Fragrance Library",
    "Dana", "Primark", "H&M", "Bershka", "Reserved", "Bvlgari",
  ].map((s) => s.toLowerCase())
);

// Artisanal / indie / luxury independent houses.
const NICHE = new Set(
  [
    "Ensar Oud", "Xerjoff", "Montale", "Mancera", "Bond No. 9", "M. Micallef", "Fueguia 1833",
    "Boadicea the Victorious", "Henry Jacques", "Teone Reinthal Natural Perfume", "Agar Aura",
    "Mellifluence Perfume", "Solstice Scents", "Black Phoenix Alchemy Lab", "Sixteen92",
    "Arcana Wildcraft", "Alkemia", "Nui Cobalt Designs", "Haus of Gloi", "Wild Veil Perfume",
    "The Sage Goddess", "Cocoa Pink", "Possets", "Sucreabeille", "Astrid Perfume", "DSH Perfumes",
    "Ava Luxe", "4160 Tuesdays", "Fleurage Perfume Atelier", "Spezierie Palazzo Vecchio",
    "Sarah Horowitz Parfums", "Smell Bent", "Poesie Perfume", "Deep Midnight Perfumes",
    "For Strange Women", "Hexennacht", "Deconstructing Eden", "Wylde Ivy", "The Strange South",
    "Common Brimstone", "Alchemic Muse", "Red Deer Grove", "Damask Haus", "Fragonard", "Molinard",
    "Le Monde Gourmand", "Phoenix Artisan Accoutrements", "Violette Market", "Amouage",
    "Maison Francis Kurkdjian", "Creed", "Roja Parfums", "Parfums de Marly", "Nishane", "Initio",
    "Le Labo", "Byredo", "Diptyque", "Frederic Malle", "Serge Lutens", "Clive Christian",
    "Mind Games", "BDK Parfums", "Wild Veil", "Sora Dora", "Stéora",
  ].map((s) => s.toLowerCase())
);

const SETS: Record<PerfumeType, Set<string>> = { dupe: DUPE, designer: DESIGNER, niche: NICHE };

export function classifyType(brand: string | null): PerfumeType | null {
  const b = (brand || "").trim().toLowerCase();
  if (!b) return null;
  if (DUPE.has(b)) return "dupe";
  if (DESIGNER.has(b)) return "designer";
  if (NICHE.has(b)) return "niche";
  return null;
}

// Lowercased brand list for a type, for a SQL `lower(brand) IN (...)` filter.
export function brandsForType(type: PerfumeType): string[] {
  return Array.from(SETS[type] ?? []);
}

export function isType(t: string | null | undefined): t is PerfumeType {
  return t === "dupe" || t === "designer" || t === "niche";
}
