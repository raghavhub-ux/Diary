import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
export const records = sqliteTable(
  "records",
  {
    owner: text().notNull(),
    kind: text().notNull(),
    id: text().notNull(),
    body: text().notNull(),
    created: text().notNull(),
    updated: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.owner, t.kind, t.id] })],
);
