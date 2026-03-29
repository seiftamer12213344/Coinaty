import { useState, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile, useUpdateProfile } from "@/hooks/use-users";
import { useCoins } from "@/hooks/use-coins";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useVaultFolders, usePublicVaultFolders, useFolderCoins, useCoinFolders, useCreateFolder, useRenameFolder, useDeleteFolder, useAddCoinToFolder, useRemoveCoinFromFolder } from "@/hooks/use-vault-folders";
import { Shell } from "@/components/layout/Shell";
import { CoinCard } from "@/components/CoinCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Shield, MapPin, CalendarDays, Edit3, MessageSquare, Bookmark, PlusCircle, Camera, Loader2, X, FolderPlus, Folder, FolderOpen, MoreHorizontal, Pencil, Trash2, ChevronLeft, FolderInput } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Coin, VaultFolder } from "@shared/schema";

type FolderWithCount = VaultFolder & { coinCount: number };

function FolderCard({
  folder,
  isOwn,
  isActive,
  onClick,
  onRename,
  onDelete,
}: {
  folder: FolderWithCount;
  isOwn: boolean;
  isActive: boolean;
  onClick: () => void;
  onRename: (f: FolderWithCount) => void;
  onDelete: (f: FolderWithCount) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      data-testid={`folder-card-${folder.id}`}
      className={`relative group flex flex-col items-center gap-3 p-5 rounded-2xl border cursor-pointer transition-all duration-200 ${
        isActive
          ? "bg-primary/15 border-primary/50 shadow-[0_0_20px_rgba(212,175,55,0.15)]"
          : "bg-card/60 border-border/40 hover:border-primary/30 hover:bg-card/80"
      }`}
      onClick={onClick}
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${isActive ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"}`}>
        {isActive ? <FolderOpen className="w-7 h-7" /> : <Folder className="w-7 h-7" />}
      </div>
      <div className="text-center min-w-0 w-full">
        <p className="font-medium text-sm truncate text-foreground">{folder.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{folder.coinCount} {folder.coinCount === 1 ? "coin" : "coins"}</p>
      </div>

      {isOwn && (
        <div className="absolute top-2.5 right-2.5">
          <button
            data-testid={`folder-menu-${folder.id}`}
            className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-7 z-20 bg-card border border-border rounded-xl shadow-2xl py-1 w-36 text-sm">
              <button
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/5 text-foreground"
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); onRename(folder); }}
              >
                <Pencil className="w-3.5 h-3.5" /> Rename
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-destructive/10 text-destructive"
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(folder); }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrganizeFolderModal({
  coin,
  folders,
  onClose,
}: {
  coin: Coin;
  folders: FolderWithCount[];
  onClose: () => void;
}) {
  const { data: coinFolders } = useCoinFolders(coin.id);
  const addToFolder = useAddCoinToFolder();
  const removeFromFolder = useRemoveCoinFromFolder();
  const { toast } = useToast();

  const isInFolder = (folderId: number) =>
    coinFolders?.some(f => f.id === folderId) ?? false;

  const handleToggle = (folderId: number) => {
    if (isInFolder(folderId)) {
      removeFromFolder.mutate({ folderId, coinId: coin.id }, {
        onSuccess: () => toast({ title: "Removed from folder" }),
      });
    } else {
      addToFolder.mutate({ folderId, coinId: coin.id }, {
        onSuccess: () => toast({ title: "Added to folder" }),
      });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <FolderInput className="w-5 h-5 text-primary" /> Organize in Folders
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1 mb-1">"{coin.title}"</p>
        {folders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No folders yet. Create one in your vault.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {folders.map(folder => {
              const active = isInFolder(folder.id);
              return (
                <button
                  key={folder.id}
                  data-testid={`organize-folder-${folder.id}`}
                  onClick={() => handleToggle(folder.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    active ? "border-primary/50 bg-primary/10 text-primary" : "border-border/40 bg-white/3 hover:border-border hover:bg-white/5 text-foreground"
                  }`}
                >
                  {active ? <FolderOpen className="w-4 h-4 shrink-0" /> : <Folder className="w-4 h-4 shrink-0" />}
                  <span className="font-medium text-sm flex-1 truncate">{folder.name}</span>
                  <span className="text-xs text-muted-foreground">{folder.coinCount}</span>
                  <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all ${active ? "border-primary bg-primary" : "border-border"}`}>
                    {active && <X className="w-2.5 h-2.5 text-primary-foreground" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <Button variant="outline" className="w-full mt-2 border-border" onClick={onClose}>Done</Button>
      </DialogContent>
    </Dialog>
  );
}

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
  const { data: ownFolders } = useVaultFolders(isOwnProfile);
  const { data: publicFolders } = usePublicVaultFolders(!isOwnProfile ? targetId : undefined);
  const folders = (isOwnProfile ? ownFolders : publicFolders) ?? [];

  const updateProfile = useUpdateProfile();
  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();

  const [activeTab, setActiveTab] = useState<"vault" | "wishlist">("vault");
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderWithCount | null>(null);
  const [folderName, setFolderName] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [organizeCoin, setOrganizeCoin] = useState<Coin | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: folderCoins, isLoading: folderCoinsLoading } = useFolderCoins(activeFolderId ?? undefined);
  const activeFolder = folders.find(f => f.id === activeFolderId);

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
          toast({ title: "Profile updated" });
        },
        onError: () => toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" }),
      }
    );
  };

  const handleCreateFolder = () => {
    if (!folderName.trim()) return;
    createFolder.mutate(folderName.trim(), {
      onSuccess: () => {
        setFolderName("");
        setShowNewFolderModal(false);
        toast({ title: "Folder created", description: `"${folderName.trim()}" is ready.` });
      },
      onError: () => toast({ title: "Error", description: "Failed to create folder.", variant: "destructive" }),
    });
  };

  const handleRenameFolder = () => {
    if (!selectedFolder || !folderName.trim()) return;
    renameFolder.mutate({ id: selectedFolder.id, name: folderName.trim() }, {
      onSuccess: () => {
        setShowRenameModal(false);
        setSelectedFolder(null);
        setFolderName("");
        toast({ title: "Folder renamed" });
      },
      onError: () => toast({ title: "Error", description: "Failed to rename folder.", variant: "destructive" }),
    });
  };

  const handleDeleteFolder = () => {
    if (!selectedFolder) return;
    deleteFolder.mutate(selectedFolder.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        setSelectedFolder(null);
        if (activeFolderId === selectedFolder.id) setActiveFolderId(null);
        toast({ title: "Folder deleted" });
      },
      onError: () => toast({ title: "Error", description: "Failed to delete folder.", variant: "destructive" }),
    });
  };

  if (profileLoading) return <Shell><div className="pt-32"><LoadingSpinner /></div></Shell>;
  
  if (!profile) return (
    <Shell>
      <div className="p-8 text-center pt-32">
        <h2 className="text-2xl font-serif text-primary">Collector Not Found</h2>
      </div>
    </Shell>
  );

  const displayedCoins = activeFolderId ? (folderCoins ?? []) : (userCoins ?? []);
  const coinsAreLoading = activeFolderId ? folderCoinsLoading : coinsLoading;

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
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </button>
                ) : (
                  <button
                    data-testid="button-start-discussion"
                    onClick={() => { if (!authUser) { window.location.href = "/auth"; return; } setLocation(`/messages?user=${targetId}`); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-all"
                  >
                    <MessageSquare className="w-4 h-4" /> Start Discussion
                  </button>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 border-y border-border/50 py-6 mb-6">
              <div className="text-center">
                <p className="text-2xl font-serif font-bold text-foreground">{userCoins?.length || 0}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Artifacts</p>
              </div>
              <div className="text-center border-x border-border/50">
                <p className="text-2xl font-serif font-bold text-foreground">{folders.length}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Folders</p>
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
              onClick={() => { setActiveTab("vault"); setActiveFolderId(null); }}
              className={`pb-4 font-serif text-lg tracking-wide transition-all relative ${activeTab === 'vault' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              The Vault
              {activeTab === 'vault' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(212,175,55,0.8)]" />}
            </button>
            <button 
              data-testid="tab-wishlist"
              onClick={() => setActiveTab("wishlist")}
              className={`pb-4 font-serif text-lg tracking-wide transition-all relative flex items-center gap-2 ${activeTab === 'wishlist' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Bookmark className="w-4 h-4" />
              Watchlist
              {isOwnProfile && watchlistCoins && watchlistCoins.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-sans">
                  {watchlistCoins.length}
                </span>
              )}
              {activeTab === 'wishlist' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(212,175,55,0.8)]" />}
            </button>
          </div>

          <div className="pb-10">
            {/* ── VAULT TAB ── */}
            {activeTab === 'vault' && (
              <div className="space-y-8">

                {/* Folder drill-down breadcrumb */}
                {activeFolderId && (
                  <div className="flex items-center gap-3">
                    <button
                      data-testid="button-back-to-vault"
                      onClick={() => setActiveFolderId(null)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> All Folders
                    </button>
                    <span className="text-muted-foreground/40">/</span>
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <FolderOpen className="w-4 h-4 text-primary" />
                      {activeFolder?.name}
                    </span>
                  </div>
                )}

                {/* Folders section (only shown when not drilled in) */}
                {!activeFolderId && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Folder className="w-4 h-4" /> Collections
                      </h3>
                      {isOwnProfile && (
                        <button
                          data-testid="button-new-folder"
                          onClick={() => { setFolderName(""); setShowNewFolderModal(true); }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary transition-all"
                        >
                          <FolderPlus className="w-3.5 h-3.5" /> New Folder
                        </button>
                      )}
                    </div>

                    {folders.length === 0 ? (
                      <div className={`flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed border-border/40 bg-card/20 ${isOwnProfile ? "" : "hidden"}`}>
                        <Folder className="w-10 h-10 text-muted-foreground/20 mb-3" />
                        <p className="text-sm text-muted-foreground">No folders yet</p>
                        {isOwnProfile && (
                          <button
                            onClick={() => { setFolderName(""); setShowNewFolderModal(true); }}
                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary rounded-xl text-sm font-medium transition-all"
                          >
                            <FolderPlus className="w-4 h-4" /> Create your first folder
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {folders.map(folder => (
                          <FolderCard
                            key={folder.id}
                            folder={folder}
                            isOwn={isOwnProfile}
                            isActive={activeFolderId === folder.id}
                            onClick={() => setActiveFolderId(folder.id)}
                            onRename={(f) => { setSelectedFolder(f); setFolderName(f.name); setShowRenameModal(true); }}
                            onDelete={(f) => { setSelectedFolder(f); setShowDeleteConfirm(true); }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Coins section header */}
                <div>
                  {!activeFolderId && (
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        All Coins {userCoins ? `· ${userCoins.length}` : ""}
                      </h3>
                    </div>
                  )}

                  {coinsAreLoading ? (
                    <LoadingSpinner />
                  ) : displayedCoins.length === 0 ? (
                    <div className="text-center py-16 bg-card/30 rounded-2xl border border-dashed border-border/50">
                      {activeFolderId ? (
                        <>
                          <FolderOpen className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                          <p className="text-muted-foreground">This folder is empty.</p>
                          {isOwnProfile && (
                            <p className="text-xs text-muted-foreground/60 mt-2">Use the folder icon on coins in "All Coins" to add them here.</p>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground">The vault is currently empty.</p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {displayedCoins.map((coin) => (
                        <div key={coin.id} className="relative group/coinwrap">
                          <CoinCard coin={coin} />
                          {isOwnProfile && !activeFolderId && (
                            <button
                              data-testid={`button-organize-coin-${coin.id}`}
                              onClick={() => setOrganizeCoin(coin)}
                              title="Organize in folders"
                              className="absolute top-3 left-3 z-10 opacity-0 group-hover/coinwrap:opacity-100 transition-opacity flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/70 border border-white/10 hover:border-primary/50 hover:bg-black/90 text-xs text-muted-foreground hover:text-primary backdrop-blur-sm"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                              Folders
                            </button>
                          )}
                          {isOwnProfile && activeFolderId && (
                            <button
                              data-testid={`button-remove-from-folder-${coin.id}`}
                              onClick={() => setOrganizeCoin(coin)}
                              title="Manage folders"
                              className="absolute top-3 left-3 z-10 opacity-0 group-hover/coinwrap:opacity-100 transition-opacity flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/70 border border-primary/30 hover:border-primary/60 hover:bg-black/90 text-xs text-primary backdrop-blur-sm"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              Manage
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── WATCHLIST TAB ── */}
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
                        <PlusCircle className="w-4 h-4" /> Browse Gallery
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
                          <PlusCircle className="w-4 h-4" /> Explore the Gallery
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

      {/* Organize Coin in Folders Modal */}
      {organizeCoin && (
        <OrganizeFolderModal
          coin={organizeCoin}
          folders={folders as FolderWithCount[]}
          onClose={() => setOrganizeCoin(null)}
        />
      )}

      {/* New Folder Modal */}
      <Dialog open={showNewFolderModal} onOpenChange={setShowNewFolderModal}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" /> New Collection
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Folder Name</Label>
              <Input
                data-testid="input-folder-name"
                value={folderName}
                onChange={e => setFolderName(e.target.value)}
                placeholder="e.g. Ancient Rome, Silver Crowns…"
                className="bg-black/30 border-border focus:border-primary"
                onKeyDown={e => { if (e.key === "Enter") handleCreateFolder(); }}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setShowNewFolderModal(false)}>Cancel</Button>
              <Button
                data-testid="button-create-folder"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleCreateFolder}
                disabled={!folderName.trim() || createFolder.isPending}
              >
                {createFolder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Modal */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" /> Rename Folder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              data-testid="input-rename-folder"
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              placeholder="Folder name"
              className="bg-black/30 border-border focus:border-primary"
              onKeyDown={e => { if (e.key === "Enter") handleRenameFolder(); }}
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setShowRenameModal(false)}>Cancel</Button>
              <Button
                data-testid="button-save-rename"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleRenameFolder}
                disabled={!folderName.trim() || renameFolder.isPending}
              >
                {renameFolder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirm */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Delete Folder?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">
            "{selectedFolder?.name}" will be deleted. The coins inside won't be deleted, just removed from this folder.
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1 border-border" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button
              data-testid="button-confirm-delete-folder"
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteFolder}
              disabled={deleteFolder.isPending}
            >
              {deleteFolder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
