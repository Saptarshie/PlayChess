// src/app/components/chessboard/index.js

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

export default function RenderChessBoard({
  onMove = () => {}, // optional callback for move when user make a valid move
  orientation = "white", // orientation of the board (white/black)
  turn = "white", // turn of the player (white/black)
  position = "start", // FEN string or "start"
  nextmove = null, // optional: { from, to, promotion }
  boardWidth = 560,
}) {
  // internal chess instance
  const chessRef = useRef(
    new Chess(position === "start" ? undefined : position),
  );
  const [, forceRender] = useState(0); // used to rerender component when chessRef changes

  // Controlled FEN for chessboard
  const [fen, setFen] = useState(
    position === "start" ? chessRef.current.fen() : position,
  );

  // last move highlights
  const [lastMove, setLastMove] = useState({ from: null, to: null });

  // premove storage (applies when opponent finishes)
  const [premove, setPremove] = useState(null); // { from, to, piece }

  // promotion handling
  const [promotionModal, setPromotionModal] = useState({
    open: false,
    from: null,
    to: null,
    color: "w",
  });

  // whether this client is allowed to play (white/black). We'll assume parent sets orientation to player color.
  const playerColor = orientation === "black" ? "black" : "white";

  // helper to refresh FEN from chess instance
  function refreshFromChess() {
    console.log("refreshFromChess trigered...");
    setFen(chessRef.current.fen());
    forceRender((n) => n + 1);
  }

  // apply incoming 'position' prop changes
  useEffect(() => {
    try {
      if (!position) return;
      const curFen = chessRef.current.fen();
      if (position !== curFen) {
        const newChess = new Chess(position === "start" ? undefined : position);
        chessRef.current = newChess;
        refreshFromChess();
        setLastMove({ from: null, to: null });
      }
    } catch (e) {
      // ignore invalid FEN
      // console.warn("Invalid incoming position fen", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  // apply an incoming single move from server (nextmove)
  useEffect(() => {
    if (!nextmove) return;
    const { from, to, promotion } = nextmove;
    const legal = chessRef.current
      .moves({ verbose: true })
      .some(
        (m) =>
          m.from === from &&
          m.to === to &&
          (promotion ? m.promotion === promotion : true),
      );
    if (legal) {
      chessRef.current.move({ from, to, promotion });
      setLastMove({ from, to });
      refreshFromChess();
      // clear premove if it matches this move
      if (premove && premove.from === from && premove.to === to)
        setPremove(null);
    } else {
      // if not legal, maybe opponent sent SAN; try to load as move via chess.move
      try {
        chessRef.current.move(nextmove);
        setLastMove({ from: nextmove.from, to: nextmove.to });
        refreshFromChess();
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextmove]);

  // automatically attempt premove when it's player's turn and premove exists
  useEffect(() => {
    // determine side to move from chess
    const sideToMove = chessRef.current.turn() === "w" ? "white" : "black";
    if (premove && sideToMove === playerColor) {
      const { from, to, promotion } = premove;
      const legal = chessRef.current
        .moves({ verbose: true })
        .some(
          (m) =>
            m.from === from &&
            m.to === to &&
            (promotion ? m.promotion === promotion : true),
        );
      if (legal) {
        // if promotion required, either preset promotion or default to queen
        const moveObj = { from, to };
        if (promotion) moveObj.promotion = promotion;
        else {
          // some moves require explicit promotion (if pawn reaches last rank)
          const candidates = chessRef.current
            .moves({ verbose: true })
            .filter((m) => m.from === from && m.to === to);
          if (candidates.length === 1 && candidates[0].promotion)
            moveObj.promotion = candidates[0].promotion || "q";
        }
        const result = chessRef.current.move(moveObj);
        if (result) {
          setLastMove({ from, to });
          refreshFromChess();
          setPremove(null);
          onMove({
            from,
            to,
            promotion: moveObj.promotion,
            san: result.san,
            fen: chessRef.current.fen(),
          });
        }
      } else {
        console.log("Illegal premove", premove);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [premove, playerColor]);

  // helper: attempt to make a move (returns true if applied)
  function tryMakeMove(from, to, prePromotion = null) {
    // check if it's player's turn
    console.log("tryMakeMove triggered... ", { from, to, playerColor });
    const sideToMove = chessRef.current.turn() === "w" ? "white" : "black";
    const isPlayerTurn = sideToMove === playerColor;

    console.log("tryMakeMove", {
      from,
      to,
      playerColor,
      sideToMove,
      isPlayerTurn,
    });

    // see if this move is legal (may include promotions)
    const moves = chessRef.current.moves({ verbose: true });
    // console.log("Available moves:", moves.map(m => m.from + '-' + m.to));
    const candidate = moves.find((m) => m.from === from && m.to === to);

    console.log("Move candidate:", candidate);

    if (!candidate) {
      // not legal: if it's opponent's turn, treat as premove
      if (!isPlayerTurn) {
        console.log("Storing premove");
        // store premove; if move is promotion we need promotion piece choice later; for now store no promotion
        setPremove({ from, to, piece: null });
        return true; // accepted as premove
      }
      return false;
    }

    // ... rest of function

    // legal move: check promotion
    if (candidate.promotion) {
      // if promotion piece already set (prePromotion param), use that, otherwise open modal
      if (prePromotion) {
        const mv = chessRef.current.move({ from, to, promotion: prePromotion });
        if (mv) {
          setLastMove({ from, to });
          refreshFromChess();
          onMove({
            from,
            to,
            promotion: prePromotion,
            san: mv.san,
            fen: chessRef.current.fen(),
          });
          return true;
        }
        return false;
      }

      // open promotion modal for the player
      setPromotionModal({
        open: true,
        from,
        to,
        color: chessRef.current.turn(),
      });
      return true; // the UI accepted the drag; actual move will be done after selection
    }

    // simple legal move
    const mv = chessRef.current.move({ from, to });
    if (mv) {
      setLastMove({ from, to });
      refreshFromChess();
      onMove({
        from,
        to,
        promotion: null,
        san: mv.san,
        fen: chessRef.current.fen(),
      });
      return true;
    }
    return false;
  }

  // handler called by react-chessboard whenever a piece is dropped
  function onDropPiece(sourceSquare, targetSquare, piece) {
    console.log("onDropPiece trigered ...");
    // normalize squares
    const from = sourceSquare;
    const to = targetSquare;

    // If it's not the player's turn, treat this as a premove
    const sideToMove = chessRef.current.turn() === "w" ? "white" : "black";
    const isPlayerTurn = sideToMove === playerColor;
    console.log("onDropPiece", { from, to, isPlayerTurn });
    if (!isPlayerTurn) {
      // store premove and show subtle UI feedback (we stored already in tryMakeMove)
      setPremove({ from, to, piece });
      return true; // indicate to chessboard that move was accepted visually
    }

    // else, try to make the move now (may open promotion modal)
    const applied = tryMakeMove(from, to);
    console.log("tryMakeMove applied:", applied);
    return applied;
  }

  // promotion selection from modal
  function confirmPromotion(choice) {
    console.log("confirmPromotion triggered ...");
    const { from, to } = promotionModal;
    // apply move with chosen promotion
    const mv = chessRef.current.move({ from, to, promotion: choice });
    if (mv) {
      setLastMove({ from, to });
      refreshFromChess();
      onMove({
        from,
        to,
        promotion: choice,
        san: mv.san,
        fen: chessRef.current.fen(),
      });
    }
    setPromotionModal({ open: false, from: null, to: null, color: "w" });
  }

  function cancelPromotion() {
    console.log("cancelPromotion triggered ...");
    setPromotionModal({ open: false, from: null, to: null, color: "w" });
    // revert any visual move (the react-chessboard will re-read the fen prop and reset)
    refreshFromChess();
  }

  // small UI helpers for styling last move and premove squares
  const customSquareStyles = {};
  if (lastMove.from && lastMove.to) {
    customSquareStyles[lastMove.from] = {
      backgroundColor: "rgba(34,197,94,0.25)",
    };
    customSquareStyles[lastMove.to] = {
      backgroundColor: "rgba(34,197,94,0.25)",
    };
  }
  if (premove) {
    customSquareStyles[premove.from] = {
      backgroundImage:
        "repeating-linear-gradient(45deg, rgba(148,163,184,0.12) 0 6px, transparent 6px 12px)",
    };
    customSquareStyles[premove.to] = {
      backgroundImage:
        "repeating-linear-gradient(45deg, rgba(148,163,184,0.12) 0 6px, transparent 6px 12px)",
    };
  }

  return (
    <div className="relative w-full" style={{ maxWidth: boardWidth }}>
      <Chessboard
        options={{
          id: "MultiplayerChessboard",
          animationDuration: 200,
          boardWidth: Math.min(
            boardWidth,
            typeof window !== "undefined" ? window.innerWidth - 64 : boardWidth,
          ),
          position: fen,
          onPieceDrop: (sourceSquare, targetSquare, piece) =>
            onDropPiece(sourceSquare, targetSquare, piece),
          arePiecesDraggable: true,
          customBoardStyle: { borderRadius: 8 },
          onSquareClick: (square) => {
            console.log("onSquareClick", square);
            // Optional: Add click-to-move logic here later if DnD fails
          },
          onSquareRightClick: () => {
            console.log("onSquareRightClick traggered...");
          },
          onPieceDragBegin: () => {
            console.log("onPieceDragBegin traggered...");
          },
          onPieceDragEnd: () => {
            console.log("onPieceDragEnd traggered...");
          },
          boardOrientation: orientation,
          customSquareStyles: customSquareStyles,
        }}
        // allow premoves by still letting drop return true even when it's not player's turn; we stored premove above
      />

      {/* Promotion modal */}
      {promotionModal.open && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div
            className="bg-black/60 absolute inset-0 rounded"
            onClick={cancelPromotion}
          ></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 z-60 flex flex-col items-center">
            <div className="mb-2 text-sm text-zinc-300">Choose promotion</div>
            <div className="flex gap-2">
              {[
                { key: "q", label: "Queen" },
                { key: "r", label: "Rook" },
                { key: "b", label: "Bishop" },
                { key: "n", label: "Knight" },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => confirmPromotion(p.key)}
                  className="px-4 py-2 rounded border border-zinc-700 bg-zinc-800/30 text-sm"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Small overlay showing premove hint */}
      {premove && (
        <div className="absolute bottom-2 left-2 text-xs text-zinc-400 bg-zinc-900/60 px-2 py-1 rounded border border-zinc-800">
          Premove: {premove.from} → {premove.to}
        </div>
      )}
    </div>
  );
}
