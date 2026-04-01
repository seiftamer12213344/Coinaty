# Coinaty — Replit.md

## Overview

Coinaty is a social network for coin collectors (numismatists). It allows users to build a digital "Coin Vault," browse a shared gallery of coins, interact via likes and comments, chat via direct messages, and track the estimated value of their collection. The app follows a "Royal Museum" visual theme with gold and charcoal tones.

**Key features:**
- Coin posting with photo, title, description, category, and optional metal type
- Social feed (like a gallery/news feed), likes with modal showing who liked, and comments
- User profiles with rank/points gamification system (Novice → Numismatist → Master)
- **Vault folders** — users can create named folders/collections within their vault to organize coins; click a folder to drill in, rename or delete via context menu, and a "Folders" hover button on each coin card to assign it to one or more folders
- Direct messaging between users
- Numista integration for looking up coins by name
- Group chats with invitation system (create groups, invite via DM page, accept/decline)
- AI-powered coin chatbot (via OpenAI)
- Email/password authentication (register + login) alongside Replit OIDC
- Dark/light theme toggle with persistent preference
- **Full internationalization (EN/AR/FR)** — language selector in Settings, RTL support for Arabic, all pages translated via `useLanguage()` hook from `client/src/lib/i18n.tsx`

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend

- **Framework:** React (Vite, TSX)
- **Routing:** `wouter` (lightweight client-side router)
- **State / Data Fetching:** TanStack React Query v5 — all API calls go through hooks in `client/src/hooks/`
- **UI Components:** shadcn/ui (Radix UI primitives) + Tailwind CSS
- **Animations:** Framer Motion for page transitions and micro-interactions
- **Theme:** Custom CSS variables for dark/light mode. Dark = Deep Charcoal (#121212), accent = Brushed Gold (#D4AF37). Theme stored in `localStorage` under key `coinaty-theme`.
- **Layout:** Desktop uses a fixed left sidebar (`Shell.tsx`). Mobile uses a bottom navigation bar. Responsive breakpoint at 768px.
- **Fonts:** Cinzel (serif, for headings), DM Sans (body)

**Pages:**
| Route | Component | Purpose |
|---|---|---|
| `/` | Home | Coin gallery feed with category filters |
| `/add-coin` | AddCoin | Numista search + manual coin entry form |
| `/coin/:id` | CoinDetails | Single coin view with comments and likes |
| `/profile` | Profile | Own profile (vault + wishlist tabs) |
| `/profile/:id` | Profile | Another user's profile |
| `/leaderboard` | Leaderboard | Points-ranked user list |
| `/messages` | Messages | DM inbox + active conversation |
| `/search` | Search | Search users by display name |
| `/settings` | Settings | Account security, collection preferences, privacy, notifications, danger zone |

### Backend

- **Framework:** Express.js (TypeScript, ESM)
- **Entry:** `server/index.ts` → `server/routes.ts`
- **Storage Layer:** `server/storage.ts` — `DatabaseStorage` class implements `IStorage` interface with all DB operations (coins, likes, comments, messages, users)
- **Authentication:** Replit OpenID Connect (OIDC) via `passport` + `openid-client`. Sessions stored in PostgreSQL using `connect-pg-simple`. Auth logic lives in `server/replit_integrations/auth/`.
- **Numista API:** `server/numista.ts` — wraps Numista v3 API (with mock fallback data). Requires `NUMISTA_API_KEY` env var.
- **AI Chatbot:** OpenAI integration (via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`) for the in-app coin assistant (`CoinChatbot.tsx`).
- **Build:** `script/build.ts` — Vite for client, esbuild for server (bundled into `dist/index.cjs`). Selected deps are bundled; others are external.

### Shared Code

- **`shared/schema.ts`** — Single source of truth for all DB table definitions (Drizzle ORM) and Zod insert schemas
- **`shared/routes.ts`** — Typed API route registry with Zod schemas for inputs and responses. Both client hooks and server handlers use this, preventing drift.
- **`shared/models/`** — Supplementary model definitions (auth, chat)

### Database

- **PostgreSQL** via Drizzle ORM (`drizzle-orm/node-postgres`)
- **Tables:**
  - `sessions` — express-session store (required for Replit Auth)
  - `users` — profile, points, display name, avatar URL
  - `coins` — vault entries (title, description, category, photo URL, metal type, estimated value, Numista ID)
  - `coin_likes` — many-to-many: user ↔ coin
  - `comments` — per-coin comments with userId
  - `messages` — direct messages between two users (senderId, receiverId)
  - `groups` — group chat rooms (name, createdBy)
  - `group_members` — group membership (groupId, userId, role: admin/member)
  - `group_messages` — messages within a group (groupId, senderId, content)
  - `group_invitations` — pending/accepted/declined invitations (groupId, inviterId, inviteeId, status)
  - `user_settings` — per-user preferences (units, grading scale, message privacy, ghost mode, email notification toggles)
  - `blocked_users` — blocked user relationships (userId, blockedUserId)
  - `conversations` / `messages` (chat models) — used by the AI chatbot integration
- **Migrations:** `drizzle-kit push` (`db:push` script); migration files in `./migrations/`
- **Connection:** `DATABASE_URL` environment variable required

### Gamification (Points & Ranks)

- 10 pts per coin uploaded, 5 pts per comment, 2 pts per like received
- Ranks:
  - 1–100 pts → Novice Collector
  - 101–500 pts → Numismatist
  - 500+ pts → Master of Coinaty
- Points and ranks are displayed on profiles and the leaderboard

### Messaging & Groups

- Direct messages are stored in the `messages` table (senderId / receiverId columns)
- The client polls `/api/messages/:userId` every 5 seconds for new messages (simple MVP polling, not WebSocket)
- Group chats: users create groups, invite others (invitation sent via group UI on the Messages page), invitees accept/decline. Group messages poll every 5s. The Messages page has DM/Groups tabs.

### Replit Integration Modules

Located in `server/replit_integrations/` and `client/replit_integrations/`:
- **auth/** — OIDC setup, session middleware, user upsert
- **chat/** — AI conversation storage + OpenAI chat routes
- **audio/** — Voice recording hooks (client) and PCM16 streaming + Whisper STT routes (server)
- **image/** — Image generation via OpenAI gpt-image-1
- **batch/** — Rate-limited batch processing utility with p-limit + p-retry

---

## External Dependencies

| Service / Library | Purpose | Config |
|---|---|---|
| **PostgreSQL** | Primary database | `DATABASE_URL` env var |
| **Replit Auth (OIDC)** | User authentication | `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET` env vars |
| **OpenAI API** (via Replit AI Integrations) | Coin chatbot (chat completions), image generation, voice STT | `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL` env vars |
| **Numista API v3** | Coin search and detail lookup | `NUMISTA_API_KEY` env var; mock data provided as fallback |
| **Google Fonts** | Cinzel + DM Sans typography | Loaded via `<link>` in `index.html` |
| **TanStack React Query** | Client-side data fetching and caching | Configured in `client/src/lib/queryClient.ts` |
| **Drizzle ORM + drizzle-kit** | Database ORM and migrations | `drizzle.config.ts` pointing to `shared/schema.ts` |
| **connect-pg-simple** | PostgreSQL session store | Requires `sessions` table to exist |
| **Framer Motion** | UI animations | Used in CoinDetails, Home |
| **shadcn/ui + Radix UI** | Accessible UI components | Config in `components.json` |
| **Vite** | Frontend dev server and build | Config in `vite.config.ts` |
| **esbuild** | Server bundle for production | Used in `script/build.ts` |

### Key Environment Variables Required

```
DATABASE_URL          # PostgreSQL connection string
SESSION_SECRET        # Express session encryption secret
REPL_ID               # Replit app ID (for OIDC)
ISSUER_URL            # OIDC issuer (default: https://replit.com/oidc)
NUMISTA_API_KEY       # Numista API key (optional, mock fallback exists)
AI_INTEGRATIONS_OPENAI_API_KEY   # OpenAI key for chatbot/image/audio
AI_INTEGRATIONS_OPENAI_BASE_URL  # OpenAI base URL (Replit proxy)
```