"use client"

import * as React from "react"
import { useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useVideo } from "@/hooks/use-video-context"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Play,
  Sparkles,
  Zap,
  AlertCircle,
  Code2,
  Maximize2,
  Minimize2,
  X,
  RefreshCw,
} from "lucide-react"

interface SimulationIdea {
  _id: string
  ideaId: string
  title: string
  description: string
  concepts: string[]
  complexity: string
  status: string
  code?: {
    html: string
    css: string
    js: string
  }
  error?: string
}

interface IdeasStatus {
  status: string
  error?: string
}

// Complexity badge colors
const complexityColors: Record<string, string> = {
  simple: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  moderate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  complex: "bg-rose-500/20 text-rose-400 border-rose-500/30",
}

export function SimulationPanel() {
  const { videoId, transcript, video } = useVideo()

  // Query simulation data
  const ideasStatus = useQuery(
    api.simulationsMutations.getIdeasStatus,
    videoId ? { videoId } : "skip"
  ) as IdeasStatus | null | undefined

  const simulations = useQuery(
    api.simulationsMutations.getSimulations,
    videoId ? { videoId } : "skip"
  ) as SimulationIdea[] | undefined

  // Actions
  const generateIdeas = useAction(api.simulations.generateSimulationIdeas)
  const generateCode = useAction(api.simulations.generateSimulationCode)

  // Local state
  const [isGeneratingIdeas, setIsGeneratingIdeas] = React.useState(false)
  const [generatingCodeFor, setGeneratingCodeFor] = React.useState<string | null>(null)
  const [selectedSimulation, setSelectedSimulation] = React.useState<SimulationIdea | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const status = ideasStatus?.status
  const isLoading = status === "generating" || isGeneratingIdeas

  // Handle generating simulation ideas
  const handleGenerateIdeas = async () => {
    if (!videoId || !transcript || !video?.title) return

    setIsGeneratingIdeas(true)
    try {
      await generateIdeas({
        videoId,
        transcript,
        videoTitle: video.title,
      })
    } catch (err) {
      console.error("Failed to generate simulation ideas:", err)
    } finally {
      setIsGeneratingIdeas(false)
    }
  }

  // Handle generating simulation code
  const handleGenerateCode = async (sim: SimulationIdea) => {
    if (!videoId) return

    setGeneratingCodeFor(sim.ideaId)
    try {
      await generateCode({
        videoId,
        ideaId: sim.ideaId,
        title: sim.title,
        description: sim.description,
        concepts: sim.concepts,
        transcript: transcript ?? undefined,
      })
    } catch (err) {
      console.error("Failed to generate simulation code:", err)
    } finally {
      setGeneratingCodeFor(null)
    }
  }

  // Handle selecting a simulation to view
  const handleSelectSimulation = (sim: SimulationIdea) => {
    if (sim.status === "completed" && sim.code) {
      setSelectedSimulation(sim)
    } else if (sim.status === "idea" || sim.status === "failed") {
      handleGenerateCode(sim)
    }
  }

  // Render the simulation in iframe
  const renderSimulation = React.useCallback(() => {
    if (!selectedSimulation?.code || !iframeRef.current) return

    const iframe = iframeRef.current
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return

    doc.open()
    doc.write(selectedSimulation.code.html)
    doc.close()
  }, [selectedSimulation])

  // Update iframe when simulation changes
  React.useEffect(() => {
    if (selectedSimulation?.code) {
      // Small delay to ensure iframe is ready
      const timer = setTimeout(renderSimulation, 100)
      return () => clearTimeout(timer)
    }
  }, [selectedSimulation, renderSimulation])

  // No video selected
  if (!videoId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-280px)] text-muted-foreground">
        <p>Select a video to generate simulations</p>
      </div>
    )
  }

  // Loading/generating state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] gap-4 p-8">
        <Loader2 className="size-8 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium">Analyzing video content...</p>
          <p className="text-sm text-muted-foreground">
            AI is identifying concepts that can be simulated
          </p>
        </div>
      </div>
    )
  }

  // Not applicable state
  if (status === "not-applicable") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] gap-4 p-8">
        <AlertCircle className="size-8 text-muted-foreground" />
        <div className="text-center max-w-md">
          <p className="font-medium">No Simulations Available</p>
          <p className="text-sm text-muted-foreground mb-4">
            {ideasStatus?.error || "This video doesn't contain concepts that would benefit from interactive simulations."}
          </p>
          <Button variant="outline" onClick={handleGenerateIdeas} disabled={!transcript}>
            <RefreshCw className="size-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Failed state
  if (status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] gap-4 p-8">
        <AlertCircle className="size-8 text-destructive" />
        <div className="text-center">
          <p className="font-medium text-destructive">Generation Failed</p>
          <p className="text-sm text-muted-foreground mb-4">
            {ideasStatus?.error || "An error occurred while analyzing the video."}
          </p>
          <Button onClick={handleGenerateIdeas} disabled={!transcript}>
            <RefreshCw className="size-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Initial state - show generate button
  if (!status || !simulations || simulations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] gap-4 p-8">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <Zap className="relative size-12 text-primary" />
        </div>
        <div className="text-center max-w-md">
          <p className="font-medium text-lg">Generate Interactive Simulations</p>
          <p className="text-sm text-muted-foreground mb-6">
            {transcript
              ? "AI will analyze the video and create interactive simulations to help you understand key concepts visually."
              : "Loading transcript..."}
          </p>
          <Button
            size="lg"
            onClick={handleGenerateIdeas}
            disabled={!transcript || isGeneratingIdeas}
            className="gap-2"
          >
            <Sparkles className="size-4" />
            Generate Simulations
          </Button>
        </div>
      </div>
    )
  }

  // Simulation viewer (fullscreen)
  if (selectedSimulation && isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(false)}>
              <Minimize2 className="size-4" />
            </Button>
            <div>
              <h3 className="font-medium">{selectedSimulation.title}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedSimulation.concepts.join(" • ")}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSelectedSimulation(null)}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 p-4">
          <iframe
            ref={iframeRef}
            className="w-full h-full rounded-lg border bg-white"
            sandbox="allow-scripts allow-same-origin"
            title={selectedSimulation.title}
          />
        </div>
      </div>
    )
  }

  // Simulation viewer (inline)
  if (selectedSimulation) {
    return (
      <div className="flex flex-col h-[calc(100vh-280px)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedSimulation(null)}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h3 className="font-medium">{selectedSimulation.title}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedSimulation.concepts.join(" • ")}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(true)}>
            <Maximize2 className="size-4" />
          </Button>
        </div>

        {/* Simulation iframe */}
        <div className="flex-1 p-4">
          <iframe
            ref={iframeRef}
            className="w-full h-full rounded-lg border bg-white"
            sandbox="allow-scripts allow-same-origin"
            title={selectedSimulation.title}
          />
        </div>
      </div>
    )
  }

  // Simulation list view
  return (
    <div className="flex flex-col h-[calc(100vh-280px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-medium">Available Simulations</h3>
          <p className="text-sm text-muted-foreground">
            {simulations.length} simulation{simulations.length !== 1 ? "s" : ""} generated
          </p>
        </div>
      </div>

      {/* Simulation list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {simulations.map((sim) => (
            <SimulationCard
              key={sim._id}
              simulation={sim}
              isGenerating={generatingCodeFor === sim.ideaId || sim.status === "generating"}
              onClick={() => handleSelectSimulation(sim)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

interface SimulationCardProps {
  simulation: SimulationIdea
  isGenerating: boolean
  onClick: () => void
}

function SimulationCard({ simulation, isGenerating, onClick }: SimulationCardProps) {
  const isReady = simulation.status === "completed" && simulation.code
  const isFailed = simulation.status === "failed"

  return (
    <button
      onClick={onClick}
      disabled={isGenerating}
      className={cn(
        "w-full text-left p-4 rounded-lg border transition-all",
        "hover:border-primary/50 hover:bg-primary/5",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        isGenerating && "opacity-70 cursor-wait",
        isFailed && "border-destructive/50"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium truncate">{simulation.title}</h4>
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border",
                complexityColors[simulation.complexity] || complexityColors.moderate
              )}
            >
              {simulation.complexity}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {simulation.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {simulation.concepts.slice(0, 3).map((concept, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
              >
                {concept}
              </span>
            ))}
            {simulation.concepts.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                +{simulation.concepts.length - 3} more
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {isGenerating ? (
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="size-5 text-primary animate-spin" />
            </div>
          ) : isReady ? (
            <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Play className="size-5 text-emerald-500" />
            </div>
          ) : isFailed ? (
            <div className="size-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="size-5 text-destructive" />
            </div>
          ) : (
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Code2 className="size-5 text-primary" />
            </div>
          )}
        </div>
      </div>
      {isFailed && simulation.error && (
        <p className="mt-2 text-xs text-destructive">{simulation.error}</p>
      )}
      {!isReady && !isGenerating && !isFailed && (
        <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
          <ChevronRight className="size-3" />
          Click to generate simulation
        </p>
      )}
    </button>
  )
}
