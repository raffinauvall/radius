import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes, scryptSync } from 'node:crypto';

const directory = new URL('../data/', import.meta.url);
await mkdir(directory, { recursive: true });
const passwordHash = password => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};
const createdAt = new Date().toISOString();
const accounts = [
  { id: 'customer-andreas-peterang', email: 'peter@gmail.com', name: 'Andreas Peterang', passwordHash: passwordHash('123'), role: 'USER', status: 'ACTIVE', membershipPlan: 'PLUS', membershipRenewalDate: '2026-10-12', createdAt },
  { id: 'radius-admin', email: 'admin@radius.id', name: 'Radius Admin', passwordHash: passwordHash('admin123'), role: 'ADMIN', status: 'ACTIVE', membershipPlan: 'COMMUNITY', createdAt }
];
for (const [name, content] of [
  ['accounts.json', JSON.stringify(accounts, null, 2) + '\n'],
  ['operations.json', await readFile(new URL('operations.seed.json', directory), 'utf8')]
]) {
  try {
    await writeFile(new URL(name, directory), content, { flag: 'wx', mode: 0o600 });
    console.log(`Created data/${name}`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log(`Preserved existing data/${name}`);
  }
}
console.log('Local demo accounts only. Change credentials before any public deployment.');
