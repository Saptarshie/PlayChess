import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  gameId: null,
  opponent: null, // { username, rating }
  orientation: "white", // or "black"
  timeControl: null, // e.g., "10+0"
  status: "idle", // idle, searching, playing
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
    },
    resetGame: (state) => {
      return initialState;
    },
  },
});

export const { setSearching, setGameStart, resetGame } = gameSlice.actions;
export default gameSlice.reducer;
