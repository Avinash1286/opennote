"use client"

import * as React from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import {
  Bold,
  Code,
  CodeXml,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MyNotesEditorProps {
  storageKey: string
  placeholder?: string
}

export function MyNotesEditor({
  storageKey,
  placeholder = "Start writing your content... Use the toolbar for formatting.",
}: MyNotesEditorProps) {
  const saveTimerRef = React.useRef<number | null>(null)

  const editor = useEditor(
    {
      // Next.js can render client components during SSR for the initial HTML.
      // Tell TipTap to avoid immediate rendering to prevent hydration mismatches.
      immediatelyRender: false,
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder,
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
        }),
        Image.configure({
          allowBase64: true,
        }),
      ],
      content: "",
      editorProps: {
        attributes: {
          class:
            "tiptap prose prose-sm dark:prose-invert max-w-none focus:outline-none",
        },
      },
      onUpdate: ({ editor }) => {
        if (typeof window === "undefined") return

        const html = editor.getHTML()

        if (saveTimerRef.current) {
          window.clearTimeout(saveTimerRef.current)
          saveTimerRef.current = null
        }

        saveTimerRef.current = window.setTimeout(() => {
          try {
            window.localStorage.setItem(storageKey, html)
          } catch {
            // Ignore quota/storage errors
          }
        }, 400)
      },
    },
    [storageKey]
  )

  // Load persisted content after mount (and when switching videos/storage keys)
  React.useEffect(() => {
    if (!editor) return
    try {
      const saved = window.localStorage.getItem(storageKey) ?? ""
      // Avoid clobbering if the user has already started typing in this session
      if (editor.getText().trim().length === 0 && saved) {
        editor.commands.setContent(saved, { emitUpdate: false })
      }
    } catch {
      // Ignore storage access errors
    }
  }, [editor, storageKey])

  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [])

  if (!editor) {
    return (
      <div className="p-4">
        <div className="h-[calc(100vh-280px)] rounded-lg border border-border/40 bg-muted/10" />
      </div>
    )
  }

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    attrs ? editor.isActive(name, attrs) : editor.isActive(name)

  const toolbarButtonClass = (active: boolean) =>
    cn(
      "text-muted-foreground hover:text-foreground",
      active && "bg-muted text-foreground"
    )

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Enter URL", previousUrl ?? "")

    if (url === null) return
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run()
  }

  const insertImage = () => {
    const url = window.prompt("Image URL")
    if (!url) return
    editor.chain().focus().setImage({ src: url.trim() }).run()
  }

  return (
    <div className="p-4">
      <div className="rounded-xl border border-border/40 bg-background overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-border/40 bg-muted/10">
          <div className="flex flex-wrap items-center gap-1 p-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={toolbarButtonClass(isActive("bold"))}
              onClick={() => editor.chain().focus().toggleBold().run()}
              aria-label="Bold"
            >
              <Bold className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={toolbarButtonClass(isActive("italic"))}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              aria-label="Italic"
            >
              <Italic className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={toolbarButtonClass(isActive("strike"))}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              aria-label="Strikethrough"
            >
              <Strikethrough className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={toolbarButtonClass(isActive("code"))}
              onClick={() => editor.chain().focus().toggleCode().run()}
              aria-label="Inline code"
            >
              <Code className="size-4" />
            </Button>

            <div className="mx-1 h-5 w-px bg-border/60" />

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={toolbarButtonClass(isActive("heading", { level: 1 }))}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              aria-label="Heading 1"
            >
              <Heading1 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={toolbarButtonClass(isActive("heading", { level: 2 }))}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              aria-label="Heading 2"
            >
              <Heading2 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={toolbarButtonClass(isActive("heading", { level: 3 }))}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              aria-label="Heading 3"
            >
              <Heading3 className="size-4" />
            </Button>

            <div className="mx-1 h-5 w-px bg-border/60" />

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={toolbarButtonClass(isActive("bulletList"))}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              aria-label="Bulleted list"
            >
              <List className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={toolbarButtonClass(isActive("orderedList"))}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              aria-label="Numbered list"
            >
              <ListOrdered className="size-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1 px-2 pb-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={toolbarButtonClass(isActive("blockquote"))}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              aria-label="Blockquote"
            >
              <Quote className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={toolbarButtonClass(isActive("codeBlock"))}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              aria-label="Code block"
            >
              <CodeXml className="size-4" />
            </Button>

            <div className="mx-1 h-5 w-px bg-border/60" />

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={toolbarButtonClass(isActive("link"))}
              onClick={setLink}
              aria-label="Link"
            >
              <Link2 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={toolbarButtonClass(false)}
              onClick={insertImage}
              aria-label="Image"
            >
              <ImageIcon className="size-4" />
            </Button>

            <div className="mx-1 h-5 w-px bg-border/60" />

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={toolbarButtonClass(false)}
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              aria-label="Undo"
            >
              <Undo2 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={toolbarButtonClass(false)}
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              aria-label="Redo"
            >
              <Redo2 className="size-4" />
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="p-4 min-h-[calc(100vh-380px)]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
