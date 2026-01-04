"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useAction } from "convex/react"
import {
  Upload,
  Link2,
  ArrowUp,
  BookOpen,
  Loader2,
} from "lucide-react"

import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { extractYouTubeId } from "@/components/youtube-player"

const actionButtons = [
  {
    icon: Upload,
    title: "Upload",
    description: "File",
    popular: false,
  },
  {
    icon: Link2,
    title: "Link",
    description: "YouTube",
    popular: true,
  },
]

function VideoCard({ video }: { video: any }) {
  const prevVideoIdRef = React.useRef<string | undefined>(undefined)

  // Initialize image source
  const getInitialImgSrc = () =>
    video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`

  const [imgSrc, setImgSrc] = React.useState(getInitialImgSrc())
  const [hasError, setHasError] = React.useState(false)

  // Only reset when video ID actually changes (not on every render)
  React.useEffect(() => {
    if (prevVideoIdRef.current !== video.videoId) {
      prevVideoIdRef.current = video.videoId
      setImgSrc(getInitialImgSrc())
      setHasError(false)
    }
  }, [video.videoId])

  const handleError = () => {
    if (hasError) return

    const currentSrc = imgSrc as string
    const maxResSrc = `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`

    // If default thumbnail fails and it's not already the maxres one, try maxres
    if (video.thumbnail && currentSrc === video.thumbnail && currentSrc !== maxResSrc) {
      setImgSrc(maxResSrc)
      return
    }

    // Downgrade quality if maxres or hq fails
    if (currentSrc.includes("maxresdefault")) {
      setImgSrc(`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`)
    } else if (currentSrc.includes("hqdefault")) {
      setImgSrc(`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`)
    } else {
      setHasError(true)
    }
  }

  return (
    <Link
      href={`/learn?v=${encodeURIComponent(video.videoId)}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-xl h-full"
    >
      <Card className="overflow-hidden cursor-pointer transition-colors hover:bg-muted/50 pt-0 h-full flex flex-col">
        <div className="relative w-full h-32 bg-muted">
          <img
            src={imgSrc}
            alt={video.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={handleError}
          />
        </div>
        <CardContent className="p-4">
          <p className="text-sm font-medium line-clamp-2">{video.title}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false)
  const [youtubeUrl, setYoutubeUrl] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isCreatingCapsule, setIsCreatingCapsule] = React.useState(false)

  const recentVideos = useQuery(api.videos.listVideos, { limit: 3 })
  const recentCapsules = useQuery(api.capsules.getRecentCapsules, { limit: 3 })

  const createCapsule = useMutation(api.capsules.createCapsule)
  const generateCapsule = useAction(api.capsuleGeneration.generateCapsuleContent)

  const handleLinkSubmit = () => {
    const videoId = extractYouTubeId(youtubeUrl)
    if (videoId) {
      setLinkDialogOpen(false)
      router.push(`/learn?v=${encodeURIComponent(youtubeUrl)}&title=YouTube Video`)
    }
  }

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) return

    // Check if it's a YouTube URL
    const videoId = extractYouTubeId(searchQuery)
    if (videoId) {
      router.push(`/learn?v=${encodeURIComponent(searchQuery)}&title=YouTube Video`)
      return
    }

    // Otherwise, treat it as a topic and create a capsule
    setIsCreatingCapsule(true)
    try {
      const capsuleId = await createCapsule({
        title: searchQuery.trim(),
        sourceType: "topic",
        sourceTopic: searchQuery.trim(),
      })

      // Start generation
      await generateCapsule({ capsuleId })

      // Stay on dashboard; generation progress is shown on the capsule card
      toast.message("Capsule is being generated", {
        description: "You can keep browsing — progress will update here.",
      })
      setIsCreatingCapsule(false)
      setSearchQuery("")
    } catch (error) {
      console.error("Failed to create capsule:", error)
      toast.error("Failed to create capsule", {
        description: "Please try again.",
      })
      setIsCreatingCapsule(false)
    }
  }

  const handleCapsuleClick = (capsule: NonNullable<typeof recentCapsules>[number]) => {
    if (capsule.status !== "completed" && capsule.status !== "failed") {
      toast.message("Capsule is still being generated", {
        description: "Please wait a bit and try again.",
      })
      return
    }

    router.push(`/capsule/${capsule._id}`)
  }

  const handleActionClick = (title: string) => {
    if (title === "Link") {
      setLinkDialogOpen(true)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col md:min-h-screen">
      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add YouTube Link</DialogTitle>
            <DialogDescription>
              Paste a YouTube video URL to start learning
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLinkSubmit()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLinkSubmit}>
                Start Learning
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 md:py-16">
        {/* Header with greeting */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-medium text-foreground md:text-3xl lg:text-4xl">
            What should we learn, <span className="text-foreground">User</span>?
          </h1>
        </div>

        {/* Action buttons */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          {actionButtons.map((action) => (
            <Button
              key={action.title}
              variant="outline"
              className="relative h-auto flex-col gap-1 px-6 py-4 hover:bg-muted"
              onClick={() => handleActionClick(action.title)}
            >
              {action.popular && (
                <Badge className="absolute -right-2 -top-2 bg-green-500 text-white hover:bg-green-500">
                  Popular
                </Badge>
              )}
              <action.icon className="size-5 text-muted-foreground" />
              <span className="font-medium">{action.title}</span>
              <span className="text-xs text-muted-foreground">
                {action.description}
              </span>
            </Button>
          ))}
        </div>

        {/* Search input */}
        <div className="mb-12 w-full max-w-xl">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Input
              type="text"
              placeholder="Enter a topic to learn or paste YouTube link..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isCreatingCapsule}
              className="h-12 rounded-full border-muted bg-muted/50 px-5 pr-12 text-base placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isCreatingCapsule || !searchQuery.trim()}
              className="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full"
            >
              {isCreatingCapsule ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </form>
          {isCreatingCapsule && (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Creating your learning capsule...
            </p>
          )}
        </div>

        {/* Recent Activities section */}
        <div className="w-full max-w-4xl">
          <div className="mb-4 flex items-center gap-4">
            <h2 className="text-lg font-semibold">Recent Activities</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Recent Capsules */}
            {recentCapsules?.map((capsule) => (
              <button
                key={String(capsule._id)}
                type="button"
                onClick={() => handleCapsuleClick(capsule)}
                className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-xl h-full"
              >
                <Card className="overflow-hidden cursor-pointer transition-colors hover:bg-muted/50 h-full flex flex-col pt-0">
                  {/* Thumbnail area - mimicking video card style */}
                  <div className="relative w-full h-32 shrink-0 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <BookOpen className="size-10 text-primary/40" />
                  </div>

                  <CardContent className="p-4 flex flex-col flex-1">
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-2">{capsule.title}</p>
                      {capsule.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {capsule.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {capsule.moduleCount} modules • {capsule.lessonCount} lessons
                      </p>

                      {capsule.status !== "completed" && capsule.status !== "failed" && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {capsule.status === "generating_outline"
                              ? "Creating course outline..."
                              : `Generating content... Module ${(capsule.generation?.modulesGenerated ?? 0) + 1} of ${capsule.generation?.totalModules || "?"}`}
                          </p>
                          <Progress
                            value={
                              capsule.status === "generating_outline"
                                ? 10
                                : Math.round(
                                  ((capsule.generation?.modulesGenerated ?? 0) /
                                    Math.max(capsule.generation?.totalModules ?? 1, 1)) *
                                  100
                                )
                            }
                          />
                        </div>
                      )}

                      {capsule.status === "failed" && (
                        <p className="mt-2 text-xs text-destructive">Generation failed</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}

            {/* Recent Videos */}
            {recentVideos?.map((video) => (
              <VideoCard key={String(video._id)} video={video} />
            ))}

            {/* Empty state */}
            {(!recentCapsules || recentCapsules.length === 0) && (!recentVideos || recentVideos.length === 0) && (
              <Card className="col-span-full">
                <CardContent className="flex h-32 flex-col items-center justify-center gap-2 p-6">
                  <span className="text-sm text-muted-foreground">
                    No recent activities. Enter a topic above to start learning!
                  </span>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
