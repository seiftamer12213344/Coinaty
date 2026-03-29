import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api, buildUrl } from "@shared/routes";
import { onWS } from "@/lib/websocket";

export function useConversations() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return onWS("message:new", () => {
      queryClient.invalidateQueries({ queryKey: [api.messages.getConversations.path] });
    });
  }, [queryClient]);

  return useQuery({
    queryKey: [api.messages.getConversations.path],
    queryFn: async () => {
      const res = await fetch(api.messages.getConversations.path, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return api.messages.getConversations.responses[200].parse(await res.json());
    },
  });
}

export function useMessages(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    return onWS("message:new", (data) => {
      if (data.message?.senderId === userId || data.message?.receiverId === userId) {
        queryClient.invalidateQueries({ queryKey: [api.messages.list.path, userId] });
        queryClient.invalidateQueries({ queryKey: [api.messages.getConversations.path] });
      }
    });
  }, [userId, queryClient]);

  return useQuery({
    queryKey: [api.messages.list.path, userId],
    queryFn: async () => {
      if (!userId) return [];
      const url = buildUrl(api.messages.list.path, { userId });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch messages");
      return api.messages.list.responses[200].parse(await res.json());
    },
    enabled: !!userId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, content, audioUrl }: { userId: string; content: string; audioUrl?: string }) => {
      const validated = api.messages.send.input.parse({ content, audioUrl });
      const url = buildUrl(api.messages.send.path, { userId });
      const res = await fetch(url, {
        method: api.messages.send.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to send message");
      return api.messages.send.responses[201].parse(await res.json());
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path, userId] });
      queryClient.invalidateQueries({ queryKey: [api.messages.getConversations.path] });
    },
  });
}
