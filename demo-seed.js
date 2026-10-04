import { readFile } from 'node:fs/promises';
import { randomBytes, scryptSync } from 'node:crypto';

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
  const operations = JSON.parse(await readFile(new URL('./data/operations.seed.json', import.meta.url), 'utf8'));
  for (const ticket of operations.tickets) {
    ticket.checkInToken = randomBytes(32).toString('hex');
    ticket.entryConsumed = ticket.status === 'ATTENDED';
  }
  return { accounts: demoAccounts(), operations };
}
export async function seedDatabase(database) {
  await database.demoState.createMany({ data: [{ id: 'radius-demo', payload: await demoPayload() }], skipDuplicates: true });
}
