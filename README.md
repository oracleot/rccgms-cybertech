<p align="center">
  <img src=".github/assets/banner.svg" alt="Fusion" width="800">
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20RLS-3ECF8E?logo=supabase&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-private-lightgrey">
</p>

Rotas, rundowns, livestreams, meetings — one app instead of five spreadsheets and a group chat. Built with Next.js 16, Supabase, and the Vercel AI SDK.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [OBS Integration](#obs-integration)
- [Architecture](#architecture)
- [Development](#development)
- [Database Migrations](#database-migrations)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

## Features

| Module | Description |
|--------|-------------|
| 📅 **Rota** | Weekly service scheduling, availability tracking, and duty swaps |
| 🗓️ **Meetings** | Zoom/Google Meet/Teams/in-person meetings — RSVPs, reminders, calendar sync, and team availability-overlap scheduling |
| 🌐 **Public Availability** | A no-sign-in form so anyone on the team can submit availability from a shared link |
| 🎬 **Rundown** | Service order planning with a live operator/display mode |
| 📡 **Livestream** | AI-generated YouTube/Facebook descriptions in a church-announcement format |
| 🎨 **Designs** | Design request tracking, assignment, and file delivery |
| 🎓 **Training** | Training tracks, step-by-step progress, and certificates |
| 📖 **Bible Reader** | AI voice-detection that auto-displays Bible passages on the projection screen — with OBS overlay + dock support |

## Quick Start

### Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm 9+ (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project

### 1. Clone & Install

```bash
git clone https://github.com/oracleot/rccgms-cybertech.git
cd rccgms-cybertech
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI - for AI features (optional for dev)
OPENAI_API_KEY=sk-...

# Resend - for email notifications (optional for dev)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=notifications@yourdomain.com

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

```bash
# One-off CLI use (no global install needed)
pnpm dlx supabase link --project-ref your-project-ref

# Push migrations
pnpm dlx supabase db push
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

---

## OBS Integration

Two URL-based OBS integrations — a display source and a control dock. No plugin installation. OBS loads them as web pages in its built-in Chromium browser, and they update in real time via Supabase Realtime.

> **How it works:** When the operator sends a passage from the Bible Reader or the OBS dock, it is broadcast over a Supabase Realtime channel. The display source receives it and puts the verse on stream instantly. No WebSocket server to run, no `.dll` to install. The channel is namespaced by domain, so a developer running the app locally can never broadcast onto the church's stream — keep the Bible Reader, dock and display source on the same domain.

### 1. Bible Display (Browser Source)

Behaves like a native OBS text source: **transparent**, showing only the reference and the verse text over whatever your scene already has — church branding, an open-Bible image, a live camera. It fills whatever size you give the source, so you can run it at OBS's default 800×600, at 400×500 like the FirstFruits plugin, or full-frame at 1920×1080, then scale and position it in the scene like any other source.

**Type fits itself to the source.** The display measures the rendered passage against the source area and uses the largest size that fits — a short verse fills the frame, a long one comes down, and a long passage splits into pages rather than shrinking below a readable minimum. Resize the source in OBS and it re-fits on the spot.

**OBS Setup:**

1. In your Bible scene, click **+** → **Browser Source**, placed above your background
2. Set the URL:
   ```
   https://rccgms-cybertech.vercel.app/bible/obs
   ```
3. Leave OBS's defaults — size (800×600) and Custom CSS are both fine. Resize the source in the scene to taste
4. Check **Shutdown source when not visible**

To position the source before anyone has sent a verse, add `?preview=1` to the URL temporarily — it shows a sample passage without connecting. Remove it when done.

#### Appearance settings

Click the **gear icon** at the bottom of the OBS dock to open **Scene Appearance**. Changes apply to the display instantly — no URL editing, no reloading the source.

| Setting | What it does |
|---------|--------------|
| **Display mode** | **Auto** (default), **Single verse** or **Multi-verse** — see [Display modes](#display-modes-and-verse-navigation) |
| **Style** | **Text only** (default) or **Lower-third card** — the purple band with the reference and quoted verse |
| **Background** | Colour picker plus an opacity slider. **0% is fully transparent**; raise it to dim a busy background behind the text. Covers the whole source, not just the text |
| **Text position** | Top, Centre or Bottom of the source |
| **Text size** | 50–150%. Text auto-fits regardless; this sets how large it may go and how small it will go before a long passage splits into pages — 150% means bigger type and more pages |
| **Reference** | Above the text, below it, or hidden |
| **Font** | Serif or Sans |
| **Text colour** / **Reference colour** | Colour pickers |
| **Drop shadow** | Keeps text legible over video — turn off over a plain background |
| **Show translation** | The `(KJV)` suffix on the reference |
| **Inline verse number** | Single-verse only: puts the number in front of the text as a superscript — `³ And God said, Let there be light`. Multi-verse always numbers each verse |
| **Reset to defaults** | Back to Auto, text only, transparent, centred, serif |

Settings are remembered by the display itself, so a source that restarts comes back looking the same. To preset the look without opening the dock, URL parameters still work and win on first load: `?mode=multi&style=card&bg=000000cc&pos=bottom&size=0.8&ref=hide&font=sans&color=ffffff&accent=ffd700&shadow=0&translation=0&inline=1`.

### 2. Control Dock (Custom Browser Dock)

A compact control panel that lives **inside OBS** — send passages and navigate verses without switching windows.

**OBS Setup:**

1. In OBS, go to **View → Docks → Custom Browser Docks**
2. Enter:
   - **Dock Name:** `Bible Control`
   - **URL:**
     ```
     https://rccgms-cybertech.vercel.app/bible/obs/dock
     ```
3. Click **Apply**
4. The dock appears as a panel — drag it to wherever suits your OBS layout

The dock has two interface modes, switched from **Settings → Interface**:

- **Simple** (default) — just what a live service needs: the reference field, translation, Send/Clear, the current passage with essential verse/page navigation, live-or-preview state, and Lock. A compact **Settings** covers the basics.
- **Advanced** — adds chapter/book navigation, the scripture browser, history/favourites/queue, audio tools, and deeper display settings (typography, appearance, keyboard shortcuts).

Switching modes only changes what's shown — nothing is disabled either way, no setting is reset, and the live scripture on stream is untouched. A passage sent in Advanced with, say, a lower-third card style and a custom accent colour still shows that way after switching back to Simple; a display mode set in Advanced keeps applying. Contextual state always shows regardless of mode — a `2/4` page indicator on a split passage, the preview card once something is staged, an error, the **Locked** pill.

**Main pane** (both modes)
- **Reference field** — forgiving about how you type (see [Typing a reference](#typing-a-reference)); words from a verse search scripture instead
- **Translation** — KJV, WEB, ASV, BBE, YLT. Changing it re-loads whatever is live in the new translation, keeping the same verse or page on screen. Other translations are warmed in the background, so the switch is usually instant
- **Verse list** — the full passage, one verse per row, with the verses currently on screen highlighted; in Advanced, a star pins the passage to favourites
- **← / →** — step through verses or pages, with a `2/4` page indicator when a passage is split; arrow keys work too
- **Clear Screen** — hide the display (appears only when something is live)

**Toolbar icons** (hover for a tooltip)
- **Book** — the main pane
- **Compass** *(Advanced)* — previous/next chapter and book, and a Book → Chapter → Verse browser
- **Clock** *(Advanced)* — recent passages, favourites and the queue
- **Microphone** *(Advanced)* — voice detection and the input level meter; appears only where the browser supports speech recognition (OBS's embedded browser does not — use the Bible Reader in Chrome or Edge for that)
- **Undo** *(Advanced)* — put back the previous live state
- **Lock** — block every change to the live display until unlocked; in both modes
- **Gear** — Settings, split into **Interface** (the Simple/Advanced switch), **Basic** (style, default translation, preview-before-live — always visible), and **Advanced** (display mode, appearance, typography, keyboard shortcuts — shown only in Advanced mode)

### Typing a reference

The field reads references the way an operator types them mid-service, and shows what it understood underneath as you type — `Interpreted as: 2 Kings 2:3–5`:

| You type | It reads |
|----------|----------|
| `2kings2 3 5` | 2 Kings 2:3–5 |
| `john316` | John 3:16 |
| `jn 3 16` | John 3:16 |
| `ps119 3 6` | Psalm 119:3–6 |
| `1cor13 4 7` | 1 Corinthians 13:4–7 |
| `gen 1 31-2 3` | Genesis 1:31–2:3 |
| `First John 4 8`, `ii kings 2:3`, `jonh 3 16` | 1 John 4:8, 2 Kings 2:3, John 3:16 |

Enter sends when it is sure. A partly typed book name offers completions (`1 cor` → 1 Corinthians; Tab accepts). When the input could genuinely mean more than one thing — or names a chapter a book doesn't have — Enter opens a short chooser instead of sending, so the wrong scripture never goes to the stream by default.

Type words instead — `for God so loved` — and Enter searches scripture text; pick a result to send it. Search is a separate action from reference parsing; the two are never confused.

### Navigation (Advanced)

Behind the compass icon: **Prev / Next chapter** and **Prev / Next book**, in Bible order — never alphabetical. The chapter after Psalm 150 is Proverbs 1; the book after Psalms is Proverbs, landing on chapter 1. The **Browse** tab is a Book → Chapter → Verse picker: tap a verse, then a later one for a range, or send the whole chapter.

Keyboard, everywhere except while typing in a field: `←` `→` verse or page · `Shift` + arrows chapter · `Alt` + arrows book · `Enter` puts a previewed passage live.

### History, favourites and queue (Advanced)

Behind the clock icon. **Recent** is the last 30 passages sent, with a star to pin any of them. **Favourites** are the scriptures the church keeps returning to. **Queue** is what's coming up — add references ahead of time, reorder them, and press **Send next** as the pastor reaches each one; the icon shows how many are waiting. References only are stored, in the browser.

### Live safety

- **Undo** re-broadcasts the previous live state, ten steps deep; undoing the first send clears the screen.
- **Lock** is enforced by the OBS display itself, so it holds across every client on the channel: while locked, the display refuses any attempt to change or clear the live scripture — from this dock, a second dock, or a Bible Reader on another machine. The lock travels over the same realtime channel, every dock shows it, and both the dock and the display remember it, so an OBS source or dock that restarts comes back locked rather than quietly open. Restoring what is already live after a scene switch still works, because a restore is not a change. Appearance settings are not scripture and stay adjustable.

  The lock protects the stream, not your preparation. With **Preview before live** on you can keep working while locked: the Send button becomes **Preview**, what you send lands in the preview card, and changing translation updates that preview — the live passage is left alone. **Go live** is the one thing held back until you unlock.
- **Preview before live** (Settings, off by default) parks a sent passage in a preview card until you press **Go live** or Enter. Off, the workflow stays one step. Changing translation keeps live and preview as they are: a live passage is updated on the stream, a staged one is updated in the preview — preview mode never pulls a passage off the stream.

### Display modes and verse navigation

Loading a passage fills the dock with every verse, one per row, labelled by chapter and verse. The rows currently on screen are highlighted, and the list scrolls to keep them in view:

```
JOHN 3:16–18                              [ ← ] [ → ]
┌──────────────────────────────────────────────────┐
│ 3:16  For God so loved the world, that he gave   │  ┐
│       his only begotten Son…                     │  │
│ 3:17  For God sent not his Son into the world    │  ├ on screen
│       to condemn the world…                      │  │
│ 3:18  He that believeth on him is not condemned  │  ┘
└──────────────────────────────────────────────────┘
```

What goes on screen depends on the **Display mode** in Scene Appearance:

| Mode | Behaviour |
|------|-----------|
| **Auto** (default) | Comfortable type first. The whole passage on one page when it fits at a comfortable size — `John 3:16–18` shows all three verses, numbered — otherwise as many consecutive verses per page as read comfortably, in balanced pages set in one common size so type doesn't jump as you page. ← / → step pages, and the dock shows `2/4` |
| **Single verse** | Always one verse at a time — the only mode that deliberately puts one verse per page. Click a verse to show it; ← / → step through |
| **Multi-verse** | As many verses per page as reasonably fit: type comes down towards the minimum before another page is added. Never below the readable minimum — at that point it pages |

At 800×600, Psalm 119:1–40 is six pages of about six verses at ~31px in Auto, and two pages of twenty at ~19px in Multi-verse.

In every mode the on-screen reference is exactly what is showing — `John 3:16–18 (KJV)` for the range, `Psalm 119:21–40` for a page, `Genesis 1:2` for one verse — with an en dash, as printed Bibles set it. Multi-verse pages number each verse with a superscript.

Clicking a verse in Multi-verse mode jumps to the page that contains it. The display is the authority on what fits, so the dock's highlight and page count are always what the stream is actually showing.

Every surface stays in sync: send from the Bible Reader or the dock and the OBS display and the projection screen both follow. The same verse list appears in the Bible Reader at `/bible`, so an operator on a laptop and an operator inside OBS see and control the same thing.

### Switching scenes mid-reading

With **Shutdown source when not visible** ticked, OBS stops the browser source every time you leave the scene. When you switch back, the source asks the dock what is currently live and restores that verse and appearance immediately — so moving between the Bible scene and a camera mid-reading does not blank the verse. The dock must be open in OBS for this to work.

### Why not a traditional OBS plugin?

Traditional OBS plugins are compiled C++ `.dll` / `.so` files. This integration uses OBS's built-in **Browser Source** feature instead — which is the standard, recommended way to add web-powered overlays. The advantages are:

| | Browser Source (this) | C++ Plugin |
|---|---|---|
| Installation | None — just a URL | Download + copy `.dll` to OBS folder |
| Updates | Automatic with every Vercel deploy | Manual reinstall |
| OBS version | Works on any OBS version with Browser Source | Must match OBS version |
| Cross-platform | Windows, Mac, Linux | Separate build per platform |

### Voice detection (Bible Reader)

The Bible Reader at `/bible` listens for references as the pastor speaks. It uses the browser's speech recognition (Chrome or Edge; it needs internet) and starts **only when you press Start Listening** — never on page load.

What it hears is turned into structured references — `John three sixteen`, `John 316` and `Second Kings two three to five` all become `John 3:16` and `2 Kings 2:3–5` — through the same parser the typed field uses. Only that parsed reference is ever sent to the Bible API; the surrounding conversation never is. Detected references appear as chips with a **Send** button; a chip in amber means the book name was a fuzzy match, so check it before sending. The raw transcript is kept for diagnosing mishearings but folded away by default.

The status pill tells you the truth about the microphone: **Ready**, **Listening**, **Stopped**, **Microphone permission denied**, **No audio input**, **Input disconnected**, **Speech recognition unavailable** or **Recognition error**, each with what to do about it. Chrome ends continuous recognition after silence; while you have pressed Start it is restarted for you automatically, with a short backoff if a restart itself fails — the previous behaviour died outright the first time a restart hit a timing hiccup, which is exactly what a Windows laptop can do a few seconds into a live service.

**Audio input.** The **Audio** button shows every audio input on the machine with a live level meter, so you can confirm Fusion is receiving *a* source. One limitation is stated rather than hidden: the browser's speech recognition always listens to the **system default** input and offers no way to choose a device, while the meter can be pointed at any input you like. **A green, reacting meter does not mean recognition is hearing that same audio** — the two can be different devices entirely, which is the single most common reason recognition looks broken while everything else looks fine (mic connected, meter moving, no references ever detected). To make recognition use a different input, set it as the default in Windows Sound settings — the meter can't redirect it. True per-device recognition would mean capturing audio ourselves and streaming it to a speech service (Deepgram, AssemblyAI or Whisper behind a server route with an API key); that is a separate decision and is not built.

Expand **Recognition diagnostics** (under the Audio button, and in the dock) for the detail behind the status pill:

| Field | What it tells you |
|-------|--------------------|
| Meter input | The device the level meter is currently reading |
| Recognition input | Always **System Default** — with the actual device name resolved where the browser exposes it |
| Same device? | **Yes** / **No** / **Can't tell** — inferred from the browser's device `groupId` where available. A **No** shows the exact warning: *"Audio meter is monitoring `<device>`, but speech recognition is listening to `<device>`."* A **Can't tell** means there isn't enough device data yet (usually no permission granted) — it never guesses |
| Status / Started / Last result | When the current session began and how long since a result last came back — a healthy session updates this every few seconds while someone is speaking |
| Restarts | How many times recognition has cycled since Start was pressed. Chrome restarts periodically on its own; a number that keeps climbing with **Last result** stuck at "never" is the signature of the input mismatch above |
| Last interim / Last final | The most recent partial and confirmed transcript chunks, separate from the full transcript |
| Recent events | A timestamped log of start/end/error events, so a genuine failure (permission denied, no microphone) can be told apart from Chrome's ordinary silence-triggered restarts |

### Caching and translations

Passages load through one store: a memory cache, a bounded IndexedDB cache (by translation and normalised reference, with a schema version, a 30-day life and least-recently-used eviction — Bible text is never put in localStorage), and de-duplication of in-flight requests. The translation you asked for loads first; the others are warmed behind it, immediately for short passages and once you have paused for whole chapters, so a burst of chapter steps doesn't queue dozens of requests against the API's rate limit. Returning to a passage used earlier is instant. bible-api.com serves one translation per request and lacks some chapters in some translations (YLT has no Psalm 119); that is remembered as "not available in YLT" rather than retried.

---

## Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: Supabase (PostgreSQL + Auth + Row-Level Security)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **AI**: Vercel AI SDK + OpenAI
- **Email**: React Email + Resend
- **Calendar**: Hand-rolled RFC 5545 ICS generation + Google Calendar (optional)
- **Validation**: Zod + React Hook Form

### How a request flows

```mermaid
flowchart LR
    Browser -->|Server Actions / fetch| NextJS[Next.js App Router]
    NextJS -->|RLS-scoped| Supabase[(Supabase Postgres)]
    NextJS --> Auth[Supabase Auth]
    NextJS --> AI[Vercel AI SDK]
    NextJS --> Email[Resend]
    Cron[Vercel Cron] -->|reminders| NextJS
```

### Project Structure

```
app/
├── (auth)/              # Public auth pages (login, accept-invite, etc.)
├── (dashboard)/         # Protected routes
│   ├── admin/           # Admin-only pages
│   ├── rota/            # Rota + availability + swaps
│   ├── meetings/        # Meetings, RSVPs, calendar sync
│   ├── rundown/         # Service rundowns + live operator view
│   ├── designs/         # Design request tracking
│   └── training/        # Training tracks
├── availability/        # Public (signed-out) availability form
├── bible/
│   └── obs/             # OBS integrations (public, no auth)
│       ├── page.tsx     # Bible display — load as OBS Browser Source
│       └── dock/
│           └── page.tsx # Control dock — load as OBS Custom Browser Dock
└── api/                 # API routes + cron jobs

components/
├── ui/                  # shadcn/ui components
├── {feature}/           # Feature-specific components
└── shared/              # Shared components

lib/
├── supabase/            # Supabase clients (client, server, admin)
├── calendar/            # Provider-agnostic ICS/timezone/calendar-links
├── meetings/            # Meeting queries, availability overlap
├── validations/         # Zod schemas
└── notifications/       # Email/SMS services

types/                   # TypeScript types
emails/                  # React Email templates
supabase/migrations/     # Database migrations
specs/                   # Project specifications
```

### User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access, user management, system settings |
| **Lead Developer** | Content/data management across all modules, developer tools |
| **Developer** | Content/data management across all modules |
| **Leader** | Create/edit rotas & meetings, approve swaps, manage team |
| **Member** | View schedules, submit availability, request swaps, RSVP to meetings |

---

## Development

### Common Commands

```bash
pnpm dev                              # Start dev server
pnpm build                            # Production build
pnpm lint                             # Run ESLint
pnpm dlx shadcn@latest add [name]     # Add a shadcn/ui component
```

### Database Commands

All run via `pnpm dlx supabase` — no global CLI install required.

```bash
pnpm dlx supabase db push                                          # Apply migrations
pnpm dlx supabase migration list                                   # Check migration status
pnpm dlx supabase migration new [name]                             # Create a new migration
pnpm dlx supabase gen types typescript --linked > types/database.ts  # Regenerate types
```

### Key Conventions

**File Naming**: lowercase-kebab-case — `rota-calendar.tsx`, `meeting-form.tsx`

**Supabase Clients**:
```typescript
// Server Components & API Routes
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()

// Client Components
import { createClient } from "@/lib/supabase/client"
const supabase = createClient()

// Admin operations (bypass RLS)
import { createAdminClient } from "@/lib/supabase/admin"
```

**Form Validation**:
```typescript
// Define schema in lib/validations/{feature}.ts
import { z } from "zod"
export const createRotaSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().date(),
})

// Use in React Hook Form
import { zodResolver } from "@hookform/resolvers/zod"
const form = useForm({ resolver: zodResolver(createRotaSchema) })
```

---

## Database Migrations

### Creating Migrations

```bash
# 1. Check current migration status
pnpm dlx supabase migration list

# 2. Find the next available number
ls supabase/migrations/

# 3. Create with the next sequential number (e.g., 042_your_migration.sql)
pnpm dlx supabase migration new your_migration_name
```

### Important Rules

- Use sequential 3-digit prefixes: `001_`, `002_`, `003_`
- **Never reuse or duplicate a prefix number**
- Never edit an already-applied migration — create a new one instead
- Run `pnpm dlx supabase migration list` before pushing, to confirm what's actually pending on the target project

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid API key" | Check `.env.local` for correct Supabase keys, no trailing whitespace |
| "RLS policy violation" | Check the user's role in the `profiles` table |
| Type errors after DB changes | Run `pnpm dlx supabase gen types typescript --linked > types/database.ts` |
| Notifications not sending | Check that `RESEND_API_KEY` is set; view `/admin/notifications` for errors |
| Local migration list doesn't match remote | Run `pnpm dlx supabase migration list` — if a migration was applied outside the CLI, use `migration repair --status applied <version>` rather than re-running it |

---

## Resources

- [Product Spec](.github/docs/PRODUCT_SPEC.md) · [Tech Docs](.github/docs/TECH_DOCS.md) · [User Guide](.github/docs/user.guide.md)
- [Project Specs](specs/001-cyber-tech-app-build/) — detailed requirements and API contracts
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

<p align="center">— built for the RCCG Morning Star tech team —</p>
