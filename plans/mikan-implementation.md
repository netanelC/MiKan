# Plan: MiKan Attendance System

> Source PRD: MiKan automated WhatsApp attendance bot for Israeli workgroups.

## Architectural decisions

Durable decisions that apply across all phases:

- **Monorepo Strategy**: Turborepo + pnpm. Shared packages for `whatsapp-engine`, `hebcal-scheduler`, and `blame-coordinator`.
- **Backend Stack**: Fastify (API) + Prisma (ORM) + PostgreSQL.
- **Frontend Stack**: React (Vite) with Basic Auth.
- **Routes**:
    - `GET /api/auth/qr`: Stream/SSE for WhatsApp authentication.
    - `POST /api/admin/config`: Update poll options/cron timings.
    - `GET /api/status`: Current bot state and active polls.
- **Schema**:
    - `GroupMember`: Immutable daily snapshot (WhatsApp ID, Name, Timestamp).
    - `AttendanceRecord`: Daily entries linked to members.
    - `PollState`: Tracks current poll IDs and option mappings.
- **Deployment**: OpenShift-ready Docker images. Local PV mapping for `.wwebjs_auth`.

---

## Phase 1: Foundation & Connectivity

**User stories**: 1, 2, 3, 4, 17, 18

### What to build

Establish the monorepo structure and the "Handshake." This phase builds the core infrastructure (Turborepo, Linting, Shared Config) and the ability to link a WhatsApp account via a React UI. It ensures that the bot can survive pod restarts in an OpenShift environment by persisting the session to a local volume.

### Acceptance criteria

- [ ] Turborepo scaffolded with `whatsapp-engine` package and `mikan-ui` app.
- [ ] React UI renders a Basic Auth login.
- [ ] UI streams a QR code from the `whatsapp-engine` via the API.
- [ ] WhatsApp session persists (pairing once allows the bot to reconnect after a process restart).
- [ ] Puppeteer runs successfully in a non-root, `--no-sandbox` container environment.

---

## Phase 2: The "Loop" (Snapshot & Polling)

**User stories**: 11, 12, 13, 19, 21

### What to build

The first true vertical slice of business value. Implement the 9:00 AM snapshot logic and the ability to send a native WhatsApp poll. This slice connects the database to the WhatsApp engine.

### Acceptance criteria

- [ ] At a triggered time, the system takes a snapshot of all group members and stores them in the DB.
- [ ] Bot sends a single-choice WhatsApp poll to the configured Group ID.
- [ ] Dashboard displays the "Active Poll" with the list of members expected to vote.
- [ ] Poll options are configurable via the UI/Admin API.

---

## Phase 3: The "Blame" (Scraper & Reminders)

**User stories**: 14, 15, 16, 22

### What to build

The active enforcement layer. Instead of waiting for events, the system will actively scrape the poll state at defined intervals and use the snapshot from Phase 2 to identify and tag non-voters.

### Acceptance criteria

- [ ] Bot successfully scrapes current poll results (votes per user).
- [ ] Comparison logic identifies users in the snapshot who haven't voted or revoked their vote.
- [ ] Bot sends a message in the group @mentioning the missing voters.
- [ ] "Blame" intervals are adjustable via configuration.

---

## Phase 4: The "Brain" (Hebcal Intelligence)

**User stories**: 6, 7, 8, 9, 10, 20

### What to build

Integration of the Israeli work week logic. The bot moves from a "simple daily cron" to an intelligent scheduler that understands Sofash, Erev Chag, and the N-1 lookahead polling requirement.

### Acceptance criteria

- [ ] Hebcal engine correctly identifies non-working days (Friday/Saturday/Chag).
- [ ] Lookahead logic: If tomorrow is a holiday, the bot sends multiple polls today (labeled accordingly).
- [ ] Database ensures 100% daily record coverage even for non-working days (automatic "Sofash" entries).
- [ ] Dashboard shows a calendar view of upcoming scheduled polls.

---

## Phase 5: Hardening & Production

**User stories**: 5

### What to build

Final production readiness. Instrumentation with OpenTelemetry for observability in the "Blame" cycle and final Helm chart refinements for OpenShift deployment.

### Acceptance criteria

- [ ] OTEL traces capture the start and end of scraping cycles.
- [ ] Failed WhatsApp connections trigger alerts/logs visible in OTEL.
- [ ] Helm charts use `site-values` pattern for environment-specific overrides.
- [ ] CI/CD pipeline correctly handles commit-based tagging and deployment.
