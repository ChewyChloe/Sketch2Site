import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
// A permanent, Site-wide single-test slot. Never reset or delete to retry a paid test.
export const aiTest = sqliteTable('sketch_ai_single_test', {
  id: text('id').primaryKey(),
  requestId: text('request_id').notNull(),
  userId: text('user_id').notNull(),
  canvasHash: text('canvas_hash').notNull(),
  reservedMicros: integer('reserved_micros').notNull(),
  startedAt: integer('started_at').notNull(),
  outcome: text('outcome').notNull(),
});
