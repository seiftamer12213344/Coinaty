import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { VaultFolder } from "@shared/schema";

type FolderWithCount = VaultFolder & { coinCount: number };

export function useVaultFolders(enabled = true) {
  return useQuery<FolderWithCount[]>({
    queryKey: ["/api/vault/folders"],
    queryFn: async () => {
      const res = await fetch("/api/vault/folders", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    },
    enabled,
  });
}

export function usePublicVaultFolders(userId?: string) {
  return useQuery<FolderWithCount[]>({
    queryKey: ["/api/vault/folders/public", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/vault/folders/public/${userId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userId,
  });
}

export function useFolderCoins(folderId?: number) {
  return useQuery({
    queryKey: ["/api/vault/folders", folderId, "coins"],
    queryFn: async () => {
      const res = await fetch(`/api/vault/folders/${folderId}/coins`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch folder coins");
      return res.json();
    },
    enabled: !!folderId,
  });
}

export function useCoinFolders(coinId?: number) {
  return useQuery<VaultFolder[]>({
    queryKey: ["/api/vault/coins", coinId, "folders"],
    queryFn: async () => {
      if (!coinId) return [];
      const res = await fetch(`/api/vault/coins/${coinId}/folders`, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!coinId,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/vault/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      return res.json() as Promise<FolderWithCount>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vault/folders"] });
    },
  });
}

export function useRenameFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await fetch(`/api/vault/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to rename folder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vault/folders"] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/vault/folders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete folder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vault/folders"] });
    },
  });
}

export function useAddCoinToFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ folderId, coinId }: { folderId: number; coinId: number }) => {
      const res = await fetch(`/api/vault/folders/${folderId}/coins/${coinId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add coin to folder");
      return res.json();
    },
    onSuccess: (_, { folderId, coinId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vault/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault/folders", folderId, "coins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault/coins", coinId, "folders"] });
    },
  });
}

export function useRemoveCoinFromFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ folderId, coinId }: { folderId: number; coinId: number }) => {
      const res = await fetch(`/api/vault/folders/${folderId}/coins/${coinId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove coin from folder");
      return res.json();
    },
    onSuccess: (_, { folderId, coinId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vault/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault/folders", folderId, "coins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault/coins", coinId, "folders"] });
    },
  });
}
