import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { getDatabase } from './database.js';

const database = await getDatabase();

const context = new AsyncLocalStorage();
const digest = token => createHash('sha256').update(token).digest('hex');
const unavailable = message => Object.assign(new Error(message), { status: 503 });

export const state = () => context.getStore();
export async function withState(callback) {
  const record = await database.demoState.findUnique({ where: { id: 'radius-demo' } });
  if (!record) throw unavailable('Database belum disiapkan. Jalankan migration dan seed.');
  return context.run(record.payload, callback);
}
export async function commit(kind, change) {
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
export async function getSession(token) {
  if (!token) return null;
  const session = await database.demoSession.findUnique({ where: { tokenHash: digest(token) } });
  return session && { ...session, expiresAt: session.expiresAt.getTime() };
}
export async function deleteSession(token) {
  if (!token) return;
  await database.demoSession.deleteMany({ where: { tokenHash: digest(token) } });
}
export async function putSession(token, user, expiresAt) {
  await database.demoSession.create({ data: { tokenHash: digest(token), userId: user.id, credentialHash: user.passwordHash, expiresAt: new Date(expiresAt) } });
  await database.demoSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
export async function deleteUserSessions(userId) {
  await database.demoSession.deleteMany({ where: { userId } });
}
export async function saveImage(filename, mime, content) {
  // ponytail: small demo uploads stay in bytea; use object storage for a larger media catalog.
  await database.demoUpload.create({ data: { filename, mime, content } });
}
export async function readImage(filename) {
  const image = await database.demoUpload.findUnique({ where: { filename } });
  return image && { content: Buffer.from(image.content), mime: image.mime };
}
