import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      data-testid="button-theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative w-9 h-9 flex items-center justify-center rounded-full border border-border bg-card hover:bg-muted hover:border-primary/50 transition-all duration-300"
    >
      <Sun
        className={`absolute w-4 h-4 text-primary transition-all duration-500 ${
          isDark ? "opacity-0 scale-50 rotate-90" : "opacity-100 scale-100 rotate-0"
        }`}
      />
      <Moon
        className={`absolute w-4 h-4 text-primary transition-all duration-500 ${
          isDark ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 -rotate-90"
        }`}
      />
    </button>
  );
}
