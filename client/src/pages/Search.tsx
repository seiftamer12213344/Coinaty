import { useState } from "react";
import { Link } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useSearchUsers } from "@/hooks/use-users";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Search as SearchIcon, BadgeCheck, Users } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function Search() {
  const [query, setQuery] = useState("");
  const { data: results, isLoading } = useSearchUsers(query);
  const { t } = useLanguage();

  return (
    <Shell>
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-1">{t("searchCollectors")}</h1>
          <p className="text-muted-foreground text-sm">{t("searchPlaceholder2")}</p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <Input
            data-testid="input-search-users"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder2")}
            className="pl-12 h-12 bg-card border-border focus:border-primary text-base rounded-xl"
            autoFocus
          />
        </div>

        {/* Results */}
        <div>
          {query.trim() === "" ? (
            <div className="text-center py-20">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">{t("searchPlaceholder2")}</p>
            </div>
          ) : isLoading ? (
            <LoadingSpinner />
          ) : results?.length === 0 ? (
            <div className="text-center py-20 bg-card/30 rounded-2xl border border-dashed border-border/50">
              <p className="text-muted-foreground">{t("noUsersFound")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results?.map(user => (
                <Link key={user.id} href={`/profile/${user.id}`}>
                  <div
                    data-testid={`card-user-${user.id}`}
                    className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-muted border border-border overflow-hidden flex-shrink-0">
                      {user.profileImageUrl ? (
                        <img src={user.profileImageUrl} alt={user.displayName || "User"} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-serif text-xl text-primary bg-black/40">
                          {(user.displayName || "U")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">
                          {user.displayName || "Anonymous Collector"}
                        </span>
                        {user.points && user.points > 100 && (
                          <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {user.points || 0} {t("points")}
                      </p>
                    </div>
                    <span className="text-xs text-primary font-medium">{t("viewProfile")} →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
