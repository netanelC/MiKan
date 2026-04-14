import { describe, it, expect } from 'vitest';
import { prisma } from './index';

describe('Database Package', () => {
  it('should export a valid Prisma Client instance', () => {
    expect(prisma).toBeDefined();
    expect(prisma.$connect).toBeTypeOf('function');
  });
});
