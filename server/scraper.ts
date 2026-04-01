import * as cheerio from "cheerio";

export interface ScrapedListing {
  price: number;
  currency: string;
  title: string;
  dateSold: string;
}

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

export async function scrapeEbaySoldListings(
  coinTitle: string,
  limit = 3
): Promise<ScrapedListing[]> {
  const query = encodeURIComponent(coinTitle);
  // LH_Complete=1 → completed, LH_Sold=1 → sold only, _sop=13 → most recently ended
  const url = `https://www.ebay.com/sch/i.html?_nkw=${query}&LH_Complete=1&LH_Sold=1&_sop=13&_ipg=10`;

  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`eBay responded with ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const results: ScrapedListing[] = [];

  $(".s-item").each((_i, el) => {
    if (results.length >= limit) return false;

    const title = $(el).find(".s-item__title").first().text().trim();
    // Skip the ghost "Shop on eBay" placeholder card
    if (!title || title.toLowerCase().includes("shop on ebay")) return;

    const rawPrice = $(el).find(".s-item__price").first().text().trim();
    // eBay prices can be "USD 12.50" or "$12.50" or "12.50 USD"
    const priceMatch = rawPrice.replace(/,/g, "").match(/[\d.]+/);
    if (!priceMatch) return;
    const price = parseFloat(priceMatch[0]);
    if (isNaN(price) || price <= 0) return;

    const currency = rawPrice.match(/[A-Z]{3}/) ? rawPrice.match(/[A-Z]{3}/)![0] : "USD";

    // Date sold appears in different selectors across eBay versions
    const dateSold =
      $(el).find(".s-item__ended-date").text().trim() ||
      $(el).find(".s-item__listingDate").text().trim() ||
      $(el).find(".POSITIVE").text().trim() ||
      new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    results.push({ price, currency, title, dateSold });
  });

  return results;
}
