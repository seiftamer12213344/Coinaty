import { Shell } from "@/components/layout/Shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Lock,
  Monitor,
  Ruler,
  Scale,
  MessageCircle,
  ShieldOff,
  Eye,
  EyeOff,
  Bell,
  Heart,
  MessageSquare,
  Trash2,
  AlertTriangle,
  UserX,
} from "lucide-react";
import { Link } from "wouter";
import type { UserSettings } from "@shared/schema";

function SectionHeader({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/50">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h2 className="font-serif text-lg font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      data-testid={`toggle-${checked ? "on" : "off"}`}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-muted-foreground/30"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data: settings, isLoading: settingsLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
    enabled: isAuthenticated,
  });

  const { data: blockedUsers, isLoading: blockedLoading } = useQuery<
    { id: number; blockedUserId: string; user: { id: string; displayName: string | null; profileImageUrl: string | null } }[]
  >({
    queryKey: ["/api/settings/blocked"],
    enabled: isAuthenticated,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const res = await apiRequest("PUT", "/api/settings", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const changePasswordMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/settings/change-password", {
        currentPassword,
        newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "Password updated" });
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to change password", variant: "destructive" });
    },
  });

  const unblockMut = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/settings/block/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/blocked"] });
      toast({ title: "User unblocked" });
    },
  });

  const deleteAccountMut = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/settings/account");
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/auth";
    },
    onError: () => toast({ title: "Failed to delete account", variant: "destructive" }),
  });

  if (!isAuthenticated) {
    return (
      <Shell>
        <div className="p-8 text-center pt-32">
          <h2 className="text-2xl font-serif text-primary">Sign In Required</h2>
          <Link href="/auth" className="text-muted-foreground mt-4 inline-block hover:underline">
            Sign in to access settings
          </Link>
        </div>
      </Shell>
    );
  }

  if (settingsLoading) {
    return (
      <Shell>
        <div className="pt-32">
          <LoadingSpinner />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Gallery
        </Link>

        <h1 className="text-3xl font-serif font-bold text-foreground mb-8" data-testid="text-settings-title">
          Settings
        </h1>

        <div className="space-y-6">
          {/* Account Security */}
          <div className="bg-card border border-border/50 rounded-2xl p-6">
            <SectionHeader title="Account Security" icon={Lock} />

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Current Password</label>
                <input
                  data-testid="input-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-background border border-border/50 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
                <input
                  data-testid="input-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  className="w-full bg-background border border-border/50 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <button
                data-testid="button-change-password"
                onClick={() => changePasswordMut.mutate()}
                disabled={!newPassword || newPassword.length < 6 || changePasswordMut.isPending}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {changePasswordMut.isPending ? "Changing..." : "Change Password"}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-border/30">
              <div className="flex items-center gap-3 mb-2">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
              </div>
              <div className="bg-background rounded-xl p-3 border border-border/30 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Current Session</p>
                  <p className="text-xs text-muted-foreground">Logged in now</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-semibold">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Collection Preferences */}
          <div className="bg-card border border-border/50 rounded-2xl p-6">
            <SectionHeader title="Collection Preferences" icon={Scale} />

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Default Units</p>
                    <p className="text-xs text-muted-foreground">Measurement system for dimensions & weight</p>
                  </div>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-border/50">
                  <button
                    data-testid="button-units-metric"
                    onClick={() => updateSettings.mutate({ defaultUnits: "metric" })}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                      settings?.defaultUnits === "metric"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    mm / g
                  </button>
                  <button
                    data-testid="button-units-imperial"
                    onClick={() => updateSettings.mutate({ defaultUnits: "imperial" })}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                      settings?.defaultUnits === "imperial"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    in / oz
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Scale className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Condition Scale</p>
                    <p className="text-xs text-muted-foreground">Preferred grading system</p>
                  </div>
                </div>
                <select
                  data-testid="select-condition-scale"
                  value={settings?.conditionScale || "sheldon"}
                  onChange={(e) => updateSettings.mutate({ conditionScale: e.target.value })}
                  className="bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="sheldon">Sheldon (1-70)</option>
                  <option value="european">European Descriptive</option>
                  <option value="pcgs">PCGS</option>
                  <option value="ngc">NGC</option>
                </select>
              </div>
            </div>
          </div>

          {/* Privacy & Notifications */}
          <div className="bg-card border border-border/50 rounded-2xl p-6">
            <SectionHeader title="Privacy & Notifications" icon={ShieldOff} />

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Message Requests</p>
                    <p className="text-xs text-muted-foreground">Who can send you direct messages</p>
                  </div>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-border/50">
                  <button
                    data-testid="button-messages-everyone"
                    onClick={() => updateSettings.mutate({ messageRequests: "everyone" })}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                      settings?.messageRequests === "everyone"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Everyone
                  </button>
                  <button
                    data-testid="button-messages-followers"
                    onClick={() => updateSettings.mutate({ messageRequests: "followers" })}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                      settings?.messageRequests === "followers"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Only Followers
                  </button>
                </div>
              </div>

              {/* Blocked List */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <UserX className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Blocked Users</p>
                    <p className="text-xs text-muted-foreground">Users you've blocked</p>
                  </div>
                </div>
                {blockedLoading ? (
                  <LoadingSpinner />
                ) : !blockedUsers || blockedUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic pl-7">No blocked users</p>
                ) : (
                  <div className="space-y-2 pl-7">
                    {blockedUsers.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30"
                        data-testid={`blocked-user-${b.blockedUserId}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-serif">
                            {(b.user.displayName || "U")[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{b.user.displayName || "Unknown"}</span>
                        </div>
                        <button
                          data-testid={`button-unblock-${b.blockedUserId}`}
                          onClick={() => unblockMut.mutate(b.blockedUserId)}
                          disabled={unblockMut.isPending}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {settings?.ghostMode ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">Ghost Mode</p>
                      <p className="text-xs text-muted-foreground">Hide your online status from Global Chat</p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={settings?.ghostMode || false}
                    onChange={(val) => updateSettings.mutate({ ghostMode: val })}
                    disabled={updateSettings.isPending}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Like Notifications</p>
                      <p className="text-xs text-muted-foreground">Email alerts for new likes</p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={settings?.emailLikes || false}
                    onChange={(val) => updateSettings.mutate({ emailLikes: val })}
                    disabled={updateSettings.isPending}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Comment Notifications</p>
                      <p className="text-xs text-muted-foreground">Email alerts for new comments</p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={settings?.emailComments || false}
                    onChange={(val) => updateSettings.mutate({ emailComments: val })}
                    disabled={updateSettings.isPending}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-card border border-destructive/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-destructive/20">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
              <h2 className="font-serif text-lg font-semibold text-destructive">Danger Zone</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-destructive">Delete Account</p>
                <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
              </div>
              <button
                data-testid="button-delete-account"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors"
              >
                <Trash2 className="w-4 h-4 inline mr-1.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="font-serif text-xl font-bold text-destructive">Delete Account</h3>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete your account, all your coins, comments, messages, and data.
              This action cannot be undone.
            </p>

            <p className="text-sm text-foreground mb-2 font-medium">
              Type <span className="text-destructive font-bold">DELETE</span> to confirm:
            </p>
            <input
              data-testid="input-delete-confirm"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-background border border-destructive/30 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-destructive focus:ring-1 focus:ring-destructive/30 mb-4"
            />

            <div className="flex gap-3">
              <button
                data-testid="button-cancel-delete"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                data-testid="button-confirm-delete"
                onClick={() => deleteAccountMut.mutate()}
                disabled={deleteConfirmText !== "DELETE" || deleteAccountMut.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteAccountMut.isPending ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
