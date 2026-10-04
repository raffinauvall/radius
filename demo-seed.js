import { randomBytes, scryptSync } from 'node:crypto';
import { demoOperations } from './demo-data.js';
import { membershipSeed } from './membership-seed.js';

export function demoAccounts() {
  const hash = password => {
    const salt = randomBytes(16).toString('hex');
    return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  };
  const createdAt = new Date().toISOString();
  return [
    { id: 'customer-andreas-peterang', email: 'peter@gmail.com', name: 'Andreas Peterang', passwordHash: hash('123'), role: 'USER', status: 'ACTIVE', membershipPlan: 'PLUS', membershipRenewalDate: '2026-10-12', createdAt },
    { id: 'radius-admin', email: 'admin@radius.id', name: 'Radius Admin', passwordHash: hash('admin123'), role: 'ADMIN', status: 'ACTIVE', membershipPlan: 'COMMUNITY', createdAt }
  ];
}
export async function demoPayload() {
  const operations = structuredClone(demoOperations);
  for (const ticket of operations.tickets) {
    ticket.checkInToken = randomBytes(32).toString('hex');
    ticket.entryConsumed = ticket.status === 'ATTENDED';
  }
  return { accounts: demoAccounts(), operations, membership: structuredClone(membershipSeed) };
}
export async function seedDatabase(database) {
  await database.demoState.createMany({ data: [{ id: 'radius-demo', payload: await demoPayload() }], skipDuplicates: true });
  await database.$transaction(async tx => {
    const [record] = await tx.$queryRaw`SELECT "payload" FROM "DemoState" WHERE "id" = 'radius-demo' FOR UPDATE`;
    if (!record.payload.membership) await tx.demoState.update({ where: { id: 'radius-demo' }, data: { payload: { ...record.payload, membership: structuredClone(membershipSeed) } } });
  });
}
