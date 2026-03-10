import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertCoin } from "@shared/routes";
import { z } from "zod";

// Fetch all coins (Feed)
export function useCoins(filters?: { category?: string; userId?: string }) {
  const queryParams = new URLSearchParams();
  if (filters?.category) queryParams.append("category", filters.category);
  if (filters?.userId) queryParams.append("userId", filters.userId);
  
  const path = queryParams.toString() ? `${api.coins.list.path}?${queryParams.toString()}` : api.coins.list.path;

  return useQuery({
    queryKey: [api.coins.list.path, filters],
    queryFn: async () => {
      const res = await fetch(path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch coins");
      return api.coins.list.responses[200].parse(await res.json());
    },
  });
}

// Fetch a single coin
export function useCoin(id: number) {
  return useQuery({
    queryKey: [api.coins.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.coins.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch coin");
      return api.coins.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// Create a new coin
export function useCreateCoin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCoin) => {
      // Coerce estimatedValue to number if it's a string from a form
      const validated = api.coins.create.input.parse({
        ...data,
        estimatedValue: data.estimatedValue ? Number(data.estimatedValue) : 0,
      });
      
      const res = await fetch(api.coins.create.path, {
        method: api.coins.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.coins.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        if (res.status === 401) throw new Error("Unauthorized");
        throw new Error("Failed to create coin");
      }
      return api.coins.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.coins.list.path] });
    },
  });
}

// Toggle like on a coin
export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.coins.toggleLike.path, { id });
      const res = await fetch(url, {
        method: api.coins.toggleLike.method,
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        throw new Error("Failed to toggle like");
      }
      return api.coins.toggleLike.responses[200].parse(await res.json());
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.coins.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.coins.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.coins.getLikes.path, id] });
    },
  });
}

// Get users who liked a coin
export function useCoinLikes(id: number) {
  return useQuery({
    queryKey: [api.coins.getLikes.path, id],
    queryFn: async () => {
      const url = buildUrl(api.coins.getLikes.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch likes");
      return api.coins.getLikes.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// Fetch comments for a coin
export function useComments(coinId: number) {
  return useQuery({
    queryKey: [api.comments.list.path, coinId],
    queryFn: async () => {
      const url = buildUrl(api.comments.list.path, { id: coinId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch comments");
      return api.comments.list.responses[200].parse(await res.json());
    },
    enabled: !!coinId,
  });
}

// Add a comment to a coin
export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ coinId, content }: { coinId: number; content: string }) => {
      const validated = api.comments.create.input.parse({ content });
      const url = buildUrl(api.comments.create.path, { id: coinId });
      
      const res = await fetch(url, {
        method: api.comments.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        throw new Error("Failed to add comment");
      }
      return api.comments.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, { coinId }) => {
      queryClient.invalidateQueries({ queryKey: [api.comments.list.path, coinId] });
      // Invalidate the coin details to update comment count if we had it
      queryClient.invalidateQueries({ queryKey: [api.coins.get.path, coinId] });
    },
  });
}
