import { useQuery } from "@tanstack/react-query";
import { TrendingUp, RefreshCw, AlertCircle, ShoppingBag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Listing {
  price: number;
  currency: string;
  title: string;
  dateSold: string;
}

interface MarketPriceData {
  numistaId: string;
  coinTitle: string;
  listings: Listing[];
  avgPrice: string | null;
  currency: string;
  updatedAt?: string;
  cached?: boolean;
  stale?: boolean;
  error?: boolean;
}

interface Props {
  numistaId: string;
  coinTitle: string;
}

function currencySymbol(code: string) {
  return code === "GBP" ? "£" : code === "EUR" ? "€" : "$";
}

export default function MarketValue({ numistaId, coinTitle }: Props) {
  const { data, isLoading, isError } = useQuery<MarketPriceData>({
    queryKey: [`/api/market-price/${numistaId}?q=${encodeURIComponent(coinTitle)}`],
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const sym = currencySymbol(data?.currency ?? "USD");
  const avg = data?.avgPrice ? parseFloat(data.avgPrice) : null;
  const listings: Listing[] = data?.listings ?? [];
  const hasData = listings.length > 0;
  const updatedAgo = data?.updatedAt
    ? formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true })
    : null;

  return (
    <div
      data-testid="market-value-card"
      className="rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl"
      style={{ boxShadow: "0 4px 32px rgba(212,175,55,0.06)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30">
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-semibold text-foreground leading-tight">Market Value</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">eBay sold listings</p>
        </div>

        {/* Status badge */}
        {isLoading ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Fetching…
          </span>
        ) : hasData ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        ) : null}
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            <div className="h-10 w-32 bg-muted/50 rounded-xl animate-pulse" />
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-muted/30 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Error / no data */}
        {!isLoading && (isError || (!hasData && data)) && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <AlertCircle className="w-7 h-7 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No recent sold listings found on eBay for this coin.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Try checking eBay manually for the latest prices.
            </p>
          </div>
        )}

        {/* Data */}
        {!isLoading && hasData && (
          <>
            {/* Estimated value */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl px-5 py-4">
              <p className="text-xs text-primary/70 uppercase tracking-widest font-semibold mb-1">
                Estimated Value
              </p>
              <div className="flex items-end gap-2">
                <span
                  data-testid="text-avg-price"
                  className="text-4xl font-serif font-bold text-primary"
                >
                  {sym}{avg !== null ? avg.toFixed(2) : "—"}
                </span>
                <span className="text-sm text-muted-foreground mb-1">{data?.currency ?? "USD"}</span>
              </div>
              <p className="text-[11px] text-muted-foreground/60 mt-1">
                Average of {listings.length} sold {listings.length === 1 ? "listing" : "listings"}
                {updatedAgo ? ` · Updated ${updatedAgo}` : ""}
              </p>
            </div>

            {/* Individual listings */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold px-0.5">
                Recent Sales
              </p>
              {listings.map((l, i) => (
                <div
                  key={i}
                  data-testid={`listing-item-${i}`}
                  className="flex items-center gap-3 bg-background rounded-xl p-3 border border-border/40 hover:border-primary/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground/80 truncate leading-snug">{l.title}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{l.dateSold}</p>
                  </div>
                  <span className="text-sm font-bold text-primary font-serif flex-shrink-0">
                    {sym}{l.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {data?.stale && (
              <p className="text-[11px] text-amber-500/70 text-center">
                Using cached data — live refresh unavailable right now.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
