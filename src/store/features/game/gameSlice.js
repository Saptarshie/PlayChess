import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  gameId: null,
  opponent: null, // { username, rating }
  orientation: "white", // or "black"
  timeControl: null, // e.g., "10+0"
  status: "idle", // idle, searching, playing, ended, reconnecting
  gameOver: false,
  result: null, // "win", "loss", "draw"
  resultReason: null, // "checkmate", "resignation", "timeout", "draw_agreement"
  lastFen: null, // Store last position for reconnection
  moveHistory: [], // Store moves for reconnection
};

const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    setSearching: (state) => {
      state.status = "searching";
    },
    setGameStart: (state, action) => {
      const { gameId, opponent, orientation, timeControl } = action.payload;
      state.gameId = gameId;
      state.opponent = opponent;
      state.orientation = orientation;
      state.timeControl = timeControl;
      state.status = "playing";
      state.gameOver = false;
      state.result = null;
      state.resultReason = null;
      state.lastFen = null;
      state.moveHistory = [];
    },
    resetGame: (state) => {
      return initialState;
    },
    setGameOver: (state, action) => {
      const { result, resultReason } = action.payload;
      state.gameOver = true;
      state.result = result;
      state.resultReason = resultReason;
      state.status = "ended";
    },
    updateLastFen: (state, action) => {
      state.lastFen = action.payload;
    },
    addMoveToHistory: (state, action) => {
      state.moveHistory.push(action.payload);
    },
    setReconnecting: (state) => {
      state.status = "reconnecting";
    },
    setConnected: (state) => {
      if (state.status === "reconnecting") {
        state.status = "playing";
      }
    },
  },
});

export const {
  setSearching,
  setGameStart,
  resetGame,
  setGameOver,
  updateLastFen,
  addMoveToHistory,
  setReconnecting,
  setConnected,
} = gameSlice.actions;

// Selector to get the full game state for persistence
export const selectGameState = (state) => state.game;

export default gameSlice.reducer;
