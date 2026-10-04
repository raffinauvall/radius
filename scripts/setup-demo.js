import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { demoAccounts } from '../demo-seed.js';

const directory = new URL('../data/', import.meta.url);
await mkdir(directory, { recursive: true });
const accounts = demoAccounts();
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
