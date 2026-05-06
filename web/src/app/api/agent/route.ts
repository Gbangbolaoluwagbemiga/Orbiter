/**
 * WhoPays PayBot — A2A Agent Endpoint (ERC-8004 Standard)
 * 
 * This is the Agent-to-Agent (A2A) communication endpoint for PayBot.
 * It exposes PayBot's capabilities in the standard A2A JSON format,
 * allowing other agents and the ERC-8004 ecosystem to discover and 
 * interact with WhoPays' AI agent.
 * 
 * POST /api/agent — Execute an agent action
 * GET  /api/agent — Return the Agent Card (capabilities manifest)
 */

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi, formatEther } from "viem";
import { celo } from "viem/chains";

// ── Contract addresses (Celo Mainnet) ────────────────────────────────────────
const PAYEER_CONTRACT = "0x5fA80497E70506E3CB8a2e32b838782aF31E005A";
const BADGE_CONTRACT = "0x956D4eeF22377d83D5cc31E0951a4591F08aECEC";

const PAYEER_ABI = parseAbi([
  "function getSessionParticipants(uint256 _sessionId) view returns (address[])",
  "function sessions(uint256) view returns (uint256 amount, address merchant, address selectedPayer, bool completed, bool isLocked, uint256 createdAt, uint256 requestId)",
  "function sessionCount() view returns (uint256)",
]);

const BADGE_ABI = parseAbi([
  "function getBadge(address user) view returns (uint256 totalPaid, uint256 sessionsPaid, uint256 lastPaidAt, string rarity)",
  "function userBadges(address user) view returns (uint256)",
]);

// ── Viem public client for Celo Mainnet ──────────────────────────────────────
const publicClient = createPublicClient({
  chain: celo,
  transport: http("https://forno.celo.org"),
});

// ── Agent Card (ERC-8004 capability manifest) ────────────────────────────────
const AGENT_CARD = {
  name: "WhoPays PayBot",
  version: "1.0.0",
  type: "payment-agent",
  description:
    "Autonomous AI agent for WhoPays — analyzes group payment history, recommends fair payer selection, and can auto-settle bills on Celo MiniPay.",
  chain: "celo",
  chainId: 42220,
  contractAddress: PAYEER_CONTRACT,
  erc8004Compliant: true,
  selfAgentVerified: true,
  capabilities: [
    "analyze-payment-history",
    "recommend-payer",
    "get-session-details",
    "check-badge-status",
    "provide-fair-score",
  ],
  endpoints: {
    a2a: "https://whopays.vercel.app/api/agent",
    health: "https://whopays.vercel.app/api/agent/health",
  },
  trustModel: "self-agent-id",
  supportedAssets: ["CELO", "cUSD", "cEUR"],
};

// ── GET: Return Agent Card ────────────────────────────────────────────────────
export async function GET() {
  return NextResponse.json(AGENT_CARD, {
    headers: {
      "Content-Type": "application/json",
      "X-Agent-Standard": "ERC-8004",
      "X-Agent-Chain": "celo",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ── POST: Execute Agent Actions ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, params } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing action field" },
        { status: 400 }
      );
    }

    switch (action) {
      // ── Analyze who should pay based on on-chain history ──────────────────
      case "recommend-payer": {
        const { participants, sessionId } = params as {
          participants: string[];
          sessionId?: number;
        };

        if (!participants || participants.length === 0) {
          return NextResponse.json(
            { error: "participants array is required" },
            { status: 400 }
          );
        }

        const scores = await Promise.all(
          participants.map(async (addr) => {
            try {
              const hasBadge = await publicClient.readContract({
                address: BADGE_CONTRACT as `0x${string}`,
                abi: BADGE_ABI,
                functionName: "userBadges",
                args: [addr as `0x${string}`],
              });

              let sessionsPaid = 0n;
              let totalPaid = 0n;

              if (hasBadge && hasBadge > BigInt(0)) {
                const badge = await publicClient.readContract({
                  address: BADGE_CONTRACT as `0x${string}`,
                  abi: BADGE_ABI,
                  functionName: "getBadge",
                  args: [addr as `0x${string}`],
                });
                sessionsPaid = (badge as any)[1] as bigint;
                totalPaid = (badge as any)[0] as bigint;
              }

              // Lower score = more likely to be selected (they've paid less)
              const fairnessScore = Number(sessionsPaid);

              return {
                address: addr,
                sessionsPaid: Number(sessionsPaid),
                totalPaid: formatEther(totalPaid),
                fairnessScore,
                rarity: hasBadge && hasBadge > BigInt(0) ? "Has Badge" : "No Badge",
              };
            } catch {
              return {
                address: addr,
                sessionsPaid: 0,
                totalPaid: "0",
                fairnessScore: 0,
                rarity: "Unknown",
              };
            }
          })
        );

        // Sort: least frequent payer first (most likely to be selected for fairness)
        scores.sort((a, b) => a.fairnessScore - b.fairnessScore);

        const recommended = scores[0];
        const reasoning = buildRecommendationReasoning(scores, recommended);

        return NextResponse.json({
          success: true,
          action: "recommend-payer",
          recommendation: recommended,
          allScores: scores,
          reasoning,
          agentNote:
            "This recommendation is based on on-chain payment history from Celo Mainnet. The final payer is still selected by the on-chain randomness protocol for fairness.",
        });
      }

      // ── Get session details from contract ─────────────────────────────────
      case "get-session-details": {
        const { sessionId } = params as { sessionId: number };

        const [participants, details] = await Promise.all([
          publicClient.readContract({
            address: PAYEER_CONTRACT as `0x${string}`,
            abi: PAYEER_ABI,
            functionName: "getSessionParticipants",
            args: [BigInt(sessionId)],
          }),
          publicClient.readContract({
            address: PAYEER_CONTRACT as `0x${string}`,
            abi: PAYEER_ABI,
            functionName: "sessions",
            args: [BigInt(sessionId)],
          }),
        ]);

        const [amount, merchant, selectedPayer, completed, isLocked, createdAt] =
          details as [bigint, string, string, boolean, boolean, bigint, bigint];

        return NextResponse.json({
          success: true,
          action: "get-session-details",
          session: {
            id: sessionId,
            participants,
            amount: formatEther(amount),
            merchant,
            selectedPayer:
              selectedPayer === "0x0000000000000000000000000000000000000000"
                ? null
                : selectedPayer,
            completed,
            isLocked,
            createdAt: new Date(Number(createdAt) * 1000).toISOString(),
          },
        });
      }

      // ── Check a user's badge and reputation ───────────────────────────────
      case "check-badge-status": {
        const { address: userAddress } = params as { address: string };

        const hasBadge = await publicClient.readContract({
          address: BADGE_CONTRACT as `0x${string}`,
          abi: BADGE_ABI,
          functionName: "userBadges",
          args: [userAddress as `0x${string}`],
        });

        if (!hasBadge || hasBadge === BigInt(0)) {
          return NextResponse.json({
            success: true,
            action: "check-badge-status",
            hasBadge: false,
            badge: null,
          });
        }

        const badge = await publicClient.readContract({
          address: BADGE_CONTRACT as `0x${string}`,
          abi: BADGE_ABI,
          functionName: "getBadge",
          args: [userAddress as `0x${string}`],
        });

        const [totalPaid, sessionsPaid, lastPaidAt, rarity] = badge as [
          bigint,
          bigint,
          bigint,
          string,
        ];

        return NextResponse.json({
          success: true,
          action: "check-badge-status",
          hasBadge: true,
          badge: {
            tokenId: Number(hasBadge),
            totalPaid: formatEther(totalPaid),
            sessionsPaid: Number(sessionsPaid),
            lastPaidAt: new Date(Number(lastPaidAt) * 1000).toISOString(),
            rarity,
          },
        });
      }

      // ── Natural language session intent parser ────────────────────────────
      case "parse-session-intent": {
        const { text, userAddress } = params as {
          text: string;
          userAddress: string;
        };

        // Basic NLP parsing for common patterns
        const parsed = parseSessionIntent(text, userAddress);

        return NextResponse.json({
          success: true,
          action: "parse-session-intent",
          parsed,
          agentNote:
            "Parsed from natural language. Please verify the details before creating the session.",
        });
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}`,
            availableActions: [
              "recommend-payer",
              "get-session-details",
              "check-badge-status",
              "parse-session-intent",
            ],
          },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error("[PayBot Agent Error]", err);
    return NextResponse.json(
      {
        error: "Agent execution failed",
        message: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildRecommendationReasoning(
  scores: Array<{ address: string; sessionsPaid: number; totalPaid: string; fairnessScore: number }>,
  recommended: { address: string; sessionsPaid: number; totalPaid: string }
): string {
  const total = scores.reduce((s, p) => s + p.sessionsPaid, 0);

  if (total === 0) {
    return `No one in this group has paid before! It's anyone's game — the on-chain randomness will decide fairly.`;
  }

  const percentage =
    total > 0
      ? Math.round((recommended.sessionsPaid / total) * 100)
      : 0;

  return (
    `Based on on-chain history, ${recommended.address.slice(0, 6)}...${recommended.address.slice(-4)} ` +
    `has paid ${recommended.sessionsPaid} time(s) out of ${total} total group payments (${percentage}%). ` +
    `They are the least frequent payer, making them the fairest candidate by PayBot's analysis. ` +
    `The final decision is made by Celo's verifiable on-chain randomness for true fairness.`
  );
}

function parseSessionIntent(
  text: string,
  userAddress: string
): {
  amount: string | null;
  currency: string;
  description: string;
  participantCount: number | null;
  confidence: number;
} {
  const lower = text.toLowerCase();

  // Extract amount
  const amountMatch = lower.match(/\$?(\d+(?:\.\d+)?)\s*(cusd|ceur|celo|usd)?/);
  const amount = amountMatch ? amountMatch[1] : null;

  // Detect currency
  let currency = "cUSD";
  if (lower.includes("celo")) currency = "CELO";
  if (lower.includes("ceur")) currency = "cEUR";
  if (lower.includes("cusd") || lower.includes("usd")) currency = "cUSD";

  // Count mentions of "and", "@", or people
  const andCount = (lower.match(/ and /g) || []).length;
  const atCount = (lower.match(/@/g) || []).length;
  const participantCount = atCount > 0 ? atCount + 1 : andCount > 0 ? andCount + 2 : null;

  // Extract description
  const descriptionWords = ["dinner", "lunch", "coffee", "drinks", "bill", "tab", "groceries", "pizza", "food", "meal", "round"];
  const description =
    descriptionWords.find((w) => lower.includes(w)) || "bill";

  const confidence = amount ? (participantCount ? 0.9 : 0.7) : 0.4;

  return {
    amount,
    currency,
    description,
    participantCount,
    confidence,
  };
}
