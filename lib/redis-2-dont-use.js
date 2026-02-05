// src/lib/redis.js
import { createClient } from "redis";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";

/**
 * Use globalThis to keep a single client during dev hot-reloads.
 * In production this still creates one client per server process.
 */
if (!globalThis.__redisClient) {
  const client = createClient({ url });

  client.on("error", (err) => {
    console.error("Redis Client Error", err);
  });

  // Connect immediately. For production you might want to control connect timing.
  client.connect().catch((err) => {
    // avoid unhandled promise rejection in dev
    console.error("Redis connect error:", err);
  });

  globalThis.__redisClient = client;
}

export default globalThis.__redisClient;
