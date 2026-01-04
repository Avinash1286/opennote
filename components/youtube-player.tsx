"use client"

import * as React from "react"

interface YouTubePlayerProps {
  videoId: string
  title?: string
  seekTo?: { seconds: number; id: number } | null
}

export function YouTubePlayer({ videoId, title, seekTo }: YouTubePlayerProps) {
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null)
  const [origin] = React.useState(() =>
    typeof window !== "undefined" ? window.location.origin : ""
  )
  const [iframeLoaded, setIframeLoaded] = React.useState(false)
  const pendingSeekRef = React.useRef<{ seconds: number; id: number } | null>(null)
  const retryTimerRef = React.useRef<number | null>(null)

  const postCommand = React.useCallback((payload: unknown) => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return false

    iframe.contentWindow.postMessage(JSON.stringify(payload), "*")
    return true
  }, [])

  const flushPendingSeek = React.useCallback(() => {
    const pending = pendingSeekRef.current
    if (!pending) return

    const didSendSeek = postCommand({
      event: "command",
      func: "seekTo",
      args: [pending.seconds, true],
    })

    if (didSendSeek) {
      // Optional: play immediately after seeking
      postCommand({ event: "command", func: "playVideo", args: [] })
      pendingSeekRef.current = null
    }
  }, [postCommand])

  React.useEffect(() => {
    setIframeLoaded(false)
  }, [videoId])

  React.useEffect(() => {
    if (!seekTo) return
    pendingSeekRef.current = seekTo

    // Best-effort: try now, then retry briefly (iframe may ignore commands until ready).
    if (retryTimerRef.current) {
      window.clearInterval(retryTimerRef.current)
      retryTimerRef.current = null
    }

    flushPendingSeek()

    let attempts = 0
    retryTimerRef.current = window.setInterval(() => {
      attempts += 1
      flushPendingSeek()

      if (!pendingSeekRef.current || attempts >= 12) {
        if (retryTimerRef.current) {
          window.clearInterval(retryTimerRef.current)
          retryTimerRef.current = null
        }
      }
    }, 200)
  }, [seekTo, flushPendingSeek])

  React.useEffect(() => {
    if (!iframeLoaded) return
    flushPendingSeek()
  }, [iframeLoaded, flushPendingSeek])

  React.useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        window.clearInterval(retryTimerRef.current)
        retryTimerRef.current = null
      }
    }
  }, [])

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <iframe
        ref={iframeRef}
        onLoad={() => setIframeLoaded(true)}
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`}
        title={title || "YouTube video player"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  )
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}
