import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { User } from "@shared/schema";
import { connectWS, disconnectWS } from "@/lib/websocket";
import { getAuthHeaders, clearAuthToken } from "@/lib/authToken";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/local-logout", {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });
  } catch {}
  clearAuthToken();
  window.location.href = "/auth";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 1,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (user?.id) {
      connectWS(user.id);
    } else if (user === null) {
      disconnectWS();
    }
  }, [user?.id]);

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
