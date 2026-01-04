"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CheckCircle, XCircle, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSoundEffects } from "@/hooks/use-sound-effects"
import { ConfettiCelebration } from "./confetti-celebration"
import type { SectionQuiz } from "@/lib/notes/types"

interface SectionQuizCardProps {
  quiz: SectionQuiz
  questionIndex: number
}

function getOptionClassName(
  option: string,
  selectedAnswer: string,
  correctAnswer: string,
  showResult: boolean
): string {
  if (!showResult) {
    return selectedAnswer === option
      ? "border-primary bg-primary/10"
      : "border-border hover:border-primary/50 hover:bg-muted/50"
  }

  const isSelected = selectedAnswer === option
  const isCorrect = option.toLowerCase() === correctAnswer.toLowerCase()

  if (isCorrect) {
    return "border-green-500 bg-green-500/10"
  }
  if (isSelected && !isCorrect) {
    return "border-destructive bg-destructive/10"
  }
  return "border-border opacity-50"
}

export function SectionQuizCard({ quiz, questionIndex }: SectionQuizCardProps) {
  const [selectedAnswer, setSelectedAnswer] = React.useState<string>("")
  const [showResult, setShowResult] = React.useState(false)
  const [showExplanation, setShowExplanation] = React.useState(false)
  const [showConfetti, setShowConfetti] = React.useState(false)

  const { playCorrectSound, playIncorrectSound } = useSoundEffects()

  const isAnswerCorrect =
    selectedAnswer.trim().toLowerCase() ===
    quiz.correctAnswer.trim().toLowerCase()

  const handleSubmit = () => {
    if (selectedAnswer.trim()) {
      setShowResult(true)
      if (isAnswerCorrect) {
        playCorrectSound()
        setShowConfetti(true)
      } else {
        playIncorrectSound()
      }
    }
  }

  const resetQuestion = () => {
    setSelectedAnswer("")
    setShowResult(false)
    setShowExplanation(false)
    setShowConfetti(false)
  }

  return (
    <>
      <ConfettiCelebration
        show={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      <div
        className={cn(
          "my-6 rounded-xl border bg-card p-6 shadow-sm transition-all",
          showResult && isAnswerCorrect && "animate-correct-pulse",
          showResult && !isAnswerCorrect && "animate-incorrect-shake"
        )}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
            {questionIndex + 1}
          </div>
          <div className="flex-1">
            <h4 className="mb-4 text-lg font-semibold">{quiz.question}</h4>

            {/* MCQ Options */}
            {quiz.type === "mcq" &&
              quiz.options?.map((option, index) => (
                <label
                  key={index}
                  className={cn(
                    "mb-2 flex cursor-pointer items-center space-x-3 rounded-lg border-2 p-3 transition-all",
                    getOptionClassName(
                      option,
                      selectedAnswer,
                      quiz.correctAnswer,
                      showResult
                    ),
                    showResult && "cursor-default"
                  )}
                >
                  <input
                    type="radio"
                    name={`question-${questionIndex}`}
                    value={option}
                    checked={selectedAnswer === option}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    disabled={showResult}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}

            {/* True/False Options */}
            {quiz.type === "true-false" &&
              ["True", "False"].map((option) => (
                <label
                  key={option}
                  className={cn(
                    "mb-2 flex cursor-pointer items-center space-x-3 rounded-lg border-2 p-3 transition-all",
                    getOptionClassName(
                      option,
                      selectedAnswer,
                      quiz.correctAnswer,
                      showResult
                    ),
                    showResult && "cursor-default"
                  )}
                >
                  <input
                    type="radio"
                    name={`question-${questionIndex}`}
                    value={option}
                    checked={selectedAnswer === option}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    disabled={showResult}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium">{option}</span>
                </label>
              ))}

            {/* Fill-in-the-blank Input */}
            {quiz.type === "fill-blank" && (
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Type your answer..."
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  disabled={showResult}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && selectedAnswer.trim()) {
                      handleSubmit()
                    }
                  }}
                  className="max-w-md"
                />
                {showResult && (
                  <div className="flex items-center gap-2 text-sm">
                    {isAnswerCorrect ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>
                      Correct answer: <strong>{quiz.correctAnswer}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {!showResult ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedAnswer.trim()}
                >
                  Submit Answer
                </Button>
              ) : (
                <>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium",
                      isAnswerCorrect
                        ? "bg-green-500/10 text-green-700 dark:text-green-300"
                        : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {isAnswerCorrect ? (
                      <>
                        <CheckCircle className="h-4 w-4" /> Correct!
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" /> Incorrect
                      </>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExplanation(!showExplanation)}
                  >
                    {showExplanation ? "Hide" : "Show"} Explanation
                    <ChevronDown
                      className={cn(
                        "ml-1 h-3 w-3 transition-transform",
                        showExplanation && "rotate-180"
                      )}
                    />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetQuestion}>
                    Try Again
                  </Button>
                </>
              )}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div className="mt-4 rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  {quiz.explanation}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
