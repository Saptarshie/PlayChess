import { NextResponse } from "next/server";
import redis from "@/lib/redis.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");
    const username = searchParams.get("username"); // requester

    if (!gameId || !username) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // Find the other player's SDP
    // We look for any key sdp:{gameId}:* that IS NOT sdp:{gameId}:{username}

    // Using SCAN or simple key check if we know opponent name.
    // Ideally the client should know opponent name from redux, but let's be robust and finding "the other one".
    // Since we stored players in a set `game_players:{gameId}`, we can check that.

    const players = await redis.sMembers(`game_players:${gameId}`);
    const opponent = players.find((p) => p !== username);

    if (!opponent) {
      return NextResponse.json(
        { status: "waiting_for_opponent" },
        { status: 404 },
      );
    }

    const sdpStr = await redis.get(`sdp:${gameId}:${opponent}`);
    if (sdpStr) {
      return NextResponse.json({ sdp: JSON.parse(sdpStr) });
    }

    return NextResponse.json({ status: "no_sdp_yet" }, { status: 404 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Signaling failed" }, { status: 500 });
  }
}
