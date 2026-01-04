"use client"

import * as React from "react"
import { useAction, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import {
  Layers,
  HelpCircle,
  FileText,
  StickyNote,
  Minimize2,
  Maximize2,
  NotebookPen,
  Bot,
  User,
  Send,
  Loader2,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useVideo } from "@/hooks/use-video-context"
import { InteractiveNotesComponent } from "@/components/notes"
import { QuizPanelComponent } from "@/components/quiz-panel"
import { MyNotesEditor } from "@/components/my-notes-editor"
import { FlashcardPanel } from "@/components/flashcard-panel"
import { SimulationPanel } from "@/components/simulation-panel"

// Simple message type for our chat
interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  status?: string
}

function ThinkingIndicator() {
  return (
    <div className="flex flex-col gap-2.5 min-w-[200px]" aria-label="Assistant is thinking">
      {/* Animated shimmer skeleton lines */}
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-primary/30 animate-pulse" />
        <span className="text-xs text-muted-foreground animate-pulse">Thinking</span>
      </div>
      <div className="space-y-2">
        <div className="h-3 rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-shimmer" style={{ width: '85%' }} />
        <div className="h-3 rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-shimmer" style={{ width: '70%', animationDelay: '150ms' }} />
        <div className="h-3 rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-shimmer" style={{ width: '55%', animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

const tabs = [
  { id: "chat", label: "Chat", icon: null, hasIndicator: true },
  { id: "interactive-notes", label: "Interactive Notes", icon: NotebookPen },
  { id: "quizzes", label: "Quizzes", icon: HelpCircle },
  { id: "simulation", label: "Simulation", icon: FileText },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "notes", label: "My Notes", icon: StickyNote },
]

const standardTabContainer = "mx-auto w-full max-w-4xl px-6 py-6"
const standardTabContainerX = "mx-auto w-full max-w-4xl px-6"

interface ChatPanelProps {
  isLeftPanelCollapsed?: boolean
  onToggleLeftPanel?: () => void
}

export function ChatPanel({ isLeftPanelCollapsed, onToggleLeftPanel }: ChatPanelProps) {
  const [activeTab, setActiveTab] = React.useState("chat")
  const scrollRef = React.useRef<HTMLDivElement>(null)
  
  const [input, setInput] = React.useState("")

  const {
    video,
    videoId,
    transcript,
    notes,
    quiz,
    isGeneratingNotes,
    isGeneratingQuiz,
    generateNotes,
    generateQuiz,
  } = useVideo()

  const chatMessages = useQuery(
    api.chat.getChatMessages,
    videoId ? { videoId } : "skip"
  )

  const sendChatMessageAction = useAction(api.chatActions.sendChatMessage)

  const messages: ChatMessage[] = React.useMemo(() => {
    if (!chatMessages) return []
    return chatMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        id: m._id,
        role: m.role as "user" | "assistant",
        content: m.content,
        status: m.status ?? undefined,
      }))
  }, [chatMessages])

  const isChatLoading = React.useMemo(() => {
    if (!chatMessages) return false
    return chatMessages.some((m) => m.role === "assistant" && m.status === "streaming")
  }, [chatMessages])

  // Handle chat submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoId || !input.trim() || !transcript || isChatLoading) return

    const userContent = input
    setInput("")

    void sendChatMessageAction({
      videoId,
      userContent,
      transcript,
      videoTitle: video?.title ?? undefined,
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      )
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // Generate notes when transcript is available and tab is switched
  React.useEffect(() => {
    if (activeTab === "interactive-notes" && transcript && !notes && !isGeneratingNotes) {
      generateNotes()
    }
  }, [activeTab, transcript, notes, isGeneratingNotes, generateNotes])

  // Generate quiz when notes are available and tab is switched
  React.useEffect(() => {
    if (activeTab === "quizzes" && notes && !quiz && !isGeneratingQuiz) {
      generateQuiz()
    }
  }, [activeTab, notes, quiz, isGeneratingQuiz, generateQuiz])

  const welcomeMessage = `Hey there! 👋 I'm your AI tutor for this video.

Feel free to ask me anything about **${video?.title || "this video"}** - whether you want me to:

- Explain a concept in simpler terms
- Walk through a formula step-by-step  
- Quiz you on what you've learned
- Clarify something that's confusing

What would you like to explore?`

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Tabs header */}
      <div className="flex items-center border-b border-border/40">
        <div className="flex-1 overflow-x-auto scrollbar-hide min-w-0">
          <div className="flex items-center px-2 w-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-1 min-w-28 items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px truncate",
                  activeTab === tab.id
                    ? "text-foreground border-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent"
                )}
              >
                {tab.hasIndicator && (
                  <span className="size-2 rounded-full bg-green-500" />
                )}
                {tab.icon && <tab.icon className="size-4" />}
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 shrink-0 border-l border-border/40">
          <Button 
            variant="ghost" 
            size="icon-sm" 
            className={cn(
              "text-muted-foreground hover:text-foreground",
              isLeftPanelCollapsed && "bg-muted text-foreground"
            )}
            onClick={onToggleLeftPanel}
            aria-label={isLeftPanelCollapsed ? "Show left panel" : "Hide left panel"}
          >
            {isLeftPanelCollapsed ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
        {activeTab === "chat" && (
          <div className="flex flex-col h-full">
            {messages.length === 0 ? (
              <div className={cn("flex flex-col items-center justify-center py-12", standardTabContainerX)}>
                {/* Logo */}
                <div className="mb-4">
                  <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="size-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-lg font-medium text-foreground mb-2">
                  AI Tutor Ready
                </h2>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
                  {transcript
                    ? "Ask me anything about this video!"
                    : "Loading video transcript..."}
                </p>

                {/* Welcome message preview */}
                <div className="mt-8 w-full max-w-lg px-4">
                  <div className="flex gap-3">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="size-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {welcomeMessage}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={cn("space-y-4 py-6", standardTabContainerX)}>
                {messages.map((message: ChatMessage) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : ""
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="size-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg p-3",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {/* Show thinking indicator or actual content */}
                      {message.role === "assistant" &&
                        message.status === "streaming" &&
                        message.content.trim().length === 0 ? (
                        <ThinkingIndicator />
                      ) : (
                        <div
                          className={cn(
                            "prose prose-sm max-w-none",
                            message.role === "assistant" && "dark:prose-invert",
                            message.role === "user" &&
                              "text-primary-foreground prose-p:text-primary-foreground prose-strong:text-primary-foreground prose-li:text-primary-foreground prose-headings:text-primary-foreground prose-code:text-primary-foreground prose-pre:text-primary-foreground prose-a:text-primary-foreground"
                          )}
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {message.content}
                          </ReactMarkdown>

                          {message.role === "assistant" &&
                            message.status === "streaming" &&
                            message.content.trim().length > 0 && (
                              <span className="ml-0.5 inline-block w-1 animate-pulse text-muted-foreground">▍</span>
                            )}
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <User className="size-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {/* No separate thinking bubble needed - it's shown inline in the message */
                /* isChatLoading &&
                  messages.some(
                    (m) => m.role === "assistant" && m.status === "streaming" && m.content.trim().length === 0
                  ) && (
                    <div className="flex gap-3">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="size-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <ThinkingIndicator />
                      </div>
                    </div>
                  ) */}
              </div>
            )}
          </div>
        )}

        {activeTab === "interactive-notes" && (
          <div>
            {isGeneratingNotes ? (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] gap-4 p-8">
                <Loader2 className="size-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">Generating study notes...</p>
                  <p className="text-sm text-muted-foreground">
                    Our AI is analyzing the video content
                  </p>
                </div>
              </div>
            ) : notes ? (
              <InteractiveNotesComponent notes={notes} />
            ) : transcript ? (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] gap-4 p-8">
                <Sparkles className="size-8 text-primary" />
                <div className="text-center">
                  <p className="font-medium">Generate Interactive Notes</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create AI-powered study notes from this video
                  </p>
                  <Button onClick={generateNotes}>
                    <Sparkles className="size-4 mr-2" />
                    Generate Notes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[calc(100vh-280px)] text-muted-foreground">
                <p>Loading transcript...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "flashcards" && (
          <div className={standardTabContainer}>
            <FlashcardPanel />
          </div>
        )}

        {activeTab === "quizzes" && (
          <div>
            {isGeneratingQuiz ? (
              <div className={standardTabContainer}>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] gap-4">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="font-medium">Generating quiz...</p>
                    <p className="text-sm text-muted-foreground">
                      Creating questions based on the content
                    </p>
                  </div>
                </div>
              </div>
            ) : quiz ? (
              <QuizPanelComponent quiz={quiz} />
            ) : notes ? (
              <div className={standardTabContainer}>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] gap-4">
                  <HelpCircle className="size-8 text-primary" />
                  <div className="text-center">
                    <p className="font-medium">Generate Quiz</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Test your knowledge with AI-generated questions
                    </p>
                    <Button onClick={generateQuiz}>
                      <HelpCircle className="size-4 mr-2" />
                      Generate Quiz
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={standardTabContainer}>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] text-muted-foreground text-center">
                  <p className="mb-2">Generate notes first to create a quiz</p>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("interactive-notes")}
                  >
                    Go to Notes
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "simulation" && (
          <div className={standardTabContainer}>
            <SimulationPanel />
          </div>
        )}

        {activeTab === "notes" && (
          <div className={cn("h-full", standardTabContainer)}>
            {videoId ? (
              <MyNotesEditor storageKey={`opennote:my-notes:${videoId}`} />
            ) : (
              <div className="flex items-center justify-center h-[calc(100vh-280px)] text-muted-foreground">
                <p>Select a video to start taking notes</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Chat input - only visible on Chat tab */}
      {activeTab === "chat" && (
        <div className={cn("mt-auto py-4", standardTabContainerX)}>
          <form onSubmit={handleSubmit}>
            {/* Input box */}
            <div className="relative rounded-2xl border border-border/50 bg-muted/30">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder={
                  transcript
                    ? "Ask about the video..."
                    : "Loading transcript..."
                }
                disabled={!transcript || isChatLoading}
                className="w-full bg-transparent pl-4 pr-12 py-3.5 text-sm outline-none placeholder:text-muted-foreground/70 disabled:opacity-50"
              />

              <Button
                type="submit"
                size="icon-sm"
                disabled={!input.trim() || !transcript || isChatLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                aria-label="Send"
              >
                {isChatLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
