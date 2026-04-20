"use client";

import { useState, useEffect } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  participants: { name: string; address: string }[];
  onFinish: (winnerAddress: string) => void;
  isSpinning: boolean;
  targetWinnerAddress?: string | null;
}

export function Spinner({ participants, onFinish, isSpinning, targetWinnerAddress }: SpinnerProps) {
  const rotation = useMotionValue(0);
  const [internalState, setInternalState] = useState<"idle" | "tension" | "decelerating">("idle");
  const [safetyWinner, setSafetyWinner] = useState<string | null>(null);

  useEffect(() => {
    let safetyTimeout: NodeJS.Timeout;

    if (isSpinning) {
      if (!targetWinnerAddress && !safetyWinner) {
        setInternalState("tension");
        animate(rotation, rotation.get() + 360 * 100, {
          duration: 100,
          ease: "linear",
          onUpdate: (latest) => rotation.set(latest)
        });

        safetyTimeout = setTimeout(() => {
          if (!targetWinnerAddress && participants.length > 0) {
            const randomWinner = participants[Math.floor(Math.random() * participants.length)];
            setSafetyWinner(randomWinner.address);
          }
        }, 8000);
      } else {
        const finalWinnerAddr = targetWinnerAddress || safetyWinner;
        if (finalWinnerAddr && internalState !== "decelerating" && participants.length > 0) {
          setInternalState("decelerating");
          
          const winnerIndex = participants.findIndex(p => p.address.toLowerCase() === finalWinnerAddr.toLowerCase());
          const safeIndex = winnerIndex === -1 ? 0 : winnerIndex;
          
          const segmentAngle = 360 / participants.length;
          const winnerCenterAngle = (segmentAngle * safeIndex) + (segmentAngle / 2);
          
          const currentRotation = rotation.get();
          const remainingInCurrentLap = 360 - (currentRotation % 360);
          const targetRotation = currentRotation + remainingInCurrentLap + (360 * 10) + winnerCenterAngle;

          animate(rotation, targetRotation, {
            duration: 11, // 11 seconds of maximum anxiety
            ease: [0.16, 1, 0.3, 1], // Custom heavy ease-out
            onComplete: () => {
              setInternalState("idle");
              onFinish(finalWinnerAddr);
              setSafetyWinner(null);
            }
          });
        }
      }
    } else {
      setInternalState("idle");
      setSafetyWinner(null);
    }

    return () => clearTimeout(safetyTimeout);
  }, [isSpinning, targetWinnerAddress, safetyWinner, participants, onFinish, internalState, rotation]);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative w-64 h-64 border-8 border-gray-800 rounded-full shadow-2xl bg-white overflow-visible">
        {/* Static Background Wheel */}
        <div
          className="w-full h-full rounded-full"
          style={{
            background:
              participants.length > 0
                ? `conic-gradient(${participants
                    .map(
                      (_, i) =>
                        `hsl(${(360 / participants.length) * i}, 70%, 50%) ${(360 / participants.length) * i}deg ${(360 / participants.length) * (i + 1)}deg`,
                    )
                    .join(", ")})`
                : "#f3f4f6",
          }}
        >
          {participants.map((p, i) => {
            const angle = (360 / participants.length) * i + 360 / participants.length / 2;
            const radius = 80; 
            const x = Math.cos(((angle - 90) * Math.PI) / 180) * radius;
            const y = Math.sin(((angle - 90) * Math.PI) / 180) * radius;

            return (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ transform: `translate(${x}px, ${y}px) rotate(${angle}deg)` }}
              >
                <span className="font-black text-[10px] text-white drop-shadow-md whitespace-nowrap uppercase tracking-tighter">
                  {p.name.slice(0, 7)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Shorter Needle with Tension Easing */}
        <motion.div
           className="absolute top-1/2 left-1/2 w-1.5 h-28 bg-gray-900 rounded-full origin-bottom -translate-x-1/2 -translate-y-full z-20 shadow-lg"
           style={{
             rotate: rotation,
             originX: "50%",
             originY: "100%",
           }}
        >
           {/* Perfectly Aligned Sharp Tip */}
           <div 
             className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full"
             style={{
               width: "12px",
               height: "16px",
               backgroundColor: "#dc2626",
               clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
               transform: "translate(-50%, 2px)"
             }}
           />
        </motion.div>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-gray-900 rounded-full z-30 border-2 border-gray-600 shadow-xl" />
      </div>

      {participants.length < 2 && !isSpinning && (
        <p className="text-gray-400 text-sm font-medium animate-pulse text-center">
           Need 2+ players for tension
        </p>
      )}
    </div>
  );
}
