"use client";

import { useAccount } from "wagmi";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { ArrowLeft, User as UserIcon } from "lucide-react";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();

  return (
    <main className="min-h-screen flex flex-col p-4 sm:p-8 w-full max-w-2xl mx-auto">
      <header className="w-full flex justify-between items-center mb-10">
        <Link 
          href="/"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold text-sm tracking-wider uppercase"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Lobby
        </Link>
        <ConnectButton showBalance={false} />
      </header>

      <div className="flex flex-col items-center justify-center flex-1 space-y-8 pb-20">
        <div className="w-20 h-20 bg-purple-500/20 border border-purple-500/30 rounded-full flex items-center justify-center">
          <UserIcon className="w-10 h-10 text-purple-400" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Your Profile</h1>
        
        {!isConnected ? (
          <p className="text-gray-400 font-medium">Please connect your wallet to view your badges.</p>
        ) : (
          <div className="w-full max-w-md">
            <BadgeDisplay address={address} />
          </div>
        )}
      </div>
    </main>
  );
}
