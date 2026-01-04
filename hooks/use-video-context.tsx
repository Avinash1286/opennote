"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { InteractiveNotes } from "@/lib/notes/types"
import { generateChaptersFromSegments, type TranscriptSegment } from "@/lib/utils/chapter-generator"

// =============================================================================
// TYPES
// =============================================================================

export interface VideoData {
  id: string
  title: string
  channelTitle?: string
  description?: string
  thumbnail?: string
  thumbnailUrl?: string
  duration?: string
  durationInSeconds?: number
  publishedAt?: string | number
  url?: string
}

export interface Chapter {
  time: string
  timeInSeconds: number
  title: string
  content: string
}

// Re-export InteractiveNotes as Notes for backwards compatibility in context
export type Notes = InteractiveNotes

// Quiz format
export interface QuizQuestion {
  question: string
  options: string[]
  correct: number // Index of correct answer (0-3)
  explanation: string
}

export interface Quiz {
  topic: string
  questions: QuizQuestion[]
}

interface VideoContextType {
  // Video data
  video: VideoData | null
  videoId: string | null
  isLoadingVideo: boolean
  
  // Transcript
  transcript: string | null
  isLoadingTranscript: boolean
  transcriptError: string | null
  
  // Chapters
  chapters: Chapter[]
  
  // Notes
  notes: Notes | null
  isGeneratingNotes: boolean
  
  // Quiz
  quiz: Quiz | null
  isGeneratingQuiz: boolean
  
  // Actions
  fetchVideoData: (videoId: string, videoUrl: string) => Promise<void>
  generateNotes: () => Promise<void>
  generateQuiz: () => Promise<void>
}

const VideoContext = React.createContext<VideoContextType | null>(null)

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse video duration from ISO 8601 format
 */
function parseDuration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return duration
  
  const hours = match[1] ? parseInt(match[1]) : 0
  const minutes = match[2] ? parseInt(match[2]) : 0
  const seconds = match[3] ? parseInt(match[3]) : 0
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Parse chapters from video description
 */
function parseChaptersFromDescription(description: string): Chapter[] {
  const chapters: Chapter[] = []
  const lines = description.split('\n')
  
  // Regex to match timestamps like "0:00", "1:23", "1:23:45"
  const timestampRegex = /^(?:(\d+):)?(\d+):(\d+)\s*[-–]\s*(.+)$/
  
  for (const line of lines) {
    const match = line.trim().match(timestampRegex)
    if (match) {
      const hours = match[1] ? parseInt(match[1]) : 0
      const minutes = parseInt(match[2])
      const seconds = parseInt(match[3])
      const title = match[4].trim()
      
      const timeInSeconds = hours * 3600 + minutes * 60 + seconds
      const time = hours > 0 
        ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `${minutes}:${String(seconds).padStart(2, '0')}`
      
      chapters.push({
        time,
        timeInSeconds,
        title,
        content: '', // Could be filled later from transcript
      })
    }
  }
  
  return chapters
}

// =============================================================================
// PROVIDER
// =============================================================================

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [currentVideoId, setCurrentVideoId] = React.useState<string | null>(null)
  const [isLoadingVideo, setIsLoadingVideo] = React.useState(false)
  const [isLoadingTranscript, setIsLoadingTranscript] = React.useState(false)
  const [transcriptError, setTranscriptError] = React.useState<string | null>(null)
  const [isGeneratingNotes, setIsGeneratingNotes] = React.useState(false)
  const [isGeneratingQuiz, setIsGeneratingQuiz] = React.useState(false)
  
  // Local state for data that might not be in DB yet
  const [localVideo, setLocalVideo] = React.useState<VideoData | null>(null)
  const [localTranscript, setLocalTranscript] = React.useState<string | null>(null)
  const [localChapters, setLocalChapters] = React.useState<Chapter[]>([])
  const [localNotes, setLocalNotes] = React.useState<Notes | null>(null)
  const [localQuiz, setLocalQuiz] = React.useState<Quiz | null>(null)

  // Convex queries - only run when we have a videoId
  const dbVideo = useQuery(
    api.videos.getByVideoId,
    currentVideoId ? { videoId: currentVideoId } : "skip"
  )
  
  // Convex mutations
  const saveVideoMutation = useMutation(api.videos.saveVideo)
  const saveNotesMutation = useMutation(api.videos.saveNotes)
  const saveQuizMutation = useMutation(api.videos.saveQuiz)

  // Derive actual values - prefer DB data over local state
  const video: VideoData | null = React.useMemo(() => {
    if (dbVideo && dbVideo.videoId) {
      return {
        id: dbVideo.videoId,
        title: dbVideo.title,
        channelTitle: dbVideo.channelTitle ?? undefined,
        description: dbVideo.description ?? undefined,
        thumbnail: dbVideo.thumbnail ?? undefined,
        duration: dbVideo.duration ?? undefined,
        publishedAt: dbVideo.publishedAt ?? undefined,
      }
    }
    return localVideo
  }, [dbVideo, localVideo])

  const transcript = dbVideo?.transcript ?? localTranscript
  const chapters = dbVideo?.chapters ?? localChapters
  const notes = (dbVideo?.notes as Notes | undefined) ?? localNotes
  const quiz = (dbVideo?.quiz as Quiz | undefined) ?? localQuiz

  const fetchVideoData = React.useCallback(async (id: string, _url?: string) => {
    if (!id) return
    
    // Reset local state when switching videos
    if (id !== currentVideoId) {
      setLocalVideo(null)
      setLocalTranscript(null)
      setLocalChapters([])
      setLocalNotes(null)
      setLocalQuiz(null)
    }
    
    setCurrentVideoId(id)
    setTranscriptError(null)
    
    // Small delay to let Convex query run
    await new Promise(resolve => setTimeout(resolve, 50))
  }, [currentVideoId])

  // Effect to fetch data when videoId changes and DB doesn't have it
  React.useEffect(() => {
    if (!currentVideoId) return
    
    // If DB query is still loading, wait
    if (dbVideo === undefined) return
    
    // If we already have transcript in DB, don't fetch again
    if (dbVideo?.transcript) {
      console.log('[VideoContext] Using cached data from database')
      return
    }
    
    // Need to fetch data
    const fetchData = async () => {
      setIsLoadingVideo(true)
      setIsLoadingTranscript(true)
      
      let videoData: VideoData | null = null
      let parsedChapters: Chapter[] = []
      
      try {
        // Fetch video metadata from YouTube API (through our proxy)
        const metadataRes = await fetch(`/api/youtube?v=${encodeURIComponent(currentVideoId)}`)
        if (metadataRes.ok) {
          const data = await metadataRes.json()
          videoData = {
            id: data.id || currentVideoId,
            title: data.title || 'Untitled Video',
            channelTitle: data.channelTitle,
            description: data.description,
            thumbnail: data.thumbnail,
            duration: data.duration ? parseDuration(data.duration) : undefined,
            publishedAt: data.publishedAt,
          }
          setLocalVideo(videoData)
          
          // Parse chapters from description if available
          if (data.description) {
            parsedChapters = parseChaptersFromDescription(data.description)
            setLocalChapters(parsedChapters)
          }
        } else {
          videoData = { id: currentVideoId, title: 'Video' }
          setLocalVideo(videoData)
        }
      } catch (error) {
        console.error('[VideoContext] Failed to fetch video metadata:', error)
        videoData = { id: currentVideoId, title: 'Video' }
        setLocalVideo(videoData)
      } finally {
        setIsLoadingVideo(false)
      }
      
      // Fetch transcript separately - request timestamps for chapter generation
      try {
        // If no chapters from description, request timestamps to generate chapters
        const needsChapterGeneration = parsedChapters.length === 0
        const transcriptUrl = needsChapterGeneration
          ? `/api/transcript?v=${encodeURIComponent(currentVideoId)}&timestamps=true`
          : `/api/transcript?v=${encodeURIComponent(currentVideoId)}`
        
        const transcriptRes = await fetch(transcriptUrl)
        const transcriptData = await transcriptRes.json()
        
        if (transcriptRes.ok && transcriptData.transcript) {
          setLocalTranscript(transcriptData.transcript)
          
          // Generate chapters from transcript segments if no manual chapters exist
          let finalChapters = parsedChapters
          if (needsChapterGeneration && transcriptData.segments) {
            console.log('[VideoContext] Generating chapters from transcript segments...')
            const segments: TranscriptSegment[] = transcriptData.segments
            finalChapters = generateChaptersFromSegments(segments, {
              targetChapterDuration: 180, // 3 minutes
              minChapterDuration: 60,     // 1 minute
              maxChapterDuration: 300,    // 5 minutes
              maxChapters: 15,
            })
            setLocalChapters(finalChapters)
            console.log(`[VideoContext] Generated ${finalChapters.length} chapters from transcript`)
          }
          
          // Save to database
          try {
            await saveVideoMutation({
              videoId: currentVideoId,
              title: videoData?.title || 'Video',
              channelTitle: videoData?.channelTitle ?? undefined,
              description: videoData?.description ?? undefined,
              thumbnail: videoData?.thumbnail ?? undefined,
              duration: videoData?.duration ?? undefined,
              publishedAt: videoData?.publishedAt ?? undefined,
              transcript: transcriptData.transcript,
              transcriptLanguage: transcriptData.language,
              chapters: finalChapters,
            })
            console.log('[VideoContext] Saved video and transcript to database')
          } catch (dbError) {
            console.error('[VideoContext] Failed to save to database:', dbError)
          }
        } else {
          setTranscriptError(transcriptData.error || 'Failed to fetch transcript')
        }
      } catch (error) {
        console.error('[VideoContext] Failed to fetch transcript:', error)
        setTranscriptError('Failed to fetch transcript')
      } finally {
        setIsLoadingTranscript(false)
      }
    }
    
    fetchData()
  }, [currentVideoId, dbVideo, saveVideoMutation])

  const generateNotes = React.useCallback(async () => {
    if (!transcript || !video || !currentVideoId) return
    
    // Check if notes already exist in DB
    if (notes) {
      console.log('[VideoContext] Using cached notes from database')
      return
    }
    
    setIsGeneratingNotes(true)
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          videoTitle: video.title,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setLocalNotes(data.notes)
        
        // Save to database
        try {
          await saveNotesMutation({
            videoId: currentVideoId,
            notes: data.notes,
          })
          console.log('[VideoContext] Saved notes to database')
        } catch (dbError) {
          console.error('[VideoContext] Failed to save notes to database:', dbError)
        }
      } else {
        const errorData = await response.json()
        console.error('[VideoContext] Failed to generate notes:', errorData.error)
      }
    } catch (error) {
      console.error('[VideoContext] Error generating notes:', error)
    } finally {
      setIsGeneratingNotes(false)
    }
  }, [transcript, video, currentVideoId, notes, saveNotesMutation])

  const generateQuiz = React.useCallback(async () => {
    if (!notes || !video || !currentVideoId) return
    
    // Check if quiz already exists in DB
    if (quiz) {
      console.log('[VideoContext] Using cached quiz from database')
      return
    }
    
    setIsGeneratingQuiz(true)
    
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes,
          videoTitle: video.title,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setLocalQuiz(data.quiz)
        
        // Save to database
        try {
          await saveQuizMutation({
            videoId: currentVideoId,
            quiz: data.quiz,
          })
          console.log('[VideoContext] Saved quiz to database')
        } catch (dbError) {
          console.error('[VideoContext] Failed to save quiz to database:', dbError)
        }
      } else {
        console.error('[VideoContext] Failed to generate quiz')
      }
    } catch (error) {
      console.error('[VideoContext] Error generating quiz:', error)
    } finally {
      setIsGeneratingQuiz(false)
    }
  }, [notes, video, currentVideoId, quiz, saveQuizMutation])

  // Determine loading states based on DB query state
  const isDbLoading = currentVideoId !== null && dbVideo === undefined
  
  const value = React.useMemo(
    () => ({
      video,
      videoId: currentVideoId,
      isLoadingVideo: isLoadingVideo || isDbLoading,
      transcript,
      isLoadingTranscript: isLoadingTranscript || (isDbLoading && !localTranscript),
      transcriptError,
      chapters: chapters ?? [],
      notes,
      isGeneratingNotes,
      quiz,
      isGeneratingQuiz,
      fetchVideoData,
      generateNotes,
      generateQuiz,
    }),
    [
      video,
      currentVideoId,
      isLoadingVideo,
      isDbLoading,
      transcript,
      isLoadingTranscript,
      localTranscript,
      transcriptError,
      chapters,
      notes,
      isGeneratingNotes,
      quiz,
      isGeneratingQuiz,
      fetchVideoData,
      generateNotes,
      generateQuiz,
    ]
  )

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>
}

// =============================================================================
// HOOK
// =============================================================================

export function useVideo() {
  const context = React.useContext(VideoContext)
  
  if (!context) {
    throw new Error('useVideo must be used within a VideoProvider')
  }
  
  return context
}
