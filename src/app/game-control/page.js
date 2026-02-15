// src/app/game-control/page.js
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { selectCurrentUser } from "@/store/features/auth/authSlice";
import { setGameStart, setSearching } from "@/store/features/game/gameSlice";
import { hasActiveGame, getActiveGameUrl } from "@/lib/game-utils";

export default function GameControlPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const gameState = useSelector((state) => state.game);

  const [gameFormat, setGameFormat] = useState("rapid"); // rapid, blitz, bullet
  const [isRated, setIsRated] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Check if there's an active game and redirect if so
  useEffect(() => {
    if (hasActiveGame(gameState)) {
      const gameUrl = getActiveGameUrl(gameState);
      router.push(gameUrl);
    }
  }, [gameState, router]);

  // Show loading or redirect message if game is active
  if (hasActiveGame(gameState)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
        <div className="text-center">
          <p className="text-xl mb-4">You have an active game!</p>
          <p className="text-zinc-400">Redirecting to your game...</p>
        </div>
      </div>
    );
  }

  const formats = [
    { id: "rapid", label: "Rapid (10+0)" },
    { id: "blitz", label: "Blitz (3+2)" },
    { id: "bullet", label: "Bullet (1+0)" },
  ];

  // Backend URL from env or default
  const BACKEND_URL =
    process.env.NEXT_PUBLIC_NODE_BACKEND_URL || "http://localhost:5000";
  console.log("Backend URL:", BACKEND_URL);
  async function handleFindMatch() {
    if (!user) {
      alert("Please sign in first");
      return;
    }

    setIsFinding(true);
    setStatusMsg("Searching for opponent...");
    dispatch(setSearching());

    try {
      // 1. Send Match Request
      const payload = {
        username: user.username || "Guest",
        targetRating: 1200, // mock/placeholder
        deviation: 0,
        gameFormat,
        isRated,
      };

      const res = await fetch(`${BACKEND_URL}/match-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Match request failed");

      // 2. Poll for match found (max 4 times * 2000ms = 8 seconds approx)
      const MAX_POLLS = 4;
      let polls = 0;

      const pollInterval = setInterval(async () => {
        polls++;
        setStatusMsg(`Searching... (${polls}/${MAX_POLLS})`);

        try {
          const pollRes = await fetch(
            `${BACKEND_URL}/poll-match?username=${payload.username}`,
          );
          if (pollRes.ok) {
            const data = await pollRes.json();
            // Expected data: { gameId, opponent: {username, rating}, orientation }
            if (data.gameId) {
              clearInterval(pollInterval);
              setStatusMsg("Match found! Starting game...");

              // Dispatch to store
              dispatch(
                setGameStart({
                  gameId: data.gameId,
                  opponent: data.opponent,
                  orientation: data.orientation,
                  timeControl: gameFormat,
                }),
              );

              // Redirect
              setTimeout(() => {
                router.push(
                  `/chess-play/multiplayer-play?color=${data.orientation}&gameId=${data.gameId}`,
                );
              }, 1000);
            }
          }
        } catch (err) {
          console.error("Polling error", err);
        }

        if (polls >= MAX_POLLS) {
          clearInterval(pollInterval);
          setIsFinding(false);
          setStatusMsg("No match found. Please try again.");
        }
      }, 2000);
    } catch (err) {
      console.error(err);
      setIsFinding(false);
      setStatusMsg("Error connecting to server.");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
        <h1 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          Create Game
        </h1>

        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              Game Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {formats.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setGameFormat(f.id)}
                  className={`py-2 px-3 rounded-lg text-sm transition-all ${
                    gameFormat === f.id
                      ? "bg-blue-600/20 border-blue-600 text-blue-400 border"
                      : "bg-zinc-800 border border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rated Checkbox */}
          <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-800/20 cursor-pointer hover:bg-zinc-800/40 transition-colors">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={isRated}
                onChange={(e) => setIsRated(e.target.checked)}
                className="w-4 h-4 accent-blue-600 bg-zinc-800 border-zinc-600 rounded"
              />
            </div>
            <span className="text-sm">Rated Game</span>
          </label>

          {/* Action Button */}
          <button
            onClick={handleFindMatch}
            disabled={isFinding}
            className={`w-full py-3 rounded-lg font-medium shadow-lg transition-all ${
              isFinding
                ? "bg-zinc-700 cursor-not-allowed opacity-75"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20"
            }`}
          >
            {isFinding ? "Finding Opponent..." : "Play Now"}
          </button>

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`text-center text-sm mt-4 p-2 rounded ${
                statusMsg.includes("found")
                  ? "bg-green-500/10 text-green-400"
                  : statusMsg.includes("Error")
                    ? "bg-red-500/10 text-red-400"
                    : "text-zinc-400"
              }`}
            >
              {statusMsg}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
