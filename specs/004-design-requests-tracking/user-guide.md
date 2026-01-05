# User Guide: Design Requests Tracking

**Feature**: Design Requests Tracking  
**Version**: 1.0  
**Last Updated**: January 5, 2026

## Overview

The Design Requests Tracking feature allows congregation members to submit design requests (banners, flyers, social graphics, etc.) without needing to log in. The tech team can then view, claim, and track these requests through completion, with automated email notifications at each stage.

## For Requesters (Congregation Members)

### Submitting a Design Request

1. **Navigate to the request form**: Visit `/designs/request` (no login required)

2. **Fill out the form**:
   - **Title** (required): A short, descriptive title (e.g., "Easter Sunday Banner")
   - **Description** (required): Provide detailed information about:
     - The event or purpose
     - Key messages or text to include
     - Target audience
     - Color preferences
     - Branding requirements
     - Size or format requirements
   - **Design Type**: Select from Flyer, Banner, Social Graphic, Video Thumbnail, Presentation, or Other
   - **Priority**: Low, Medium (default), High, or Urgent
   - **Needed By Date** (optional): When you need the design completed
   - **Reference Links** (optional): Up to 5 URLs for inspiration or examples
   - **Your Name** (required): Your full name
   - **Your Email** (required): Where you'll receive updates
   - **Phone Number** (optional): Alternative contact method
   - **Ministry/Department** (optional): Your church ministry

3. **Submit**: Click "Submit Design Request"

4. **Confirmation**: You'll see a confirmation with your Request ID. Save this for reference.

### Email Updates

You'll receive email notifications when:
- Your request is claimed by a team member
- The design is ready for your review
- The final design is completed (with download link)

## For Design Team Members

### Viewing Design Requests

1. **Log in** to the dashboard at `/login`
2. **Navigate to Designs** in the sidebar (or go to `/designs`)
3. View all pending and active requests

### Using Filters

- **Search**: Type in the search box to find requests by title or requester name
- **Status Filter**: Filter by Pending, In Progress, In Review, Completed, etc.
- **Priority Filter**: Filter by Low, Medium, High, or Urgent
- **Include Archived**: Toggle to show/hide completed requests older than 12 months

### Claiming a Request

1. Find an unclaimed request (shows "Unclaimed" badge)
2. Click the **"Claim"** button
3. Confirm in the modal
4. The request will be assigned to you and status changes to "In Progress"

### Unclaiming a Request

If you can no longer work on a request:
1. Click **"Unclaim"** on your assigned request
2. The request returns to unclaimed status for others to pick up

### Updating Request Status

1. Click on a request to view details
2. Click **"Update"** button
3. In the modal:
   - Change **Status** (In Progress → Ready for Review, etc.)
   - Adjust **Priority** if needed
   - Add **Internal Notes** (visible to team only)
4. Click "Update Request"

### Status Workflow

```
Pending → In Progress → Review → Completed
                    ↘ Revision Requested → In Progress (loop)
                    ↘ Cancelled
```

### Completing a Design

When the design is ready:
1. Update status to "Ready for Review" first
2. Click **"Complete"** button
3. Paste the **Google Drive link** to final files (required)
4. Click "Complete Request"

The requester will receive an email with the download link.

### Requesting Revisions

If the requester needs changes:
1. Click **"Update"** on the request
2. Change status to "Revision Requested"
3. Add revision notes explaining the changes needed
4. Update the request
5. Status returns to "In Progress" when you start revisions

## For Leaders/Admins

### Reassigning Requests

Leaders and admins can reassign requests between team members:
1. View the request details
2. Use the reassign option in the actions menu
3. Select a new assignee

### Deleting Requests

Only leaders and admins can delete requests:
1. View the request details
2. Click the delete (trash) icon
3. Confirm deletion

⚠️ **Warning**: Deletion is permanent and cannot be undone.

## Keyboard Shortcuts

Currently, no keyboard shortcuts are implemented. All actions are performed via mouse/touch.

## Data & Privacy

- **Public Form**: No login required, submissions are rate-limited to 3 per hour per IP
- **Team Dashboard**: Requires authentication to view
- **Internal Notes**: Only visible to team members, never shown to requesters
- **Email Addresses**: Used only for notifications, not shared externally
- **Auto-Archive**: Completed requests are automatically archived after 12 months

## Troubleshooting

### "Too many requests" error on public form
Wait 1 hour and try again. This protects against spam submissions.

### Not receiving email notifications
- Check your spam/junk folder
- Verify your email address was entered correctly
- Contact tech team if issues persist

### Can't see a request in the list
- Check your filters (especially Status and Include Archived)
- Try clearing all filters with "Clear all" button
- The request may have been deleted by a leader/admin

### Design deliverable link not working
Contact the team member who completed the request to verify the sharing settings on the Google Drive link.

## Best Practices

### For Requesters
- Provide as much detail as possible in the description
- Include reference images or examples when possible
- Set realistic deadlines (allow at least 1 week for non-urgent requests)
- Respond promptly when design is ready for review

### For Team Members
- Add internal notes to document your progress
- Update status regularly so requesters know the progress
- Use clear folder organization in Google Drive for deliverables
- Set deliverable links to "Anyone with the link" for easy access

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 5, 2026 | Initial release with full feature set |
