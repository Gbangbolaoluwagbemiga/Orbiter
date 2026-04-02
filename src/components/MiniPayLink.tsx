"use client";

import { useState } from "react";
import { Smartphone, ExternalLink } from "lucide-react";

interface MiniPayLinkProps {
  amount: string;
  merchant: string;
  sessionId: number;
  onPaymentComplete?: () => void;
}

export function MiniPayLink({
  amount,
  merchant,
  sessionId,
  onPaymentComplete,
}: MiniPayLinkProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMiniPayLink = () => {
    setIsGenerating(true);

    // MiniPay deep link format for payments
    const miniPayUrl = `celo://wallet/pay?address=${merchant}&amount=${amount}&token=CELO&comment=WhoPays%20Session%20${sessionId}`;

    // For web fallback, use Valora
    const valoraUrl = `celo://wallet/pay?address=${merchant}&amount=${amount}&token=CELO&comment=WhoPays%20Session%20${sessionId}`;

    // Try to open MiniPay, fallback to Valora, then browser
    const openMiniPay = () => {
      window.open(miniPayUrl, "_blank");
      setTimeout(() => {
        if (document.hasFocus()) {
          // If still in browser, try Valora
          window.open(valoraUrl, "_blank");
        }
      }, 2000);
    };

    openMiniPay();
    setIsGenerating(false);

    // In a real app, you'd listen for payment confirmation
    setTimeout(() => {
      onPaymentComplete?.();
    }, 10000); // Simulate payment completion
  };

  return (
    <button
      onClick={generateMiniPayLink}
      disabled={isGenerating}
      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium"
    >
      {isGenerating ? (
        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
      ) : (
        <Smartphone className="w-5 h-5" />
      )}
      Pay with MiniPay
      <ExternalLink className="w-4 h-4" />
    </button>
  );
}
