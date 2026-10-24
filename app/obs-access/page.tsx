import { redirect } from "next/navigation"

export default async function ObsAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const destination = next === "/bible/obs/dock" || next === "/lyrics/obs/dock" || next?.startsWith("/lyrics/obs/dock?")
    ? next
    : "/lyrics/obs/dock"
  redirect(destination)
}
