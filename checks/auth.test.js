import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { databaseFixture } from './database-fixture.js';

test('Missing database configuration cannot fall back to JSON', () => {
  const result = spawnSync(process.execPath, ['server.js', '0'], { env: { ...process.env, DATABASE_URL: '', POSTGRES_PRISMA_URL: '', POSTGRES_URL: '' }, cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /DATABASE_URL wajib diisi/);
});

test('Database authentication, registration persistence, and private account data', { skip: !process.env.RADIUS_TEST_DATABASE_URL }, async () => {
  const fixture = await databaseFixture();
  const request = async (base, path, data, cookie) => {
    const response = await fetch(base + path, { method: data ? 'POST' : 'GET', headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  try {
    const { base } = await fixture.start();
    assert.equal((await request(base, '/api/account')).status, 401);
    assert.equal((await request(base, '/data/accounts.json')).status, 404);
    assert.equal((await request(base, '/data/customer.json')).status, 404);
    assert.equal((await request(base, '/api/signin', { email: 'peter@gmail.com', password: 'wrong' })).status, 401);
    assert.equal((await request(base, '/api/signin', { email: 'missing@example.test', password: '123' })).status, 401);
    const login = await request(base, '/api/signin', { email: ' PETER@gmail.com ', password: '123' });
    assert.equal(login.status, 200);
    assert.equal(login.data.user.name, 'Andreas Peterang');
    assert.equal(login.data.user.passwordHash, undefined);
    const account = await request(base, '/api/account', null, login.cookie);
    assert.equal(account.data.email, 'peter@gmail.com');
    assert.ok(account.data.tickets.length > 0);
    assert.equal((await request(base, '/api/signout', {}, login.cookie)).status, 200);
    assert.equal((await request(base, '/api/account', null, login.cookie)).status, 401);
    const credentials = { email: 'signup-check@example.test', name: 'Signup Check', password: '123' };
    const signup = await request(base, '/api/signup', credentials);
    assert.equal(signup.status, 200);
    const fresh = await request(base, '/api/account', null, signup.cookie);
    assert.deepEqual(fresh.data.tickets, []);
    assert.equal(fresh.data.membership.price, 0);
    assert.equal((await request(base, '/api/signup', credentials)).status, 409);
    const saved = (await fixture.payload()).accounts.find(user => user.email === credentials.email);
    assert.ok(saved.passwordHash);
    assert.notEqual(saved.passwordHash, credentials.password);
    assert.equal(saved.password, undefined);
    const returning = await request(base, '/api/signin', credentials);
    assert.equal(returning.data.user.id, signup.data.user.id);
    const duplicate = { email: 'concurrent-check@example.test', name: 'Concurrent Check', password: '123' };
    const results = await Promise.all([request(base, '/api/signup', duplicate), request(base, '/api/signup', duplicate)]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  } finally {
    await fixture.dispose();
  }
});
