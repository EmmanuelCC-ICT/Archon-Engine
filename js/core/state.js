(function (ns) {
  var nextPieceId = 0;

  // Board state is persistent across battles, including surviving unit health.
  function createEmptyBoard() {
    var board = [];
    var row;
    var col;

    for (row = 0; row < 8; row += 1) {
      board[row] = [];
      for (col = 0; col < 8; col += 1) {
        board[row][col] = null;
      }
    }

    return board;
  }

  function createPiece(side, type, originRow, originCol) {
    var unit = ns.data.getUnit(type);

    return {
      id: "piece-" + nextPieceId++,
      side: side,
      type: type,
      hasMoved: false,
      health: unit.battle.health,
      originRow: originRow,
      originCol: originCol
    };
  }

  function seedBoard() {
    var board = createEmptyBoard();
    var col;

    for (col = 0; col < 8; col += 1) {
      board[0][col] = createPiece("dark", ns.data.BACK_RANK[col], 0, col);
      board[1][col] = createPiece("dark", "ward", 1, col);
      board[6][col] = createPiece("light", "ward", 6, col);
      board[7][col] = createPiece("light", ns.data.BACK_RANK[col], 7, col);
    }

    return board;
  }

  function createInitialState() {
    nextPieceId = 0;

    return {
      board: seedBoard(),
      ethicalBoard: ns.ethics.createBoard(8),
      ethicalCodex: ns.ethics.createCodexState(),
      ethicalClusters: [],
      ethicalNotification: null,
      currentTurn: "light",
      selected: null,
      inspectedSquare: null,
      validMoves: [],
      mode: "board",
      winner: null,
      lockInput: false,
      pendingAI: false,
      battle: null,
      pendingEthicalDecision: null,
      capturedPieces: {
        light: [],
        dark: []
      },
      commandOverrides: {
        light: null,
        dark: null
      },
      lastResult: "Choose a Remnant unit to begin.",
      logs: [
        "The relay board stabilizes. The Remnant has the first command.",
        "Any capture triggers a live arena duel.",
        "Battle victories unlock Ethical Codex draws."
      ]
    };
  }

  function addLog(state, message) {
    state.logs.unshift(message);
    state.logs = state.logs.slice(0, 8);
  }

  ns.core.createInitialState = createInitialState;
  ns.core.addLog = addLog;
})(window.ArchonEngine);
