"use client"

import { useCallback, useRef, useEffect } from "react"

export function useSoundEffects() {
  const correctSoundRef = useRef<HTMLAudioElement | null>(null)
  const incorrectSoundRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    correctSoundRef.current = new Audio("/sounds/correct.mp3")
    incorrectSoundRef.current = new Audio("/sounds/incorrect.mp3")

    // Preload
    correctSoundRef.current.load()
    incorrectSoundRef.current.load()
  }, [])

  const playCorrectSound = useCallback(() => {
    if (correctSoundRef.current) {
      correctSoundRef.current.currentTime = 0
      correctSoundRef.current.play().catch(() => {})
    }
  }, [])

  const playIncorrectSound = useCallback(() => {
    if (incorrectSoundRef.current) {
      incorrectSoundRef.current.currentTime = 0
      incorrectSoundRef.current.play().catch(() => {})
    }
  }, [])

  return { playCorrectSound, playIncorrectSound }
}
