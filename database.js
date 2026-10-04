try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }

export const databaseURL = process.env.RADIUS_ACCOUNT_FILE ? null : process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
export const directURL = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || databaseURL;
if (databaseURL) {
  process.env.DATABASE_URL = databaseURL;
  process.env.DIRECT_URL = directURL;
}
let client;
export async function getDatabase() {
  if (!databaseURL) return null;
  const { PrismaClient } = await import('@prisma/client');
  return client ||= new PrismaClient({ datasourceUrl: databaseURL, log: [] });
}
