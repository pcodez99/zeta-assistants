#!/bin/sh
set -eu
cd /opt/assistants/app
compose() {
  docker compose --env-file /opt/assistants/.env.production -f compose.prod.yml "$@"
}
compose build app
compose up -d --wait postgres
compose run --rm --no-deps app pnpm exec prisma migrate deploy
compose up -d --wait app
curl -fsS http://127.0.0.1:9522/api/health
