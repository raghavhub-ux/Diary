// Some SQLite engines need the empty file to exist before the first migration.
import "dotenv/config";
import { closeSync, openSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";
const file = process.env.DATABASE_URL?.replace(/^file:/, "");
if (!file) throw Error("Set DATABASE_URL in .env");
closeSync(openSync(isAbsolute(file) ? file : resolve("prisma", file), "a"));
