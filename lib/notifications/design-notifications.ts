/**
 * Design Request Notifications
 *
 * Helper functions for sending design request notifications
 */

import React from "react"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTemplatedEmail } from "./email"
import { queueNotification } from "./notification-service"
import { DesignRequestNewEmail } from "@/emails/design-request-new"
import { DesignRequestClaimedEmail } from "@/emails/design-request-claimed"
import { DesignRequestReviewEmail } from "@/emails/design-request-review"
import { DesignRequestCompletedEmail } from "@/emails/design-request-completed"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

interface NewRequestParams {
  requestId: string
  title: string
  type: string
  priority: string
  requesterName: string
  neededBy?: string | null
}

interface ClaimedParams {
  requestId: string
  title: string
  requesterName: string
  requesterEmail: string
  designerName: string
}

interface ReviewParams {
  requestId: string
  title: string
  requesterName: string
  requesterEmail: string
}

interface CompletedParams {
  requestId: string
  title: string
  requesterName: string
  requesterEmail: string
  deliverableUrl: string
}

interface RevisionParams {
  requestId: string
  title: string
  designerName: string
  designerEmail: string
  revisionNotes: string
}

/**
 * Notify team members about a new design request
 */
export async function notifyTeamNewRequest(params: NewRequestParams): Promise<void> {
  const supabase = createAdminClient()

  try {
    // Get all team members (those with profiles)
    const { data: teamMembers, error } = await supabase
      .from("profiles")
      .select("id, email, name")
      .not("email", "is", null)

    if (error || !teamMembers) {
      console.error("Error fetching team members:", error)
      return
    }

    const viewUrl = `${APP_URL}/designs/${params.requestId}`

    // Send email to each team member
    for (const member of teamMembers) {
      if (!member.email) continue

      try {
        // Queue notification for tracking
        await queueNotification({
          userId: member.id,
          type: "design_request_new",
          title: `New Design Request: ${params.title}`,
          body: `A new ${params.type} design has been requested by ${params.requesterName}. Priority: ${params.priority}.`,
          data: {
            requestId: params.requestId,
            requestTitle: params.title,
          },
          channels: ["email"],
        })

        // Send templated email
        await sendTemplatedEmail(
          member.email,
          `🎨 New Design Request: ${params.title}`,
          React.createElement(DesignRequestNewEmail, {
            title: params.title,
            requesterName: params.requesterName,
            requesterEmail: "", // Not needed for team notification
            type: params.type,
            priority: params.priority,
            description: "", // Not included in brief notification
            neededBy: params.neededBy,
            viewUrl,
          })
        )
      } catch (emailError) {
        console.error(`Failed to notify team member ${member.email}:`, emailError)
      }
    }
  } catch (error) {
    console.error("Error in notifyTeamNewRequest:", error)
  }
}

/**
 * Notify requester that their request has been claimed
 */
export async function notifyRequesterClaimed(params: ClaimedParams): Promise<void> {
  try {
    await sendTemplatedEmail(
      params.requesterEmail,
      `👋 Your Design Request Has Been Claimed: ${params.title}`,
      React.createElement(DesignRequestClaimedEmail, {
        requesterName: params.requesterName,
        title: params.title,
        designerName: params.designerName,
        designerEmail: "", // Not needed in this email
      })
    )
  } catch (error) {
    console.error("Error in notifyRequesterClaimed:", error)
  }
}

/**
 * Notify requester that their design is ready for review
 */
export async function notifyRequesterReview(params: ReviewParams): Promise<void> {
  try {
    await sendTemplatedEmail(
      params.requesterEmail,
      `👀 Your Design is Ready for Review: ${params.title}`,
      React.createElement(DesignRequestReviewEmail, {
        requesterName: params.requesterName,
        title: params.title,
        designerName: "The design team",
      })
    )
  } catch (error) {
    console.error("Error in notifyRequesterReview:", error)
  }
}

/**
 * Notify requester that their design is completed with deliverable link
 */
export async function notifyRequesterCompleted(params: CompletedParams): Promise<void> {
  try {
    await sendTemplatedEmail(
      params.requesterEmail,
      `✅ Your Design is Complete: ${params.title}`,
      React.createElement(DesignRequestCompletedEmail, {
        requesterName: params.requesterName,
        title: params.title,
        designerName: "The design team",
        deliverableUrl: params.deliverableUrl,
      })
    )
  } catch (error) {
    console.error("Error in notifyRequesterCompleted:", error)
  }
}

/**
 * Notify designer about revision request
 */
export async function notifyDesignerRevision(params: RevisionParams): Promise<void> {
  try {
    // Send email directly to designer
    await sendTemplatedEmail(
      params.designerEmail,
      `🔄 Revision Requested: ${params.title}`,
      React.createElement(DesignRequestReviewEmail, {
        requesterName: params.designerName,
        title: params.title,
        designerName: "The requester",
      })
    )
  } catch (error) {
    console.error("Error in notifyDesignerRevision:", error)
  }
}
