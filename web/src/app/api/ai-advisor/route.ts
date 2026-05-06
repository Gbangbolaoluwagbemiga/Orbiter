/**
 * WhoPays AI Advisor API
 * Provides AI-powered recommendations and session intelligence.
 * Powered by Google Gemini (via AI SDK) with on-chain data context.
 */

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi, formatEther } from "viem";
import { celo } from "viem/chains";

const PAYEER_CONTRACT = "0x5fA80497E70506E3CB8a2e32b838782aF31E005A";
const BADGE_CONTRACT  = "0x956D4eeF22377d83D5cc31E0951a4591F08aECEC";

const BADGE_ABI = parseAbi([
  "function getBadge(address user) view returns (uint256 totalPaid, uint256 sessionsPaid, uint256 lastPaidAt, string rarity)",
  "function userBadges(address user) view returns (uint256)",
]);

const publicClient = createPublicClient({
  chain: celo,
  transport: http("https://forno.celo.org"),
});

// ── POST /api/ai-advisor ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { type, participants, userMessage, sessionContext } = await req.json();

    switch (type) {
      // ── On-chain analysis advice ──────────────────────────────────────────
      case "group-analysis": {
        if (!participants || participants.length === 0) {
          return NextResponse.json({ error: "No participants provided" }, { status: 400 });
        }

        // Fetch on-chain badge data for all participants in parallel
        const profileData = await Promise.all(
          participants.map(async (addr: string) => {
            try {
              const tokenId = await publicClient.readContract({
                address: BADGE_CONTRACT as `0x${string}`,
                abi: BADGE_ABI,
                functionName: "userBadges",
                args: [addr as `0x${string}`],
              });

              if (!tokenId || tokenId === BigInt(0)) {
                return { address: addr, sessionsPaid: 0, totalPaid: "0", rarity: "None", isNewcomer: true };
              }

              const badge = await publicClient.readContract({
                address: BADGE_CONTRACT as `0x${string}`,
                abi: BADGE_ABI,
                functionName: "getBadge",
                args: [addr as `0x${string}`],
              });

              const [totalPaid, sessionsPaid, , rarity] = badge as [bigint, bigint, bigint, string];

              return {
                address: addr,
                sessionsPaid: Number(sessionsPaid),
                totalPaid: formatEther(totalPaid),
                rarity,
                isNewcomer: false,
              };
            } catch {
              return { address: addr, sessionsPaid: 0, totalPaid: "0", rarity: "None", isNewcomer: true };
            }
          })
        );

        // Build analysis without external LLM (deterministic + fast)
        const totalSessions = profileData.reduce((s, p) => s + p.sessionsPaid, 0);
        const sorted = [...profileData].sort((a, b) => a.sessionsPaid - b.sessionsPaid);
        const leastPayer = sorted[0];
        const mostPayer = sorted[sorted.length - 1];
        const newcomers = profileData.filter((p) => p.isNewcomer);

        const insights: string[] = [];

        if (totalSessions === 0) {
          insights.push("🆕 This is everyone's first rodeo! No payment history yet — totally fair draw.");
        } else {
          insights.push(
            `📊 Combined, this group has paid for **${totalSessions} sessions** on-chain.`
          );

          if (mostPayer.sessionsPaid > 0) {
            insights.push(
              `👑 **${mostPayer.address.slice(0, 6)}...${mostPayer.address.slice(-4)}** is the group's biggest payer with ${mostPayer.sessionsPaid} session(s) — they deserve a break!`
            );
          }

          if (leastPayer.sessionsPaid === 0 && !leastPayer.isNewcomer) {
            insights.push(
              `🎯 **${leastPayer.address.slice(0, 6)}...${leastPayer.address.slice(-4)}** has never paid before — statistically, it might be their turn!`
            );
          }

          if (newcomers.length > 0) {
            insights.push(
              `🌱 ${newcomers.length} newcomer(s) in this group with no payment history on WhoPays yet.`
            );
          }
        }

        // Calculate fairness index (0-100, higher = more balanced group history)
        const avgSessions = totalSessions / participants.length;
        const variance =
          profileData.reduce((s, p) => s + Math.pow(p.sessionsPaid - avgSessions, 2), 0) /
          participants.length;
        const fairnessIndex = Math.max(0, Math.round(100 - Math.sqrt(variance) * 20));

        return NextResponse.json({
          success: true,
          insights,
          fairnessIndex,
          leastPayer: leastPayer.address,
          mostPayer: mostPayer.address,
          profiles: profileData,
          payBotSummary: `PayBot analyzed ${participants.length} wallets on Celo Mainnet. Group fairness score: ${fairnessIndex}/100.`,
        });
      }

      // ── Natural language chat with PayBot ─────────────────────────────────
      case "chat": {
        if (!userMessage) {
          return NextResponse.json({ error: "No message provided" }, { status: 400 });
        }

        // Rule-based smart responses (no LLM needed — fast & free)
        const response = generatePayBotResponse(userMessage.toLowerCase(), sessionContext);

        return NextResponse.json({
          success: true,
          response,
          agentName: "PayBot",
        });
      }

      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[AI Advisor Error]", err);
    return NextResponse.json(
      { error: "AI advisor failed", message: err?.message },
      { status: 500 }
    );
  }
}

// ── PayBot Response Engine ────────────────────────────────────────────────────
function generatePayBotResponse(message: string, context?: any): string {
  const participantCount = context?.participantCount || 0;
  const amount = context?.amount || "0";

  if (message.includes("who should pay") || message.includes("who pays")) {
    return `🤖 Based on my on-chain analysis of everyone's payment history, I'll factor in how many times each wallet has paid before on WhoPays. Hit **"AI Analysis"** and I'll crunch the Celo Mainnet data right now!`;
  }

  if (message.includes("fair") || message.includes("fairness")) {
    return `⚖️ WhoPays uses Celo's on-chain randomness precompile — it's protocol-level VRF, completely tamper-proof. Even the host can't rig it. That's blockchain fairness! 🎲`;
  }

  if (message.includes("cusd") || message.includes("stablecoin")) {
    return `💵 cUSD is Celo Dollar — a stablecoin pegged to USD. Perfect for splitting bills since $1 always = $1. Way better than volatile CELO for splitting a dinner tab!`;
  }

  if (message.includes("badge") || message.includes("nft")) {
    return `🏅 WhoPays awards on-chain NFT badges to every payer! Bronze → Silver → Gold → Diamond based on your total payment history. They're non-transferable — a true mark of honor.`;
  }

  if (message.includes("how") && message.includes("work")) {
    return `🎮 Simple! 1️⃣ Create a lobby, set the bill amount. 2️⃣ Share the QR code or link with your group. 3️⃣ Everyone joins by connecting their wallet. 4️⃣ Spin the wheel — the smart contract picks ONE payer using tamper-proof randomness. 5️⃣ The lucky one pays! 💸`;
  }

  if (message.includes("hello") || message.includes("hi") || message.includes("hey")) {
    return `👋 Hey! I'm PayBot, your WhoPays AI assistant. I analyze on-chain data to tell you who's been dodging the bill and keep your sessions fair. Ask me anything about your group, or hit "AI Analysis" to see the full breakdown!`;
  }

  if (message.includes("help")) {
    return `🆘 Here's what I can do:\n• **AI Analysis** — analyze everyone's on-chain payment history\n• **Recommend payer** — suggest who should pay based on fairness\n• Answer questions about the session, badges, or how WhoPays works\n\nWhat do you need?`;
  }

  if (participantCount > 0 && (message.includes("session") || message.includes("lobby"))) {
    return `📊 Current session has **${participantCount} participants** for **${amount} CELO**. That's ${(parseFloat(amount) / participantCount).toFixed(4)} CELO per person if split evenly — but remember, only ONE person pays the full amount! 🎲`;
  }

  // Default fallback
  return `🤖 PayBot is here! I specialize in analyzing on-chain payment fairness on Celo. Try asking me "who should pay?", "how does it work?", or "is this fair?" — or hit **AI Analysis** to see real blockchain data for your group!`;
}
