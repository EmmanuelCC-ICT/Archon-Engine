(function (ns) {
  var KNIGHT_OFFSETS = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1]
  ];

  var DIAGONALS = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1]
  ];

  var ORTHOGONALS = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];

  var ROYAL_STEPS = DIAGONALS.concat(ORTHOGONALS);

  function isInside(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  function getPiece(board, row, col) {
    if (!isInside(row, col)) {
      return null;
    }
    return board[row][col];
  }

  function isEnemy(piece, otherPiece) {
    return Boolean(piece && otherPiece && piece.side !== otherPiece.side);
  }

  function addMove(moves, board, piece, row, col) {
    var occupant;

    if (!isInside(row, col)) {
      return;
    }

    occupant = getPiece(board, row, col);

    if (!occupant) {
      moves.push({ row: row, col: col, isCapture: false, target: null });
      return;
    }

    if (isEnemy(piece, occupant)) {
      moves.push({ row: row, col: col, isCapture: true, target: occupant });
    }
  }

  function collectSlidingMoves(board, piece, row, col, directions) {
    var moves = [];
    var directionIndex;
    var delta;
    var nextRow;
    var nextCol;
    var occupant;

    for (directionIndex = 0; directionIndex < directions.length; directionIndex += 1) {
      delta = directions[directionIndex];
      nextRow = row + delta[0];
      nextCol = col + delta[1];

      while (isInside(nextRow, nextCol)) {
        occupant = getPiece(board, nextRow, nextCol);
        if (!occupant) {
          moves.push({ row: nextRow, col: nextCol, isCapture: false, target: null });
        } else {
          if (isEnemy(piece, occupant)) {
            moves.push({ row: nextRow, col: nextCol, isCapture: true, target: occupant });
          }
          break;
        }

        nextRow += delta[0];
        nextCol += delta[1];
      }
    }

    return moves;
  }

  function getWardMoves(board, piece, row, col) {
    var moves = [];
    var direction = piece.side === "light" ? -1 : 1;
    var startRow = piece.side === "light" ? 6 : 1;
    var forwardRow = row + direction;
    var leftDiag = col - 1;
    var rightDiag = col + 1;

    if (isInside(forwardRow, col) && !getPiece(board, forwardRow, col)) {
      moves.push({ row: forwardRow, col: col, isCapture: false, target: null });

      if (row === startRow && !piece.hasMoved) {
        if (!getPiece(board, row + direction * 2, col)) {
          moves.push({
            row: row + direction * 2,
            col: col,
            isCapture: false,
            target: null
          });
        }
      }
    }

    if (isInside(forwardRow, leftDiag) && isEnemy(piece, getPiece(board, forwardRow, leftDiag))) {
      moves.push({
        row: forwardRow,
        col: leftDiag,
        isCapture: true,
        target: getPiece(board, forwardRow, leftDiag)
      });
    }

    if (isInside(forwardRow, rightDiag) && isEnemy(piece, getPiece(board, forwardRow, rightDiag))) {
      moves.push({
        row: forwardRow,
        col: rightDiag,
        isCapture: true,
        target: getPiece(board, forwardRow, rightDiag)
      });
    }

    return moves;
  }

  function getLancerMoves(board, piece, row, col) {
    var moves = [];
    var index;
    var offset;

    for (index = 0; index < KNIGHT_OFFSETS.length; index += 1) {
      offset = KNIGHT_OFFSETS[index];
      addMove(moves, board, piece, row + offset[0], col + offset[1]);
    }

    return moves;
  }

  function getSovereignMoves(board, piece, row, col) {
    var moves = [];
    var index;
    var step;

    for (index = 0; index < ROYAL_STEPS.length; index += 1) {
      step = ROYAL_STEPS[index];
      addMove(moves, board, piece, row + step[0], col + step[1]);
    }

    return moves;
  }

  function getMovesForProfile(board, piece, row, col, movementProfile) {
    var activeProfile = movementProfile || piece.type;

    // Board movement is data-driven per unit so the UI and AI can share one rules source.
    if (activeProfile === "ward") {
      return getWardMoves(board, piece, row, col);
    }

    if (activeProfile === "lancer") {
      return getLancerMoves(board, piece, row, col);
    }

    if (activeProfile === "seer") {
      return collectSlidingMoves(board, piece, row, col, DIAGONALS);
    }

    if (activeProfile === "bastion") {
      return collectSlidingMoves(board, piece, row, col, ORTHOGONALS);
    }

    if (activeProfile === "crown") {
      return collectSlidingMoves(board, piece, row, col, ROYAL_STEPS);
    }

    if (activeProfile === "sovereign") {
      return getSovereignMoves(board, piece, row, col);
    }

    return [];
  }

  function getValidMoves(board, row, col, movementProfile) {
    var piece = getPiece(board, row, col);

    if (!piece) {
      return [];
    }

    return getMovesForProfile(board, piece, row, col, movementProfile);
  }

  function getAllMovesForSide(board, side, movementProfileResolver) {
    var moves = [];
    var row;
    var col;
    var piece;
    var pieceMoves;
    var movementProfile;
    var index;

    for (row = 0; row < 8; row += 1) {
      for (col = 0; col < 8; col += 1) {
        piece = getPiece(board, row, col);
        if (!piece || piece.side !== side) {
          continue;
        }

        // AI consumes the same move objects the player UI highlights.
        movementProfile = movementProfileResolver ? movementProfileResolver(piece, row, col) : null;
        pieceMoves = getValidMoves(board, row, col, movementProfile);
        for (index = 0; index < pieceMoves.length; index += 1) {
          moves.push({
            fromRow: row,
            fromCol: col,
            toRow: pieceMoves[index].row,
            toCol: pieceMoves[index].col,
            piece: piece,
            target: pieceMoves[index].target,
            isCapture: pieceMoves[index].isCapture
          });
        }
      }
    }

    return moves;
  }

  function findCommander(board, side) {
    var row;
    var col;
    var piece;

    for (row = 0; row < 8; row += 1) {
      for (col = 0; col < 8; col += 1) {
        piece = getPiece(board, row, col);
        if (piece && piece.side === side && piece.type === "sovereign") {
          return { row: row, col: col, piece: piece };
        }
      }
    }

    return null;
  }

  function boardToCoord(row, col) {
    return String.fromCharCode(65 + col) + String(8 - row);
  }

  ns.core.isInside = isInside;
  ns.core.getPiece = getPiece;
  ns.core.getValidMoves = getValidMoves;
  ns.core.getAllMovesForSide = getAllMovesForSide;
  ns.core.findCommander = findCommander;
  ns.core.boardToCoord = boardToCoord;
})(window.ArchonEngine);
