\<prd-template\>

## Problem Statement

Managing daily attendance for Israeli workgroups (especially in military or hybrid tech environments) is a tedious, manual process. The unique structure of the Israeli work week—combined with the complexities of the Hebrew calendar (Erev Chag, multi-day holidays, and standard weekends)—makes standard scheduling tools inadequate. Group managers are forced to manually send polls, track who hasn't voted across different days, and repeatedly ping non-voters. Furthermore, there is a need to maintain a verifiable attendance record for every single calendar day, even though polls can only legally/socially be sent on normal working days. Current manual workarounds are error-prone, annoying for managers, and lack a centralized dashboard for oversight.

## Solution

**MiKan**: An automated, highly resilient WhatsApp attendance bot and management system. Built as a TypeScript monorepo, MiKan integrates directly with WhatsApp to autonomously schedule and send attendance polls. It features a smart Hebrew Calendar engine that looks ahead to guarantee continuous daily coverage, batching polls for non-working days (Sofash, Chag) and sending them on the last available working day. It also features a strict "Blame" cycle that takes a snapshot of group members and automatically tags missing voters at defined intervals. The entire system is managed via a React UI, allowing administrators to seamlessly link the bot via a QR stream, edit poll options, and view attendance statuses in real-time.

## User Stories

**System & Infrastructure**

1.  As the system, I want to maintain a persistent WhatsApp connection, so that the bot remains active 24/7 without requiring daily logins.
2.  As the system, I want to save WhatsApp authentication data to a mounted Local PV, so that the session survives OpenShift pod restarts.
3.  As the system, I want to run Puppeteer as a non-root user (`--no-sandbox`), so that it complies with standard container security policies.
4.  As the system, I want to stream the WhatsApp QR code to the UI via the API, so that administrators can authenticate the bot without needing to view raw OpenShift pod logs.
5.  As the system, I want to trace bot state and connections using OpenTelemetry (OTEL), so that dropped connections or failed polls can be easily debugged in production.

**Smart Scheduling (Hebcal Engine)**
6\. As the system, I want to calculate the Hebrew calendar dates and holidays, so that I know which days are working days, Sofash, Erev Chag, or Chag.
7\. As the system, I want to guarantee that an attendance record is created for every single calendar day, so that there are no gaps in the database.
8\. As the system, I want to send polls _only_ on normal working days, so that employees are not bothered on weekends or holidays.
9\. As the system, I want to combine consecutive non-working days of the same type (e.g., Friday and Saturday into "Sofash"), so that chat spam is minimized.
10\. As the system, I want to execute a lookahead algorithm on every working day at 9:00 AM, so that if the next day is a non-working day, all necessary future polls are sent immediately.

**WhatsApp Interaction & Blame Cycle**
11\. As a group member, I want to interact with standard WhatsApp polls, so that recording my attendance is frictionless.
12\. As a group member, I want to be restricted to a single choice on the poll, so that attendance data remains accurate and unambiguous.
13\. As the system, I want to take a strict snapshot of group participants exactly at 9:00 AM when polls are sent, so that I know exactly who is expected to vote that day.
14\. As the system, I want to actively scrape the WhatsApp poll state at exactly 10:00, 10:30, 11:00, 11:30, 11:50, and 12:00, so that I have the most accurate, up-to-the-minute voting data.
15\. As the system, I want to tag (`@mention`) any user in the snapshot who has not voted during the scrape interval, so that they are reminded to log their attendance.
16\. As the system, I want to re-tag users who voted but subsequently revoked their vote, so that the system cannot be gamed.

**Management UI (React)**
17\. As an administrator, I want to log into the dashboard using Basic Auth, so that the system is secure from unauthorized access.
18\. As an administrator, I want to view a live QR code on the dashboard, so that I can easily link my WhatsApp account.
19\. As an administrator, I want to view active polls and current voter status, so that I know who is present, absent, or missing at a glance.
20\. As an administrator, I want to view a Hebrew Calendar interface, so that I can see when upcoming polls are scheduled to be sent.
21\. As an administrator, I want to edit the default text options of the polls, so that I can adapt the bot to different group requirements.
22\. As an administrator, I want to adjust the cron timestamps for the "Blame" cycle, so that I can customize how aggressive the bot is.

## Implementation Decisions

- **Architecture:** The project will be built as a TypeScript monorepo managed by `pnpm` and `Turborepo`.
- **Code Quality:** `ESLint` and `Prettier` will be configured at the monorepo root to enforce consistent formatting and catch syntax issues across all apps and packages.
- **Database:** PostgreSQL accessed via Prisma ORM.
- **Backend API:** Fastify will be used to serve the REST API and the QR code streaming endpoint.
- **Frontend UI:** React.
- **Configuration Management:** The `config` npm package will be used (`default.json`, `production.json`, `custom-environment-variables.json`) to elegantly map OpenShift environment variables and ConfigMaps into the application code.
- **Deployment:** The application will be containerized using Docker. A Helm Chart will define the OpenShift deployment resources, with all deployment configurations and overrides maintained centrally in the `site-values` repository.
- **CI/CD Pipeline:** GitHub Actions will handle the build, test, and deployment pipelines. The release process will prioritize an official commit-based tag flow triggered by merges to the master branch, omitting release candidate (RC) tags entirely.
- **Testing Framework:** `Vitest` will be utilized across the monorepo.
- **Module Boundaries:**
  - `whatsapp-engine`: Encapsulates `whatsapp-web.js` completely. Exposes interfaces for sending polls, scraping poll state, mentioning users, and streaming the QR code. Handles all persistence and Puppeteer configuration.
  - `hebcal-scheduler`: A pure domain logic module that wraps `@hebcal/core`. It strictly calculates the N-1 lookahead polling schedule and groups non-working days.
  - `blame-coordinator`: A service module that acts as the cron manager. It handles taking the 9:00 AM DB snapshot and executing the exact-minute scraping/blaming cycle.
  - `attendance-api`: The Fastify integration layer.
  - `mikan-ui`: The frontend dashboard.
- **Snapshot Logic:** The 9:00 AM snapshot is immutable for that day. Users joining the group at 9:05 AM are explicitly ignored by the system until the next day to prevent state conflicts.
- **Scraping Strategy:** Instead of relying on real-time WhatsApp event listeners (which can be flaky for polls), the system will actively query the poll state at the exact moment of the blame cron execution.

## Testing Decisions

- **Testing Philosophy:** A good test validates external behavior and business outcomes, not internal implementation details or private methods. Tests should provide high confidence without making refactoring difficult.
- **Primary Strategy:** The automated testing strategy will focus heavily on **integration tests** to ensure the boundaries between the API, the Blame Coordinator, and the WhatsApp Engine interact flawlessly.
- **Unit Testing Isolation:** Strict unit tests will be limited to complex algorithms rather than every code function. Specifically, the pure domain logic inside the `hebcal-scheduler` will undergo exhaustive unit testing to validate the Hebrew calendar computations without relying on database or network mocks.
- **Prior Art/Coverage:** Ensure comprehensive test coverage for the N-1 lookahead polling logic, validating output against known edge-case years (e.g., Rosh Hashanah falling adjacent to a weekend).

## Out of Scope

- Handling multiple WhatsApp Group IDs simultaneously (the bot currently targets a single, configurable Group ID per instance).
- Dynamic RBAC (Role-Based Access Control) or complex user management in the UI. Basic Auth is sufficient.
- Tracking attendance for users who join the WhatsApp group _after_ the 9:00 AM snapshot for that specific day.
- Sending direct messages (DMs) to users; all interaction and blaming occurs within the configured WhatsApp group.

## Further Notes

- **OpenShift Constraints:** Ensure the `.wwebjs_auth` directory (or equivalent) is strictly mapped to the Local PV in the OpenShift deployment configuration.
- **Observability:** Given the asynchronous nature of the "Blame" cycle and WhatsApp web connection stability, OTEL instrumentation should wrap the `whatsapp-engine` initialization and the `blame-coordinator` cron executions to provide immediate visibility into silent failures.

\</prd-template\>
