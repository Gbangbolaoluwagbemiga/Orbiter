"use client";

import nextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';

const AnalyticsContent = nextDynamic(() => import('@/components/AnalyticsContent'), {
  ssr: false,
  loading: () => (
    <main className="flex-1 flex flex-col items-center p-8 max-w-4xl mx-auto w-full">
      <div className="animate-pulse text-center">
        <div className="w-16 h-16 mx-auto bg-linear-to-tr from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg rotate-3 mb-6">
          <span className="text-3xl drop-shadow-md">🏆</span>
        </div>
        <h1 className="text-4xl font-bold mb-4 text-gray-800">Loading Leaderboard...</h1>
        <p className="text-gray-500">Querying Celo network...</p>
      </div>
    </main>
  )
});

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}