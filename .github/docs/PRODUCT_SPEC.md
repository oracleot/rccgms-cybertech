# Cyber Tech - Church Tech Department Management App

## Product Specification Document

**Version:** 1.0  
**Last Updated:** December 21, 2025  
**Status:** Draft

---

## 1. Executive Summary

Cyber Tech is a comprehensive web application designed to automate and streamline the operations of the RCCG Morning Star church tech department. The platform centralizes task management, scheduling, content creation, and team coordination into a single, intuitive interface.

### Vision

To empower the tech department with modern tools that reduce manual overhead, improve coordination, and enable the team to focus on what matters most—supporting impactful worship experiences.

### Key Value Propositions

- **Time Savings:** Automate repetitive tasks like generating livestream descriptions and managing rotas
- **Coordination:** Centralized scheduling with automated reminders reduces miscommunication
- **AI-Powered:** Leverage GPT-4 for content generation and intelligent assistance
- **Accessibility:** PWA support enables quick access during services from any device

---

## 2. Target Users

### Primary Users

| Role | Description | Key Needs |
|------|-------------|-----------|
| **Tech Lead/Admin** | Oversees all tech operations | Full access to all features, user management, analytics |
| **Team Leaders** | Manage specific areas (sound, cameras, etc.) | Rota creation, team member management, rundown editing |
| **Volunteers** | Serve on scheduled Sundays | View schedules, submit availability, access training |

### User Personas

#### Persona 1: David (Tech Lead)
- **Age:** 35
- **Tech Comfort:** High
- **Goals:** Ensure smooth Sunday services, reduce last-minute coordination chaos
- **Pain Points:** Spending hours on WhatsApp coordinating schedules, manually creating YouTube descriptions

#### Persona 2: Sarah (Camera Team Leader)
- **Age:** 28
- **Tech Comfort:** Medium
- **Goals:** Know who's on her team each Sunday, track equipment condition
- **Pain Points:** Difficulty tracking who's trained on which camera, equipment issues discovered during service

#### Persona 3: James (Volunteer)
- **Age:** 22
- **Tech Comfort:** High
- **Goals:** Know when he's serving, complete required training
- **Pain Points:** Missing schedule updates, unclear on how to swap duties

---

## 3. Feature Specifications

### 3.1 Authentication & User Management

**Priority:** P0 (Critical)

#### Functional Requirements

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| AUTH-01 | Users can sign up with email | Email verification required |
| AUTH-02 | Users can log in with email/password | Session persists across browser sessions |
| AUTH-03 | Users can reset password | Reset link sent via email, expires in 1 hour |
| AUTH-04 | Admins can invite new members | Invitation email with signup link |
| AUTH-05 | Role-based access control | 3 roles: Admin, Leader, Volunteer |
| AUTH-06 | Profile management | Users can update name, phone, avatar |

#### User Roles & Permissions

| Permission | Admin | Leader | Volunteer |
|------------|-------|--------|-----------|
| View own schedule | ✅ | ✅ | ✅ |
| Submit availability | ✅ | ✅ | ✅ |
| Request duty swap | ✅ | ✅ | ✅ |
| Create/edit rotas | ✅ | ✅ | ❌ |
| Manage equipment | ✅ | ✅ | ❌ |
| Edit service rundowns | ✅ | ✅ | ❌ |
| Generate AI content | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Access admin settings | ✅ | ❌ | ❌ |

---

### 3.2 Rota Management

**Priority:** P0 (Critical)

#### Overview

A scheduling system to manage which team members serve in specific roles each Sunday. Supports fair rotation, availability tracking, and automated reminders.

#### Functional Requirements

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| ROTA-01 | Calendar view of all rotas | Month and week views available |
| ROTA-02 | Create new rota for a service date | Select date, assign members to positions |
| ROTA-03 | Define service positions | Projection, Streaming, Sound, Cameras, Time Management |
| ROTA-04 | Assign members to positions | Drag-drop or select from dropdown |
| ROTA-05 | Members submit availability | Calendar-based availability picker |
| ROTA-06 | Swap request workflow | Request → Approve/Decline → Notify |
| ROTA-07 | Automated reminders | Email + SMS, customizable timing |
| ROTA-08 | Notification preferences | Members choose channels and timing (default: 1 day before) |
| ROTA-09 | View assignment history | Past rotas accessible for reference |
| ROTA-10 | Publish/unpublish rotas | Draft rotas not visible to volunteers |

#### Service Positions

| Position | Description | Min People | Max People |
|----------|-------------|------------|------------|
| Projection | Operates ProPresenter/slides | 1 | 2 |
| Streaming | Manages OBS, stream health | 1 | 2 |
| Sound | Audio mixing, mics | 2 | 3 |
| Cameras | Camera operation | 2 | 4 |
| Time Management | Service timing, cues | 1 | 1 |

#### Notification Logic

```
Trigger: Rota published OR reminder schedule
Default: 1 day before service
Customizable: 1 week, 3 days, 1 day, morning of service
Channels: Email (required), SMS (optional)
```

---

### 3.3 Livestream Description Generator

**Priority:** P0 (Critical)

#### Overview

AI-powered tool to generate YouTube and Facebook descriptions for weekly services, using the team's established template and GPT-4.

#### Functional Requirements

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| LIVE-01 | Input form for service details | Date, title, theme, speaker, scripture references |
| LIVE-02 | Generate description via GPT-4 | Streaming response, follows template |
| LIVE-03 | Edit generated content | Inline editing before saving |
| LIVE-04 | Copy to clipboard | One-click copy for YouTube/Facebook |
| LIVE-05 | Save to database | History of generated descriptions |
| LIVE-06 | Template management | Admins can update the prompt template |
| LIVE-07 | Platform-specific formatting | YouTube vs Facebook format differences |

#### Input Fields

| Field | Type | Required | Example |
|-------|------|----------|---------|
| Service Date | Date | Yes | December 22, 2025 |
| Service Type | Select | Yes | Sunday Service, Special Event |
| Title | Text | Yes | "Walking in Divine Favor" |
| Speaker | Text | Yes | Pastor John Smith |
| Scripture | Text | No | Psalm 23:1-6 |
| Key Points | Textarea | No | Bullet points for description |
| Special Notes | Textarea | No | Guest choir, communion, etc. |

---

### 3.4 Social Media Hub

**Priority:** P1 (High)

#### Overview

Centralized tool for managing post-service social media content. Fetches photos from Google Drive, generates AI-assisted captions, and previews posts for multiple platforms.

#### Functional Requirements

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| SOCIAL-01 | Connect to Google Drive | OAuth integration with shared folder |
| SOCIAL-02 | Browse and select photos | Grid view with preview |
| SOCIAL-03 | Generate captions with AI | Based on service context, editable |
| SOCIAL-04 | Multi-platform preview | Facebook, Instagram, YouTube formats |
| SOCIAL-05 | Scheduling queue | Schedule posts for future publishing |
| SOCIAL-06 | Content templates | Save reusable caption templates |
| SOCIAL-07 | Extract sermon quotes | AI-assisted quote extraction from notes |

#### Supported Platforms

| Platform | Content Types | Character Limits |
|----------|---------------|------------------|
| Facebook | Images, Videos, Text | 63,206 chars |
| Instagram | Images, Carousels, Reels | 2,200 chars |
| YouTube | Community posts, Video descriptions | 5,000 chars |

---

### 3.5 Equipment Inventory

**Priority:** P1 (High)

#### Overview

Track all tech department equipment, manage checkouts, schedule maintenance, and report issues.

#### Functional Requirements

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| EQUIP-01 | Equipment catalog | List all items with details |
| EQUIP-02 | Category organization | Cameras, Audio, Cables, Computers, etc. |
| EQUIP-03 | QR code labels | Generate printable QR codes |
| EQUIP-04 | Mobile QR scanning | Scan to view/checkout equipment |
| EQUIP-05 | Checkout/return flow | Track who has what, expected return |
| EQUIP-06 | Maintenance scheduling | Recurring maintenance reminders |
| EQUIP-07 | Issue reporting | Report problems with severity levels |
| EQUIP-08 | Equipment history | View checkout and maintenance history |

#### Equipment Categories

- Cameras (PTZ, handheld, tripods)
- Audio (mixers, microphones, cables, in-ears)
- Computers (laptops, desktops, tablets)
- Streaming (encoders, capture cards, switchers)
- Cables & Adapters
- Lighting
- Miscellaneous

#### Equipment Status

| Status | Description | Color |
|--------|-------------|-------|
| Available | Ready for use | Green |
| In Use | Currently checked out | Blue |
| Maintenance | Under repair/service | Yellow |
| Retired | No longer in service | Gray |

---

### 3.6 Service Rundown Builder

**Priority:** P1 (High)

#### Overview

Create and manage service order/flow documents with timing, assignments, and cues.

#### Functional Requirements

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| RUN-01 | Create rundown for service | Title, date, service type |
| RUN-02 | Add rundown items | Drag-drop ordering |
| RUN-03 | Item types | Song, sermon, announcement, video, transition |
| RUN-04 | Duration tracking | Per-item and running total |
| RUN-05 | Assign personnel | Who handles each item |
| RUN-06 | Notes and cues | Technical notes per item |
| RUN-07 | Template system | Save and reuse rundown templates |
| RUN-08 | Live view mode | Clean view for service execution |
| RUN-09 | Song library | Searchable database of worship songs |

#### Rundown Item Types

| Type | Fields | Icon |
|------|--------|------|
| Song | Title, artist, key, duration | 🎵 |
| Sermon | Title, speaker, duration | 📖 |
| Announcement | Title, presenter, duration | 📢 |
| Video | Title, source, duration | 🎬 |
| Prayer | Title, leader, duration | 🙏 |
| Transition | Description, duration | ⏭️ |
| Offering | Duration, notes | 💝 |

---

### 3.7 Volunteer Onboarding & Training

**Priority:** P2 (Medium)

#### Overview

Structured training program for new volunteers with progress tracking and certification.

#### Functional Requirements

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| TRAIN-01 | Training tracks by department | Each role has a learning path |
| TRAIN-02 | Step types | Video, document, quiz, shadowing, practical |
| TRAIN-03 | Progress tracking | Visual progress indicators |
| TRAIN-04 | Mentor assignment | Pair new volunteers with experienced members |
| TRAIN-05 | Completion verification | Mentor sign-off for practical steps |
| TRAIN-06 | Certification management | Track certifications and expiry |
| TRAIN-07 | Resource library | Centralized training materials |

#### Training Track Structure

```
Track: Camera Operations
├── Step 1: Welcome Video (Video) - 5 min
├── Step 2: Safety Guidelines (Document) - 10 min
├── Step 3: Camera Basics Quiz (Quiz) - 15 min
├── Step 4: Shadow a Service (Shadowing) - 2 hours
├── Step 5: Operate with Supervision (Practical) - 2 hours
└── Step 6: Independent Operation (Certification)
```

---

### 3.8 Dashboard & Analytics

**Priority:** P2 (Medium)

#### Overview

Home screen with key metrics, upcoming duties, and quick actions.

#### Dashboard Widgets

| Widget | User Roles | Content |
|--------|------------|---------|
| My Upcoming Duties | All | Next 4 weeks of assignments |
| Quick Actions | All | Common tasks (submit availability, etc.) |
| Team Overview | Leader, Admin | Who's serving this Sunday |
| Pending Requests | Leader, Admin | Swap requests awaiting approval |
| Equipment Alerts | Leader, Admin | Items needing attention |
| Service Countdown | All | Days/hours until next service |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Target |
|--------|--------|
| Page Load Time | < 2 seconds |
| Time to Interactive | < 3 seconds |
| API Response Time | < 500ms |
| Lighthouse Score | > 90 |

### 4.2 Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatible
- Color contrast ratios meet standards

### 4.3 Security

- HTTPS only
- Supabase Row Level Security (RLS)
- Encrypted sensitive data (API keys, tokens)
- Session management with secure cookies
- Rate limiting on API endpoints

### 4.4 Reliability

- 99.5% uptime target
- Graceful error handling
- Offline capability for critical views (PWA)

### 4.5 Progressive Web App

| Feature | Implementation |
|---------|----------------|
| Installable | Add to home screen prompt |
| Offline Support | Cache critical pages and assets |
| Push Notifications | Future consideration |
| App-like Experience | Full-screen mode, splash screen |

---

## 5. Success Metrics

### Key Performance Indicators

| KPI | Baseline | Target | Measurement |
|-----|----------|--------|-------------|
| Time to create rota | 30 min | 5 min | User feedback |
| Missed duty incidents | 2/month | 0/month | Incident tracking |
| Description generation time | 15 min | 2 min | Task timing |
| Training completion rate | N/A | 80% in 30 days | System tracking |
| User satisfaction | N/A | > 4.5/5 | Quarterly survey |

---

## 6. Future Considerations

### Phase 2 Features (Post-Launch)

- Integration with Planning Center
- YouTube/Facebook API for direct posting
- Advanced analytics dashboard
- Mobile native app (React Native)
- Multi-campus support
- Volunteer hour tracking
- Gamification (badges, leaderboards)

### Technical Debt Considerations

- Comprehensive test coverage
- API documentation
- Performance monitoring
- Security audits

---

## 7. Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| Rota | British term for schedule/roster |
| Rundown | Order of service/program flow |
| PTZ | Pan-Tilt-Zoom camera |
| OBS | Open Broadcaster Software |
| ProPresenter | Presentation software for worship |

### B. References

- Supabase Documentation: https://supabase.com/docs
- Vercel AI SDK: https://sdk.vercel.ai/docs
- shadcn/ui: https://ui.shadcn.com
- Magic UI: https://magicui.design
