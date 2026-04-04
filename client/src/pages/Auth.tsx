import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { saveAuthToken } from "@/lib/authToken";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Mail, Lock, User, ArrowRight, ArrowLeft } from "lucide-react";
import logoDarkMode from "@assets/Screen_Shot_2026-03-27_at_11.55.29_AM_1774605354354.png";
import logoLightMode from "@assets/Screen_Shot_2026-03-27_at_11.55.36_AM_1774605354357.png";
import { ThemeToggle } from "@/components/ThemeToggle";

type AuthMode = "login" | "register";

export default function Auth() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const { t } = useLanguage();
  const logoSrc = resolvedTheme === "dark" ? logoDarkMode : logoLightMode;

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      return res.json();
    },
    onSuccess: (userData) => {
      if (userData.authToken) saveAuthToken(userData.id, userData.authToken);
      const { authToken, ...safeUser } = userData;
      queryClient.setQueryData(["/api/auth/user"], safeUser);
      navigate("/");
    },
    onError: (err: Error) => {
      toast({ title: t("signIn"), description: err.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      return res.json();
    },
    onSuccess: (userData) => {
      if (userData.authToken) saveAuthToken(userData.id, userData.authToken);
      const { authToken, ...safeUser } = userData;
      queryClient.setQueryData(["/api/auth/user"], safeUser);
      navigate("/");
    },
    onError: (err: Error) => {
      toast({ title: t("createAccount"), description: err.message, variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      loginMutation.mutate();
    } else {
      registerMutation.mutate();
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="mb-8 flex flex-col items-center gap-4">
        <img src={logoSrc} alt="Coinaty" className="h-16 w-auto object-contain" />
        <a
          href="/"
          data-testid="link-back-to-gallery"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {t("backToGallery")}
        </a>
      </div>

      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-serif tracking-wide">
            {mode === "login" ? t("welcomeBack") : t("joinTheCollection")}
          </CardTitle>
          <CardDescription>
            {mode === "login" ? t("signInToYourAccount") : t("createYourAccount")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("firstName")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      data-testid="input-firstname"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="omar"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("lastName")}</Label>
                  <Input
                    id="lastName"
                    data-testid="input-lastname"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="tarek"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t("emailAddress")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  data-testid="input-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  data-testid="input-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? t("minSixChars") : t("yourPassword")}
                  className="pl-9"
                  required
                  minLength={mode === "register" ? 6 : undefined}
                />
              </div>
            </div>

            <Button
              type="submit"
              data-testid="button-submit-auth"
              className="w-full bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90 text-primary-foreground font-semibold py-5"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {mode === "login" ? t("signIn") : t("createAccount")}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <p>
                {t("noAccount")}{" "}
                <button
                  data-testid="button-switch-register"
                  onClick={() => setMode("register")}
                  className="text-primary hover:underline font-medium"
                >
                  {t("registerHere")}
                </button>
              </p>
            ) : (
              <p>
                {t("haveAccount")}{" "}
                <button
                  data-testid="button-switch-login"
                  onClick={() => setMode("login")}
                  className="text-primary hover:underline font-medium"
                >
                  {t("signInHere")}
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground/60">
        {t("royalMuseum")}
      </p>
    </div>
  );
}
