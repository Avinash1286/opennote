"use client"

import { cn } from "@/lib/utils"
import { Lightbulb, Zap, AlertTriangle } from "lucide-react"
import type { HighlightBox } from "@/lib/notes/types"

interface HighlightCardProps {
  highlight: HighlightBox
}

const highlightStyles = {
  insight: {
    icon: Lightbulb,
    containerClasses: "bg-accent/10 border-accent/20",
    iconClasses: "text-accent",
  },
  important: {
    icon: Zap,
    containerClasses: "bg-yellow-400/10 border-yellow-400/20",
    iconClasses: "text-yellow-500 dark:text-yellow-400",
  },
  warning: {
    icon: AlertTriangle,
    containerClasses: "bg-destructive/10 border-destructive/20",
    iconClasses: "text-destructive",
  },
}

export function HighlightCard({ highlight }: HighlightCardProps) {
  const styles = highlightStyles[highlight.type]
  const Icon = styles.icon

  return (
    <div
      className={cn(
        "my-5 flex items-start gap-4 rounded-lg border p-4",
        styles.containerClasses
      )}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0", styles.iconClasses)} />
      <div>
        {highlight.title && (
          <h4 className="mb-1 font-semibold">{highlight.title}</h4>
        )}
        <p className="text-sm leading-relaxed text-muted-foreground">
          {highlight.content}
        </p>
      </div>
    </div>
  )
}
