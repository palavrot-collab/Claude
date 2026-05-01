#!/usr/bin/env bash
# One-shot local setup. Idempotent — safe to re-run.
#
# Prereqs: Node 18+, npm, and either:
#   (a) Docker (preferred — `docker compose up -d` is run for you), or
#   (b) a local Postgres on :5432 with a database matching $DATABASE_URL.

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "→ Creating .env from .env.example"
  cp .env.example .env
fi

# Try Docker first; fall back to assuming Postgres is already running.
# We check `docker info` rather than just `docker compose version` so that an
# installed-but-not-running Docker daemon doesn't make us go down the Docker path.
if command -v docker >/dev/null 2>&1 \
    && docker info >/dev/null 2>&1 \
    && docker compose version >/dev/null 2>&1; then
  if ! docker compose ps --status=running --quiet postgres | grep -q .; then
    echo "→ Starting Postgres via docker compose"
    docker compose up -d postgres
  else
    echo "→ Postgres container already running"
  fi
  echo "→ Waiting for Postgres to accept connections"
  for _ in {1..30}; do
    if docker compose exec -T postgres pg_isready -U lms -d manager_lms >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
else
  echo "→ Docker daemon not running — assuming Postgres is reachable at the URL in .env"
fi

if [[ ! -d node_modules ]]; then
  echo "→ Installing dependencies"
  npm install
else
  echo "→ Dependencies already installed (skipping)"
fi

echo "→ Pushing Prisma schema"
npx prisma db push --skip-generate

echo "→ Seeding"
npm run db:seed

cat <<'EOF'

✔ Setup complete.

Start the dev server:
    npm run dev

Then open:
    http://localhost:3000/he   (Hebrew, RTL)
    http://localhost:3000/en   (English)

Sign in with one of the seeded users (the OTP will be printed to the
terminal where `npm run dev` is running):
    admin@acme.test   (ADMIN)
    demo@acme.test    (MANAGER)
EOF
