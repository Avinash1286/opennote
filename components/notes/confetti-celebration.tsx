"use client"

import { useEffect } from "react"
import confetti from "canvas-confetti"

interface ConfettiCelebrationProps {
  show: boolean
  onComplete?: () => void
  duration?: number
}

export function ConfettiCelebration({
  show,
  onComplete,
  duration = 3000,
}: ConfettiCelebrationProps) {
  useEffect(() => {
    if (show) {
      const end = Date.now() + duration

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        })
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        } else {
          onComplete?.()
        }
      }

      frame()
    }
  }, [show, duration, onComplete])

  return null
}
