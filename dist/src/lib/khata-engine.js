"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KhataEngine = void 0;
const prisma_1 = require("@/lib/prisma");
const decimal_js_1 = __importDefault(require("decimal.js"));
class KhataEngine {
    /**
     * Records a new immutable entry in the ledger.
     */
    static async recordEntry(req) {
        // 1. Validate using pure utility
        this.validateEntry({ entry_type: req.type, amount: req.amount });
        const amountStr = new decimal_js_1.default(req.amount).toString();
        // 2. Atomic write to SQLite
        const entry = await prisma_1.prisma.$transaction(async (tx) => {
            const newEntry = await tx.khataEntry.create({
                data: {
                    type: req.type,
                    amount: amountStr,
                    description: req.description,
                    workerName: req.workerName,
                    workerId: req.workerId,
                    snippetPath: req.snippetPath,
                },
            });
            // 3. Rule 4: Security Audit Log
            await tx.auditLog.create({
                data: {
                    action: 'CREATE',
                    entity: 'KHATA',
                    entityId: newEntry.id,
                    details: `${req.type} of ${amountStr} for ${req.workerName}`,
                },
            });
            return newEntry;
        });
        return entry;
    }
    /**
     * PURE UTILITY: Calculates current balance from a list of entries.
     */
    static calculateBalance(entries) {
        return entries.reduce((acc, entry) => {
            const amount = new decimal_js_1.default(entry.amount);
            const type = entry.type || entry.entry_type;
            return type === 'CREDIT' ? acc.plus(amount) : acc.minus(amount);
        }, new decimal_js_1.default(0));
    }
    /**
     * PURE UTILITY: Returns an array of entries with their running balance.
     */
    static runningBalance(entries) {
        let balance = new decimal_js_1.default(0);
        return entries.map(entry => {
            const amount = new decimal_js_1.default(entry.amount);
            const type = entry.type || entry.entry_type;
            balance = type === 'CREDIT' ? balance.plus(amount) : balance.minus(amount);
            return { ...entry, balance };
        });
    }
    /**
     * PURE UTILITY: Validates entry constraints.
     */
    static validateEntry(entry) {
        const amount = new decimal_js_1.default(entry.amount);
        if (amount.isNegative() || amount.isZero()) {
            throw new Error('Financial entry must be a positive non-zero value');
        }
        return true;
    }
    /**
     * Calculates current balance for a worker from the DB.
     */
    static async getWorkerBalance(workerName) {
        const entries = await prisma_1.prisma.khataEntry.findMany({
            where: { workerName },
        });
        return this.calculateBalance(entries).toString();
    }
}
exports.KhataEngine = KhataEngine;
