import { spawnSync } from 'node:child_process';
import { databaseURL, directURL, getDatabase } from '../database.js';
import { seedDatabase } from '../demo-seed.js';

const generateOnly = process.argv.includes('--generate-only');
let database;
const env = { ...process.env, DATABASE_URL: databaseURL || 'postgresql://localhost/radius', DIRECT_URL: directURL || 'postgresql://localhost/radius' };
const prismaCLI = new URL('../node_modules/prisma/build/index.js', import.meta.url);
const run = args => {
  const result = spawnSync(process.execPath, [prismaCLI.pathname, ...args], { env, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error('Prisma command failed.');
};
try {
  if (!generateOnly && process.env.VERCEL && !databaseURL) throw new Error('Set DATABASE_URL in Vercel for this deployment environment.');
  run(['generate']);
  if (!generateOnly && databaseURL) {
    run(['migrate', 'deploy']);
    database = await getDatabase();
    await seedDatabase(database);
    console.log('Database ready. Existing demo state preserved.');
  }
} catch (error) {
  console.error(error.message === 'Set DATABASE_URL in Vercel for this deployment environment.' ? error.message : 'Database build failed. Check env scope, connection and migration logs.');
  process.exitCode = 1;
} finally { if (database) await database.$disconnect(); }
