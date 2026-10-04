# MeteoStation - Weather Station Dashboard (pnpm Monorepo)

MeteoStation is a lightweight, responsive monorepo application to manage users, authentication, ESP32 system configuration, real-time polling, and historical sensor readings.

## Architecture

* **Frontend**: Built with **Vite**, **React**, **TypeScript**, **TanStack Router**, **TanStack Query**, **Tailwind CSS v4**, and **Recharts**.
  * **Latest readings**: The frontend polls the backend `/api/weather/latest` every 10 seconds; the ESP32 sends readings to the backend. No browser access to the local network is needed.
  * **Historical**: The frontend queries the NestJS backend to retrieve historical weather trends.
* **Backend**: Built with **NestJS**, **Prisma**, and **PostgreSQL**. Exposes `/api/auth` for authentication, `/api/settings` for ESP32 configuration, and `/api/weather` for reports and history.
* **Shared Schema**: `@repo/schema` contains typescript types and zod validations shared between apps.

---

## Getting Started

### 1. Prerequisites
Ensure you have **Node.js (>=18.0.0)** and **pnpm (>=9.0.0)** installed on your machine.

### 2. Install Dependencies
Run from the root directory:
```bash
pnpm install
```

### 3. Start Database
Run the local PostgreSQL database via Docker:
```bash
docker compose up -d
```
*(Ensure port 5432 is not occupied by another database server).*

### 4. Run Migrations & Client Generation
Set up the tables in PostgreSQL and generate the Prisma Client:
```bash
pnpm --filter backend prisma:migrate
```

### 5. Local Development
Start the NestJS backend (port 3000) and the Vite frontend (port 3001) concurrently:
```bash
pnpm dev
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## ESP32 Integration

### 1. Ingestion Endpoint
The ESP32 should send historical readings (e.g. every 5 minutes) via a `POST` request to the backend:
* **URL**: `http://<your-backend-ip>:3000/api/weather/report`
* **Headers**:
  * `Content-Type: application/json`
  * `x-api-key: super-secret-esp32-api-key`
* **JSON Body**:
  ```json
  {
    "temperature": 22.5,
    "humidity": 55.0,
    "pressure": 1013.2
  }
  ```

### 2. Simulate ESP32 Report (Curl)
You can test ingestion by simulating an ESP32 sending data using curl:
```bash
curl -X POST http://localhost:3000/api/weather/report \
  -H "x-api-key: super-secret-esp32-api-key" \
  -H "Content-Type: application/json" \
  -d '{"temperature": 21.8, "humidity": 45.5, "pressure": 1012.3}'
```

### 3. Latest reading

Authenticated clients call `GET /api/weather/latest`. The response is
`{"reading": null}` before the first report, then `{"reading": {...}}` with
`temperature`, `humidity`, `pressure`, `id`, and `createdAt`.
The dashboard shows the last reception time and marks readings older than ten
minutes as outdated. Missing readings are never replaced with demo values.

---

## Production Build & Serve

To compile the frontend static files and serve them directly from the NestJS backend (on a single port):

1. **Build all projects**:
   ```bash
   pnpm build
   ```
   This compiles `@repo/schema`, builds the frontend into `apps/frontend/dist`, and compiles the backend into `apps/backend/dist`.

2. **Start the production server**:
   ```bash
   pnpm --filter backend start:prod
   ```
   The backend will now serve the frontend static files at `http://localhost:3000` and expose the API at `http://localhost:3000/api`.

## Webtropia production

The deployment follows the glucose layout:

- Application: `/opt/assistants/app`, Compose project `assistants`.
- Secrets: `/opt/assistants/.env.production` (mode 600), never committed.
- PostgreSQL 17 in Docker with persistent `assistants_postgres_data` volume,
  on a private internal network with no published database port.
- App bound to `127.0.0.1:9522`, served by OpenLiteSpeed at
  `https://assistant.zetalinks.it`.
- Liveness and database check: `GET /api/health`.

Required environment variables are `POSTGRES_PASSWORD`, `JWT_SECRET`,
`REFRESH_JWT_SECRET`, and `WEATHER_API_KEY`. Generate independent random values;
use a hexadecimal database password so the database URL needs no escaping.

After syncing the source, run `sh scripts/deploy-webtropia.sh` on the server.
The script builds the image, starts PostgreSQL, applies Prisma migrations and
waits for the application health check. Do not run `docker compose down -v`,
which would delete the database volume.

Backup:

```sh
cd /opt/assistants/app
docker compose --env-file /opt/assistants/.env.production -f compose.prod.yml \
  exec -T postgres pg_dump -U assistants -d assistants -Fc \
  > /opt/assistants/backups/assistants-$(date +%Y%m%d-%H%M%S).dump
```

The firmware `esp32_oled_test` only displays local readings. Use
`firmware/esp32_station/esp32_station.ino` for Wi-Fi and authenticated HTTPS
reports; see its README and configure the ignored `secrets.h` file. The repository currently permits account registration; every
registered account can view the shared station readings.

### Automatic deployment (same workflow as glucose)

`.github/workflows/deploy-webtropia.yml` runs on pushes to `main` and manual
`workflow_dispatch`. It builds and runs API integration checks with a disposable
PostgreSQL database, then uploads the release with rsync as `deployuser` and runs
the server deploy script. The GitHub `Production` environment requires:

- `WEBTROPIA_HOST`
- `WEBTROPIA_SSH_PRIVATE_KEY` (dedicated deployment key)
- `WEBTROPIA_SSH_KNOWN_HOSTS` (verified server host key)

The `deployuser` account must own `/opt/assistants` and be able to use Docker.
Application/database secrets stay on the server, outside the rsync destination.
