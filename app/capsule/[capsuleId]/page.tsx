"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { useQuery, useAction } from "convex/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import confetti from "canvas-confetti"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
  Loader2,
  Play,
  RefreshCw,
  AlertCircle,
  X,
} from "lucide-react"

import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSoundEffects } from "@/hooks/use-sound-effects"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import "katex/dist/katex.min.css"

// Type definitions for lesson content
interface ContentSection {
  type?: string
  title?: string
  content?: string
  text?: string
  keyPoints?: string[]
}

interface CodeExample {
  title?: string
  code?: string
  language?: string
  explanation?: string
}

interface InteractiveVisualization {
  title?: string
  description?: string
  type?: string
  html?: string
  css?: string
  javascript?: string
}

interface MCQQuestion {
  type: "mcq"
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
}

interface FillBlanksQuestion {
  type: "fillBlanks"
  instruction?: string
  text: string
  blanks: Array<{
    id: string
    correctAnswer: string
    alternatives?: string[]
    hint?: string
  }>
}

interface DragDropQuestion {
  type: "dragDrop"
  instruction?: string
  items: Array<{ id: string; content: string }>
  targets: Array<{ id: string; label: string; acceptsItems: string[] }>
  feedback?: { correct?: string; incorrect?: string }
}

type PracticeQuestion = MCQQuestion | FillBlanksQuestion | DragDropQuestion

interface LessonContentData {
  sections?: ContentSection[]
  codeExamples?: CodeExample[]
  interactiveVisualizations?: InteractiveVisualization[]
  practiceQuestions?: PracticeQuestion[]
}

interface Lesson {
  _id: Id<"capsuleLessons">
  title: string
  description?: string
  order: number
  content?: LessonContentData
}

interface Module {
  _id: Id<"capsuleModules">
  title: string
  description?: string
  order: number
  lessons?: Lesson[]
}

// Progress tracking
interface LessonProgress {
  lessonId: string
  completed: boolean
  questionsAnswered: number
  totalQuestions: number
  score: number
}

interface ModuleProgress {
  moduleId: string
  lessonsCompleted: number
  totalLessons: number
}

export default function CapsulePage() {
  const params = useParams()
  const capsuleId = params.capsuleId as Id<"capsules">
  const router = useRouter()

  const capsule = useQuery(api.capsules.getCapsuleWithContent, { capsuleId })
  const generateCapsule = useAction(api.capsuleGeneration.generateCapsuleContent)

  const [selectedLesson, setSelectedLesson] = React.useState<{
    moduleIndex: number
    lessonIndex: number
  } | null>(null)

  const [isRetrying, setIsRetrying] = React.useState(false)

  // Progress tracking state
  const [lessonProgress, setLessonProgress] = React.useState<Map<string, LessonProgress>>(new Map())

  // Auto-select first lesson when capsule loads
  React.useEffect(() => {
    if (capsule?.status === "completed" && capsule.modules?.length > 0 && !selectedLesson) {
      const firstModule = capsule.modules[0]
      if (firstModule.lessons?.length > 0) {
        setSelectedLesson({ moduleIndex: 0, lessonIndex: 0 })
      }
    }
  }, [capsule, selectedLesson])

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await generateCapsule({ capsuleId })
    } catch (error) {
      console.error("Failed to retry generation:", error)
    } finally {
      setIsRetrying(false)
    }
  }

  // Navigation handlers
  const navigateToLesson = (moduleIndex: number, lessonIndex: number) => {
    setSelectedLesson({ moduleIndex, lessonIndex })
  }

  const goToPreviousLesson = () => {
    if (!selectedLesson || !capsule?.modules) return

    const { moduleIndex, lessonIndex } = selectedLesson

    if (lessonIndex > 0) {
      setSelectedLesson({ moduleIndex, lessonIndex: lessonIndex - 1 })
    } else if (moduleIndex > 0) {
      const prevModule = capsule.modules[moduleIndex - 1]
      const prevLessonIndex = (prevModule.lessons?.length || 1) - 1
      setSelectedLesson({ moduleIndex: moduleIndex - 1, lessonIndex: prevLessonIndex })
    }
  }

  const goToNextLesson = () => {
    if (!selectedLesson || !capsule?.modules) return

    const { moduleIndex, lessonIndex } = selectedLesson
    const currentModule = capsule.modules[moduleIndex]
    const totalLessons = currentModule?.lessons?.length || 0

    if (lessonIndex < totalLessons - 1) {
      setSelectedLesson({ moduleIndex, lessonIndex: lessonIndex + 1 })
    } else if (moduleIndex < capsule.modules.length - 1) {
      setSelectedLesson({ moduleIndex: moduleIndex + 1, lessonIndex: 0 })
    }
  }

  const canGoPrevious = () => {
    if (!selectedLesson) return false
    return selectedLesson.moduleIndex > 0 || selectedLesson.lessonIndex > 0
  }

  const canGoNext = () => {
    if (!selectedLesson || !capsule?.modules) return false
    const { moduleIndex, lessonIndex } = selectedLesson
    const currentModule = capsule.modules[moduleIndex]
    const totalLessons = currentModule?.lessons?.length || 0
    return lessonIndex < totalLessons - 1 || moduleIndex < capsule.modules.length - 1
  }

  // Track lesson completion
  const handleLessonComplete = (lessonId: string, score: number, totalQuestions: number) => {
    setLessonProgress(prev => {
      const newMap = new Map(prev)
      newMap.set(lessonId, {
        lessonId,
        completed: true,
        questionsAnswered: totalQuestions,
        totalQuestions,
        score,
      })
      return newMap
    })
  }

  // Calculate module progress
  const getModuleProgress = (module: Module): ModuleProgress => {
    const lessons = module.lessons || []
    const completedLessons = lessons.filter(l => lessonProgress.get(l._id)?.completed).length
    return {
      moduleId: module._id,
      lessonsCompleted: completedLessons,
      totalLessons: lessons.length,
    }
  }

  // Calculate overall progress
  const getOverallProgress = (): number => {
    if (!capsule?.modules) return 0
    const totalLessons = capsule.modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0)
    const completedLessons = Array.from(lessonProgress.values()).filter(p => p.completed).length
    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  }

  // Loading state
  if (capsule === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-48" />
        </header>
        <div className="flex flex-1 gap-4 p-4">
          <div className="w-80 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    )
  }

  // Not found
  if (capsule === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <AlertCircle className="size-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Capsule not found</h1>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    )
  }

  // Generating state
  if (capsule.status !== "completed" && capsule.status !== "failed") {
    // Users should not stay on /capsule/[id] while generating.
    // Redirect to dashboard and show a toast.
    toast.message("Capsule is still being generated", {
      description: "You can track progress on the capsule card.",
    })
    router.replace("/dashboard")
    return null
  }

  // Failed state
  if (capsule.status === "failed") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="size-16 text-destructive" />
          <div>
            <h1 className="text-2xl font-bold">{capsule.title}</h1>
            <p className="mt-1 text-destructive">Generation failed</p>
            {capsule.errorMessage && (
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {capsule.errorMessage}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 size-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button onClick={handleRetry} disabled={isRetrying}>
            {isRetrying ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Retry Generation
          </Button>
        </div>
      </div>
    )
  }

  // Completed state - show the course
  const currentLesson =
    selectedLesson && capsule.modules?.[selectedLesson.moduleIndex]?.lessons?.[selectedLesson.lessonIndex]

  const overallProgress = getOverallProgress()

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1 truncate">
          <h1 className="truncate font-semibold">{capsule.title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 sm:flex">
            <Progress value={overallProgress} className="w-24" />
            <span className="text-sm text-muted-foreground">{overallProgress}%</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            <span>{capsule.estimatedDuration || 30} min</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - Course outline */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-80 shrink-0 border-r md:block">
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {capsule.description}
                </p>
                <div className="mt-2 flex gap-2">
                  <Badge variant="secondary">
                    {capsule.moduleCount || capsule.modules?.length || 0} modules
                  </Badge>
                  <Badge variant="outline">
                    {capsule.lessonCount ||
                      capsule.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) ||
                      0}{" "}
                    lessons
                  </Badge>
                </div>
              </div>

              <Accordion type="multiple" defaultValue={["module-0"]} className="w-full">
                {capsule.modules?.map((module, moduleIndex) => {
                  const moduleProgress = getModuleProgress(module)

                  return (
                    <AccordionItem key={module._id} value={`module-${moduleIndex}`}>
                      <AccordionTrigger className="text-sm hover:no-underline">
                        <div className="flex flex-1 items-center gap-2 text-left">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {moduleIndex + 1}
                          </span>
                          <span className="line-clamp-1 flex-1">{module.title}</span>
                          {moduleProgress.lessonsCompleted > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {moduleProgress.lessonsCompleted}/{moduleProgress.totalLessons}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="ml-8 space-y-1">
                          {module.lessons?.map((lesson, lessonIndex) => {
                            const isSelected =
                              selectedLesson?.moduleIndex === moduleIndex &&
                              selectedLesson?.lessonIndex === lessonIndex
                            const isCompleted = lessonProgress.get(lesson._id)?.completed

                            return (
                              <button
                                key={lesson._id}
                                onClick={() => navigateToLesson(moduleIndex, lessonIndex)}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                                  isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted"
                                )}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="size-3 shrink-0 text-green-500" />
                                ) : (
                                  <Play className="size-3 shrink-0" />
                                )}
                                <span className="line-clamp-1">{lesson.title}</span>
                              </button>
                            )
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </div>
          </ScrollArea>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          {currentLesson ? (
            <LessonView
              lesson={currentLesson}
              onComplete={(score, total) => handleLessonComplete(currentLesson._id, score, total)}
              onPrevious={goToPreviousLesson}
              onNext={goToNextLesson}
              canGoPrevious={canGoPrevious()}
              canGoNext={canGoNext()}
              isCompleted={lessonProgress.get(currentLesson._id)?.completed || false}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">Select a lesson to start learning</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// Lesson view with content and navigation
interface LessonViewProps {
  lesson: Lesson
  onComplete: (score: number, totalQuestions: number) => void
  onPrevious: () => void
  onNext: () => void
  canGoPrevious: boolean
  canGoNext: boolean
  isCompleted: boolean
}

function LessonView({
  lesson,
  onComplete,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  isCompleted,
}: LessonViewProps) {
  const content = lesson.content
  const practiceQuestions = content?.practiceQuestions || []
  const totalQuestions = practiceQuestions.length

  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
  const [questionStates, setQuestionStates] = React.useState<Map<number, { answered: boolean; correct: boolean }>>(new Map())

  const { playCorrectSound, playIncorrectSound } = useSoundEffects()

  // Reset state when lesson changes
  React.useEffect(() => {
    setCurrentQuestionIndex(0)
    setQuestionStates(new Map())
  }, [lesson._id])

  const handleQuestionAnswer = (questionIndex: number, isCorrect: boolean) => {
    if (isCorrect) {
      playCorrectSound()
      // Trigger celebration only on correct answers
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
    } else {
      playIncorrectSound()
    }

    setQuestionStates(prev => {
      const newMap = new Map(prev)
      newMap.set(questionIndex, { answered: true, correct: isCorrect })
      return newMap
    })

    // Check if all questions are answered
    const newAnsweredCount = questionStates.size + 1
    if (newAnsweredCount === totalQuestions && !isCompleted) {
      // Calculate score
      let correctCount = isCorrect ? 1 : 0
      questionStates.forEach(state => {
        if (state.correct) correctCount++
      })

      onComplete(correctCount, totalQuestions)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const answeredCount = questionStates.size
  const questionProgress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 100

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl p-6">
          {/* Lesson title */}
          <h2 className="mb-2 text-2xl font-bold">{lesson.title}</h2>
          {lesson.description && (
            <p className="mb-6 text-muted-foreground">{lesson.description}</p>
          )}

          {/* Render sections with markdown */}
          {content?.sections?.map((section, idx) => (
            <div key={idx} className="mb-8">
              {section.title && (
                <h3 className="mb-3 text-xl font-semibold">{section.title}</h3>
              )}
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <MarkdownRenderer content={section.content || section.text || ""} />
              </div>
              {section.keyPoints && section.keyPoints.length > 0 && (
                <div className="mt-4 rounded-lg border bg-muted/50 p-4">
                  <h4 className="mb-2 font-medium">Key Points</h4>
                  <ul className="space-y-1">
                    {section.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-500" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {/* Render code examples */}
          {content?.codeExamples?.map((example, idx) => (
            <div key={idx} className="mb-8">
              {example.title && (
                <h4 className="mb-2 font-medium">{example.title}</h4>
              )}
              <CodeBlock code={example.code || ""} language={example.language || "javascript"} />
              {example.explanation && (
                <p className="mt-2 text-sm text-muted-foreground">{example.explanation}</p>
              )}
            </div>
          ))}

          {/* Render interactive visualizations */}
          {content?.interactiveVisualizations?.map((viz, idx) => {
            // Skip empty/placeholder visualizations
            const hasContent = (viz.html?.trim() || viz.javascript?.trim())
            if (!hasContent) return null
            return (
              <div key={idx} className="mb-8">
                <InteractiveVisualizationRenderer visualization={viz} />
              </div>
            )
          })}

          {/* Render practice questions */}
          {totalQuestions > 0 && (
            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold">Practice Questions</h3>
                <div className="flex items-center gap-2">
                  <Progress value={questionProgress} className="w-24" />
                  <span className="text-sm text-muted-foreground">
                    {answeredCount}/{totalQuestions}
                  </span>
                </div>
              </div>

              {/* Question navigation dots - only show when multiple questions */}
              {totalQuestions > 1 && (
                <div className="mb-4 flex items-center gap-2">
                  {practiceQuestions.map((_, idx) => {
                    const state = questionStates.get(idx)
                    return (
                      <button
                        key={idx}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                          currentQuestionIndex === idx && "border-primary bg-primary text-primary-foreground",
                          state?.answered && state.correct && "border-green-500 bg-green-500/10 text-green-600",
                          state?.answered && !state.correct && "border-red-500 bg-red-500/10 text-red-600",
                          !state?.answered && currentQuestionIndex !== idx && "hover:bg-muted"
                        )}
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Current question */}
              <QuestionRenderer
                question={practiceQuestions[currentQuestionIndex]}
                questionIndex={currentQuestionIndex}
                onAnswer={(isCorrect) => handleQuestionAnswer(currentQuestionIndex, isCorrect)}
                isAnswered={questionStates.get(currentQuestionIndex)?.answered || false}
              />

              {/* Question navigation buttons - only show when multiple questions */}
              {totalQuestions > 1 && (
                <div className="mt-4 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="mr-2 size-4" />
                    Previous Question
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleNextQuestion}
                    disabled={currentQuestionIndex === totalQuestions - 1}
                  >
                    Next Question
                    <ChevronRight className="ml-2 size-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom navigation */}
      <div className="border-t bg-background p-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!canGoPrevious}
          >
            <ArrowLeft className="mr-2 size-4" />
            Previous Lesson
          </Button>

          {isCompleted && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="size-5" />
              <span className="font-medium">Completed</span>
            </div>
          )}

          <Button
            onClick={onNext}
            disabled={!canGoNext}
          >
            Next Lesson
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Markdown renderer component
function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "")
          const isInline = !match

          if (isInline) {
            return (
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm" {...props}>
                {children}
              </code>
            )
          }

          return (
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              className="rounded-lg"
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

// Code block component
function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <SyntaxHighlighter
      style={oneDark}
      language={language}
      PreTag="div"
      className="rounded-lg"
    >
      {code}
    </SyntaxHighlighter>
  )
}

// Interactive Visualization component - renders self-contained HTML/CSS/JS
function InteractiveVisualizationRenderer({ visualization }: { visualization: InteractiveVisualization }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Skip if visualization has no meaningful content
    const html = visualization.html?.trim() || ""
    const css = visualization.css?.trim() || ""
    const js = visualization.javascript?.trim() || ""

    if (!html && !js) {
      return
    }

    try {
      // Create isolated container
      container.innerHTML = ""

      // Create shadow root for isolation
      const shadowRoot = container.attachShadow({ mode: "open" })

      // Build the visualization HTML
      const visualizationHTML = `
        <style>
          :host {
            display: block;
            width: 100%;
          }
          ${css}
        </style>
        ${html}
      `
      shadowRoot.innerHTML = visualizationHTML

      // Execute JavaScript in context of shadow root
      if (js) {
        const script = document.createElement("script")
        // Wrap JS to provide viz-container context
        script.textContent = `
          (function() {
            const vizContainer = document.currentScript.getRootNode().getElementById('viz-container') 
              || document.currentScript.getRootNode().host;
            try {
              ${js}
            } catch (e) {
              console.error('Visualization error:', e);
            }
          })();
        `
        shadowRoot.appendChild(script)
      }

      setHasError(false)
    } catch (error) {
      console.error("Failed to render visualization:", error)
      setHasError(true)
    }

    // Cleanup on unmount
    return () => {
      if (container.shadowRoot) {
        container.innerHTML = ""
      }
    }
  }, [visualization])

  if (hasError) {
    return (
      <Card className="border-amber-500/50 bg-amber-500/10">
        <CardContent className="flex items-center gap-2 py-4">
          <AlertCircle className="size-5 text-amber-500" />
          <span className="text-sm text-muted-foreground">
            This visualization could not be loaded.
          </span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {visualization.title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{visualization.title}</CardTitle>
          {visualization.description && (
            <CardDescription>{visualization.description}</CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className="pt-2">
        <div
          ref={containerRef}
          className="min-h-[200px] w-full overflow-hidden rounded-lg"
        />
      </CardContent>
    </Card>
  )
}

// Question renderer - routes to appropriate component
interface QuestionRendererProps {
  question: PracticeQuestion
  questionIndex: number
  onAnswer: (isCorrect: boolean) => void
  isAnswered: boolean
}

function QuestionRenderer({ question, questionIndex, onAnswer, isAnswered }: QuestionRendererProps) {
  // Guard against undefined/null question
  if (!question) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Question {questionIndex + 1}</CardTitle>
          <CardDescription>This question could not be loaded.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (question.type === "mcq") {
    return (
      <MCQQuestionCard
        question={question}
        index={questionIndex}
        onAnswer={onAnswer}
        isAnswered={isAnswered}
      />
    )
  }

  if (question.type === "fillBlanks") {
    return (
      <FillBlanksQuestionCard
        question={question}
        index={questionIndex}
        onAnswer={onAnswer}
        isAnswered={isAnswered}
      />
    )
  }

  if (question.type === "dragDrop") {
    return (
      <DragDropQuestionCard
        question={question}
        index={questionIndex}
        onAnswer={onAnswer}
        isAnswered={isAnswered}
      />
    )
  }

  // Fallback for unknown types
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Question {questionIndex + 1}</CardTitle>
        <CardDescription>Unknown question type: {(question as any).type}</CardDescription>
      </CardHeader>
    </Card>
  )
}

// MCQ Question Card
interface MCQQuestionCardProps {
  question: MCQQuestion
  index: number
  onAnswer: (isCorrect: boolean) => void
  isAnswered: boolean
}

function MCQQuestionCard({ question, index, onAnswer, isAnswered }: MCQQuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null)
  const [showResult, setShowResult] = React.useState(isAnswered)

  // Safely extract question properties with fallbacks
  const questionText = React.useMemo(() => {
    const unsafe = question as unknown as Record<string, unknown>
    const candidate = unsafe?.question ?? unsafe?.text ?? unsafe?.prompt ?? ""
    return typeof candidate === "string" ? candidate : "Question text missing"
  }, [question])

  const options = React.useMemo(() => {
    const unsafe = question as unknown as Record<string, unknown>
    const candidate = unsafe?.options
    if (!Array.isArray(candidate)) return []
    return candidate.filter((opt): opt is string => typeof opt === "string")
  }, [question])

  const correctIndex = React.useMemo(() => {
    const unsafe = question as unknown as Record<string, unknown>
    const idx = unsafe?.correctIndex
    return typeof idx === "number" && idx >= 0 ? idx : 0
  }, [question])

  const explanation = React.useMemo(() => {
    const unsafe = question as unknown as Record<string, unknown>
    const exp = unsafe?.explanation
    return typeof exp === "string" ? exp : undefined
  }, [question])

  const handleSelect = (optIdx: number) => {
    if (showResult) return
    setSelectedAnswer(optIdx)
    setShowResult(true)
    onAnswer(optIdx === correctIndex)
  }

  // Handle missing options gracefully
  if (options.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Question {index + 1}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This question is missing its options.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Question {index + 1}</CardTitle>
        <CardDescription className="text-base text-foreground">
          {questionText}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {options.map((option, optIdx) => {
            const isCorrect = optIdx === correctIndex
            const isSelected = selectedAnswer === optIdx

            return (
              <button
                key={optIdx}
                onClick={() => handleSelect(optIdx)}
                disabled={showResult}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                  showResult && isCorrect && "border-green-500 bg-green-500/10",
                  showResult && isSelected && !isCorrect && "border-red-500 bg-red-500/10",
                  !showResult && "hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
                    showResult && isCorrect && "border-green-500 bg-green-500 text-white",
                    showResult && isSelected && !isCorrect && "border-red-500 bg-red-500 text-white"
                  )}
                >
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <span>{option}</span>
                {showResult && isCorrect && <Check className="ml-auto size-4 text-green-500" />}
                {showResult && isSelected && !isCorrect && <X className="ml-auto size-4 text-red-500" />}
              </button>
            )
          })}
        </div>

        {showResult && explanation && (
          <div className="mt-4 rounded-lg border bg-muted/50 p-3">
            <p className="text-sm">
              <strong>Explanation:</strong> {explanation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Fill in the Blanks Question Card
interface FillBlanksQuestionCardProps {
  question: FillBlanksQuestion
  index: number
  onAnswer: (isCorrect: boolean) => void
  isAnswered: boolean
}

function FillBlanksQuestionCard({ question, index, onAnswer, isAnswered }: FillBlanksQuestionCardProps) {
  const [answers, setAnswers] = React.useState<Map<string, string>>(new Map())
  const [showResult, setShowResult] = React.useState(isAnswered)
  const [results, setResults] = React.useState<Map<string, boolean>>(new Map())

  const questionText = React.useMemo(() => {
    const unsafe = question as unknown as Record<string, unknown>
    const candidate = unsafe?.text ?? unsafe?.prompt ?? unsafe?.question ?? ""
    return typeof candidate === "string" ? candidate : ""
  }, [question])

  const blanks = React.useMemo(() => {
    const unsafe = question as unknown as Record<string, unknown>
    const candidate = unsafe?.blanks
    return Array.isArray(candidate) ? candidate : []
  }, [question])

  const handleInputChange = (blankId: string, value: string) => {
    if (showResult) return
    setAnswers(prev => {
      const newMap = new Map(prev)
      newMap.set(blankId, value)
      return newMap
    })
  }

  const handleSubmit = () => {
    if (showResult) return

    const newResults = new Map<string, boolean>()
    let allCorrect = true

    if (blanks.length === 0) {
      setResults(newResults)
      setShowResult(true)
      onAnswer(false)
      return
    }

    blanks.forEach((blank: unknown) => {
      const blankObj =
        typeof blank === "object" && blank !== null ? (blank as Record<string, unknown>) : null

      const blankId = typeof blankObj?.id === "string" ? blankObj.id : ""
      const userAnswer = (answers.get(blankId) || "").trim().toLowerCase()
      const correctAnswer =
        typeof blankObj?.correctAnswer === "string"
          ? blankObj.correctAnswer.trim().toLowerCase()
          : ""
      const alternatives = Array.isArray(blankObj?.alternatives)
        ? blankObj.alternatives
          .filter((a: unknown) => typeof a === "string")
          .map((a) => (a as string).toLowerCase())
        : []

      const isCorrect =
        blankId.length > 0 &&
        correctAnswer.length > 0 &&
        (userAnswer === correctAnswer || alternatives.includes(userAnswer))

      if (blankId.length > 0) newResults.set(blankId, isCorrect)
      if (!isCorrect) allCorrect = false
    })

    setResults(newResults)
    setShowResult(true)
    onAnswer(allCorrect)
  }

  // Parse text and replace placeholders with inputs
  const renderTextWithBlanks = () => {
    if (!questionText) return null
    const parts = questionText.split(/(\{\{[^}]+\}\})/)

    return parts.map((part, idx) => {
      const match = part.match(/\{\{([^}]+)\}\}/)
      if (match) {
        const blankId = match[1]
        const blank = blanks.find((b) => {
          if (typeof b !== "object" || b === null) return false
          const id = (b as Record<string, unknown>).id
          return id === blankId
        })
        const blankObj =
          typeof blank === "object" && blank !== null ? (blank as Record<string, unknown>) : null
        const isCorrect = results.get(blankId)
        const userAnswer = answers.get(blankId) || ""
        const hint = typeof blankObj?.hint === "string" ? blankObj.hint : undefined
        const correctAnswerDisplay =
          typeof blankObj?.correctAnswer === "string" ? blankObj.correctAnswer : undefined

        return (
          <span key={idx} className="inline-flex items-center gap-1">
            <Input
              value={userAnswer}
              onChange={(e) => handleInputChange(blankId, e.target.value)}
              disabled={showResult}
              placeholder={hint || "..."}
              className={cn(
                "inline-block w-32 h-8 text-center",
                showResult && isCorrect && "border-green-500 bg-green-500/10",
                showResult && isCorrect === false && "border-red-500 bg-red-500/10"
              )}
            />
            {showResult && isCorrect === false && correctAnswerDisplay && (
              <span className="text-sm font-semibold text-green-600">({correctAnswerDisplay})</span>
            )}
          </span>
        )
      }
      return <span key={idx}>{part}</span>
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Question {index + 1}</CardTitle>
        {question.instruction && (
          <CardDescription>{question.instruction}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {questionText ? (
          <p className="mb-4 text-base leading-relaxed">{renderTextWithBlanks()}</p>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">
            This question is missing its text.
          </p>
        )}

        {!showResult && blanks.length > 0 && (
          <Button
            onClick={handleSubmit}
            className="mt-4"
            disabled={answers.size === 0}
          >
            Check Answer
          </Button>
        )}

        {showResult && (
          <div className={cn(
            "mt-4 rounded-lg border p-3",
            results.size > 0 && Array.from(results.values()).every(v => v)
              ? "border-green-500 bg-green-500/10"
              : "border-red-500 bg-red-500/10"
          )}>
            <p className="text-sm font-medium">
              {results.size > 0 && Array.from(results.values()).every(v => v)
                ? "✓ All correct!"
                : "Some answers are incorrect. The correct answers are shown above."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Drag and Drop Question Card
interface DragDropQuestionCardProps {
  question: DragDropQuestion
  index: number
  onAnswer: (isCorrect: boolean) => void
  isAnswered: boolean
}

function DragDropQuestionCard({ question, index, onAnswer, isAnswered }: DragDropQuestionCardProps) {
  const [placements, setPlacements] = React.useState<Map<string, string>>(new Map())
  const [showResult, setShowResult] = React.useState(isAnswered)
  const [activeId, setActiveId] = React.useState<string | null>(null)

  // Safely extract question properties with fallbacks
  const instruction = React.useMemo(() => {
    const unsafe = question as unknown as Record<string, unknown>
    // Check for 'instruction' first, then 'question' as fallback
    const inst = unsafe?.instruction ?? unsafe?.question
    return typeof inst === "string" ? inst : undefined
  }, [question])

  const items = React.useMemo(() => {
    const unsafe = question as unknown as Record<string, unknown>
    const candidate = unsafe?.items
    if (!Array.isArray(candidate)) return []

    // Handle both object format {id, content} and simple string array format
    return candidate.map((item, idx) => {
      // If it's already an object with id and content, use it
      if (
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === "string" &&
        typeof (item as Record<string, unknown>).content === "string"
      ) {
        return item as { id: string; content: string }
      }
      // If it's a string, convert to object format
      if (typeof item === "string") {
        return { id: `item-${idx}`, content: item }
      }
      return null
    }).filter((item): item is { id: string; content: string } => item !== null)
  }, [question])

  const targets = React.useMemo(() => {
    const unsafe = question as unknown as Record<string, unknown>
    const candidate = unsafe?.targets
    if (!Array.isArray(candidate)) return []

    // Get items to build acceptsItems mapping (for simple format, each target accepts the item at same index)
    const itemsRaw = unsafe?.items
    const itemsArray = Array.isArray(itemsRaw) ? itemsRaw : []

    // Handle both object format {id, label, acceptsItems} and simple string array format
    return candidate.map((target, idx) => {
      // If it's already an object with id, label, and acceptsItems, use it
      if (
        typeof target === "object" &&
        target !== null &&
        typeof (target as Record<string, unknown>).id === "string" &&
        typeof (target as Record<string, unknown>).label === "string" &&
        Array.isArray((target as Record<string, unknown>).acceptsItems)
      ) {
        return target as { id: string; label: string; acceptsItems: string[] }
      }
      // If it's a string, convert to object format
      // For simple format, assume each target accepts the item at the same index
      if (typeof target === "string") {
        const acceptableItemId = itemsArray[idx] !== undefined ? `item-${idx}` : ""
        return {
          id: `target-${idx}`,
          label: target,
          acceptsItems: acceptableItemId ? [acceptableItemId] : []
        }
      }
      return null
    }).filter((target): target is { id: string; label: string; acceptsItems: string[] } => target !== null)
  }, [question])

  const feedback = React.useMemo(() => {
    const unsafe = question as unknown as Record<string, unknown>
    const fb = unsafe?.feedback
    if (typeof fb !== "object" || fb === null) return undefined
    const fbObj = fb as Record<string, unknown>
    return {
      correct: typeof fbObj.correct === "string" ? fbObj.correct : undefined,
      incorrect: typeof fbObj.incorrect === "string" ? fbObj.incorrect : undefined,
    }
  }, [question])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || showResult) return

    const itemId = active.id as string
    const targetId = over.id as string

    const isTarget = targets.some(t => t.id === targetId)
    if (!isTarget) return

    setPlacements(prev => {
      const newMap = new Map(prev)

      // Remove item from previous target if any
      newMap.forEach((value, key) => {
        if (value === itemId) {
          newMap.delete(key)
        }
      })

      // Place item in new target
      newMap.set(targetId, itemId)
      return newMap
    })
  }

  const handleSubmit = () => {
    if (showResult) return

    let allCorrect = true
    targets.forEach(target => {
      const placedItemId = placements.get(target.id)
      if (!placedItemId || !target.acceptsItems.includes(placedItemId)) {
        allCorrect = false
      }
    })

    setShowResult(true)
    onAnswer(allCorrect)
  }

  const getPlacedItem = (targetId: string) => {
    const itemId = placements.get(targetId)
    return items.find(item => item.id === itemId)
  }

  const isItemPlaced = (itemId: string) => {
    return Array.from(placements.values()).includes(itemId)
  }

  const isTargetCorrect = (targetId: string) => {
    const placedItemId = placements.get(targetId)
    const target = targets.find(t => t.id === targetId)
    return !!(placedItemId && target?.acceptsItems?.includes(placedItemId))
  }

  const activeItem = items.find(item => item.id === activeId)

  // Handle missing items/targets gracefully
  if (items.length === 0 || targets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Question {index + 1}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This drag & drop question is missing its items or targets.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Question {index + 1}</CardTitle>
        {instruction && (
          <CardDescription>{instruction}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Draggable items */}
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Drag items to their correct targets:
            </p>
            <div className="flex flex-wrap gap-2">
              {items.map(item => (
                <DraggableItem
                  key={item.id}
                  id={item.id}
                  content={item.content}
                  isPlaced={isItemPlaced(item.id)}
                  disabled={showResult}
                />
              ))}
            </div>
          </div>

          {/* Drop targets */}
          <div className="space-y-3">
            {targets.map(target => {
              const placedItem = getPlacedItem(target.id)
              const isCorrect = isTargetCorrect(target.id)

              return (
                <DroppableTarget
                  key={target.id}
                  id={target.id}
                  label={target.label}
                  placedItem={placedItem}
                  showResult={showResult}
                  isCorrect={isCorrect}
                />
              )
            })}
          </div>

          <DragOverlay>
            {activeItem && (
              <div className="flex items-center gap-2 rounded-lg border-2 border-primary bg-background px-3 py-2 shadow-lg">
                <GripVertical className="size-4 text-muted-foreground" />
                <span>{activeItem.content}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {!showResult && (
          <Button
            onClick={handleSubmit}
            className="mt-4"
            disabled={placements.size === 0}
          >
            Check Answer
          </Button>
        )}

        {showResult && feedback && (
          <div className={cn(
            "mt-4 rounded-lg border p-3",
            targets.every(t => isTargetCorrect(t.id))
              ? "border-green-500 bg-green-500/10"
              : "border-red-500 bg-red-500/10"
          )}>
            <p className="text-sm">
              {targets.every(t => isTargetCorrect(t.id))
                ? feedback.correct || "✓ All correct!"
                : feedback.incorrect || "Some placements are incorrect."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Draggable item component
function DraggableItem({
  id,
  content,
  isPlaced,
  disabled,
}: {
  id: string
  content: string
  isPlaced: boolean
  disabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: disabled || isPlaced,
  })

  if (isPlaced) {
    return null
  }

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-lg border-2 bg-primary/10 px-3 py-2 transition-colors",
        isDragging && "cursor-grabbing opacity-50",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <GripVertical className="size-4 text-muted-foreground" />
      <span>{content}</span>
    </div>
  )
}

// Droppable target component
function DroppableTarget({
  id,
  label,
  placedItem,
  showResult,
  isCorrect,
}: {
  id: string
  label: string
  placedItem?: { id: string; content: string }
  showResult: boolean
  isCorrect: boolean
}) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[80px] rounded-lg border-2 border-dashed p-4 transition-colors",
        isOver && "border-primary bg-primary/5",
        showResult && isCorrect && "border-green-500 bg-green-500/10",
        showResult && !isCorrect && placedItem && "border-red-500 bg-red-500/10"
      )}
    >
      <p className="mb-2 text-sm text-muted-foreground">{label}</p>
      {placedItem && (
        <div className={cn(
          "flex items-center gap-2 rounded-lg border bg-background px-3 py-2",
          showResult && isCorrect && "border-green-500",
          showResult && !isCorrect && "border-red-500"
        )}>
          <span>{placedItem.content}</span>
          {showResult && (
            isCorrect ? (
              <Check className="ml-auto size-4 text-green-500" />
            ) : (
              <X className="ml-auto size-4 text-red-500" />
            )
          )}
        </div>
      )}
    </div>
  )
}
