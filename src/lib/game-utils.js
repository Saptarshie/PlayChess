// src/lib/game-utils.js
// Utility functions for checking active game state

/**
 * Checks if there is an active game in progress
 * @param {Object} gameState - The game state from Redux store
 * @returns {boolean} - True if there's an active game
 */
export function hasActiveGame(gameState) {
  return (
    gameState.status === "playing" && gameState.gameId && !gameState.gameOver
  );
}

/**
 * Gets the URL for the active game
 * @param {Object} gameState - The game state from Redux store
 * @returns {string|null} - The game URL or null if no active game
 */
export function getActiveGameUrl(gameState) {
  if (!hasActiveGame(gameState)) return null;
  return `/chess-play/multiplayer-play?gameId=${gameState.gameId}&color=${gameState.orientation}`;
}
