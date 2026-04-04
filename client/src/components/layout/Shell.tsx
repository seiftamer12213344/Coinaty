import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { useLanguage } from "@/lib/i18n";
import { CoinChatbot } from "@/components/CoinChatbot";
import logoDarkMode from "@assets/Screen_Shot_2026-03-27_at_11.55.29_AM_1774605354354.png";
import logoLightMode from "@assets/Screen_Shot_2026-03-27_at_11.55.36_AM_1774605354357.png";
import { useState } from "react";
import {
  Compass,
  User,
  MessageSquare,
  Trophy,
  PlusCircle,
  LogOut,
  LogIn,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { TranslationKey } from "@/lib/i18n";

const NAV_KEYS: { href: string; labelKey: TranslationKey; icon: any }[] = [
  { href: "/", labelKey: "theGallery", icon: Compass },
  { href: "/leaderboard", labelKey: "topCollectors", icon: Trophy },
  { href: "/search", labelKey: "findCollectors", icon: Search },
  { href: "/messages", labelKey: "discussions", icon: MessageSquare },
  { href: "/profile", labelKey: "myVault", icon: User },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const { t, isRTL } = useLanguage();
  const logoSrc = resolvedTheme === "dark" ? logoDarkMode : logoLightMode;

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; }
    catch { return false; }
  });

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("sidebar-collapsed", String(next)); } catch { }
      return next;
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-card/50 backdrop-blur-xl fixed top-0 h-screen z-40 transition-all duration-300 ${collapsed ? "w-16" : "w-64"} ${isRTL ? "right-0 border-l border-border" : "left-0 border-r border-border"}`}
      >
        {/* Logo */}
        <div className={`px-2 pt-2 pb-1 overflow-hidden transition-all duration-300 ${collapsed ? "opacity-0 h-0 py-0" : "opacity-100"}`}>
          <Link href="/" className="block">
            <img src={logoSrc} alt="Coinaty" className="w-full h-auto object-contain rounded-xl" />
          </Link>
        </div>

        {/* Nav Items */}
        <nav className={`flex-1 py-8 space-y-2 ${collapsed ? "px-2" : "px-4"}`}>
          {NAV_KEYS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            const label = t(item.labelKey);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`nav-${item.labelKey}`}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 ${collapsed ? "justify-center" : ""
                  } ${isActive
                    ? "bg-primary/10 text-primary border border-primary/30 shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : ""}`} />
                {!collapsed && <span className="font-medium whitespace-nowrap">{label}</span>}
              </Link>
            );
          })}

          {isAuthenticated && (
            <Link
              href="/add-coin"
              title={collapsed ? t("catalogCoin") : undefined}
              className={`flex items-center gap-4 px-3 py-3 mt-8 rounded-xl bg-gradient-to-r from-primary/80 to-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 ${collapsed ? "justify-center" : ""}`}
            >
              <PlusCircle className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{t("catalogCoin")}</span>}
            </Link>
          )}
        </nav>

        {/* Bottom Controls */}
        <div className={`border-t border-border/50 ${collapsed ? "p-2" : "p-4"}`}>
          {!collapsed && (
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{t("appearance")}</span>
              <ThemeToggle />
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center mb-2">
              <ThemeToggle />
            </div>
          )}

          {isAuthenticated && (
            <Link
              href="/settings"
              data-testid="link-settings"
              title={collapsed ? t("settings") : undefined}
              className={`flex items-center gap-3 w-full px-3 py-2 mb-1 rounded-xl transition-colors ${collapsed ? "justify-center" : ""} ${location === "/settings"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{t("settings")}</span>}
            </Link>
          )}

          {isAuthenticated ? (
            <button
              onClick={() => logout()}
              title={collapsed ? t("signOut") : undefined}
              className={`flex items-center gap-3 w-full px-3 py-2 text-muted-foreground hover:text-destructive transition-colors ${collapsed ? "justify-center" : ""}`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="text-sm">{t("signOut")}</span>}
            </button>
          ) : (
            <button
              onClick={() => window.location.href = "/auth"}
              title={collapsed ? t("signIn") : undefined}
              className={`flex items-center gap-3 w-full px-3 py-2 border border-primary/50 text-primary rounded-lg hover:bg-primary/10 transition-colors ${collapsed ? "justify-center" : ""}`}
            >
              <LogIn className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="text-sm">{t("signIn")}</span>}
            </button>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={toggleCollapsed}
            data-testid="button-collapse-sidebar"
            title={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            className={`flex items-center gap-2 w-full mt-3 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors text-xs ${collapsed ? "justify-center" : ""}`}
          >
            {isRTL
              ? (collapsed ? <ChevronLeft className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />)
              : (collapsed ? <ChevronRight className="w-4 h-4 shrink-0" /> : <ChevronLeft className="w-4 h-4 shrink-0" />)
            }
            {!collapsed && <span>{t("collapse")}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 pb-20 md:pb-0 min-h-screen transition-all duration-300 ${isRTL ? (collapsed ? "md:mr-16" : "md:mr-64") : (collapsed ? "md:ml-16" : "md:ml-64")}`}>
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
          <Link href="/" className="block">
            <img src={logoSrc} alt="Coinaty" className="h-9 w-auto object-contain rounded-lg" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/search" className="w-9 h-9 flex items-center justify-center rounded-full border border-border bg-card hover:bg-muted hover:border-primary/50 text-primary transition-all">
              <Search className="w-4 h-4" />
            </Link>
            {isAuthenticated && (
              <Link href="/settings" data-testid="link-mobile-settings" className="w-9 h-9 flex items-center justify-center rounded-full border border-border bg-card hover:bg-muted hover:border-primary/50 text-muted-foreground hover:text-primary transition-all">
                <Settings className="w-4 h-4" />
              </Link>
            )}
            {isAuthenticated ? (
              <button
                onClick={() => logout()}
                className="w-9 h-9 flex items-center justify-center rounded-full border border-border bg-card hover:bg-destructive/10 hover:border-destructive/50 text-muted-foreground hover:text-destructive transition-all"
                data-testid="button-mobile-logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => window.location.href = "/auth"}
                className="text-xs font-semibold text-primary"
              >
                {t("login")}
              </button>
            )}
          </div>
        </header>

        <div className="max-w-4xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/50 pb-safe">
        <div className="flex justify-around items-center px-2 py-2">
          {NAV_KEYS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            const label = t(item.labelKey);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? "drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" : ""}`} />
                <span className="text-[10px] font-medium">{label.split(' ')[0]}</span>
              </Link>
            );
          })}

          {isAuthenticated && (
            <Link
              href="/add-coin"
              className="flex flex-col items-center justify-center w-12 h-12 -mt-6 rounded-full bg-gradient-to-tr from-primary to-[#FCF6BA] text-primary-foreground shadow-lg shadow-primary/30 border-4 border-background"
            >
              <PlusCircle className="w-6 h-6" />
            </Link>
          )}
        </div>
      </nav>

      {/* AI Coin Expert Chatbot — visible on all pages */}
      <CoinChatbot />
    </div>
  );
}
