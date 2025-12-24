# Completed Tasks Screenshots

This folder contains screenshots documenting completed WordPress management tasks.

## Screenshots Index

### T022 - Messages Navigation Fix (2024-12-23)

Updated the "Messages" nav item to link to the sermons archive.

| Screenshot | Description |
|------------|-------------|
| [t022_messages-nav-working.png](t022_messages-nav-working.png) | Homepage showing Messages nav in the header (Divided Right Menu) |
| [t022_sermons-archive-page.png](t022_sermons-archive-page.png) | Sermons archive page at `/portfolio-category/sermons/` showing sermon items |
| [t022_divided-right-menu.png](t022_divided-right-menu.png) | WordPress admin - Divided Right Menu editor (viewport) |
| [t022_divided-right-menu-full.png](t022_divided-right-menu-full.png) | WordPress admin - Divided Right Menu editor (full page) showing Events, Gallery, Messages items |

**What was done:**
- Updated "Messages" link in **Divided Right Menu** (ID 27) to `/portfolio-category/sermons/`
- Also updated "Messages" link in **Main Menu Navigation** (ID 29) for consistency
- Verified link works correctly on live homepage

**Key Discovery:**
The Chapel theme uses a "Divided Header" layout on the homepage. Navigation changes must be made to the **Divided Right Menu** (not just Main Menu Navigation) for them to appear on the homepage.

---

### T024 - Contact Form Email Fix (2024-12-23)

Updated Contact Form 7 "Footer" form to send to the correct church email address.

| Screenshot | Description |
|------------|-------------|
| [t024_contact-form-settings.png](t024_contact-form-settings.png) | Contact Form 7 Mail settings showing updated email configuration |

**What was done:**
- Changed "To" field from `chapel.elated@gmail.com` (demo) to `info@rccgmorningstaredinburgh.org`
- Changed "From" field to `RCCG Morningstar <wordpress@rccgmorningstaredinburgh.org>`
- Updated Subject to `RCCG Morningstar Website Contact: "[your-subject]"`
- Updated Message body to reference the correct church website URL

**Form Details:**
- **Form Name:** Footer
- **Post ID:** 979
- **Edit URL:** `/wp-admin/admin.php?page=wpcf7&post=979&action=edit`

---

## Other Completed Tasks (No Screenshots Needed)

### T001 - Main Home Link Verification (2024-12-23)
- **Status:** ✅ Verified - "Main Home" correctly links to front page (/)
- No changes were needed

### T002 - Remove Demo Sub-items from Home Dropdown (2024-12-23)
- **Status:** ✅ Completed
- Removed: Events Home, Sermon Home, Church Home, Landing
- Done via Appearance → Menus → Divided Left Menu

---

## Screenshot Naming Convention

Format: `{task-id}_{description}.png`

Examples:
- `t022_messages-nav-working.png`
- `t024_contact-form-settings.png`
