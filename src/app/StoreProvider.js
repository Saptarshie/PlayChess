"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore } from "../store/store";
import { setCredentials } from "../store/features/auth/authSlice";
import {
  setGameStart,
  setGameOver,
  updateLastFen,
  addMoveToHistory,
  setReconnecting,
  setConnected,
} from "../store/features/game/gameSlice";

const GAME_STORAGE_KEY = "playchess_active_game";

function loadPersistedGame() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(GAME_STORAGE_KEY);
    if (stored) {
      const gameData = JSON.parse(stored);
      // Check if game is still valid (not expired, not ended)
      if (gameData && gameData.gameId && !gameData.gameOver) {
        return gameData;
      }
    }
  } catch (e) {
    console.error("Error loading persisted game:", e);
  }
  return null;
}

export function persistGameState(gameState) {
  if (typeof window === "undefined") return;
  try {
    // Only persist if there's an active game
    if (
      gameState.gameId &&
      !gameState.gameOver &&
      gameState.status === "playing"
    ) {
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(gameState));
    } else if (gameState.gameOver || gameState.status === "idle") {
      // Clear persisted game if game is over or idle
      localStorage.removeItem(GAME_STORAGE_KEY);
    }
  } catch (e) {
    console.error("Error persisting game state:", e);
  }
}

export function clearPersistedGame() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GAME_STORAGE_KEY);
}

export default function StoreProvider({ user, children }) {
  const storeRef = useRef();
  if (!storeRef.current) {
    storeRef.current = makeStore();

    if (user) {
      storeRef.current.dispatch(setCredentials({ user }));
    }

    // Restore persisted game state
    const persistedGame = loadPersistedGame();
    if (persistedGame) {
      console.log("Restoring persisted game:", persistedGame);
      storeRef.current.dispatch(
        setGameStart({
          gameId: persistedGame.gameId,
          opponent: persistedGame.opponent,
          orientation: persistedGame.orientation,
          timeControl: persistedGame.timeControl,
        }),
      );
      // Restore additional state if needed
      if (persistedGame.lastFen) {
        storeRef.current.dispatch(updateLastFen(persistedGame.lastFen));
      }
      if (persistedGame.moveHistory && persistedGame.moveHistory.length > 0) {
        persistedGame.moveHistory.forEach((move) => {
          storeRef.current.dispatch(addMoveToHistory(move));
        });
      }
      if (persistedGame.gameOver) {
        storeRef.current.dispatch(
          setGameOver({
            result: persistedGame.result,
            resultReason: persistedGame.resultReason,
          }),
        );
      }
    }
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
