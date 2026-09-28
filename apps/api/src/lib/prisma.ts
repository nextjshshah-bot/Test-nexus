import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

/**
 * A single PrismaClient instance per process. In development we cache it on
 * `globalThis` so `tsx watch` hot-reloads don't exhaust the connection pool.
 */
const globalForPrisma = globalThis as unknown as { nexusPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.nexusPrisma ??
  new PrismaClient({
    log: env.isProduction ? ['error', 'warn'] : ['error', 'warn'],
    datasources: {
      db: { url: env.databaseUrl },
    },
  });

if (!env.isProduction) {
  globalForPrisma.nexusPrisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default prisma;
