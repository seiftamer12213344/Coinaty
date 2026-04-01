import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { UserSettings } from "@shared/schema";

export function useSettings() {
  const { isAuthenticated } = useAuth();

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  return {
    settings,
    defaultUnits: (settings?.defaultUnits as "metric" | "imperial") ?? "metric",
  };
}
