import { NextResponse } from "next/server";
import redis from "@/lib/redis.js";

// Box-Muller transform for normal distribution
function randomNormal(mean, stdDev) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

function clip(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, targetRating, deviation, gameFormat, isRated } = body;

    if (!username || !gameFormat) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 1. Calculate Hash
    // clip(Normal(targetRating, deviation), targetRating - 3*deviation, targetRating + 3*deviation)
    const rating = Number(targetRating) || 1200;
    const dev = Number(deviation) || 0; // Avoid division by zero issues if dev is 0
    let hash = rating;

    if (dev > 0) {
      const rawHash = randomNormal(rating, dev);
      hash = clip(rawHash, rating - 3 * dev, rating + 3 * dev);
    }

    hash = Math.round(hash);

    // 2. Determine Bucket (e.g., 50 point ranges)
    // 1223 -> 1200-1250
    const bucketSize = 50;
    const bucketLower = Math.floor(hash / bucketSize) * bucketSize;
    const bucketUpper = bucketLower + bucketSize;
    const bucketName = `${bucketLower}-${bucketUpper}`;

    // 3. Push to Redis Queue
    // We separate queues by gameFormat and bucket to match like-minded players
    const queueKey = `queue:${gameFormat}:${bucketName}`;

    const requestData = {
      username,
      rating,
      deviation, // might be useful for matchmaker
      gameFormat,
      isRated,
      timestamp: Date.now(),
      hash, // for debug/logging
      bucketName, // for debug/logging
    };

    // Serialize and push
    await redis.rPush(queueKey, JSON.stringify(requestData));

    // Also keep track of active queues to help the worker know where to look
    await redis.sAdd("active_queues", queueKey);

    console.log(
      `[MatchRequest] Queued ${username} into ${queueKey} (Hash: ${hash})`,
    );

    return NextResponse.json({
      success: true,
      message: "Queued for matchmaking",
    });
  } catch (error) {
    console.error("Match request error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
