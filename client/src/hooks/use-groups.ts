import { getAuthHeaders } from '@/lib/authToken';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api, buildUrl } from "@shared/routes";
import { onWS } from "@/lib/websocket";

export function useGroups() {
  return useQuery({
    queryKey: ["/api/groups"],
    queryFn: async () => {
      const res = await fetch(api.groups.list.path, { credentials: "include", headers: getAuthHeaders() });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
  });
}

export function useGroupMessages(groupId?: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) return;
    return onWS("group:message:new", (data) => {
      if (data.groupId === groupId) {
        queryClient.invalidateQueries({ queryKey: ["/api/groups/messages", groupId] });
      }
    });
  }, [groupId, queryClient]);

  return useQuery({
    queryKey: ["/api/groups/messages", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const url = buildUrl(api.groups.messages.path, { id: groupId });
      const res = await fetch(url, { credentials: "include", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch group messages");
      return res.json();
    },
    enabled: !!groupId,
  });
}

export function useGroupMembers(groupId?: number) {
  return useQuery({
    queryKey: ["/api/groups/members", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const url = buildUrl(api.groups.members.path, { id: groupId });
      const res = await fetch(url, { credentials: "include", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!groupId,
  });
}

export function usePendingInvitations() {
  return useQuery({
    queryKey: ["/api/groups/invitations"],
    queryFn: async () => {
      const res = await fetch(api.groups.pendingInvitations.path, { credentials: "include", headers: getAuthHeaders() });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch invitations");
      return res.json();
    },
    refetchInterval: 10000,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(api.groups.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create group");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });
}

export function useSendGroupMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, content }: { groupId: number; content: string }) => {
      const url = buildUrl(api.groups.sendMessage.path, { id: groupId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ content }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups/messages", groupId] });
    },
  });
}

export function useInviteToGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: number; userId: string }) => {
      const url = buildUrl(api.groups.invite.path, { id: groupId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ userId }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to invite");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });
}

export function useRespondToInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invitationId, accept }: { invitationId: number; accept: boolean }) => {
      const url = buildUrl(api.groups.respondInvitation.path, { id: invitationId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ accept }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to respond");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups/invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: number) => {
      const url = buildUrl(api.groups.leave.path, { id: groupId });
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to leave group");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });
}
