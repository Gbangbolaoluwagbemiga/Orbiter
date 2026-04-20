"use client";

import { useState, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  participants: string[];
  onFinish: (winner: string) => void;
  isSpinning: boolean;
  targetWinner?: string | null;
}

export function Spinner({ participants, onFinish, isSpinning, targetWinner }: SpinnerProps) {
  const controls = useAnimation();
  const [internalState, setInternalState] = useState<"idle" | "tension" | "decelerating">("idle");

  useEffect(() => {
    if (isSpinning) {
      if (!targetWinner) {
        // Tension phase: Spin fast and constantly
        setInternalState("tension");
        controls.start({
          rotate: 360 * 50, // Huge number to simulate infinite
          transition: { duration: 50, ease: "linear" }
        });
      } else if (internalState !== "decelerating") {
        // Deceleration phase: land on targetWinner over 10 seconds
        setInternalState("decelerating");
        
        const winnerIndex = participants.findIndex(p => p.toLowerCase() === targetWinner.toLowerCase());
        if (winnerIndex !== -1 && participants.length > 0) {
          const segmentAngle = 360 / participants.length;
          const winnerCenterAngle = (segmentAngle * winnerIndex) + (segmentAngle / 2);
          
          // Get current rotation to ensure smooth continuation
          // (Framer motion rotation is cumulative)
          const currentRotation = (controls as any).get()?.rotate || 0;
          const remainingInCurrentLap = 360 - (currentRotation % 360);
          
          // Total target = Current + enough full laps + landing offset
          const laps = 360 * 8; // 8 more laps for anxiety
          const targetRotation = currentRotation + remainingInCurrentLap + laps + (360 - winnerCenterAngle);

          controls.start({
            rotate: targetRotation,
            transition: { duration: 10, ease: [0.12, 0, 0.39, 0] } // Dramatic slow-down ease
          }).then(() => {
            onFinish(targetWinner);
            setInternalState("idle");
          });
        }
      }
    } else {
      controls.stop();
      controls.set({ rotate: 0 });
      setInternalState("idle");
    }
  }, [isSpinning, targetWinner, participants, controls, onFinish, internalState]);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative w-64 h-64 border-4 border-gray-200 rounded-full overflow-hidden shadow-xl bg-gray-50">
        <motion.div
          animate={controls}
          className="w-full h-full relative rounded-full"
          style={{
            originX: "50%",
            originY: "50%",
            background:
              participants.length > 0
                ? `conic-gradient(${participants
                    .map(
                      (_, i) =>
                        `hsl(${(360 / participants.length) * i}, 70%, 50%) ${(360 / participants.length) * i}deg ${(360 / participants.length) * (i + 1)}deg`,
                    )
                    .join(", ")})`
                : "transparent",
          }}
        >
          {participants.map((p, i) => {
            const angle =
              (360 / participants.length) * i + 360 / participants.length / 2;
            const radius = 80; // Distance from center
            const x = Math.cos(((angle - 90) * Math.PI) / 180) * radius;
            const y = Math.sin(((angle - 90) * Math.PI) / 180) * radius;

            return (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`,
                }}
              >
                <span
                  className="font-bold text-xs whitespace-nowrap"
                  style={{
                    color: `hsl(${(360 / participants.length) * i + 180}, 100%, 10%)`,
                    textShadow: "0 0 2px white",
                  }}
                >
                  {p.slice(0, 8)}
                </span>
              </div>
            );
          })}
          {participants.length === 0 && (
            <div className="w-full h-full flex items-center justify-center text-gray-400 italic text-sm text-center px-4">
              Add participants to start
            </div>
          )}
        </motion.div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-16 border-t-red-600 z-10 drop-shadow-md" />
      </div>

      {/* Internal spin button hidden when acting as a visual-only component */}
      {false && (
        <button
          disabled={isSpinning || participants.length < 2}
          className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 disabled:bg-gray-400 transition-colors shadow-lg"
        >
          {isSpinning ? <Loader2 className="animate-spin" /> : "SPIN!"}
        </button>
      )}
    </div>
  );
}
