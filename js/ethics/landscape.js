(function (ns) {
  var NEIGHBOR_OFFSETS = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1]
  ];
  var ETHICAL_CODEX_LABEL = "Ethical Codex";
  var ETHICAL_CODEX_SET_ID = "ethical-codex";
  var ETHICAL_CODEX_DRAW_COUNT = 3;
  var ETHICAL_CODEX_PROMPTS = {
    humanPromptText: "Access the Ethical Codex. Draw 3 tiles, choose 1, discard 2.",
    computerPromptText: "Watch while it accesses the Ethical Codex, draws 3 tiles, and selects 1.",
    telemetryNote: "Every battle victory grants Ethical Codex access: draw 3 tiles, choose 1, discard 2."
  };
  var ETHICAL_CODEX_CARDS = [
    {
      id: "remnant",
      label: "Remnant",
      governanceType: "remnant",
      doctrine: "Remnant reclamation",
      influenceStrength: 2,
      description: "Consensus units cannot enter this square.",
      metricText: "Influence 2 / 3",
      movementProfile: null,
      movementBonus: null,
      commandEffect: null,
      supportsClusters: true
    },
    {
      id: "consensus",
      label: "Consensus",
      governanceType: "consensus",
      doctrine: "Consensus harmonization",
      influenceStrength: 2,
      description: "Remnant units cannot enter this square.",
      metricText: "Influence 2 / 3",
      movementProfile: null,
      movementBonus: null,
      commandEffect: null,
      supportsClusters: true
    },
    {
      id: "accord",
      label: "Accord Compact",
      governanceType: "accord",
      doctrine: "Accord compact",
      influenceStrength: 1,
      description: "Neutral territory: either side may enter, but captures are forbidden here.",
      metricText: "Demilitarized square",
      movementProfile: null,
      movementBonus: null,
      commandEffect: null,
      supportsClusters: true
    },
    {
      id: "lattice",
      label: "Pursuit Lattice",
      governanceType: "lattice",
      doctrine: "Vanguard-interceptor pursuit lattice",
      influenceStrength: 1,
      description: "Any piece that lands on this square must leave it with a Vanguard / Interceptor L-move.",
      metricText: "Exit pattern L-shape",
      movementProfile: "lancer",
      movementBonus: null,
      commandEffect: null,
      supportsClusters: false
    },
    {
      id: "mandate",
      label: "Sovereign Mandate",
      governanceType: "mandate",
      doctrine: "Sovereign mandate",
      influenceStrength: 1,
      description: "Pieces on this square may also move as a Paragon / Nexus on their next move.",
      metricText: "Borrow crown movement",
      movementProfile: null,
      movementBonus: "sovereign-mandate",
      commandEffect: null,
      supportsClusters: false
    },
    {
      id: "preservation",
      label: "Preservation Codex",
      governanceType: "preservation",
      doctrine: "Preservation codex",
      influenceStrength: 1,
      description: "Any piece landing here reconstructs one destroyed allied unit back onto the board.",
      metricText: "Rebuild fallen unit",
      movementProfile: null,
      movementBonus: null,
      commandEffect: null,
      supportsClusters: false
    },
    {
      id: "virus",
      label: "Virus Codex",
      governanceType: "virus",
      doctrine: "Virus codex",
      influenceStrength: 1,
      description: "Infected square. No piece may enter it.",
      metricText: "Universal no-entry zone",
      movementProfile: null,
      movementBonus: null,
      commandEffect: null,
      supportsClusters: false
    },
    {
      id: "wasteland",
      label: "Industrial Wasteland",
      governanceType: "wasteland",
      doctrine: "Industrial wasteland",
      influenceStrength: 1,
      description:
        "The piece on this square is destroyed instantly. After every turn, each connected Industrial Wasteland mass expands by 1 random adjacent square and destroys anything it engulfs. No piece may enter wasteland.",
      metricText: "Kills occupant / grows 1 tile",
      movementProfile: null,
      movementBonus: null,
      commandEffect: null,
      supportsClusters: false,
      hazardEffect: "industrial-wasteland",
      hazardRadius: 0,
      hazardProjects: true
    },
    {
      id: "commons",
      label: "Knowledge Commons",
      governanceType: "commons",
      doctrine: "Knowledge commons",
      influenceStrength: 1,
      description: "Pieces on this square may also move to any other consequence tile on their next move.",
      metricText: "Route to consequence tiles",
      movementProfile: null,
      movementBonus: "consequence-link",
      commandEffect: null,
      supportsClusters: false
    },
    {
      id: "archive",
      label: "Predictive Archive",
      governanceType: "archive",
      doctrine: "Predictive archive",
      influenceStrength: 1,
      description: "A landing piece forces its side to move an opponent unit on its next turn.",
      metricText: "Redirect next command",
      movementProfile: null,
      movementBonus: null,
      commandEffect: "move-opponent",
      supportsClusters: false
    }
  ];
  var GOVERNANCE_LABELS = {
    neutral: "Neutral",
    remnant: "Remnant",
    consensus: "Consensus",
    accord: "Accord Compact",
    lattice: "Pursuit Lattice",
    mandate: "Sovereign Mandate",
    preservation: "Preservation Codex",
    virus: "Virus Codex",
    wasteland: "Industrial Wasteland",
    commons: "Knowledge Commons",
    archive: "Predictive Archive"
  };
  var GOVERNANCE_VISUALS = {
    neutral: {
      artSrc: "",
      accentColor: "#f4eddb"
    },
    remnant: {
      artSrc: "assets/territory/remnant-reclamation.webp",
      accentColor: "#f4c984"
    },
    consensus: {
      artSrc: "assets/territory/consensus-harmonisation.webp",
      accentColor: "#78ddff"
    },
    accord: {
      artSrc: "assets/territory/accord-compact.webp",
      accentColor: "#dae7ec"
    },
    lattice: {
      artSrc: "assets/territory/vanguard-interceptor-lattice.webp",
      accentColor: "#72c6ec"
    },
    commons: {
      artSrc: "assets/territory/knowledge-commons.webp",
      accentColor: "#f4d698"
    },
    archive: {
      artSrc: "assets/territory/predictive-archive.webp",
      accentColor: "#a4dfff"
    },
    mandate: {
      artSrc: "assets/territory/sovereign-mandate.webp",
      accentColor: "#e9dcab"
    },
    preservation: {
      artSrc: "assets/territory/preservation-codex.webp",
      accentColor: "#f5d684"
    },
    virus: {
      artSrc: "assets/territory/virus-codex.webp",
      accentColor: "#ff5c5c"
    },
    wasteland: {
      artSrc: "assets/territory/industrial-wasteland.webp",
      accentColor: "#f3d449"
    }
  };
  var GOVERNANCE_TO_SIDE = {
    remnant: "light",
    consensus: "dark"
  };
  var CLUSTER_NOTICES = {
    consensus: "Predictive Governance Network forming",
    remnant: "Free Cities Movement forming",
    accord: "Shared Governance Compact forming"
  };

  function cloneDecision(decision) {
    if (!decision) {
      return null;
    }

    return {
      choiceId: decision.choiceId,
      choiceLabel: decision.choiceLabel,
      governanceType: decision.governanceType,
      doctrine: decision.doctrine,
      influenceStrength: decision.influenceStrength,
      movementProfile: decision.movementProfile || null,
      movementBonus: decision.movementBonus || null,
      commandEffect: decision.commandEffect || null,
      hazardEffect: decision.hazardEffect || null,
      hazardRadius: decision.hazardRadius || 0,
      hazardProjects: decision.hazardProjects === true,
      hazardOriginRow: typeof decision.hazardOriginRow === "number" ? decision.hazardOriginRow : null,
      hazardOriginCol: typeof decision.hazardOriginCol === "number" ? decision.hazardOriginCol : null,
      supportsClusters: decision.supportsClusters !== false,
      decisionSetId: decision.decisionSetId || null,
      pairLabel: decision.pairLabel || "",
      square: decision.square,
      row: decision.row,
      col: decision.col,
      winnerSide: decision.winnerSide,
      winnerPieceId: decision.winnerPieceId,
      winnerPieceType: decision.winnerPieceType,
      madeAt: decision.madeAt
    };
  }

  function cloneChoice(choice) {
    return {
      id: choice.id,
      label: choice.label,
      governanceType: choice.governanceType,
      doctrine: choice.doctrine,
      influenceStrength: choice.influenceStrength,
      description: choice.description,
      metricText: choice.metricText || "",
      movementProfile: choice.movementProfile || null,
      movementBonus: choice.movementBonus || null,
      commandEffect: choice.commandEffect || null,
      hazardEffect: choice.hazardEffect || null,
      hazardRadius: choice.hazardRadius || 0,
      hazardProjects: choice.hazardProjects === true,
      hazardOriginRow: null,
      hazardOriginCol: null,
      supportsClusters: choice.supportsClusters !== false,
      decisionSetId: choice.decisionSetId || ETHICAL_CODEX_SET_ID,
      pairLabel: choice.pairLabel || ETHICAL_CODEX_LABEL
    };
  }

  function getEthicalCodexMetadata() {
    return {
      id: ETHICAL_CODEX_SET_ID,
      label: ETHICAL_CODEX_LABEL,
      drawCount: ETHICAL_CODEX_DRAW_COUNT,
      humanPromptText: ETHICAL_CODEX_PROMPTS.humanPromptText,
      computerPromptText: ETHICAL_CODEX_PROMPTS.computerPromptText,
      telemetryNote: ETHICAL_CODEX_PROMPTS.telemetryNote
    };
  }

  function createSquareState() {
    return {
      governanceType: "neutral",
      doctrine: "",
      influenceStrength: 0,
      movementProfile: null,
      movementBonus: null,
      commandEffect: null,
      hazardEffect: null,
      hazardRadius: 0,
      hazardProjects: false,
      hazardOriginRow: null,
      hazardOriginCol: null,
      supportsClusters: false,
      decisionSetId: null,
      pairLabel: "",
      lastEthicalDecision: null,
      clusterId: null,
      clusterSize: 0,
      sameTypeNeighbors: 0
    };
  }

  function cloneSquareState(squareState) {
    if (!squareState) {
      return createSquareState();
    }

    return {
      governanceType: squareState.governanceType,
      doctrine: squareState.doctrine,
      influenceStrength: squareState.influenceStrength,
      movementProfile: squareState.movementProfile || null,
      movementBonus: squareState.movementBonus || null,
      commandEffect: squareState.commandEffect || null,
      hazardEffect: squareState.hazardEffect || null,
      hazardRadius: squareState.hazardRadius || 0,
      hazardProjects: squareState.hazardProjects === true,
      hazardOriginRow: typeof squareState.hazardOriginRow === "number" ? squareState.hazardOriginRow : null,
      hazardOriginCol: typeof squareState.hazardOriginCol === "number" ? squareState.hazardOriginCol : null,
      supportsClusters: squareState.supportsClusters !== false,
      decisionSetId: squareState.decisionSetId || null,
      pairLabel: squareState.pairLabel || "",
      lastEthicalDecision: cloneDecision(squareState.lastEthicalDecision),
      clusterId: squareState.clusterId || null,
      clusterSize: squareState.clusterSize || 0,
      sameTypeNeighbors: squareState.sameTypeNeighbors || 0
    };
  }

  function createBoard(size) {
    var board = [];
    var row;
    var col;

    for (row = 0; row < size; row += 1) {
      board[row] = [];
      for (col = 0; col < size; col += 1) {
        board[row][col] = createSquareState();
      }
    }

    return board;
  }

  function shuffleValues(values) {
    var shuffled = values.slice();
    var index;
    var swapIndex;
    var temp;

    for (index = shuffled.length - 1; index > 0; index -= 1) {
      swapIndex = Math.floor(Math.random() * (index + 1));
      temp = shuffled[index];
      shuffled[index] = shuffled[swapIndex];
      shuffled[swapIndex] = temp;
    }

    return shuffled;
  }

  function cloneBoard(board) {
    return board.map(function (row) {
      return row.map(cloneSquareState);
    });
  }

  function createCodexState() {
    return {
      drawPile: shuffleValues(
        ETHICAL_CODEX_CARDS.map(function (choice) {
          return choice.id;
        })
      ),
      discardPile: []
    };
  }

  function cloneCodexState(codexState) {
    return {
      drawPile: codexState && codexState.drawPile ? codexState.drawPile.slice() : [],
      discardPile: codexState && codexState.discardPile ? codexState.discardPile.slice() : []
    };
  }

  function refillCodexDrawPile(codexState) {
    if (!codexState.discardPile.length) {
      return;
    }

    codexState.drawPile = codexState.drawPile.concat(shuffleValues(codexState.discardPile));
    codexState.discardPile = [];
  }

  function drawCodexChoices(codexState, count) {
    var nextState = codexState ? cloneCodexState(codexState) : createCodexState();
    var requestedCount = Math.max(1, count || ETHICAL_CODEX_DRAW_COUNT);
    var drawnIds = [];
    var choices;

    while (drawnIds.length < requestedCount) {
      if (!nextState.drawPile.length) {
        refillCodexDrawPile(nextState);
      }

      if (!nextState.drawPile.length) {
        nextState.drawPile = shuffleValues(
          ETHICAL_CODEX_CARDS.map(function (choice) {
            return choice.id;
          })
        );
      }

      drawnIds.push(nextState.drawPile.shift());
    }

    choices = drawnIds
      .map(function (choiceId) {
        return getChoice(choiceId);
      })
      .filter(Boolean);

    return {
      codexState: nextState,
      drawnIds: drawnIds,
      choices: choices
    };
  }

  function discardCodexChoices(codexState, choiceIds) {
    var nextState = codexState ? cloneCodexState(codexState) : createCodexState();

    (choiceIds || []).forEach(function (choiceId) {
      if (choiceId) {
        nextState.discardPile.push(choiceId);
      }
    });

    return nextState;
  }

  function getNeighborCoords(row, col, size) {
    var coords = [];
    var index;
    var nextRow;
    var nextCol;

    for (index = 0; index < NEIGHBOR_OFFSETS.length; index += 1) {
      nextRow = row + NEIGHBOR_OFFSETS[index][0];
      nextCol = col + NEIGHBOR_OFFSETS[index][1];

      if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) {
        continue;
      }

      coords.push({ row: nextRow, col: nextCol });
    }

    return coords;
  }

  function boardToCoord(row, col) {
    return String.fromCharCode(65 + col) + String(8 - row);
  }

  function getChoice(choiceId) {
    var choiceIndex;

    for (choiceIndex = 0; choiceIndex < ETHICAL_CODEX_CARDS.length; choiceIndex += 1) {
      if (ETHICAL_CODEX_CARDS[choiceIndex].id === choiceId) {
        return cloneChoice(ETHICAL_CODEX_CARDS[choiceIndex]);
      }
    }

    return null;
  }

  function getGovernanceLabel(governanceType) {
    return GOVERNANCE_LABELS[governanceType] || "Unknown";
  }

  function getGovernanceVisual(governanceType) {
    return GOVERNANCE_VISUALS[governanceType] || GOVERNANCE_VISUALS.neutral;
  }

  function getGovernanceSide(governanceType) {
    return GOVERNANCE_TO_SIDE[governanceType] || null;
  }

  function hasConsequenceTile(squareState) {
    return Boolean(squareState && squareState.governanceType && squareState.governanceType !== "neutral");
  }

  function isIndustrialWasteland(squareState) {
    return Boolean(squareState && (squareState.governanceType === "wasteland" || squareState.hazardEffect === "industrial-wasteland"));
  }

  function getRuleSummary(squareState) {
    if (!squareState || squareState.governanceType === "neutral") {
      return "Open square. Standard capture rules apply.";
    }

    if (isIndustrialWasteland(squareState)) {
      return "Industrial Wasteland destroys the piece on it, then expands by 1 random adjacent square after every turn. Anything it engulfs is destroyed, and no piece may enter it.";
    }

    if (squareState.movementProfile === "lancer") {
      return "Any piece that lands on this square must leave it with a Vanguard / Interceptor L-move.";
    }

    if (squareState.movementBonus === "consequence-link") {
      return "Pieces on this square may also move to any other consequence tile on their next move.";
    }

    if (squareState.movementBonus === "sovereign-mandate") {
      return "Pieces on this square may also move as a Paragon / Nexus on their next move.";
    }

    if (squareState.commandEffect === "move-opponent") {
      return "Any piece that lands on this square forces its side to move an opponent unit on its next turn.";
    }

    if (squareState.governanceType === "preservation") {
      return "Any piece that lands on this square reconstructs one destroyed allied unit back onto the board.";
    }

    if (squareState.governanceType === "virus") {
      return "Infected square. No piece may enter it.";
    }

    if (squareState.governanceType === "remnant") {
      return "Consensus units cannot enter this square.";
    }

    if (squareState.governanceType === "consensus") {
      return "Remnant units cannot enter this square.";
    }

    if (squareState.governanceType === "accord") {
      return "Demilitarized square. Either side may enter, but no capture can happen here.";
    }

    return "Special territory rule active.";
  }

  function getPreferredGovernanceForSide(side) {
    if (side === "light") {
      return "remnant";
    }

    if (side === "dark") {
      return "consensus";
    }

    return "accord";
  }

  function getBaseInfluence(squareState) {
    if (
      squareState.lastEthicalDecision &&
      typeof squareState.lastEthicalDecision.influenceStrength === "number"
    ) {
      return squareState.lastEthicalDecision.influenceStrength;
    }

    return squareState.governanceType === "neutral" ? 0 : Math.max(1, squareState.influenceStrength || 0);
  }

  function createBattleModifier() {
    return {
      healthBonus: 0,
      damageBonus: 0,
      speedBonus: 0,
      cooldownMultiplier: 1,
      summaries: []
    };
  }

  function pushSummary(list, message) {
    if (message && list.indexOf(message) === -1) {
      list.push(message);
    }
  }

  function getRecoveryEffect(squareState, side) {
    var amount = 0;

    if (!squareState || squareState.governanceType === "neutral") {
      return null;
    }

    if (getGovernanceSide(squareState.governanceType) === side) {
      amount = (squareState.influenceStrength || 0) * 2;
      if (squareState.clusterSize >= 3) {
        amount += 2;
      }
    }

    if (!amount) {
      return null;
    }

    return {
      amount: amount,
      governanceType: squareState.governanceType,
      clusterSize: squareState.clusterSize || 0,
      influenceStrength: squareState.influenceStrength || 0
    };
  }

  function getBattleEffects(squareState, attackerSide, defenderSide) {
    var attacker = createBattleModifier();
    var defender = createBattleModifier();
    var field = {
      overchargeStartsAt: 18,
      summaries: []
    };
    var influence;
    var clusterBonus;
    var alignedSide;

    if (!squareState || squareState.governanceType === "neutral") {
      return {
        attacker: attacker,
        defender: defender,
        field: field
      };
    }

    if (squareState.governanceType === "accord") {
      return {
        attacker: attacker,
        defender: defender,
        field: field
      };
    }

    influence = squareState.influenceStrength || 0;
    clusterBonus = squareState.clusterSize > 1 ? 4 + (squareState.sameTypeNeighbors || 0) * 2 : 0;

    alignedSide = getGovernanceSide(squareState.governanceType);

    function applyAlignedBonus(modifier) {
      modifier.healthBonus += influence * 4;
      modifier.damageBonus += influence;
      pushSummary(
        modifier.summaries,
        getGovernanceLabel(squareState.governanceType) + " governance fortifies local control."
      );

      if (squareState.clusterSize > 1) {
        modifier.speedBonus += clusterBonus;
        pushSummary(modifier.summaries, "Connected cluster boosts battlefield tempo.");
      }

      if (squareState.clusterSize >= 3) {
        if (squareState.governanceType === "remnant") {
          modifier.healthBonus += 8;
          modifier.speedBonus += 8;
          pushSummary(modifier.summaries, "Free Cities Movement reinforces the square.");
        } else if (squareState.governanceType === "consensus") {
          modifier.damageBonus += 2;
          modifier.cooldownMultiplier *= 0.88;
          pushSummary(modifier.summaries, "Predictive Governance Network sharpens attack cycles.");
        }
      }
    }

    if (attackerSide === alignedSide) {
      applyAlignedBonus(attacker);
    }

    if (defenderSide === alignedSide) {
      applyAlignedBonus(defender);
    }

    return {
      attacker: attacker,
      defender: defender,
      field: field
    };
  }

  function isSquareEnterable(squareState, side) {
    var governanceSide;

    if (
      !squareState ||
      squareState.governanceType === "neutral" ||
      squareState.governanceType === "accord"
    ) {
      return true;
    }

    if (squareState.governanceType === "virus") {
      return false;
    }

    if (isIndustrialWasteland(squareState)) {
      return false;
    }

    governanceSide = getGovernanceSide(squareState.governanceType);
    return !governanceSide || governanceSide === side;
  }

  function isCaptureAllowed(squareState) {
    return !squareState || squareState.governanceType !== "accord";
  }

  function getOriginMovementProfile(ethicalBoard, row, col) {
    if (!ethicalBoard || !ethicalBoard[row] || !ethicalBoard[row][col]) {
      return null;
    }

    return ethicalBoard[row][col].movementProfile || null;
  }

  function getOriginMovementBonus(ethicalBoard, row, col) {
    if (!ethicalBoard || !ethicalBoard[row] || !ethicalBoard[row][col]) {
      return null;
    }

    return ethicalBoard[row][col].movementBonus || null;
  }

  function getCommandEffect(squareState) {
    return squareState ? squareState.commandEffect || null : null;
  }

  function addBoardMove(moves, board, piece, row, col) {
    var occupant;

    if (row < 0 || row >= board.length || col < 0 || col >= board[row].length) {
      return;
    }

    occupant = board[row][col];

    if (!occupant) {
      moves.push({ row: row, col: col, isCapture: false, target: null });
      return;
    }

    if (occupant.side !== piece.side) {
      moves.push({ row: row, col: col, isCapture: true, target: occupant });
    }
  }

  function mergeUniqueMoves(baseMoves, extraMoves) {
    var merged = [];
    var seen = Object.create(null);

    function pushMove(move) {
      var key = move.row + ":" + move.col;

      if (seen[key]) {
        return;
      }

      seen[key] = true;
      merged.push(move);
    }

    baseMoves.forEach(pushMove);
    extraMoves.forEach(pushMove);

    return merged;
  }

  function getConsequenceLinkMoves(board, ethicalBoard, piece, row, col) {
    var moves = [];
    var targetRow;
    var targetCol;
    var squareState;

    for (targetRow = 0; targetRow < board.length; targetRow += 1) {
      for (targetCol = 0; targetCol < board[targetRow].length; targetCol += 1) {
        if (targetRow === row && targetCol === col) {
          continue;
        }

        squareState = ethicalBoard && ethicalBoard[targetRow] ? ethicalBoard[targetRow][targetCol] : null;
        if (!hasConsequenceTile(squareState)) {
          continue;
        }

        if (!isSquareEnterable(squareState, piece.side)) {
          continue;
        }

        addBoardMove(moves, board, piece, targetRow, targetCol);
      }
    }

    return moves;
  }

  function getSovereignMandateMoves(board, row, col) {
    return ns.core.getValidMoves(board, row, col, "crown");
  }

  function getPatternedMoves(board, ethicalBoard, row, col) {
    var piece = board && board[row] ? board[row][col] : null;
    var movementProfile;
    var movementBonus;
    var baseMoves;
    var moves;

    if (!piece) {
      return [];
    }

    movementProfile = getOriginMovementProfile(ethicalBoard, row, col);
    movementBonus = getOriginMovementBonus(ethicalBoard, row, col);
    baseMoves = ns.core.getValidMoves(board, row, col, movementProfile);
    moves = baseMoves;

    if (movementBonus === "consequence-link") {
      moves = mergeUniqueMoves(moves, getConsequenceLinkMoves(board, ethicalBoard, piece, row, col));
    }

    if (movementBonus === "sovereign-mandate") {
      moves = mergeUniqueMoves(moves, getSovereignMandateMoves(board, row, col));
    }

    return moves;
  }

  function getAllPatternedMovesForSide(board, ethicalBoard, side) {
    var moves = [];
    var row;
    var col;
    var pieceMoves;
    var piece;
    var index;

    for (row = 0; row < board.length; row += 1) {
      for (col = 0; col < board[row].length; col += 1) {
        piece = board[row][col];
        if (!piece || piece.side !== side) {
          continue;
        }

        pieceMoves = getPatternedMoves(board, ethicalBoard, row, col);
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

  function isMoveAllowed(board, ethicalBoard, piece, row, col, isCapture) {
    var squareState;

    if (!piece || !ethicalBoard || !ethicalBoard[row] || !ethicalBoard[row][col]) {
      return true;
    }

    squareState = ethicalBoard[row][col];

    if (!isSquareEnterable(squareState, piece.side)) {
      return false;
    }

    if (isCapture && !isCaptureAllowed(squareState)) {
      return false;
    }

    return true;
  }

  function countSameTypeNeighbors(board, row, col, governanceType) {
    var neighbors = getNeighborCoords(row, col, board.length);
    var index;
    var square;
    var count = 0;

    for (index = 0; index < neighbors.length; index += 1) {
      square = board[neighbors[index].row][neighbors[index].col];
      if (square && square.governanceType === governanceType) {
        count += 1;
      }
    }

    return count;
  }

  function recalculateBoard(board) {
    var nextBoard = cloneBoard(board);
    var visited = [];
    var clusters = [];
    var row;
    var col;
    var square;

    for (row = 0; row < nextBoard.length; row += 1) {
      visited[row] = [];
      for (col = 0; col < nextBoard[row].length; col += 1) {
        square = nextBoard[row][col];
        visited[row][col] = false;
        square.clusterId = null;
        square.clusterSize = 0;
        square.sameTypeNeighbors = 0;

        if (square.governanceType === "neutral") {
          square.influenceStrength = 0;
        }
      }
    }

    for (row = 0; row < nextBoard.length; row += 1) {
      for (col = 0; col < nextBoard[row].length; col += 1) {
        square = nextBoard[row][col];

        if (visited[row][col] || square.governanceType === "neutral" || !square.supportsClusters) {
          continue;
        }

        (function buildCluster(startRow, startCol, governanceType) {
          var queue = [{ row: startRow, col: startCol }];
          var clusterSquares = [];
          var clusterId = governanceType + "-" + clusters.length;
          var current;
          var neighbors;
          var index;
          var nextSquare;

          visited[startRow][startCol] = true;

          while (queue.length) {
            current = queue.shift();
            clusterSquares.push(current);
            neighbors = getNeighborCoords(current.row, current.col, nextBoard.length);

            for (index = 0; index < neighbors.length; index += 1) {
              nextSquare = nextBoard[neighbors[index].row][neighbors[index].col];

              if (
                !visited[neighbors[index].row][neighbors[index].col] &&
                nextSquare &&
                nextSquare.governanceType === governanceType
              ) {
                visited[neighbors[index].row][neighbors[index].col] = true;
                queue.push(neighbors[index]);
              }
            }
          }

          for (index = 0; index < clusterSquares.length; index += 1) {
            nextSquare = nextBoard[clusterSquares[index].row][clusterSquares[index].col];
            nextSquare.clusterId = clusterId;
            nextSquare.clusterSize = clusterSquares.length;
          }

          clusters.push({
            id: clusterId,
            governanceType: governanceType,
            size: clusterSquares.length,
            squares: clusterSquares
          });
        })(row, col, square.governanceType);
      }
    }

    for (row = 0; row < nextBoard.length; row += 1) {
      for (col = 0; col < nextBoard[row].length; col += 1) {
        square = nextBoard[row][col];

        if (square.governanceType === "neutral") {
          continue;
        }

        if (!square.supportsClusters) {
          square.influenceStrength = getBaseInfluence(square);
          continue;
        }

        square.sameTypeNeighbors = countSameTypeNeighbors(nextBoard, row, col, square.governanceType);
        square.influenceStrength = Math.min(3, getBaseInfluence(square) + square.sameTypeNeighbors);
      }
    }

    return {
      board: nextBoard,
      clusters: clusters
    };
  }

  function getLargestAdjacentClusterSize(board, row, col, governanceType) {
    var neighbors = getNeighborCoords(row, col, board.length);
    var index;
    var square;
    var largest = 0;

    for (index = 0; index < neighbors.length; index += 1) {
      square = board[neighbors[index].row][neighbors[index].col];
      if (square && square.governanceType === governanceType) {
        largest = Math.max(largest, square.clusterSize || 0);
      }
    }

    return largest;
  }

  function getClusterFormationNotification(previousBoard, nextBoard, row, col, governanceType) {
    var previousLandscape = recalculateBoard(previousBoard);
    var nextLandscape = recalculateBoard(nextBoard);
    var nextSquare = nextLandscape.board[row][col];
    var previousLargestAdjacent;

    if (!nextSquare || nextSquare.governanceType !== governanceType || !nextSquare.supportsClusters) {
      return null;
    }

    previousLargestAdjacent = getLargestAdjacentClusterSize(
      previousLandscape.board,
      row,
      col,
      governanceType
    );

    if (nextSquare.clusterSize >= 3 && previousLargestAdjacent < 3) {
      return {
        governanceType: governanceType,
        clusterSize: nextSquare.clusterSize,
        message: CLUSTER_NOTICES[governanceType] || "Ethical cluster forming"
      };
    }

    return null;
  }

  function countConsequenceLinkTargets(board, pieceBoard, row, col, side) {
    var count = 0;
    var targetRow;
    var targetCol;
    var occupant;
    var squareState;

    for (targetRow = 0; targetRow < board.length; targetRow += 1) {
      for (targetCol = 0; targetCol < board[targetRow].length; targetCol += 1) {
        if (targetRow === row && targetCol === col) {
          continue;
        }

        squareState = board[targetRow][targetCol];
        if (!hasConsequenceTile(squareState)) {
          continue;
        }

        if (!isSquareEnterable(squareState, side)) {
          continue;
        }

        occupant = pieceBoard && pieceBoard[targetRow] ? pieceBoard[targetRow][targetCol] : null;

        if (occupant && occupant.side === side) {
          continue;
        }

        count += 1;
      }
    }

    return count;
  }

  function countRestorablePieces(ethicalBoard, pieceBoard, capturedPool) {
    var count = 0;
    var index;
    var piece;
    var squareState;

    if (!capturedPool || !capturedPool.length) {
      return 0;
    }

    for (index = capturedPool.length - 1; index >= 0; index -= 1) {
      piece = capturedPool[index];
      if (!piece || typeof piece.originRow !== "number" || typeof piece.originCol !== "number") {
        continue;
      }

      if (pieceBoard[piece.originRow][piece.originCol]) {
        continue;
      }

      squareState = ethicalBoard[piece.originRow][piece.originCol];
      if (!isSquareEnterable(squareState, piece.side)) {
        continue;
      }

      count += 1;
    }

    return count;
  }

  function getIndustrialWastelandCoords(row, col, size) {
    return [{ row: row, col: col }];
  }

  function countWastelandCasualties(pieceBoard, coords, chooserSide) {
    var seen = Object.create(null);
    var allyValue = 0;
    var enemyValue = 0;

    coords.forEach(function (coord) {
      var piece = pieceBoard && pieceBoard[coord.row] ? pieceBoard[coord.row][coord.col] : null;
      var unitValue;

      if (!piece || seen[piece.id]) {
        return;
      }

      seen[piece.id] = true;
      unitValue = ns.data.getUnit(piece.type).value || 1;

      if (piece.side === chooserSide) {
        allyValue += unitValue;
      } else {
        enemyValue += unitValue;
      }
    });

    return {
      allyValue: allyValue,
      enemyValue: enemyValue
    };
  }

  function collectWastelandCluster(board, row, col, seen) {
    var startSquare = board && board[row] ? board[row][col] : null;
    var queue;
    var cluster = [];
    var current;
    var neighbors;
    var index;
    var nextCoord;
    var nextSquare;
    var key;

    if (!isIndustrialWasteland(startSquare)) {
      return cluster;
    }

    key = row + ":" + col;
    if (seen[key]) {
      return cluster;
    }

    seen[key] = true;
    queue = [{ row: row, col: col }];

    while (queue.length) {
      current = queue.shift();
      cluster.push(current);
      neighbors = getNeighborCoords(current.row, current.col, board.length);

      for (index = 0; index < neighbors.length; index += 1) {
        nextCoord = neighbors[index];
        nextSquare = board[nextCoord.row][nextCoord.col];
        key = nextCoord.row + ":" + nextCoord.col;

        if (!isIndustrialWasteland(nextSquare) || seen[key]) {
          continue;
        }

        seen[key] = true;
        queue.push({ row: nextCoord.row, col: nextCoord.col });
      }
    }

    return cluster;
  }

  function getWastelandClusters(board) {
    var clusters = [];
    var seen = Object.create(null);
    var row;
    var col;
    var cluster;

    if (!board || !board.length) {
      return clusters;
    }

    for (row = 0; row < board.length; row += 1) {
      for (col = 0; col < board[row].length; col += 1) {
        cluster = collectWastelandCluster(board, row, col, seen);
        if (cluster.length) {
          clusters.push(cluster);
        }
      }
    }

    return clusters;
  }

  function getWastelandClusterAt(board, row, col) {
    return collectWastelandCluster(board, row, col, Object.create(null));
  }

  function getWastelandFrontierCoords(board, clusterSquares) {
    var frontier = [];
    var seen = Object.create(null);

    (clusterSquares || []).forEach(function (coord) {
      getNeighborCoords(coord.row, coord.col, board.length).forEach(function (neighbor) {
        var square = board[neighbor.row][neighbor.col];
        var key;

        if (isIndustrialWasteland(square)) {
          return;
        }

        key = neighbor.row + ":" + neighbor.col;
        if (seen[key]) {
          return;
        }

        seen[key] = true;
        frontier.push({ row: neighbor.row, col: neighbor.col });
      });
    });

    return frontier;
  }

  function expandIndustrialWasteland(board) {
    var nextBoard;
    var growthSquares = [];
    var clusters;

    if (!board || !board.length) {
      return null;
    }

    nextBoard = cloneBoard(board);
    clusters = getWastelandClusters(board);

    clusters.forEach(function (cluster) {
      var frontier = getWastelandFrontierCoords(nextBoard, cluster);
      var growthSquare;

      if (!frontier.length) {
        return;
      }

      growthSquare = frontier[Math.floor(Math.random() * frontier.length)];
      nextBoard[growthSquare.row][growthSquare.col] = applyDecision(
        nextBoard[growthSquare.row][growthSquare.col],
        "wasteland",
        {
          row: growthSquare.row,
          col: growthSquare.col,
          squareLabel: boardToCoord(growthSquare.row, growthSquare.col),
          winnerSide: null,
          winnerPieceId: null,
          winnerPieceType: null
        },
        {
          hazardProjects: false,
          hazardOriginRow: null,
          hazardOriginCol: null,
          decisionWinnerSide: null
        }
      );
      growthSquares.push({ row: growthSquare.row, col: growthSquare.col });
    });

    return {
      board: nextBoard,
      growthSquares: growthSquares
    };
  }

  function chooseAutoDecision(board, row, col, chooserSide, availableChoices, pieceBoard, pieceSide, capturedPieces) {
    var choices = (availableChoices || [])
      .map(function (choice) {
        return typeof choice === "string" ? getChoice(choice) : cloneChoice(choice);
      })
      .filter(Boolean);
    var preferredGovernance = getPreferredGovernanceForSide(chooserSide);
    var bestChoice = null;
    var bestScore = -Infinity;

    if (!choices.length) {
      return null;
    }

    if (choices.length === 1) {
      return choices[0].id;
    }

    choices.forEach(function (choice, index) {
      var candidateBoard = cloneBoard(board);
      var boardResult;
      var landscape;
      var candidateSquare;
      var score;

      boardResult = applyDecisionToBoard(candidateBoard, row, col, choice.id, {
        row: row,
        col: col,
        winnerSide: chooserSide
      });
      if (!boardResult) {
        return;
      }
      landscape = recalculateBoard(boardResult.board);
      candidateSquare = landscape.board[row][col];

      if (choice.id === "commons") {
        score = countConsequenceLinkTargets(landscape.board, pieceBoard, row, col, pieceSide) * 4 - index * 0.01;
      } else if (choice.id === "archive") {
        score = 2.5 - index * 0.01;
      } else if (choice.id === "preservation") {
        score =
          countRestorablePieces(
            landscape.board,
            pieceBoard,
            capturedPieces && pieceSide ? capturedPieces[pieceSide] : null
          ) * 4 - index * 0.01;
      } else if (choice.id === "virus") {
        score = 2.5 - index * 0.01;
      } else if (choice.id === "wasteland") {
        (function () {
          var casualties = countWastelandCasualties(pieceBoard, boardResult.affectedSquares, chooserSide);
          var wastelandCluster = getWastelandClusterAt(landscape.board, row, col);
          var frontier = getWastelandFrontierCoords(landscape.board, wastelandCluster);
          var frontierPressure = countWastelandCasualties(pieceBoard, frontier, chooserSide);

          score =
            casualties.enemyValue * 8 -
            casualties.allyValue * 6 +
            frontierPressure.enemyValue * 2 -
            frontierPressure.allyValue * 1.5 +
            frontier.length * 0.5 -
            index * 0.01;
        })();
      } else {
        score =
          candidateSquare.sameTypeNeighbors * 4 +
          candidateSquare.clusterSize * 2 +
          (choice.governanceType === preferredGovernance ? 3 : 0) -
          index * 0.01;
      }

      if (score > bestScore) {
        bestScore = score;
        bestChoice = choice;
      }
    });

    return bestChoice ? bestChoice.id : preferredGovernance;
  }

  function applyDecisionState(squareState, choice, context, overrides) {
    var nextState;
    var stateOverrides = overrides || {};

    nextState = squareState ? cloneSquareState(squareState) : createSquareState();
    nextState.governanceType = choice.governanceType;
    nextState.doctrine = choice.doctrine;
    nextState.influenceStrength = choice.influenceStrength;
    nextState.movementProfile = choice.movementProfile || null;
    nextState.movementBonus = choice.movementBonus || null;
    nextState.commandEffect = choice.commandEffect || null;
    nextState.hazardEffect =
      Object.prototype.hasOwnProperty.call(stateOverrides, "hazardEffect")
        ? stateOverrides.hazardEffect
        : choice.hazardEffect || null;
    nextState.hazardRadius =
      Object.prototype.hasOwnProperty.call(stateOverrides, "hazardRadius")
        ? stateOverrides.hazardRadius
        : choice.hazardRadius || 0;
    nextState.hazardProjects =
      Object.prototype.hasOwnProperty.call(stateOverrides, "hazardProjects")
        ? stateOverrides.hazardProjects === true
        : choice.hazardProjects === true;
    nextState.hazardOriginRow =
      Object.prototype.hasOwnProperty.call(stateOverrides, "hazardOriginRow")
        ? stateOverrides.hazardOriginRow
        : null;
    nextState.hazardOriginCol =
      Object.prototype.hasOwnProperty.call(stateOverrides, "hazardOriginCol")
        ? stateOverrides.hazardOriginCol
        : null;
    nextState.supportsClusters = choice.supportsClusters !== false;
    nextState.decisionSetId = choice.decisionSetId || ETHICAL_CODEX_SET_ID;
    nextState.pairLabel = choice.pairLabel || ETHICAL_CODEX_LABEL;
    nextState.clusterId = null;
    nextState.clusterSize = 0;
    nextState.sameTypeNeighbors = 0;
    nextState.lastEthicalDecision = {
      choiceId: choice.id,
      choiceLabel: choice.label,
      governanceType: choice.governanceType,
      doctrine: choice.doctrine,
      influenceStrength: choice.influenceStrength,
      movementProfile: choice.movementProfile || null,
      movementBonus: choice.movementBonus || null,
      commandEffect: choice.commandEffect || null,
      hazardEffect: nextState.hazardEffect,
      hazardRadius: nextState.hazardRadius,
      hazardProjects: nextState.hazardProjects,
      hazardOriginRow: nextState.hazardOriginRow,
      hazardOriginCol: nextState.hazardOriginCol,
      supportsClusters: choice.supportsClusters !== false,
      decisionSetId: choice.decisionSetId || ETHICAL_CODEX_SET_ID,
      pairLabel: choice.pairLabel || ETHICAL_CODEX_LABEL,
      square: context && context.squareLabel ? context.squareLabel : "",
      row: context && typeof context.row === "number" ? context.row : null,
      col: context && typeof context.col === "number" ? context.col : null,
      winnerSide:
        Object.prototype.hasOwnProperty.call(stateOverrides, "decisionWinnerSide")
          ? stateOverrides.decisionWinnerSide
          : context && context.winnerSide
            ? context.winnerSide
            : null,
      winnerPieceId: context && context.winnerPieceId ? context.winnerPieceId : null,
      winnerPieceType: context && context.winnerPieceType ? context.winnerPieceType : null,
      madeAt: Date.now()
    };

    return nextState;
  }

  function applyDecision(squareState, choiceId, context, overrides) {
    var choice = getChoice(choiceId);

    if (!choice) {
      return null;
    }

    return applyDecisionState(squareState, choice, context, overrides);
  }

  function applyDecisionToBoard(board, row, col, choiceId, context) {
    var choice = getChoice(choiceId);
    var nextBoard;
    var affectedSquares;

    if (!choice || !board || !board[row] || !board[row][col]) {
      return null;
    }

    nextBoard = cloneBoard(board);
    affectedSquares =
      choice.hazardEffect === "industrial-wasteland"
        ? getIndustrialWastelandCoords(row, col, nextBoard.length).map(function (coord, index) {
            return {
              row: coord.row,
              col: coord.col,
              isOrigin: index === 0
            };
          })
        : [{ row: row, col: col, isOrigin: true }];

    affectedSquares.forEach(function (coord) {
      nextBoard[coord.row][coord.col] = applyDecision(
        nextBoard[coord.row][coord.col],
        choiceId,
        {
          row: coord.row,
          col: coord.col,
          squareLabel: boardToCoord(coord.row, coord.col),
          winnerSide: context && context.winnerSide ? context.winnerSide : null,
          winnerPieceId: context && context.winnerPieceId ? context.winnerPieceId : null,
          winnerPieceType: context && context.winnerPieceType ? context.winnerPieceType : null
        },
        {
          hazardProjects: coord.isOrigin && choice.hazardEffect === "industrial-wasteland",
          hazardOriginRow: choice.hazardEffect === "industrial-wasteland" ? row : null,
          hazardOriginCol: choice.hazardEffect === "industrial-wasteland" ? col : null,
          decisionWinnerSide: coord.isOrigin ? (context && context.winnerSide ? context.winnerSide : null) : null
        }
      );
    });

    return {
      board: nextBoard,
      choice: choice,
      affectedSquares: affectedSquares
    };
  }

  ns.ethics.createSquareState = createSquareState;
  ns.ethics.createBoard = createBoard;
  ns.ethics.createCodexState = createCodexState;
  ns.ethics.cloneBoard = cloneBoard;
  ns.ethics.drawCodexChoices = drawCodexChoices;
  ns.ethics.discardCodexChoices = discardCodexChoices;
  ns.ethics.getEthicalCodexMetadata = getEthicalCodexMetadata;
  ns.ethics.getChoice = getChoice;
  ns.ethics.getClusterFormationNotification = getClusterFormationNotification;
  ns.ethics.getRecoveryEffect = getRecoveryEffect;
  ns.ethics.getBattleEffects = getBattleEffects;
  ns.ethics.getGovernanceLabel = getGovernanceLabel;
  ns.ethics.getGovernanceVisual = getGovernanceVisual;
  ns.ethics.getRuleSummary = getRuleSummary;
  ns.ethics.getGovernanceSide = getGovernanceSide;
  ns.ethics.hasConsequenceTile = hasConsequenceTile;
  ns.ethics.isIndustrialWasteland = isIndustrialWasteland;
  ns.ethics.getNeighborCoords = getNeighborCoords;
  ns.ethics.getOriginMovementProfile = getOriginMovementProfile;
  ns.ethics.getOriginMovementBonus = getOriginMovementBonus;
  ns.ethics.getCommandEffect = getCommandEffect;
  ns.ethics.getPatternedMoves = getPatternedMoves;
  ns.ethics.getAllPatternedMovesForSide = getAllPatternedMovesForSide;
  ns.ethics.isSquareEnterable = isSquareEnterable;
  ns.ethics.isCaptureAllowed = isCaptureAllowed;
  ns.ethics.isMoveAllowed = isMoveAllowed;
  ns.ethics.chooseAutoDecision = chooseAutoDecision;
  ns.ethics.recalculateBoard = recalculateBoard;
  ns.ethics.applyDecision = applyDecision;
  ns.ethics.applyDecisionToBoard = applyDecisionToBoard;
  ns.ethics.expandIndustrialWasteland = expandIndustrialWasteland;
})(window.ArchonEngine);
