"use client"

interface VideoStepProps {
  videoUrl: string
  title: string
}

export function VideoStep({ videoUrl, title }: VideoStepProps) {
  // Handle YouTube URLs
  const getEmbedUrl = (url: string): string => {
    try {
      const urlObj = new URL(url)
      
      // YouTube watch URLs
      if (urlObj.hostname.includes("youtube.com") && urlObj.searchParams.has("v")) {
        const videoId = urlObj.searchParams.get("v")
        return `https://www.youtube.com/embed/${videoId}`
      }
      
      // YouTube short URLs
      if (urlObj.hostname === "youtu.be") {
        const videoId = urlObj.pathname.slice(1)
        return `https://www.youtube.com/embed/${videoId}`
      }
      
      // Vimeo URLs
      if (urlObj.hostname.includes("vimeo.com")) {
        const videoId = urlObj.pathname.split("/").pop()
        return `https://player.vimeo.com/video/${videoId}`
      }
      
      // Return as-is for other embeddable URLs
      return url
    } catch {
      return url
    }
  }

  const embedUrl = getEmbedUrl(videoUrl)

  return (
    <div className="space-y-4">
      <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    </div>
  )
}
