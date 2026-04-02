import { useReadContract } from 'wagmi';
import { BADGE_CONTRACT_ADDRESS, BADGE_CONTRACT_ABI } from '@/hooks/usePayeerContract';
import { formatEther } from 'viem';

interface BadgeDisplayProps {
  address: string | undefined;
}

export function BadgeDisplay({ address }: BadgeDisplayProps) {
  const { data: badgeData, isError, isLoading } = useReadContract({
    address: BADGE_CONTRACT_ADDRESS as `0x${string}`,
    abi: BADGE_CONTRACT_ABI,
    functionName: 'getBadge',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    }
  });

  if (!address) return null;
  if (isLoading) return <div className="animate-pulse text-sm text-gray-500">Loading badge...</div>;
  if (isError || !badgeData) return null;

  const totalPaidCelo = formatEther((badgeData as any).totalPaid);
  const rarity = (badgeData as any).rarity;
  const sessionsPaid = (badgeData as any).sessionsPaid.toString();

  const getRarityColor = (r: string) => {
    switch (r.toLowerCase()) {
      case 'diamond': return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'silver': return 'bg-gray-200 text-gray-800 border-gray-300';
      default: return 'bg-orange-100 text-orange-800 border-orange-300'; // Bronze
    }
  };

  const getRarityEmoji = (r: string) => {
    switch (r.toLowerCase()) {
      case 'diamond': return '💎';
      case 'gold': return '🏆';
      case 'silver': return '🥈';
      default: return '🥉'; // Bronze
    }
  };

  return (
    <div className="mt-8 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Your Honor Badge</h3>
      
      <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-4xl shadow-inner mb-4 ${getRarityColor(rarity)}`}>
        {getRarityEmoji(rarity)}
      </div>
      
      <h4 className="text-xl font-black text-gray-900 mb-1">{rarity} Savior</h4>
      <p className="text-sm text-gray-500 mb-4">
        You've taken the hit for the squad <span className="font-bold text-gray-700">{sessionsPaid} times</span>.
      </p>
      
      <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 w-full">
        <div className="text-xs text-gray-500 mb-1">Total Value Paid</div>
        <div className="text-lg font-bold text-green-600">{Number(totalPaidCelo).toFixed(2)} CELO</div>
      </div>
    </div>
  );
}
