import { useLeaderboard } from "@/hooks/use-users";
import { Shell } from "@/components/layout/Shell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Trophy, Medal, Crown } from "lucide-react";
import { Link } from "wouter";

export default function Leaderboard() {
  const { data: users, isLoading } = useLeaderboard();

  return (
    <Shell>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
        
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/50 mb-2 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
            <Trophy className="w-10 h-10 text-primary drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">Top Collectors</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Recognizing the most dedicated numismatists in the realm. Points are awarded for contributions to the gallery.
          </p>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 bg-black/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-2 md:col-span-1 text-center">Rank</div>
              <div className="col-span-7 md:col-span-8">Collector</div>
              <div className="col-span-3 text-right pr-4">Prestige</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/20">
              {users?.map((user, index) => {
                const isTop3 = index < 3;
                
                return (
                  <Link href={`/profile/${user.id}`} key={user.id}>
                    <div className={`grid grid-cols-12 gap-4 p-4 items-center cursor-pointer transition-all duration-300 hover:bg-white/5 ${
                      index === 0 ? "bg-primary/5 border-l-2 border-l-primary" : ""
                    }`}>
                      
                      {/* Rank Icon */}
                      <div className="col-span-2 md:col-span-1 flex justify-center">
                        {index === 0 ? <Crown className="w-6 h-6 text-[#FFD700] drop-shadow-md" /> :
                         index === 1 ? <Medal className="w-6 h-6 text-[#C0C0C0]" /> :
                         index === 2 ? <Medal className="w-6 h-6 text-[#CD7F32]" /> :
                         <span className="font-serif text-lg text-muted-foreground font-bold">{index + 1}</span>}
                      </div>

                      {/* User Info */}
                      <div className="col-span-7 md:col-span-8 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${
                          isTop3 ? "border-primary" : "border-transparent bg-muted"
                        }`}>
                          {user.profileImageUrl ? (
                            <img src={user.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-serif text-lg bg-black/50 text-foreground">
                              {(user.displayName || "U")[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className={`font-bold ${isTop3 ? "text-foreground" : "text-foreground/80"}`}>
                            {user.displayName || "Anonymous"}
                          </p>
                        </div>
                      </div>

                      {/* Points */}
                      <div className="col-span-3 text-right pr-4">
                        <span className={`font-serif text-xl font-bold ${
                          isTop3 ? "text-primary drop-shadow-[0_0_5px_rgba(212,175,55,0.4)]" : "text-muted-foreground"
                        }`}>
                          {user.points || 0}
                        </span>
                      </div>

                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
