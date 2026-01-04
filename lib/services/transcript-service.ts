/**
 * Transcript Service using transcriptapi.com API
 * 
 * API Documentation: https://transcriptapi.com
 * Endpoint: GET /api/v2/youtube/transcript
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  /** Base URL for the transcript API */
  baseUrl: 'https://transcriptapi.com/api/v2/youtube/transcript',
  
  /** Request timeout in milliseconds */
  requestTimeout: 30000,
  
  /** Maximum retry attempts for retryable errors (408, 429, 503) */
  maxRetries: 3,
  
  /** Initial delay for exponential backoff (ms) */
  initialRetryDelay: 1000,
};

// =============================================================================
// TYPES
// =============================================================================

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptSegmentTextOnly {
  text: string;
}

export interface VideoMetadata {
  title?: string | null;
  author_name?: string | null;
  author_url?: string | null;
  thumbnail_url?: string | null;
}

export interface TranscriptResponse {
  video_id: string;
  language: string;
  transcript: TranscriptSegment[] | TranscriptSegmentTextOnly[] | string;
  metadata?: VideoMetadata | null;
}

export interface TranscriptResult {
  videoId: string;
  language: string;
  transcript: string;
  segments?: TranscriptSegment[];
  metadata?: VideoMetadata | null;
}

export interface TranscriptOptions {
  /** Output format: 'json' or 'text'. Default: 'text' */
  format?: 'json' | 'text';
  /** Include timestamps in output. Default: false for text format */
  includeTimestamp?: boolean;
  /** Include video metadata. Default: false */
  sendMetadata?: boolean;
}

export class TranscriptFetchError extends Error {
  public readonly code: string;
  public readonly videoId: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;

  constructor(
    message: string, 
    videoId: string, 
    code: string = 'TRANSCRIPT_FETCH_FAILED',
    statusCode?: number,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'TranscriptFetchError';
    this.videoId = videoId;
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validates a YouTube video ID
 * @param videoId - The video ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidVideoId(videoId: string): boolean {
  // YouTube video IDs are 11 characters, alphanumeric with hyphens and underscores
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

/**
 * Extracts video ID from a YouTube URL or returns the ID if already valid
 * @param input - YouTube URL or video ID
 * @returns The video ID or null if invalid
 */
export function extractVideoId(input: string): string | null {
  if (!input) return null;
  
  // If it's already a valid video ID
  if (isValidVideoId(input)) {
    return input;
  }
  
  // Try to extract from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

// =============================================================================
// API FETCHING
// =============================================================================

/**
 * Parses the error response from the API
 */
function parseErrorResponse(status: number, videoId: string, detail?: string): TranscriptFetchError {
  const errorMessages: Record<number, { message: string; code: string; retryable: boolean }> = {
    400: { message: 'Bad request - invalid parameters', code: 'BAD_REQUEST', retryable: false },
    401: { message: 'Unauthorized - invalid API key', code: 'UNAUTHORIZED', retryable: false },
    402: { message: 'Payment required - insufficient credits', code: 'PAYMENT_REQUIRED', retryable: false },
    404: { message: 'Video not found or no transcript available', code: 'NOT_FOUND', retryable: false },
    408: { message: 'Request timeout - please retry', code: 'TIMEOUT', retryable: true },
    422: { message: 'Invalid YouTube URL or video ID', code: 'VALIDATION_ERROR', retryable: false },
    429: { message: 'Rate limit exceeded - please retry later', code: 'RATE_LIMITED', retryable: true },
    500: { message: 'Server error', code: 'SERVER_ERROR', retryable: false },
    503: { message: 'Service unavailable - please retry', code: 'SERVICE_UNAVAILABLE', retryable: true },
  };
  
  const errorInfo = errorMessages[status] || { 
    message: detail || 'Unknown error occurred', 
    code: 'UNKNOWN_ERROR', 
    retryable: false 
  };
  
  return new TranscriptFetchError(
    detail || errorInfo.message,
    videoId,
    errorInfo.code,
    status,
    errorInfo.retryable
  );
}

/**
 * Sleeps for the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetches a transcript from the transcriptapi.com API
 * 
 * @param videoId - YouTube video ID or URL
 * @param options - Fetch options
 * @returns TranscriptResult with the transcript data
 * @throws TranscriptFetchError if fetching fails
 * 
 * @example
 * const result = await fetchTranscript('dQw4w9WgXcQ');
 * console.log(result.transcript);
 */
export async function fetchTranscript(
  videoId: string,
  options: TranscriptOptions = {}
): Promise<TranscriptResult> {
  // Extract video ID if a URL was provided
  const extractedId = extractVideoId(videoId);
  if (!extractedId) {
    throw new TranscriptFetchError(
      `Invalid video ID or URL: ${videoId}`,
      videoId,
      'INVALID_VIDEO_ID'
    );
  }
  
  const apiKey = process.env.TRANSCRIPT_API_KEY;
  if (!apiKey) {
    throw new TranscriptFetchError(
      'TRANSCRIPT_API_KEY environment variable is not set',
      extractedId,
      'MISSING_API_KEY'
    );
  }
  
  const {
    format = 'text',
    includeTimestamp = false,
    sendMetadata = false,
  } = options;
  
  // Build query parameters
  const params = new URLSearchParams({
    video_url: extractedId,
    format,
    include_timestamp: String(includeTimestamp),
    send_metadata: String(sendMetadata),
  });
  
  const url = `${CONFIG.baseUrl}?${params.toString()}`;
  
  let lastError: TranscriptFetchError | null = null;
  let retryDelay = CONFIG.initialRetryDelay;
  
  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeout);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let detail: string | undefined;
        try {
          const errorBody = await response.json();
          detail = errorBody.detail || errorBody.message;
        } catch {
          // Ignore JSON parsing errors for error response
        }
        
        const error = parseErrorResponse(response.status, extractedId, detail);
        
        // Check if we should retry
        if (error.retryable && attempt < CONFIG.maxRetries) {
          // Check for Retry-After header
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : retryDelay;
          
          console.log(`[TranscriptService] Retrying in ${waitTime}ms (attempt ${attempt + 1}/${CONFIG.maxRetries})`);
          await sleep(waitTime);
          retryDelay *= 2; // Exponential backoff
          lastError = error;
          continue;
        }
        
        throw error;
      }
      
      const data: TranscriptResponse = await response.json();
      
      // Process the response based on format
      let transcriptText: string;
      let segments: TranscriptSegment[] | undefined;
      
      if (typeof data.transcript === 'string') {
        // Text format response
        transcriptText = data.transcript;
      } else if (Array.isArray(data.transcript)) {
        // JSON format response - combine segments into text
        segments = data.transcript as TranscriptSegment[];
        transcriptText = segments.map(seg => seg.text).join(' ');
      } else {
        throw new TranscriptFetchError(
          'Unexpected transcript format in response',
          extractedId,
          'PARSE_ERROR'
        );
      }
      
      return {
        videoId: data.video_id,
        language: data.language,
        transcript: transcriptText,
        segments,
        metadata: data.metadata,
      };
      
    } catch (error) {
      if (error instanceof TranscriptFetchError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TranscriptFetchError(
            'Request timed out',
            extractedId,
            'TIMEOUT',
            408,
            true
          );
        }
        throw new TranscriptFetchError(
          error.message,
          extractedId,
          'NETWORK_ERROR'
        );
      }
      
      throw new TranscriptFetchError(
        'Unknown error occurred',
        extractedId,
        'UNKNOWN_ERROR'
      );
    }
  }
  
  // If we exhausted all retries, throw the last error
  throw lastError || new TranscriptFetchError(
    'Failed to fetch transcript after multiple retries',
    extractedId,
    'MAX_RETRIES_EXCEEDED'
  );
}

/**
 * Fetches transcript with metadata included
 * 
 * @param videoId - YouTube video ID or URL
 * @returns TranscriptResult with transcript and metadata
 */
export async function fetchTranscriptWithMetadata(
  videoId: string
): Promise<TranscriptResult> {
  return fetchTranscript(videoId, {
    format: 'text',
    includeTimestamp: false,
    sendMetadata: true,
  });
}

/**
 * Fetches transcript with timestamps as segments
 * 
 * @param videoId - YouTube video ID or URL
 * @returns TranscriptResult with segments including timestamps
 */
export async function fetchTranscriptWithTimestamps(
  videoId: string
): Promise<TranscriptResult> {
  return fetchTranscript(videoId, {
    format: 'json',
    includeTimestamp: true,
    sendMetadata: false,
  });
}
