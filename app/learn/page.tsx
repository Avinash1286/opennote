"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { usePanelRef } from "react-resizable-panels"

import { Button } from "@/components/ui/button"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { YouTubePlayer, extractYouTubeId } from "@/components/youtube-player"
import { TranscriptPanelNew } from "@/components/transcript-panel-new"
import { ChatPanel } from "@/components/chat-panel-new"
import { Skeleton } from "@/components/ui/skeleton"
import { VideoProvider, useVideo } from "@/hooks/use-video-context"
import { cn } from "@/lib/utils"

function LearnPageContent() {
  const searchParams = useSearchParams()
  const videoUrl = searchParams.get("v") || ""
  const videoId = extractYouTubeId(videoUrl) || ""
  const titleParam = searchParams.get("title")
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = React.useState(false)
  const [isVideoCollapsed, setIsVideoCollapsed] = React.useState(false)
  const [seekTo, setSeekTo] = React.useState<{ seconds: number; id: number } | null>(null)
  const leftPanelRef = usePanelRef()

  const { video, fetchVideoData, isLoadingVideo } = useVideo()

  // Fetch video data on mount
  React.useEffect(() => {
    if (videoId) {
      fetchVideoData(videoId, videoUrl)
    }
  }, [videoId, videoUrl, fetchVideoData])

  const title = video?.title || titleParam || "Learning Session"

  const handleToggleLeftPanel = React.useCallback(() => {
    const panel = leftPanelRef.current
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand()
      } else {
        panel.collapse()
      }
    }
  }, [leftPanelRef])

  const handleToggleVideo = React.useCallback(() => {
    setIsVideoCollapsed((prev) => !prev)
  }, [])

  const handleLeftPanelResize = React.useCallback(
    (size: { asPercentage: number; inPixels: number }) => {
      setIsLeftPanelCollapsed(size.asPercentage === 0 || size.inPixels === 0)
    },
    []
  )

  if (!videoId) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">No Video Selected</h1>
          <p className="text-muted-foreground">
            Please provide a YouTube video URL to start learning
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Navbar */}
      <header className="flex h-12 items-center border-b border-border/40 px-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon-sm"
            asChild
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <Link href="/dashboard">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            {isLoadingVideo ? (
              <Skeleton className="h-5 w-48" />
            ) : (
              <span className="text-sm font-medium truncate block">
                {title}
              </span>
            )}
          </div>
        </div>
        {video?.channelTitle && (
          <div className="text-xs text-muted-foreground shrink-0 ml-4">
            {video.channelTitle}
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left panel - Video and Transcript */}
          <ResizablePanel
            panelRef={leftPanelRef}
            defaultSize={45}
            minSize={20}
            collapsible
            collapsedSize="0%"
            onResize={handleLeftPanelResize}
          >
            <div className="flex flex-col h-full min-h-0">
              {/* Video player */}
              <div
                className={cn(
                  "p-4 pb-2",
                  isVideoCollapsed && "h-0 overflow-hidden p-0 pointer-events-none"
                )}
                aria-hidden={isVideoCollapsed}
              >
                <YouTubePlayer videoId={videoId} title={title} seekTo={seekTo} />
                {video?.duration && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Duration: {video.duration}
                  </div>
                )}
              </div>

              {/* Transcript panel */}
              <div className="flex-1 overflow-hidden min-h-0">
                <TranscriptPanelNew
                  onTimeClick={(seconds) =>
                    setSeekTo({ seconds, id: Date.now() })
                  }
                  isVideoCollapsed={isVideoCollapsed}
                  onToggleVideo={handleToggleVideo}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right panel - Chat */}
          <ResizablePanel defaultSize={55} minSize={30}>
            <ChatPanel
              isLeftPanelCollapsed={isLeftPanelCollapsed}
              onToggleLeftPanel={handleToggleLeftPanel}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}

function LearnPageSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex h-12 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-4 w-48" />
        </div>
      </header>
      <div className="flex-1 flex">
        <div className="flex-1 p-4">
          <Skeleton className="w-full aspect-video rounded-lg" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

function LearnPageWithProvider() {
  return (
    <Suspense fallback={<LearnPageSkeleton />}>
      <LearnPageContent />
    </Suspense>
  )
}

export default function LearnPage() {
  return (
    <VideoProvider>
      <LearnPageWithProvider />
    </VideoProvider>
  )
}
