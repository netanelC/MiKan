import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

export const connectionString = process.env.DATABASE_URL;

// We need to provide a default fallback for test environments or build steps
// where DATABASE_URL might not be fully present, but the client still needs to instantiate without throwing.
const pool = new Pool({
  connectionString: connectionString || 'postgresql://postgres:postgres@localhost:5432/mikan',
});
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';
