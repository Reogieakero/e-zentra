# Zentra — Frontend (web)

Next.js (App Router) frontend for the Zentra School Information System.

**Stack:** Next.js · React · TypeScript · CSS Modules (no Tailwind).

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm start` — serve the production build
- `npm run lint` — ESLint

## Conventions

- Styling uses **CSS Modules** (`*.module.css`), never Tailwind/utility classes.
- Shared design tokens (colors, spacing) live in `src/app/globals.css` as CSS custom
  properties; component styles are colocated as module files.
- The app talks to the backend API (`/api/v1`) which is documented at `/api-docs`.

## Current state

Scaffold + default landing page. Auth, dashboards, and feature screens are next.
