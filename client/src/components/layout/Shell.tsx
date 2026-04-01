import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CoinChatbot } from "@/components/CoinChatbot";
import logoDarkMode from "@assets/Screen_Shot_2026-03-27_at_11.55.29_AM_1774605354354.png";
import logoLightMode from "@assets/Screen_Shot_2026-03-27_at_11.55.36_AM_1774605354357.png";
import { 
  Compass, 
  User, 
  MessageSquare, 
  Trophy, 
  PlusCircle, 
  LogOut,
  LogIn,
  Search,
  Settings
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "The Gallery", icon: Compass },
  { href: "/leaderboard", label: "Top Collectors", icon: Trophy },
  { href: "/search", label: "Find Collectors", icon: Search },
  { href: "/messages", label: "Discussions", icon: MessageSquare },
  { href: "/profile", label: "My Vault", icon: User },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();


  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-xl fixed h-screen z-40">
        <div className="px-2 pt-2 pb-1">
          <Link href="/" className="block">
            <img src={logoDarkMode} alt="Coinaty" className="w-full h-auto object-contain rounded-xl hidden dark:block" />
            <img src={logoLightMode} alt="Coinaty" className="w-full h-auto object-contain rounded-xl block dark:hidden" />
          </Link>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/30 shadow-[0_0_15px_rgba(212,175,55,0.1)]" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}

          {isAuthenticated && (
            <Link 
              href="/add-coin"
              className="flex items-center gap-4 px-4 py-3 mt-8 rounded-xl bg-gradient-to-r from-primary/80 to-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Catalog Coin</span>
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Appearance</span>
            <ThemeToggle />
          </div>
          {isAuthenticated && (
            <Link 
              href="/settings"
              data-testid="link-settings"
              className={`flex items-center gap-3 w-full px-4 py-2 mb-1 rounded-xl transition-colors ${
                location === "/settings"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Settings</span>
            </Link>
          )}
          {isAuthenticated ? (
            <button 
              onClick={() => logout()}
              className="flex items-center gap-3 w-full px-4 py-2 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign Out</span>
            </button>
          ) : (
            <button 
              onClick={() => window.location.href = "/auth"}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-primary/50 text-primary rounded-lg hover:bg-primary/10 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span className="text-sm">Sign In</span>
            </button>
          )}
        </div>
      </aside>
      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
          <Link href="/" className="block">
            <img src={logoDarkMode} alt="Coinaty" className="h-9 w-auto object-contain rounded-lg hidden dark:block" />
            <img src={logoLightMode} alt="Coinaty" className="h-9 w-auto object-contain rounded-lg block dark:hidden" />
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
                LOGIN
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
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? "drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" : ""}`} />
                <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
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
