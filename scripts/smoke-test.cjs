// Run from apps/backend against a disposable, migrated test database.
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const backendRequire = createRequire(resolve(__dirname, "../apps/backend/package.json"));
const { PrismaClient } = backendRequire("@prisma/client");
const prisma = new PrismaClient();
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const suffix = require("node:crypto").randomUUID().replaceAll("-", "");
const email = `smoke-${suffix}@example.invalid`;
let readingId;

async function call(path, options = {}) {
  return fetch(`${base}/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    signal: AbortSignal.timeout(10000),
  });
}

async function run() {
  assert.equal((await call("/health")).status, 200);
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await call("/weather/latest")).status, 401);
  const google = await call("/auth/google/login", { redirect: "manual" });
  assert.equal(google.status, 302);
  const googleUrl = new URL(google.headers.get("location"));
  assert.equal(googleUrl.hostname, "accounts.google.com");
  assert.equal(googleUrl.searchParams.get("redirect_uri"), process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/auth/google/callback");
  assert.equal(googleUrl.searchParams.get("response_type"), "code");
  const measurement = { temperature: 22.5, humidity: 55, pressure: 1013.2 };
  assert.equal((await call("/weather/report", { method: "POST", body: JSON.stringify(measurement) })).status, 401);
  const headers = { "x-api-key": process.env.WEATHER_API_KEY };
  assert.equal((await call("/weather/report", { method: "POST", headers, body: "{}" })).status, 400);

  const registered = await call("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username: `smoke${suffix}`, name: "Smoke Test", password: `Smoke-${suffix}` }),
  });
  assert.equal(registered.status, 201);
  const session = await registered.json();
  const wrongLogin = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'definitely-wrong' }) });
  assert.equal(wrongLogin.status, 401);
  const caseLogin = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email: `  ${email.toUpperCase()}  `, password: `Smoke-${suffix}` }) });
  assert.equal(caseLogin.status, 201, 'Email case and whitespace do not prevent login');
  const authorization = { Authorization: `Bearer ${session.accessToken}` };
  const initial = await call("/weather/latest", { headers: authorization });
  assert.equal(initial.status, 200);
  assert.ok(Object.hasOwn(await initial.json(), "reading"));

  const report = await call("/weather/report", { method: "POST", headers, body: JSON.stringify(measurement) });
  assert.equal(report.status, 201);
  const saved = await report.json();
  readingId = saved.id;
  const latest = await (await call("/weather/latest", { headers: authorization })).json();
  assert.equal(latest.reading.id, readingId);
  for (const key of Object.keys(measurement)) assert.equal(latest.reading[key], measurement[key]);
  assert.ok(!Number.isNaN(Date.parse(latest.reading.createdAt)));
  const history = await (await call("/weather/history?range=24h", { headers: authorization })).json();
  assert.ok(history.some(row => row.id === readingId));
  await require('./password-reset-test.cjs')({ prisma, call, email, session, oldPassword: `Smoke-${suffix}` });
  console.log("PASS: health, frontend, authentication, validation, ingestion, latest reading and history");
}

run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  try {
    if (readingId) await prisma.sensorReading.deleteMany({ where: { id: readingId } });
    await prisma.user.deleteMany({ where: { email } });
  } finally {
    await prisma.$disconnect();
  }
});
