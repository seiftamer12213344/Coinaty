import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useUserProfile(id?: string) {
  return useQuery({
    queryKey: [api.users.getProfile.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.users.getProfile.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch user profile");
      return api.users.getProfile.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { displayName?: string; profileImageUrl?: string }) => {
      const validated = api.users.updateProfile.input.parse(updates);
      const res = await fetch(api.users.updateProfile.path, {
        method: api.users.updateProfile.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return api.users.updateProfile.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: [api.users.getProfile.path, data.id] });
      }
    },
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: [api.users.leaderboard.path],
    queryFn: async () => {
      const res = await fetch(api.users.leaderboard.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return api.users.leaderboard.responses[200].parse(await res.json());
    },
  });
}
