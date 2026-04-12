import * as React from "react"
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components"

interface SwapApprovedEmailProps {
  recipientName: string
  otherPartyName: string
  serviceName: string
  serviceDate: string
  positionName: string
  isRequester: boolean
  scheduleUrl: string
}

export function SwapApprovedEmail({
  recipientName = "John Smith",
  otherPartyName = "Jane Doe",
  serviceName = "Sunday Service",
  serviceDate = "Sunday, December 29, 2024",
  positionName = "Camera Operator",
  isRequester = true,
  scheduleUrl = "https://cybertech.church/rota/my-schedule",
}: SwapApprovedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Your duty swap has been approved
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={iconContainer}>
            <Text style={checkIcon}>✓</Text>
          </Section>

          <Heading style={heading}>Swap Approved!</Heading>
          
          <Text style={text}>
            Hi {recipientName},
          </Text>
          
          <Text style={text}>
            Great news! Your duty swap with <strong>{otherPartyName}</strong> has been approved by a team leader.
          </Text>

          <Section style={infoBox}>
            <Text style={infoLabel}>Service</Text>
            <Text style={infoValue}>{serviceName}</Text>
            
            <Text style={infoLabel}>Date</Text>
            <Text style={infoValue}>{serviceDate}</Text>
            
            <Text style={infoLabel}>Position</Text>
            <Text style={infoValue}>{positionName}</Text>
            
            <Text style={infoLabel}>Status</Text>
            <Text style={statusText}>
              {isRequester 
                ? `${otherPartyName} will now cover this duty`
                : "You are now assigned to this duty"
              }
            </Text>
          </Section>

          {!isRequester && (
            <Text style={text}>
              Please make sure to confirm your attendance in the app. If you have any questions about the duty, feel free to reach out to your team leader.
            </Text>
          )}

          <Section style={buttonContainer}>
            <Button style={button} href={scheduleUrl}>
              View My Schedule
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            This email was sent by Fusion - Church Tech Department Management.
            If you have questions, please contact your team leader.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SwapApprovedEmail

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
  borderRadius: "8px",
}

const iconContainer = {
  textAlign: "center" as const,
  margin: "0 0 16px",
}

const checkIcon = {
  backgroundColor: "#22c55e",
  borderRadius: "50%",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "32px",
  height: "56px",
  lineHeight: "56px",
  textAlign: "center" as const,
  width: "56px",
}

const heading = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  textAlign: "center" as const,
  margin: "0 0 24px",
}

const text = {
  color: "#525252",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
}

const infoBox = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  border: "1px solid #bbf7d0",
  padding: "20px",
  margin: "24px 0",
}

const infoLabel = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px",
}

const infoValue = {
  color: "#1a1a1a",
  fontSize: "16px",
  fontWeight: "500",
  margin: "0 0 16px",
}

const statusText = {
  color: "#15803d",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0",
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
}

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
}

const footer = {
  color: "#9ca3af",
  fontSize: "14px",
  lineHeight: "20px",
  textAlign: "center" as const,
}
