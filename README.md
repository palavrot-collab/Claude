# Manager LMS

Simple LMS for managers in an ongoing development program.
Multi-tenant (multiple organizations), Hebrew + English with full RTL support.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- NextAuth (email OTP for MVP, SSO hookable per organization)
- next-intl for i18n + RTL

## Modules

1. **Dashboard** — overall progress, next evaluation, recommended materials, recent tools.
2. **Self-evaluation** — quarterly questionnaire across competencies, history, trend, side-by-side with previous period.
3. **Library** — enrichment materials filterable by tag, completion + favorite tracking per user.
4. **Toolbox** — practical templates (1:1, feedback) with saved entries per user.

## Data model

Multi-tenant: every user belongs to a `Organization`.
Materials and Tools can be `organizationId = null` (global) or org-scoped.
Competencies are org-scoped so each program can be tailored.

See `prisma/schema.prisma`.

## Auth

- MVP: email + 6-digit one-time code (in-memory store; swap for Redis in prod).
- SSO: hook point in `src/lib/auth.ts` — add a SAML/OIDC provider per organization.
  An organization-level flag would gate which provider applies.

## Local development

```bash
cp .env.example .env
# adjust DATABASE_URL to point at a Postgres instance
npm install
npm run db:push
npm run db:seed
npm run dev
```

Visit `http://localhost:3000/he` (Hebrew, RTL) or `http://localhost:3000/en`.

## Roadmap

- **MVP (built):** auth, dashboard, evaluation, library, toolbox.
- **Phase 2:** admin reports, email reminders, recommendation engine.
- **Phase 3:** SSO per organization, audit log, exports.
