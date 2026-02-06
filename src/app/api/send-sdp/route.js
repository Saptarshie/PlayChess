import { NextResponse } from "next/server";
import redis from "@/lib/redis.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const { gameId, username, sdp } = body;

    // Store SDP with expiration (e.g., 2 minutes)
    // Key pattern: sdp:{gameId}:{username}
    await redis.set(`sdp:${gameId}:${username}`, JSON.stringify(sdp), {
      EX: 120,
    });

    // Also track who is in the game for quick scanning (optional, but scan works for small scale)
    await redis.sAdd(`game_players:${gameId}`, username);
    await redis.expire(`game_players:${gameId}`, 120);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Signaling failed" }, { status: 500 });
  }
}
