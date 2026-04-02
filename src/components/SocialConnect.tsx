"use client";

import { useState } from "react";
import { Phone, Search, UserPlus } from "lucide-react";
import { useAccount } from "wagmi";

interface SocialConnectProps {
  onAddParticipant: (address: string, name?: string) => void;
}

export function SocialConnect({ onAddParticipant }: SocialConnectProps) {
  const { address } = useAccount();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundAddress, setFoundAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchByPhone = async () => {
    if (!phoneNumber) return;

    setIsSearching(true);
    setError(null);
    setFoundAddress(null);

    try {
      // In a real implementation, this would use Celo's identity protocol
      // For demo purposes, we'll simulate finding an address
      const mockAddress = `0x${Math.random().toString(16).substring(2, 42)}`;
      setFoundAddress(mockAddress);
    } catch (err) {
      setError("Failed to find address for this phone number");
    } finally {
      setIsSearching(false);
    }
  };

  const addParticipant = () => {
    if (foundAddress) {
      onAddParticipant(foundAddress, `+${phoneNumber}`);
      setPhoneNumber("");
      setFoundAddress(null);
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-900">
        <Phone className="w-4 h-4 text-blue-500" />
        Find Friends by Phone
      </h3>

      <div className="flex gap-2 mb-3">
        <input
          type="tel"
          placeholder="+1234567890"
          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && searchByPhone()}
        />
        <button
          onClick={searchByPhone}
          disabled={isSearching || !phoneNumber}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isSearching ? (
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      {foundAddress && (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div>
            <p className="text-sm font-medium text-green-800">
              Found: +{phoneNumber}
            </p>
            <p className="text-xs text-green-600 font-mono">
              {foundAddress.slice(0, 6)}...{foundAddress.slice(-4)}
            </p>
          </div>
          <button
            onClick={addParticipant}
            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-2">
        Uses Celo's decentralized identity to find wallet addresses by phone
        number.
      </p>
    </div>
  );
}
