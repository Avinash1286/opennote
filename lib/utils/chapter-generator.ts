/**
 * Chapter Generator Utility
 * 
 * Automatically generates chapters from transcript segments with timestamps.
 * Groups segments into logical time-based chunks and creates chapter markers.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface Chapter {
  time: string;
  timeInSeconds: number;
  title: string;
  content: string;
}

interface ChapterConfig {
  /** Target duration for each chapter in seconds (default: 180 = 3 minutes) */
  targetChapterDuration?: number;
  /** Minimum duration for a chapter in seconds (default: 60 = 1 minute) */
  minChapterDuration?: number;
  /** Maximum duration for a chapter in seconds (default: 300 = 5 minutes) */
  maxChapterDuration?: number;
  /** Maximum number of chapters to generate (default: 20) */
  maxChapters?: number;
  /** Minimum segments needed to form a chapter (default: 3) */
  minSegmentsPerChapter?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Formats seconds into a timestamp string (e.g., "1:23" or "1:23:45")
 */
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Extracts key terms from text for chapter title generation
 */
function extractKeyTerms(text: string): string[] {
  // Remove common filler words and extract meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'going', 'that', 'this', 'these', 'those', 'it', 'its', "it's",
    'you', 'your', "you're", 'we', 'our', 'they', 'their', 'i', 'me', 'my',
    'so', 'if', 'then', 'than', 'when', 'where', 'what', 'which', 'who',
    'how', 'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'not', 'only', 'same', 'just', 'also',
    'very', 'really', 'actually', 'basically', 'essentially', 'simply',
    'like', 'know', 'think', 'want', 'get', 'got', 'make', 'see', 'look',
    'come', 'take', 'give', 'go', 'say', 'said', 'tell', 'told', 'ask',
    'now', 'here', 'there', 'about', 'into', 'over', 'after', 'before',
    'between', 'under', 'again', 'further', 'once', 'during', 'while',
    'um', 'uh', 'ah', 'oh', 'well', 'okay', 'right', 'yeah', 'yes', 'no'
  ]);
  
  // Split into words and filter
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  // Count word frequency
  const wordCount = new Map<string, number>();
  for (const word of words) {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  }
  
  // Sort by frequency and return top terms
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Generates a chapter title from segment content
 */
function generateChapterTitle(segments: TranscriptSegment[], chapterIndex: number): string {
  // Combine all text from segments
  const combinedText = segments.map(s => s.text).join(' ');
  
  // Extract key terms
  const keyTerms = extractKeyTerms(combinedText);
  
  if (keyTerms.length === 0) {
    return `Part ${chapterIndex + 1}`;
  }
  
  // Capitalize first letter of each term
  const capitalizedTerms = keyTerms.slice(0, 3).map(term => 
    term.charAt(0).toUpperCase() + term.slice(1)
  );
  
  return capitalizedTerms.join(' & ');
}

/**
 * Creates a content summary from segments
 */
function generateChapterContent(segments: TranscriptSegment[]): string {
  // Get first few sentences as content preview
  const combinedText = segments.map(s => s.text).join(' ');
  
  // Split into sentences and take first 2-3
  const sentences = combinedText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const preview = sentences.slice(0, 2).join('. ').trim();
  
  // Truncate if too long
  if (preview.length > 200) {
    return preview.slice(0, 197) + '...';
  }
  
  return preview || combinedText.slice(0, 150);
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Generates chapters from transcript segments with timestamps
 * 
 * @param segments - Array of transcript segments with start times and durations
 * @param config - Optional configuration for chapter generation
 * @returns Array of generated chapters
 * 
 * @example
 * const chapters = generateChaptersFromSegments(segments);
 * // Returns: [{ time: "0:00", timeInSeconds: 0, title: "Introduction", content: "..." }, ...]
 */
export function generateChaptersFromSegments(
  segments: TranscriptSegment[],
  config: ChapterConfig = {}
): Chapter[] {
  if (!segments || segments.length === 0) {
    return [];
  }
  
  const {
    targetChapterDuration = 180, // 3 minutes
    minChapterDuration = 60,     // 1 minute
    maxChapterDuration = 300,    // 5 minutes
    maxChapters = 20,
    minSegmentsPerChapter = 3,
  } = config;
  
  // Sort segments by start time
  const sortedSegments = [...segments].sort((a, b) => a.start - b.start);
  
  // Calculate total video duration
  const lastSegment = sortedSegments[sortedSegments.length - 1];
  const totalDuration = lastSegment.start + lastSegment.duration;
  
  // For very short videos (< 3 minutes), don't create chapters
  if (totalDuration < minChapterDuration * 2) {
    return [];
  }
  
  // Calculate optimal number of chapters based on video length
  const idealChapterCount = Math.min(
    maxChapters,
    Math.max(2, Math.floor(totalDuration / targetChapterDuration))
  );
  
  const chapters: Chapter[] = [];
  let currentChapterSegments: TranscriptSegment[] = [];
  let chapterStartTime = 0;
  
  for (let i = 0; i < sortedSegments.length; i++) {
    const segment = sortedSegments[i];
    currentChapterSegments.push(segment);
    
    const currentDuration = segment.start + segment.duration - chapterStartTime;
    const isLastSegment = i === sortedSegments.length - 1;
    const hasEnoughSegments = currentChapterSegments.length >= minSegmentsPerChapter;
    const reachedTargetDuration = currentDuration >= targetChapterDuration;
    const exceededMaxDuration = currentDuration >= maxChapterDuration;
    const hasEnoughChapters = chapters.length >= idealChapterCount - 1;
    
    // Decide if we should create a chapter break
    const shouldCreateChapter = 
      isLastSegment || 
      (hasEnoughSegments && (reachedTargetDuration || exceededMaxDuration)) ||
      (hasEnoughSegments && !hasEnoughChapters && reachedTargetDuration);
    
    if (shouldCreateChapter && currentChapterSegments.length > 0) {
      // Create chapter
      const chapter: Chapter = {
        time: formatTimestamp(chapterStartTime),
        timeInSeconds: Math.floor(chapterStartTime),
        title: generateChapterTitle(currentChapterSegments, chapters.length),
        content: generateChapterContent(currentChapterSegments),
      };
      
      chapters.push(chapter);
      
      // Reset for next chapter
      if (!isLastSegment) {
        chapterStartTime = sortedSegments[i + 1]?.start || segment.start + segment.duration;
        currentChapterSegments = [];
      }
      
      // Stop if we've reached max chapters (keep last one for remaining content)
      if (chapters.length >= maxChapters) {
        break;
      }
    }
  }
  
  // Ensure first chapter starts at 0:00
  if (chapters.length > 0 && chapters[0].timeInSeconds > 0) {
    chapters[0].time = '0:00';
    chapters[0].timeInSeconds = 0;
  }
  
  return chapters;
}

/**
 * Checks if the description already contains chapters
 */
export function hasChaptersInDescription(description: string): boolean {
  if (!description) return false;
  
  // Look for timestamp patterns like "0:00", "1:23", "12:34", "1:23:45"
  const timestampPattern = /(?:^|\n)\s*(?:\d+:)?\d+:\d+\s*[-–]\s*.+/m;
  return timestampPattern.test(description);
}
