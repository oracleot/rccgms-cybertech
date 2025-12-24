"use client"

/**
 * AI Caption Generator Component
 */

import { useState } from "react"
import { useCompletion } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Sparkles, Loader2, Copy, Check, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface CaptionGeneratorProps {
  onCaptionGenerated: (caption: string) => void
  initialContext?: string
}

export function CaptionGenerator({
  onCaptionGenerated,
  initialContext = "",
}: CaptionGeneratorProps) {
  const [platform, setPlatform] = useState<string>("facebook")
  const [tone, setTone] = useState<string>("inspirational")
  const [context, setContext] = useState(initialContext)
  const [includeEmojis, setIncludeEmojis] = useState(true)
  const [includeHashtags, setIncludeHashtags] = useState(true)
  const [copied, setCopied] = useState(false)

  const { completion, complete, isLoading } = useCompletion({
    api: "/api/ai/generate-caption",
    onError: (error) => {
      console.error("Caption generation error:", error)
      toast.error("Failed to generate caption. Please try again.")
    },
  })

  async function handleGenerate() {
    if (!context.trim()) {
      toast.error("Please provide some context about the content")
      return
    }

    await complete("", {
      body: {
        platform,
        tone,
        context,
        includeEmojis,
        includeHashtags,
      },
    })
  }

  function handleCopy() {
    if (completion) {
      navigator.clipboard.writeText(completion)
      setCopied(true)
      toast.success("Caption copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleUseCaption() {
    if (completion) {
      onCaptionGenerated(completion)
      toast.success("Caption applied!")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          AI Caption Generator
        </CardTitle>
        <CardDescription>
          Generate engaging captions tailored to each platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Platform selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="twitter">Twitter/X</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone">Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger id="tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inspirational">Inspirational</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Context input */}
        <div className="space-y-2">
          <Label htmlFor="context">Content Context</Label>
          <Textarea
            id="context"
            placeholder="Describe the content, event, or message (e.g., 'Photos from our Sunday worship service featuring the youth choir performing Amazing Grace')"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            The more detail you provide, the better the caption will be
          </p>
        </div>

        {/* Options */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="emojis"
              checked={includeEmojis}
              onCheckedChange={setIncludeEmojis}
            />
            <Label htmlFor="emojis" className="text-sm">
              Include emojis
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="hashtags"
              checked={includeHashtags}
              onCheckedChange={setIncludeHashtags}
            />
            <Label htmlFor="hashtags" className="text-sm">
              Include hashtags
            </Label>
          </div>
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={isLoading || !context.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : completion ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Caption
            </>
          )}
        </Button>

        {/* Generated caption preview */}
        {(completion || isLoading) && (
          <div className="space-y-2">
            <Label>Generated Caption</Label>
            <div className="p-4 bg-muted rounded-lg min-h-[100px]">
              {isLoading && !completion ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Writing your caption...</span>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm">{completion}</p>
              )}
            </div>
            {completion && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{completion.length} characters</span>
                {platform === "twitter" && completion.length > 280 && (
                  <span className="text-destructive">
                    (exceeds 280 character limit)
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {completion && (
        <CardFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button onClick={handleUseCaption} className="flex-1">
            Use this caption
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
