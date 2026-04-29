import "dotenv/config";
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

/**
 * GOLD SHE MESH — Prisma Singleton (v7.0.0 Compatible)
 * 
 * Pillar 1/5: Local Source of Truth (SQLite)
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Resolve absolute path to avoid directory issues in different test contexts
const dbUrl = (process.env.DATABASE_URL ?? 'file:./dev.db').replace(/["']/g, '');
const dbRelativePath = dbUrl.replace('file:', '');
const dbAbsolutePath = path.resolve(process.cwd(), dbRelativePath);

const adapter = new PrismaBetterSqlite3({ 
  url: `file:${dbAbsolutePath}` 
});

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

/**
 * GOLD SHE MESH — Immutable Guard (Pillar 5)
 * Enforces the "No UPDATE on money" rule at the ORM level.
 */
export const prisma = basePrisma.$extends({
  query: {
    khataEntry: {
      async update() {
        throw new Error('INDUSTRIAL_RULE: Khata entries are immutable. No updates allowed.');
      },
      async updateMany() {
        throw new Error('INDUSTRIAL_RULE: Khata entries are immutable. No updates allowed.');
      },
      async upsert() {
        throw new Error('INDUSTRIAL_RULE: Khata entries are immutable. No upsert allowed.');
      },
      async delete() {
        throw new Error('INDUSTRIAL_RULE: Khata entries are immutable. No deletions allowed.');
      },
      async deleteMany() {
        throw new Error('INDUSTRIAL_RULE: Khata entries are immutable. No deletions allowed.');
      },
    },
  },
});

export const db = basePrisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;
