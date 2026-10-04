const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

module.exports = async function testRecovery({ prisma, call, email, session, oldPassword }) {
  const mailbox = process.env.MAILPIT_URL;
  assert.ok(mailbox, 'MAILPIT_URL is required: use a disposable SMTP inbox for recovery tests');
  const request = address => call('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: address }) });
  const reset = (token, password) => call('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
  const messages = async () => {
    const response = await fetch(`${mailbox}/api/v1/messages`);
    assert.equal(response.status, 200);
    return (await response.json()).messages.filter(item => item.To.some(to => to.Address === email));
  };
  async function deliveredToken(previous = new Set()) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const delivered = (await messages()).find(item => !previous.has(item.ID));
      if (delivered) {
        const response = await fetch(`${mailbox}/api/v1/message/${delivered.ID}`);
        const detail = await response.json();
        const token = detail.Text.match(/\/reset-password#token=([a-f0-9]{64})/)?.[1];
        assert.ok(token, 'SMTP email contains a reset link');
        assert.ok(detail.HTML.includes(token), 'HTML and plain text have the same reset token');
        assert.ok(detail.Text.includes('30 minuti'));
        return token;
      }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('Reset email was not delivered to the test SMTP server');
  }
  const unknown = await request(`unknown-${email}`);
  const known = await request(email.toUpperCase());
  assert.equal(unknown.status, 201);
  assert.equal(known.status, 201);
  assert.deepEqual(await unknown.json(), await known.json(), 'Account existence is not disclosed');
  const token = await deliveredToken();
  const user = await prisma.user.findUnique({ where: { email } });
  assert.notEqual(user.passwordResetHash, token);
  assert.equal(user.passwordResetHash, createHash('sha256').update(token).digest('hex'));
  assert.equal((await request(email)).status, 201);
  assert.equal((await prisma.user.findUnique({ where: { email } })).passwordResetHash, user.passwordResetHash, 'Account cooldown keeps the existing link usable');
  assert.equal((await reset(token, 'short')).status, 400);
  assert.equal((await reset(token, 'é'.repeat(40))).status, 400, 'Reject passwords beyond bcrypt byte limit');
  await prisma.user.update({ where: { email }, data: { passwordResetExpiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await reset(token, 'Expired-Test-Password')).status, 400);
  const oldMessages = new Set((await messages()).map(item => item.ID));
  await prisma.user.update({ where: { email }, data: { passwordResetSentAt: null } });
  assert.equal((await request(email)).status, 201);
  const nextToken = await deliveredToken(oldMessages);
  assert.notEqual(nextToken, token);
  assert.equal((await reset(token, 'Superseded-Test-Password')).status, 400);
  const newPassword = 'New-Password-123!';
  const results = await Promise.all([reset(nextToken, newPassword), reset(nextToken, newPassword)]);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 400], 'Concurrent token redemption succeeds exactly once');
  assert.equal((await reset(nextToken, newPassword)).status, 400, 'Used token cannot be replayed');
  assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0);
  assert.equal((await call('/auth/me', { headers: { Authorization: `Bearer ${session.accessToken}` } })).status, 401, 'Existing access token is revoked');
  const refreshed = await call('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh: session.refreshToken, sessionId: session.sessionId }) });
  assert.ok([400, 401].includes(refreshed.status), 'Existing refresh token is revoked');
  const login = password => call('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  assert.equal((await login(oldPassword)).status, 401);
  assert.equal((await login(newPassword)).status, 201);
  const cleared = await prisma.user.findUnique({ where: { email } });
  assert.equal(cleared.passwordResetHash, null);
  assert.equal(cleared.passwordResetExpiresAt, null);
  let limited;
  for (let attempt = 0; attempt < 11; attempt++) {
    limited = await request(`missing-${attempt}@example.invalid`);
    if (limited.status === 429) break;
  }
  assert.equal(limited.status, 429, 'Recovery endpoint rate limits repeated requests');
  assert.ok(limited.headers.get('retry-after'));
  console.log('PASS: SMTP delivery, generic recovery response, cooldown, expiry, password validation, single-use concurrency, revoked sessions and new login');
};
