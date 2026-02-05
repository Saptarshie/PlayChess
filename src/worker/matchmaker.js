// src/worker/matchmaker.js
const { createClient } = require("redis");
const { v4: uuidv4 } = require("uuid");

// Check environment for Redis URL
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

async function startWorker() {
  console.log("Starting Matchmaker Worker...");

  const client = createClient({ url: REDIS_URL });

  client.on("error", (err) => console.error("Redis Client Error", err));

  await client.connect();
  console.log("Connected to Redis");

  // Worker loop
  while (true) {
    try {
      // 1. Get all active queues
      // We stored set of active queues in "active_queues" (or we could SCAN for queue:*)
      // Using a set is more efficient if clean up is handled, but SCAN is safer for now to find all `queue:*`
      // Let's rely on the sAdd "active_queues" from the route for efficiency,
      // but strictly speaking we should handle empty queues removal.

      const activeQueues = await client.sMembers("active_queues");
      console.log(`Active Queues: ${activeQueues}`);
      console.log(`Active Queues length : ${activeQueues.length}`);

      if (activeQueues.length === 0) {
        // No queues active, wait bit longer
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      for (const queueKey of activeQueues) {
        // Check length
        const len = await client.lLen(queueKey);

        if (len >= 2) {
          console.log(`Processing ${queueKey} (Length: ${len})`);

          // Pop 2 users
          // Note: In a distributed system, we'd need a Lua script to ensure atomic pop-of-2
          // For this simple worker, sequentially popping is "okay" but race conditions exist if multiple workers.
          // Assumption: Single worker instance.

          const p1Str = await client.lPop(queueKey);
          const p2Str = await client.lPop(queueKey);
          console.log(`Popped ${p1Str} and ${p2Str}`);

          if (p1Str && p2Str) {
            const p1 = JSON.parse(p1Str);
            const p2 = JSON.parse(p2Str);

            // Safety check: don't pair user with themselves if they spammed request
            if (p1.username === p2.username) {
              // Push one back and continue? Or just discard duplicate?
              // Better to just discard duplicate request for now or re-queue p2
              console.warn(`Skipping self-match for ${p1.username}`);
              // await client.rPush(queueKey, p2Str); // optional: put back
              continue;
            }

            // Create Game Match
            const gameId = uuidv4();

            // Random orientation
            const p1IsWhite = Math.random() < 0.5;

            const matchDataP1 = {
              gameId,
              opponent: { username: p2.username, rating: p2.rating },
              orientation: p1IsWhite ? "white" : "black",
              timestamp: Date.now(),
            };

            const matchDataP2 = {
              gameId,
              opponent: { username: p1.username, rating: p1.rating },
              orientation: p1IsWhite ? "black" : "white",
              timestamp: Date.now(),
            };

            // Store match info for polling
            const TTL = 30; // seconds to pick up the match
            await client.set(
              `match:${p1.username}`,
              JSON.stringify(matchDataP1),
              { EX: TTL },
            );
            await client.set(
              `match:${p2.username}`,
              JSON.stringify(matchDataP2),
              { EX: TTL },
            );

            console.log(
              `Matched ${p1.username} vs ${p2.username} in ${gameId}`,
            );

            // Optional: Cleanup queue key from active_queues if empty?
            // For now, we leave it. "active_queues" might grow but it's just strings.
          } else {
            // Should not happen given check (unless race condition)
            // If one popped, push back?
            if (p1Str) await client.lPush(queueKey, p1Str);
          }
        }
      }

      // Small delay to prevent CPU spinning if no matches valid
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error("Worker Loop Error:", err);
      // Wait before retry
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

startWorker();
