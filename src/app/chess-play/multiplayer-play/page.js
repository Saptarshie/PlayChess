// src/app/chess-play/multiplayer-play/page.js
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import RenderChessBoard from "@/app/components/chessboard";

export default function MultiplayerPlay() {
  // detect player color from query param: ?color=white or ?color=black
  const searchParams = useSearchParams();
  const paramColor = (searchParams?.get("color") || "white").toLowerCase();
  const playerColor = paramColor === "black" ? "black" : "white";

  // Game state (local/mock implementation — replace with server/socket logic)
  const [turn, setTurn] = useState("white");
  const [moves, setMoves] = useState([]); // each item: { ply: number, white: string, black: string }
  const [halfMove, setHalfMove] = useState(0); // 0 -> white to move, 1 -> black to move

  // Timers (in seconds) — default 10:00 each
  const DEFAULT_TIME = 10 * 60;
  const [whiteTime, setWhiteTime] = useState(DEFAULT_TIME);
  const [blackTime, setBlackTime] = useState(DEFAULT_TIME);
  const [running, setRunning] = useState(true);
  const timerRef = useRef(null);

  // orientation: board orientation for RenderChessBoard. Default follows player view.
  const [orientation, setOrientation] = useState(playerColor);

  // UI state
  const [statusText, setStatusText] = useState("Game started");
  const [isConnected, setIsConnected] = useState(false); // placeholder for socket

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

  // Timer effect
  useEffect(() => {
    if (!running) return;

    timerRef.current = setInterval(() => {
      setWhiteTime((w) => {
        setBlackTime((b) => b); // no-op to keep closure stable
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, turn]);

  // mock connect / disconnect
  function toggleConnection() {
    setIsConnected((c) => !c);
    setStatusText((s) => (isConnected ? "Disconnected" : "Connected to match"));
  }

  // Called when the local player makes a move on the board component
  // For this example we expect "uci" or "san" like string, but it's generic.
  function handleLocalMove(moveStr) {
    // push move into moves state
    setMoves((prev) => {
      const copy = [...prev];
      if (halfMove % 2 === 0) {
        // new move pair
        copy.push({
          ply: Math.floor(halfMove / 2) + 1,
          white: moveStr,
          black: "",
        });
      } else {
        // fill black of last pair
        const last = copy[copy.length - 1];
        if (last) last.black = moveStr;
      }
      return copy;
    });

    // toggle turn
    setHalfMove((h) => h + 1);
    setTurn((t) => (t === "white" ? "black" : "white"));

    // mock: update status
    setStatusText(
      `${moveStr} — ${turn === "white" ? "Black" : "White"} to move`,
    );

    // in a real app: emit move over websocket / send to server here
  }

  // UI helpers
  function handleOfferDraw() {
    setStatusText("Draw offered — waiting for opponent");
    // send offer over network in real implementation
  }
  function handleResign() {
    setStatusText(`${playerColor === turn ? "You" : "Opponent"} resigned`);
    setRunning(false);
  }
  function handleUndo() {
    // naive undo: pop last half-move
    setMoves((prev) => {
      const copy = [...prev];
      if (copy.length === 0) return copy;
      if (halfMove % 2 === 1) {
        // last move was white only => remove that object
        copy.pop();
      } else {
        // last move pair is complete => remove black
        const last = copy[copy.length - 1];
        if (last) last.black = "";
      }
      return copy;
    });
    setHalfMove((h) => Math.max(0, h - 1));
    setTurn((t) => (t === "white" ? "black" : "white"));
    setStatusText("Move undone");
  }

  function handleFlip() {
    setOrientation((o) => (o === "white" ? "black" : "white"));
  }

  // Render move history rows
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

  // helper to determine if local player to move
  const isMyTurn = playerColor === turn;

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
                <span className="text-zinc-400 truncate max-w-[10ch]">
                  {statusText}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Connection</span>
                <button
                  onClick={toggleConnection}
                  className="text-sm px-2 py-1 rounded border border-zinc-800 bg-zinc-800/40"
                >
                  {isConnected ? "Disconnect" : "Connect"}
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
              {formatTime(playerColor === "white" ? whiteTime : blackTime)}
            </div>
          </div>

          {/* Board Container */}
          <div className="w-full aspect-square shadow-2xl shadow-black/50 rounded-sm overflow-hidden border-4 border-zinc-800 bg-zinc-900">
            {/* Pass orientation and a callback. If RenderChessBoard doesn't use these props it's fine. */}
            <RenderChessBoard
              orientation={orientation}
              onMove={(m) => handleLocalMove(m)}
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
              <button
                onClick={() => {}}
                className="flex-1 px-3 py-2 rounded border border-zinc-700 text-sm"
              >
                Claim draw
              </button>
              <button
                onClick={() => {}}
                className="flex-1 px-3 py-2 rounded border border-zinc-700 text-sm"
              >
                Settings
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col min-h-[220px]">
            <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-3">
              Chat
            </h3>
            <div className="flex-1 overflow-y-auto text-sm text-zinc-400">
              {/* chat messages would go here */}
              <div className="text-zinc-500">
                Chat is mocked in this example.
              </div>
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
        This page is a UI scaffold. Hook it up to your real-time backend
        (websocket) for multiplayer behaviour.
      </footer>
    </main>
  );
}
