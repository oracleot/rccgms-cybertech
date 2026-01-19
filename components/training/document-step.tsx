"use client"

import { ExternalLink, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface DocumentStepProps {
  documentUrl: string
  title: string
  description?: string | null
}

export function DocumentStep({ documentUrl, title, description }: DocumentStepProps) {
  // Determine if it's a Google Doc, PDF, or other document type
  const isGoogleDoc = documentUrl.includes("docs.google.com")
  const isPdf = documentUrl.toLowerCase().endsWith(".pdf")
  
  // Google Docs can be embedded
  const embedUrl = isGoogleDoc 
    ? documentUrl.replace("/edit", "/preview").replace("/view", "/preview")
    : documentUrl

  const canEmbed = isGoogleDoc || isPdf

  return (
    <div className="space-y-4">
      {canEmbed ? (
        <div className="aspect-[4/3] w-full rounded-lg overflow-hidden border bg-muted">
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full border-0"
          />
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <div className="text-center">
              <h3 className="font-medium text-lg">{title}</h3>
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <Button asChild>
              <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Document
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
      
      {canEmbed && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <a href={documentUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
