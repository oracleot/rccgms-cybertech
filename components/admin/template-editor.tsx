"use client"

import { useState, useEffect } from "react"
import { Loader2, Save, RotateCcw, Youtube, Facebook } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

import { YOUTUBE_SYSTEM_PROMPT } from "@/lib/ai/prompts/youtube"
import { FACEBOOK_SYSTEM_PROMPT } from "@/lib/ai/prompts/facebook"

interface Template {
  id?: string
  systemPrompt: string
  updatedAt?: string
}

interface Templates {
  youtube: Template | null
  facebook: Template | null
}

export function TemplateEditor() {
  const [templates, setTemplates] = useState<Templates>({
    youtube: null,
    facebook: null,
  })
  const [youtubePrompt, setYoutubePrompt] = useState(YOUTUBE_SYSTEM_PROMPT)
  const [facebookPrompt, setFacebookPrompt] = useState(FACEBOOK_SYSTEM_PROMPT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<"youtube" | "facebook" | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/livestream/templates")
      if (!response.ok) {
        throw new Error("Failed to fetch templates")
      }

      const data = await response.json()
      setTemplates(data.templates)
      
      if (data.templates.youtube?.systemPrompt) {
        setYoutubePrompt(data.templates.youtube.systemPrompt)
      }
      if (data.templates.facebook?.systemPrompt) {
        setFacebookPrompt(data.templates.facebook.systemPrompt)
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
      // Use defaults
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (platform: "youtube" | "facebook") => {
    const systemPrompt = platform === "youtube" ? youtubePrompt : facebookPrompt
    
    if (systemPrompt.length < 100) {
      toast.error("Template must be at least 100 characters")
      return
    }

    setSaving(platform)
    try {
      const response = await fetch("/api/livestream/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, systemPrompt }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to save template")
      }

      const data = await response.json()
      setTemplates((prev) => ({
        ...prev,
        [platform]: data.template,
      }))
      
      toast.success(`${platform === "youtube" ? "YouTube" : "Facebook"} template saved!`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save template")
    } finally {
      setSaving(null)
    }
  }

  const handleReset = (platform: "youtube" | "facebook") => {
    if (platform === "youtube") {
      setYoutubePrompt(YOUTUBE_SYSTEM_PROMPT)
    } else {
      setFacebookPrompt(FACEBOOK_SYSTEM_PROMPT)
    }
    toast.info("Template reset to default. Click Save to apply.")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Tabs defaultValue="youtube" className="space-y-4">
      <TabsList>
        <TabsTrigger value="youtube" className="gap-2">
          <Youtube className="h-4 w-4 text-red-500" />
          YouTube
        </TabsTrigger>
        <TabsTrigger value="facebook" className="gap-2">
          <Facebook className="h-4 w-4 text-blue-600" />
          Facebook
        </TabsTrigger>
      </TabsList>

      <TabsContent value="youtube">
        <Card>
          <CardHeader>
            <CardTitle>YouTube System Prompt</CardTitle>
            <CardDescription>
              This prompt is used when generating YouTube video descriptions.
              Include placeholders like {"{serviceType}"}, {"{title}"}, {"{speaker}"}, etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={youtubePrompt}
              onChange={(e) => setYoutubePrompt(e.target.value)}
              rows={15}
              className="font-mono text-sm"
              placeholder="Enter the system prompt for YouTube descriptions..."
            />
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => handleReset("youtube")}
                disabled={saving !== null}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Default
              </Button>
              <Button
                onClick={() => handleSave("youtube")}
                disabled={saving !== null}
              >
                {saving === "youtube" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
            {templates.youtube?.updatedAt && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(templates.youtube.updatedAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="facebook">
        <Card>
          <CardHeader>
            <CardTitle>Facebook System Prompt</CardTitle>
            <CardDescription>
              This prompt is used when generating Facebook post descriptions.
              Keep content shorter for better engagement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={facebookPrompt}
              onChange={(e) => setFacebookPrompt(e.target.value)}
              rows={15}
              className="font-mono text-sm"
              placeholder="Enter the system prompt for Facebook descriptions..."
            />
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => handleReset("facebook")}
                disabled={saving !== null}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Default
              </Button>
              <Button
                onClick={() => handleSave("facebook")}
                disabled={saving !== null}
              >
                {saving === "facebook" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
            {templates.facebook?.updatedAt && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(templates.facebook.updatedAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
