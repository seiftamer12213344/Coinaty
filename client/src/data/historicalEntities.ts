export interface HistoricalPeriod {
  name: string;
  startYear: number;
  endYear: number;
  countries: string[];
}

export const HISTORICAL_PERIODS: HistoricalPeriod[] = [
  // ── OTTOMAN EMPIRE ─────────────────────────────────────────────────────────
  { name: "Ottoman Empire", startYear: 1299, endYear: 1922, countries: ["Turkey", "Greece", "Bulgaria", "Albania", "N. Macedonia", "Kosovo", "Montenegro", "Cyprus", "Lebanon", "Syria", "Jordan"] },
  { name: "Ottoman Egypt", startYear: 1517, endYear: 1798, countries: ["Egypt"] },
  { name: "French Occupation of Egypt", startYear: 1798, endYear: 1801, countries: ["Egypt"] },
  { name: "Eyalet of Egypt", startYear: 1801, endYear: 1867, countries: ["Egypt"] },
  { name: "Khedivate of Egypt", startYear: 1867, endYear: 1914, countries: ["Egypt"] },
  { name: "Sultanate of Egypt", startYear: 1914, endYear: 1922, countries: ["Egypt"] },
  { name: "Kingdom of Egypt", startYear: 1922, endYear: 1953, countries: ["Egypt"] },
  { name: "Ottoman Mesopotamia", startYear: 1534, endYear: 1920, countries: ["Iraq"] },
  { name: "British Mandate of Mesopotamia", startYear: 1920, endYear: 1932, countries: ["Iraq"] },
  { name: "Kingdom of Iraq", startYear: 1932, endYear: 1958, countries: ["Iraq"] },
  { name: "Ottoman Libya", startYear: 1551, endYear: 1911, countries: ["Libya"] },
  { name: "Ottoman Arabia", startYear: 1517, endYear: 1918, countries: ["Yemen", "Kuwait", "Qatar", "Bahrain"] },
  { name: "Ottoman Levant", startYear: 1516, endYear: 1918, countries: ["Israel", "Palestinian Territories"] },
  { name: "British Mandate of Palestine", startYear: 1920, endYear: 1948, countries: ["Israel"] },

  // ── AUSTRIA / HABSBURG ─────────────────────────────────────────────────────
  { name: "Habsburg Monarchy", startYear: 1526, endYear: 1804, countries: ["Austria", "Hungary", "Czech Republic", "Slovakia", "Slovenia", "Croatia", "Romania", "Ukraine", "Belgium", "Luxembourg"] },
  { name: "Austrian Empire", startYear: 1804, endYear: 1867, countries: ["Austria", "Hungary", "Czech Republic", "Slovakia", "Slovenia", "Croatia", "Romania"] },
  { name: "Austro-Hungarian Empire", startYear: 1867, endYear: 1918, countries: ["Austria", "Hungary", "Czech Republic", "Slovakia", "Slovenia", "Croatia", "Bosnia and Herz.", "Romania", "Ukraine", "Poland"] },

  // ── HOLY ROMAN EMPIRE / GERMAN STATES ─────────────────────────────────────
  { name: "Holy Roman Empire", startYear: 962, endYear: 1806, countries: ["Germany", "Netherlands", "Belgium", "Luxembourg", "Liechtenstein", "Switzerland"] },
  { name: "Confederation of the Rhine", startYear: 1806, endYear: 1813, countries: ["Germany"] },
  { name: "German Confederation", startYear: 1815, endYear: 1866, countries: ["Germany", "Austria", "Luxembourg"] },
  { name: "North German Confederation", startYear: 1866, endYear: 1871, countries: ["Germany"] },
  { name: "German Empire", startYear: 1871, endYear: 1918, countries: ["Germany", "Poland"] },
  { name: "Weimar Republic", startYear: 1919, endYear: 1933, countries: ["Germany"] },
  { name: "Third Reich", startYear: 1933, endYear: 1945, countries: ["Germany", "Austria", "Czech Republic"] },
  { name: "East Germany (DDR)", startYear: 1949, endYear: 1990, countries: ["Germany"] },
  { name: "West Germany (FRG)", startYear: 1949, endYear: 1990, countries: ["Germany"] },

  // ── RUSSIA ─────────────────────────────────────────────────────────────────
  { name: "Tsardom of Russia", startYear: 1547, endYear: 1721, countries: ["Russia", "Ukraine", "Belarus", "Finland"] },
  { name: "Russian Empire", startYear: 1721, endYear: 1917, countries: ["Russia", "Finland", "Estonia", "Latvia", "Lithuania", "Belarus", "Ukraine", "Kazakhstan", "Uzbekistan", "Turkmenistan", "Tajikistan", "Kyrgyzstan", "Georgia", "Armenia", "Azerbaijan", "Poland"] },
  { name: "Soviet Union (USSR)", startYear: 1917, endYear: 1991, countries: ["Russia", "Ukraine", "Belarus", "Moldova", "Estonia", "Latvia", "Lithuania", "Georgia", "Armenia", "Azerbaijan", "Kazakhstan", "Uzbekistan", "Turkmenistan", "Tajikistan", "Kyrgyzstan"] },

  // ── FRANCE ─────────────────────────────────────────────────────────────────
  { name: "Kingdom of France", startYear: 987, endYear: 1792, countries: ["France"] },
  { name: "French First Republic", startYear: 1792, endYear: 1804, countries: ["France", "Belgium", "Netherlands"] },
  { name: "French Empire (Napoleon I)", startYear: 1804, endYear: 1815, countries: ["France", "Belgium", "Netherlands", "Luxembourg", "Italy", "Spain", "Poland"] },
  { name: "French Restoration (Kingdom of France)", startYear: 1815, endYear: 1848, countries: ["France"] },
  { name: "French Second Republic", startYear: 1848, endYear: 1852, countries: ["France"] },
  { name: "French Second Empire (Napoleon III)", startYear: 1852, endYear: 1870, countries: ["France"] },
  { name: "French Third Republic", startYear: 1870, endYear: 1940, countries: ["France"] },

  // ── SPAIN ──────────────────────────────────────────────────────────────────
  { name: "Spanish Empire", startYear: 1492, endYear: 1820, countries: ["Spain", "Mexico", "Peru", "Colombia", "Venezuela", "Chile", "Argentina", "Bolivia", "Ecuador", "Paraguay", "Uruguay", "Cuba", "Dominican Republic", "Philippines"] },
  { name: "Kingdom of Spain", startYear: 1820, endYear: 2026, countries: ["Spain"] },
  { name: "New Spain (Colonial Mexico)", startYear: 1521, endYear: 1821, countries: ["Mexico", "Guatemala", "Belize", "El Salvador", "Honduras", "Nicaragua", "Costa Rica", "Panama"] },

  // ── BRITISH EMPIRE / UNITED KINGDOM ───────────────────────────────────────
  { name: "Kingdom of Great Britain", startYear: 1707, endYear: 1801, countries: ["United Kingdom"] },
  { name: "United Kingdom", startYear: 1801, endYear: 2026, countries: ["United Kingdom"] },
  { name: "British India", startYear: 1757, endYear: 1947, countries: ["India", "Pakistan", "Bangladesh"] },
  { name: "British Burma", startYear: 1824, endYear: 1948, countries: ["Myanmar"] },
  { name: "British Malaya", startYear: 1826, endYear: 1957, countries: ["Malaysia", "Singapore"] },
  { name: "British Nigeria", startYear: 1861, endYear: 1960, countries: ["Nigeria"] },
  { name: "British East Africa Protectorate", startYear: 1895, endYear: 1963, countries: ["Kenya", "Uganda", "Tanzania"] },
  { name: "Cape Colony / Union of South Africa", startYear: 1806, endYear: 1961, countries: ["South Africa"] },
  { name: "British West Africa", startYear: 1821, endYear: 1957, countries: ["Ghana", "Sierra Leone", "Gambia"] },
  { name: "British Ceylon", startYear: 1815, endYear: 1948, countries: ["Sri Lanka"] },
  { name: "British Australia", startYear: 1788, endYear: 1901, countries: ["Australia"] },
  { name: "Dominion of Australia", startYear: 1901, endYear: 1942, countries: ["Australia"] },
  { name: "British New Zealand", startYear: 1840, endYear: 1907, countries: ["New Zealand"] },
  { name: "British Canada", startYear: 1763, endYear: 1867, countries: ["Canada"] },
  { name: "Dominion of Canada", startYear: 1867, endYear: 1982, countries: ["Canada"] },
  { name: "British Egypt / Khedivate", startYear: 1882, endYear: 1922, countries: ["Egypt"] },

  // ── PERSIA / IRAN ──────────────────────────────────────────────────────────
  { name: "Safavid Persia", startYear: 1501, endYear: 1736, countries: ["Iran"] },
  { name: "Afsharid Persia", startYear: 1736, endYear: 1796, countries: ["Iran", "Afghanistan"] },
  { name: "Qajar Persia", startYear: 1789, endYear: 1925, countries: ["Iran"] },
  { name: "Pahlavi Iran", startYear: 1925, endYear: 1979, countries: ["Iran"] },

  // ── MUGHAL / INDIA ─────────────────────────────────────────────────────────
  { name: "Mughal Empire", startYear: 1526, endYear: 1857, countries: ["India"] },
  { name: "Maratha Confederacy", startYear: 1674, endYear: 1818, countries: ["India"] },

  // ── CHINA ──────────────────────────────────────────────────────────────────
  { name: "Ming Dynasty China", startYear: 1368, endYear: 1644, countries: ["China"] },
  { name: "Qing Dynasty China", startYear: 1644, endYear: 1912, countries: ["China", "Mongolia", "Taiwan"] },
  { name: "Republic of China", startYear: 1912, endYear: 1949, countries: ["China"] },
  { name: "Republic of China (Taiwan)", startYear: 1949, endYear: 2026, countries: ["Taiwan"] },
  { name: "People's Republic of China", startYear: 1949, endYear: 2026, countries: ["China"] },

  // ── JAPAN ──────────────────────────────────────────────────────────────────
  { name: "Edo Japan (Tokugawa Shogunate)", startYear: 1603, endYear: 1868, countries: ["Japan"] },
  { name: "Meiji Japan", startYear: 1868, endYear: 1912, countries: ["Japan", "South Korea", "North Korea", "Taiwan"] },
  { name: "Taisho Japan", startYear: 1912, endYear: 1926, countries: ["Japan"] },
  { name: "Imperial Japan (Showa)", startYear: 1926, endYear: 1945, countries: ["Japan", "South Korea", "North Korea", "Taiwan", "Myanmar", "Malaysia", "Philippines", "Indonesia"] },

  // ── KOREA ──────────────────────────────────────────────────────────────────
  { name: "Joseon Dynasty", startYear: 1392, endYear: 1897, countries: ["South Korea", "North Korea"] },
  { name: "Korean Empire", startYear: 1897, endYear: 1910, countries: ["South Korea", "North Korea"] },
  { name: "Japanese Korea", startYear: 1910, endYear: 1945, countries: ["South Korea", "North Korea"] },

  // ── NORTH AFRICA ───────────────────────────────────────────────────────────
  { name: "Husainid Tunisia (Regency of Tunis)", startYear: 1705, endYear: 1881, countries: ["Tunisia"] },
  { name: "French Tunisia", startYear: 1881, endYear: 1956, countries: ["Tunisia"] },
  { name: "Regency of Algiers", startYear: 1516, endYear: 1830, countries: ["Algeria"] },
  { name: "French Algeria", startYear: 1830, endYear: 1962, countries: ["Algeria"] },
  { name: "Alaouite Sultanate (Morocco)", startYear: 1666, endYear: 1912, countries: ["Morocco"] },
  { name: "French Protectorate of Morocco", startYear: 1912, endYear: 1956, countries: ["Morocco"] },
  { name: "Italian Libya", startYear: 1911, endYear: 1943, countries: ["Libya"] },
  { name: "Kingdom of Libya", startYear: 1951, endYear: 1969, countries: ["Libya"] },

  // ── BALKAN STATES ──────────────────────────────────────────────────────────
  { name: "Principality of Serbia", startYear: 1817, endYear: 1882, countries: ["Serbia"] },
  { name: "Kingdom of Serbia", startYear: 1882, endYear: 1918, countries: ["Serbia"] },
  { name: "Kingdom of Yugoslavia", startYear: 1918, endYear: 1941, countries: ["Serbia", "Montenegro", "N. Macedonia", "Slovenia", "Croatia", "Bosnia and Herz."] },
  { name: "SFR Yugoslavia", startYear: 1945, endYear: 1992, countries: ["Serbia", "Montenegro", "N. Macedonia", "Slovenia", "Croatia", "Bosnia and Herz."] },
  { name: "Kingdom of Romania", startYear: 1881, endYear: 1947, countries: ["Romania"] },
  { name: "Kingdom of Bulgaria", startYear: 1908, endYear: 1946, countries: ["Bulgaria"] },
  { name: "Kingdom of Greece", startYear: 1832, endYear: 1974, countries: ["Greece"] },

  // ── POLAND ─────────────────────────────────────────────────────────────────
  { name: "Polish-Lithuanian Commonwealth", startYear: 1569, endYear: 1795, countries: ["Poland", "Lithuania", "Belarus", "Ukraine"] },
  { name: "Duchy of Warsaw", startYear: 1807, endYear: 1815, countries: ["Poland"] },
  { name: "Congress Poland", startYear: 1815, endYear: 1915, countries: ["Poland"] },

  // ── SCANDINAVIA ────────────────────────────────────────────────────────────
  { name: "Kingdom of Denmark-Norway", startYear: 1536, endYear: 1814, countries: ["Denmark", "Norway", "Iceland"] },
  { name: "Swedish Empire", startYear: 1611, endYear: 1721, countries: ["Sweden", "Finland", "Estonia", "Latvia"] },
  { name: "Kingdom of Sweden", startYear: 1721, endYear: 2026, countries: ["Sweden"] },
  { name: "Kingdom of Denmark", startYear: 1814, endYear: 2026, countries: ["Denmark"] },
  { name: "Kingdom of Norway", startYear: 1905, endYear: 2026, countries: ["Norway"] },

  // ── LOW COUNTRIES ──────────────────────────────────────────────────────────
  { name: "Kingdom of the Netherlands", startYear: 1815, endYear: 2026, countries: ["Netherlands"] },
  { name: "Kingdom of Belgium", startYear: 1830, endYear: 2026, countries: ["Belgium"] },
  { name: "Kingdom of the Netherlands (Colonial)", startYear: 1815, endYear: 1949, countries: ["Indonesia", "Suriname"] },

  // ── ITALY ──────────────────────────────────────────────────────────────────
  { name: "Papal States", startYear: 754, endYear: 1870, countries: ["Italy"] },
  { name: "Kingdom of Sardinia (Savoy)", startYear: 1720, endYear: 1861, countries: ["Italy"] },
  { name: "Two Sicilies", startYear: 1816, endYear: 1861, countries: ["Italy"] },
  { name: "Kingdom of Italy", startYear: 1861, endYear: 1946, countries: ["Italy"] },
  { name: "Italian Republic", startYear: 1946, endYear: 2026, countries: ["Italy"] },

  // ── PORTUGAL ───────────────────────────────────────────────────────────────
  { name: "Portuguese Empire", startYear: 1415, endYear: 1975, countries: ["Portugal", "Brazil", "Angola", "Mozambique"] },
  { name: "Kingdom of Portugal", startYear: 1139, endYear: 1910, countries: ["Portugal"] },
  { name: "Portuguese Republic", startYear: 1910, endYear: 2026, countries: ["Portugal"] },

  // ── BRAZIL ─────────────────────────────────────────────────────────────────
  { name: "Colonial Brazil (Portugal)", startYear: 1500, endYear: 1815, countries: ["Brazil"] },
  { name: "Kingdom of Brazil", startYear: 1815, endYear: 1822, countries: ["Brazil"] },
  { name: "Empire of Brazil", startYear: 1822, endYear: 1889, countries: ["Brazil"] },

  // ── SOUTH AMERICA ──────────────────────────────────────────────────────────
  { name: "Viceroyalty of Peru (Spain)", startYear: 1542, endYear: 1824, countries: ["Peru", "Bolivia"] },
  { name: "Viceroyalty of New Granada (Spain)", startYear: 1717, endYear: 1819, countries: ["Colombia", "Venezuela", "Ecuador", "Panama"] },
  { name: "Viceroyalty of Río de la Plata (Spain)", startYear: 1776, endYear: 1814, countries: ["Argentina", "Uruguay", "Paraguay", "Bolivia"] },
  { name: "Gran Colombia", startYear: 1819, endYear: 1831, countries: ["Colombia", "Venezuela", "Ecuador", "Panama"] },

  // ── EAST AFRICA ────────────────────────────────────────────────────────────
  { name: "Zanzibar Sultanate", startYear: 1856, endYear: 1963, countries: ["Tanzania"] },
  { name: "Ethiopian Empire (Abyssinia)", startYear: 980, endYear: 1974, countries: ["Ethiopia"] },
  { name: "Italian East Africa", startYear: 1936, endYear: 1941, countries: ["Ethiopia", "Eritrea", "Somalia"] },

  // ── WEST AFRICA ────────────────────────────────────────────────────────────
  { name: "French West Africa", startYear: 1895, endYear: 1958, countries: ["Senegal", "Mali", "Guinea", "Ivory Coast", "Burkina Faso", "Benin", "Niger", "Mauritania"] },
  { name: "French Equatorial Africa", startYear: 1910, endYear: 1958, countries: ["Chad", "Central African Republic", "Cameroon", "Congo", "Gabon"] },
  { name: "Belgian Congo", startYear: 1908, endYear: 1960, countries: ["Dem. Rep. Congo"] },

  // ── SOUTHEAST ASIA ─────────────────────────────────────────────────────────
  { name: "French Indochina", startYear: 1887, endYear: 1954, countries: ["Vietnam", "Laos", "Cambodia"] },
  { name: "Dutch East Indies", startYear: 1602, endYear: 1949, countries: ["Indonesia"] },
  { name: "Spanish Philippines", startYear: 1565, endYear: 1898, countries: ["Philippines"] },
  { name: "American Philippines", startYear: 1898, endYear: 1946, countries: ["Philippines"] },
  { name: "Kingdom of Siam / Thailand", startYear: 1350, endYear: 2026, countries: ["Thailand"] },

  // ── CENTRAL ASIA ───────────────────────────────────────────────────────────
  { name: "Khanate of Bukhara", startYear: 1500, endYear: 1920, countries: ["Uzbekistan"] },
  { name: "Khanate of Khiva", startYear: 1511, endYear: 1920, countries: ["Uzbekistan", "Turkmenistan"] },

  // ── AMERICAS (COLONIAL) ────────────────────────────────────────────────────
  { name: "British North America", startYear: 1607, endYear: 1776, countries: ["United States of America"] },
  { name: "United States of America", startYear: 1776, endYear: 2026, countries: ["United States of America"] },
  { name: "Colony of New France", startYear: 1534, endYear: 1763, countries: ["Canada"] },

  // ── MIDDLE EAST ────────────────────────────────────────────────────────────
  { name: "Emirate of Afghanistan", startYear: 1823, endYear: 1926, countries: ["Afghanistan"] },
  { name: "Kingdom of Afghanistan", startYear: 1926, endYear: 1973, countries: ["Afghanistan"] },
  { name: "Imamate of Yemen / Mutawakkilite Kingdom", startYear: 1918, endYear: 1962, countries: ["Yemen"] },

  // ── SWITZERLAND ────────────────────────────────────────────────────────────
  { name: "Swiss Confederation", startYear: 1291, endYear: 2026, countries: ["Switzerland"] },
];

export function getHistoricalEntity(countryName: string, year: number): string {
  const matches = HISTORICAL_PERIODS.filter(
    (p) => p.startYear <= year && p.endYear >= year && p.countries.includes(countryName)
  );
  if (matches.length === 0) return countryName;
  // Most recently started entity is most specific
  return matches.sort((a, b) => b.startYear - a.startYear)[0].name;
}

export function getEntityColor(countryName: string, year: number): string {
  const entity = getHistoricalEntity(countryName, year);
  if (entity === countryName) return "modern";
  // Map empire names to consistent color categories
  const name = entity.toLowerCase();
  if (name.includes("ottoman")) return "ottoman";
  if (name.includes("russian") || name.includes("soviet") || name.includes("tsardom")) return "russian";
  if (name.includes("british") || name.includes("united kingdom") || name.includes("dominion") || name.includes("cape colony")) return "british";
  if (name.includes("french") || name.includes("napoleon")) return "french";
  if (name.includes("spanish") || name.includes("spain") || name.includes("viceroyalty")) return "spanish";
  if (name.includes("habsburg") || name.includes("austrian") || name.includes("austro-hungarian")) return "austrian";
  if (name.includes("german") || name.includes("prussian") || name.includes("third reich") || name.includes("holy roman") || name.includes("weimar")) return "german";
  if (name.includes("mughal") || name.includes("maratha")) return "mughal";
  if (name.includes("qing") || name.includes("china") || name.includes("republic of china")) return "chinese";
  if (name.includes("japan") || name.includes("imperial japan") || name.includes("meiji") || name.includes("shogunate")) return "japanese";
  if (name.includes("portuguese")) return "portuguese";
  if (name.includes("safavid") || name.includes("qajar") || name.includes("pahlavi") || name.includes("persia") || name.includes("iran")) return "persian";
  return "historical";
}
