import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { seedDatabase } from '../demo-seed.js';

export async function databaseFixture({ vercel = false } = {}) {
  const url = new URL(process.env.RADIUS_TEST_DATABASE_URL);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/radius_test') throw new Error('Use an isolated localhost radius_test database, never presentation data.');
  const schema = `radius_check_${randomUUID().replaceAll('-', '')}`;
  url.searchParams.set('schema', schema);
  const databaseURL = url.toString();
  const db = new PrismaClient({ datasourceUrl: databaseURL });
  const env = { ...process.env, DATABASE_URL: databaseURL, DATABASE_URL_UNPOOLED: databaseURL, DIRECT_URL: databaseURL, VERCEL: vercel ? '1' : '' };
  const servers = [];
  const stop = async child => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const ended = once(child, 'exit'); child.kill(); await ended;
  };
  const dispose = async () => {
    for (const child of servers) await stop(child);
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await db.$disconnect();
  };
  try {
    await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    await db.$executeRawUnsafe(`CREATE TABLE "${schema}"."DemoState" ("id" TEXT PRIMARY KEY, "payload" JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL)`);
    await db.$executeRawUnsafe(`CREATE TABLE "${schema}"."DemoSession" ("tokenHash" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "credentialHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL)`);
    await db.$executeRawUnsafe(`CREATE TABLE "${schema}"."DemoUpload" ("filename" TEXT PRIMARY KEY, "mime" TEXT NOT NULL, "content" BYTEA NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await seedDatabase(db);
  } catch (error) { await dispose(); throw error; }
  const start = async (port = 0) => {
    const child = spawn(process.execPath, ['server.js', String(port)], { env, cwd: new URL('..', import.meta.url) });
    servers.push(child);
    const base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Fixture server startup timed out.')), 10000);
      child.once('error', () => { clearTimeout(timer); reject(new Error('Fixture server could not start.')); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Fixture server exited.')); });
      child.stdout.once('data', output => {
        clearTimeout(timer);
        const match = output.toString().match(/http:\/\/localhost:\d+/);
        match ? resolve(match[0].replace('localhost', '127.0.0.1')) : reject(new Error('Fixture server did not report its URL.'));
      });
    });
    return { child, base };
  };
  return { db, servers, start, stop, dispose, payload: async () => (await db.demoState.findUnique({ where: { id: 'radius-demo' } })).payload };
}
