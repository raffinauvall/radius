import { AsyncLocalStorage } from 'node:async_hooks';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { getDatabase } from './database.js';

const database = await getDatabase();

const context = new AsyncLocalStorage();
const accountsFile = resolve(process.env.RADIUS_ACCOUNT_FILE || 'data/accounts.json');
const operationsFile = resolve(dirname(accountsFile), 'operations.json');
const uploadRoot = resolve(process.env.RADIUS_UPLOAD_DIR || 'dist/uploads');
const localSessions = new Map();
let local;
let writes = Promise.resolve();
const digest = token => createHash('sha256').update(token).digest('hex');
const unavailable = message => Object.assign(new Error(message), { status: 503 });

if (!database && !process.env.VERCEL) {
  local = { accounts: JSON.parse(await readFile(accountsFile, 'utf8')) };
  try { local.operations = JSON.parse(await readFile(operationsFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    local.operations = JSON.parse(await readFile(new URL('./data/operations.seed.json', import.meta.url), 'utf8'));
    await writeFile(operationsFile, JSON.stringify(local.operations, null, 2) + '\n', { mode: 0o600 });
  }
}
export const state = () => context.getStore() || local;
export const usesDatabase = Boolean(database);
export async function withState(callback) {
  if (local) return callback();
  if (!database) throw unavailable('DATABASE_URL belum tersedia untuk deployment ini.');
  const record = await database.demoState.findUnique({ where: { id: 'radius-demo' } });
  if (!record) throw unavailable('Database belum disiapkan. Jalankan migration dan seed.');
  return context.run(record.payload, callback);
}
export async function commit(kind, change) {
  if (database) {
    // ponytail: one locked JSONB row is enough for a demo; move to the relational models as volume grows.
    return database.$transaction(async tx => {
      const [record] = await tx.$queryRaw`SELECT "payload" FROM "DemoState" WHERE "id" = 'radius-demo' FOR UPDATE`;
      if (!record) throw unavailable('Database belum disiapkan.');
      const current = state(); Object.assign(current, record.payload);
      const next = structuredClone(current[kind]);
      const result = await change(next);
      await tx.demoState.update({ where: { id: 'radius-demo' }, data: { payload: { ...current, [kind]: next } } });
      current[kind] = next;
      return result;
    }, { maxWait: 15000, timeout: 15000 });
  }
  const pending = writes.then(async () => {
    const next = structuredClone(local[kind]); const result = await change(next);
    const file = kind === 'accounts' ? accountsFile : operationsFile;
    const temporary = `${file}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
    await rename(temporary, file); local[kind] = next; return result;
  });
  writes = pending.catch(() => {}); return pending;
}
export async function getSession(token) {
  if (!token) return null;
  if (!database) return localSessions.get(token);
  const session = await database.demoSession.findUnique({ where: { tokenHash: digest(token) } });
  return session && { ...session, expiresAt: session.expiresAt.getTime() };
}
export async function deleteSession(token) {
  if (!token) return;
  if (!database) { localSessions.delete(token); return; }
  await database.demoSession.deleteMany({ where: { tokenHash: digest(token) } });
}
export async function putSession(token, user, expiresAt) {
  if (!database) { localSessions.set(token, { userId: user.id, credentialHash: user.passwordHash, expiresAt }); return; }
  await database.demoSession.create({ data: { tokenHash: digest(token), userId: user.id, credentialHash: user.passwordHash, expiresAt: new Date(expiresAt) } });
  await database.demoSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
export async function deleteUserSessions(userId) {
  if (database) await database.demoSession.deleteMany({ where: { userId } });
  else for (const [token, session] of localSessions) if (session.userId === userId) localSessions.delete(token);
}
export async function saveImage(filename, mime, content) {
  // ponytail: small demo uploads stay in bytea; use object storage for a larger media catalog.
  if (database) await database.demoUpload.create({ data: { filename, mime, content } });
  else { await mkdir(uploadRoot, { recursive: true }); await writeFile(resolve(uploadRoot, filename), content, { flag: 'wx' }); }
}
export async function readImage(filename) {
  if (database) {
    const image = await database.demoUpload.findUnique({ where: { filename } });
    return image && { content: Buffer.from(image.content), mime: image.mime };
  }
  try { return { content: await readFile(resolve(uploadRoot, filename)) }; }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
