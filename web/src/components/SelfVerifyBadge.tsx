"use client";

import { Shield, ExternalLink, CheckCircle2, Clock } from "lucide-react";

interface SelfVerifyBadgeProps {
  verified?: boolean;
  selfAgentId?: string;
  compact?: boolean;
}

/**
 * Displays the Self Protocol verification status of the WhoPays PayBot agent.
 * Self Protocol provides ZK-proof-based identity for AI agents on Celo.
 * Required for the Celo AI Track qualification.
 */
export function SelfVerifyBadge({
  verified = false,
  selfAgentId,
  compact = false,
}: SelfVerifyBadgeProps) {
  if (compact) {
    return (
      <a
        href="https://self.xyz"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all hover:opacity-80"
        style={
          verified
            ? {
                background: "rgba(16, 185, 129, 0.08)",
                borderColor: "rgba(16, 185, 129, 0.3)",
                color: "#10b981",
              }
            : {
                background: "rgba(99, 102, 241, 0.08)",
                borderColor: "rgba(99, 102, 241, 0.3)",
                color: "#818cf8",
              }
        }
      >
        {verified ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <Clock className="w-3 h-3" />
        )}
        Self {verified ? "Verified" : "Pending"}
      </a>
    );
  }

  return (
    <div
      className="rounded-xl p-4 border"
      style={
        verified
          ? {
              background:
                "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.08) 100%)",
              borderColor: "rgba(16, 185, 129, 0.2)",
            }
          : {
              background:
                "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.08) 100%)",
              borderColor: "rgba(99, 102, 241, 0.2)",
            }
      }
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={
            verified
              ? { background: "rgba(16, 185, 129, 0.15)" }
              : { background: "rgba(99, 102, 241, 0.15)" }
          }
        >
          <Shield
            className="w-5 h-5"
            style={{ color: verified ? "#10b981" : "#818cf8" }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold" style={{ color: verified ? "#10b981" : "#818cf8" }}>
              Self Protocol Identity
            </p>
            {verified && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-2 leading-relaxed">
            {verified
              ? "PayBot's identity has been ZK-verified via Self Protocol. The agent is backed by a real human, privacy-preserving."
              : "Self Protocol ZK-passport verification is in progress. Required for the Celo AI Track."}
          </p>

          {verified && selfAgentId && (
            <p className="text-xs font-mono text-gray-400 bg-gray-100 rounded px-2 py-1 truncate">
              ID: {selfAgentId}
            </p>
          )}

          {!verified && (
            <a
              href="https://self.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
            >
              Complete verification at self.xyz
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
