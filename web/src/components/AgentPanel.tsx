"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Sparkles, Send, BarChart2, Loader2, CheckCircle2, ExternalLink } from "lucide-react";

interface PayBotProps {
  participants: string[];
  sessionId: number | null;
  amount: string;
  playerNamesMap: Record<string, string>;
}

interface Message {
  role: "bot" | "user";
  text: string;
  timestamp: Date;
}

interface AnalysisResult {
  insights: string[];
  fairnessIndex: number;
  leastPayer: string;
  mostPayer: string;
  profiles: Array<{
    address: string;
    sessionsPaid: number;
    totalPaid: string;
    rarity: string;
    isNewcomer: boolean;
  }>;
  payBotSummary: string;
}

// Celo Mainnet ERC-8004 agent endpoint
const AGENT_ENDPOINT = "/api/agent";
const AI_ADVISOR_ENDPOINT = "/api/ai-advisor";

export function AgentPanel({ participants, sessionId, amount, playerNamesMap }: PayBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "👋 Hey! I'm **PayBot** — WhoPays's AI agent. I'm registered on-chain via ERC-8004 and verified by Self Protocol. Ask me anything, or hit **AI Analysis** to see who's been dodging the bill!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { role: "user", text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(AI_ADVISOR_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "chat",
          userMessage: text,
          sessionContext: {
            participantCount: participants.length,
            amount,
            sessionId,
          },
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: data.response || "PayBot is thinking... 🤔",
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "⚠️ PayBot is temporarily offline. The on-chain data is still accurate!",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (participants.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "🔍 No participants yet! Create or join a lobby first, then I'll analyze everyone's on-chain history.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    setIsAnalyzing(true);
    setShowAnalysis(false);

    try {
      const res = await fetch(AI_ADVISOR_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "group-analysis", participants }),
      });

      const data = await res.json();

      if (data.success) {
        setAnalysis(data);
        setShowAnalysis(true);

        // Also get agent recommendation
        const agentRes = await fetch(AGENT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "recommend-payer",
            params: { participants, sessionId },
          }),
        });
        const agentData = await agentRes.json();

        const recommendedAddr = agentData?.recommendation?.address;
        const displayName = recommendedAddr
          ? playerNamesMap[recommendedAddr.toLowerCase()] ||
            `${recommendedAddr.slice(0, 6)}...${recommendedAddr.slice(-4)}`
          : "Unknown";

        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text:
              `📊 **Analysis complete!** ${data.payBotSummary}\n\n` +
              `🎯 My recommendation: **${displayName}** based on payment fairness.\n\n` +
              `⚖️ Group Fairness Score: **${data.fairnessIndex}/100**\n\n` +
              (agentData?.reasoning || ""),
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "⚠️ Could not fetch on-chain data right now. Celo Mainnet might be slow — try again in a moment!",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatMessage = (text: string) => {
    // Simple markdown bold
    return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-bold text-purple-300">
          {part}
        </strong>
      ) : (
        part
      )
    );
  };

  const getFairnessColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "Diamond": return "text-cyan-300";
      case "Gold": return "text-yellow-400";
      case "Silver": return "text-gray-300";
      case "Bronze": return "text-orange-400";
      default: return "text-gray-500";
    }
  };

  return (
    <div className="paybot-panel w-full rounded-2xl overflow-hidden border border-purple-500/30 bg-gradient-to-b from-gray-900 via-purple-950/20 to-gray-900 shadow-2xl shadow-purple-900/20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-900/60 to-blue-900/40 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-gray-900 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">PayBot</p>
            <p className="text-xs text-purple-300/70 leading-none mt-0.5">AI Agent • ERC-8004 • Self Verified</p>
          </div>
        </div>

        {/* Verified badges */}
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            ERC-8004
          </span>
          <a
            href="https://8004scan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            8004scan
          </a>
        </div>
      </div>

      {/* Analysis Results Panel */}
      {showAnalysis && analysis && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-purple-900/20 border border-purple-500/20">
          {/* Fairness Score */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Group Fairness Score</span>
            <span className={`text-2xl font-black ${getFairnessColor(analysis.fairnessIndex)}`}>
              {analysis.fairnessIndex}<span className="text-sm text-gray-500 font-normal">/100</span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-gray-800 rounded-full mb-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                analysis.fairnessIndex >= 80
                  ? "bg-emerald-400"
                  : analysis.fairnessIndex >= 50
                  ? "bg-yellow-400"
                  : "bg-red-400"
              }`}
              style={{ width: `${analysis.fairnessIndex}%` }}
            />
          </div>

          {/* Insights */}
          <div className="space-y-1.5 mb-3">
            {analysis.insights.slice(0, 3).map((insight, i) => (
              <p key={i} className="text-xs text-gray-300 leading-relaxed">
                {formatMessage(insight)}
              </p>
            ))}
          </div>

          {/* Participant profiles */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1.5">
              On-Chain Profiles
            </p>
            {analysis.profiles.map((p) => {
              const displayName =
                playerNamesMap[p.address.toLowerCase()] ||
                `${p.address.slice(0, 6)}...${p.address.slice(-4)}`;
              return (
                <div
                  key={p.address}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-gray-800/40"
                >
                  <span className="text-xs font-medium text-gray-300">{displayName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{p.sessionsPaid} paid</span>
                    <span className={`text-xs font-bold ${getRarityColor(p.rarity)}`}>
                      {p.isNewcomer ? "New" : p.rarity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="h-48 overflow-y-auto p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-purple-700/40">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "bot" && (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mr-1.5 mt-0.5 flex-shrink-0">
                <Bot className="w-2.5 h-2.5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-purple-600 text-white rounded-br-sm"
                  : "bg-gray-800/80 text-gray-200 rounded-bl-sm border border-gray-700/40"
              }`}
            >
              {formatMessage(msg.text)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mr-1.5 flex-shrink-0">
              <Bot className="w-2.5 h-2.5 text-white" />
            </div>
            <div className="bg-gray-800/80 border border-gray-700/40 px-3 py-2 rounded-xl rounded-bl-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Buttons */}
      <div className="px-3 pb-2 flex gap-2">
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-900/40"
        >
          {isAnalyzing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <BarChart2 className="w-3 h-3" />
          )}
          {isAnalyzing ? "Analyzing..." : "AI Analysis"}
        </button>
        <button
          onClick={() => sendMessage("who should pay?")}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-3 h-3 text-yellow-400" />
          Who Pays?
        </button>
      </div>

      {/* Input */}
      <div className="px-3 pb-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask PayBot anything..."
          className="flex-1 bg-gray-800/60 border border-gray-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-purple-500/60 focus:bg-gray-800 transition-all"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white hover:bg-purple-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
