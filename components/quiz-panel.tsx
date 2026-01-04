"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  Trophy,
  RotateCcw,
  Target,
  Sparkles
} from "lucide-react"

// =============================================================================
// TYPES (matching the new format)
// =============================================================================

interface QuizQuestion {
  question: string
  options: string[]
  correct: number // Index of correct answer (0-3)
  explanation: string
}

interface Quiz {
  topic: string
  questions: QuizQuestion[]
}

interface QuizPanelProps {
  quiz: Quiz
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function QuizPanelComponent({ quiz }: QuizPanelProps) {
  const [currentQuestion, setCurrentQuestion] = React.useState(0)
  const [selectedAnswers, setSelectedAnswers] = React.useState<(number | null)[]>(
    new Array(quiz.questions.length).fill(null)
  )
  const [showResults, setShowResults] = React.useState(false)
  const [showExplanation, setShowExplanation] = React.useState(false)

  const question = quiz.questions[currentQuestion]
  const selectedAnswer = selectedAnswers[currentQuestion]
  const isAnswered = selectedAnswer !== null

  const handleSelectAnswer = (index: number) => {
    if (isAnswered) return
    
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestion] = index
    setSelectedAnswers(newAnswers)
    setShowExplanation(true)
  }

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setShowExplanation(false)
    } else {
      setShowResults(true)
    }
  }

  const handleRestart = () => {
    setCurrentQuestion(0)
    setSelectedAnswers(new Array(quiz.questions.length).fill(null))
    setShowResults(false)
    setShowExplanation(false)
  }

  const correctCount = selectedAnswers.filter(
    (answer, index) => answer === quiz.questions[index].correct
  ).length

  // Results View
  if (showResults) {
    const percentage = Math.round((correctCount / quiz.questions.length) * 100)
    const grade = percentage >= 90 ? "A" : percentage >= 80 ? "B" : percentage >= 70 ? "C" : percentage >= 60 ? "D" : "F"
    
    return (
      <div className="mx-auto w-full max-w-4xl p-6 space-y-6">
          {/* Score Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center size-20 rounded-full bg-primary/10">
              <Trophy className={cn(
                "size-10",
                percentage >= 70 ? "text-yellow-500" : "text-muted-foreground"
              )} />
            </div>
            
            <h2 className="text-2xl font-bold">Quiz Complete!</h2>
            
            <div className="space-y-1">
              <div className="text-5xl font-bold text-primary">
                {percentage}%
              </div>
              <div className="text-xl font-medium text-muted-foreground">
                Grade: {grade}
              </div>
            </div>
            
            <p className="text-muted-foreground">
              You got <span className="font-semibold text-foreground">{correctCount}</span> out of{" "}
              <span className="font-semibold text-foreground">{quiz.questions.length}</span> questions correct
            </p>
            
            {/* Performance Message */}
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full",
              percentage >= 80 ? "bg-green-500/10 text-green-600 dark:text-green-400" :
              percentage >= 60 ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" :
              "bg-red-500/10 text-red-600 dark:text-red-400"
            )}>
              {percentage >= 80 ? (
                <>
                  <Sparkles className="size-4" />
                  <span>Excellent work! You&apos;ve mastered this topic.</span>
                </>
              ) : percentage >= 60 ? (
                <>
                  <Target className="size-4" />
                  <span>Good effort! Review the explanations to improve.</span>
                </>
              ) : (
                <>
                  <RotateCcw className="size-4" />
                  <span>Keep practicing! Review the material and try again.</span>
                </>
              )}
            </div>
            
            <div className="flex justify-center gap-4 pt-4">
              <Button onClick={handleRestart} variant="outline" className="gap-2">
                <RotateCcw className="size-4" />
                Try Again
              </Button>
            </div>
          </div>

          {/* Question Review */}
          <div className="space-y-4 pt-6 border-t">
            <h3 className="font-semibold text-lg">Review Your Answers</h3>
            {quiz.questions.map((q, index) => {
              const answer = selectedAnswers[index]
              const isCorrect = answer === q.correct
              
              return (
                <div
                  key={index}
                  className={cn(
                    "p-4 rounded-lg border",
                    isCorrect
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-red-500/50 bg-red-500/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex items-center justify-center size-8 rounded-full shrink-0",
                      isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
                    )}>
                      {isCorrect ? (
                        <CheckCircle className="size-5" />
                      ) : (
                        <XCircle className="size-5" />
                      )}
                    </div>
                    <div className="space-y-2 flex-1">
                      <p className="font-medium">
                        <span className="text-muted-foreground mr-2">Q{index + 1}.</span>
                        {q.question}
                      </p>
                      
                      <div className="text-sm space-y-1">
                        <p className={cn(
                          "flex items-center gap-2",
                          isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                          <span className="font-medium">Your answer:</span>
                          {q.options[answer ?? 0]}
                        </p>
                        
                        {!isCorrect && (
                          <p className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <span className="font-medium">Correct answer:</span>
                            {q.options[q.correct]}
                          </p>
                        )}
                      </div>
                      
                      <div className="p-3 rounded bg-muted/50 text-sm">
                        <span className="font-medium">Explanation: </span>
                        <span className="text-muted-foreground">{q.explanation}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
      </div>
    )
  }

  // Quiz View
  return (
    <div className="mx-auto w-full max-w-4xl p-6 space-y-6">
        {/* Topic */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Quiz on</p>
          <h2 className="font-semibold">{quiz.topic}</h2>
        </div>
        
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
            <span className="flex items-center gap-1">
              <CheckCircle className="size-4 text-green-500" />
              {correctCount} correct
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${((currentQuestion + (isAnswered ? 1 : 0)) / quiz.questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center size-8 rounded-full bg-primary/20 text-primary font-bold shrink-0">
              {currentQuestion + 1}
            </span>
            <h3 className="text-lg font-medium pt-1">{question.question}</h3>
          </div>
          
          <div className="space-y-2 pl-11">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index
              const isCorrectOption = index === question.correct
              
              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={isAnswered}
                  className={cn(
                    "w-full p-4 text-left rounded-lg border transition-all",
                    !isAnswered && "hover:border-primary hover:bg-muted/50 cursor-pointer",
                    isAnswered && isCorrectOption && "border-green-500 bg-green-500/10",
                    isAnswered && isSelected && !isCorrectOption && "border-red-500 bg-red-500/10",
                    !isAnswered && isSelected && "border-primary bg-primary/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "size-7 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors",
                        isAnswered && isCorrectOption && "border-green-500 bg-green-500 text-white",
                        isAnswered && isSelected && !isCorrectOption && "border-red-500 bg-red-500 text-white",
                        !isAnswered && "border-muted-foreground/50"
                      )}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {isAnswered && isCorrectOption && (
                      <CheckCircle className="size-5 text-green-500" />
                    )}
                    {isAnswered && isSelected && !isCorrectOption && (
                      <XCircle className="size-5 text-red-500" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className={cn(
            "p-4 rounded-lg border ml-11",
            selectedAnswer === question.correct
              ? "bg-green-500/5 border-green-500/30"
              : "bg-red-500/5 border-red-500/30"
          )}>
            <p className="text-sm">
              <span className="font-semibold">
                {selectedAnswer === question.correct ? "✓ Correct! " : "✗ Incorrect. "}
              </span>
              {question.explanation}
            </p>
          </div>
        )}

        {/* Navigation */}
        {isAnswered && (
          <div className="flex justify-end pl-11">
            <Button onClick={handleNext} className="gap-2">
              {currentQuestion < quiz.questions.length - 1 ? (
                <>
                  Next Question
                  <ChevronRight className="size-4" />
                </>
              ) : (
                <>
                  <Trophy className="size-4" />
                  See Results
                </>
              )}
            </Button>
          </div>
        )}
    </div>
  )
}
