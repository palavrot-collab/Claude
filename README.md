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
2. **Self-evaluation** — quarterly questionnaire across competencies, history, side-by-side with previous period, SVG trend chart.
3. **Library** — enrichment materials filterable by tag, completion + favorite tracking per user.
4. **Toolbox** — practical templates (1:1, feedback) with saved entries per user.
5. **Admin** (gated) — competencies / materials / tools / users management; reports with completion rate and per-competency averages.

## Auth

- MVP: email + 6-digit one-time code (in-memory store; swap for Redis in prod).
- SSO: hook point in `src/lib/auth.ts` — add a SAML/OIDC provider per organization.

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

Seeded users:
- `admin@acme.test` (ADMIN, Acme org)
- `demo@acme.test` (MANAGER, Acme org)
- `demo@globex.test` (MANAGER, Globex org, English by default)

In dev the OTP code is printed to the server console (no real email sent).

## Deployment — Vercel + Neon

1. **Create a Neon database** at [neon.tech](https://neon.tech) (free tier is fine for the MVP). Copy the *pooled* connection string from the Neon dashboard — it ends in `-pooler.<region>.aws.neon.tech`.

2. **Import the repo** in Vercel (or `vercel` CLI). Framework auto-detects as Next.js. The repo includes `vercel.json` which sets the build command to run `prisma generate` before `next build`.

3. **Set environment variables** in Vercel project settings:

   | Name              | Value                                                                                                            |
   | ----------------- | ---------------------------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`    | Neon pooled URL with `?sslmode=require&pgbouncer=true&connection_limit=1`                                        |
   | `NEXTAUTH_SECRET` | A random 32-byte secret. Generate with `openssl rand -base64 32`                                                 |
   | `NEXTAUTH_URL`    | The full deployed URL, e.g. `https://your-app.vercel.app`                                                        |

4. **Push schema to Neon** once before the first deploy:

   ```bash
   DATABASE_URL="<neon-pooled-url>" npx prisma db push
   ```

5. **Seed (optional)**, only if you want the demo data in production:

   ```bash
   DATABASE_URL="<neon-pooled-url>" npm run db:seed
   ```

6. **Deploy**. Vercel runs `npm install` (which triggers `postinstall: prisma generate`) and then `prisma generate && next build`.

7. **First admin login** — request an OTP for the seeded admin user from the deployed `/he/sign-in`. In production the in-memory mailer in `src/lib/mailer.ts` will throw, so before going live wire it to a real provider (SES, SendGrid, Resend, etc.).

### Notes

- `pgbouncer=true&connection_limit=1` keeps Prisma compatible with Neon's connection pooler in serverless environments.
- The `mailer.ts` stub deliberately throws in production. Replace it with your provider of choice; the function signature is `sendOtpEmail(email, code, locale)`.

## Roadmap

- **MVP (built):** auth, dashboard, evaluation, library, toolbox, full admin, reports.
- **Phase 2:** real mailer integration, period reminders, SSO per organization.
- **Phase 3:** audit log, exports, recommendation engine.
