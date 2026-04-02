"use client";

import { useReadContract, useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/hooks/usePayeerContract';
import { BadgeDisplay } from '@/components/BadgeDisplay';

export default function AnalyticsContent() {
  const { address } = useAccount();

  const { data: sessionCount } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'sessionCount',
  });

  const totalSessions = sessionCount ? Number(sessionCount) : 0;
  // Since we don't have a backend indexer (TheGraph) yet, we will estimate total value
  // assuming an average tab of 0.5 CELO for visual demonstration of the dashboard.
  const estimatedTotalValue = (totalSessions * 0.5).toFixed(1);

  return (
    <main className="flex-1 flex flex-col items-center p-8 max-w-4xl mx-auto w-full">
      <header className="w-full flex justify-between items-center mb-12">
        <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
          <div className="w-12 h-12 bg-linear-to-tr from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-[0_4px_10px_rgba(251,191,36,0.4)] rotate-3">
            <span className="text-2xl drop-shadow-md">💸</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 drop-shadow-sm">
            Who<span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-purple-600">Pays</span>
          </h1>
        </a>
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm font-bold text-gray-500 hover:text-purple-600 transition-colors">
            Back to App
          </a>
          <ConnectButton showBalance={false} />
        </div>
      </header>

      <div className="w-full text-center mb-12">
        <h2 className="text-4xl font-black text-gray-900 mb-4">Global Leaderboard</h2>
        <p className="text-gray-500 max-w-xl mx-auto">
          The true saviors of the friend group. Note: A decentralized indexer is required to see all other players' stats. Below are the global network totals and your personal stats.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="text-4xl mb-2">🎰</div>
          <div className="text-3xl font-black text-gray-900">{totalSessions}</div>
          <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Total Spins</div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="text-4xl mb-2">💰</div>
          <div className="text-3xl font-black text-green-600">{estimatedTotalValue}</div>
          <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Est. CELO Paid</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="text-4xl mb-2">🛡️</div>
          <div className="text-3xl font-black text-purple-600">Active</div>
          <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">NFT Contract</div>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto">
        <BadgeDisplay address={address} />
        {!address && (
          <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-gray-500 font-medium">Connect your wallet to view your personal Honor Badge.</p>
          </div>
        )}
      </div>

    </main>
  );
}