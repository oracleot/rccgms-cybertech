"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface CopyButtonProps {
  content: string
  title?: string
  label?: string
  className?: string
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
}

export function CopyButton({
  content,
  title,
  label = "Copy All",
  className,
  variant = "outline",
  size = "default",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!content && !title) {
      toast.error("Nothing to copy")
      return
    }

    try {
      // Format with title + description
      const textToCopy = title 
        ? `Title:\n${title}\n\nDescription:\n${content}`
        : content
      
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      toast.success("Copied to clipboard!")
      
      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
      toast.error("Failed to copy to clipboard")
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      disabled={!content && !title}
      className={cn(className)}
    >
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  )
}
