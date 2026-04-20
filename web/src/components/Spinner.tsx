"use client";

import { useState, useEffect } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  participants: string[];
  onFinish: (winner: string) => void;
  isSpinning: boolean;
  targetWinner?: string | null;
}

export function Spinner({ participants, onFinish, isSpinning, targetWinner }: SpinnerProps) {
  const rotation = useMotionValue(0);
  const [internalState, setInternalState] = useState<"idle" | "tension" | "decelerating">("idle");
  const [safetyWinner, setSafetyWinner] = useState<string | null>(null);

  useEffect(() => {
    let safetyTimeout: NodeJS.Timeout;

    if (isSpinning) {
      if (!targetWinner && !safetyWinner) {
        setInternalState("tension");
        animate(rotation, rotation.get() + 360 * 100, {
          duration: 100,
          ease: "linear",
          onUpdate: (latest) => rotation.set(latest)
        });

        safetyTimeout = setTimeout(() => {
          if (!targetWinner && participants.length > 0) {
            const randomWinner = participants[Math.floor(Math.random() * participants.length)];
            setSafetyWinner(randomWinner);
          }
        }, 7000);
      } else {
        const finalWinner = targetWinner || safetyWinner;
        if (finalWinner && internalState !== "decelerating" && participants.length > 0) {
          setInternalState("decelerating");
          
          const winnerIndex = participants.findIndex(p => p.toLowerCase() === finalWinner.toLowerCase());
          const segmentAngle = 360 / participants.length;
          const winnerCenterAngle = (segmentAngle * winnerIndex) + (segmentAngle / 2);
          
          const currentRotation = rotation.get();
          const remainingInCurrentLap = 360 - (currentRotation % 360);
          const targetRotation = currentRotation + remainingInCurrentLap + (360 * 6) + winnerCenterAngle;

          animate(rotation, targetRotation, {
            duration: 8,
            ease: [0.12, 0, 0.39, 0],
            onComplete: () => {
              setInternalState("idle");
              onFinish(finalWinner);
              setSafetyWinner(null);
            }
          });
        }
      }
    } else {
      // Don't reset rotation to 0 here, otherwise it jumps back after landing!
      setInternalState("idle");
      setSafetyWinner(null);
    }

    return () => clearTimeout(safetyTimeout);
  }, [isSpinning, targetWinner, safetyWinner, participants, onFinish, internalState, rotation]);

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
            const radius = 85; 
            const x = Math.cos(((angle - 90) * Math.PI) / 180) * radius;
            const y = Math.sin(((angle - 90) * Math.PI) / 180) * radius;

            return (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ transform: `translate(${x}px, ${y}px) rotate(${angle}deg)` }}
              >
                <span className="font-black text-xs text-white drop-shadow-md whitespace-nowrap uppercase tracking-tighter">
                  {p.slice(0, 8)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Clock Hand / Needle */}
        <motion.div
           className="absolute top-1/2 left-1/2 w-1.5 h-36 bg-gray-900 rounded-full origin-bottom -translate-x-1/2 -translate-y-full z-20 shadow-lg"
           style={{
             rotate: rotation,
             originX: "50%",
             originY: "100%",
           }}
        >
           {/* Sharp Needle Tip */}
           <div 
             className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0"
             style={{
               borderLeft: "8px solid transparent",
               borderRight: "8px solid transparent",
               borderBottom: "16px solid #dc2626",
               transform: "translate(-50%, -20%) rotate(0deg)"
             }}
           />
        </motion.div>
        
        {/* Center Cap */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-gray-900 rounded-full z-30 border-2 border-gray-600 shadow-xl" />
      </div>

      {participants.length < 2 && !isSpinning && (
        <p className="text-gray-400 text-sm font-medium animate-pulse">
           Add more players to enable the spinner
        </p>
      )}
    </div>
  );
}
