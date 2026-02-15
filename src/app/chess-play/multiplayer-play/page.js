// src/app/chess-play/multiplayer-play/page.js
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { selectCurrentUser } from "@/store/features/auth/authSlice";
import {
  setGameStart,
  setGameOver,
  updateLastFen,
  addMoveToHistory,
  setReconnecting,
  setConnected,
  resetGame,
} from "@/store/features/game/gameSlice";
import { WebRTCManager } from "@/lib/web-rtc-helper";

// Dynamic import for the Chessboard to avoid SSR issues
const RenderChessBoard = dynamic(() => import("@/app/components/chessboard"), {
  ssr: false,
});

export default function MultiplayerPlay() {
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const router = useRouter();
  const gameState = useSelector((state) => state.game);

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

  // New State: Store the latest move received from opponent to pass to the board
  const [incomingMove, setIncomingMove] = useState(null);

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

  // Game-over state
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);

  // -- 3. WebRTC Initialization --
  useEffect(() => {
    // If we don't have a gameID or a user, we can't connect.
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

    rtc.onReconnecting = (attempt, maxAttempts) => {
      dispatch(setReconnecting());
      setStatusText(`Reconnecting... (${attempt}/${maxAttempts})`);
    };

    rtc.onReconnected = () => {
      dispatch(setConnected());
      setStatusText("Reconnected to opponent");
    };

    rtc.onReconnectFailed = () => {
      setStatusText("Connection lost - game abandoned");
      // Handle game abandonment
      handleGameEnd("abandonment", playerColor === "white" ? "black" : "white");
    };

    rtc.onMove = (moveData) => {
      console.log("Received move via WebRTC:", moveData);
      handleRemoteMove(moveData);
    };

    rtc.onGameControl = (data) => {
      if (data.action === "resign") {
        handleOpponentResign();
      } else if (data.action === "offer_draw") {
        // Handle draw offer (future feature)
      }
    };

    // Initialize connection
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

  // -- 4. Timer Logic --
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

  // Handle game end
  function handleGameEnd(reason, winner) {
    setGameOver(true);
    setRunning(false);

    const result =
      winner === playerColor ? "win" : winner === null ? "draw" : "loss";

    setGameResult({ result, reason, winner });

    dispatch(
      setGameOver({
        result,
        resultReason: reason,
      }),
    );

    // Set appropriate status text
    if (reason === "checkmate") {
      setStatusText(
        `Checkmate! ${winner === playerColor ? "You win!" : "You lose!"}`,
      );
    } else if (reason === "resignation") {
      setStatusText(
        `${winner === playerColor ? "Opponent resigned" : "You resigned"} - ${winner === playerColor ? "You win!" : "You lose!"}`,
      );
    } else if (reason === "timeout") {
      setStatusText(
        `Time out! ${winner === playerColor ? "You win!" : "You lose!"}`,
      );
    } else if (reason === "abandonment") {
      setStatusText("Game abandoned - connection lost");
    } else if (reason === "stalemate" || reason === "draw") {
      setStatusText("Draw!");
    }
  }

  // Handle opponent resignation
  function handleOpponentResign() {
    handleGameEnd("resignation", playerColor);
  }

  // Handle game over callback from chessboard
  function handleGameOver(gameState) {
    if (gameOver) return;

    if (gameState.isCheckmate) {
      handleGameEnd("checkmate", gameState.winner);
    } else if (gameState.isStalemate) {
      handleGameEnd("stalemate", null);
    } else if (gameState.isDraw) {
      handleGameEnd(gameState.reason, null);
    }
  }

  // Handle a move received from the opponent via WebRTC
  function handleRemoteMove(moveData) {
    const moveStr =
      typeof moveData === "object" && moveData.san ? moveData.san : moveData;

    setMoves((prev) => {
      const copy = [...prev];
      const lastMove = copy[copy.length - 1];

      // Logic: If no moves exist, OR the last row is full (has both white & black), start a new row.
      if (!lastMove || (lastMove.white && lastMove.black)) {
        copy.push({
          ply: lastMove ? lastMove.ply + 1 : 1,
          white: moveStr,
          black: "",
        });
      } else {
        // Otherwise, update the existing row (fill in Black's move)
        lastMove.black = moveStr;
      }
      return copy;
    });

    setHalfMove((h) => h + 1);
    setTurn((t) => (t === "white" ? "black" : "white"));
    setStatusText(`Opponent played ${moveStr}`);

    // Update Redux store
    if (moveData.fen) {
      dispatch(updateLastFen(moveData.fen));
    }
    dispatch(addMoveToHistory(moveData));

    // 3. Trigger the board update
    // We pass the raw moveData (containing 'from' and 'to') to the board
    setIncomingMove(moveData);
  }

  // Called when the local player makes a move on the board
  function handleLocalMove(moveData) {
    if (turn !== playerColor) {
      console.warn("Not your turn!");
      return;
    }

    const moveStr =
      typeof moveData === "object" && moveData.san ? moveData.san : moveData;

    setMoves((prev) => {
      const copy = [...prev];
      const lastMove = copy[copy.length - 1];

      // Same robust logic as above
      if (!lastMove || (lastMove.white && lastMove.black)) {
        copy.push({
          ply: lastMove ? lastMove.ply + 1 : 1,
          white: moveStr,
          black: "",
        });
      } else {
        lastMove.black = moveStr;
      }
      return copy;
    });

    setHalfMove((h) => h + 1);
    setTurn((t) => (t === "white" ? "black" : "white"));
    setStatusText(
      `${moveStr} — ${turn === "white" ? "Black" : "White"} to move`,
    );

    // Update Redux store
    dispatch(updateLastFen(moveData.fen));
    dispatch(addMoveToHistory(moveData));

    // Send via WebRTC
    if (rtcRef.current) {
      rtcRef.current.sendMove(moveData);
    }
  }

  function toggleConnection() {
    if (isConnected) {
      rtcRef.current?.cleanup();
      setIsConnected(false);
      setStatusText("Disconnected by user");
    } else {
      window.location.reload();
    }
  }

  function handleOfferDraw() {
    setStatusText("Draw offered — waiting for opponent");
  }

  function handleResign() {
    if (gameOver) return;

    // Send resign message to opponent
    if (rtcRef.current && rtcRef.current.dataChannel?.readyState === "open") {
      rtcRef.current.sendGameControl("resign");
    }

    handleGameEnd("resignation", playerColor === "white" ? "black" : "white");
  }

  function handleUndo() {
    setMoves((prev) => {
      const copy = [...prev];
      if (copy.length === 0) return copy;
      if (halfMove % 2 === 1) {
        copy.pop();
      } else {
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
                disabled={gameOver}
                className={`ml-auto text-sm px-3 py-2 rounded border ${
                  gameOver
                    ? "bg-zinc-800/20 border-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-red-700/20 border-red-700 text-red-300"
                }`}
              >
                Resign
              </button>
            </div>

            {gameOver && (
              <button
                onClick={() => {
                  dispatch(resetGame());
                  router.push("/game-control");
                }}
                className="mt-4 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
              >
                Find New Game
              </button>
            )}
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
            {/* Update: Added 'nextmove' prop. 
                This passes the incoming move object to RenderChessBoard, 
                allowing it to update the visual board state. 
            */}
            <RenderChessBoard
              orientation={orientation}
              onMove={(m) => handleLocalMove(m)}
              onGameOver={handleGameOver}
              nextmove={incomingMove}
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
