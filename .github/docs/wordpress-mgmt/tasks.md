# Tasks: WordPress Website Activation

**Site**: https://rccgmorningstaredinburgh.org/  
**CMS**: WordPress with Chapel theme + WPBakery Page Builder  
**Admin**: https://rccgmorningstaredinburgh.org/wp-admin/  
**Credentials**: See `.github/docs/test-credentials`

---

## Current State

**Main Home** is the only page with real RCCG Morningstar content:
- Pastor Kassim Adebambo welcome message
- Service times (Sunday 10:00am-1:30pm, Wednesday Bible Study 7:30pm-9:00pm)
- Address: 27 Station Road, Kirknewton, EH27 8BJ
- Contact: info@rccgmorningstaredinburgh.org
- Sermons carousel (using Chapel Portfolio)

**Problem**: All CTAs on Main Home link to `#` (non-functional). All other pages (~45+) contain Lorem ipsum demo content.

**Goal**: Activate each CTA by either:
- A) Repurposing an existing demo page with real content
- B) Creating a new page if no suitable template exists

---

## Format: `[ID] [Priority] Description`

- **[P1]**: Critical - Breaks user journey if not fixed
- **[P2]**: Important - Key functionality expected by visitors
- **[P3]**: Nice to have - Enhances site but not essential

---

## Phase 1: Header Navigation CTAs

### Home Dropdown

The "Home" nav item is a dropdown trigger with sub-items. The dropdown works, but we need to verify sub-pages are functional.

- [x] T001 [P3] Verify "Main Home" sub-item links correctly to `/` (front page) ✅ DONE (2024-12-23)
  - **Verified**: Main Home correctly links to front page (/)
- [x] T002 [P3] Remove or hide "Events Home", "Sermon Home", "Church Home", "Landing" demo sub-items ✅ DONE (2024-12-23)
  - **Completed**: Removed 4 demo sub-items from Home dropdown via Appearance → Menus

### About Us Dropdown

The "About Us" nav item should link to church information pages.

- [ ] T003 [P1] Create/edit "About Me" page → Rename to "About Us" with church history, Pastor bio, and leadership team
  - **Content needed**: Church founding story, mission/vision (already on Main Home), Pastor Kassim bio, leadership photos/bios
  - **❓ QUESTION**: Can you provide Pastor Kassim's bio (background, education, how long at RCCG Morningstar)?
  - **❓ QUESTION**: Who are the other leaders/ministers to feature? Names, roles, photos?

- [ ] T004 [P2] Create/edit "Our Beliefs" page with RCCG doctrinal statement
  - **Content source**: Use RCCG official doctrine from Main Home tabs (already present)
  - **Action**: Copy "Doctrinal Beliefs" tab content to dedicated page with expanded detail

- [ ] T005 [P2] Create/edit "Our Team" page with leadership bios
  - **Dependency**: Needs content from T003

- [ ] T006 [P3] Remove "Our Community", "Plan A Visit", "Our Locations", "Get In Touch" if not needed, OR populate with real content
  - **❓ QUESTION**: Do you want a "Plan A Visit" page with directions/parking info? A "Get In Touch" contact page (separate from footer form)?

### Donations Dropdown

- [ ] T007 [P1] Configure GiveWP with church payment gateway
  - **❓ QUESTION**: What payment method should be used? (Stripe, PayPal, bank transfer?)
  - **❓ QUESTION**: What is the church bank account name for donation receipts?
  - **Status**: GiveWP plugin is installed but in Test Mode

- [ ] T008 [P1] Create main Donations landing page explaining how to give
  - **Action**: Use existing "Donation List" page, replace demo content with real giving categories (tithes, offerings, building fund, etc.)
  - **❓ QUESTION**: What donation categories/campaigns should be listed?

- [ ] T009 [P2] Set up at least one active donation form in GiveWP
  - **Dependency**: Needs payment gateway from T007

- [ ] T010 [P3] Remove "Donation Single", "Donation Carousel" demo sub-menu items OR configure for real campaigns

---

## Phase 2: Main CTA Buttons on Hero Section

### Hero "Watch Service" Button

- [x] T011 [P1] Link "Watch Service" button to YouTube channel or livestream page ✅ DONE (2024-12-23)
  - **Completed**: Now links to https://www.youtube.com/@RCCGMorningStarcityofLove
  - **Location**: Slider Revolution → Main-Home slider → Slide #1 → "Copy Text-5" layer → Actions
  - **Target**: Opens in new tab (_blank)

---

## Phase 3: Quick Action Cards Section

Three cards appear below the hero: Listen, Watch On The Go, Give

### "Listen" Card

- [ ] T012 [P2] Link "Listen" card to audio sermons page or podcast
  - **❓ QUESTION**: Are sermons available as audio-only? Is there a podcast (Spotify, Apple Podcasts)?
  - **Option A**: Link to YouTube channel (audio in video format)
  - **Option B**: Create a podcast/audio page if separate audio exists
  - **If no audio exists**: Consider removing this card or linking to YouTube

### "Watch On The Go" Card

- [x] T013 [P2] Link "Watch On The Go" card to YouTube channel or video archive ✅ DONE (2024-12-23)
  - **Completed**: Now links to https://www.youtube.com/@RCCGMorningStarcityofLove
  - **Also fixed**: Video section link (video_link) in the dual stack showcase

### "Give" Card

- [ ] T014 [P1] Link "Give" card to Donations page
  - **Dependency**: T008 (Donations page must be ready)

---

## Phase 4: Services Section Links

Three service cards: Sunday Service, Bible Study, Special Events

- [ ] T015 [P2] Link "Sunday Service" card to relevant page (About Us or Plan A Visit with service info)
  - **Alternative**: Make these cards non-clickable info blocks (current setup)
  - **❓ QUESTION**: Should these link somewhere, or remain as display-only info cards?

- [ ] T016 [P2] Link "Bible Study" card appropriately (or keep as info display)

- [ ] T017 [P2] Link "Special Events" card to Events page
  - **Dependency**: T018 (Events page must be configured)

---

## Phase 5: Events System

### Events Navigation & Page

- [ ] T018 [P1] Configure The Events Calendar plugin with real church events
  - **Status**: Plugin installed, but "Upcoming Events" widget shows "Sorry, no posts matched your criteria"
  - **Action**: Create at least 2-3 upcoming events to test functionality

- [ ] T019 [P1] Link "Events" nav item to `/events/` calendar page
  - **URL should be**: https://rccgmorningstaredinburgh.org/events/
  - **❓ QUESTION**: What upcoming events should be added? (Dates, titles, descriptions)

- [ ] T020 [P3] Remove demo sub-items "Events Day", "Events List", "Events Calendar", "Single Event" from nav (or keep if useful views)

---

## Phase 6: Messages/Sermons System

### Gallery/Messages Navigation

- [ ] T021 [P2] Link "Gallery" nav item to photo gallery page
  - **❓ QUESTION**: Are there church photos to add? Where are they stored (Google Drive, etc.)?
  - **Option**: Use existing "Gallery" or "Gallery Joined" page with real photos

- [x] T022 [P2] Link "Messages" nav item to sermons archive ✅ DONE (2024-12-23)
  - **Completed**: Updated "Messages" link in both Main Menu Navigation AND Divided Right Menu to point to `/portfolio-category/sermons/`
  - **Note**: Chapel theme uses "Divided" header style - the homepage displays Divided Left/Right menus, so both had to be updated
  - **URL**: https://rccgmorningstaredinburgh.org/portfolio-category/sermons/
  - **Verified**: Tested on live homepage - Messages nav now correctly links to sermons archive

---

## Phase 7: Footer & Contact

### Footer Fixes

- [ ] T023 [P2] Update placeholder phone number "0700 000 0000" with real church contact
  - **❓ QUESTION**: What is the church phone number?

- [x] T024 [P1] Verify contact form in footer works (sends to info@rccgmorningstaredinburgh.org) ✅ DONE (2024-12-23)
  - **Tested**: Form submission successful - shows "Thank you for your message. It has been sent."
  - **Fixed**: Updated Contact Form 7 "Footer" form mail settings:
    - Changed "To" from demo email (chapel.elated@gmail.com) to info@rccgmorningstaredinburgh.org
    - Changed "From" to "RCCG Morningstar <wordpress@rccgmorningstaredinburgh.org>"
    - Updated Subject to "RCCG Morningstar Website Contact: [your-subject]"
    - Updated Message body to reference correct website URL
  - **Note**: Email delivery depends on mail server configuration (WordPress may need SMTP plugin for reliable delivery)

- [ ] T025 [P3] Fix "Upcoming Events" widget in footer (currently shows "no posts")
  - **Dependency**: T018 (Events must exist)

---

## Phase 8: Blog Section (If Desired)

- [ ] T026 [P3] Decide if Blog is needed
  - **Current**: "Blog" nav is a dropdown trigger with demo sub-items
  - **❓ QUESTION**: Will the church post blog articles? If not, remove from navigation
  - **Options**: 
    - A) Remove Blog from nav entirely
    - B) Keep and use for church news/announcements
    - C) Rename to "News" and use for updates

---

## Phase 9: Shop Section (If Desired)

- [ ] T027 [P3] Decide if Shop is needed
  - **Current**: "Shop" nav with WooCommerce demo pages
  - **❓ QUESTION**: Will the church sell merchandise? If not, remove from navigation
  - **Note**: WooCommerce appears to be installed but unconfigured

---

## Phase 10: Menu Cleanup

After all content pages are ready:

- [ ] T028 [P2] Reorganize Main Menu Navigation in WordPress admin
  - Remove unused demo sub-items
  - Ensure all links point to real pages
  - Update nav labels if needed (e.g., "About Me" → "About Us")

- [ ] T029 [P2] Update mobile navigation menu (uses "Divided Left Menu")
  - Ensure mobile menu matches desktop menu structure

---

## Phase 11: SEO & Polish

- [ ] T030 [P3] Update page titles and meta descriptions via AIOSEO plugin
- [ ] T031 [P3] Ensure all pages have proper header images (currently using theme defaults)
- [ ] T032 [P3] Test all links across site for broken URLs

---

## Content Questions Summary

Before implementation, please provide:

1. **Pastor/Leadership Info**:
   - Pastor Kassim Adebambo bio (background, education, years at church)
   - Other leaders/ministers to feature (names, roles, photos)

2. **Donations Setup**:
   - Payment gateway preference (Stripe, PayPal, bank transfer)
   - Church bank account name (for receipts)
   - Donation categories (tithes, offerings, building fund, missions, etc.)

3. **Contact Details**:
   - Church phone number (to replace placeholder)

4. **Events**:
   - Upcoming events to add (dates, titles, descriptions, times)

5. **Media Content**:
   - Are there audio-only sermons/podcast links?
   - Where are church photos stored for Gallery?

6. **Section Decisions**:
   - Blog needed? (Yes/No/Rename to News)
   - Shop needed? (Yes/No)
   - "Plan A Visit" / "Get In Touch" pages wanted?
   - Should service cards (Sunday/Bible Study/Events) be clickable or info-only?

7. **Watch Experience**:
   - Link "Watch Service" directly to YouTube, or create embedded video page?

---

## Dependencies & Execution Order

### Immediate (No dependencies)
- T001 (Verify Main Home link) ✅ DONE
- T002 (Remove demo sub-items from Home dropdown) ✅ DONE
- T011 (Watch Service → YouTube) ✅ DONE
- T013 (Watch On The Go → YouTube) ✅ DONE
- T022 (Messages → Portfolio Sermons) ✅ DONE
- T024 (Test contact form → info@rccgmorningstaredinburgh.org) ✅ DONE
- T023 (Phone number update) - needs phone number from client

### After Content Received
- T003-T005 (About pages - needs leadership content)
- T007-T009 (Donations - needs payment info)
- T018-T019 (Events - needs event details)
- T021 (Gallery - needs photos)

### After Pages Ready
- T028-T029 (Menu cleanup)
- T030-T032 (SEO & polish)

---

## Technical Notes

- **WPBakery Page Builder**: Used for page layouts - edit via "Edit with WPBakery Page Builder" button
- **Chapel Portfolio**: Used for sermons - add new sermons via Dashboard → Chapel Portfolio
- **GiveWP**: Donation forms - currently in Test Mode, needs payment gateway setup
- **The Events Calendar**: Events management - Dashboard → Events → Add New Event
- **Contact Form 7 or WPForms**: Footer contact form - verify which plugin handles it

---

## Estimated Time

| Phase | Tasks | Est. Hours |
|-------|-------|------------|
| Phase 1 (Header Nav) | T001-T010 | 3-4 hrs |
| Phase 2 (Hero CTA) | T011 | 0.5 hrs |
| Phase 3 (Quick Cards) | T012-T014 | 1 hr |
| Phase 4 (Services) | T015-T017 | 0.5 hrs |
| Phase 5 (Events) | T018-T020 | 2 hrs |
| Phase 6 (Messages/Gallery) | T021-T022 | 1-2 hrs |
| Phase 7 (Footer) | T023-T025 | 1 hr |
| Phase 8-9 (Blog/Shop) | T026-T027 | 1 hr (if removing) |
| Phase 10 (Menu) | T028-T029 | 1 hr |
| Phase 11 (SEO) | T030-T032 | 1-2 hrs |
| **Total** | | **12-16 hrs** |

*Time estimates assume content is provided. Additional time for content creation if needed.*
