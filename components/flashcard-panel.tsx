"use client"

import * as React from "react"
import { useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useVideo } from "@/hooks/use-video-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react"

interface Flashcard {
  front: string
  back: string
  hint?: string | null
}

interface FlashcardsData {
  topic: string
  cards: Flashcard[]
}

export function FlashcardPanel() {
  const { videoId, transcript, video } = useVideo()
  
  // Query flashcards from Convex
  const flashcardsResult = useQuery(
    api.videos.getFlashcards,
    videoId ? { videoId } : "skip"
  )
  
  // Action to generate flashcards
  const generateFlashcardsAction = useAction(api.flashcards.generateFlashcards)
  
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isFlipped, setIsFlipped] = React.useState(false)
  const [showHint, setShowHint] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)

  const flashcards = flashcardsResult?.flashcards as FlashcardsData | null
  const status = flashcardsResult?.status
  const error = flashcardsResult?.error

  const cards = flashcards?.cards ?? []
  const currentCard = cards[currentIndex]

  React.useEffect(() => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setShowHint(false)
  }, [videoId])

  React.useEffect(() => {
    if (cards.length === 0) return
    if (currentIndex < cards.length) return
    setCurrentIndex(0)
    setIsFlipped(false)
    setShowHint(false)
  }, [cards.length, currentIndex])

  const handleGenerate = async () => {
    if (!videoId || !transcript || !video?.title) return
    
    setIsGenerating(true)
    try {
      await generateFlashcardsAction({
        videoId,
        transcript,
        videoTitle: video.title,
      })
    } catch (err) {
      console.error("Failed to start flashcard generation:", err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrevious = () => {
    setIsFlipped(false)
    setShowHint(false)
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : cards.length - 1))
  }

  const handleNext = () => {
    setIsFlipped(false)
    setShowHint(false)
    setCurrentIndex((prev) => (prev < cards.length - 1 ? prev + 1 : 0))
  }

  const handleFlip = () => {
    setIsFlipped((prev) => !prev)
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setShowHint(false)
  }

  // Show loading state
  if (!videoId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-280px)] text-muted-foreground">
        <p>Select a video to view flashcards</p>
      </div>
    )
  }

  // Show generating state
  if (status === "generating" || isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] gap-4 p-8">
        <Loader2 className="size-8 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium">Generating flashcards...</p>
          <p className="text-sm text-muted-foreground">
            Our AI is creating study cards from the video
          </p>
        </div>
      </div>
    )
  }

  // Show error state
  if (status === "failed" && error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] gap-4 p-8">
        <div className="text-center">
          <p className="font-medium text-destructive">Generation failed</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleGenerate} disabled={!transcript}>
            <RotateCcw className="size-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Show generate button if no flashcards
  if (!flashcards || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] gap-4 p-8">
        <Sparkles className="size-8 text-primary" />
        <div className="text-center">
          <p className="font-medium">Generate Flashcards</p>
          <p className="text-sm text-muted-foreground mb-4">
            {transcript
              ? "Create AI-powered flashcards to study this video"
              : "Loading transcript..."}
          </p>
          <Button onClick={handleGenerate} disabled={!transcript || isGenerating}>
            <Sparkles className="size-4 mr-2" />
            Generate Flashcards
          </Button>
        </div>
      </div>
    )
  }

  // Show flashcard viewer
  return (
    <div className="flex flex-col h-[calc(100vh-280px)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium">{flashcards.topic}</h3>
          <p className="text-sm text-muted-foreground">
            Card {currentIndex + 1} of {cards.length}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="size-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div
          className="relative w-full max-w-lg aspect-[3/2] cursor-pointer perspective-1000"
          onClick={handleFlip}
        >
          <div
            className={cn(
              "flashcard-container absolute inset-0 transform-style-3d",
              isFlipped && "flipped"
            )}
          >
            {/* Front of card */}
            <div
              className="flashcard-face flashcard-front absolute inset-0 rounded-2xl border border-border/40 bg-gradient-to-br from-card to-card/80 p-6 flex flex-col text-center shadow-xl"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest text-primary/60 font-semibold">
                  Question
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {currentIndex + 1}/{cards.length}
                </span>
              </div>
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 py-4">
                <p className="text-lg font-medium leading-relaxed px-2">{currentCard.front}</p>
                {currentCard.hint && !showHint && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowHint(true)
                    }}
                  >
                    <Lightbulb className="size-4 mr-1" />
                    Show Hint
                  </Button>
                )}
                {showHint && currentCard.hint && (
                  <p className="text-sm text-muted-foreground italic bg-muted/50 px-3 py-2 rounded-lg">
                    💡 {currentCard.hint}
                  </p>
                )}
              </div>
              <div className="mt-auto flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70">
                <RotateCcw className="size-3" />
                <span>Click to reveal answer</span>
              </div>
            </div>

            {/* Back of card */}
            <div
              className="flashcard-face flashcard-back absolute inset-0 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-6 flex flex-col text-center shadow-xl"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">
                  Answer
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {currentIndex + 1}/{cards.length}
                </span>
              </div>
              <div className="flex-1 min-h-0 flex items-center justify-center py-4">
                <p className="text-base leading-relaxed px-2">{currentCard.back}</p>
              </div>
              <div className="mt-auto flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70">
                <RotateCcw className="size-3" />
                <span>Click to flip back</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <Button variant="outline" size="icon" onClick={handlePrevious}>
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex gap-1">
          {cards.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx)
                setIsFlipped(false)
                setShowHint(false)
              }}
              className={cn(
                "size-2 rounded-full transition-colors",
                idx === currentIndex
                  ? "bg-primary"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
        <Button variant="outline" size="icon" onClick={handleNext}>
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  )
}
