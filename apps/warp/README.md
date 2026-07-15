# Warp Design System — adsentice

M2: shadcn/ui initialized. 11 components ready. Tailwind CSS v4 + React 19 + Vite 8.

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Vite | 8.x |
| UI | React | 19.x |
| CSS | Tailwind CSS | v4.x |
| Components | shadcn/ui | v4 (base-nova style) |
| Primitives | Base UI + Radix UI | latest |
| Forms | react-hook-form + zod | latest |
| Icons | Lucide | latest |
| Types | TypeScript | 6.x |

## Components (11)

- [x] `button` — clickable UI element
- [x] `card` — container with header/content/footer
- [x] `dialog` — modal overlay
- [x] `dropdown-menu` — popover menu
- [x] `form` — react-hook-form + zod validation
- [x] `input` — text input field (Base UI)
- [x] `label` — form label
- [x] `select` — dropdown select
- [x] `sheet` — slide-in panel
- [x] `table` — data table
- [x] `tabs` — tabbed interface

## Commands

```bash
npm run dev        # Start dev server (HMR <100ms)
npm run build      # Production build
npm run typecheck  # TypeScript type checking
npm run preview    # Preview production build
```

## Warp Family Status

| Module | Name | Status |
|--------|------|--------|
| M1 | `tokens.css` | v1.0 |
| M2 | `components/ui/` (shadcn) | 11 components |
| M3 | `components/adsentice/` | pending |
| M4 | `compositor.ts` | pending |
| M5 | `registry.ts` | pending |
| M6 | `cache.ts` | pending |
| M7 | `tracker.ts` | pending |
| M8 | `8-agents.ts` | pending |
| M9 | `tokens-composer.ts` | pending |
