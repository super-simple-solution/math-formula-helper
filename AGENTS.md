# AGENTS.md — Latex Copy

## Project Overview

Latex Copy is a React + TypeScript chrome extension, built with WXT(vite for chrome extension).

## Tech Stack

- **Framework:** React 19 + TypeScript 6 (latest stable)
- **Build tool:** WXT
- **Styling:** Tailwind CSS v4 (via @tailwindcss/vite plugin)
- **Component library:** shadcn/ui (new-york style, lucide icons)
- **Icons:** lucide-react
- **Linting / Formatting:** Biome 2.x
- **Package manager:** pnpm

## Code Style and Structure

- Write clear, readable, production-quality code. Do not leave features partially implemented.
- Use functional React components with hooks.
- Prefer the latest stable React and TypeScript features and idioms.
- Keep components small and focused. Extract reusable logic into custom hooks under `src/hooks/`.
- Path aliases use `@/*` (configured in tsconfig and components.json).

## Naming Conventions

- **Components:** PascalCase (`MyComponent.tsx`)
- **Variables and functions:** camelCase
- **Files:** match the primary export's name

## UI and Styling

- Use shadcn/ui components from `src/components/ui/` for all standard UI primitives.
- Use `lucide-react` for all icons.
- Use Tailwind CSS utility classes directly; leverage `clsx` / `tailwind-merge` / `cn()` for conditional class merging.
- shadcn/ui config lives in `components.json` at the project root.

## Performance

- Memoize expensive computations and callbacks (`React.memo`).
- Lazy-load routes and heavy components with `React.lazy` + `Suspense`.
- Avoid unnecessary re-renders; keep props stable or memoized.
- Use efficient data structures and algorithms in visualization logic.

## Linting and Formatting (Biome)

Formatting and linting are enforced by Biome (`biome.json` at the project root). Key settings:

- **Formatter:** 2-space indent, 100-char line width, single quotes, semicolons as-needed.
- **Tailwind class sorting:** enforced via `useSortedClasses` rule on `className`, `clsx`, `cva`, `tw`, `cn`.
- **Linting highlights:**
  - `noUnusedVariables`: warn
  - `useExhaustiveDependencies`: off
  - `noExplicitAny`: off
  - `noConsole`: off (`console.log` allowed)
  - `noNonNullAssertion`: off
  - `noArrayIndexKey`: warn
  - shadcn/ui components under `src/components/ui/` are excluded from Biome linting.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Type-check (tsc) + production build |
