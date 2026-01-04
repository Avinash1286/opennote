"use client"

import { cn } from "@/lib/utils"
import {
  Lightbulb,
  AlertTriangle,
  FileText,
  CircleDot,
} from "lucide-react"
import type { CalloutSection } from "@/lib/notes/types"

interface CalloutCardProps {
  callout: CalloutSection
}

const calloutConfig = {
  tip: {
    icon: Lightbulb,
    title: "Tip",
    className:
      "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800",
    headerClassName: "text-purple-700 dark:text-purple-300",
  },
  example: {
    icon: CircleDot,
    title: "Example",
    className:
      "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
    headerClassName: "text-green-700 dark:text-green-300",
  },
  note: {
    icon: FileText,
    title: "Note",
    className:
      "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
    headerClassName: "text-blue-700 dark:text-blue-300",
  },
  "common-mistake": {
    icon: AlertTriangle,
    title: "Common Mistake",
    className:
      "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
    headerClassName: "text-red-700 dark:text-red-300",
  },
}

export function CalloutCard({ callout }: CalloutCardProps) {
  const config = calloutConfig[callout.type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "my-6 rounded-xl border-l-4 p-4",
        config.className
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("h-6 w-6", config.headerClassName)} />
        <h4 className={cn("font-semibold", config.headerClassName)}>
          {callout.title || config.title}
        </h4>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{callout.content}</p>
      {callout.bullets && callout.bullets.length > 0 && (
        <ul className="mt-3 space-y-1">
          {callout.bullets.map((bullet, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <div
                className={cn(
                  "mt-1.5 h-1.5 w-1.5 rounded-full",
                  config.headerClassName.replace("text-", "bg-")
                )}
              />
              <span className="text-muted-foreground">{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
