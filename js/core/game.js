(function (ns) {
  function createGame(options) {
    var renderer = options.renderer;
    var arena = options.arena;
    var state = ns.core.createInitialState();
    var aiTimer = 0;
    var ethicalNotificationTimer = 0;
    var ethicalDecisionTimer = 0;

    function clearSelection() {
      state.selected = null;
      state.inspectedSquare = null;
      state.validMoves = [];
    }

    function render() {
      renderer.render(state);
    }

    function stopAI() {
      if (aiTimer) {
        window.clearTimeout(aiTimer);
      }
      aiTimer = 0;
      state.pendingAI = false;
    }

    function dismissEthicalNotification(shouldRender) {
      if (ethicalNotificationTimer) {
        window.clearTimeout(ethicalNotificationTimer);
      }
      ethicalNotificationTimer = 0;

      if (!state.ethicalNotification) {
        return;
      }

      state.ethicalNotification = null;

      if (shouldRender) {
        render();
      }
    }

    function showEthicalNotification(notification) {
      dismissEthicalNotification(false);
      state.ethicalNotification = notification;
      render();

      ethicalNotificationTimer = window.setTimeout(function () {
        ethicalNotificationTimer = 0;
        if (!state.ethicalNotification) {
          return;
        }
        state.ethicalNotification = null;
        render();
      }, 2600);
    }

    function clearEthicalDecisionTimer() {
      if (ethicalDecisionTimer) {
        window.clearTimeout(ethicalDecisionTimer);
      }
      ethicalDecisionTimer = 0;
    }

    function advanceComputerEthicalDecision() {
      clearEthicalDecisionTimer();
      ethicalDecisionTimer = 0;

      (function () {
        var pending = state.pendingEthicalDecision;
        var choice;

        if (!pending || pending.controlledBy !== "computer" || !pending.autoChoiceId || pending.revealedChoiceId) {
          return;
        }

        pending.revealedChoiceId = pending.autoChoiceId;
        choice = ns.ethics.getChoice(pending.autoChoiceId);
        if (choice) {
          state.lastResult =
            ns.data.getSideLabel(pending.winnerSide) +
            " selects " +
            choice.label +
            " doctrine for " +
            pending.squareLabel +
            ".";
          ns.core.addLog(state, state.lastResult);
        }
        render();

        ethicalDecisionTimer = window.setTimeout(function () {
          var livePending = state.pendingEthicalDecision;

          ethicalDecisionTimer = 0;
          if (
            !livePending ||
            livePending.controlledBy !== "computer" ||
            !livePending.autoChoiceId ||
            livePending.revealedChoiceId !== livePending.autoChoiceId
          ) {
            return;
          }
          commitEthicalDecision(livePending.autoChoiceId);
        }, 920);
      })();
    }

    function applyTerritoryRecovery(piece, row, col) {
      var squareState;
      var recovery;
      var maxHealth;
      var recovered;

      if (!piece || typeof row !== "number" || typeof col !== "number") {
        return "";
      }

      squareState = state.ethicalBoard[row][col];
      recovery = ns.ethics.getRecoveryEffect(squareState, piece.side);
      if (!recovery) {
        return "";
      }

      maxHealth = ns.data.getPieceDesign(piece).stats.hp;
      recovered = Math.min(recovery.amount, Math.max(0, maxHealth - piece.health));
      if (!recovered) {
        return "";
      }

      piece.health += recovered;
      return (
        ns.core.boardToCoord(row, col) +
        " restores " +
        recovered +
        " integrity to " +
        ns.data.getPieceName(piece) +
        "."
      );
    }

    function describeBattleModifier(modifier) {
      var parts = [];
      var cleanedParts;

      if (!modifier) {
        return "No direct territory bonus.";
      }

      if (modifier.healthBonus) {
        parts.push("+" + modifier.healthBonus + " integrity");
      }
      if (modifier.damageBonus) {
        parts.push("+" + modifier.damageBonus + " damage");
      }
      if (modifier.speedBonus) {
        parts.push("+" + modifier.speedBonus + " speed");
      }
      if (modifier.cooldownMultiplier < 1) {
        parts.push(Math.round((1 - modifier.cooldownMultiplier) * 100) + "% faster attacks");
      }

      if (modifier.summaries && modifier.summaries.length) {
        parts = parts.concat(modifier.summaries);
      }

      cleanedParts = parts.map(function (part) {
        return String(part).replace(/[.]+$/, "");
      });

      return cleanedParts.length ? cleanedParts.join(". ") + "." : "No direct territory bonus.";
    }

    function buildBattleTerritoryState(squareLabel, squareState, attacker, defender, battleEffects) {
      var playerModifier = attacker.side === "light" ? battleEffects.attacker : battleEffects.defender;
      var enemyModifier = playerModifier === battleEffects.attacker ? battleEffects.defender : battleEffects.attacker;

      return {
        squareLabel: squareLabel,
        governanceType: squareState ? squareState.governanceType : "neutral",
        governanceLabel: squareState ? ns.ethics.getGovernanceLabel(squareState.governanceType) : "Neutral",
        influenceStrength: squareState ? squareState.influenceStrength || 0 : 0,
        clusterSize: squareState ? squareState.clusterSize || 0 : 0,
        ruleSummary: ns.ethics.getRuleSummary(squareState),
        playerSummary: describeBattleModifier(playerModifier),
        enemySummary: describeBattleModifier(enemyModifier),
        fieldSummary:
          battleEffects.field && battleEffects.field.summaries.length
            ? battleEffects.field.summaries.join(" ")
            : "Arena overcharge begins at " + battleEffects.field.overchargeStartsAt + " seconds."
      };
    }

    function getSquareState(row, col) {
      return state.ethicalBoard && state.ethicalBoard[row] ? state.ethicalBoard[row][col] : null;
    }

    function getTurnCommandOverride(turnSide) {
      return state.commandOverrides ? state.commandOverrides[turnSide] : null;
    }

    function getCommandSideForTurn(turnSide) {
      var override = getTurnCommandOverride(turnSide);
      return override ? override.commandSide : turnSide;
    }

    function clearTurnCommandOverride(turnSide) {
      var override = getTurnCommandOverride(turnSide);

      if (state.commandOverrides) {
        state.commandOverrides[turnSide] = null;
      }

      return override;
    }

    function joinReadableList(items) {
      if (!items || !items.length) {
        return "";
      }

      if (items.length === 1) {
        return items[0];
      }

      if (items.length === 2) {
        return items[0] + " and " + items[1];
      }

      return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
    }

    function applyLandingCommandEffect(piece, row, col) {
      var squareState = getSquareState(row, col);
      var commandSide;

      if (!piece || !squareState || ns.ethics.getCommandEffect(squareState) !== "move-opponent") {
        return "";
      }

      commandSide = piece.side === "light" ? "dark" : "light";
      state.commandOverrides[piece.side] = {
        commandSide: commandSide,
        sourceSquare: ns.core.boardToCoord(row, col),
        governanceType: squareState.governanceType,
        doctrine: squareState.doctrine,
        pairLabel: squareState.pairLabel || ""
      };

      return (
        state.commandOverrides[piece.side].sourceSquare +
        " reroutes command. " +
        ns.data.getSideLabel(piece.side) +
        " must move a " +
        ns.data.getSideLabel(commandSide) +
        " unit on its next turn."
      );
    }

    function recordCapturedPiece(piece) {
      if (!piece || !state.capturedPieces || !state.capturedPieces[piece.side]) {
        return;
      }

      piece.health = 0;
      state.capturedPieces[piece.side].push(piece);
    }

    function applyIndustrialWastelandClearance(affectedSquares) {
      var destroyedUnits = [];
      var seen = Object.create(null);

      (affectedSquares || []).forEach(function (coord) {
        var piece = state.board[coord.row][coord.col];

        if (!piece || seen[piece.id]) {
          return;
        }

        seen[piece.id] = true;
        recordCapturedPiece(piece);
        state.board[coord.row][coord.col] = null;
        destroyedUnits.push(ns.data.getPieceName(piece) + " at " + ns.core.boardToCoord(coord.row, coord.col));
      });

      if (!destroyedUnits.length) {
        return "";
      }

      return "Industrial Wasteland destroys " + joinReadableList(destroyedUnits) + ".";
    }

    function applyIndustrialWastelandGrowth() {
      var growthResult;
      var landscape;
      var growthSquares;
      var growthMessage;
      var destructionMessage;

      if (!state.ethicalBoard) {
        return "";
      }

      growthResult = ns.ethics.expandIndustrialWasteland(state.ethicalBoard);
      growthSquares = growthResult && growthResult.growthSquares ? growthResult.growthSquares : [];
      if (!growthSquares.length) {
        return "";
      }

      state.ethicalBoard = growthResult.board;
      landscape = ns.ethics.recalculateBoard(state.ethicalBoard);
      state.ethicalBoard = landscape.board;
      state.ethicalClusters = landscape.clusters;

      growthMessage =
        "Industrial Wasteland spreads into " +
        joinReadableList(
          growthSquares.map(function (coord) {
            return ns.core.boardToCoord(coord.row, coord.col);
          })
        ) +
        ".";
      destructionMessage = applyIndustrialWastelandClearance(growthSquares);
      if (destructionMessage) {
        growthMessage += " " + destructionMessage;
      }

      ns.core.addLog(state, growthMessage);
      return growthMessage;
    }

    function getRestorationState(piece) {
      var row;
      var col;
      var squareState;

      if (!piece || typeof piece.originRow !== "number" || typeof piece.originCol !== "number") {
        return null;
      }

      row = piece.originRow;
      col = piece.originCol;
      squareState = getSquareState(row, col);

      if (state.board[row][col]) {
        return null;
      }

      if (!ns.ethics.isSquareEnterable(squareState, piece.side)) {
        return null;
      }

      return {
        row: row,
        col: col,
        squareState: squareState
      };
    }

    function reviveCapturedPiece(side) {
      var pool = state.capturedPieces && state.capturedPieces[side] ? state.capturedPieces[side] : null;
      var index;
      var piece;
      var restoration;
      var maxHealth;

      if (!pool || !pool.length) {
        return null;
      }

      for (index = pool.length - 1; index >= 0; index -= 1) {
        piece = pool[index];
        restoration = getRestorationState(piece);
        if (!restoration) {
          continue;
        }

        pool.splice(index, 1);
        maxHealth = ns.data.getPieceDesign(piece).stats.hp;
        piece.health = maxHealth;
        piece.hasMoved = true;
        state.board[restoration.row][restoration.col] = piece;
        return {
          piece: piece,
          row: restoration.row,
          col: restoration.col
        };
      }

      return null;
    }

    function applyLandingRestorationEffect(piece, row, col) {
      var squareState = getSquareState(row, col);
      var restored;

      if (!piece || !squareState || squareState.governanceType !== "preservation") {
        return "";
      }

      restored = reviveCapturedPiece(piece.side);
      if (!restored) {
        return ns.core.boardToCoord(row, col) + " finds no fallen unit that can be restored right now.";
      }

      return (
        ns.core.boardToCoord(row, col) +
        " reconstructs " +
        ns.data.getPieceName(restored.piece) +
        " at " +
        ns.core.boardToCoord(restored.row, restored.col) +
        "."
      );
    }

    function getOriginMovementProfile(row, col) {
      return ns.ethics.getOriginMovementProfile(state.ethicalBoard, row, col);
    }

    function getScopedValidMoves(row, col) {
      var piece = state.board[row][col];

      return ns.ethics.getPatternedMoves(state.board, state.ethicalBoard, row, col).filter(function (move) {
        return ns.ethics.isMoveAllowed(state.board, state.ethicalBoard, piece, move.row, move.col, move.isCapture);
      });
    }

    function getScopedMovesForPieceSide(side) {
      return ns.ethics.getAllPatternedMovesForSide(state.board, state.ethicalBoard, side).filter(function (move) {
        return ns.ethics.isMoveAllowed(
          state.board,
          state.ethicalBoard,
          move.piece,
          move.toRow,
          move.toCol,
          move.isCapture
        );
      });
    }

    function getTurnLegalMoves(turnSide) {
      return getScopedMovesForPieceSide(getCommandSideForTurn(turnSide));
    }

    function evaluateVictory() {
      var lightMoves;
      var darkMoves;

      lightMoves = getTurnLegalMoves("light");
      darkMoves = getTurnLegalMoves("dark");

      if (!lightMoves.length) {
        state.winner = "dark";
        state.lastResult = ns.data.getSideLabel("light") + " has no legal moves remaining.";
        ns.core.addLog(state, ns.data.getSideLabel("dark") + " wins by exhausting the Remnant's legal moves.");
        return true;
      }

      if (!darkMoves.length) {
        state.winner = "light";
        state.lastResult = ns.data.getSideLabel("dark") + " has no legal moves remaining.";
        ns.core.addLog(state, ns.data.getSideLabel("light") + " wins by exhausting the Consensus' legal moves.");
        return true;
      }

      return false;
    }

    function scheduleDarkTurn() {
      if (state.winner) {
        state.lockInput = false;
        state.pendingAI = false;
        render();
        return;
      }

      state.currentTurn = "dark";
      state.lockInput = true;
      state.pendingAI = true;
      render();

      aiTimer = window.setTimeout(function () {
        aiTimer = 0;
        runDarkTurn();
      }, 720);
    }

    function finishLightTurn(message) {
      var finalMessage = message;
      var growthMessage;

      growthMessage = applyIndustrialWastelandGrowth();
      if (growthMessage) {
        finalMessage += " " + growthMessage;
      }

      state.lastResult = finalMessage;
      clearSelection();

      if (evaluateVictory()) {
        state.lockInput = false;
        render();
        return;
      }

      scheduleDarkTurn();
    }

    function finishDarkTurn(message) {
      var finalMessage = message;
      var growthMessage;

      stopAI();
      state.currentTurn = "light";
      state.lockInput = false;

      growthMessage = applyIndustrialWastelandGrowth();
      if (growthMessage) {
        finalMessage += " " + growthMessage;
      }

      clearSelection();
      state.lastResult = finalMessage;

      if (evaluateVictory()) {
        render();
        return;
      }

      render();
    }

    function stageEthicalDecision(move, winnerPiece, isLightAttacker, winnerWasAttacker) {
      var codexMeta = ns.ethics.getEthicalCodexMetadata();
      var codexDraw = ns.ethics.drawCodexChoices(state.ethicalCodex, codexMeta.drawCount);
      var choices = codexDraw.choices;
      var squareLabel = ns.core.boardToCoord(move.toRow, move.toCol);
      var controlledBy = winnerPiece.side === "light" ? "human" : "computer";
      var autoChoiceId =
        controlledBy === "computer"
          ? ns.ethics.chooseAutoDecision(
              state.ethicalBoard,
              move.toRow,
              move.toCol,
              winnerPiece.side,
              choices,
              state.board,
              winnerPiece.side,
              state.capturedPieces
            )
          : null;
      var waitingMessage =
        controlledBy === "human"
          ? squareLabel +
            " is " +
            (winnerWasAttacker ? "captured" : "secured") +
            ". Ethical Codex access granted: draw 3, choose 1, discard 2."
          : squareLabel +
            " is " +
            (winnerWasAttacker ? "captured" : "secured") +
            ". " +
            ns.data.getSideLabel(winnerPiece.side) +
            " is waiting for its icon prompt to reveal the Ethical Codex selection.";

      if (!choices.length) {
        return false;
      }

      clearEthicalDecisionTimer();
      dismissEthicalNotification(false);
      state.mode = "ethics";
      state.lockInput = true;
      state.pendingAI = false;
      state.ethicalCodex = codexDraw.codexState;
      state.pendingEthicalDecision = {
        row: move.toRow,
        col: move.toCol,
        squareLabel: squareLabel,
        winnerSide: winnerPiece.side,
        winnerPieceId: winnerPiece.id,
        winnerPieceType: winnerPiece.type,
        winnerPieceName: ns.data.getPieceName(winnerPiece),
        isLightAttacker: isLightAttacker,
        winnerWasAttacker: winnerWasAttacker,
        outcomeVerb: winnerWasAttacker ? "captured" : "secured",
        controlledBy: controlledBy,
        autoChoiceId: autoChoiceId || null,
        revealedChoiceId: null,
        pairLabel: codexMeta.label,
        drawCount: choices.length,
        drawnChoiceIds: codexDraw.drawnIds,
        humanPromptText: codexMeta.humanPromptText,
        computerPromptText: codexMeta.computerPromptText,
        telemetryNote: codexMeta.telemetryNote,
        choices: choices
      };
      state.lastResult = waitingMessage;
      ns.core.addLog(
        state,
        controlledBy === "human"
          ? squareLabel + " awaits an Ethical Codex draw."
          : squareLabel + " awaits the CONSENSUS ICON reveal."
      );
      render();

      return true;
    }

    function commitEthicalDecision(choiceId) {
      var pending = state.pendingEthicalDecision;
      var piece;
      var squareState;
      var nextSquareState;
      var previousBoard;
      var boardResult;
      var landscape;
      var notification;
      var choice;
      var message;
      var recoveryMessage;
      var restorationMessage;
      var commandMessage;
      var destructionMessage;

      if (!pending) {
        return;
      }

      if (pending.controlledBy === "computer" && choiceId !== pending.autoChoiceId) {
        return;
      }

      clearEthicalDecisionTimer();

      previousBoard = ns.ethics.cloneBoard(state.ethicalBoard);
      piece = state.board[pending.row][pending.col];
      squareState = state.ethicalBoard[pending.row][pending.col];
      boardResult = ns.ethics.applyDecisionToBoard(state.ethicalBoard, pending.row, pending.col, choiceId, {
        row: pending.row,
        col: pending.col,
        squareLabel: pending.squareLabel,
        winnerSide: pending.winnerSide,
        winnerPieceId: piece ? piece.id : pending.winnerPieceId,
        winnerPieceType: piece ? piece.type : pending.winnerPieceType
      });
      choice = boardResult ? boardResult.choice : ns.ethics.getChoice(choiceId);

      if (!boardResult || !choice) {
        return;
      }

      state.ethicalCodex = ns.ethics.discardCodexChoices(state.ethicalCodex, pending.drawnChoiceIds);
      state.ethicalBoard = boardResult.board;
      landscape = ns.ethics.recalculateBoard(state.ethicalBoard);
      state.ethicalBoard = landscape.board;
      state.ethicalClusters = landscape.clusters;
      nextSquareState = state.ethicalBoard[pending.row][pending.col];
      notification = ns.ethics.getClusterFormationNotification(
        previousBoard,
        state.ethicalBoard,
        pending.row,
        pending.col,
        choice.governanceType
      );
      state.pendingEthicalDecision = null;
      state.mode = "board";

      recoveryMessage = piece ? applyTerritoryRecovery(piece, pending.row, pending.col) : "";
      restorationMessage = piece ? applyLandingRestorationEffect(piece, pending.row, pending.col) : "";
      commandMessage = piece ? applyLandingCommandEffect(piece, pending.row, pending.col) : "";
      destructionMessage = choice.id === "wasteland" ? applyIndustrialWastelandClearance(boardResult.affectedSquares) : "";

      message =
        pending.squareLabel +
        " adopts " +
        choice.label +
        " governance under " +
        nextSquareState.doctrine +
        ". " +
        ns.ethics.getRuleSummary(nextSquareState);
      if (recoveryMessage) {
        message += " " + recoveryMessage;
      }
      if (restorationMessage) {
        message += " " + restorationMessage;
      }
      if (commandMessage) {
        message += " " + commandMessage;
      }
      if (destructionMessage) {
        message += " " + destructionMessage;
      }
      ns.core.addLog(state, message);
      if (notification) {
        ns.core.addLog(state, notification.message);
      }

      if (pending.isLightAttacker) {
        finishLightTurn(message);
      } else {
        finishDarkTurn(message);
      }

      if (notification) {
        showEthicalNotification(notification);
      }
    }

    function finalizeQuietMove(move, isLightTurn) {
      var piece = state.board[move.fromRow][move.fromCol];
      var destination = ns.core.boardToCoord(move.toRow, move.toCol);
      var message;
      var recoveryMessage;
      var restorationMessage;
      var commandMessage;

      state.board[move.toRow][move.toCol] = piece;
      state.board[move.fromRow][move.fromCol] = null;
      piece.hasMoved = true;

      message = ns.data.getPieceName(piece) + " advances to " + destination + ".";
      recoveryMessage = applyTerritoryRecovery(piece, move.toRow, move.toCol);
      restorationMessage = applyLandingRestorationEffect(piece, move.toRow, move.toCol);
      commandMessage = applyLandingCommandEffect(piece, move.toRow, move.toCol);
      if (recoveryMessage) {
        message += " " + recoveryMessage;
      }
      if (restorationMessage) {
        message += " " + restorationMessage;
      }
      if (commandMessage) {
        message += " " + commandMessage;
      }
      ns.core.addLog(state, message);

      if (isLightTurn) {
        finishLightTurn(message);
      } else {
        finishDarkTurn(message);
      }
    }

    function applyQuietMove(move, isLightTurn) {
      var piece = state.board[move.fromRow][move.fromCol];
      var destination = ns.core.boardToCoord(move.toRow, move.toCol);

      if (renderer.canAnimateBoardMove(piece)) {
        clearSelection();
        state.lockInput = true;
        state.lastResult = ns.data.getPieceName(piece) + " advances to " + destination + ".";
        render();
        renderer.animateBoardMove(move, piece, function () {
          finalizeQuietMove(move, isLightTurn);
        });
        return;
      }

      finalizeQuietMove(move, isLightTurn);
    }

    function stageCaptureMove(move, isLightAttacker) {
      var attacker = state.board[move.fromRow][move.fromCol];
      var destination = ns.core.boardToCoord(move.toRow, move.toCol);

      if (!renderer.canAnimateBoardMove(attacker)) {
        startBattle(move, isLightAttacker);
        return;
      }

      clearSelection();
      state.lockInput = true;
      state.lastResult = ns.data.getPieceName(attacker) + " closes on " + destination + ".";
      render();
      renderer.animateBoardMove(move, attacker, function () {
        startBattle(move, isLightAttacker);
      });
    }

    function startBattle(move, isLightAttacker) {
      var attacker = state.board[move.fromRow][move.fromCol];
      var defender = state.board[move.toRow][move.toCol];
      var squareLabel = ns.core.boardToCoord(move.toRow, move.toCol);
      var squareState = state.ethicalBoard[move.toRow][move.toCol];
      var battleEffects = ns.ethics.getBattleEffects(squareState, attacker.side, defender.side);

      // Board mode pauses here and hands the contested square to the arena simulation.
      state.mode = "battle";
      state.lockInput = true;
      state.pendingAI = false;
      state.battle = {
        title: squareLabel + " enters arena lock",
        attackerFrom: { row: move.fromRow, col: move.fromCol },
        defenderAt: { row: move.toRow, col: move.toCol },
        attackerSide: attacker.side,
        lightPiece: attacker.side === "light" ? attacker : defender,
        lightPieceName: ns.data.getPieceName(attacker.side === "light" ? attacker : defender),
        territory: buildBattleTerritoryState(squareLabel, squareState, attacker, defender, battleEffects),
        live: null
      };
      state.lastResult = ns.data.getPieceName(attacker) + " challenges " + ns.data.getPieceName(defender) + ".";
      ns.core.addLog(state, state.lastResult);
      render();

      arena.start({
        attacker: attacker,
        defender: defender,
        attackerModifiers: battleEffects.attacker,
        defenderModifiers: battleEffects.defender,
        overchargeStartsAt: battleEffects.field.overchargeStartsAt,
        onUpdate: function (snapshot) {
          if (!state.battle) {
            return;
          }
          state.battle.live = snapshot;
          render();
        },
        onFinish: function (result) {
          resolveBattle(move, result, isLightAttacker);
        }
      });
    }

    function resolveBattle(move, result, isLightAttacker) {
      var attacker = state.board[move.fromRow][move.fromCol];
      var defender = state.board[move.toRow][move.toCol];
      var winnerIsAttacker = result.winnerSide === attacker.side;
      var winnerPiece;
      var losingPiece;
      var message = result.summary;

      // The battle winner keeps the square, and surviving health carries back to the board.
      if (winnerIsAttacker) {
        attacker.health = Math.max(1, result.attackerRemainingHealth);
        attacker.hasMoved = true;
        state.board[move.toRow][move.toCol] = attacker;
        state.board[move.fromRow][move.fromCol] = null;
      } else {
        defender.health = Math.max(1, result.defenderRemainingHealth);
        state.board[move.fromRow][move.fromCol] = null;
      }

      state.battle = null;
      ns.core.addLog(state, message);

      winnerPiece = winnerIsAttacker ? attacker : defender;
      losingPiece = winnerIsAttacker ? defender : attacker;
      recordCapturedPiece(losingPiece);

      if (!stageEthicalDecision(move, winnerPiece, isLightAttacker, winnerIsAttacker)) {
        finalizeBattleWithoutDecision(winnerPiece, move.toRow, move.toCol, isLightAttacker, message);
      }
    }

    function executeMove(move, isLightTurn) {
      clearTurnCommandOverride(isLightTurn ? "light" : "dark");

      if (move.isCapture) {
        stageCaptureMove(move, isLightTurn);
        return;
      }

      applyQuietMove(move, isLightTurn);
    }

    function finalizeBattleWithoutDecision(winnerPiece, row, col, isLightAttacker, message) {
      var finalMessage = message;
      var recoveryMessage = winnerPiece ? applyTerritoryRecovery(winnerPiece, row, col) : "";
      var restorationMessage = winnerPiece ? applyLandingRestorationEffect(winnerPiece, row, col) : "";
      var commandMessage = winnerPiece ? applyLandingCommandEffect(winnerPiece, row, col) : "";

      state.mode = "board";

      if (recoveryMessage) {
        finalMessage += " " + recoveryMessage;
        ns.core.addLog(state, recoveryMessage);
      }
      if (restorationMessage) {
        finalMessage += " " + restorationMessage;
        ns.core.addLog(state, restorationMessage);
      }
      if (commandMessage) {
        finalMessage += " " + commandMessage;
        ns.core.addLog(state, commandMessage);
      }

      if (isLightAttacker) {
        finishLightTurn(finalMessage);
      } else {
        finishDarkTurn(finalMessage);
      }
    }

    function runDarkTurn() {
      var move;
      var attacker;
      var destination;

      stopAI();

      if (state.mode !== "board" || state.winner) {
        return;
      }

      move = ns.core.chooseDarkMove(state);
      if (!move) {
        state.winner = "light";
        state.lastResult = ns.data.getSideLabel("dark") + " has no valid move.";
        ns.core.addLog(state, ns.data.getSideLabel("light") + " wins when the Consensus cannot issue a legal move.");
        state.lockInput = false;
        render();
        return;
      }

      attacker = state.board[move.fromRow][move.fromCol];
      destination = ns.core.boardToCoord(move.toRow, move.toCol);
      ns.core.addLog(state, ns.data.getPieceName(attacker) + " commits to " + destination + ".");
      executeMove(move, false);
    }

    function selectSquare(row, col) {
      var piece = state.board[row][col];
      var commandSide = getCommandSideForTurn("light");
      var isCommandable;
      var movementProfile = getOriginMovementProfile(row, col);
      var usesLatticePattern = movementProfile === "lancer";
      var squareState = getSquareState(row, col);
      var usesKnowledgeCommons = squareState && squareState.movementBonus === "consequence-link";
      var usesSovereignMandate = squareState && squareState.movementBonus === "sovereign-mandate";
      var forcedArchiveTurn = commandSide !== "light";
      var selectionMessage;
      var squareLabel = ns.core.boardToCoord(row, col);

      if (!piece) {
        if (ns.ethics.hasConsequenceTile(squareState)) {
          clearSelection();
          state.inspectedSquare = { row: row, col: col };
          state.lastResult =
            squareLabel +
            " carries " +
            ns.ethics.getGovernanceLabel(squareState.governanceType) +
            ". " +
            ns.ethics.getRuleSummary(squareState);
          renderer.playConsequenceTileInspectAudio();
          render();
          return;
        }
        clearSelection();
        state.lastResult = "No unit occupies that square.";
        render();
        return;
      }

      isCommandable = piece.side === commandSide && state.currentTurn === "light";
      state.selected = { row: row, col: col };
      state.inspectedSquare = { row: row, col: col };
      state.validMoves = isCommandable ? getScopedValidMoves(row, col) : [];
      if (isCommandable) {
        if (state.validMoves.length) {
          if (usesLatticePattern) {
            selectionMessage = ns.data.getPieceName(piece) + " must exit via the Vanguard / Interceptor L-pattern.";
          } else if (usesKnowledgeCommons) {
            selectionMessage = ns.data.getPieceName(piece) + " can route to any other consequence tile from the Knowledge Commons.";
          } else if (usesSovereignMandate) {
            selectionMessage = ns.data.getPieceName(piece) + " can also move with Paragon / Nexus reach from the Sovereign Mandate.";
          } else {
            selectionMessage = ns.data.getPieceName(piece) + " is awaiting a destination.";
          }
        } else if (usesLatticePattern) {
          selectionMessage = ns.data.getPieceName(piece) + " has no legal L-pattern exits.";
        } else if (usesKnowledgeCommons) {
          selectionMessage = ns.data.getPieceName(piece) + " has no legal routes out through the Knowledge Commons.";
        } else if (usesSovereignMandate) {
          selectionMessage = ns.data.getPieceName(piece) + " has no legal Sovereign Mandate routes.";
        } else {
          selectionMessage = ns.data.getPieceName(piece) + " has no legal moves.";
        }
      } else if (forcedArchiveTurn && piece.side === "light") {
        selectionMessage =
          "Predictive Archive compels the Remnant to move a Consensus unit next. " + ns.data.getPieceName(piece) + " is under inspection.";
      } else {
        selectionMessage = ns.data.getPieceName(piece) + " is under inspection.";
      }
      state.lastResult = selectionMessage;
      render();
    }

    function handleSquareClick(row, col) {
      var clickedPiece;
      var clickedSquareState;
      var selectedPiece;
      var chosenMove;
      var commandSide = getCommandSideForTurn("light");

      if (state.lockInput || state.mode !== "board" || state.currentTurn !== "light" || state.winner) {
        return;
      }

      clickedPiece = state.board[row][col];
      clickedSquareState = getSquareState(row, col);

      if (!state.selected) {
        if (
          state.inspectedSquare &&
          !clickedPiece &&
          row === state.inspectedSquare.row &&
          col === state.inspectedSquare.col
        ) {
          clearSelection();
          state.lastResult = "Inspection cleared.";
          render();
          return;
        }
        selectSquare(row, col);
        return;
      }

      selectedPiece = state.board[state.selected.row][state.selected.col];

      if (clickedPiece && clickedPiece.side === commandSide && !(row === state.selected.row && col === state.selected.col)) {
        selectSquare(row, col);
        return;
      }

      chosenMove = state.validMoves.find(function (move) {
        return move.row === row && move.col === col;
      });

      if (!selectedPiece) {
        clearSelection();
        render();
        return;
      }

      if (!chosenMove) {
        if (clickedPiece && !(row === state.selected.row && col === state.selected.col)) {
          selectSquare(row, col);
          return;
        }
        if (
          !clickedPiece &&
          ns.ethics.hasConsequenceTile(clickedSquareState) &&
          !(row === state.selected.row && col === state.selected.col)
        ) {
          clearSelection();
          state.inspectedSquare = { row: row, col: col };
          state.lastResult =
            ns.core.boardToCoord(row, col) +
            " carries " +
            ns.ethics.getGovernanceLabel(clickedSquareState.governanceType) +
            ". " +
            ns.ethics.getRuleSummary(clickedSquareState);
          renderer.playConsequenceTileInspectAudio();
          render();
          return;
        }
        if (row === state.selected.row && col === state.selected.col) {
          clearSelection();
          state.lastResult = "Selection cleared.";
          render();
          return;
        }
        state.lastResult = "That square is outside the current move pattern.";
        render();
        return;
      }

      executeMove(
        {
          fromRow: state.selected.row,
          fromCol: state.selected.col,
          toRow: chosenMove.row,
          toCol: chosenMove.col,
          piece: selectedPiece,
          target: chosenMove.target,
          isCapture: chosenMove.isCapture
        },
        true
      );
    }

    function newGame() {
      stopAI();
      clearEthicalDecisionTimer();
      dismissEthicalNotification(false);
      arena.stop();
      renderer.cancelBoardAnimation();
      renderer.resetBoardIntro();
      state = ns.core.createInitialState();
      render();
    }

    function start() {
      renderer.setSquareClickHandler(handleSquareClick);
      renderer.setNewGameHandler(newGame);
      renderer.setEthicalDecisionHandler(commitEthicalDecision);
      renderer.setEthicalAdvanceHandler(advanceComputerEthicalDecision);
      renderer.resetBoardIntro();
      render();
    }

    return {
      start: start
    };
  }

  ns.core.createGame = createGame;
})(window.ArchonEngine);
