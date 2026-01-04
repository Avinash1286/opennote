"use client"

import * as React from "react"
import { Loader2, ListVideo, ChevronDown, ChevronRight, ChevronUp } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useConvexVideo } from "@/hooks/use-convex-video"

interface TranscriptPanelProps {
  onTimeClick?: (timeInSeconds: number) => void
  onToggleVideo?: () => void
  isVideoCollapsed?: boolean
}

export function TranscriptPanelNew({
  onTimeClick,
  onToggleVideo,
  isVideoCollapsed,
}: TranscriptPanelProps) {
  const [activeChapterIndex, setActiveChapterIndex] = React.useState<number | null>(null)

  const { chapters, isFetchingTranscript, status } = useConvexVideo()
  
  const isLoading = status === "pending" || isFetchingTranscript

  const handleTimeClick = (timeInSeconds: number, index: number) => {
    setActiveChapterIndex(index)
    onTimeClick?.(timeInSeconds)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">Loading chapters...</p>
          </div>
        </div>
      </div>
    )
  }

  if (chapters.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground p-4">
            <ListVideo className="size-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No chapters available</p>
            <p className="text-xs mt-1">This video doesn&apos;t have chapter markers</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <ListVideo className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Chapters</span>
        <span className="text-xs text-muted-foreground">({chapters.length})</span>

        {onToggleVideo ? (
          <button
            type="button"
            onClick={onToggleVideo}
            className={cn(
              "ml-auto inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
              isVideoCollapsed && "bg-muted text-foreground"
            )}
            aria-label={isVideoCollapsed ? "Show video" : "Hide video"}
          >
            {isVideoCollapsed ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronUp className="size-4" />
            )}
          </button>
        ) : null}
      </div>

      {/* Chapters List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="py-2">
          {chapters.map((chapter, index) => (
            <button
              key={index}
              onClick={() => handleTimeClick(chapter.timeInSeconds, index)}
              className={cn(
                "flex items-start gap-3 w-full text-left px-4 py-3 transition-colors hover:bg-muted/50",
                activeChapterIndex === index && "bg-muted/70"
              )}
            >
              {/* Timestamp badge */}
              <div className="flex-shrink-0 mt-0.5">
                <span className={cn(
                  "inline-flex items-center justify-center min-w-[52px] px-2 py-1 text-xs font-mono rounded-md",
                  activeChapterIndex === index 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {chapter.time}
                </span>
              </div>
              
              {/* Chapter info */}
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "text-sm font-medium leading-tight truncate",
                  activeChapterIndex === index && "text-primary"
                )}>
                  {chapter.title}
                </h3>
                {chapter.content && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {chapter.content}
                  </p>
                )}
              </div>

              {/* Arrow indicator for active */}
              {activeChapterIndex === index && (
                <ChevronRight className="size-4 text-primary flex-shrink-0 mt-0.5" />
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export default TranscriptPanelNew
