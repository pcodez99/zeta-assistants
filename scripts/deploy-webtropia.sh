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
compose exec -T app node -e '
const nodemailer = require("nodemailer");
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, requireTLS: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
});
transport.verify().then(() => console.log("SMTP TLS and authentication verified")).catch(error => {
  console.error("SMTP verification failed:", error.code, error.responseCode);
  process.exitCode = 1;
}).finally(() => transport.close());
'
