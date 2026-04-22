# Provost

AI Family Wealth Advisor — unified Next.js + Convex platform.

## Stack

- Next.js 16 (App Router, React 19)
- Convex (backend, reactive DB, file storage, vector search, cron, agent actions)
- Clerk (auth)
- OpenAI (gpt-4.1 / gpt-5)
- Tailwind CSS 4
- Turborepo + pnpm
- Vercel (hosting)

## Monorepo layout

```
apps/web/              # Next.js 16 app (App Router)
packages/ui/           # Shared React component library
packages/config/       # Shared ESLint, TypeScript, Tailwind configs
packages/schemas/      # Zod schemas shared across app and Convex
packages/agent/        # AI agent utilities and prompt helpers
convex/                # Convex backend functions (Phase 1+)
```

## Dev setup

1. `pnpm install`
2. Copy `.env.example` to `.env.local` and fill in values
3. `pnpm dev` — starts Next.js dev server
4. `npx convex dev` — starts Convex dev backend (Phase 1+)

## Plan

Full implementation plan at `~/.claude/plans/there-is-a-polished-sparkle.md`.
