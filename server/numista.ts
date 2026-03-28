const NUMISTA_API_KEY = process.env.NUMISTA_API_KEY;
const NUMISTA_BASE = "https://api.numista.com/v3";

export interface NumistaSearchResult {
  id: string;
  title: string;
  issuer?: { name: string; code?: string };
  min_year?: number;
  max_year?: number;
  obverse?: { thumbnail?: string; picture?: string };
  reverse?: { thumbnail?: string; picture?: string };
}

export interface NumistaCoinDetail extends NumistaSearchResult {
  composition?: { text?: string };
  weight_g?: number;
  diameter_mm?: number;
  ruler?: { name: string };
  category?: string;
}

const MOCK_RESULTS: NumistaSearchResult[] = [
  {
    id: "83749",
    title: "5 Piastres - Husein Kamil",
    issuer: { name: "Egypt", code: "EG" },
    min_year: 1916,
    max_year: 1917,
    obverse: { thumbnail: "https://en.numista.com/catalogue/photos/egypte/5db78f9c764b90.68830740-180.jpg" },
  },
  {
    id: "12345",
    title: "1 Pound - Farouk I",
    issuer: { name: "Egypt", code: "EG" },
    min_year: 1938,
    max_year: 1938,
    obverse: { thumbnail: "https://en.numista.com/catalogue/photos/egypte/5db78f9c764b90.68830740-180.jpg" },
  },
  {
    id: "56789",
    title: "20 Piastres - Fuad I",
    issuer: { name: "Egypt", code: "EG" },
    min_year: 1923,
    max_year: 1929,
    obverse: { thumbnail: "https://en.numista.com/catalogue/photos/egypte/5db78f9c764b90.68830740-180.jpg" },
  },
  {
    id: "11111",
    title: "Gold Dinar - Abbasid Caliphate",
    issuer: { name: "Abbasid Caliphate" },
    min_year: 750,
    max_year: 900,
    obverse: { thumbnail: "https://en.numista.com/catalogue/photos/egypte/5db78f9c764b90.68830740-180.jpg" },
  },
  {
    id: "22222",
    title: "Tetradrachm - Alexander III",
    issuer: { name: "Ancient Greece" },
    min_year: -336,
    max_year: -323,
    obverse: { thumbnail: "https://en.numista.com/catalogue/photos/egypte/5db78f9c764b90.68830740-180.jpg" },
  },
];

const MOCK_DETAILS: Record<string, NumistaCoinDetail> = {
  "83749": {
    id: "83749",
    title: "5 Piastres - Husein Kamil",
    issuer: { name: "Egypt", code: "EG" },
    min_year: 1916,
    max_year: 1917,
    composition: { text: "Silver (.833)" },
    weight_g: 7,
    diameter_mm: 27.5,
    ruler: { name: "Husein Kamil" },
    obverse: { thumbnail: "https://en.numista.com/catalogue/photos/egypte/5db78f9c764b90.68830740-180.jpg" },
  },
  "12345": {
    id: "12345",
    title: "1 Pound - Farouk I",
    issuer: { name: "Egypt" },
    min_year: 1938,
    max_year: 1938,
    composition: { text: "Gold (.875)" },
    weight_g: 8.5,
    diameter_mm: 24,
    ruler: { name: "King Farouk I" },
    obverse: { thumbnail: "https://en.numista.com/catalogue/photos/egypte/5db78f9c764b90.68830740-180.jpg" },
  },
  "56789": {
    id: "56789",
    title: "20 Piastres - Fuad I",
    issuer: { name: "Egypt" },
    min_year: 1923,
    max_year: 1929,
    composition: { text: "Silver (.833)" },
    weight_g: 14,
    diameter_mm: 33,
    ruler: { name: "King Fuad I" },
    obverse: { thumbnail: "https://en.numista.com/catalogue/photos/egypte/5db78f9c764b90.68830740-180.jpg" },
  },
  "11111": {
    id: "11111",
    title: "Gold Dinar - Abbasid Caliphate",
    issuer: { name: "Abbasid Caliphate" },
    min_year: 750,
    max_year: 900,
    composition: { text: "Gold (.980)" },
    weight_g: 4.25,
    diameter_mm: 20,
    ruler: { name: "Various Abbasid Caliphs" },
    obverse: { thumbnail: "https://en.numista.com/catalogue/photos/egypte/5db78f9c764b90.68830740-180.jpg" },
  },
  "22222": {
    id: "22222",
    title: "Tetradrachm - Alexander III",
    issuer: { name: "Ancient Greece" },
    min_year: -336,
    max_year: -323,
    composition: { text: "Silver (.950)" },
    weight_g: 17.2,
    diameter_mm: 28,
    ruler: { name: "Alexander the Great" },
    obverse: { thumbnail: "https://en.numista.com/catalogue/photos/egypte/5db78f9c764b90.68830740-180.jpg" },
  },
};

export async function searchNumista(query: string): Promise<NumistaSearchResult[]> {
  if (!NUMISTA_API_KEY) {
    // Mock: filter by query
    const q = query.toLowerCase();
    return MOCK_RESULTS.filter(r =>
      r.title.toLowerCase().includes(q) ||
      (r.issuer?.name || "").toLowerCase().includes(q) ||
      String(r.min_year || "").includes(q)
    );
  }
  const url = `${NUMISTA_BASE}/types?q=${encodeURIComponent(query)}&lang=en&count=50`;
  const res = await fetch(url, { headers: { "Numista-Api-Key": NUMISTA_API_KEY } });
  if (!res.ok) throw new Error(`Numista API error: ${res.status}`);
  const data = await res.json() as { types?: any[] };
  return (data.types || []).map((t: any) => ({
    id: String(t.id),
    title: t.title,
    issuer: t.issuer,
    min_year: t.min_year,
    max_year: t.max_year,
    obverse: { thumbnail: t.obverse_thumbnail, picture: t.obverse_picture },
    reverse: { thumbnail: t.reverse_thumbnail, picture: t.reverse_picture },
  }));
}

export async function getNumistaCoin(id: string): Promise<NumistaCoinDetail | null> {
  if (!NUMISTA_API_KEY) {
    return MOCK_DETAILS[id] || null;
  }
  const url = `${NUMISTA_BASE}/types/${id}?lang=en`;
  const res = await fetch(url, { headers: { "Numista-Api-Key": NUMISTA_API_KEY } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Numista API error: ${res.status}`);
  const t = await res.json() as any;
  return {
    id: String(t.id),
    title: t.title,
    issuer: t.issuer,
    min_year: t.min_year,
    max_year: t.max_year,
    obverse: { thumbnail: t.obverse?.thumbnail || t.obverse_thumbnail, picture: t.obverse?.picture || t.obverse_picture },
    reverse: { thumbnail: t.reverse?.thumbnail || t.reverse_thumbnail, picture: t.reverse?.picture || t.reverse_picture },
    composition: t.composition,
    weight_g: t.weight,
    diameter_mm: t.size,
    ruler: t.ruler,
    category: t.category,
  };
}
