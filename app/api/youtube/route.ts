import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/youtube
 * 
 * Fetches YouTube video metadata using the oEmbed API.
 * This doesn't require an API key.
 * 
 * Query Parameters:
 * - v: YouTube video ID (required)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const videoId = searchParams.get("v")

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      )
    }

    // Use YouTube oEmbed API to get basic video info (no API key required)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    
    const response = await fetch(oembedUrl)
    
    if (!response.ok) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      )
    }

    const data = await response.json()
    
    return NextResponse.json({
      id: videoId,
      title: data.title,
      channelTitle: data.author_name,
      thumbnail: data.thumbnail_url,
      // oEmbed doesn't provide these, but we include them for compatibility
      description: null,
      duration: null,
      publishedAt: null,
    })
  } catch (error) {
    console.error("[YouTube API] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch video data" },
      { status: 500 }
    )
  }
}
