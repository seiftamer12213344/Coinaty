import { useState, useMemo } from "react";
import { useCoins } from "@/hooks/use-coins";
import { Shell } from "@/components/layout/Shell";
import { CoinCard } from "@/components/CoinCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Search, Filter, X } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORIES = ["All", "Ancient", "Medieval", "Ottoman", "Kingdom of Egypt", "Modern", "Error Coins"];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: coins, isLoading, error } = useCoins(
    activeCategory !== "All" ? { category: activeCategory } : undefined
  );

  const filteredCoins = useMemo(() => {
    if (!coins) return [];
    if (!searchQuery.trim()) return coins;
    const q = searchQuery.toLowerCase();
    return coins.filter(coin =>
      coin.title.toLowerCase().includes(q) ||
      coin.description.toLowerCase().includes(q) ||
      coin.category.toLowerCase().includes(q) ||
      (coin.metalType || "").toLowerCase().includes(q)
    );
  }, [coins, searchQuery]);

  return (
    <Shell>
      <div className="p-4 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 hidden md:flex">
          <div>
            <h1 className="text-4xl font-serif font-bold text-foreground mb-2">The Grand Gallery</h1>
            <p className="text-muted-foreground">Explore curated numismatic treasures from collectors worldwide.</p>
          </div>
          
          <div className="relative group w-full md:w-64">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input 
              type="text"
              data-testid="input-gallery-search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search catalog..." 
              className="w-full bg-black/40 border border-border/50 rounded-xl py-2.5 pl-10 pr-9 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 px-1">
            <div className="flex items-center justify-center p-2 rounded-lg bg-white/5 border border-white/10 mr-2 md:hidden text-muted-foreground">
              <Filter className="w-4 h-4" />
            </div>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeCategory === cat 
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(212,175,55,0.3)] scale-105" 
                    : "bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-20">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-destructive/10 border border-destructive/30 rounded-2xl">
            <p className="text-destructive font-medium">Failed to load the gallery. Please try again.</p>
          </div>
        ) : filteredCoins.length === 0 ? (
          <div className="text-center py-32 border border-dashed border-border/50 rounded-2xl bg-black/20">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-primary opacity-50" />
            </div>
            <h3 className="text-xl font-serif font-bold text-foreground mb-2">
              {searchQuery ? "No Matches Found" : "The Vault is Empty"}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {searchQuery
                ? `No artifacts match "${searchQuery}". Try different keywords or clear the search.`
                : "No artifacts found in this category. Be the first to catalog a piece of history."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCoins.map((coin, i) => (
              <motion.div
                key={coin.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <CoinCard coin={coin} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
