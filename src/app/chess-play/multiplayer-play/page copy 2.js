// src/app/chess-play/multiplayer-play/page.js
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { selectCurrentUser } from "@/store/features/auth/authSlice";
import { WebRTCManager } from "@/lib/web-rtc-helper";

// Dynamic import for the Chessboard to avoid SSR issues
const RenderChessBoard = dynamic(() => import("@/app/components/chessboard"), {
  ssr: false,
});

export default function MultiplayerPlay() {
  const searchParams = useSearchParams();

  // -- 1. Game Setup & Configuration --
  // Detect player color from query param: ?color=white or ?color=black
  const paramColor = (searchParams?.get("color") || "white").toLowerCase();
  const playerColor = paramColor === "black" ? "black" : "white";

  // Read game info from URL
  const gameId = searchParams?.get("gameId");

  // Redux: Get current user for signaling
  const user = useSelector(selectCurrentUser);

  // Refs
  const rtcRef = useRef(null);
  const timerRef = useRef(null);

  // -- 2. Game State --
  const [turn, setTurn] = useState("white");
  const [moves, setMoves] = useState([]); // { ply, white, black }
  const [halfMove, setHalfMove] = useState(0);

  // Timers (in seconds) — default 10:00 each
  const DEFAULT_TIME = 10 * 60;
  const [whiteTime, setWhiteTime] = useState(DEFAULT_TIME);
  const [blackTime, setBlackTime] = useState(DEFAULT_TIME);
  const [running, setRunning] = useState(true);

  // Board orientation
  const [orientation, setOrientation] = useState(playerColor);

  // UI / Connection State
  const [statusText, setStatusText] = useState("Initializing...");
  const [isConnected, setIsConnected] = useState(false);

  // -- 3. WebRTC Initialization (New Logic) --
  useEffect(() => {
    // If we don't have a gameID or a user (and we aren't in a pure local debug mode), we can't connect.
    if (!gameId || !user?.username) {
      setStatusText("Waiting for login or Game ID...");
      return;
    }

    if (!rtcRef.current) {
      rtcRef.current = new WebRTCManager();
    }

    const rtc = rtcRef.current;

    // Setup callbacks
    rtc.onConnect = () => {
      setIsConnected(true);
      setStatusText("Connected to opponent");
    };

    rtc.onDisconnect = () => {
      setIsConnected(false);
      setStatusText("Opponent disconnected");
    };

    rtc.onMove = (moveData) => {
      // Opponent made a move
      console.log("Received move via WebRTC:", moveData);
      handleRemoteMove(moveData);
    };

    // Initialize connection
    // White creates offer (isInitiator = true), Black waits (isInitiator = false)
    const isInitiator = playerColor === "white";

    console.log(
      `Initializing WebRTC. Game: ${gameId}, User: ${user.username}, Initiator: ${isInitiator}`,
    );

    rtc.init(gameId, user.username, isInitiator);

    // Cleanup on unmount
    return () => {
      rtc.cleanup();
      setIsConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, user, playerColor]);

  // -- 4. Timer Logic (From old-page.js) --
  useEffect(() => {
    if (!running) return;

    timerRef.current = setInterval(() => {
      setWhiteTime((w) => {
        setBlackTime((b) => b); // keep stable
        if (turn === "white") {
          if (w <= 0) {
            clearInterval(timerRef.current);
            setRunning(false);
            setStatusText("Black wins on time");
            return 0;
          }
          return w - 1;
        }
        return w;
      });

      setBlackTime((b) => {
        if (turn === "black") {
          if (b <= 0) {
            clearInterval(timerRef.current);
            setRunning(false);
            setStatusText("White wins on time");
            return 0;
          }
          return b - 1;
        }
        return b;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [running, turn]);

  // -- 5. Handlers --

  // Format seconds to mm:ss
  function formatTime(s) {
    const mm = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${mm}:${ss}`;
  }

  // Handle a move received from the opponent via WebRTC
  function handleRemoteMove(moveStr) {
    setMoves((prev) => {
      const copy = [...prev];
      if (halfMove % 2 === 0) {
        // This theoretically shouldn't happen if turns are synced,
        // but handles the case where we receive White's move
        copy.push({
          ply: Math.floor(halfMove / 2) + 1,
          white: moveStr,
          black: "",
        });
      } else {
        // Fill black slot
        const last = copy[copy.length - 1];
        if (last) last.black = moveStr;
      }
      return copy;
    });
    setHalfMove((h) => h + 1);
    setTurn((t) => (t === "white" ? "black" : "white"));
    setStatusText(`Opponent played ${moveStr}`);
  }

  // Called when the local player makes a move on the board
  function handleLocalMove(moveData) {
    // 1. Validate turn
    if (turn !== playerColor) {
      console.warn("Not your turn!");
      return;
    }

    const moveStr =
      typeof moveData === "object" && moveData.san ? moveData.san : moveData;

    console.log("Local move: ", moveStr);

    // 2. Update local state
    setMoves((prev) => {
      const copy = [...prev];
      if (halfMove % 2 === 0) {
        copy.push({
          ply: Math.floor(halfMove / 2) + 1,
          white: moveStr,
          black: "",
        });
      } else {
        const last = copy[copy.length - 1];
        if (last) last.black = moveStr;
      }
      return copy;
    });

    setHalfMove((h) => h + 1);
    setTurn((t) => (t === "white" ? "black" : "white"));
    setStatusText(
      `${moveStr} — ${turn === "white" ? "Black" : "White"} to move`,
    );

    // 3. Send via WebRTC
    if (rtcRef.current) {
      rtcRef.current.sendMove(moveStr);
    }
  }

  // Connection toggle (Mock/Manual)
  function toggleConnection() {
    if (isConnected) {
      // Manual disconnect
      rtcRef.current?.cleanup();
      setIsConnected(false);
      setStatusText("Disconnected by user");
    } else {
      // Trigger re-init if needed, or just let the user reload for now
      // since rtc.init is bound to the useEffect mount.
      window.location.reload();
    }
  }

  // UI Action Helpers
  function handleOfferDraw() {
    setStatusText("Draw offered — waiting for opponent");
    // TODO: Add rtcRef.current.sendMessage({type: 'DRAW_OFFER'})
  }

  function handleResign() {
    setStatusText(`${playerColor === turn ? "You" : "Opponent"} resigned`);
    setRunning(false);
    // TODO: Add rtcRef.current.sendMessage({type: 'RESIGN'})
  }

  function handleUndo() {
    // Naive local undo
    setMoves((prev) => {
      const copy = [...prev];
      if (copy.length === 0) return copy;
      if (halfMove % 2 === 1) {
        // last move was white => remove that object
        copy.pop();
      } else {
        // last move was black => clear black property
        const last = copy[copy.length - 1];
        if (last) last.black = "";
      }
      return copy;
    });
    setHalfMove((h) => Math.max(0, h - 1));
    setTurn((t) => (t === "white" ? "black" : "white"));
    setStatusText("Move undone (Local only)");
  }

  function handleFlip() {
    setOrientation((o) => (o === "white" ? "black" : "white"));
  }

  // Render move history
  function renderMoveRows() {
    return moves.map((m) => (
      <div
        key={m.ply}
        className="grid grid-cols-3 gap-2 py-2 border-b border-zinc-800/50 items-center text-sm"
      >
        <div className="text-zinc-500">{m.ply}.</div>
        <div className="font-mono truncate text-zinc-200">{m.white}</div>
        <div className="font-mono truncate text-zinc-200">{m.black}</div>
      </div>
    ));
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar - Game Info & History */}
        <div className="lg:col-span-3 order-2 lg:order-1 flex flex-col gap-4">
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
            <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-4">
              Game Status
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Turn</span>
                <span className="px-2 py-1 bg-white text-black text-xs font-bold rounded uppercase">
                  {turn}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Mode</span>
                <span className="text-zinc-400">Multiplayer</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Status</span>
                <span
                  className="text-zinc-400 truncate max-w-[15ch]"
                  title={statusText}
                >
                  {statusText}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Connection</span>
                <button
                  onClick={toggleConnection}
                  className={`text-sm px-2 py-1 rounded border border-zinc-800 ${isConnected ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-zinc-900 p-4 rounded-xl border border-zinc-800 overflow-hidden flex flex-col min-h-[200px]">
            <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-4">
              Move History
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 text-sm">
              {moves.length === 0 ? (
                <div className="text-zinc-500">No moves yet.</div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {renderMoveRows()}
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleUndo}
                className="text-sm px-3 py-2 rounded bg-zinc-800/40 border border-zinc-700"
              >
                Undo
              </button>
              <button
                onClick={handleOfferDraw}
                className="text-sm px-3 py-2 rounded bg-zinc-800/40 border border-zinc-700"
              >
                Offer Draw
              </button>
              <button
                onClick={handleResign}
                className="ml-auto text-sm px-3 py-2 rounded bg-red-700/20 border border-red-700 text-red-300"
              >
                Resign
              </button>
            </div>
          </div>
        </div>

        {/* Center - Chessboard */}
        <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col items-center gap-6">
          {/* Opponent Info */}
          <div className="w-full flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-800 rounded-md flex items-center justify-center border border-zinc-700 text-xl">
                👤
              </div>
              <div>
                <p className="font-medium leading-none">Opponent</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {playerColor === "white" ? "Black" : "White"}
                </p>
              </div>
            </div>
            <div className="text-3xl font-mono font-bold text-zinc-300">
              {formatTime(playerColor === "white" ? blackTime : whiteTime)}
            </div>
          </div>

          {/* Board Container */}
          <div className="w-full aspect-square shadow-2xl shadow-black/50 rounded-sm overflow-hidden border-4 border-zinc-800 bg-zinc-900">
            <RenderChessBoard
              orientation={orientation}
              onMove={(m) => handleLocalMove(m)}
              boardWidth={"100%"}
            />
          </div>

          {/* Player Info and Controls */}
          <div className="w-full flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-md flex items-center justify-center border border-blue-700 text-xl">
                🙂
              </div>
              <div>
                <p className="font-medium leading-none">You</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {playerColor.charAt(0).toUpperCase() + playerColor.slice(1)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRunning((r) => !r)}
                className="px-3 py-2 rounded border border-zinc-800 text-sm"
              >
                {running ? "Pause" : "Resume"}
              </button>
              <button
                onClick={handleFlip}
                className="px-3 py-2 rounded border border-zinc-800 text-sm"
              >
                Flip
              </button>
              <button
                onClick={() =>
                  setWhiteTime(DEFAULT_TIME) || setBlackTime(DEFAULT_TIME)
                }
                className="px-3 py-2 rounded border border-zinc-800 text-sm"
              >
                Reset Clocks
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Clocks & Chat placeholder */}
        <div className="lg:col-span-3 order-3 flex flex-col gap-4">
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 uppercase">White</p>
                <p className="font-mono text-lg">{formatTime(whiteTime)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 uppercase">Black</p>
                <p className="font-mono text-lg">{formatTime(blackTime)}</p>
              </div>
            </div>

            <div className="mt-2 flex gap-2">
              <button className="flex-1 px-3 py-2 rounded border border-zinc-700 text-sm">
                Claim draw
              </button>
              <button className="flex-1 px-3 py-2 rounded border border-zinc-700 text-sm">
                Settings
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col min-h-[220px]">
            <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-3">
              Chat
            </h3>
            <div className="flex-1 overflow-y-auto text-sm text-zinc-400">
              <div className="text-zinc-500">Chat system pending...</div>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded px-3 py-2 text-sm placeholder-zinc-500"
                placeholder="Type a message..."
              />
              <button className="px-3 py-2 rounded border border-zinc-700 text-sm">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="w-full max-w-6xl mt-6 text-xs text-zinc-500 text-center">
        Multiplayer Beta with WebRTC.
      </footer>
    </main>
  );
}
