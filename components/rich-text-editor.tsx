"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const editorRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const editor = editorRef.current
    if (editor && editor.innerHTML !== value) editor.innerHTML = value
  }, [value])

  function command(name: string) {
    document.execCommand(name)
    onChange(editorRef.current?.innerHTML ?? "")
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex flex-wrap gap-1 border-b bg-muted/40 p-2">
        {[
          ["bold", "粗体"],
          ["italic", "斜体"],
          ["underline", "下划线"],
          ["insertUnorderedList", "无序列表"],
          ["insertOrderedList", "有序列表"],
        ].map(([name, label]) => (
          <Button
            key={name}
            type="button"
            size="sm"
            variant="ghost"
            onMouseDown={(event) => {
              event.preventDefault()
              command(name)
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-label="公告内容"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        className="min-h-48 px-3 py-2 text-sm outline-none"
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  )
}
