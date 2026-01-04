import { NextRequest, NextResponse } from 'next/server';
import { 
  fetchTranscript, 
  fetchTranscriptWithTimestamps,
  isValidVideoId, 
  extractVideoId,
  TranscriptFetchError 
} from '@/lib/services/transcript-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/transcript
 * 
 * Fetches a YouTube video transcript using the transcriptapi.com service.
 * 
 * Query Parameters:
 * - v: YouTube video ID or URL (required)
 * - timestamps: Include timestamp segments (optional, default: false)
 * 
 * Example: /api/transcript?v=dQw4w9WgXcQ
 * Example: /api/transcript?v=dQw4w9WgXcQ&timestamps=true
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoIdParam = searchParams.get('v');
    const includeTimestamps = searchParams.get('timestamps') === 'true';
    
    if (!videoIdParam) {
      return NextResponse.json(
        { error: 'Video ID is required. Use: /api/transcript?v=VIDEO_ID' },
        { status: 400 }
      );
    }
    
    // Extract and validate video ID
    const videoId = extractVideoId(videoIdParam);
    if (!videoId || !isValidVideoId(videoId)) {
      return NextResponse.json(
        { error: 'Invalid YouTube video ID format' },
        { status: 400 }
      );
    }
    
    // Fetch transcript - with timestamps if requested
    const result = includeTimestamps 
      ? await fetchTranscriptWithTimestamps(videoId)
      : await fetchTranscript(videoId);
    
    return NextResponse.json({
      success: true,
      videoId: result.videoId,
      language: result.language,
      transcript: result.transcript,
      ...(result.segments && { segments: result.segments }),
      ...(result.metadata && { metadata: result.metadata }),
    });
    
  } catch (error) {
    console.error('[Transcript API] Error:', error);
    
    if (error instanceof TranscriptFetchError) {
      // Map error codes to HTTP status codes
      const statusMap: Record<string, number> = {
        'INVALID_VIDEO_ID': 400,
        'BAD_REQUEST': 400,
        'VALIDATION_ERROR': 422,
        'UNAUTHORIZED': 401,
        'MISSING_API_KEY': 500,
        'PAYMENT_REQUIRED': 402,
        'NOT_FOUND': 404,
        'TIMEOUT': 408,
        'RATE_LIMITED': 429,
        'SERVICE_UNAVAILABLE': 503,
        'SERVER_ERROR': 500,
      };
      
      const status = statusMap[error.code] || 500;
      
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          videoId: error.videoId,
        },
        { status }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch transcript' },
      { status: 500 }
    );
  }
}
