import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageSquare, ExternalLink, BadgeCheck, Trash2, Bookmark, RefreshCw } from "lucide-react";
import type { Coin } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToggleLike, useCoinLikes, useComments, useDeleteCoin } from "@/hooks/use-coins";
import { useUserProfile } from "@/hooks/use-users";
import { useWatchlistStatus, useToggleWatchlist } from "@/hooks/use-watchlist";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function CoinCard({ coin }: { coin: Coin }) {
  const { user } = useAuth();
  const toggleLike = useToggleLike();
  const deleteCoin = useDeleteCoin();
  const toggleWatchlist = useToggleWatchlist();
  const { data: likes } = useCoinLikes(coin.id);
  const { data: comments } = useComments(coin.id);
  const { data: owner } = useUserProfile(coin.userId);
  const { data: watchlistStatus } = useWatchlistStatus(coin.id);
  
  const [showLikes, setShowLikes] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBack, setShowBack] = useState(false);

  const hasLiked = likes?.some(u => u.id === user?.id) || false;
  const isOwner = user?.id === coin.userId;
  const isWatchlisted = watchlistStatus?.inWatchlist || false;
  const numistaLink = `https://en.numista.com/catalogue/index.php?e=&r=${encodeURIComponent(coin.title)}`;

  const getMetalGlow = (metal: string | null) => {
    if (!metal) return "border-border/30";
    const m = metal.toLowerCase();
    if (m.includes("gold")) return "border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.1)]";
    if (m.includes("silver")) return "border-[#C0C0C0]/50 shadow-[0_0_15px_rgba(192,192,192,0.1)]";
    if (m.includes("bronze") || m.includes("copper")) return "border-[#CD7F32]/50";
    return "border-border/30";
  };

  const handleDelete = () => {
    deleteCoin.mutate(coin.id, {
      onSuccess: () => setShowDeleteConfirm(false),
    });
  };

  return (
    <div className={`bg-card rounded-2xl border ${getMetalGlow(coin.metalType)} overflow-hidden transition-all duration-300 hover:border-primary/50 group`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${coin.userId}`}>
            <div className="w-10 h-10 rounded-full bg-muted border border-border overflow-hidden cursor-pointer hover:border-primary transition-colors">
              {owner?.profileImageUrl ? (
                <img src={owner.profileImageUrl} alt={owner.displayName || "User"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif">
                  {(owner?.displayName || "U")[0].toUpperCase()}
                </div>
              )}
            </div>
          </Link>
          <div>
            <Link href={`/profile/${coin.userId}`}>
              <h4 className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors flex items-center gap-1">
                {owner?.displayName || "Unknown Collector"}
                {owner?.points && owner.points > 100 && <BadgeCheck className="w-4 h-4 text-primary" />}
              </h4>
            </Link>
            <p className="text-xs text-muted-foreground">
              {coin.createdAt ? formatDistanceToNow(new Date(coin.createdAt), { addSuffix: true }) : "Recently"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
            {coin.category}
          </span>
          {isOwner && (
            <button
              data-testid={`button-delete-coin-${coin.id}`}
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete coin"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {/* 3D Flip Card */}
      <div className="relative aspect-square w-full" style={{ perspective: "1000px" }}>
        <div
          className="relative w-full h-full transition-transform duration-700 ease-in-out"
          style={{
            transformStyle: "preserve-3d",
            transform: showBack ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front face — Obverse */}
          <div className="absolute inset-0 bg-black/50" style={{ backfaceVisibility: "hidden" }}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10 pointer-events-none" />
            <Link href={`/coin/${coin.id}`}>
              <img
                src={coin.photoUrl || "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800&q=80"}
                alt={`${coin.title} — Obverse`}
                className="w-full h-full object-contain cursor-pointer"
                onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800&q=80"; }}
              />
            </Link>
            <div className="absolute top-3 left-3 z-20">
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full bg-black/60 text-white/70 backdrop-blur-sm border border-white/10">
                Obverse
              </span>
            </div>
          </div>

          {/* Back face — Reverse */}
          <div
            className="absolute inset-0 bg-black/50"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10 pointer-events-none" />
            {coin.backPhotoUrl ? (
              <Link href={`/coin/${coin.id}`}>
                <img
                  src={coin.backPhotoUrl}
                  alt={`${coin.title} — Reverse`}
                  className="w-full h-full object-contain cursor-pointer"
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800&q=80"; }}
                />
              </Link>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/40">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 opacity-40" />
                </div>
                <p className="text-xs font-medium tracking-widest uppercase">No Reverse Image</p>
              </div>
            )}
            <div className="absolute top-3 left-3 z-20">
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full bg-black/60 text-white/70 backdrop-blur-sm border border-white/10">
                Reverse
              </span>
            </div>
          </div>
        </div>

        {/* Flip button — always visible */}
        <button
          data-testid={`button-flip-${coin.id}`}
          onClick={(e) => { e.preventDefault(); setShowBack(b => !b); }}
          title={showBack ? "Show Obverse" : "Show Reverse"}
          className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-primary/80 backdrop-blur-sm border border-white/15 hover:border-primary text-white/80 hover:text-white text-xs font-semibold transition-all duration-200 shadow-lg"
        >
          <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-700 ${showBack ? "rotate-180" : "rotate-0"}`} />
          {showBack ? "Obverse" : "Reverse"}
        </button>
      </div>
      {/* Content */}
      <div className="p-5">
        <Link href={`/coin/${coin.id}`}>
          <h3 className="font-serif text-xl font-bold text-foreground mb-2 cursor-pointer hover:text-primary transition-colors">
            {coin.title}
          </h3>
        </Link>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4 leading-relaxed">
          {coin.description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <button 
                data-testid={`button-like-${coin.id}`}
                onClick={() => {
                  if (!user) window.location.href = "/auth";
                  else toggleLike.mutate(coin.id);
                }}
                className="group p-1"
                disabled={toggleLike.isPending}
              >
                <Heart 
                  className={`w-6 h-6 transition-all duration-300 ${
                    hasLiked 
                      ? "fill-primary text-primary scale-110 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" 
                      : "text-muted-foreground group-hover:text-primary"
                  }`} 
                />
              </button>
              <button 
                data-testid={`button-likes-count-${coin.id}`}
                className="text-sm font-medium hover:text-primary"
                onClick={() => setShowLikes(true)}
              >
                {likes?.length || 0}
              </button>
            </div>

            <Link href={`/coin/${coin.id}`} className="flex items-center gap-1.5 group p-1 text-muted-foreground hover:text-foreground">
              <MessageSquare className="w-6 h-6 transition-colors" />
              <span className="text-sm font-medium">{comments?.length || 0}</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              data-testid={`button-watchlist-${coin.id}`}
              onClick={() => {
                if (!user) { window.location.href = "/auth"; return; }
                toggleWatchlist.mutate(coin.id);
              }}
              disabled={toggleWatchlist.isPending}
              title={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
              className={`p-2 rounded-lg border transition-all ${
                isWatchlisted
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isWatchlisted ? "fill-primary" : ""}`} />
            </button>
            <a 
              href={numistaLink} 
              target="_blank" 
              rel="noreferrer"
              data-testid={`link-check-value-${coin.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-primary/10 border border-white/10 hover:border-primary/50 text-xs font-medium text-foreground transition-all"
            >
              Check Value
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
      {/* Likes Dialog */}
      <Dialog open={showLikes} onOpenChange={setShowLikes}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Admirers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {likes?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No admirers yet.</p>
            ) : (
              likes?.map(liker => (
                <div key={liker.id} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                       {liker.profileImageUrl ? (
                        <img src={liker.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          {(liker.displayName || "U")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="font-medium">{liker.displayName || "Unknown"}</span>
                  </div>
                  <Link href={`/profile/${liker.id}`} className="text-xs text-primary hover:underline">
                    View Vault
                  </Link>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Remove from Vault?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will permanently remove <span className="text-foreground font-medium">"{coin.title}"</span> from your collection. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              data-testid="button-cancel-delete"
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              data-testid="button-confirm-delete"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCoin.isPending}
            >
              {deleteCoin.isPending ? "Removing..." : "Remove Coin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
