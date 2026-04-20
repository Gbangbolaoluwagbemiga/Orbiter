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
} from "lucide-react";
import { useAccount, useReadContract, useBalance } from "wagmi";
import { formatUnits, formatEther } from "viem";
import { usePayeerContract } from "@/hooks/usePayeerContract";
import { QRCodeSVG } from "qrcode.react";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { supabase } from "@/utils/supabase";
import { Send, Smile } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
export default function HomeContent() {
  const [winner, setWinner] = useState<string | null>(null);
  const [amount, setAmount] = useState("0.01");
  const [merchant, setMerchant] = useState("");
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);
  const [isVisualSpinning, setIsVisualSpinning] = useState(false);
  const [showBadgeAfterPayment, setShowBadgeAfterPayment] = useState(false);

  // Custom Names state (Stored locally and pulled from URL for the host)
  const [playerName, setPlayerName] = useState("");
  const [playerNamesMap, setPlayerNamesMap] = useState<Record<string, string>>(
    {},
  );
  const [lobbyName, setLobbyName] = useState("Lobby");
  const [isEditingLobbyName, setIsEditingLobbyName] = useState(false);

  const { isConnected, address, chain } = useAccount();
  const { data: balanceData } = useBalance({ address });

  useEffect(() => {
    if (isConnected && address) {
      console.log("--- WAGMI WALLET CONNECTION ---");
      console.log("Address:", address);
      console.log("Chain:", chain?.name, "ID:", chain?.id);
      if (balanceData) {
        console.log(
          "Balance:",
          formatUnits(balanceData.value, balanceData.decimals),
          balanceData.symbol,
        );
      } else {
        console.log("Balance Data is empty or loading.");
      }
      console.log("-------------------------------");
    }
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
    completePaymentPending,
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

  console.log("Current Session Details:", sessionDetails);
  console.log("sessionIsLocked:", sessionIsLocked);

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
      console.log("Setting winner from contract state:", sessionWinner);
      setWinner(sessionWinner);
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
          console.log("DB Update received:", payload.new);
          if (payload.new.name) setLobbyName(payload.new.name);
          if (payload.new.player_names)
            setPlayerNamesMap(payload.new.player_names);
        },
      )
      .on("broadcast", { event: "name_sync" }, (payload) => {
        // Still use broadcast for immediate UI feel
        setPlayerNamesMap((prev) => ({ ...prev, ...payload.payload }));
      })
      .on("broadcast", { event: "lobby_sync" }, (payload) => {
        setLobbyName(payload.payload.name);
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

  // Sync names to others when mine changes
  useEffect(() => {
    if (activeSessionId !== null && address && playerName) {
      const myName = { [address.toLowerCase()]: playerName };

      // Broadcast for immediate feedback
      supabase.channel(`lobby-${activeSessionId}`).send({
        type: "broadcast",
        event: "name_sync",
        payload: myName,
      });

      // Update DB
      const updateMyNameInDB = async () => {
        // Use a RPC or a careful update to merge jsonb
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
        console.log("JOIN LOBBY DETECTED:", id);
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
      console.log("Transaction hash:", tx);

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
    console.log(
      "Join button clicked. isConnected:",
      isConnected,
      "activeSessionId:",
      activeSessionId,
    );

    if (!isConnected) {
      console.warn("Wallet not connected");
      return;
    }
    if (activeSessionId === null) {
      console.warn("No active session ID found");
      return;
    }

    console.log(
      "Executing join session transaction for session",
      activeSessionId,
    );

    try {
      const tx = await joinSession(activeSessionId);
      console.log("Join session transaction sent. TX Hash:", tx);

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
      console.log("Refetching participants list...");
      refetchParticipants();
    } catch (error) {
      console.error("Failed to join session. Error details:", error);
    }
  };

  const handleSpin = async () => {
    if (activeSessionId === null || isVisualSpinning) return;

    console.log("SPIN THE WHEEL CLICKED. Active Session:", activeSessionId);
    console.log(
      "Current lockAndSelectPayerPending status:",
      lockAndSelectPayerPending,
    );

    setIsVisualSpinning(true); // Start visual spin
    supabase.channel(`lobby-${activeSessionId}`).send({ type: 'broadcast', event: 'spin_started' });

    try {
      console.log(
        "Triggering lockAndSelectPayer for session:",
        activeSessionId,
      );
      const tx = await lockAndSelectPayer(activeSessionId);
      console.log("lockAndSelectPayer transaction sent:", tx);

      // Wait for it to mine
      await new Promise((resolve) => setTimeout(resolve, 4000));

      console.log("Refetching session details...");
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

  return (
    <main className="flex-1 flex flex-col items-center p-8 max-w-4xl mx-auto w-full">
      <Toaster /> {/* Add Toaster component here */}
      <header className="w-full flex justify-between items-center mb-12">
        <a
          href="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="w-12 h-12 bg-linear-to-tr from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-[0_4px_10px_rgba(251,191,36,0.4)] rotate-3">
            <span className="text-2xl drop-shadow-md">💸</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 drop-shadow-sm">
            Who
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-purple-600">
              Pays
            </span>
          </h1>
        </a>
        <div className="flex items-center gap-4">
          <a
            href="/analytics"
            className="hidden sm:block text-sm font-bold text-gray-500 hover:text-purple-600 transition-colors"
          >
            Leaderboard
          </a>
          <ConnectButton
            showBalance={false}
            accountStatus="address"
            chainStatus="icon"
          />
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full">
        {/* Left Column: Lobby Setup or Joined Status */}
        <section className="space-y-6">
          {/* Create Lobby Card (Hidden if already in a session) */}
          {activeSessionId === null ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
                <CreditCard className="w-5 h-5 text-green-500" />
                Create a Lobby
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your display name"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-black font-medium"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bill Amount (CELO)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-black font-medium"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Merchant Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-black font-medium"
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
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors font-medium"
                >
                  {isCreatingLobby || createLobbyPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Create Lobby
                </button>
              </div>
            </div>
          ) : (
            /* Lobby Active Card */
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200 ring-2 ring-purple-50">
              <div className="flex justify-between items-center mb-6">
                {isEditingLobbyName && isHost ? (
                  <input
                    type="text"
                    value={lobbyName}
                    onChange={(e) => setLobbyName(e.target.value)}
                    onBlur={() => setIsEditingLobbyName(false)}
                    autoFocus
                    className="bg-purple-50 text-xl text-purple-900 font-bold border-b-2 border-purple-500 outline-none w-48"
                  />
                ) : (
                  <h2
                    className={`text-xl font-bold flex items-center gap-2 text-purple-900 ${isHost ? "cursor-pointer hover:opacity-80" : ""}`}
                    onClick={() => {
                      if (isHost) setIsEditingLobbyName(true);
                    }}
                    title={isHost ? "Click to edit" : ""}
                  >
                    <Users className="w-6 h-6 text-purple-500" />
                    {lobbyName}
                  </h2>
                )}
                {sessionIsLocked && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full uppercase">
                    Locked
                  </span>
                )}
              </div>

              {!hasJoined && !sessionIsLocked && (
                <div className="mb-6 space-y-3">
                  <input
                    type="text"
                    placeholder="Enter your name (e.g. Alice)"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-black font-bold outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                  <button
                    onClick={handleJoinSession}
                    disabled={!isConnected || joinSessionPending}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 transition-all font-bold text-lg shadow-md"
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
                <div className="mb-6 flex flex-col items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-600 mb-3 text-center">
                    Have your friends scan this to join:
                  </p>
                  <div className="bg-white p-3 rounded-xl shadow-sm mb-3">
                    <QRCodeSVG value={sessionUrl} size={150} />
                  </div>
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-800"
                  >
                    <LinkIcon className="w-4 h-4" /> Copy Share Link
                  </button>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                  Players ({participantsList.length})
                </h3>
                {/* Chat UI */}
                <div className="mb-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="h-32 overflow-y-auto mb-2 space-y-1 text-xs">
                    {messages.map((m, i) => (
                      <div key={i} className="wrap-break-word">
                        <span className="font-bold text-purple-600">
                          {m.user}:{" "}
                        </span>
                        <span className="text-gray-700">{m.text}</span>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <p className="text-gray-400 italic">No messages yet...</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Trash talk..."
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-black outline-none font-medium"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                    />
                    <button
                      onClick={sendChatMessage}
                      className="p-1 bg-purple-600 text-white rounded-lg"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {participantsList.map((p, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${p.toLowerCase() === address?.toLowerCase() ? "bg-blue-50 border-blue-200" : "bg-white border-gray-100 shadow-sm"}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-inner">
                        {i + 1}
                      </div>
                      <span className="font-mono text-sm text-gray-700">
                        {playerNamesMap[p.toLowerCase()] ||
                          `${p.slice(0, 6)}...${p.slice(-4)}`}
                        {p.toLowerCase() === address?.toLowerCase() && (
                          <span className="ml-2 text-blue-600 text-xs font-bold">
                            (You)
                          </span>
                        )}
                        {i === 0 && (
                          <span className="ml-2 text-purple-600 text-xs font-bold">
                            (Host)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                  {participantsList.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-4 italic">
                      Waiting for players...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Add Badge Display for the connected user */}
          {showBadgeAfterPayment && (
            <div className="flex flex-col items-center">
              <button
                onClick={() => setShowBadgeAfterPayment(false)}
                className="mb-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Hide Badge
              </button>
              <BadgeDisplay address={address} />
            </div>
          )}
          {!showBadgeAfterPayment && address && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setShowBadgeAfterPayment(true)}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
              >
                Show Your Honor Badge
              </button>
            </div>
          )}
        </section>

        {/* Right Column: The Spinner */}
        <section className="flex flex-col items-center justify-center space-y-8 relative">
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
            participants={participantsList.map(
              (p) => playerNamesMap[p.toLowerCase()] || `${p.slice(0, 6)}...`,
            )}
            onFinish={() => {
              setIsVisualSpinning(false);
              supabase.channel(`lobby-${activeSessionId}`).send({ type: 'broadcast', event: 'spin_ended' });
            }}
            isSpinning={isVisualSpinning}
            targetWinner={winner}
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

          {/* Show results if winner is selected or session is completed */}
          {(winner || sessionCompleted) && activeSessionId !== null && (
            <div
              className={`text-center p-8 border-2 rounded-2xl shadow-xl w-full max-w-sm ${
                winner?.toLowerCase() === address?.toLowerCase()
                  ? "bg-red-50 border-red-200 animate-bounce"
                  : "bg-green-50 border-green-200"
              }`}
            >
              {winner?.toLowerCase() === address?.toLowerCase() ? (
                <>
                  <h3 className="text-red-800 font-black text-3xl mb-2">
                    {sessionCompleted ? "TAB SETTLED! ✅" : "HEY CHOSEN! 🎯"}
                  </h3>
                  <p className="text-red-700 font-medium mb-6">
                    {sessionCompleted
                      ? "The bill has been paid and your badge has been updated!"
                      : "You won the privilege to pay the bill!"}
                  </p>
                  {isConnected && !sessionCompleted && (
                    <div className="space-y-3">
                      <button
                        onClick={async () => {
                          if (!sessionDetails || activeSessionId === null)
                            return;
                          try {
                            const amountInCelo = formatEther(
                              (sessionDetails as any)[0],
                            );
                            console.log(
                              "Attempting to complete payment. Session:",
                              activeSessionId,
                              "Amount:",
                              amountInCelo,
                            );
                            const tx = await completePayment(
                              activeSessionId,
                              amountInCelo,
                            );
                            console.log("Payment sent! Hash:", tx);
                            setShowBadgeAfterPayment(true); // Show badge after successful payment
                            setTimeout(() => refetchSessionDetails(), 5000);

                            // Notify other players via Supabase broadcast
                            supabase.channel(`lobby-${activeSessionId}`).send({
                              type: "broadcast",
                              event: "payment_completed",
                              payload: {
                                payer: address,
                                amount: amountInCelo,
                                name:
                                  playerNamesMap[address!.toLowerCase()] ||
                                  address,
                              },
                            });
                          } catch (e) {
                            console.error("Failed to pay:", e);
                          }
                        }}
                        disabled={completePaymentPending}
                        className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 disabled:bg-gray-400 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                      >
                        {completePaymentPending ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                            Processing...
                          </div>
                        ) : (
                          "Pay Bill & Claim Badge On-Chain"
                        )}
                      </button>
                    </div>
                  )}
                  {sessionCompleted && (
                    <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-xl font-bold border border-green-200">
                      Transaction Confirmed! 🚀
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-green-800 font-black text-2xl mb-2">
                    {sessionCompleted ? "TAB SETTLED! 🥂" : "YOU SURVIVED! 🎉"}
                  </h3>
                  <p className="text-green-700 font-medium">
                    <span className="font-mono bg-white px-2 py-1 rounded">
                      {winner
                        ? playerNamesMap[winner.toLowerCase()] ||
                          `${winner.slice(0, 6)}...${winner.slice(-4)}`
                        : "Unknown Payer"}
                    </span>{" "}
                    {sessionCompleted
                      ? "has paid the bill!"
                      : "is paying the bill!"}
                  </p>
                  <div className="mt-4 flex gap-2 justify-center">
                    {["💀", "🤡", "😂", "🔥", "💸"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => sendReaction(emoji)}
                        className="text-2xl hover:scale-125 transition-transform"
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
      </div>
    </main>
  );
}
