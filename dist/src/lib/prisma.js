"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.prisma = void 0;
require("dotenv/config");
const node_path_1 = __importDefault(require("node:path"));
const client_1 = require("@prisma/client");
const adapter_better_sqlite3_1 = require("@prisma/adapter-better-sqlite3");
/**
 * GOLD SHE MESH — Prisma Singleton (v7.0.0 Compatible)
 *
 * Pillar 1/5: Local Source of Truth (SQLite)
 */
const globalForPrisma = globalThis;
// Resolve absolute path to avoid directory issues in different test contexts
const dbUrl = (process.env.DATABASE_URL ?? 'file:./dev.db').replace(/["']/g, '');
const dbRelativePath = dbUrl.replace('file:', '');
const dbAbsolutePath = node_path_1.default.resolve(process.cwd(), dbRelativePath);
const adapter = new adapter_better_sqlite3_1.PrismaBetterSqlite3({
    url: `file:${dbAbsolutePath}`
});
const basePrisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
/**
 * GOLD SHE MESH — Immutable Guard (Pillar 5)
 * Enforces the "No UPDATE on money" rule at the ORM level.
 */
exports.prisma = basePrisma.$extends({
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
exports.db = basePrisma;
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = basePrisma;
