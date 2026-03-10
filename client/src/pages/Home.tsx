import { useState } from "react";
import { useCoins } from "@/hooks/use-coins";
import { Shell } from "@/components/layout/Shell";
import { CoinCard } from "@/components/CoinCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Search, Filter } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORIES = ["All", "Ancient", "Medieval", "Ottoman", "Kingdom of Egypt", "Modern", "Error Coins"];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All");
  
  const { data: coins, isLoading, error } = useCoins(
    activeCategory !== "All" ? { category: activeCategory } : undefined
  );

  return (
    <Shell>
      <div className="p-4 md:p-8 space-y-8">
        {/* Page Header */}
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
              placeholder="Search catalog..." 
              className="w-full bg-black/40 border border-border/50 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Categories / Filters */}
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

        {/* Feed Grid */}
        {isLoading ? (
          <div className="py-20">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-destructive/10 border border-destructive/30 rounded-2xl">
            <p className="text-destructive font-medium">Failed to load the gallery. Please try again.</p>
          </div>
        ) : !coins || coins.length === 0 ? (
          <div className="text-center py-32 border border-dashed border-border/50 rounded-2xl bg-black/20">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-primary opacity-50" />
            </div>
            <h3 className="text-xl font-serif font-bold text-foreground mb-2">The Vault is Empty</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              No artifacts found in this category. Be the first to catalog a piece of history.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {coins.map((coin, i) => (
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
