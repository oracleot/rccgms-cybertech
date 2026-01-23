import * as React from "react"

/* eslint-disable @next/next/no-head-element -- React Email templates use raw <head> elements */

interface DesignRequestClaimedEmailProps {
  requesterName: string
  title: string
  designerName: string
  designerEmail: string
}

/**
 * Email template for when a design request is claimed (sent to requester)
 */
export function DesignRequestClaimedEmail({
  requesterName,
  title,
  designerName,
  designerEmail,
}: DesignRequestClaimedEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Your Design Request Has Been Claimed</title>
      </head>
      <body
        style={{
          backgroundColor: "#f6f9fc",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
          padding: "40px 0",
        }}
      >
        <table
          role="presentation"
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* Header */}
          <tr>
            <td
              style={{
                backgroundColor: "#2563eb",
                padding: "32px 40px",
                textAlign: "center" as const,
              }}
            >
              <h1
                style={{
                  color: "#ffffff",
                  fontSize: "24px",
                  fontWeight: "bold",
                  margin: "0",
                }}
              >
                👋 Your Request Has Been Claimed
              </h1>
            </td>
          </tr>

          {/* Body */}
          <tr>
            <td style={{ padding: "40px" }}>
              <p
                style={{
                  fontSize: "16px",
                  color: "#374151",
                  lineHeight: "1.6",
                  margin: "0 0 24px",
                }}
              >
                Hi {requesterName},
              </p>

              <p
                style={{
                  fontSize: "16px",
                  color: "#374151",
                  lineHeight: "1.6",
                  margin: "0 0 24px",
                }}
              >
                Great news! Your design request has been claimed by a member of our
                team:
              </p>

              {/* Details Card */}
              <table
                role="presentation"
                style={{
                  width: "100%",
                  backgroundColor: "#eff6ff",
                  borderRadius: "8px",
                  marginBottom: "24px",
                  border: "1px solid #bfdbfe",
                }}
              >
                <tr>
                  <td style={{ padding: "24px" }}>
                    <table role="presentation" style={{ width: "100%" }}>
                      <tr>
                        <td style={{ paddingBottom: "12px" }}>
                          <strong style={{ color: "#1d4ed8", fontSize: "12px" }}>
                            YOUR REQUEST
                          </strong>
                          <p
                            style={{
                              color: "#1e40af",
                              fontSize: "16px",
                              margin: "4px 0 0",
                              fontWeight: "bold",
                            }}
                          >
                            {title}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong style={{ color: "#1d4ed8", fontSize: "12px" }}>
                            ASSIGNED TO
                          </strong>
                          <p
                            style={{
                              color: "#1e40af",
                              fontSize: "14px",
                              margin: "4px 0 0",
                            }}
                          >
                            {designerName}
                          </p>
                          <a
                            href={`mailto:${designerEmail}`}
                            style={{
                              color: "#2563eb",
                              fontSize: "14px",
                            }}
                          >
                            {designerEmail}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p
                style={{
                  fontSize: "16px",
                  color: "#374151",
                  lineHeight: "1.6",
                  margin: "0 0 24px",
                }}
              >
                The designer will now begin working on your request. You&apos;ll receive
                another email when the design is ready for your review.
              </p>

              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  lineHeight: "1.6",
                  margin: "0",
                }}
              >
                If you have any questions or need to provide additional details,
                please reply to this email or contact the designer directly.
              </p>
            </td>
          </tr>

          {/* Footer */}
          <tr>
            <td
              style={{
                backgroundColor: "#f9fafb",
                padding: "24px 40px",
                textAlign: "center" as const,
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  color: "#9ca3af",
                  margin: "0",
                }}
              >
                This email was sent by Cyber Tech.
                <br />
                You received this because you submitted a design request.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}
