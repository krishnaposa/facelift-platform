// apps/web/lib/prisma.ts
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: pg.Pool;
};

let prismaSingleton: PrismaClient | undefined;

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool =
    globalForPrisma.pgPool ??
    new pg.Pool({
      connectionString,
    });

  const adapter = new PrismaPg(
    pool as unknown as ConstructorParameters<typeof PrismaPg>[0]
  );

  const client = new PrismaClient({
    adapter,
    log: ['query', 'error', 'warn'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pgPool = pool;
    globalForPrisma.prisma = client;
  }

  return client;
}

function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }
  if (prismaSingleton) {
    return prismaSingleton;
  }
  prismaSingleton = createPrismaClient();
  return prismaSingleton;
}

/** True when Postgres can be used (e.g. landing page can skip DB reads without touching `prisma`). */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * Lazy Prisma client so importing this module during `next build` does not require
 * DATABASE_URL (build only evaluates route modules; handlers are not run).
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client as object, prop, receiver);
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
