(function (ns) {
  function getCombatPressure(piece) {
    var unit = ns.data.getUnit(piece.type);
    var stats = unit.battle;
    var healthRatio = piece.health / stats.health;

    return (
      healthRatio * 40 +
      stats.speed * 0.12 +
      stats.damage * 1.8 +
      stats.range * 0.08 -
      stats.cooldown * 18
    );
  }

  function evaluateMove(move) {
    var score = 0;
    var advance = move.toRow - move.fromRow;
    var centerBias = 3.5 - (Math.abs(move.toRow - 3.5) + Math.abs(move.toCol - 3.5)) * 0.45;

    score += centerBias;
    score += advance * 0.9;

    if (move.piece.type === "ward") {
      score += advance * 0.8;
    }

    if (move.isCapture) {
      score += ns.data.getUnit(move.target.type).value * 14;
      score += getCombatPressure(move.piece) - getCombatPressure(move.target);
    } else {
      score += ns.data.getUnit(move.piece.type).value * 0.28;
    }

    if (move.toRow === 7 && move.piece.type !== "sovereign") {
      score += 2;
    }

    return score;
  }

  function chooseDarkMove(state) {
    var commandOverride = state.commandOverrides ? state.commandOverrides.dark : null;
    var commandSide = commandOverride ? commandOverride.commandSide : "dark";
    var moves = ns.ethics.getAllPatternedMovesForSide(state.board, state.ethicalBoard, commandSide).filter(function (move) {
      return ns.ethics.isMoveAllowed(state.board, state.ethicalBoard, move.piece, move.toRow, move.toCol, move.isCapture);
    });
    var scoredMoves;
    var bestScore;
    var shortlist;

    if (!moves.length) {
      return null;
    }

    // The machine favors captures, central pressure, and pieces with strong duel stats.
    scoredMoves = moves.map(function (move) {
      return {
        move: move,
        score: evaluateMove(move) + Math.random() * 0.8
      };
    });

    scoredMoves.sort(function (left, right) {
      return right.score - left.score;
    });

    bestScore = scoredMoves[0].score;
    shortlist = scoredMoves.filter(function (entry) {
      return entry.score >= bestScore - 2.4;
    });
    shortlist = shortlist.slice(0, 4);

    return shortlist[Math.floor(Math.random() * shortlist.length)].move;
  }

  ns.core.chooseDarkMove = chooseDarkMove;
})(window.ArchonEngine);
