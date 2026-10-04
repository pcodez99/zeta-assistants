const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const vm = require('node:vm');
const frontendRequire = createRequire(resolve(__dirname, '../apps/frontend/package.json'));
const ts = frontendRequire('typescript');
const axios = frontendRequire('axios');
const storage = new Map([['color-scheme', 'dark']]);
const localStorage = {
  getItem: key => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
};
const window = new EventTarget();
const moduleUnderTest = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(resolve(__dirname, '../apps/frontend/src/lib/api.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, { module: moduleUnderTest, exports: moduleUnderTest.exports, require: frontendRequire, localStorage, window, Event });
const { api, setAccessToken, getAccessToken, subscribeAuth } = moduleUnderTest.exports;
function unauthorized(config) {
  return Promise.reject(new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, { status: 401, data: {}, config }));
}
async function run() {
  let updates = 0;
  const unsubscribe = subscribeAuth(() => updates++);
  setAccessToken('old');
  assert.equal(getAccessToken(), 'old');
  assert.equal(updates, 1, 'Header subscribers see login state changes');
  storage.set('refreshToken', 'refresh'); storage.set('sessionId', 'session');
  let refreshes = 0;
  axios.defaults.adapter = async config => {
    if (config.url === '/api/auth/login') return unauthorized(config);
    refreshes++;
    await new Promise(resolve => setTimeout(resolve, 10));
    return { status: 201, data: { accessToken: 'new', refreshToken: 'new-refresh' }, config };
  };
  await assert.rejects(axios.post('/api/auth/login', {}));
  assert.equal(refreshes, 0, 'Invalid login must not restore a previous session');
  api.defaults.adapter = config => config.headers.Authorization === 'Bearer new'
    ? Promise.resolve({ status: 200, data: {}, config }) : unauthorized(config);
  await Promise.all([api.get('/weather/latest'), api.get('/weather/history')]);
  assert.equal(refreshes, 1, 'Concurrent expired requests share one refresh');
  assert.equal(getAccessToken(), 'new');
  assert.equal(storage.get('refreshToken'), 'new-refresh');
  setAccessToken('expired');
  axios.defaults.adapter = async config => {
    await new Promise(resolve => setTimeout(resolve, 10));
    return unauthorized(config);
  };
  let expired = 0;
  window.addEventListener('auth-expired', () => expired++);
  const failed = await Promise.allSettled([api.get('/weather/latest'), api.get('/weather/history')]);
  assert.ok(failed.every(result => result.status === 'rejected'));
  assert.equal(expired, 1);
  assert.equal(getAccessToken(), null);
  assert.equal(storage.has('refreshToken'), false);
  assert.equal(storage.get('color-scheme'), 'dark', 'Signing out preserves theme preference');
  unsubscribe();
  console.log('PASS: login error isolation, reactive auth state, concurrent refresh, session expiry and preserved preferences');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
