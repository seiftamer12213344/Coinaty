import { Shell } from "@/components/layout/Shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";
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
  Globe,
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
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted-foreground/30"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"
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
  const { t, language, setLanguage } = useLanguage();

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
      toast({ title: t("settingsSaved") });
    },
    onError: () => toast({ title: t("failedToSave"), variant: "destructive" }),
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
      toast({ title: t("passwordUpdated") });
    },
    onError: (err: any) => {
      toast({ title: err.message || t("failedToSave"), variant: "destructive" });
    },
  });

  const unblockMut = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/settings/block/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/blocked"] });
      toast({ title: t("userUnblocked") });
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
    onError: () => toast({ title: t("failedToSave"), variant: "destructive" }),
  });

  if (!isAuthenticated) {
    return (
      <Shell>
        <div className="p-8 text-center pt-32">
          <h2 className="text-2xl font-serif text-primary">{t("signInRequired")}</h2>
          <Link href="/auth" className="text-muted-foreground mt-4 inline-block hover:underline">
            {t("signInToAccess")}
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

  const LANGS: { code: Language; label: string; flag: string }[] = [
    { code: "en", label: t("english"), flag: "🇬🇧" },
    { code: "ar", label: t("arabic"), flag: "🇸🇦" },
    { code: "fr", label: t("french"), flag: "🇫🇷" },
  ];

  return (
    <Shell>
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {t("backToGallerySettings")}
        </Link>

        <h1 className="text-3xl font-serif font-bold text-foreground mb-8" data-testid="text-settings-title">
          {t("settingsTitle")}
        </h1>

        <div className="space-y-6">
          {/* Language */}
          <div className="bg-card border border-border/50 rounded-2xl p-6">
            <SectionHeader title={t("language")} icon={Globe} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{t("language")}</p>
                  <p className="text-xs text-muted-foreground">{t("languageDesc")}</p>
                </div>
              </div>
              <div className="flex rounded-lg overflow-hidden border border-border/50">
                {LANGS.map((lang) => (
                  <button
                    key={lang.code}
                    data-testid={`button-lang-${lang.code}`}
                    onClick={() => setLanguage(lang.code)}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1 ${language === lang.code
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Account Security */}
          <div className="bg-card border border-border/50 rounded-2xl p-6">
            <SectionHeader title={t("accountSecurity")} icon={Lock} />

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("currentPassword")}</label>
                <input
                  data-testid="input-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t("enterCurrentPassword")}
                  className="w-full bg-background border border-border/50 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("newPassword")}</label>
                <input
                  data-testid="input-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("enterNewPassword")}
                  className="w-full bg-background border border-border/50 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <button
                data-testid="button-change-password"
                onClick={() => changePasswordMut.mutate()}
                disabled={!newPassword || newPassword.length < 6 || changePasswordMut.isPending}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {changePasswordMut.isPending ? t("changing") : t("changePassword")}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-border/30">
              <div className="flex items-center gap-3 mb-2">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">{t("activeSessions")}</h3>
              </div>
              <div className="bg-background rounded-xl p-3 border border-border/30 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("currentSession")}</p>
                  <p className="text-xs text-muted-foreground">{t("loggedInNow")}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-semibold">
                  {t("active")}
                </span>
              </div>
            </div>
          </div>

          {/* Collection Preferences */}
          <div className="bg-card border border-border/50 rounded-2xl p-6">
            <SectionHeader title={t("collectionPreferences")} icon={Scale} />

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("defaultUnits")}</p>
                    <p className="text-xs text-muted-foreground">{t("measurementSystem")}</p>
                  </div>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-border/50">
                  <button
                    data-testid="button-units-metric"
                    onClick={() => updateSettings.mutate({ defaultUnits: "metric" })}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${settings?.defaultUnits === "metric"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    mm / g
                  </button>
                  <button
                    data-testid="button-units-imperial"
                    onClick={() => updateSettings.mutate({ defaultUnits: "imperial" })}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${settings?.defaultUnits === "imperial"
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
                    <p className="text-sm font-medium text-foreground">{t("conditionScale")}</p>
                    <p className="text-xs text-muted-foreground">{t("preferredGrading")}</p>
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
            <SectionHeader title={t("privacyNotifications")} icon={ShieldOff} />

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("messageRequests")}</p>
                    <p className="text-xs text-muted-foreground">{t("whoCanMessage")}</p>
                  </div>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-border/50">
                  <button
                    data-testid="button-messages-everyone"
                    onClick={() => updateSettings.mutate({ messageRequests: "everyone" })}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${settings?.messageRequests === "everyone"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {t("everyone")}
                  </button>
                  <button
                    data-testid="button-messages-followers"
                    onClick={() => updateSettings.mutate({ messageRequests: "followers" })}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${settings?.messageRequests === "followers"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {t("onlyFollowers")}
                  </button>
                </div>
              </div>

              {/* Blocked List */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <UserX className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("blockedUsers")}</p>
                    <p className="text-xs text-muted-foreground">{t("usersYouBlocked")}</p>
                  </div>
                </div>
                {blockedLoading ? (
                  <LoadingSpinner />
                ) : !blockedUsers || blockedUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic pl-7">{t("noBlockedUsers")}</p>
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
                          <span className="text-sm font-medium">{b.user.displayName || t("unknown")}</span>
                        </div>
                        <button
                          data-testid={`button-unblock-${b.blockedUserId}`}
                          onClick={() => unblockMut.mutate(b.blockedUserId)}
                          disabled={unblockMut.isPending}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        >
                          {t("unblock")}
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
                      <p className="text-sm font-medium text-foreground">{t("ghostMode")}</p>
                      <p className="text-xs text-muted-foreground">{t("hideOnlineStatus")}</p>
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
                      <p className="text-sm font-medium text-foreground">{t("likeNotifications")}</p>
                      <p className="text-xs text-muted-foreground">{t("emailLikes")}</p>
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
                      <p className="text-sm font-medium text-foreground">{t("commentNotifications")}</p>
                      <p className="text-xs text-muted-foreground">{t("emailComments")}</p>
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
              <h2 className="font-serif text-lg font-semibold text-destructive">{t("dangerZone")}</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-destructive">{t("deleteAccount")}</p>
                <p className="text-xs text-muted-foreground">{t("deleteAccountDesc")}</p>
              </div>
              <button
                data-testid="button-delete-account"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors"
              >
                <Trash2 className="w-4 h-4 inline mr-1.5" />
                {t("delete")}
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
              <h3 className="font-serif text-xl font-bold text-destructive">{t("deleteAccount")}</h3>
            </div>

            <p className="text-sm text-muted-foreground mb-4">{t("deleteConfirmMsg")}</p>

            <p className="text-sm text-foreground mb-2 font-medium">
              {t("typeDeleteToConfirm")} <span className="text-destructive font-bold">{t("deleteWord")}</span> {t("toConfirm")}
            </p>
            <input
              data-testid="input-delete-confirm"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={t("deleteWord")}
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
                {t("cancelBtn")}
              </button>
              <button
                data-testid="button-confirm-delete"
                onClick={() => deleteAccountMut.mutate()}
                disabled={deleteConfirmText !== "DELETE" || deleteAccountMut.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteAccountMut.isPending ? t("deleting") : t("deleteForever")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
