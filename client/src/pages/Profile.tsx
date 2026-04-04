import { useState, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile, useUpdateProfile } from "@/hooks/use-users";
import { useCoins } from "@/hooks/use-coins";
import { useWatchlist } from "@/hooks/use-watchlist";
import { Shell } from "@/components/layout/Shell";
import { CoinCard } from "@/components/CoinCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Shield, MapPin, CalendarDays, Edit3, MessageSquare, Bookmark, PlusCircle, Camera, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

export default function Profile() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const targetId = id || authUser?.id;
  const isOwnProfile = targetId === authUser?.id;

  const { data: profile, isLoading: profileLoading } = useUserProfile(targetId);
  const { data: userCoins, isLoading: coinsLoading } = useCoins({ userId: targetId });
  const { data: watchlistCoins, isLoading: watchlistLoading } = useWatchlist(isOwnProfile);
  const updateProfile = useUpdateProfile();

  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"vault" | "wishlist">("vault");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openEditModal = () => {
    setEditDisplayName(profile?.displayName || "");
    setEditPhotoUrl(profile?.profileImageUrl || "");
    setShowEditModal(true);
  };

  const handleSaveProfile = () => {
    updateProfile.mutate(
      { displayName: editDisplayName, profileImageUrl: editPhotoUrl },
      {
        onSuccess: () => {
          setShowEditModal(false);
          toast({ title: "Profile updated", description: "Your profile has been updated." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
        },
      }
    );
  };

  if (profileLoading) return <Shell><div className="pt-32"><LoadingSpinner /></div></Shell>;

  if (!profile) return (
    <Shell>
      <div className="p-8 text-center pt-32">
        <h2 className="text-2xl font-serif text-primary">Collector Not Found</h2>
      </div>
    </Shell>
  );

  return (
    <Shell>
      <div className="p-0 md:p-8 space-y-6">

        {/* Profile Header Card */}
        <div className="bg-card md:rounded-3xl border-b md:border border-border/50 overflow-hidden">
          <div className="h-32 md:h-48 bg-gradient-to-r from-black via-[#2a220e] to-black relative border-b border-primary/20">
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

              <div className="flex items-center gap-2 flex-wrap">
                {isOwnProfile ? (
                  <button
                    data-testid="button-edit-profile"
                    onClick={openEditModal}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/10 rounded-lg text-sm font-medium transition-all"
                  >
                    <Edit3 className="w-4 h-4" /> {t("editProfile")}
                  </button>
                ) : (
                  <button
                    data-testid="button-start-discussion"
                    onClick={() => { if (!authUser) { window.location.href = "/auth"; return; } setLocation(`/messages?user=${targetId}`); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-all"
                  >
                    <MessageSquare className="w-4 h-4" /> {t("sendMessage")}
                  </button>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 border-y border-border/50 py-6 mb-6">
              <div className="text-center">
                <p className="text-2xl font-serif font-bold text-foreground">{userCoins?.length || 0}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{t("coins")}</p>
              </div>
              <div className="text-center border-l border-border/50">
                <p className="text-2xl font-serif font-bold text-foreground">{profile.points || 0}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{t("points")}</p>
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
              {t("vault")}
              {activeTab === 'vault' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(212,175,55,0.8)]" />}
            </button>
            <button
              data-testid="tab-wishlist"
              onClick={() => setActiveTab("wishlist")}
              className={`pb-4 font-serif text-lg tracking-wide transition-all relative flex items-center gap-2 ${activeTab === 'wishlist' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Bookmark className="w-4 h-4" />
              {t("watchlist")}
              {isOwnProfile && watchlistCoins && watchlistCoins.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-sans">
                  {watchlistCoins.length}
                </span>
              )}
              {activeTab === 'wishlist' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(212,175,55,0.8)]" />}
            </button>
          </div>

          <div className="pb-10">
            {activeTab === 'vault' && (
              coinsLoading ? (
                <LoadingSpinner />
              ) : userCoins?.length === 0 ? (
                <div className="text-center py-20 bg-card/30 rounded-2xl border border-dashed border-border/50">
                  <p className="text-muted-foreground">{t("noCoinsYet")}</p>
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
              isOwnProfile ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-sm text-muted-foreground">
                      Bookmark coins from the gallery using the <Bookmark className="w-3.5 h-3.5 inline text-primary mx-0.5" /> button.
                    </p>
                    <Link href="/">
                      <button
                        data-testid="button-add-to-watchlist"
                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary rounded-xl text-sm font-medium transition-all"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Browse Gallery
                      </button>
                    </Link>
                  </div>

                  {watchlistLoading ? (
                    <LoadingSpinner />
                  ) : !watchlistCoins || watchlistCoins.length === 0 ? (
                    <div className="text-center py-20 bg-card/30 rounded-2xl border border-dashed border-border/50">
                      <Bookmark className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">Your watchlist is empty.</p>
                      <p className="text-sm text-muted-foreground/60 mt-1 mb-5">Save coins you're interested in to track them here.</p>
                      <Link href="/">
                        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary rounded-xl text-sm font-medium transition-all">
                          <PlusCircle className="w-4 h-4" />
                          Explore the Gallery
                        </button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {watchlistCoins.map((coin) => (
                        <CoinCard key={coin.id} coin={coin} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 bg-card/30 rounded-2xl border border-dashed border-border/50">
                  <Bookmark className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground italic">Watchlists are private.</p>
                </div>
              )
            )}
          </div>
        </div>

      </div>

      {/* Edit Profile Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm text-muted-foreground uppercase tracking-wider">Display Name</Label>
              <Input
                id="displayName"
                data-testid="input-display-name"
                value={editDisplayName}
                onChange={e => setEditDisplayName(e.target.value)}
                placeholder="Your collector name"
                className="bg-black/30 border-border focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground uppercase tracking-wider">Profile Photo</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-muted border-2 border-border">
                    {editPhotoUrl ? (
                      <img src={editPhotoUrl} alt="Preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-serif text-2xl bg-black/80 text-primary">
                        {(editDisplayName || "C")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  {editPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setEditPhotoUrl("")}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="button-upload-photo"
                    className="w-full border-border hover:border-primary/50"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading...</>
                    ) : (
                      <><Camera className="w-4 h-4 mr-2" /> Upload Photo</>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">JPG, PNG up to 8 MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  data-testid="input-photo-file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/")) {
                      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
                      return;
                    }
                    if (file.size > 8 * 1024 * 1024) {
                      toast({ title: "File too large", description: "Photo must be under 8 MB.", variant: "destructive" });
                      return;
                    }
                    setUploading(true);
                    try {
                      const form = new FormData();
                      form.append("image", file);
                      const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
                      if (!res.ok) throw new Error();
                      const { url } = await res.json();
                      setEditPhotoUrl(url);
                    } catch {
                      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
                    } finally {
                      setUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                data-testid="button-cancel-edit"
                variant="outline"
                className="flex-1 border-border"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button
                data-testid="button-save-profile"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSaveProfile}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
