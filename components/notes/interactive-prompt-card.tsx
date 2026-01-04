"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Lightbulb, Wrench, CheckSquare, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { InteractivePrompt } from "@/lib/notes/types"

interface InteractivePromptCardProps {
  prompt: InteractivePrompt
}

const promptConfig = {
  "thought-experiment": {
    icon: Lightbulb,
    className:
      "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30",
    headerClassName: "text-amber-600 dark:text-amber-400",
  },
  "hands-on": {
    icon: Wrench,
    className:
      "bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30",
    headerClassName: "text-indigo-600 dark:text-indigo-400",
  },
  "self-check": {
    icon: CheckSquare,
    className:
      "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30",
    headerClassName: "text-emerald-600 dark:text-emerald-400",
  },
}

export function InteractivePromptCard({ prompt }: InteractivePromptCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const config = promptConfig[prompt.type]
  const Icon = config.icon

  return (
    <div className={cn("my-6 rounded-xl border p-5", config.className)}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-5 w-5", config.headerClassName)} />
        <h4 className={cn("font-semibold", config.headerClassName)}>
          {prompt.title}
        </h4>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-xs font-medium",
            config.headerClassName,
            "bg-white/50 dark:bg-black/20"
          )}
        >
          {prompt.type.replace("-", " ")}
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{prompt.prompt}</p>
      {prompt.steps && prompt.steps.length > 0 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-xs"
          >
            {isExpanded ? "Hide Steps" : "Show Steps"}
            <ChevronDown
              className={cn(
                "ml-1 h-3 w-3 transition-transform",
                isExpanded && "rotate-180"
              )}
            />
          </Button>
          {isExpanded && (
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              {prompt.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium",
                      config.headerClassName,
                      "bg-white/50 dark:bg-black/20"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  )
}
