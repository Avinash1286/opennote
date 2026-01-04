"use client"

import { BookOpen, FlaskConical } from "lucide-react"
import type { DefinitionCard as DefinitionCardType } from "@/lib/notes/types"

interface DefinitionCardProps {
  definition: DefinitionCardType
}

export function DefinitionCard({ definition }: DefinitionCardProps) {
  return (
    <div className="my-6 rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 rounded-full bg-primary/10 p-2">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-lg font-bold">{definition.term}</h3>
      </div>
      <div className="mt-4 space-y-4 pl-14">
        <p className="leading-relaxed text-muted-foreground">
          {definition.definition}
        </p>
        {definition.example && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-green-700 dark:text-green-300" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                Example
              </span>
            </div>
            <p className="mt-2 pl-6 text-sm italic text-muted-foreground">
              {definition.example}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
