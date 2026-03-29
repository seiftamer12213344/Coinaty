import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useConversations, useMessages, useSendMessage } from "@/hooks/use-messages";
import { useUserProfile, useSearchUsers } from "@/hooks/use-users";
import { useGroups, useGroupMessages, useGroupMembers, usePendingInvitations, useCreateGroup, useSendGroupMessage, useInviteToGroup, useRespondToInvitation, useLeaveGroup } from "@/hooks/use-groups";
import { Shell } from "@/components/layout/Shell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Send, Search, MessageSquare, Users, Plus, UserPlus, Bell, Check, X, LogOut, ChevronLeft, Mic, Phone, PhoneOff, PhoneIncoming, MicOff, Volume2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { onWS } from "@/lib/websocket";

type ViewMode = "dm" | "groups";
type CallStatus = "idle" | "calling" | "incoming" | "active";

const STUN_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };

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

  // Voice note state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  // Voice call state
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callId, setCallId] = useState<number | null>(null);
  const [incomingCallData, setIncomingCallData] = useState<any>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callDurationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingCandidates = useRef<RTCIceCandidate[]>([]);
  const callStatusRef = useRef<CallStatus>("idle");

  // Keep callStatusRef in sync
  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);

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

  const activeUserFromConvs = conversations?.find((c: any) => c.id === activeUserId);
  const { data: fetchedActiveUser } = useUserProfile(activeUserId && !activeUserFromConvs ? activeUserId : undefined);
  const activeUser = activeUserFromConvs || fetchedActiveUser;
  const activeGroup = userGroups?.find((g: any) => g.id === activeGroupId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, groupMsgs]);

  const cleanupCall = useCallback(() => {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (callDurationRef.current) { clearInterval(callDurationRef.current); callDurationRef.current = null; }
    if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = null; }
    pendingCandidates.current = [];
    setCallStatus("idle");
    setCallId(null);
    setIncomingCallData(null);
    setCallDuration(0);
    setIsMuted(false);
  }, []);

  const startCallTimer = useCallback(() => {
    setCallDuration(0);
    callDurationRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  }, []);

  const flushPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    for (const c of pendingCandidates.current) {
      try { await pc.addIceCandidate(c); } catch {}
    }
    pendingCandidates.current = [];
  }, []);

  const createPeerConnection = useCallback((onCandidate: (c: RTCIceCandidate) => void) => {
    const pc = new RTCPeerConnection(STUN_SERVERS);
    pc.onicecandidate = (e) => { if (e.candidate) onCandidate(e.candidate); };
    pc.ontrack = (e) => {
      if (!remoteAudioRef.current) {
        const audio = new Audio();
        audio.autoplay = true;
        remoteAudioRef.current = audio;
      }
      remoteAudioRef.current.srcObject = e.streams[0];
    };
    return pc;
  }, []);

  // --- WebSocket: incoming call notification ---
  useEffect(() => {
    if (!user) return;
    return onWS("call:incoming", async (data) => {
      if (callStatusRef.current !== "idle") return;
      try {
        const res = await fetch(`/api/calls/${data.callId}`, { credentials: "include" });
        if (!res.ok) return;
        const session = await res.json();
        setIncomingCallData(session);
        setCallId(data.callId);
        setCallStatus("incoming");
      } catch {}
    });
  }, [user]);

  // --- WebSocket: call state updates (for caller waiting for answer) ---
  useEffect(() => {
    if (!callId) return;
    return onWS("call:update", async (data) => {
      if (data.callId !== callId) return;
      const pc = pcRef.current;
      const status = callStatusRef.current;

      if (data.status === "rejected" || data.status === "ended") {
        cleanupCall();
        return;
      }
      if (data.status === "active" && data.sdpAnswer && status === "calling" && pc) {
        if (pc.signalingState !== "stable") {
          try {
            await pc.setRemoteDescription({ type: "answer", sdp: data.sdpAnswer });
            await flushPendingCandidates(pc);
            setCallStatus("active");
            startCallTimer();
          } catch {}
        }
      }
      // Receiver: update incoming call data if sdpOffer arrives
      if (status === "incoming" && data.sdpOffer) {
        setIncomingCallData((prev: any) => ({ ...prev, sdpOffer: data.sdpOffer }));
      }
    });
  }, [callId, cleanupCall, flushPendingCandidates, startCallTimer]);

  // --- WebSocket: ICE candidates delivered in real-time ---
  useEffect(() => {
    if (!callId) return;
    return onWS("call:candidates", async (data) => {
      if (data.callId !== callId) return;
      const pc = pcRef.current;
      if (!pc) return;
      for (const c of data.candidates) {
        const ice = new RTCIceCandidate(JSON.parse(c));
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(ice); } catch {}
        } else {
          pendingCandidates.current.push(ice);
        }
      }
    });
  }, [callId]);

  const sendCandidates = useCallback(async (cid: number, role: "caller" | "receiver", candidates: RTCIceCandidate[]) => {
    if (candidates.length === 0) return;
    await fetch(`/api/calls/${cid}/candidates/${role}`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidates: candidates.map(c => JSON.stringify(c)) }),
    });
  }, []);

  const waitForGathering = (pc: RTCPeerConnection) =>
    new Promise<void>(resolve => {
      if (pc.iceGatheringState === "complete") { resolve(); return; }
      const check = () => { if (pc.iceGatheringState === "complete") { pc.removeEventListener("icegatheringstatechange", check); resolve(); } };
      pc.addEventListener("icegatheringstatechange", check);
      setTimeout(resolve, 3000);
    });

  const handleStartCall = useCallback(async () => {
    if (!activeUserId || callStatusRef.current !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const res = await fetch("/api/calls", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: activeUserId }),
      });
      if (!res.ok) throw new Error("Failed to create call");
      const session = await res.json();
      const cid = session.id;
      setCallId(cid);
      setCallStatus("calling");

      const candidateBuffer: RTCIceCandidate[] = [];
      const pc = createPeerConnection((c) => candidateBuffer.push(c));
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForGathering(pc);

      await fetch(`/api/calls/${cid}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdpOffer: pc.localDescription?.sdp }),
      });

      await sendCandidates(cid, "caller", candidateBuffer);
    } catch (err: any) {
      toast({ title: "Call failed", description: err.message || "Could not access microphone", variant: "destructive" });
      cleanupCall();
    }
  }, [activeUserId, createPeerConnection, sendCandidates, cleanupCall, toast]);

  const handleAcceptCall = useCallback(async () => {
    if (!callId) { cleanupCall(); return; }
    try {
      let callData = incomingCallData;
      if (!callData?.sdpOffer) {
        const r = await fetch(`/api/calls/${callId}`, { credentials: "include" });
        if (!r.ok) throw new Error("Could not fetch call");
        callData = await r.json();
      }
      if (!callData?.sdpOffer) throw new Error("No offer yet");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const candidateBuffer: RTCIceCandidate[] = [];
      const pc = createPeerConnection((c) => candidateBuffer.push(c));
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      await pc.setRemoteDescription({ type: "offer", sdp: callData.sdpOffer });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForGathering(pc);

      // Add any already-received caller candidates
      for (const c of callData.callerCandidates || []) {
        try { await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(c))); } catch {}
      }
      await flushPendingCandidates(pc);

      await fetch(`/api/calls/${callId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdpAnswer: pc.localDescription?.sdp, status: "active" }),
      });

      await sendCandidates(callId, "receiver", candidateBuffer);

      setCallStatus("active");
      startCallTimer();
    } catch (err: any) {
      toast({ title: "Could not join call", description: err.message, variant: "destructive" });
      if (callId) {
        await fetch(`/api/calls/${callId}`, {
          method: "PATCH", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "rejected" }),
        });
      }
      cleanupCall();
    }
  }, [callId, incomingCallData, createPeerConnection, flushPendingCandidates, sendCandidates, cleanupCall, startCallTimer, toast]);

  const handleRejectCall = useCallback(async () => {
    if (callId) {
      await fetch(`/api/calls/${callId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
    }
    cleanupCall();
  }, [callId, cleanupCall]);

  const handleEndCall = useCallback(async () => {
    if (callId) {
      await fetch(`/api/calls/${callId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ended" }),
      });
    }
    cleanupCall();
  }, [callId, cleanupCall]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  }, []);

  // Voice note recording
  const mimeTypeRef = useRef<string>("audio/webm");

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick the best supported MIME type
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find(t => MediaRecorder.isTypeSupported(t)) || "";
      mimeTypeRef.current = mimeType || "audio/webm";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  }, [toast]);

  const stopRecordingAndSend = useCallback(async () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    setIsRecording(false);
    setIsUploadingAudio(true);

    const mr = mediaRecorderRef.current;

    // Stop tracks INSIDE onstop so MediaRecorder flushes all audio data first
    await new Promise<void>(resolve => {
      mr.onstop = () => {
        mr.stream.getTracks().forEach(t => t.stop());
        resolve();
      };
      mr.stop();
    });

    const mimeType = mimeTypeRef.current;
    const blob = new Blob(audioChunksRef.current, { type: mimeType });
    if (blob.size < 500) {
      setIsUploadingAudio(false);
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      toast({ title: "Recording too short", variant: "destructive" });
      return;
    }

    const ext = mimeType.includes("ogg") ? ".ogg" : mimeType.includes("mp4") ? ".mp4" : ".webm";
    try {
      const form = new FormData();
      form.append("audio", blob, `voice-note${ext}`);
      const res = await fetch("/api/upload/audio", { method: "POST", body: form, credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }
      const { url } = await res.json();
      if (activeUserId) {
        sendMessage.mutate({ userId: activeUserId, content: "", audioUrl: url });
      }
    } catch (err: any) {
      toast({ title: "Failed to send voice note", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingAudio(false);
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    }
  }, [isRecording, activeUserId, sendMessage, toast]);

  const cancelRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    const mr = mediaRecorderRef.current;
    mr.onstop = () => mr.stream.getTracks().forEach(t => t.stop());
    mr.stop();
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
  }, []);

  if (authLoading) return <Shell><LoadingSpinner /></Shell>;
  if (!user) { window.location.href = "/auth"; return null; }

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
  const formatDuration = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <Shell>
      <div className="h-[calc(100vh-64px)] md:h-screen p-0 md:p-6 flex flex-col">
        <div className="flex-1 bg-card md:rounded-3xl border-x md:border border-border/50 flex overflow-hidden shadow-2xl relative">

          {/* Incoming Call Overlay */}
          {callStatus === "incoming" && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="bg-card border border-primary/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl max-w-xs w-full mx-4">
                <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center mx-auto animate-pulse">
                  <PhoneIncoming className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Incoming Voice Call</p>
                  <p className="font-serif text-xl text-foreground">{activeUser?.displayName || "Someone"}</p>
                </div>
                <div className="flex gap-4 justify-center">
                  <button data-testid="button-reject-call" onClick={handleRejectCall}
                    className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center hover:bg-red-500/40 transition-colors">
                    <PhoneOff className="w-7 h-7 text-red-400" />
                  </button>
                  <button data-testid="button-accept-call" onClick={handleAcceptCall}
                    className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center hover:bg-green-500/40 transition-colors">
                    <Phone className="w-7 h-7 text-green-400" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Calling Overlay */}
          {callStatus === "calling" && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="bg-card border border-primary/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl max-w-xs w-full mx-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto">
                  <Phone className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Calling...</p>
                  <p className="font-serif text-xl text-foreground">{activeUser?.displayName || "..."}</p>
                </div>
                <button data-testid="button-cancel-call" onClick={handleEndCall}
                  className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center hover:bg-red-500/40 transition-colors mx-auto">
                  <PhoneOff className="w-7 h-7 text-red-400" />
                </button>
              </div>
            </div>
          )}

          {/* Active Call Bar */}
          {callStatus === "active" && (
            <div className="absolute top-0 left-0 right-0 z-40 bg-green-900/90 backdrop-blur border-b border-green-500/30 px-4 py-2 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <Volume2 className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-sm font-medium flex-1">Voice Call — {formatDuration(callDuration)}</span>
              <button data-testid="button-toggle-mute" onClick={toggleMute}
                className={`p-2 rounded-full transition-colors ${isMuted ? "bg-red-500/30 text-red-400" : "bg-white/10 text-muted-foreground hover:text-foreground"}`}>
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button data-testid="button-end-call" onClick={handleEndCall}
                className="px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-sm font-medium hover:bg-red-500/40 transition-colors flex items-center gap-2">
                <PhoneOff className="w-3.5 h-3.5" /> End
              </button>
            </div>
          )}

          {/* Sidebar */}
          <div className={`${hasActiveChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-border/50 bg-background/50`}>
            <div className="p-4 border-b border-border/50 bg-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-bold text-primary" data-testid="text-messages-title">
                  {viewMode === "dm" ? "Discussions" : "Groups"}
                </h2>
                <div className="flex items-center gap-2">
                  {invitationCount > 0 && (
                    <button onClick={() => setShowInvitations(!showInvitations)} className="relative p-2 rounded-lg hover:bg-white/10 transition-colors" data-testid="button-invitations">
                      <Bell className="w-4 h-4 text-primary" />
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">{invitationCount}</span>
                    </button>
                  )}
                  {viewMode === "groups" && (
                    <button onClick={() => setShowCreateGroup(true)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" data-testid="button-create-group">
                      <Plus className="w-4 h-4 text-primary" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex rounded-lg bg-black/30 border border-border/30 p-1 gap-1">
                <button onClick={() => { setViewMode("dm"); setActiveGroupId(null); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${viewMode === "dm" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  data-testid="tab-dm">
                  <MessageSquare className="w-3 h-3 inline mr-1" />DMs
                </button>
                <button onClick={() => { setViewMode("groups"); setActiveUserId(null); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${viewMode === "groups" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  data-testid="tab-groups">
                  <Users className="w-3 h-3 inline mr-1" />Groups
                  {invitationCount > 0 && <span className="ml-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white inline-flex items-center justify-center">{invitationCount}</span>}
                </button>
              </div>
            </div>

            {showInvitations && invitationCount > 0 && (
              <div className="border-b border-border/50 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Pending Invitations</p>
                {pendingInvitations?.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between bg-card/80 rounded-lg p-3 border border-border/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{inv.group?.name}</p>
                      <p className="text-xs text-muted-foreground">from {inv.inviter?.displayName || "Unknown"}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button onClick={() => respondInvitation.mutate({ invitationId: inv.id, accept: true })} className="p-1.5 rounded-full bg-green-500/20 hover:bg-green-500/40 transition-colors" data-testid={`button-accept-invite-${inv.id}`}><Check className="w-3.5 h-3.5 text-green-400" /></button>
                      <button onClick={() => respondInvitation.mutate({ invitationId: inv.id, accept: false })} className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 transition-colors" data-testid={`button-decline-invite-${inv.id}`}><X className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showCreateGroup && (
              <div className="border-b border-border/50 bg-primary/5 p-3">
                <form onSubmit={handleCreateGroup} className="flex gap-2">
                  <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name..." className="flex-1 bg-background border border-border/50 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary" data-testid="input-group-name" autoFocus />
                  <button type="submit" disabled={!groupName.trim() || createGroup.isPending} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-50" data-testid="button-submit-group">Create</button>
                  <button type="button" onClick={() => setShowCreateGroup(false)} className="px-2 py-2 text-muted-foreground"><X className="w-4 h-4" /></button>
                </form>
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {viewMode === "dm" ? (
                convsLoading ? (
                  <div className="p-4 flex justify-center"><LoadingSpinner className="scale-50" /></div>
                ) : conversations?.length === 0 ? (
                  <p className="text-center p-8 text-sm text-muted-foreground">No active discussions.</p>
                ) : (
                  conversations?.map((conv: any) => (
                    <button key={conv.id} onClick={() => setActiveUserId(conv.id)}
                      className={`w-full p-4 flex items-center gap-3 text-left border-b border-border/20 transition-colors ${activeUserId === conv.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-white/5'}`}
                      data-testid={`button-conversation-${conv.id}`}>
                      <div className="w-12 h-12 rounded-full bg-muted border border-border/50 overflow-hidden flex-shrink-0">
                        {conv.profileImageUrl ? <img src={conv.profileImageUrl} alt="User" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-serif text-lg bg-black/50">{(conv.displayName || "U")[0].toUpperCase()}</div>}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-semibold truncate">{conv.displayName || "Unknown"}</p>
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
                    <button key={group.id} onClick={() => setActiveGroupId(group.id)}
                      className={`w-full p-4 flex items-center gap-3 text-left border-b border-border/20 transition-colors ${activeGroupId === group.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-white/5'}`}
                      data-testid={`button-group-${group.id}`}>
                      <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0"><Users className="w-5 h-5 text-primary" /></div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-semibold truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.memberCount} member{group.memberCount !== 1 ? "s" : ""}</p>
                      </div>
                    </button>
                  ))
                )
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${!hasActiveChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat ${callStatus === "active" ? "pt-10" : ""}`}>
            {hasActiveChat ? (
              <>
                {/* Header */}
                <div className="p-4 bg-card/90 backdrop-blur border-b border-border/50 flex items-center gap-3 sticky top-0 z-10">
                  <button onClick={() => { setActiveUserId(null); setActiveGroupId(null); }} className="md:hidden p-2 -ml-2 text-muted-foreground" data-testid="button-back">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  {viewMode === "dm" ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border border-primary/30">
                        {activeUser?.profileImageUrl ? <img src={activeUser.profileImageUrl} alt="User" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-serif">{(activeUser?.displayName || "U")[0].toUpperCase()}</div>}
                      </div>
                      <div className="flex-1"><h3 className="font-semibold">{activeUser?.displayName || "Unknown"}</h3></div>
                      {callStatus === "idle" && (
                        <button data-testid="button-start-voice-call" onClick={handleStartCall}
                          className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-colors" title="Voice call">
                          <Phone className="w-4 h-4 text-primary" />
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{activeGroup?.name || "Group"}</h3>
                        <p className="text-xs text-muted-foreground">{activeGroup?.memberCount} members</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowMembers(!showMembers)} className="p-2 rounded-lg hover:bg-white/10" data-testid="button-show-members"><Users className="w-4 h-4 text-muted-foreground" /></button>
                        <button onClick={() => setShowInviteModal(!showInviteModal)} className="p-2 rounded-lg hover:bg-white/10" data-testid="button-invite-member"><UserPlus className="w-4 h-4 text-muted-foreground" /></button>
                        <button onClick={() => { if (confirm("Leave this group?")) leaveGroup.mutate(activeGroupId!, { onSuccess: () => { setActiveGroupId(null); toast({ title: "Left the group" }); } }); }} className="p-2 rounded-lg hover:bg-white/10" data-testid="button-leave-group"><LogOut className="w-4 h-4 text-muted-foreground" /></button>
                      </div>
                    </>
                  )}
                </div>

                {showMembers && viewMode === "groups" && (
                  <div className="absolute right-0 top-16 w-64 bg-card border border-border/50 rounded-bl-xl shadow-2xl z-20 max-h-80 overflow-y-auto">
                    <div className="p-3 border-b border-border/30 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Members</span>
                      <button onClick={() => setShowMembers(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                    </div>
                    {groupMembersList?.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 border-b border-border/10">
                        <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
                          {m.user?.profileImageUrl ? <img src={m.user.profileImageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-serif bg-black/50">{(m.user?.displayName || "U")[0].toUpperCase()}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.user?.displayName || "Unknown"}</p>
                          {m.role === "admin" && <span className="text-[10px] text-primary font-semibold uppercase">Admin</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showInviteModal && viewMode === "groups" && (
                  <div className="border-b border-border/50 bg-card/95 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Invite to Group</span>
                      <button onClick={() => { setShowInviteModal(false); setInviteSearch(""); }}><X className="w-4 h-4 text-muted-foreground" /></button>
                    </div>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input type="text" value={inviteSearch} onChange={(e) => setInviteSearch(e.target.value)} placeholder="Search users..." className="w-full bg-background border border-border/50 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-primary" data-testid="input-invite-search" autoFocus />
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
                            <button onClick={() => handleInvite(u.id)} className="text-xs px-3 py-1 bg-primary/20 text-primary rounded-full hover:bg-primary/30 font-semibold" data-testid={`button-invite-user-${u.id}`}>Invite</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/40">
                  {(viewMode === "dm" ? msgsLoading : groupMsgsLoading) ? (
                    <LoadingSpinner />
                  ) : viewMode === "dm" ? (
                    messages?.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">Start a discussion about numismatics...</div>
                    ) : (
                      messages?.map((msg: any) => {
                        const isMe = msg.senderId === user.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-2xl p-3 shadow-md ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm border border-primary/50' : 'bg-card text-foreground rounded-tl-sm border border-border/50'}`}>
                              {msg.audioUrl ? (
                                <VoiceNotePlayer src={msg.audioUrl} isMe={isMe} />
                              ) : (
                                <p className="text-sm">{msg.content}</p>
                              )}
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
                      <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">Start the conversation in this group...</div>
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

                {/* Input Area */}
                <div className="p-4 bg-card border-t border-border/50">
                  {isRecording ? (
                    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-full px-5 py-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-red-400 text-sm font-medium flex-1">Recording... {formatDuration(recordingSeconds)}</span>
                      <button onClick={cancelRecording} className="text-muted-foreground hover:text-foreground p-1" data-testid="button-cancel-recording"><X className="w-4 h-4" /></button>
                      <button onClick={stopRecordingAndSend} className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors" data-testid="button-stop-recording"><Send className="w-4 h-4" /></button>
                    </div>
                  ) : (
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
                      {viewMode === "dm" && !msgInput.trim() && (
                        <button type="button" onClick={startRecording} disabled={isUploadingAudio}
                          className="w-12 h-12 rounded-full bg-card border border-border/50 text-muted-foreground flex items-center justify-center flex-shrink-0 hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
                          data-testid="button-voice-note" title="Record voice note">
                          {isUploadingAudio ? <LoadingSpinner className="scale-50" /> : <Mic className="w-5 h-5" />}
                        </button>
                      )}
                      <button type="submit" disabled={!msgInput.trim() || sendMessage.isPending || sendGroupMsg.isPending}
                        className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 disabled:opacity-50 hover:bg-primary/90 transition-colors"
                        data-testid="button-send-message">
                        <Send className="w-5 h-5 -ml-1" />
                      </button>
                    </form>
                  )}
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

function VoiceNotePlayer({ src, isMe }: { src: string; isMe: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <audio ref={audioRef} src={src}
        onLoadedMetadata={e => setDuration((e.target as HTMLAudioElement).duration)}
        onTimeUpdate={e => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
        onEnded={() => setIsPlaying(false)} />
      <button onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isMe ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground" : "bg-primary/20 hover:bg-primary/30 text-primary"}`}
        data-testid="button-play-voice-note">
        {isPlaying ? (
          <span className="flex gap-0.5"><span className="w-0.5 h-4 bg-current rounded" /><span className="w-0.5 h-4 bg-current rounded" /></span>
        ) : (
          <span className="border-l-[14px] border-l-current border-y-[8px] border-y-transparent ml-0.5" />
        )}
      </button>
      <div className="flex-1 space-y-1">
        <div className="w-full h-1 rounded-full bg-current/20 overflow-hidden">
          <div className="h-full bg-current/60 rounded-full transition-all" style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }} />
        </div>
        <p className="text-[10px] opacity-70">{isPlaying ? formatTime(currentTime) : formatTime(duration || 0)}</p>
      </div>
      <Mic className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
    </div>
  );
}
