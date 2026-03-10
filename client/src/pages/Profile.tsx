import { useState } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-users";
import { useCoins } from "@/hooks/use-coins";
import { Shell } from "@/components/layout/Shell";
import { CoinCard } from "@/components/CoinCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Settings, Shield, MapPin, CalendarDays, Edit3 } from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const { id } = useParams<{ id?: string }>();
  const { user: authUser } = useAuth();
  
  // If no ID provided, view own profile. If ID provided, view that user's profile.
  const targetId = id || authUser?.id;
  const isOwnProfile = targetId === authUser?.id;

  const { data: profile, isLoading: profileLoading } = useUserProfile(targetId);
  const { data: userCoins, isLoading: coinsLoading } = useCoins({ userId: targetId });

  const [activeTab, setActiveTab] = useState<"vault" | "wishlist">("vault");

  if (profileLoading) return <Shell><div className="pt-32"><LoadingSpinner /></div></Shell>;
  
  if (!profile) return (
    <Shell>
      <div className="p-8 text-center pt-32">
        <h2 className="text-2xl font-serif text-primary">Collector Not Found</h2>
      </div>
    </Shell>
  );

  const totalValue = userCoins?.reduce((sum, coin) => sum + (coin.estimatedValue || 0), 0) || 0;

  return (
    <Shell>
      <div className="p-0 md:p-8 space-y-6">
        
        {/* Profile Header Card */}
        <div className="bg-card md:rounded-3xl border-b md:border border-border/50 overflow-hidden">
          <div className="h-32 md:h-48 bg-gradient-to-r from-black via-[#2a220e] to-black relative border-b border-primary/20">
            {/* Banner pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent" />
          </div>
          
          <div className="px-6 md:px-10 pb-8 relative">
            <div className="flex flex-col md:flex-row gap-6 md:items-end -mt-16 md:-mt-20 mb-6">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-card bg-muted overflow-hidden relative shadow-2xl z-10 gold-border-glow">
                 {profile.profileImageUrl ? (
                    <img src={profile.profileImageUrl} alt={profile.displayName || "Profile"} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-serif text-5xl bg-black/80 text-primary">
                      {(profile.displayName || "C")[0].toUpperCase()}
                    </div>
                  )}
              </div>
              
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-serif font-bold text-foreground">{profile.displayName || "Anonymous Collector"}</h1>
                  {profile.points && profile.points > 100 && (
                    <Shield className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
                  )}
                </div>
                <p className="text-muted-foreground text-sm flex items-center gap-4">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Global</span>
                  <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Member</span>
                </p>
              </div>

              {isOwnProfile && (
                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/10 rounded-lg text-sm font-medium transition-all w-fit">
                  <Edit3 className="w-4 h-4" /> Edit Profile
                </button>
              )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 border-y border-border/50 py-6 mb-6">
               <div className="text-center">
                  <p className="text-2xl font-serif font-bold text-foreground">{userCoins?.length || 0}</p>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Artifacts</p>
               </div>
               <div className="text-center border-x border-border/50">
                  <p className="text-2xl font-serif font-bold text-primary drop-shadow-[0_0_5px_rgba(212,175,55,0.3)]">${totalValue.toLocaleString()}</p>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Vault Value</p>
               </div>
               <div className="text-center">
                  <p className="text-2xl font-serif font-bold text-foreground">{profile.points || 0}</p>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Prestige Pts</p>
               </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-0">
          <div className="flex items-center gap-8 border-b border-border/50 mb-6">
            <button 
              onClick={() => setActiveTab("vault")}
              className={`pb-4 font-serif text-lg tracking-wide transition-all relative ${activeTab === 'vault' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              The Vault
              {activeTab === 'vault' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(212,175,55,0.8)]" />}
            </button>
            <button 
              onClick={() => setActiveTab("wishlist")}
              className={`pb-4 font-serif text-lg tracking-wide transition-all relative ${activeTab === 'wishlist' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Wishlist
              {activeTab === 'wishlist' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(212,175,55,0.8)]" />}
            </button>
          </div>

          {/* Content */}
          <div className="pb-10">
            {activeTab === 'vault' && (
              coinsLoading ? (
                <LoadingSpinner />
              ) : userCoins?.length === 0 ? (
                <div className="text-center py-20 bg-card/30 rounded-2xl border border-dashed border-border/50">
                  <p className="text-muted-foreground">The vault is currently empty.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                  {userCoins?.map((coin) => (
                    <CoinCard key={coin.id} coin={coin} />
                  ))}
                </div>
              )
            )}

            {activeTab === 'wishlist' && (
               <div className="text-center py-20 bg-card/30 rounded-2xl border border-dashed border-border/50">
                  <p className="text-muted-foreground italic">"A collector's work is never done."</p>
                  <p className="text-sm mt-2 text-primary/60">Wishlist feature coming in next exhibition.</p>
                </div>
            )}
          </div>
        </div>

      </div>
    </Shell>
  );
}
