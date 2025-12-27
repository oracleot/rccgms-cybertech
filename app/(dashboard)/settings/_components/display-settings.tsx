"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Monitor, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { useDisplaySettings } from "@/hooks/use-display-settings"
import {
  updateDisplaySettingsSchema,
  type UpdateDisplaySettingsInput,
  fontFamilies,
  transitionEffects,
} from "@/lib/validations/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

export function DisplaySettings() {
  const { settings, isLoading, error, updateSettings } = useDisplaySettings()
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<UpdateDisplaySettingsInput>({
    resolver: zodResolver(updateDisplaySettingsSchema),
    defaultValues: {
      fontSize: 48,
      fontFamily: "Inter",
      backgroundColor: "#000000",
      textColor: "#FFFFFF",
      logoUrl: null,
      transitionEffect: "fade",
    },
  })

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      form.reset({
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        backgroundColor: settings.backgroundColor,
        textColor: settings.textColor,
        logoUrl: settings.logoUrl,
        transitionEffect: settings.transitionEffect,
      })
    }
  }, [settings, form])

  const onSubmit = async (data: UpdateDisplaySettingsInput) => {
    setIsSaving(true)
    try {
      const success = await updateSettings(data)
      if (success) {
        toast.success("Display settings saved")
      } else {
        toast.error("Failed to save display settings")
      }
    } catch {
      toast.error("An error occurred while saving")
    } finally {
      setIsSaving(false)
    }
  }

  const watchedValues = form.watch()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Failed to load display settings</p>
        <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Preview */}
        <div className="rounded-lg overflow-hidden border">
          <div
            className="p-6 flex flex-col items-center justify-center min-h-[160px] transition-all"
            style={{
              backgroundColor: watchedValues.backgroundColor,
              color: watchedValues.textColor,
              fontFamily: watchedValues.fontFamily,
            }}
          >
            <div className="flex items-center gap-2 mb-2 opacity-60">
              <Monitor className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Preview</span>
            </div>
            <p
              className="text-center font-bold"
              style={{ fontSize: Math.min(watchedValues.fontSize, 48) }}
            >
              Sample Title
            </p>
            <p
              className="text-center opacity-70 mt-2"
              style={{ fontSize: Math.max(14, Math.min(watchedValues.fontSize, 48) * 0.5) }}
            >
              This is how your projection will look
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Font Size */}
          <FormField
            control={form.control}
            name="fontSize"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Font Size: {field.value}px</FormLabel>
                <FormControl>
                  <Slider
                    min={24}
                    max={120}
                    step={2}
                    value={[field.value]}
                    onValueChange={([value]) => field.onChange(value)}
                  />
                </FormControl>
                <FormDescription>
                  Adjust the text size for projection (24-120px)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Font Family */}
          <FormField
            control={form.control}
            name="fontFamily"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Font Family</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select font" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fontFamilies.map((font) => (
                      <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Transition Effect */}
          <FormField
            control={form.control}
            name="transitionEffect"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transition Effect</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select transition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {transitionEffects.map((effect) => (
                      <SelectItem key={effect} value={effect} className="capitalize">
                        {effect}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Animation when changing items</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Background Color */}
          <FormField
            control={form.control}
            name="backgroundColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Background Color</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="h-10 w-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Text Color */}
          <FormField
            control={form.control}
            name="textColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Text Color</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="h-10 w-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Logo URL */}
          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Logo URL (optional)</FormLabel>
                <FormControl>
                  <Input
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    placeholder="https://example.com/logo.png"
                  />
                </FormControl>
                <FormDescription>
                  URL to your church logo. Will appear in the corner of the projection.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isSaving}
          >
            Reset
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save settings"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
