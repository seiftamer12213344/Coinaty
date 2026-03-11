import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useConversations, useMessages, useSendMessage } from "@/hooks/use-messages";
import { useUserProfile } from "@/hooks/use-users";
import { Shell } from "@/components/layout/Shell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Send, Search, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export default function Messages() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: conversations, isLoading: convsLoading } = useConversations();

  const preselectedUserId = new URLSearchParams(window.location.search).get("user");
  const [activeUserId, setActiveUserId] = useState<string | null>(preselectedUserId);

  useEffect(() => {
    if (preselectedUserId) setActiveUserId(preselectedUserId);
  }, [preselectedUserId]);

  const [msgInput, setMsgInput] = useState("");
  
  const { data: messages, isLoading: msgsLoading } = useMessages(activeUserId || undefined);
  const sendMessage = useSendMessage();

  if (authLoading) return <Shell><LoadingSpinner /></Shell>;
  if (!user) {
    window.location.href = "/api/login";
    return null;
  }

  const activeUserFromConvs = conversations?.find(c => c.id === activeUserId);
  const { data: fetchedActiveUser } = useUserProfile(activeUserId && !activeUserFromConvs ? activeUserId : undefined);
  const activeUser = activeUserFromConvs || fetchedActiveUser;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim() || !activeUserId) return;
    
    sendMessage.mutate({ userId: activeUserId, content: msgInput.trim() }, {
      onSuccess: () => setMsgInput("")
    });
  };

  return (
    <Shell>
      <div className="h-[calc(100vh-64px)] md:h-screen p-0 md:p-6 flex flex-col">
        <div className="flex-1 bg-card md:rounded-3xl border-x md:border border-border/50 flex overflow-hidden shadow-2xl">
          
          {/* Sidebar - Conversations List */}
          <div className={`${activeUserId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-border/50 bg-background/50`}>
            <div className="p-4 border-b border-border/50 bg-card">
              <h2 className="font-serif text-xl font-bold mb-4 text-primary">Discussions</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search scholars..." 
                  className="w-full bg-black/40 border border-border/50 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {convsLoading ? (
                <div className="p-4 flex justify-center"><LoadingSpinner className="scale-50" /></div>
              ) : conversations?.length === 0 ? (
                <p className="text-center p-8 text-sm text-muted-foreground">No active discussions.</p>
              ) : (
                conversations?.map(conv => (
                  <button 
                    key={conv.id}
                    onClick={() => setActiveUserId(conv.id)}
                    className={`w-full p-4 flex items-center gap-3 text-left border-b border-border/20 transition-colors ${activeUserId === conv.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-white/5'}`}
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
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className={`${!activeUserId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat`}>
            {activeUserId ? (
              <>
                {/* Chat Header */}
                <div className="p-4 bg-card/90 backdrop-blur border-b border-border/50 flex items-center gap-3 sticky top-0 z-10">
                   <button 
                    onClick={() => setActiveUserId(null)}
                    className="md:hidden p-2 -ml-2 text-muted-foreground"
                   >
                     <span className="text-xs font-bold uppercase tracking-wider">&larr; Back</span>
                   </button>
                   <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border border-primary/30">
                       {activeUser?.profileImageUrl ? (
                          <img src={activeUser.profileImageUrl} alt="User" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-serif">
                            {(activeUser?.displayName || "U")[0].toUpperCase()}
                          </div>
                        )}
                   </div>
                   <div>
                     <h3 className="font-semibold">{activeUser?.displayName || "Unknown"}</h3>
                   </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/40">
                  {msgsLoading ? (
                    <LoadingSpinner />
                  ) : messages?.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">
                      Start a discussion about numismatics...
                    </div>
                  ) : (
                    messages?.map(msg => {
                      const isMe = msg.senderId === user.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl p-3 shadow-md ${
                            isMe 
                              ? 'bg-primary text-primary-foreground rounded-tr-sm border border-primary/50' 
                              : 'bg-card text-foreground rounded-tl-sm border border-border/50'
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                               {msg.createdAt ? format(new Date(msg.createdAt), 'h:mm a') : ''}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
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
                      disabled={sendMessage.isPending}
                    />
                    <button 
                      type="submit"
                      disabled={!msgInput.trim() || sendMessage.isPending}
                      className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 disabled:opacity-50 hover:bg-primary/90 transition-colors"
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
