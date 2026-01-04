"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism"
import "katex/dist/katex.min.css"
import {
  Target,
  Sparkles,
  Brain,
} from "lucide-react"
import { CalloutCard } from "./callout-card"
import { CodeBlockCard } from "./code-block-card"
import { DefinitionCard } from "./definition-card"
import { HighlightCard } from "./highlight-card"
import { InteractivePromptCard } from "./interactive-prompt-card"
import { SectionQuizCard } from "./section-quiz-card"
import type { InteractiveNotes, NoteSection } from "@/lib/notes/types"

interface InteractiveNotesProps {
  notes: InteractiveNotes
}

interface SectionComponentProps {
  section: NoteSection
  sectionIndex: number
}

function SectionComponent({ section, sectionIndex }: SectionComponentProps) {
  let quizCounter = 0

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {sectionIndex + 1}
        </span>
        <h2 className="text-xl font-bold">{section.title}</h2>
      </div>

      {/* Section Content */}
      <div className="space-y-6">
          {/* Intro Hook */}
          {section.introHook && (
            <p className="border-l-2 border-primary pl-4 text-sm italic text-primary">
              {section.introHook}
            </p>
          )}

          {/* Main Content with Markdown */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                h1: (props) => (
                  <h1 className="mb-3 mt-4 text-xl font-bold" {...props} />
                ),
                h2: (props) => (
                  <h2 className="mb-2.5 mt-4 text-lg font-semibold" {...props} />
                ),
                h3: (props) => (
                  <h3 className="mb-2 mt-3 text-base font-semibold" {...props} />
                ),
                p: (props) => (
                  <p className="mb-3 leading-relaxed text-muted-foreground" {...props} />
                ),
                ul: (props) => (
                  <ul className="mb-3 ml-4 list-disc space-y-1.5" {...props} />
                ),
                ol: (props) => (
                  <ol className="mb-3 ml-4 list-decimal space-y-1.5" {...props} />
                ),
                blockquote: (props) => (
                  <blockquote
                    className="my-3 border-l-4 border-primary/30 bg-primary/5 py-2 pl-4"
                    {...props}
                  />
                ),
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || "")
                  const language = match ? match[1] : ""
                  const isInline = !className

                  if (!isInline && language) {
                    return (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={language}
                        PreTag="div"
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    )
                  }

                  return (
                    <code
                      className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  )
                },
                table: (props) => (
                  <div className="my-4 overflow-x-auto">
                    <table
                      className="min-w-full divide-y divide-border rounded-lg border"
                      {...props}
                    />
                  </div>
                ),
                th: (props) => (
                  <th
                    className="bg-muted/50 px-4 py-2 text-left text-sm font-semibold"
                    {...props}
                  />
                ),
                td: (props) => (
                  <td
                    className="border-t px-4 py-2 text-sm text-muted-foreground"
                    {...props}
                  />
                ),
              }}
            >
              {section.content}
            </ReactMarkdown>
          </div>

          {/* Key Points */}
          {section.keyPoints && section.keyPoints.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <h4 className="mb-3 flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                Key Points
              </h4>
              <ul className="space-y-2">
                {section.keyPoints.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-primary" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Examples */}
          {section.examples && section.examples.length > 0 && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Examples
              </h4>
              <ul className="space-y-2">
                {section.examples.map((example, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-sm text-muted-foreground"
                  >
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Code Blocks */}
          {section.codeBlocks?.map((codeBlock, i) => (
            <CodeBlockCard key={i} codeBlock={codeBlock} />
          ))}

          {/* Definitions */}
          {section.definitions?.map((def, i) => (
            <DefinitionCard key={i} definition={def} />
          ))}

          {/* Callouts */}
          {section.callouts?.map((callout, i) => (
            <CalloutCard key={i} callout={callout} />
          ))}

          {/* Highlights */}
          {section.highlights?.map((highlight, i) => (
            <HighlightCard key={i} highlight={highlight} />
          ))}

          {/* Interactive Prompts */}
          {section.interactivePrompts?.map((prompt, i) => (
            <InteractivePromptCard key={i} prompt={prompt} />
          ))}

          {/* Section Quiz */}
          {section.quiz?.map((q) => (
            <SectionQuizCard
              key={quizCounter}
              quiz={q}
              questionIndex={quizCounter++}
            />
          ))}

          {/* Reflection Questions */}
          {section.reflectionQuestions &&
            section.reflectionQuestions.length > 0 && (
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-purple-600 dark:text-purple-400">
                  <Brain className="h-4 w-4" />
                  Reflect
                </h4>
                <ul className="space-y-2">
                  {section.reflectionQuestions.map((q, i) => (
                    <li
                      key={i}
                      className="text-sm italic text-muted-foreground"
                    >
                      • {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Micro Summary */}
          {section.microSummary && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm">
                <span className="font-semibold text-primary">TL;DR:</span>{" "}
                <span className="text-muted-foreground">
                  {section.microSummary}
                </span>
              </p>
            </div>
          )}
      </div>
    </div>
  )
}

export function InteractiveNotesComponent({ notes }: InteractiveNotesProps) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">{notes.topic}</h1>
          <p className="text-muted-foreground">
            Comprehensive notes with interactive quiz questions
          </p>
        </div>

        {/* Learning Objectives */}
        {notes.learningObjectives && notes.learningObjectives.length > 0 && (
          <div className="rounded-xl border border-primary/10 bg-primary/5 p-6">
            <div className="mb-4 flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Learning Objectives</h2>
            </div>
            <ul className="grid gap-3 md:grid-cols-2">
              {notes.learningObjectives.map((objective, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">{objective}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-4">
          {notes.sections.map((section, sectionIndex) => (
            <SectionComponent
              key={sectionIndex}
              section={section}
              sectionIndex={sectionIndex}
            />
          ))}
        </div>

        {/* Summary */}
        {notes.summary && (
          <div className="rounded-xl border border-muted bg-muted/40 p-6">
            <h2 className="mb-4 text-lg font-semibold">Session Wrap-up</h2>
            <p className="text-muted-foreground">{notes.summary.recap}</p>
            {notes.summary.keyTakeaway && (
              <div className="mt-4 rounded-lg border-l-4 border-primary bg-primary/10 p-4">
                <p className="font-semibold">
                  💡 Key Takeaway: {notes.summary.keyTakeaway}
                </p>
              </div>
            )}
            {notes.summary.nextSteps && notes.summary.nextSteps.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-medium">🚀 Next Steps:</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {notes.summary.nextSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

    </div>
  )
}
