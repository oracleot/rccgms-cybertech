/**
 * Google Drive integration for Social Media Hub
 */

import { google, drive_v3 } from "googleapis"

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

/**
 * Create OAuth2 client for Google APIs
 */
export function createOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
  return oauth2Client
}

/**
 * Generate Google OAuth consent URL
 */
export function getAuthUrl(state: string): string {
  const oauth2Client = createOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state,
    prompt: "consent", // Force consent to get refresh token
  })
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

/**
 * Create an authenticated Drive client
 */
export async function getDriveClient(
  accessToken: string,
  refreshToken?: string
): Promise<drive_v3.Drive> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return google.drive({ version: "v3", auth: oauth2Client })
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string
  expiresAt: Date
}> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  
  const { credentials } = await oauth2Client.refreshAccessToken()
  
  return {
    accessToken: credentials.access_token!,
    expiresAt: new Date(credentials.expiry_date!),
  }
}

export interface DriveFolder {
  id: string
  name: string
  hasChildren: boolean
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  thumbnailUrl: string | null
  webViewLink: string | null
  size: number
  createdAt: string
}

/**
 * List folders from Google Drive
 */
export async function listFolders(
  drive: drive_v3.Drive,
  parentId?: string
): Promise<DriveFolder[]> {
  const query = parentId
    ? `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    : `'root' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`

  const response = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    orderBy: "name",
    pageSize: 100,
  })

  const folders: DriveFolder[] = []
  
  for (const file of response.data.files || []) {
    // Check if folder has children
    const childrenResponse = await drive.files.list({
      q: `'${file.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id)",
      pageSize: 1,
    })

    folders.push({
      id: file.id!,
      name: file.name!,
      hasChildren: (childrenResponse.data.files?.length || 0) > 0,
    })
  }

  return folders
}

/**
 * List media files from a folder
 */
export async function listFiles(
  drive: drive_v3.Drive,
  folderId: string,
  limit: number = 50,
  pageToken?: string
): Promise<{ files: DriveFile[]; nextPageToken: string | null }> {
  const query = `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`

  const response = await drive.files.list({
    q: query,
    fields: "nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink, size, createdTime)",
    orderBy: "createdTime desc",
    pageSize: limit,
    pageToken: pageToken,
  })

  const files: DriveFile[] = (response.data.files || []).map((file) => ({
    id: file.id!,
    name: file.name!,
    mimeType: file.mimeType!,
    thumbnailUrl: file.thumbnailLink || null,
    webViewLink: file.webViewLink || null,
    size: Number(file.size) || 0,
    createdAt: file.createdTime!,
  }))

  return {
    files,
    nextPageToken: response.data.nextPageToken || null,
  }
}

/**
 * Get a direct download/display URL for a file
 */
export async function getFileUrl(
  drive: drive_v3.Drive,
  fileId: string
): Promise<string | null> {
  try {
    const file = await drive.files.get({
      fileId,
      fields: "webContentLink, thumbnailLink",
    })

    // Return the thumbnail for display purposes (larger size)
    // The webContentLink requires download permission
    if (file.data.thumbnailLink) {
      // Modify thumbnail URL to get larger image
      return file.data.thumbnailLink.replace("=s220", "=s1000")
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Check if integration is still valid
 */
export async function validateIntegration(
  accessToken: string,
  refreshToken?: string
): Promise<boolean> {
  try {
    const drive = await getDriveClient(accessToken, refreshToken)
    await drive.about.get({ fields: "user" })
    return true
  } catch {
    return false
  }
}

/**
 * Get user info from Drive
 */
export async function getDriveUserInfo(
  accessToken: string,
  refreshToken?: string
): Promise<{ email: string; displayName: string } | null> {
  try {
    const drive = await getDriveClient(accessToken, refreshToken)
    const about = await drive.about.get({ fields: "user(displayName, emailAddress)" })
    
    return {
      email: about.data.user?.emailAddress || "",
      displayName: about.data.user?.displayName || "",
    }
  } catch {
    return null
  }
}
