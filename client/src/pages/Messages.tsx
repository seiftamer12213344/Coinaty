import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useConversations, useMessages, useSendMessage } from "@/hooks/use-messages";
import { useUserProfile, useSearchUsers } from "@/hooks/use-users";
import { useGroups, useGroupMessages, useGroupMembers, usePendingInvitations, useCreateGroup, useSendGroupMessage, useInviteToGroup, useRespondToInvitation, useLeaveGroup } from "@/hooks/use-groups";
import { Shell } from "@/components/layout/Shell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Send, Search, MessageSquare, Users, Plus, UserPlus, Bell, Check, X, LogOut, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type ViewMode = "dm" | "groups";

export default function Messages() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: conversations, isLoading: convsLoading } = useConversations();
  const { data: userGroups, isLoading: groupsLoading } = useGroups();
  const { data: pendingInvitations } = usePendingInvitations();
  const { toast } = useToast();

  const preselectedUserId = new URLSearchParams(window.location.search).get("user");
  const [activeUserId, setActiveUserId] = useState<string | null>(preselectedUserId);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("dm");
  const [msgInput, setMsgInput] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [showInvitations, setShowInvitations] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preselectedUserId) { setActiveUserId(preselectedUserId); setViewMode("dm"); }
  }, [preselectedUserId]);

  const { data: messages, isLoading: msgsLoading } = useMessages(activeUserId || undefined);
  const { data: groupMsgs, isLoading: groupMsgsLoading } = useGroupMessages(activeGroupId || undefined);
  const { data: groupMembersList } = useGroupMembers(activeGroupId || undefined);
  const { data: searchResults } = useSearchUsers(inviteSearch);
  const sendMessage = useSendMessage();
  const sendGroupMsg = useSendGroupMessage();
  const createGroup = useCreateGroup();
  const inviteToGroup = useInviteToGroup();
  const respondInvitation = useRespondToInvitation();
  const leaveGroup = useLeaveGroup();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, groupMsgs]);

  if (authLoading) return <Shell><LoadingSpinner /></Shell>;
  if (!user) { window.location.href = "/auth"; return null; }

  const activeUserFromConvs = conversations?.find((c: any) => c.id === activeUserId);
  const { data: fetchedActiveUser } = useUserProfile(activeUserId && !activeUserFromConvs ? activeUserId : undefined);
  const activeUser = activeUserFromConvs || fetchedActiveUser;
  const activeGroup = userGroups?.find((g: any) => g.id === activeGroupId);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    if (viewMode === "dm" && activeUserId) {
      sendMessage.mutate({ userId: activeUserId, content: msgInput.trim() }, { onSuccess: () => setMsgInput("") });
    } else if (viewMode === "groups" && activeGroupId) {
      sendGroupMsg.mutate({ groupId: activeGroupId, content: msgInput.trim() }, { onSuccess: () => setMsgInput("") });
    }
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    createGroup.mutate(groupName.trim(), {
      onSuccess: () => { setGroupName(""); setShowCreateGroup(false); toast({ title: "Group created!" }); },
    });
  };

  const handleInvite = (userId: string) => {
    if (!activeGroupId) return;
    inviteToGroup.mutate({ groupId: activeGroupId, userId }, {
      onSuccess: () => { toast({ title: "Invitation sent!" }); setInviteSearch(""); },
      onError: (err: any) => { toast({ title: err.message || "Failed to invite", variant: "destructive" }); },
    });
  };

  const hasActiveChat = viewMode === "dm" ? !!activeUserId : !!activeGroupId;
  const invitationCount = pendingInvitations?.length || 0;

  return (
    <Shell>
      <div className="h-[calc(100vh-64px)] md:h-screen p-0 md:p-6 flex flex-col">
        <div className="flex-1 bg-card md:rounded-3xl border-x md:border border-border/50 flex overflow-hidden shadow-2xl">

          {/* Sidebar */}
          <div className={`${hasActiveChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-border/50 bg-background/50`}>
            <div className="p-4 border-b border-border/50 bg-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-bold text-primary" data-testid="text-messages-title">
                  {viewMode === "dm" ? "Discussions" : "Groups"}
                </h2>
                <div className="flex items-center gap-2">
                  {invitationCount > 0 && (
                    <button
                      onClick={() => setShowInvitations(!showInvitations)}
                      className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
                      data-testid="button-invitations"
                    >
                      <Bell className="w-4 h-4 text-primary" />
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">{invitationCount}</span>
                    </button>
                  )}
                  {viewMode === "groups" && (
                    <button
                      onClick={() => setShowCreateGroup(true)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      data-testid="button-create-group"
                    >
                      <Plus className="w-4 h-4 text-primary" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tab toggle */}
              <div className="flex rounded-lg bg-black/30 border border-border/30 p-1 gap-1">
                <button
                  onClick={() => { setViewMode("dm"); setActiveGroupId(null); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${viewMode === "dm" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  data-testid="tab-dm"
                >
                  <MessageSquare className="w-3 h-3 inline mr-1" />DMs
                </button>
                <button
                  onClick={() => { setViewMode("groups"); setActiveUserId(null); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${viewMode === "groups" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  data-testid="tab-groups"
                >
                  <Users className="w-3 h-3 inline mr-1" />Groups
                  {invitationCount > 0 && <span className="ml-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white inline-flex items-center justify-center">{invitationCount}</span>}
                </button>
              </div>
            </div>

            {/* Invitations panel */}
            {showInvitations && invitationCount > 0 && (
              <div className="border-b border-border/50 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Pending Invitations</p>
                {pendingInvitations?.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between bg-card/80 rounded-lg p-3 border border-border/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{inv.group?.name}</p>
                      <p className="text-xs text-muted-foreground">from {inv.inviter?.displayName || "Unknown"}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => respondInvitation.mutate({ invitationId: inv.id, accept: true })}
                        className="p-1.5 rounded-full bg-green-500/20 hover:bg-green-500/40 transition-colors"
                        data-testid={`button-accept-invite-${inv.id}`}
                      >
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      </button>
                      <button
                        onClick={() => respondInvitation.mutate({ invitationId: inv.id, accept: false })}
                        className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 transition-colors"
                        data-testid={`button-decline-invite-${inv.id}`}
                      >
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create group form */}
            {showCreateGroup && (
              <div className="border-b border-border/50 bg-primary/5 p-3">
                <form onSubmit={handleCreateGroup} className="flex gap-2">
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name..."
                    className="flex-1 bg-background border border-border/50 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary"
                    data-testid="input-group-name"
                    autoFocus
                  />
                  <button type="submit" disabled={!groupName.trim() || createGroup.isPending} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-50" data-testid="button-submit-group">
                    Create
                  </button>
                  <button type="button" onClick={() => setShowCreateGroup(false)} className="px-2 py-2 text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {viewMode === "dm" ? (
                convsLoading ? (
                  <div className="p-4 flex justify-center"><LoadingSpinner className="scale-50" /></div>
                ) : conversations?.length === 0 ? (
                  <p className="text-center p-8 text-sm text-muted-foreground">No active discussions.</p>
                ) : (
                  conversations?.map((conv: any) => (
                    <button
                      key={conv.id}
                      onClick={() => setActiveUserId(conv.id)}
                      className={`w-full p-4 flex items-center gap-3 text-left border-b border-border/20 transition-colors ${activeUserId === conv.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-white/5'}`}
                      data-testid={`button-conversation-${conv.id}`}
                    >
                      <div className="w-12 h-12 rounded-full bg-muted border border-border/50 overflow-hidden flex-shrink-0">
                        {conv.profileImageUrl ? (
                          <img src={conv.profileImageUrl} alt="User" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-serif text-lg bg-black/50">
                            {(conv.displayName || "U")[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-semibold text-foreground truncate">{conv.displayName || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">Click to view messages</p>
                      </div>
                    </button>
                  ))
                )
              ) : (
                groupsLoading ? (
                  <div className="p-4 flex justify-center"><LoadingSpinner className="scale-50" /></div>
                ) : userGroups?.length === 0 ? (
                  <div className="text-center p-8 space-y-3">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No groups yet. Create one to start!</p>
                  </div>
                ) : (
                  userGroups?.map((group: any) => (
                    <button
                      key={group.id}
                      onClick={() => setActiveGroupId(group.id)}
                      className={`w-full p-4 flex items-center gap-3 text-left border-b border-border/20 transition-colors ${activeGroupId === group.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-white/5'}`}
                      data-testid={`button-group-${group.id}`}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-semibold text-foreground truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.memberCount} member{group.memberCount !== 1 ? "s" : ""}</p>
                      </div>
                    </button>
                  ))
                )
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${!hasActiveChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat`}>
            {hasActiveChat ? (
              <>
                {/* Header */}
                <div className="p-4 bg-card/90 backdrop-blur border-b border-border/50 flex items-center gap-3 sticky top-0 z-10">
                  <button
                    onClick={() => { setActiveUserId(null); setActiveGroupId(null); }}
                    className="md:hidden p-2 -ml-2 text-muted-foreground"
                    data-testid="button-back"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  {viewMode === "dm" ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border border-primary/30">
                        {activeUser?.profileImageUrl ? (
                          <img src={activeUser.profileImageUrl} alt="User" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-serif">
                            {(activeUser?.displayName || "U")[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1"><h3 className="font-semibold">{activeUser?.displayName || "Unknown"}</h3></div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{activeGroup?.name || "Group"}</h3>
                        <p className="text-xs text-muted-foreground">{activeGroup?.memberCount} members</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowMembers(!showMembers)} className="p-2 rounded-lg hover:bg-white/10" data-testid="button-show-members">
                          <Users className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => setShowInviteModal(!showInviteModal)} className="p-2 rounded-lg hover:bg-white/10" data-testid="button-invite-member">
                          <UserPlus className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => { if (confirm("Leave this group?")) leaveGroup.mutate(activeGroupId!, { onSuccess: () => { setActiveGroupId(null); toast({ title: "Left the group" }); } }); }} className="p-2 rounded-lg hover:bg-white/10" data-testid="button-leave-group">
                          <LogOut className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Members sidebar overlay */}
                {showMembers && viewMode === "groups" && (
                  <div className="absolute right-0 top-16 w-64 bg-card border border-border/50 rounded-bl-xl shadow-2xl z-20 max-h-80 overflow-y-auto">
                    <div className="p-3 border-b border-border/30 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Members</span>
                      <button onClick={() => setShowMembers(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                    </div>
                    {groupMembersList?.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 border-b border-border/10">
                        <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
                          {m.user?.profileImageUrl ? (
                            <img src={m.user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-serif bg-black/50">
                              {(m.user?.displayName || "U")[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.user?.displayName || "Unknown"}</p>
                          {m.role === "admin" && <span className="text-[10px] text-primary font-semibold uppercase">Admin</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Invite modal */}
                {showInviteModal && viewMode === "groups" && (
                  <div className="border-b border-border/50 bg-card/95 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Invite to Group</span>
                      <button onClick={() => { setShowInviteModal(false); setInviteSearch(""); }}><X className="w-4 h-4 text-muted-foreground" /></button>
                    </div>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={inviteSearch}
                        onChange={(e) => setInviteSearch(e.target.value)}
                        placeholder="Search users..."
                        className="w-full bg-background border border-border/50 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-primary"
                        data-testid="input-invite-search"
                        autoFocus
                      />
                    </div>
                    {searchResults && searchResults.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {searchResults.filter((u: any) => u.id !== user.id).map((u: any) => (
                          <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted overflow-hidden">
                                {u.profileImageUrl ? <img src={u.profileImageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-serif bg-black/50">{(u.displayName || "U")[0].toUpperCase()}</div>}
                              </div>
                              <span className="text-sm">{u.displayName || "Unknown"}</span>
                            </div>
                            <button
                              onClick={() => handleInvite(u.id)}
                              className="text-xs px-3 py-1 bg-primary/20 text-primary rounded-full hover:bg-primary/30 font-semibold"
                              data-testid={`button-invite-user-${u.id}`}
                            >
                              Invite
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/40 relative">
                  {(viewMode === "dm" ? msgsLoading : groupMsgsLoading) ? (
                    <LoadingSpinner />
                  ) : viewMode === "dm" ? (
                    messages?.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">
                        Start a discussion about numismatics...
                      </div>
                    ) : (
                      messages?.map((msg: any) => {
                        const isMe = msg.senderId === user.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-2xl p-3 shadow-md ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm border border-primary/50' : 'bg-card text-foreground rounded-tl-sm border border-border/50'}`}>
                              <p className="text-sm">{msg.content}</p>
                              <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {msg.createdAt ? format(new Date(msg.createdAt), 'h:mm a') : ''}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )
                  ) : (
                    groupMsgs?.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">
                        Start the conversation in this group...
                      </div>
                    ) : (
                      groupMsgs?.map((msg: any) => {
                        const isMe = msg.senderId === user.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {!isMe && (
                              <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0 mr-2 mt-1">
                                {msg.sender?.profileImageUrl ? <img src={msg.sender.profileImageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-serif bg-black/50">{(msg.sender?.displayName || "U")[0].toUpperCase()}</div>}
                              </div>
                            )}
                            <div className={`max-w-[70%] rounded-2xl p-3 shadow-md ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm border border-primary/50' : 'bg-card text-foreground rounded-tl-sm border border-border/50'}`}>
                              {!isMe && <p className="text-[10px] font-semibold text-primary mb-1">{msg.sender?.displayName || "Unknown"}</p>}
                              <p className="text-sm">{msg.content}</p>
                              <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {msg.createdAt ? format(new Date(msg.createdAt), 'h:mm a') : ''}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-card border-t border-border/50">
                  <form onSubmit={handleSend} className="relative flex gap-2">
                    <input
                      type="text"
                      value={msgInput}
                      onChange={(e) => setMsgInput(e.target.value)}
                      placeholder="Send a message..."
                      className="flex-1 bg-background border border-border/50 rounded-full py-3 px-5 text-sm focus:outline-none focus:border-primary"
                      disabled={sendMessage.isPending || sendGroupMsg.isPending}
                      data-testid="input-message"
                    />
                    <button
                      type="submit"
                      disabled={!msgInput.trim() || sendMessage.isPending || sendGroupMsg.isPending}
                      className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 disabled:opacity-50 hover:bg-primary/90 transition-colors"
                      data-testid="button-send-message"
                    >
                      <Send className="w-5 h-5 -ml-1" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="hidden md:flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="w-16 h-16 opacity-20 mb-4" />
                <p className="font-serif text-xl">Select a discussion to open</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </Shell>
  );
}
