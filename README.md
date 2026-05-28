# MeteoStation - Weather Station Dashboard (pnpm Monorepo)

MeteoStation is a lightweight, responsive monorepo application to manage users, authentication, ESP32 system configuration, real-time polling, and historical sensor readings.

## Architecture

* **Frontend**: Built with **Vite**, **React**, **TypeScript**, **TanStack Router**, **TanStack Query**, **Tailwind CSS v4**, and **Recharts**.
  * **Real-time**: The frontend queries the ESP32 directly on the local network (CORS enabled) via its IP address (configured in settings).
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

### 3. ESP32 Local Server (Real-time)
The frontend dashboard queries the ESP32 directly via its IP address to display live metrics. The ESP32 must expose a `/data` HTTP GET endpoint returning:
```json
{
  "temperature": 21.8,
  "humidity": 45.5,
  "pressure": 1012.3
}
```
*Note: Ensure the ESP32 HTTP response headers include `Access-Control-Allow-Origin: *` to prevent CORS issues in the browser.*

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
