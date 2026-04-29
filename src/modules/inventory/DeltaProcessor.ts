import { IndustrialMath } from '../../lib/IndustrialMath';
import { stockBatches, stockDeltas } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

export class DeltaProcessor {
  constructor(private db: any) {}

  async processDelta(incoming: any) {
    const batch = await this.db.select().from(stockBatches).where(eq(stockBatches.id, incoming.batchId)).get();
    if (!batch) throw new Error(`Batch ${incoming.batchId} not found.`);

    const currentQty = new Decimal(batch.totalQuantity);
    const newQty = IndustrialMath.add(currentQty, incoming.delta);

    await this.db.transaction(async (tx: any) => {
      await tx.update(stockBatches).set({ totalQuantity: newQty.toString(), updatedAt: Date.now() }).where(eq(stockBatches.id, incoming.batchId));
      await tx.insert(stockDeltas).values({
        id: uuidv4(),
        batchId: incoming.batchId,
        nodeId: incoming.nodeId,
        quantityDelta: incoming.delta.toString(),
        operation: incoming.operation,
        vectorClock: JSON.stringify(incoming.vectorClock),
        timestamp: Date.now()
      });
    });
    return newQty;
  }
}
