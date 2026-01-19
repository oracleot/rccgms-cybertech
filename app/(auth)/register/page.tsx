import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/constants"

/**
 * Registration is disabled - this is an invite-only application.
 * Users can only join via admin invitation.
 * 
 * This page acts as a fallback redirect in case middleware doesn't catch
 * the request (e.g., direct server-side navigation).
 */
export default function RegisterPage() {
  redirect(ROUTES.LOGIN)
}
