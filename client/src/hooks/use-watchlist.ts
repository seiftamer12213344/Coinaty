import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Coin } from "@shared/schema";

export function useWatchlist(enabled = true) {
  return useQuery<Coin[]>({
    queryKey: ["/api/watchlist"],
    queryFn: async () => {
      const res = await fetch("/api/watchlist", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch watchlist");
      return res.json();
    },
    enabled,
  });
}

export function useWatchlistStatus(coinId: number) {
  return useQuery<{ inWatchlist: boolean }>({
    queryKey: ["/api/watchlist", coinId, "status"],
    queryFn: async () => {
      const res = await fetch(`/api/watchlist/${coinId}/status`, { credentials: "include" });
      if (!res.ok) return { inWatchlist: false };
      return res.json();
    },
  });
}

export function useToggleWatchlist() {
  return useMutation({
    mutationFn: async (coinId: number) => {
      const res = await fetch(`/api/watchlist/${coinId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update watchlist");
      return res.json() as Promise<{ added: boolean }>;
    },
    onSuccess: (_, coinId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist", coinId, "status"] });
    },
  });
}
