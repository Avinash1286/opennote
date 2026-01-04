"use client"

import * as React from "react"
import { Copy, Check, Code } from "lucide-react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { Button } from "@/components/ui/button"
import type { CodeBlock } from "@/lib/notes/types"

interface CodeBlockCardProps {
  codeBlock: CodeBlock
}

export function CodeBlockCard({ codeBlock }: CodeBlockCardProps) {
  const [copied, setCopied] = React.useState(false)

  const copyCode = async () => {
    await navigator.clipboard.writeText(codeBlock.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="relative my-6 overflow-hidden rounded-xl border bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-gray-400" />
          {codeBlock.title && (
            <span className="text-sm text-gray-300">{codeBlock.title}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase text-gray-400">
            {codeBlock.language}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyCode}
            className="h-8 w-8 text-gray-400 hover:text-white"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <SyntaxHighlighter
        language={codeBlock.language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "transparent",
          fontSize: "0.875rem",
        }}
      >
        {codeBlock.code}
      </SyntaxHighlighter>
    </div>
  )
}
