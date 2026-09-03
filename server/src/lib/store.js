// Tiny JSON-file data store. No database setup required for v1 — swap this
// out for a real DB later without changing the route code much, since every
// route just calls readAll()/writeAll() on a store.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export function jsonStore(filePath) {
  return {
    async readAll() {
      try {
        const raw = await readFile(filePath, "utf-8");
        return JSON.parse(raw);
      } catch (err) {
        if (err.code === "ENOENT") return [];
        throw err;
      }
    },
    async writeAll(items) {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify(items, null, 2), "utf-8");
    },
  };
}
