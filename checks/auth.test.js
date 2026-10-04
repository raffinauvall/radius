import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';

test('JSON authentication, registration persistence, and private account data', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'radius-auth-check-'));
  const file = join(temporary, 'accounts.json');
  await copyFile(new URL('../data/accounts.json', import.meta.url), file);
  const server = spawn(process.execPath, ['server.js', '0'], { env: { ...process.env, RADIUS_ACCOUNT_FILE: file }, cwd: new URL('..', import.meta.url) });
  const request = async (base, path, data, cookie) => {
    const response = await fetch(base + path, { method: data ? 'POST' : 'GET', headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  try {
    const [output] = await once(server.stdout, 'data');
    const base = output.toString().match(/http:\/\/localhost:\d+/)[0].replace('localhost', '127.0.0.1');
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
    const saved = JSON.parse(await readFile(file, 'utf8')).find(user => user.email === credentials.email);
    assert.ok(saved.passwordHash);
    assert.notEqual(saved.passwordHash, credentials.password);
    assert.equal(saved.password, undefined);
    const returning = await request(base, '/api/signin', credentials);
    assert.equal(returning.data.user.id, signup.data.user.id);
    const duplicate = { email: 'concurrent-check@example.test', name: 'Concurrent Check', password: '123' };
    const results = await Promise.all([request(base, '/api/signup', duplicate), request(base, '/api/signup', duplicate)]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  } finally {
    const stopped = once(server, 'exit');
    server.kill();
    await stopped;
    await rm(temporary, { recursive: true, force: true });
  }
});
