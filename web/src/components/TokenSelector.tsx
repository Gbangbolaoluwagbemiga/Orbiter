"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Token {
  symbol: string;
  name: string;
  address: string | null; // null = native CELO
  decimals: number;
  logo: string;
  color: string;
}

// Celo Mainnet token addresses
export const SUPPORTED_TOKENS: Token[] = [
  {
    symbol: "cUSD",
    name: "Celo Dollar",
    address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    decimals: 18,
    logo: "💵",
    color: "from-green-500 to-emerald-600",
  },
  {
    symbol: "CELO",
    name: "Celo Native",
    address: null,
    decimals: 18,
    logo: "🟡",
    color: "from-yellow-500 to-orange-500",
  },
  {
    symbol: "cEUR",
    name: "Celo Euro",
    address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
    decimals: 18,
    logo: "💶",
    color: "from-blue-500 to-blue-600",
  },
];

interface TokenSelectorProps {
  selected: Token;
  onSelect: (token: Token) => void;
}

export function TokenSelector({ selected, onSelect }: TokenSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors w-full"
        type="button"
      >
        <span className="text-lg">{selected.logo}</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-gray-900">{selected.symbol}</p>
          <p className="text-xs text-gray-500">{selected.name}</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {SUPPORTED_TOKENS.map((token) => (
            <button
              key={token.symbol}
              onClick={() => {
                onSelect(token);
                setOpen(false);
              }}
              type="button"
              className={`flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors ${
                selected.symbol === token.symbol ? "bg-purple-50" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${token.color} flex items-center justify-center text-sm shadow-sm`}
              >
                {token.logo}
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-bold text-gray-900">{token.symbol}</p>
                <p className="text-xs text-gray-500">{token.name}</p>
              </div>
              {selected.symbol === token.symbol && (
                <div className="w-2 h-2 rounded-full bg-purple-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
