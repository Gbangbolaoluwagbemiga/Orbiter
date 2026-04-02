import { useWriteContract, useReadContract } from "wagmi";
import { parseEther } from "viem";

// Deployed contract address on Celo mainnet
export const CONTRACT_ADDRESS = '0xe32e98b057C80554Ba449ae00eC1d57865A58ACc';
export const BADGE_CONTRACT_ADDRESS = '0xA3aF36A970C9d3bac1e7fce1f881eBDc599048E6';

export const BADGE_CONTRACT_ABI = [
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getBadge',
    outputs: [
      {
        components: [
          { name: 'totalPaid', type: 'uint256' },
          { name: 'sessionsPaid', type: 'uint256' },
          { name: 'lastPaidAt', type: 'uint256' },
          { name: 'rarity', type: 'string' }
        ],
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export const CONTRACT_ABI = [
  {
    inputs: [
      { name: "_amount", type: "uint256" },
      { name: "_merchant", type: "address" },
    ],
    name: "createLobby",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_sessionId", type: "uint256" }],
    name: "joinSession",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_sessionId", type: "uint256" }],
    name: "lockAndSelectPayer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_sessionId", type: "uint256" }],
    name: "completePayment",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "_sessionId", type: "uint256" }],
    name: "getSessionParticipants",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "sessions",
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "merchant", type: "address" },
      { name: "selectedPayer", type: "address" },
      { name: "completed", type: "bool" },
      { name: "isLocked", type: "bool" },
      { name: "createdAt", type: "uint256" },
      { name: "requestId", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "sessionCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function usePayeerContract() {
  const {
    writeContractAsync: writeCreateLobby,
    isPending: createLobbyPending,
  } = useWriteContract();
  const {
    writeContractAsync: writeJoinSession,
    isPending: joinSessionPending,
  } = useWriteContract();
  const {
    writeContractAsync: writeLockAndSelectPayer,
    isPending: lockAndSelectPayerPending,
  } = useWriteContract();
  const {
    writeContractAsync: writeCompletePayment,
    isPending: completePaymentPending,
  } = useWriteContract();

  const {
    data: sessionCount,
    isLoading: sessionCountLoading,
    refetch: refetchSessionCount,
  } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "sessionCount",
  });

  const createLobby = async (amount: string, merchant: string) => {
    return writeCreateLobby({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: "createLobby",
      args: [parseEther(amount), merchant as `0x${string}`],
    });
  };

  const joinSession = async (sessionId: number) => {
    console.log("Preparing contract call for joinSession with ID:", sessionId);
    try {
      const tx = await writeJoinSession({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "joinSession",
        args: [BigInt(sessionId)],
      });
      console.log("Contract call success. Hash:", tx);
      return tx;
    } catch (e) {
      console.error("Contract call failed at Wagmi layer:", e);
      throw e;
    }
  };

  const lockAndSelectPayer = async (sessionId: number) => {
    console.log(
      "Preparing contract call for lockAndSelectPayer with ID:",
      sessionId,
    );
    try {
      const tx = await writeLockAndSelectPayer({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "lockAndSelectPayer",
        args: [BigInt(sessionId)],
      });
      console.log("Contract call success. Hash:", tx);
      return tx;
    } catch (e) {
      console.error(
        "Contract call failed at Wagmi layer (lockAndSelectPayer):",
        e,
      );
      throw e;
    }
  };

  const completePayment = async (sessionId: number, amount: string) => {
    return writeCompletePayment({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: "completePayment",
      args: [BigInt(sessionId)],
      value: parseEther(amount),
    });
  };

  return {
    createLobby,
    joinSession,
    lockAndSelectPayer,
    completePayment,
    sessionCount,
    sessionCountLoading,
    refetchSessionCount,
    createLobbyPending,
    joinSessionPending,
    lockAndSelectPayerPending,
    completePaymentPending,
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
  };
}
