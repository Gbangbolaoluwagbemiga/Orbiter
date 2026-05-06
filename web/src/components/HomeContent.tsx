"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Spinner } from "@/components/Spinner";
import { MiniPayLink } from "@/components/MiniPayLink";
import {
  Plus,
  Trash2,
  CreditCard,
  Users,
  Zap,
  Link as LinkIcon,
  LogIn,
  Bot,
  LayoutDashboard,
  Menu,
  X
} from "lucide-react";
import { useAccount, useReadContract, useBalance, useConnect } from "wagmi";
import { formatUnits, formatEther } from "viem";
import { injected } from "wagmi/connectors";
import { usePayeerContract } from "@/hooks/usePayeerContract";
import { QRCodeSVG } from "qrcode.react";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { supabase } from "@/utils/supabase";
import { Send, Smile } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { AgentPanel } from "@/components/AgentPanel";
import { SelfVerifyBadge } from "@/components/SelfVerifyBadge";
export default function HomeContent() {
  const [winner, setWinner] = useState<string | null>(null);
  const [amount, setAmount] = useState("0.01");
  const [merchant, setMerchant] = useState("");
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);
  const [isVisualSpinning, setIsVisualSpinning] = useState(false);
  const [showBadgeAfterPayment, setShowBadgeAfterPayment] = useState(false);
  const [isPreloading, setIsPreloading] = useState(true);
  const [paymentToken, setPaymentToken] = useState("CELO"); // "CELO" or "USDC"
  const [txHash, setTxHash] = useState<string | null>(null);
  const USDC_ADDRESS = "0xcebA9300f24863e411085441E0c089ccB8CE96Be";
  const [activeTab, setActiveTab] = useState<'lobby' | 'agent'>('lobby');
  const [mobileView, setMobileView] = useState<'lobby' | 'wheel'>('lobby');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Custom Names state (Stored locally and pulled from URL for the host)
  const [playerName, setPlayerName] = useState("");
  const [playerNamesMap, setPlayerNamesMap] = useState<Record<string, string>>(
    {},
  );
  const [lobbyName, setLobbyName] = useState("Lobby");
  const [isEditingLobbyName, setIsEditingLobbyName] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const { isConnected, address, chain } = useAccount();
  const { connect } = useConnect();
  const { data: balanceData } = useBalance({ address });
  const [isMiniPay, setIsMiniPay] = useState(false);

  useEffect(() => {
    // Reveal app after mini splash
    const timer = setTimeout(() => setIsPreloading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Check if running inside MiniPay
    if (typeof window !== "undefined" && (window as any).ethereum?.isMiniPay) {
      setIsMiniPay(true);
      // Auto-connect if not already connected
      if (!isConnected) {
        connect({ connector: injected() });
      }
    }
  }, [isConnected, connect]);

  useEffect(() => {
    // Re-check balances when connection changes
  }, [isConnected, address, chain, balanceData]);

  const {
    createLobby,
    joinSession,
    lockAndSelectPayer,
    sessionCount,
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    createLobbyPending,
    joinSessionPending,
    lockAndSelectPayerPending,
    completePayment,
    completePaymentWithToken,
    completePaymentPending,
    completePaymentWithTokenPending,
  } = usePayeerContract();

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sessionUrl, setSessionUrl] = useState<string>("");

  // Real-time Chat & Reactions
  const [messages, setMessages] = useState<{ user: string; text: string }[]>(
    [],
  );
  const [newMessage, setNewMessage] = useState("");
  const [recentReactions, setRecentReactions] = useState<
    { emoji: string; id: number }[]
  >([]);

  // Real participants from the contract
  const { data: onChainParticipants, refetch: refetchParticipants } =
    useReadContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: "getSessionParticipants",
      args: activeSessionId !== null ? [BigInt(activeSessionId)] : undefined,
      query: {
        enabled: activeSessionId !== null,
        refetchInterval: 3000,
      },
    });

  const { data: sessionDetails, refetch: refetchSessionDetails } =
    useReadContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: "sessions",
      args: activeSessionId !== null ? [BigInt(activeSessionId)] : undefined,
      query: {
        enabled: activeSessionId !== null,
        refetchInterval: 3000,
      },
    });

  // Extract session details
  const participantsList = (onChainParticipants as string[]) || [];
  const sessionCompleted = sessionDetails ? (sessionDetails as any)[3] : false; // Corrected index for 'completed'
  const sessionIsLocked = sessionDetails ? (sessionDetails as any)[4] : false; // Corrected index for 'isLocked'
  const sessionWinner =
    sessionDetails &&
    (sessionDetails as any)[2] !== "0x0000000000000000000000000000000000000000"
      ? ((sessionDetails as any)[2] as string)
      : null;


  const isHost =
    participantsList.length > 0 &&
    address &&
    participantsList[0].toLowerCase() === address.toLowerCase();
  const hasJoined =
    address &&
    participantsList.some((p) => p.toLowerCase() === address.toLowerCase());

  // Set winner if selected
  useEffect(() => {
    if (sessionWinner && sessionWinner !== winner) {
      setWinner(sessionWinner);
      setMobileView('wheel'); // Force wheel view on mobile when winner is picked
    }
  }, [sessionWinner, winner]);

  // Supabase Real-time & Persistence Logic
  useEffect(() => {
    if (activeSessionId === null) return;

    // 1. Fetch initial state from DB
    const fetchLobbyState = async () => {
      // Fetch lobby metadata
      const { data: lobbyData } = await supabase
        .from("lobbies")
        .select("*")
        .eq("id", activeSessionId)
        .single();

      if (lobbyData) {
        if (lobbyData.name) setLobbyName(lobbyData.name);
        if (lobbyData.player_names) setPlayerNamesMap(lobbyData.player_names);
      }

      // Fetch message history
      const { data: messageData } = await supabase
        .from("messages")
        .select("user_name, message_text")
        .eq("session_id", activeSessionId)
        .order("sent_at", { ascending: true })
        .limit(20);

      if (messageData) {
        setMessages(
          messageData.map((m) => ({ user: m.user_name, text: m.message_text })),
        );
      }
    };
    fetchLobbyState();

    // 2. Subscribe to BOTH Broadcast (fast) and DB changes (persistent)
    const channel = supabase.channel(`lobby-${activeSessionId}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "reaction" }, (payload) => {
        const id = Date.now();
        setRecentReactions((prev) => [
          ...prev,
          { emoji: payload.payload.emoji, id },
        ]);
        setTimeout(() => {
          setRecentReactions((prev) => prev.filter((r) => r.id !== id));
        }, 2000);
      })
      .on('broadcast', { event: 'spin_started' }, () => {
        setIsVisualSpinning(true);
        setMobileView('wheel'); // Switch to wheel view on mobile
      })
      .on('broadcast', { event: 'spin_ended' }, () => {
        setIsVisualSpinning(false);
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `session_id=eq.${activeSessionId}`,
        },
        (payload) => {
          setMessages((prev) =>
            [
              ...prev,
              { user: payload.new.user_name, text: payload.new.message_text },
            ].slice(-20),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lobbies",
          filter: `id=eq.${activeSessionId}`,
        },
        (payload) => {
          // 1. Only update lobby name if we are NOT the host address (source of truth)
          const dbHost = payload.new.host_address;
          if (payload.new.name !== undefined && payload.new.name !== lobbyName && address?.toLowerCase() !== dbHost?.toLowerCase()) {
            setLobbyName(payload.new.name);
          }
          // 2. Clear winner state if the DB says common winner is reset (though contract is source of truth)
          if (payload.new.player_names) {
            setPlayerNamesMap((prev) => {
              const merged = { ...payload.new.player_names };
              if (address && prev[address.toLowerCase()]) {
                merged[address.toLowerCase()] = prev[address.toLowerCase()];
              }
              return merged;
            });
          }
        },
      )
      .on("broadcast", { event: "name_sync" }, (payload) => {
        // MERGE: Keep our current local name for our address
        setPlayerNamesMap((prev) => {
          const merged = { ...prev, ...payload.payload };
          if (address && prev[address.toLowerCase()]) {
            merged[address.toLowerCase()] = prev[address.toLowerCase()];
          }
          return merged;
        });
      })
      .on("broadcast", { event: "lobby_sync" }, (payload) => {
        if (payload.payload.name !== lobbyName && !isHost) {
          setLobbyName(payload.payload.name);
        }
      })
      .on("broadcast", { event: "payment_completed" }, (payload) => {
        const payerName =
          payload.payload.name || payload.payload.payer.slice(0, 6);
        toast.success(`${payerName} just paid the bill! 💸`);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSessionId]);

  // Update DB when lobby name or player names change (Host only to prevent race conditions)
  useEffect(() => {
    if (activeSessionId !== null && isHost && isConnected) {
      const syncToDB = async () => {
        // First get current state to avoid overwriting others' names
        const { data } = await supabase
          .from("lobbies")
          .select("player_names")
          .eq("id", activeSessionId)
          .single();

        const existingNames = data?.player_names || {};
        const mergedNames = { ...existingNames, ...playerNamesMap };

        await supabase.from("lobbies").upsert({
          id: activeSessionId,
          name: lobbyName,
          player_names: mergedNames,
          host_address: address,
        });
      };
      syncToDB();
    }
  }, [
    lobbyName,
    playerNamesMap,
    activeSessionId,
    isHost,
    address,
    isConnected,
  ]);

  // Sync names to others when mine changes (DEBOUNCED)
  useEffect(() => {
    if (activeSessionId !== null && address && playerName) {
      const timeoutId = setTimeout(() => {
        const myName = { [address.toLowerCase()]: playerName };

        // Broadcast for immediate feedback
        supabase.channel(`lobby-${activeSessionId}`).send({
          type: "broadcast",
          event: "name_sync",
          payload: myName,
        });

        // Update DB
        const updateMyNameInDB = async () => {
          const { data } = await supabase
            .from("lobbies")
            .select("player_names")
            .eq("id", activeSessionId)
            .single();

          const currentNames = data?.player_names || {};
          if (currentNames[address.toLowerCase()] !== playerName) {
            await supabase
              .from("lobbies")
              .update({ player_names: { ...currentNames, ...myName } })
              .eq("id", activeSessionId);
          }
        };
        updateMyNameInDB();
      }, 500); // 500ms debounce
      return () => clearTimeout(timeoutId);
    }
  }, [playerName, address, activeSessionId]);

  const sendChatMessage = async () => {
    if (!newMessage.trim() || activeSessionId === null) return;
    const name = playerName || (address ? `${address.slice(0, 6)}...` : "Anon");

    await supabase.from("messages").insert({
      session_id: activeSessionId,
      user_name: name,
      message_text: newMessage,
    });

    setNewMessage("");
  };

  const sendReaction = (emoji: string) => {
    if (activeSessionId === null) return;
    supabase.channel(`lobby-${activeSessionId}`).send({
      type: "broadcast",
      event: "reaction",
      payload: { emoji },
    });
  };

  // Handle URL params for joining a shared link
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const joinId = urlParams.get("join");

      if (joinId !== null) {
        const id = Number(joinId);
        setActiveSessionId(id);

        const namesParam = urlParams.get("names");
        if (namesParam) {
          try {
            const decodedNames = JSON.parse(decodeURIComponent(namesParam));
            setPlayerNamesMap((prev) => ({ ...prev, ...decodedNames }));
          } catch (e) {
            console.error("Failed to parse names");
          }
        }

        const lname = urlParams.get("lname");
        if (lname) {
          setLobbyName(decodeURIComponent(lname));
        }

        const cleanUrl =
          window.location.origin + window.location.pathname + "?join=" + joinId;
        setSessionUrl(cleanUrl);
        // Update browser URL without reload
        window.history.pushState({}, "", cleanUrl);
      }
    }
  }, [isConnected]); // Run when connection status changes or component mounts

  // Broadcast updates
  useEffect(() => {
    if (activeSessionId !== null && isHost) {
      // Host broadcasts lobby name changes
      supabase.channel(`lobby-${activeSessionId}`).send({
        type: "broadcast",
        event: "lobby_sync",
        payload: { name: lobbyName },
      });
    }
  }, [lobbyName, activeSessionId, isHost]);

  const handleCreateLobby = async () => {
    if (!isConnected || !merchant) return;
    setIsCreatingLobby(true);
    try {
      const tx = await createLobby(amount, merchant);

      // Wait a moment for the transaction to be mined
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const newSessionId = sessionCount ? Number(sessionCount) : 0;
      setActiveSessionId(newSessionId);

      if (playerName && address) {
        // Immediately update local map and broadcast host's initial name
        const hostName = { [address.toLowerCase()]: playerName };
        setPlayerNamesMap((prev) => ({ ...prev, ...hostName }));
        supabase.channel(`lobby-${newSessionId}`).send({
          type: "broadcast",
          event: "name_sync",
          payload: hostName,
        });
      }

      if (typeof window !== "undefined") {
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set("join", newSessionId.toString());
        if (playerName)
          url.searchParams.set(
            "names",
            encodeURIComponent(
              JSON.stringify({ [address!.toLowerCase()]: playerName }),
            ),
          );
        if (lobbyName !== "Lobby")
          url.searchParams.set("lname", encodeURIComponent(lobbyName));
        setSessionUrl(url.toString());
        // Update browser URL without reload
        window.history.pushState({}, "", url.toString());
      }
    } catch (error) {
      console.error("Failed to create lobby:", error);
    } finally {
      setIsCreatingLobby(false);
    }
  };

  const handleJoinSession = async () => {

    if (!isConnected) {
      console.warn("Wallet not connected");
      return;
    }
    if (activeSessionId === null) {
      console.warn("No active session ID found");
      return;
    }


    try {
      const tx = await joinSession(activeSessionId);

      if (playerName && address) {
        const myName = { [address.toLowerCase()]: playerName };
        setPlayerNamesMap((prev) => ({ ...prev, ...myName }));
        // Broadcast name to everyone in lobby
        supabase.channel(`lobby-${activeSessionId}`).send({
          type: "broadcast",
          event: "name_sync",
          payload: myName,
        });
      }

      // Wait for it to mine
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Force a participant refetch
      refetchParticipants();
    } catch (error) {
      console.error("Failed to join session. Error details:", error);
    }
  };

  const handleSpin = async () => {
    if (activeSessionId === null || isVisualSpinning) return;

    try {

      const tx = await lockAndSelectPayer(activeSessionId);
      
      setIsVisualSpinning(true); // Start visual spin ONLY after signing
      setMobileView('wheel'); // Switch to wheel on mobile
      supabase.channel(`lobby-${activeSessionId}`).send({ type: 'broadcast', event: 'spin_started' });

      // Wait for it to mine
      await new Promise((resolve) => setTimeout(resolve, 4000));

      refetchSessionDetails();
    } catch (error) {
      console.error("Failed to select payer. Error details:", error);
      setIsVisualSpinning(false); // Reset if error before mining
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(sessionUrl);
    toast.success("Lobby link copied!");
  };

  if (isPreloading) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0c] flex flex-col items-center justify-center z-50">
        <div className="relative w-32 h-32 mb-8">
          <img 
            src="/logo.png" 
            alt="WhoPays" 
            className="w-full h-full object-contain animate-pulse"
          />
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl animate-pulse rounded-full -z-10" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-black text-white tracking-widest uppercase">WhoPays</h2>
          <div className="w-48 h-1 bg-gray-900 rounded-full overflow-hidden">
            <div className="h-full bg-linear-to-r from-blue-600 to-purple-600 animate-[loading_2s_ease-in-out_infinite]" />
          </div>
          <p className="text-gray-500 text-xs font-bold mt-4 uppercase tracking-[0.2em]">The anxiety of the bill...</p>
        </div>
        <style jsx>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <main className={`min-h-screen flex flex-col items-center p-4 sm:p-8 w-full ${activeSessionId === null ? "justify-center" : ""}`}>
      <Toaster /> {/* Add Toaster component here */}
      <header className={`w-full max-w-5xl flex justify-between items-center mb-8 sm:mb-12 ${activeSessionId === null ? "fixed top-0 p-4 sm:p-8" : ""}`}>
        <a
          href="/"
          className="flex items-center gap-4 hover:opacity-90 transition-opacity cursor-pointer group"
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 relative">
            <img src="/logo.png" alt="WhoPays" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[-5deg]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">
            Who
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-purple-400">
              Pays
            </span>
          </h1>
        </a>
        <div className="flex items-center gap-3 sm:gap-4 relative">
          <div className="hidden sm:flex items-center gap-3 sm:gap-4">
            <a
              href="/analytics"
              className="text-xs font-black text-gray-400 hover:text-white transition-colors uppercase tracking-widest"
            >
              Stats
            </a>
            <a
              href="/profile"
              className="text-xs font-black text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-widest bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20"
            >
              Profile
            </a>
            {!isMiniPay && (
              <div className="connect-button-wrapper scale-90 sm:scale-100">
                <ConnectButton
                  showBalance={false}
                  accountStatus="address"
                  chainStatus="none"
                />
              </div>
            )}
          </div>
          
          {/* Mobile Hamburger Menu Toggle */}
          <button 
            className="sm:hidden p-2.5 text-gray-400 hover:text-white bg-white/5 rounded-xl border border-white/10 shadow-lg active:scale-95 transition-all"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* ── Sleek Mobile Full-Screen Menu Overlay ── */}
      <div 
        className={`fixed inset-0 z-[100] bg-[#0a0a0c]/95 backdrop-blur-2xl transition-all duration-500 sm:hidden flex flex-col pt-28 px-6 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <button 
          className="absolute top-6 right-6 p-3 text-gray-400 hover:text-white bg-white/5 rounded-full border border-white/10 shadow-lg active:scale-90 transition-all hover:rotate-90 duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <X size={24} />
        </button>

        <div className={`flex flex-col gap-6 w-full max-w-sm mx-auto transition-all duration-500 delay-100 ${isMobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="text-4xl drop-shadow-lg">💸</span>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-purple-200 tracking-tighter">
              WhoPays
            </h2>
          </div>

          <a
            href="/analytics"
            className="w-full text-center py-5 text-xl font-black text-gray-300 hover:text-white bg-white/5 rounded-2xl transition-all uppercase tracking-widest border border-white/10 active:scale-95 shadow-lg"
          >
            Stats & Leaderboard
          </a>
          <a
            href="/profile"
            className="w-full text-center py-5 text-xl font-black text-purple-400 hover:text-purple-300 bg-purple-500/10 rounded-2xl transition-all uppercase tracking-widest border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.2)] active:scale-95"
          >
            Your Profile
          </a>
          
          {!isMiniPay && (
            <div className="mt-10 flex justify-center transform scale-110">
              <ConnectButton
                showBalance={false}
                accountStatus="address"
                chainStatus="icon"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Sleek Navigation Tabs (Only shown when Lobby is active) ── */}
      {activeSessionId !== null && (
        <div className="w-[90%] max-w-[320px] sm:max-w-md mx-auto mb-10 bg-white/5 p-1.5 rounded-[2rem] flex border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl z-10 relative">
          <button 
            onClick={() => setActiveTab('lobby')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-[1.5rem] font-black text-[11px] sm:text-sm uppercase tracking-widest transition-all duration-300 ${activeTab === 'lobby' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-[1.02]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Lobby & Wheel
          </button>
          <button 
            onClick={() => setActiveTab('agent')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-[1.5rem] font-black text-[11px] sm:text-sm uppercase tracking-widest transition-all duration-300 ${activeTab === 'agent' ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] scale-[1.02]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Bot className="w-4 h-4" /> PayBot AI
          </button>
        </div>
      )}

      <div className={`w-full transition-all duration-500 flex flex-col items-center ${activeSessionId === null ? 'max-w-md' : 'max-w-5xl'}`}>
        
        {/* MOBILE LOBBY/WHEEL TOGGLE */}
        {activeSessionId !== null && activeTab === 'lobby' && (
          <div className="lg:hidden w-[90%] max-w-sm mx-auto mb-6 bg-white/5 p-1 rounded-2xl flex border border-white/10 shadow-lg">
             <button
                onClick={() => setMobileView('lobby')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${mobileView === 'lobby' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 hover:text-gray-300'}`}
             >
               <Users className="w-3.5 h-3.5" /> Chat & Squad
             </button>
             <button
                onClick={() => setMobileView('wheel')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${mobileView === 'wheel' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-500 hover:text-gray-300'}`}
             >
               <Zap className="w-3.5 h-3.5" /> The Wheel
             </button>
          </div>
        )}

        {/* LOBBY TAB CONTENT */}
        <div className={`w-full ${activeSessionId === null ? '' : (activeTab === 'lobby' ? 'grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 animate-in fade-in zoom-in-95 duration-500' : 'hidden')}`}>
          {/* On Mobile, toggle visibility based on mobileView state */}
          <div className={`${activeSessionId !== null ? `order-2 lg:order-1 ${mobileView === 'lobby' ? 'block' : 'hidden lg:block'}` : ''} space-y-6 w-full`}>
            {/* Left Column Content */}
          {/* Create Lobby Card (Hidden if already in a session) */}
          {activeSessionId === null ? (
            <div className="glass-card p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] w-full max-w-lg mx-auto shadow-2xl transition-all duration-300 hover:shadow-[0_0_50px_rgba(139,92,246,0.15)]">
              <h2 className="text-2xl font-black mb-8 flex items-center gap-4 text-white uppercase tracking-tight">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-400/20 to-blue-500/20 flex items-center justify-center border border-white/5 shadow-inner">
                  <CreditCard className="w-5 h-5 text-green-400" />
                </div>
                New Lobby
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
                    Player Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter display name"
                    className="w-full glass-input px-5 py-3 rounded-2xl outline-none text-white font-bold placeholder:text-gray-600"
                    value={playerName}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      if (address) {
                        setPlayerNamesMap((prev) => ({
                          ...prev,
                          [address.toLowerCase()]: e.target.value,
                        }));
                      }
                    }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      className="w-full glass-input px-5 py-3 rounded-2xl outline-none text-white font-bold"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
                      Currency
                    </label>
                    <div className="flex glass-input p-1 rounded-2xl">
                       <button 
                        onClick={() => setPaymentToken("CELO")}
                        className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${paymentToken === "CELO" ? "bg-white text-black" : "text-gray-400"}`}
                       >CELO</button>
                       <button 
                        onClick={() => setPaymentToken("USDC")}
                        className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${paymentToken === "USDC" ? "bg-white text-black" : "text-gray-400"}`}
                       >USDC</button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
                    Merchant (Address or ENS)
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    className="w-full glass-input px-5 py-3 rounded-2xl outline-none text-white font-bold placeholder:text-gray-600"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleCreateLobby}
                  disabled={
                    !isConnected ||
                    !merchant ||
                    isCreatingLobby ||
                    createLobbyPending
                  }
                  className="w-full group relative overflow-hidden flex items-center justify-center gap-3 px-6 py-4 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-2xl disabled:opacity-50 transition-all font-black uppercase tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isCreatingLobby || createLobbyPending ? (
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Zap className="w-5 h-5" />
                  )}
                  Create Lobby
                </button>
              </div>
            </div>
          ) : (
            /* Lobby Active Card */
            <div className="glass-card p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border-blue-500/30 shadow-[0_0_60px_rgba(59,130,246,0.15)] transition-all duration-300">
              <div className="flex justify-between items-center mb-10">
                {isEditingLobbyName && isHost ? (
                  <input
                    type="text"
                    value={lobbyName}
                    onChange={(e) => {
                       setLobbyName(e.target.value);
                       const name = e.target.value;
                       setTimeout(async () => {
                          if (activeSessionId !== null && isHost) {
                             await supabase.from("lobbies").update({ name }).eq("id", activeSessionId);
                          }
                       }, 500);
                    }}
                    onBlur={() => setIsEditingLobbyName(false)}
                    autoFocus
                    className="bg-transparent text-2xl text-white font-black border-b-2 border-blue-500 outline-none w-full mr-4"
                  />
                ) : (
                  <h2
                    className={`text-2xl font-black flex items-center gap-3 text-white ${isHost ? "cursor-pointer hover:text-blue-400 group" : ""}`}
                    onClick={() => {
                      if (isHost) setIsEditingLobbyName(true);
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    {lobbyName}
                  </h2>
                )}
                {sessionIsLocked && (
                  <span className="px-4 py-1 bg-red-500 text-white text-[10px] font-black rounded-lg uppercase tracking-widest animate-pulse">
                    Locked
                  </span>
                )}
              </div>

              {!hasJoined && !sessionIsLocked && (
                <div className="mb-6 space-y-4">
                  <input
                    type="text"
                    placeholder="Your Name (e.g. Alice)"
                    className="w-full glass-input px-5 py-3 rounded-2xl outline-none text-white font-bold placeholder:text-gray-600 shadow-inner"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                  <button
                    onClick={handleJoinSession}
                    disabled={!isConnected || joinSessionPending}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(59,130,246,0.2)]"
                  >
                    {joinSessionPending ? (
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <LogIn className="w-5 h-5" />
                    )}
                    Join Session
                  </button>
                </div>
              )}

              {isHost && !sessionIsLocked && (
                <div className="mb-6 flex flex-col items-center">
                  <button 
                    onClick={() => setShowInvite(!showInvite)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-blue-400 uppercase tracking-widest hover:bg-white/10 transition-all mb-4"
                  >
                    <LinkIcon className="w-3 h-3" /> {showInvite ? 'Hide Invite' : 'Invite Squad'}
                  </button>
                  
                  {showInvite && (
                    <div className="flex flex-col items-center p-6 bg-white/5 rounded-[1.5rem] border border-white/10 animate-in fade-in zoom-in duration-300 w-full">
                      <div className="bg-white p-4 rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)] mb-4">
                        <QRCodeSVG value={sessionUrl} size={140} fgColor="#000" />
                      </div>
                      <button
                        onClick={copyLink}
                        className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-white transition-colors"
                      >
                        Copy Share Link
                      </button>
                    </div>
                  )}
                </div>
              )}

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                       Players ({participantsList.length})
                    </h3>
                  </div>

                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {participantsList.map((p, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                          p.toLowerCase() === address?.toLowerCase() 
                            ? "bg-blue-600/20 border-blue-500/30 ring-1 ring-blue-500/20" 
                            : "bg-white/5 border border-white/5"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-lg">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-white truncate">
                            {playerNamesMap[p.toLowerCase()] || `${p.slice(0, 6)}...`}
                          </p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            {i === 0 ? "Host" : p.toLowerCase() === address?.toLowerCase() ? "You" : "Player"}
                          </p>
                        </div>
                      </div>
                    ))}
                    {participantsList.length === 0 && (
                      <div className="text-center py-8 opacity-20">
                         <Users className="w-12 h-12 mx-auto mb-2" />
                         <p className="text-xs font-black uppercase tracking-widest">Waiting for squad...</p>
                      </div>
                    )}
                  </div>

                  {/* Glass Chat UI */}
                  <div className="mt-6 bg-black/40 rounded-2.5xl p-4 border border-white/5">
                    <div className="h-28 overflow-y-auto mb-3 space-y-2 pr-2 custom-scrollbar">
                      {messages.map((m, i) => (
                        <div key={i} className="text-[11px] leading-relaxed">
                          <span className="font-black text-blue-400 uppercase tracking-tighter mr-2">
                            {m.user}
                          </span>
                          <span className="text-gray-300">{m.text}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Trash talk..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-blue-500/50 transition-all font-bold"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                      />
                      <button
                        onClick={sendChatMessage}
                        className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-500 transition-colors shadow-lg"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </div>
            </div>
          )}

          {/* Add Badge Display for the connected user ONLY if they just paid */}
          {showBadgeAfterPayment && (
            <div className="flex flex-col items-center animate-in zoom-in duration-500">
              <BadgeDisplay address={address} />
            </div>
          )}
          </div> {/* <--- THIS CLOSES THE LEFT COLUMN CONTENT */}
          
          {/* Right Column: The Spinner (Hidden on mobile if mobileView is not wheel) */}
          {activeSessionId !== null && (
            <section className={`order-1 lg:order-2 flex flex-col items-center justify-center space-y-6 sm:space-y-8 relative py-4 ${mobileView === 'wheel' ? 'flex' : 'hidden lg:flex'}`}>
              {/* Reaction Overlay */}
              <div className="absolute inset-0 pointer-events-none z-50">
                {recentReactions.map((r) => (
                  <div
                    key={r.id}
                    className="absolute left-1/2 top-1/2 animate-bounce-up text-4xl"
                  >
                    {r.emoji}
                  </div>
                ))}
              </div>

              <Spinner
                participants={participantsList.map((p) => ({
                  address: p,
                  name: playerNamesMap[p.toLowerCase()] || `${p.slice(0, 6)}...`,
                }))}
                onFinish={(winnerAddress) => {
                  setIsVisualSpinning(false);
                  supabase.channel(`lobby-${activeSessionId}`).send({ type: 'broadcast', event: 'spin_ended' });
                }}
                isSpinning={isVisualSpinning}
                targetWinnerAddress={winner}
              />

              {/* Show spin button if Host and session not locked/completed */}
              {isHost &&
                activeSessionId !== null &&
                !sessionIsLocked &&
                !sessionCompleted && (
                  <button
                    onClick={handleSpin}
                    disabled={
                      participantsList.length < 2 ||
                      lockAndSelectPayerPending ||
                      isVisualSpinning
                    }
                    className="px-10 py-4 bg-red-600 text-white rounded-full font-black text-xl hover:bg-red-700 disabled:bg-gray-400 transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_30px_rgba(220,38,38,0.8)] disabled:shadow-none hover:scale-105"
                  >
                    {lockAndSelectPayerPending || isVisualSpinning
                      ? "SPINNING..."
                      : "SPIN THE WHEEL!"}
                  </button>
                )}

              {/* Show waiting message if not host and session not locked/completed */}
              {!isHost &&
                activeSessionId !== null &&
                !sessionIsLocked &&
                !sessionCompleted &&
                participantsList.length >= 2 && (
                  <p className="text-gray-500 font-medium animate-pulse">
                    Waiting for host to spin...
                  </p>
                )}

              {/* Show results if winner is selected and visual spin has completed */}
              {(winner || sessionCompleted) && !isVisualSpinning && activeSessionId !== null && (
                <div
                  id="result-modal"
                  className={`glass-card text-center p-8 rounded-[2.5rem] w-full max-w-sm border-2 ${
                    winner?.toLowerCase() === address?.toLowerCase()
                      ? "border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
                      : "border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.2)]"
                  }`}
                >
                  {winner?.toLowerCase() === address?.toLowerCase() ? (
                    <>
                      <h3 className="text-red-400 font-black text-3xl mb-4 tracking-tighter">
                        {sessionCompleted ? "TAB SETTLED" : "YOU'RE IT!"}
                      </h3>
                      <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Zap className="w-10 h-10 text-red-500" />
                      </div>
                      <p className="text-gray-300 font-bold mb-8 leading-relaxed">
                        {sessionCompleted
                          ? "Your contribution has been recorded. Respect! 🫡"
                          : "The wheel has spoken. It's your turn to be the hero of the group."}
                      </p>
                      {isConnected && !sessionCompleted && (
                        <div className="space-y-4">
                          <button
                            onClick={async () => {
                              if (!sessionDetails || activeSessionId === null)
                                return;
                              try {
                                const amountInUnits = (sessionDetails as any)[0];
                                const amountInCelo = formatEther(amountInUnits);
                                
                                let tx;
                                if (paymentToken === "CELO") {
                                   tx = await completePayment(activeSessionId, amountInCelo);
                                } else {
                                   tx = await completePaymentWithToken(activeSessionId, USDC_ADDRESS);
                                }

                                setTxHash(tx);
                                setShowBadgeAfterPayment(true);
                                setTimeout(() => refetchSessionDetails(), 5000);

                                supabase.channel(`lobby-${activeSessionId}`).send({
                                  type: "broadcast",
                                  event: "payment_completed",
                                  payload: {
                                    payer: address,
                                    amount: amountInCelo,
                                    token: paymentToken,
                                    name: playerNamesMap[address!.toLowerCase()] || address,
                                  },
                                });
                              } catch (e) {
                                 console.error("Payment failed:", e);
                                 toast.error("Payment failed. Make sure you have enough funds!");
                              }
                            }}
                            disabled={completePaymentPending || completePaymentWithTokenPending}
                            className="w-full py-5 bg-linear-to-r from-red-600 to-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                          >
                            {completePaymentPending || completePaymentWithTokenPending ? (
                              "Processing..."
                            ) : (
                              `Settle ${amount} ${paymentToken}`
                            )}
                          </button>
                          {txHash && (
                            <a 
                              href={`https://celoscan.io/tx/${txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-[10px] font-bold text-blue-400 hover:underline uppercase tracking-widest mt-2"
                            >
                              View Real Transaction on Explorer ↗
                            </a>
                          )}
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">
                             MiniPay Fee: Sub-Cent
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-green-400 font-black text-3xl mb-4 tracking-tighter uppercase italic">
                        {sessionCompleted ? "SETTLED" : "SAFE!"}
                      </h3>
                      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Smile className="w-10 h-10 text-green-500" />
                      </div>
                      <p className="text-gray-300 font-bold mb-8">
                        <span className="text-white px-2 py-1 rounded bg-white/5 border border-white/10">
                          {winner
                            ? playerNamesMap[winner.toLowerCase()] ||
                              `${winner.slice(0, 6)}...`
                            : "Unknown"}
                        </span>{" "}
                        {sessionCompleted
                          ? "has paid the bill. Legend."
                          : "is footing the bill today!"}
                      </p>
                      <div className="flex gap-4 justify-center">
                        {["🤡", "😂", "🔥", "💸"].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => sendReaction(emoji)}
                            className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 hover:scale-110 active:scale-95 transition-all text-xl"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          )}
        </div> {/* <--- THIS CLOSES THE GRID CONTAINER (LOBBY TAB CONTENT) */}

        {/* AGENT TAB CONTENT */}
        {activeSessionId !== null && (
          <div className={`w-full max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 ${activeTab === 'agent' ? 'block' : 'hidden'}`}>
            <SelfVerifyBadge verified={false} compact={false} />
            <AgentPanel
              participants={participantsList}
              sessionId={activeSessionId}
              amount={amount}
              playerNamesMap={playerNamesMap}
            />
          </div>
        )}
      </div> {/* <--- THIS CLOSES THE MAIN CONTENT WRAPPER */}
    </main>
  );
}
