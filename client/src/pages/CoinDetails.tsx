import { useParams, Link } from "wouter";
import { useCoin, useComments, useCreateComment, useToggleLike, useCoinLikes } from "@/hooks/use-coins";
import { useUserProfile } from "@/hooks/use-users";
import { Shell } from "@/components/layout/Shell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ArrowLeft, Heart, Send, MessageSquare, RefreshCw } from "lucide-react";
import MarketValue from "@/components/MarketValue";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

export default function CoinDetails() {
  const { id } = useParams<{ id: string }>();
  const coinId = parseInt(id || "0");
  const { user } = useAuth();
  
  const { data: coin, isLoading: coinLoading } = useCoin(coinId);
  const { data: comments, isLoading: commentsLoading } = useComments(coinId);
  const { data: likes } = useCoinLikes(coinId);
  const { data: owner } = useUserProfile(coin?.userId);
  
  const toggleLike = useToggleLike();
  const createComment = useCreateComment();
  
  const [newComment, setNewComment] = useState("");
  const [showReverse, setShowReverse] = useState(false);

  const hasLiked = likes?.some(u => u.id === user?.id) || false;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    
    createComment.mutate(
      { coinId, content: newComment.trim() },
      { onSuccess: () => setNewComment("") }
    );
  };

  if (coinLoading) return <Shell><div className="pt-32"><LoadingSpinner /></div></Shell>;
  
  if (!coin) return (
    <Shell>
      <div className="p-8 text-center pt-32">
        <h2 className="text-2xl font-serif text-primary">Artifact Not Found</h2>
        <Link href="/" className="text-muted-foreground mt-4 inline-block hover:underline">Return to Gallery</Link>
      </div>
    </Shell>
  );

  return (
    <Shell>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Gallery
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Left Col - Image */}
          <div className="lg:col-span-3 space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-black/80 rounded-3xl border border-border/50 overflow-hidden relative aspect-square flex items-center justify-center p-8 gold-border-glow"
            >
               {/* Decorative background circle */}
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                 <div className="w-[80%] h-[80%] rounded-full border border-primary border-dashed animate-[spin_60s_linear_infinite]" />
               </div>

              <motion.img 
                key={showReverse ? "reverse" : "obverse"}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.35 }}
                src={showReverse && coin.backPhotoUrl ? coin.backPhotoUrl : (coin.photoUrl || "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=1200&q=80")} 
                alt={showReverse ? `${coin.title} — Reverse` : coin.title}
                className="max-w-full max-h-full object-contain drop-shadow-2xl z-10 hover:scale-110 transition-transform duration-700 cursor-zoom-in pl-[232px] pr-[232px] pt-[222px] pb-[222px]"
              />

              {/* Side label */}
              <div className="absolute bottom-4 left-4 z-20">
                <span className="px-2.5 py-1 rounded-full bg-black/60 border border-primary/30 text-primary text-[10px] font-semibold uppercase tracking-widest">
                  {showReverse ? "Reverse" : "Obverse"}
                </span>
              </div>

              {/* Flip button */}
              {(coin.backPhotoUrl) && (
                <button
                  data-testid="button-flip-coin"
                  onClick={() => setShowReverse(v => !v)}
                  className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-primary/40 text-primary hover:bg-primary/20 hover:border-primary transition-all text-xs font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reverse
                </button>
              )}
            </motion.div>

            {/* Interaction Bar */}
            <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border/50">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => user ? toggleLike.mutate(coinId) : window.location.href="/auth"}
                  className="flex items-center gap-2 group"
                >
                  <div className={`p-2 rounded-full transition-colors ${hasLiked ? 'bg-primary/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                    <Heart className={`w-6 h-6 ${hasLiked ? 'fill-primary text-primary drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]' : 'text-foreground'}`} />
                  </div>
                  <span className="font-medium font-serif text-lg">{likes?.length || 0}</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-white/5">
                    <MessageSquare className="w-6 h-6 text-foreground" />
                  </div>
                  <span className="font-medium font-serif text-lg">{comments?.length || 0}</span>
                </div>
              </div>

               <a 
                href={`https://en.numista.com/catalogue/index.php?e=&r=${encodeURIComponent(coin.title)}`}
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-shadow text-sm"
              >
                Numista
              </a>
            </div>
          </div>

          {/* Right Col - Details & Comments */}
          <div className="lg:col-span-2 flex flex-col space-y-8">
            
            {/* Details Section */}
            <div className="space-y-6 bg-card border border-border/50 p-6 rounded-3xl">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold tracking-wider uppercase mb-3">
                  {coin.category}
                </span>
                <h1 className="text-3xl font-serif font-bold text-foreground mb-4 leading-tight">{coin.title}</h1>
                <p className="text-muted-foreground leading-relaxed">
                  {coin.description}
                </p>
              </div>

              <div className="pt-6 border-t border-border/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Metal</p>
                <p className="font-medium text-foreground">{coin.metalType || "Unknown"}</p>
              </div>

              <div className="pt-6 border-t border-border/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Cataloged By</p>
                <Link href={`/profile/${coin.userId}`} className="flex items-center gap-3 group">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-muted border-2 border-transparent group-hover:border-primary transition-all">
                     {owner?.profileImageUrl ? (
                        <img src={owner.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-serif text-lg bg-black/50">
                          {(owner?.displayName || "U")[0].toUpperCase()}
                        </div>
                      )}
                  </div>
                  <div>
                    <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                      {owner?.displayName || "Unknown Collector"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {coin.createdAt ? formatDistanceToNow(new Date(coin.createdAt), { addSuffix: true }) : ""}
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Market Value */}
            {coin.numistaId && (
              <MarketValue numistaId={coin.numistaId} coinTitle={coin.title} />
            )}

            {/* Comments Section */}
            <div className="flex-1 flex flex-col bg-card border border-border/50 rounded-3xl overflow-hidden max-h-[600px]">
              <div className="p-4 border-b border-border/50 bg-black/20">
                <h3 className="font-serif text-lg font-semibold">Scholar's Notes</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/10">
                {commentsLoading ? (
                  <div className="py-8"><LoadingSpinner /></div>
                ) : comments?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 italic">No notes scribed yet. Be the first.</p>
                ) : (
                  comments?.map(comment => (
                    <div key={comment.id} className="bg-background rounded-xl p-3 border border-white/5">
                      <div className="flex justify-between items-start mb-2">
                        <Link href={`/profile/${comment.userId}`} className="font-medium text-sm hover:text-primary transition-colors">
                          Scholar #{comment.userId.substring(0, 4)} {/* Mock user name since comment API doesn't populate relations by default in this simplistic setup */}
                        </Link>
                        <span className="text-[10px] text-muted-foreground">
                          {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : ""}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <div className="p-4 bg-background border-t border-border/50">
                {user ? (
                  <form onSubmit={handleCommentSubmit} className="relative">
                    <input 
                      type="text" 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a note to the archives..."
                      className="w-full bg-card border border-border/50 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                      disabled={createComment.isPending}
                    />
                    <button 
                      type="submit" 
                      disabled={!newComment.trim() || createComment.isPending}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-primary hover:bg-primary/10 disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-2">
                    <button onClick={() => window.location.href="/auth"} className="text-sm text-primary hover:underline font-medium">
                      Sign in to scribe notes
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </Shell>
  );
}
