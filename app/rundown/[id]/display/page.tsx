import { notFound } from "next/navigation"
import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { DisplayViewClient } from "./_components/display-view-client"
import { DEFAULT_DISPLAY_SETTINGS } from "@/types/settings"
import type { RundownItemForDisplay } from "@/types/rundown"
import type { DisplaySettingsWithDefaults } from "@/types/settings"

interface DisplayPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: DisplayPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: rundown } = await supabase
    .from("rundowns")
    .select("title")
    .eq("id", id)
    .single()

  const rundownData = rundown as { title: string } | null

  return {
    title: rundownData?.title
      ? `Display: ${rundownData.title} | Cyber Tech`
      : "Display | Cyber Tech",
    description: "Extended display for service rundown projection",
    // PWA metadata for fullscreen capability
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
    },
  }
}

export default async function DisplayPage({ params }: DisplayPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch rundown with items and songs
  const { data: rundown, error: rundownError } = await supabase
    .from("rundowns")
    .select(`
      id,
      title,
      date,
      service:services(id, name),
      items:rundown_items(
        id,
        order,
        type,
        title,
        duration_seconds,
        notes,
        song_id,
        song:songs(id, title, lyrics, key)
      )
    `)
    .eq("id", id)
    .single()

  if (rundownError || !rundown) {
    notFound()
  }

  // Get the current user's display settings
  const { data: { user } } = await supabase.auth.getUser()
  
  let displaySettings: DisplaySettingsWithDefaults = {
    ...DEFAULT_DISPLAY_SETTINGS,
    profileId: "",
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    if (profile) {
      const profileData = profile as { id: string }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- display_settings table not in generated types
      const supabaseAny = supabase as any
      const { data: settings } = await supabaseAny
        .from("display_settings")
        .select("*")
        .eq("profile_id", profileData.id)
        .single()

      if (settings) {
        displaySettings = {
          id: settings.id,
          profileId: settings.profile_id,
          fontSize: settings.font_size,
          fontFamily: settings.font_family as DisplaySettingsWithDefaults["fontFamily"],
          backgroundColor: settings.background_color,
          textColor: settings.text_color,
          logoUrl: settings.logo_url,
          transitionEffect: settings.transition_effect as DisplaySettingsWithDefaults["transitionEffect"],
          createdAt: settings.created_at,
          updatedAt: settings.updated_at,
        }
      } else {
        displaySettings.profileId = profileData.id
      }
    }
  }

  // Transform items to the display format
  const typedRundown = rundown as {
    id: string
    title: string
    date: string
    service: { id: string; name: string | null } | null
    items: Array<{
      id: string
      order: number
      type: string
      title: string
      duration_seconds: number | null
      notes: string | null
      song_id: string | null
      song: {
        id: string
        title: string
        lyrics: string | null
        key: string | null
      } | null
    }>
  }

  const items: RundownItemForDisplay[] = (typedRundown.items || [])
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      id: item.id,
      order: item.order,
      type: item.type as RundownItemForDisplay["type"],
      title: item.title,
      durationSeconds: item.duration_seconds || 0,
      notes: item.notes,
      song: item.song
        ? {
            id: item.song.id,
            title: item.song.title,
            lyrics: item.song.lyrics,
            key: item.song.key,
          }
        : undefined,
    }))

  return (
    <DisplayViewClient
      rundownId={typedRundown.id}
      items={items}
      settings={displaySettings}
      serviceName={typedRundown.service?.name || null}
    />
  )
}
