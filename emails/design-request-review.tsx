import * as React from "react"

/* eslint-disable @next/next/no-head-element */

interface DesignRequestReviewEmailProps {
  requesterName: string
  title: string
  designerName: string
}

/**
 * Email template for when a design is ready for review (sent to requester)
 */
export function DesignRequestReviewEmail({
  requesterName,
  title,
  designerName,
}: DesignRequestReviewEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Your Design is Ready for Review</title>
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
                backgroundColor: "#f59e0b",
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
                👀 Ready for Your Review
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
                Your design is ready for review! {designerName} has completed work
                on your request and would like you to take a look.
              </p>

              {/* Details Card */}
              <table
                role="presentation"
                style={{
                  width: "100%",
                  backgroundColor: "#fffbeb",
                  borderRadius: "8px",
                  marginBottom: "24px",
                  border: "1px solid #fcd34d",
                }}
              >
                <tr>
                  <td style={{ padding: "24px" }}>
                    <table role="presentation" style={{ width: "100%" }}>
                      <tr>
                        <td>
                          <strong style={{ color: "#92400e", fontSize: "12px" }}>
                            YOUR REQUEST
                          </strong>
                          <p
                            style={{
                              color: "#78350f",
                              fontSize: "16px",
                              margin: "4px 0 0",
                              fontWeight: "bold",
                            }}
                          >
                            {title}
                          </p>
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
                <strong>What happens next?</strong>
              </p>

              <ul
                style={{
                  fontSize: "14px",
                  color: "#374151",
                  lineHeight: "1.8",
                  margin: "0 0 24px",
                  paddingLeft: "20px",
                }}
              >
                <li>If you&apos;re happy with the design, the team will mark it as complete and send you the final files.</li>
                <li>If you need changes, simply reply to this email or contact the designer to request revisions.</li>
              </ul>

              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  lineHeight: "1.6",
                  margin: "0",
                }}
              >
                Please review the design and provide feedback as soon as possible
                so we can finalize or make any necessary changes.
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
