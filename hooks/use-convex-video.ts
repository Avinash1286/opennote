"use client"

import * as React from "react"
import { useVideo } from "./use-video-context"

// =============================================================================
// TYPES
// =============================================================================

export interface Chapter {
  time: string
  timeInSeconds: number
  title: string
  content: string
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access video/transcript data from Convex or the VideoContext.
 * This provides a compatible interface for components that expect Convex-style data.
 */
export function useConvexVideo() {
  const {
    video,
    transcript,
    isLoadingTranscript,
    transcriptError,
    chapters,
    isLoadingVideo,
  } = useVideo()
  
  // Determine the status based on loading states
  const status = React.useMemo(() => {
    if (isLoadingVideo || isLoadingTranscript) {
      return "pending"
    }
    if (transcriptError) {
      return "error"
    }
    return "success"
  }, [isLoadingVideo, isLoadingTranscript, transcriptError])
  
  return {
    // Video data
    video,
    
    // Transcript data (for internal use by notes/quiz generation)
    transcript,
    isFetchingTranscript: isLoadingTranscript,
    transcriptError,
    
    // Chapters (parsed from video description)
    chapters: chapters || [],
    
    // Status
    status,
  }
}
