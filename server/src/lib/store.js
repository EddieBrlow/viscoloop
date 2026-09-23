// Data store used by every route (documents, tools, team, hr, workguides,
// suggestions). Backed by Upstash Redis when configured -- which is the
// normal case in production, since Render's own disk doesn't survive a
// redeploy -- falling back to a local JSON file otherwise (handy before
// Upstash is set up, or for local dev). Every route only ever calls
// readAll()/writeAll(), so this is the one place that needed to change.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, basename } from "node:path";
import { Redis } from "@upstash/redis";

let redisClient; // undefined = not checked yet, null = not configured

function getRedis() {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redisClient = url && token ? new Redis({ url, token }) : null;
  return redisClient;
}

function keyFor(filePath) {
  return `viscoloop:${basename(filePath, ".json")}`;
}

async function readLocalFile(filePath) {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export function jsonStore(filePath) {
  const redis = getRedis();

  if (redis) {
    const key = keyFor(filePath);
    return {
      async readAll() {
        const data = await redis.get(key);
        if (data !== null && data !== undefined) return data;

        // First-ever read for this key: seed Redis from the local JSON
        // file's placeholder content (if any) so switching to Redis doesn't
        // make an already-populated section look like it emptied out.
        const seed = await readLocalFile(filePath);
        if (seed.length > 0) await redis.set(key, seed);
        return seed;
      },
      async writeAll(items) {
        await redis.set(key, items);
      },
    };
  }

  // Local JSON file fallback -- resets on every Render redeploy, since the
  // free tier's disk isn't persistent. Set UPSTASH_REDIS_REST_URL and
  // UPSTASH_REDIS_REST_TOKEN to switch to the durable path above.
  return {
    readAll: () => readLocalFile(filePath),
    async writeAll(items) {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify(items, null, 2), "utf-8");
    },
  };
}
