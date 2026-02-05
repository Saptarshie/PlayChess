import { NextResponse } from "next/server";
import redis from "@/lib/redis.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    // Check if a match has been assigned to this user
    const matchKey = `match:${username}`;
    const matchDataStr = await redis.get(matchKey);

    if (matchDataStr) {
      const matchData = JSON.parse(matchDataStr);
      // Optional: Delete the key after reading?
      // Usually, we might leave it for a bit or let TTL expire to handle re-fetches.
      // For now, assume client handles identifying duplicates or we just let it expire.
      return NextResponse.json(matchData);
    }

    // No match yet
    return NextResponse.json({ status: "pending" }, { status: 202 });
  } catch (error) {
    console.error("Poll match error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
