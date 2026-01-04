"use client"

/* eslint-disable @next/next/no-img-element */

import * as React from "react"
import Link from "next/link"
import { useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type ListedVideo = {
  _id: string
  videoId: string
  title: string
  channelTitle?: string
  thumbnail?: string
  duration?: string
  chapterCount: number
  hasTranscript: boolean
  hasNotes: boolean
  hasQuiz: boolean
}

function buildLearnHref(videoId: string) {
  // Learn page accepts either a full URL or the raw YouTube ID.
  return `/learn?v=${encodeURIComponent(videoId)}`
}

function buildYouTubeThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`
}

export default function YtLearningPage() {
  const videos = useQuery(api.videos.listVideos, { limit: 100 }) as
    | ListedVideo[]
    | undefined

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">YT Learning</h1>
          <p className="text-sm text-muted-foreground">
            Your previously added videos
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href="/dashboard">Add a video</Link>
        </Button>
      </div>

      {videos === undefined ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="overflow-hidden">
              <div className="aspect-video">
                <Skeleton className="h-full w-full" />
              </div>
              <CardHeader className="gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No videos yet</CardTitle>
            <CardDescription>
              Add a YouTube link from the dashboard to start learning.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos
            .filter((video) => Boolean(video.videoId))
            .map((video) => {
              const learnHref = buildLearnHref(video.videoId)
              const fallbackThumbnail = buildYouTubeThumbnailUrl(video.videoId)
              return (
                <Link
                  key={String(video._id)}
                  href={learnHref}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-xl"
                  aria-label={`Open ${video.title}`}
                >
                  <Card className="overflow-hidden cursor-pointer transition-colors hover:bg-muted/50 pt-0">
                    <div className="relative w-full h-48 bg-muted">
                      <img
                        src={video.thumbnail || fallbackThumbnail}
                        alt={video.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Hide the broken image and show placeholder
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      {/* Fallback placeholder shown behind the image */}
                      <div className="absolute inset-0 flex items-center justify-center bg-muted -z-10">
                        <svg
                          className="w-12 h-12 text-muted-foreground/50"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>

                    <CardHeader className="gap-1">
                      <CardTitle className="line-clamp-2">{video.title}</CardTitle>
                      {video.channelTitle ? (
                        <CardDescription className="truncate">
                          {video.channelTitle}
                        </CardDescription>
                      ) : null}
                    </CardHeader>

                    <CardContent className="flex flex-wrap gap-2">
                      {video.duration ? (
                        <Badge variant="outline">{video.duration}</Badge>
                      ) : null}
                      {video.chapterCount > 0 ? (
                        <Badge variant="secondary">{video.chapterCount} chapters</Badge>
                      ) : null}
                      {video.hasTranscript ? (
                        <Badge variant="outline">Transcript</Badge>
                      ) : null}
                      {video.hasNotes ? <Badge variant="outline">Notes</Badge> : null}
                      {video.hasQuiz ? <Badge variant="outline">Quiz</Badge> : null}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
        </div>
      )}
    </div>
  )
}
