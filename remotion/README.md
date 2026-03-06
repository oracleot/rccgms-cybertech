# Remotion — Rota Video Generation

> **⚠️ NOTE (Joel — March 2026):**  
> The `remotion` package and its peer dependencies (`@remotion/bundler`, `@remotion/cli`, `@remotion/renderer`) are listed in `package.json` but **not installed** in `node_modules`. This causes TypeScript errors in the editor (e.g. `Cannot find module 'remotion'`).
>
> The `remotion/` folder is currently **excluded from tsconfig.json** so it doesn't break the main app build.
>
> **Action needed (Dami):** Run `pnpm install` to install the remotion dependencies, or remove them from `package.json` if this feature is no longer planned.

## Overview

This folder contains Remotion video compositions for generating animated rota management videos (onboarding, assignment notifications, swap requests, etc.).

## Structure

- `compositions/` — Video compositions (entry points)
- `scenes/` — Individual animated scenes
- `components/` — Reusable Remotion components (Card, Badge, Avatar, etc.)
- `styles/` — Theme and design tokens
- `utils/` — Animation utilities
