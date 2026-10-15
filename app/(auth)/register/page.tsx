import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/constants"

/**
 * Legacy /register path redirects to the new /signup page.
 * Fallback in case middleware doesn't catch the request.
 */
export default function RegisterPage() {
  redirect(ROUTES.SIGNUP)
}
