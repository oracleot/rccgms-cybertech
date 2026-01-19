"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createEquipment } from "@/app/(dashboard)/equipment/actions"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  createEquipmentSchema,
  type CreateEquipmentInput,
} from "@/lib/validations/equipment"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CategoryOption {
  id: string
  name: string
}

interface EquipmentFormProps {
  className?: string
}

export function EquipmentForm({ className }: EquipmentFormProps) {
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<CreateEquipmentInput>({
    resolver: zodResolver(createEquipmentSchema),
    defaultValues: {
      name: "",
      categoryId: "",
      serialNumber: "",
      model: "",
      manufacturer: "",
      purchaseDate: "",
      purchasePrice: undefined,
      warrantyExpires: "",
      location: "",
      notes: "",
      isBorrowed: false,
    },
  })

  useEffect(() => {
    const loadCategories = async () => {
      setIsLoadingCategories(true)
      const supabase = createClient()
      try {
        const { data, error } = await supabase
          .from("equipment_categories")
          .select("id, name")
          .order("name", { ascending: true })

        if (error) throw error
        const typed = (data as CategoryOption[] | null) || []
        setCategories(typed)

        if (typed.length > 0 && !form.getValues("categoryId")) {
          form.setValue("categoryId", typed[0].id)
        }
      } catch (error) {
        console.error("Error loading categories", error)
        toast.error("Unable to load categories")
      } finally {
        setIsLoadingCategories(false)
      }
    }

    loadCategories()
  }, [form])

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const result = await createEquipment({
          ...values,
          purchasePrice: values.purchasePrice ? Number(values.purchasePrice) : undefined,
        })

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success("Equipment created")
        router.push(`/equipment/${result.data.id}`)
      } catch (error) {
        console.error("Error creating equipment", error)
        toast.error("Failed to save equipment")
      }
    })
  })

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Add equipment</h1>
          <p className="text-muted-foreground">Create a new item in the inventory.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/equipment">Cancel</Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>Basic information about the equipment.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Sony PTZ Camera" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      disabled={isLoadingCategories}
                      value={field.value}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingCategories ? "Loading..." : "Select a category"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial number</FormLabel>
                    <FormControl>
                      <Input placeholder="SN12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="SRG-X400" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer</FormLabel>
                    <FormControl>
                      <Input placeholder="Sony" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Tech closet" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={field.value ?? ""}
                        onChange={(event) => {
                          const value = event.target.value
                          field.onChange(value === "" ? undefined : Number(value))
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warrantyExpires"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warranty expires</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Notes about this item" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isBorrowed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 md:col-span-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Borrowed equipment</FormLabel>
                      <FormDescription>
                        Check this if this equipment is borrowed from someone (e.g., a church member) and needs to be returned to them.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/equipment">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save equipment
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )}
