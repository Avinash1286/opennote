// =============================================================================
// INTERACTIVE NOTES TYPES
// =============================================================================

// Callout types for informational boxes
export interface CalloutSection {
  type: "tip" | "example" | "note" | "common-mistake"
  title?: string
  content: string
  bullets?: string[]
}

// Code block with syntax highlighting
export interface CodeBlock {
  code: string
  language: string
  title?: string
}

// Highlight boxes for emphasis
export interface HighlightBox {
  type: "insight" | "important" | "warning"
  title?: string
  content: string
}

// Definition cards with term explanations
export interface DefinitionCard {
  term: string
  definition: string
  example?: string
}

// Interactive learning prompts
export interface InteractivePrompt {
  type: "thought-experiment" | "hands-on" | "self-check"
  title: string
  prompt: string
  steps?: string[]
}

// Section-level quiz question
export interface SectionQuiz {
  type: "mcq" | "true-false" | "fill-blank"
  question: string
  options?: string[] // Only for MCQ
  correctAnswer: string
  explanation: string
}

// Complete section structure
export interface NoteSection {
  title: string
  introHook?: string
  content: string
  microSummary?: string
  keyPoints?: string[]
  examples?: string[]
  callouts?: CalloutSection[]
  codeBlocks?: CodeBlock[]
  highlights?: HighlightBox[]
  definitions?: DefinitionCard[]
  interactivePrompts?: InteractivePrompt[]
  reflectionQuestions?: string[]
  quiz?: SectionQuiz[]
}

// Full interactive notes structure
export interface InteractiveNotes {
  topic: string
  learningObjectives?: string[]
  summary?: {
    recap: string
    nextSteps?: string[]
    keyTakeaway?: string
  }
  sections: NoteSection[]
}
