(function (ns) {
  function roundValue(value) {
    return Math.max(0, Math.ceil(value));
  }

  function hexToRgba(hex, alpha) {
    var normalized = hex.replace("#", "");
    var bigint = parseInt(normalized, 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;

    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  }

  function accentStyle(design) {
    return (
      "--piece-accent:" +
      design.accentColor +
      ";--piece-accent-soft:" +
      hexToRgba(design.accentColor, 0.16) +
      ";--piece-accent-glow:" +
      hexToRgba(design.accentColor, 0.3) +
      ";"
    );
  }

  function consequenceAccentStyle(squareState) {
    var visual = ns.ethics.getGovernanceVisual(squareState ? squareState.governanceType : "neutral");
    return accentStyle({
      accentColor: visual.accentColor || "#f4eddb"
    });
  }

  function toPx(value) {
    return String(Math.round(value * 100) / 100) + "px";
  }

  function parsePixels(value) {
    return Number(String(value || "").replace("px", "")) || 0;
  }

  function getBoardMoveAudioConfig(piece) {
    var design = piece ? ns.data.getPieceDesign(piece) : null;
    return design && design.boardMoveAudio ? design.boardMoveAudio : null;
  }

  function resetAudio(audio) {
    if (!audio) {
      return;
    }

    audio.setAttribute("data-archon-play-state", "idle");
    audio.setAttribute("data-archon-play-error", "");
    audio.loop = false;
    audio.pause();

    try {
      audio.currentTime = 0;
    } catch (error) {}
  }

  function playAudio(audio, options) {
    var errorName = "PlaybackError";
    var playPromise;
    var settings = options || {};

    if (!audio) {
      return;
    }

    if (settings.reset !== false) {
      resetAudio(audio);
    } else {
      audio.setAttribute("data-archon-play-state", "idle");
      audio.setAttribute("data-archon-play-error", "");
    }
    audio.loop = Boolean(settings.loop);
    if (typeof settings.volume === "number") {
      audio.volume = Math.max(0, Math.min(1, settings.volume));
    }
    audio.setAttribute("data-archon-play-state", "pending");

    try {
      playPromise = audio.play();
    } catch (error) {
      if (error && error.name) {
        errorName = error.name;
      }
      audio.setAttribute("data-archon-play-state", "failed");
      audio.setAttribute("data-archon-play-error", errorName);
      return;
    }

    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(
        function () {
          audio.setAttribute("data-archon-play-state", "playing");
        },
        function (error) {
          if (error && error.name) {
            errorName = error.name;
          }
          audio.setAttribute("data-archon-play-state", "failed");
          audio.setAttribute("data-archon-play-error", errorName);
        }
      );
    } else {
      audio.setAttribute("data-archon-play-state", "playing");
    }
  }

  function getBoardSpritePose(sprite, poseName) {
    var pose = sprite[poseName] || sprite.idle;
    var frames = pose.frames || 4;
    var fps = pose.fps || 4;

    return {
      row: pose.row || 0,
      frames: frames,
      duration: Math.round((frames / fps) * 1000)
    };
  }

  function getMaxBoardSpriteHeight() {
    var maxHeight = 0;

    ns.data.PIECE_ORDER.forEach(function (type) {
      ["light", "dark"].forEach(function (side) {
        var design = ns.data.getPieceDesign(side, type);
        var sprite = design && design.boardSprite;

        if (sprite) {
          maxHeight = Math.max(maxHeight, sprite.frameHeight * (sprite.scale || 1));
        }
      });
    });

    return maxHeight || 84;
  }

  function boardSpriteStyle(sprite, poseName, shouldAnimate) {
    var pose = getBoardSpritePose(sprite, poseName);
    var scale = sprite.scale || 1;
    var displayWidth = sprite.frameWidth * scale;
    var displayHeight = sprite.frameHeight * scale;
    var travelX = shouldAnimate ? -(pose.frames * displayWidth) : 0;

    return (
      "--sprite-sheet-width:" +
      toPx(sprite.sheetWidth * scale) +
      ";--sprite-sheet-height:" +
      toPx(sprite.sheetHeight * scale) +
      ";--sprite-display-width:" +
      toPx(displayWidth) +
      ";--sprite-display-height:" +
      toPx(displayHeight) +
      ";--sprite-offset-x:" +
      toPx(0) +
      ";--sprite-offset-y:" +
      toPx(-(pose.row * displayHeight)) +
      ";--sprite-travel-x:" +
      toPx(travelX) +
      ";--sprite-duration:" +
      pose.duration +
      "ms;--sprite-frames:" +
      pose.frames +
      ";"
    );
  }

  function renderBoardSprite(piece, poseName, extraClass, shouldAnimate) {
    var design = ns.data.getPieceDesign(piece);
    var faction = ns.data.getFaction(piece.side);
    var classes = ["piece-actor", "piece-actor--" + faction.key];
    var spriteClasses = ["piece-sprite-sheet"];
    var imageMarkup;

    if (extraClass) {
      classes.push(extraClass);
    }

    if (shouldAnimate) {
      spriteClasses.push("piece-sprite-sheet--animated");
    }

    if (!shouldAnimate && design.boardSprite.idleSrc) {
      imageMarkup =
        '<img class="piece-idle-image" src="' +
        design.boardSprite.idleSrc +
        '" alt="" aria-hidden="true" loading="eager" decoding="async" fetchpriority="low" />';
    } else {
      imageMarkup =
        '<img class="' +
        spriteClasses.join(" ") +
        '" src="' +
        design.boardSprite.src +
        '" alt="" aria-hidden="true" loading="eager" decoding="async" />';
    }

    return (
      '<div class="' +
      classes.join(" ") +
      '" style="' +
      accentStyle(design) +
      boardSpriteStyle(design.boardSprite, poseName, shouldAnimate) +
      '">' +
      '<span class="piece-actor__shadow"></span>' +
      '<span class="piece-sprite-window">' +
      imageMarkup +
      "</span>" +
      "</div>"
    );
  }

  var ACTIVATION_FRAME_INTERVAL_MS = 100;
  var ACTIVATION_SEQUENCE_CONFIGS = {
    human: {
      frameSrcs: [
        "assets/ui/archon/human-activation/human_activation_01.webp",
        "assets/ui/archon/human-activation/human_activation_02.webp",
        "assets/ui/archon/human-activation/human_activation_03.webp",
        "assets/ui/archon/human-activation/human_activation_04.webp",
        "assets/ui/archon/human-activation/human_activation_05.webp",
        "assets/ui/archon/human-activation/human_activation_06.webp",
        "assets/ui/archon/human-activation/human_activation_07.webp",
        "assets/ui/archon/human-activation/human_activation_08.webp",
        "assets/ui/archon/human-activation/human_activation_09.webp",
        "assets/ui/archon/human-activation/human_activation_10.webp",
        "assets/ui/archon/human-activation/human_activation_11.webp",
        "assets/ui/archon/human-activation/human_activation_12.webp"
      ],
      fallbackSrc: "assets/ui/archon/human-side.webp",
      needsChromaKey: false
    },
    ai: {
      frameSrcs: [
        "assets/ui/archon/ai-activation/ai_activation_greenscreen_01.webp",
        "assets/ui/archon/ai-activation/ai_activation_greenscreen_02.webp",
        "assets/ui/archon/ai-activation/ai_activation_greenscreen_03.webp",
        "assets/ui/archon/ai-activation/ai_activation_greenscreen_04.webp",
        "assets/ui/archon/ai-activation/ai_activation_greenscreen_05.webp",
        "assets/ui/archon/ai-activation/ai_activation_greenscreen_06.webp",
        "assets/ui/archon/ai-activation/ai_activation_greenscreen_07.webp",
        "assets/ui/archon/ai-activation/ai_activation_greenscreen_08.webp",
        "assets/ui/archon/ai-activation/ai_activation_greenscreen_09.webp",
        "assets/ui/archon/ai-activation/ai_activation_greenscreen_10.webp",
        "assets/ui/archon/ai-activation/ai_activation_greenscreen_11.webp",
        "assets/ui/archon/ai-activation/ai_activation_greenscreen_12.webp"
      ],
      fallbackSrc: "assets/ui/archon/consensus-ai-side-alpha.webp",
      needsChromaKey: true
    }
  };
  var activationFrameCache = {
    human: ACTIVATION_SEQUENCE_CONFIGS.human.frameSrcs.slice(),
    ai: null
  };
  var activationFrameLoaders = {};

  function emptyCard(eyebrow, title, message) {
    return (
      '<div class="placeholder-card">' +
      '<p class="card-eyebrow">' +
      eyebrow +
      "</p>" +
      "<h3>" +
      title +
      "</h3>" +
      "<p>" +
      message +
      "</p>" +
      "</div>"
    );
  }

  function renderRemnantCommandCard(options) {
    var settings = options || {};
    var iconMarkup = settings.activationSequence === "human"
      ? renderActivationSeal("human", "activation-seal--command-card")
      : '<img class="placeholder-card__icon" src="assets/ui/archon/human-side.webp" alt="Remnant command icon" loading="eager" decoding="async" />';

    return (
      '<article class="placeholder-card placeholder-card--remnant-command">' +
      iconMarkup +
      "<h3>Remnant Command</h3>" +
      "<p>Click any Human piece on the board to inspect its movement, stats, and combat role.</p>" +
      "</article>"
    );
  }

  function renderConsensusIntelCard(options) {
    var settings = options || {};
    var iconMarkup = settings.activationSequence === "ai"
      ? renderActivationSeal("ai", "activation-seal--command-card")
      : '<img class="placeholder-card__icon" src="assets/ui/archon/consensus-ai-side-alpha.webp" alt="Consensus intel icon" loading="eager" decoding="async" />';

    return (
      '<article class="placeholder-card placeholder-card--consensus-intel">' +
      iconMarkup +
      "<h3>Consensus Intel</h3>" +
      "<p>Click any AI piece on the board to inspect its movement, stats, and combat role.</p>" +
      "</article>"
    );
  }

  function renderPortrait(design, className) {
    var frameClass = design.imageSrc ? "portrait--art" : design.silhouetteClass;
    var content = design.imageSrc
      ? '<img class="piece-art" src="' +
        design.imageSrc +
        '" alt="' +
        design.displayName +
        ' concept art" loading="lazy" />'
      : design.emblemSvg;

    return (
      '<div class="' +
      className +
      " " +
      frameClass +
      '">' +
      content +
      "</div>"
    );
  }

  function renderPortraitShell(contentMarkup, extraClass) {
    return (
      '<div class="unit-panel__portrait-shell' +
      (extraClass ? " " + extraClass : "") +
      '">' +
      '<span class="unit-panel__portrait-frame" aria-hidden="true"></span>' +
      contentMarkup +
      "</div>"
    );
  }

  function getConsequenceLabel(squareState) {
    if (!squareState) {
      return "Consequence Tile";
    }

    if (squareState.lastEthicalDecision && squareState.lastEthicalDecision.choiceLabel) {
      return squareState.lastEthicalDecision.choiceLabel;
    }

    return ns.ethics.getGovernanceLabel(squareState.governanceType);
  }

  function getConsequencePairLabel(squareState) {
    if (!squareState) {
      return "";
    }

    if (squareState.lastEthicalDecision && squareState.lastEthicalDecision.pairLabel) {
      return squareState.lastEthicalDecision.pairLabel;
    }

    return squareState.pairLabel || "";
  }

  function renderConsequencePortrait(squareState, className) {
    var label = getConsequenceLabel(squareState);
    var visual = ns.ethics.getGovernanceVisual(squareState ? squareState.governanceType : "neutral");

    return (
      '<div class="' +
      className +
      ' portrait--art">' +
      '<img class="piece-art" src="' +
      visual.artSrc +
      '" alt="' +
      label +
      ' consequence tile artwork" loading="lazy" decoding="async" />' +
      "</div>"
    );
  }

  function renderConsequenceInset(squareState, squareLabel) {
    if (!ns.ethics.hasConsequenceTile(squareState)) {
      return "";
    }

    return (
      '<div class="consequence-inset consequence-inset--' +
      squareState.governanceType +
      '" style="' +
      consequenceAccentStyle(squareState) +
      '">' +
      renderConsequencePortrait(squareState, "consequence-inset__portrait") +
      '<div class="consequence-inset__copy">' +
      '<span class="card-eyebrow">Territory Tile</span>' +
      "<strong>" +
      getConsequenceLabel(squareState) +
      (squareLabel ? " at " + squareLabel : "") +
      "</strong>" +
      '<span class="consequence-inset__rule">' +
      ns.ethics.getRuleSummary(squareState) +
      "</span>" +
      "</div>" +
      "</div>"
    );
  }

  function renderStatCells(stats) {
    return (
      '<div class="stat-strip">' +
      renderStatCell("HP", stats.hp) +
      renderStatCell("ATK", stats.attack) +
      renderStatCell("SPD", stats.speed) +
      "</div>"
    );
  }

  function renderStatCell(label, value) {
    return (
      '<div class="stat-cell">' +
      "<strong>" +
      label +
      "</strong>" +
      "<span>" +
      value +
      "</span>" +
      "</div>"
    );
  }

  function renderPieceChip(piece) {
    var design = ns.data.getPieceDesign(piece);
    var faction = ns.data.getFaction(piece.side);
    var compactCopy = Boolean(design.imageSrc);

    if (design.boardSprite) {
      return renderBoardSprite(piece, "idle", "piece-actor--idle", false);
    }

    if (compactCopy) {
      return (
        '<div class="piece-card piece-card--' +
        faction.key +
        ' piece-card--art" style="' +
        accentStyle(design) +
        '">' +
        renderPortrait(design, "piece-card__portrait") +
        "</div>"
      );
    }

    return (
      '<div class="piece-card piece-card--' +
      faction.key +
      '" style="' +
      accentStyle(design) +
      '">' +
      renderPortrait(design, "piece-card__portrait") +
      '<div class="piece-card__copy">' +
      '<span class="piece-card__name">' +
      design.displayName +
      "</span>" +
      (compactCopy
        ? ""
        : '<span class="piece-card__role">' +
          design.roleLabel +
          "</span>") +
      "</div>" +
      "</div>"
    );
  }

  function getActivationInitialSrc(sequenceKey) {
    var frames = activationFrameCache[sequenceKey];
    var config = ACTIVATION_SEQUENCE_CONFIGS[sequenceKey];

    if (frames && frames.length) {
      return frames[0];
    }

    return config ? config.fallbackSrc : "";
  }

  function renderActivationSeal(sequenceKey, extraClass) {
    return (
      '<span class="activation-seal activation-seal--' +
      sequenceKey +
      (extraClass ? " " + extraClass : "") +
      '" aria-hidden="true">' +
      '<img class="activation-seal__image" src="' +
      getActivationInitialSrc(sequenceKey) +
      '" alt="" loading="eager" decoding="async" data-activation-sequence="' +
      sequenceKey +
      '" />' +
      "</span>"
    );
  }

  function renderDetailCard(piece, squareState, squareLabel, options) {
    var design = ns.data.getPieceDesign(piece);
    var faction = ns.data.getFaction(piece.side);
    var unit = ns.data.getUnit(piece.type);
    var settings = options || {};
    var currentStats = {
      hp: roundValue(piece.health) + " / " + design.stats.hp,
      attack: design.stats.attack,
      speed: design.stats.speed
    };

    return (
      '<article class="unit-panel unit-panel--' +
      faction.key +
      '" style="' +
      accentStyle(design) +
      '">' +
      '<div class="unit-panel__topline">' +
      '<div class="unit-panel__identity">' +
      '<span class="unit-panel__faction">' +
      faction.label +
      "</span>" +
      (settings.activationSequence ? renderActivationSeal(settings.activationSequence) : "") +
      "</div>" +
      '<span class="unit-panel__role">' +
      design.roleLabel +
      "</span>" +
      "</div>" +
      '<div class="unit-panel__hero">' +
      renderPortraitShell(renderPortrait(design, "unit-panel__portrait")) +
      '<div class="unit-panel__copy">' +
      "<h3>" +
      design.displayName +
      "</h3>" +
      '<p class="unit-panel__subtitle">' +
      design.shortDescription +
      "</p>" +
      "</div>" +
      "</div>" +
      renderStatCells(currentStats) +
      '<div class="unit-note">' +
      "<strong>Board Move</strong>" +
      "<span>" +
      unit.movement +
      "</span>" +
      "</div>" +
      renderConsequenceInset(squareState, squareLabel) +
      "</article>"
    );
  }

  function renderCompactDetailCard(piece) {
    var design = ns.data.getPieceDesign(piece);
    var faction = ns.data.getFaction(piece.side);
    var unit = ns.data.getUnit(piece.type);
    var currentStats = {
      hp: roundValue(piece.health) + " / " + design.stats.hp,
      attack: design.stats.attack,
      speed: design.stats.speed
    };

    return (
      '<article class="unit-panel unit-panel--compact unit-panel--' +
      faction.key +
      '" style="' +
      accentStyle(design) +
      '">' +
      '<div class="unit-panel__topline">' +
      '<span class="unit-panel__faction">' +
      faction.label +
      "</span>" +
      '<span class="unit-panel__role">' +
      design.roleLabel +
      "</span>" +
      "</div>" +
      '<div class="unit-panel__copy unit-panel__copy--compact">' +
      "<h3>" +
      design.displayName +
      "</h3>" +
      '<p class="unit-panel__subtitle">' +
      design.shortDescription +
      "</p>" +
      "</div>" +
      renderStatCells(currentStats) +
      '<div class="unit-note">' +
      "<strong>Board Move</strong>" +
      "<span>" +
      unit.movement +
      "</span>" +
      "</div>" +
      "</article>"
    );
  }

  function renderBattleTelemetry(state) {
    var live = state.battle.live;
    var territory = state.battle.territory;
    var territoryMarkup = "";

    if (territory) {
        territoryMarkup =
        '<div class="unit-note">' +
        "<strong>Territory</strong>" +
        "<span>" +
        territory.squareLabel +
        " is " +
        territory.governanceLabel +
        " influence " +
        territory.influenceStrength +
        " with cluster " +
        territory.clusterSize +
        ".</span>" +
        "</div>" +
        '<div class="unit-note">' +
        "<strong>Rule</strong>" +
        "<span>" +
        territory.ruleSummary +
        "</span>" +
        "</div>" +
        '<div class="unit-note">' +
        "<strong>Remnant Edge</strong>" +
        "<span>" +
        territory.playerSummary +
        "</span>" +
        "</div>" +
        '<div class="unit-note">' +
        "<strong>Consensus Edge</strong>" +
        "<span>" +
        territory.enemySummary +
        "</span>" +
        "</div>" +
        '<div class="unit-note">' +
        "<strong>Field Effect</strong>" +
        "<span>" +
        territory.fieldSummary +
        "</span>" +
        "</div>";
    }

    return (
      '<article class="telemetry-card">' +
      '<p class="card-eyebrow">Duel Feed</p>' +
      "<h3>Arena Telemetry</h3>" +
      "<p>" +
      live.playerName +
      " is contesting the square against " +
      live.enemyName +
      ".</p>" +
      '<div class="stat-strip">' +
      renderStatCell("REM", live.playerHealth + " / " + live.playerMaxHealth) +
      renderStatCell("CON", live.enemyHealth + " / " + live.enemyMaxHealth) +
      renderStatCell("TIME", live.elapsed.toFixed(1) + "s") +
      "</div>" +
      '<div class="unit-note">' +
      "<strong>Hazard</strong>" +
      "<span>" +
      (live.overchargeActive ? "Arena overcharge active." : "Arena stable.") +
      "</span>" +
      "</div>" +
      territoryMarkup +
      "</article>"
    );
  }

  function renderEthicalTelemetry(state) {
    var pending = state.pendingEthicalDecision;
    var isComputerDecision = pending.controlledBy === "computer";
    var selectedChoice = pending.revealedChoiceId ? ns.ethics.getChoice(pending.revealedChoiceId) : null;
    var summaryTail = isComputerDecision
      ? selectedChoice
        ? ns.data.getSideLabel(pending.winnerSide) + " locked in " + selectedChoice.label + "."
        : "Click the CONSENSUS ICON to reveal their choice."
      : pending.humanPromptText;
    var summaryText =
      pending.squareLabel +
      " was " +
      pending.outcomeVerb +
      " by " +
      ns.data.getSideLabel(pending.winnerSide) +
      ". " +
      summaryTail;
    var statusLabel = isComputerDecision ? (selectedChoice ? "Revealed" : "Awaiting Icon") : "Awaiting";

    return (
      '<article class="telemetry-card">' +
      '<p class="card-eyebrow">Ethical Codex</p>' +
      "<h3>Battle Reward</h3>" +
      "<p>" +
      summaryText +
      "</p>" +
      '<div class="stat-strip">' +
      renderStatCell("SQUARE", pending.squareLabel) +
      renderStatCell("DRAW", (pending.drawCount || pending.choices.length || 0) + " Tiles") +
      renderStatCell("STATUS", statusLabel) +
      "</div>" +
      '<div class="unit-note">' +
      "<strong>Protocol</strong>" +
      "<span>" +
      (pending.telemetryNote || "A battle consequence is being written onto the square.") +
      "</span>" +
      "</div>" +
      "</article>"
    );
  }

  function renderEthicalMarker(isPending) {
    if (!isPending) {
      return "";
    }

    return (
      '<span class="ethical-sigil ethical-sigil--pending">' +
      '<span class="ethical-sigil__pending"></span>' +
      "</span>"
    );
  }

  function renderFactionCrest(side) {
    var faction = ns.data.getFaction(side);
    var medallionSrc =
      side === "light"
        ? "assets/ui/archon/remnant-medallion.webp"
        : "assets/ui/archon/consensus-medallion.webp";

    return (
      '<div class="faction-crest faction-crest--' +
      faction.key +
      '">' +
      '<img class="faction-crest__medallion" src="' +
      medallionSrc +
      '" alt="" aria-hidden="true" loading="eager" decoding="async" />' +
      "</div>"
    );
  }

  function countFactionMetrics(state, side) {
    var territories = 0;
    var influence = 0;
    var ethicalNodes = 0;
    var row;
    var col;
    var piece;
    var squareState;
    var governanceSide;
    var winningSide;

    for (row = 0; row < 8; row += 1) {
      for (col = 0; col < 8; col += 1) {
        piece = state.board[row][col];
        squareState = state.ethicalBoard[row][col];

        if (piece && piece.side === side) {
          territories += 1;
        }

        if (!ns.ethics.hasConsequenceTile(squareState)) {
          continue;
        }

        governanceSide = ns.ethics.getGovernanceSide(squareState.governanceType);
        winningSide = squareState.lastEthicalDecision ? squareState.lastEthicalDecision.winnerSide : null;

        if (governanceSide === side) {
          influence += squareState.influenceStrength || 0;
        }

        if (governanceSide === side || winningSide === side) {
          ethicalNodes += 1;
          territories += 1;
        }
      }
    }

    return {
      territories: territories,
      influence: influence,
      ethicalNodes: ethicalNodes,
      reserves: state.capturedPieces && state.capturedPieces[side] ? state.capturedPieces[side].length : 0
    };
  }

  function getPhaseCopy(state) {
    if (state.winner) {
      return "Campaign Resolved";
    }

    if (state.mode === "battle") {
      return "Arena Lock";
    }

    if (state.mode === "ethics") {
      return "Consequence Draft";
    }

    return state.currentTurn === "light" ? "Deployment" : "Machine Response";
  }

  function getEraCopy(state) {
    if (state.winner) {
      return {
        title: ns.data.getSideLabel(state.winner) + " Ascendant",
        summary: state.lastResult
      };
    }

    if (state.mode === "battle" && state.battle) {
      return {
        title: "Arena Lock: " + state.battle.title,
        summary: "A contested square has shifted into a live duel. Hold the arena to secure the board."
      };
    }

    if (state.mode === "ethics" && state.pendingEthicalDecision) {
      return {
        title: "Ethical Consequence Pending",
        summary:
          state.pendingEthicalDecision.squareLabel +
          " has been captured. The winning doctrine now decides what kind of territory remains behind."
      };
    }

    if (state.pendingAI && state.currentTurn === "dark") {
      return {
        title: "Epoch IV: The Convergence",
        summary: "The Consensus is calculating its next incursion across the relay board."
      };
    }

    return {
      title: "Epoch IV: The Convergence",
      summary: "Rival ideologies spread across the relay board while consequence nodes reshape movement and control."
    };
  }

  function createRenderer() {
    var boardElement = document.getElementById("board");
    var boardFrame = boardElement.parentElement;
    var boardIntro = document.getElementById("boardIntro");
    var boardIntroSeal = document.getElementById("boardIntroSeal");
    var newGameButton = document.getElementById("newGameButton");
    var modeValue = document.getElementById("modeValue");
    var turnValue = document.getElementById("turnValue");
    var selectedValue = document.getElementById("selectedValue");
    var healthValue = document.getElementById("healthValue");
    var resultValue = document.getElementById("resultValue");
    var remnantInspectorCard = document.getElementById("remnantInspectorCard");
    var consensusInspectorCard = document.getElementById("consensusInspectorCard");
    var selectedCard = document.getElementById("selectedCard");
    var statusPanel = document.querySelector(".status-panel");
    var battleOverlay = document.getElementById("battleOverlay");
    var battleShell = battleOverlay.querySelector(".battle-shell");
    var battleCopy = battleOverlay.querySelector(".battle-copy");
    var battleStage = battleOverlay.querySelector(".battle-stage");
    var battleCanvas = document.getElementById("battleCanvas");
    var battleHud = battleOverlay.querySelector(".battle-hud");
    var battleTitle = document.getElementById("battleTitle");
    var battlePrompt = document.getElementById("battlePrompt");
    var battlePlayerLabel = document.getElementById("battlePlayerLabel");
    var battleEnemyLabel = document.getElementById("battleEnemyLabel");
    var battlePlayerHealth = document.getElementById("battlePlayerHealth");
    var battleEnemyHealth = document.getElementById("battleEnemyHealth");
    var battlePlayerBar = document.getElementById("battlePlayerBar");
    var battleEnemyBar = document.getElementById("battleEnemyBar");
    var ethicalOverlay = document.getElementById("ethicalOverlay");
    var ethicalTitle = document.getElementById("ethicalTitle");
    var ethicalPrompt = document.getElementById("ethicalPrompt");
    var ethicalControls = document.getElementById("ethicalControls");
    var ethicalAdvanceButton = document.getElementById("ethicalAdvanceButton");
    var ethicalAdvanceIcon = document.getElementById("ethicalAdvanceIcon");
    var ethicalAdvanceLabel = document.getElementById("ethicalAdvanceLabel");
    var ethicalChoices = document.getElementById("ethicalChoices");
    var ethicalNotification = document.getElementById("ethicalNotification");
    var ethicalNotificationCard = document.getElementById("ethicalNotificationCard");
    var ethicalNotificationTitle = document.getElementById("ethicalNotificationTitle");
    var ethicalNotificationMessage = document.getElementById("ethicalNotificationMessage");
    var remnantCrest = document.getElementById("remnantCrest");
    var consensusCrest = document.getElementById("consensusCrest");
    var remnantTerritoriesValue = document.getElementById("remnantTerritoriesValue");
    var remnantInfluenceValue = document.getElementById("remnantInfluenceValue");
    var remnantNodesValue = document.getElementById("remnantNodesValue");
    var remnantReservesValue = document.getElementById("remnantReservesValue");
    var consensusTerritoriesValue = document.getElementById("consensusTerritoriesValue");
    var consensusInfluenceValue = document.getElementById("consensusInfluenceValue");
    var consensusNodesValue = document.getElementById("consensusNodesValue");
    var consensusReservesValue = document.getElementById("consensusReservesValue");
    var commandSideLabel = document.getElementById("commandSideLabel");
    var phaseValue = document.getElementById("phaseValue");
    var eraTitle = document.getElementById("eraTitle");
    var eraSummary = document.getElementById("eraSummary");
    var phaseNodes = Array.prototype.slice.call(document.querySelectorAll("[data-phase-node]"));
    var drawerElements = Array.prototype.slice.call(document.querySelectorAll(".hud-drawer"));
    var drawerSummaries = Array.prototype.slice.call(document.querySelectorAll(".hud-drawer__summary"));
    var onSquareClick = function () {};
    var onNewGame = function () {};
    var onEthicalDecision = function () {};
    var onEthicalAdvance = function () {};
    var currentState = null;
    var activeBoardAnimation = null;
    var activeBoardMoveAudio = null;
    var boardAnimationTimeout = 0;
    var boardIntroTimeout = 0;
    var boardIntroMusicRetryBound = false;
    var boardIntroMusicVolume = 0.55;
    var boardUnlockVolume = 1;
    var consequenceTileSelectVolume = 0.54;
    var aiEthicalAdvanceVolume = 0.21;
    var humanEthicalDecisionVolume = 1;
    var gameplayMusicLibrary = ["assets/audio/Gameplay_1.mp3", "assets/audio/Gameplay_2.mp3", "assets/audio/Gameplay_3.mp3"];
    var activeGameplayMusicTrack = "";
    var lastGameplayMusicTrack = "";
    var gameplayMusicVolume = 0.58;
    var battleMusicLibrary = ["assets/audio/BattleArena_1.mp3"];
    var activeBattleMusicTrack = "";
    var lastBattleMusicTrack = "";
    var battleMusicVolume = 0.08;
    var aiEthicalSelectionMusicVolume = 0.18;
    var humanEthicalSelectionMusicVolume = 1;
    var drawerLayoutMode = "";
    var maxBoardSpriteHeight = getMaxBoardSpriteHeight();
    var boardAnimationLayer = document.createElement("div");
    var boardIntroState = boardIntro ? "closed" : "open";
    var boardIntroDuration = 1680;
    var activationAnimationStates = {
      human: {
        timer: 0,
        frameIndex: 0
      },
      ai: {
        timer: 0,
        frameIndex: 0
      }
    };

    boardAnimationLayer.className = "board-anim-layer";
    boardFrame.appendChild(boardAnimationLayer);
    if (remnantCrest) {
      remnantCrest.innerHTML = renderFactionCrest("light");
    }

    if (consensusCrest) {
      consensusCrest.innerHTML = renderFactionCrest("dark");
    }

    function getBoardUnlockAudio() {
      return document.getElementById("boardUnlockAudio");
    }

    function getBoardIntroMusicAudio() {
      return document.getElementById("boardIntroMusicAudio");
    }

    function getConsequenceTileSelectAudio() {
      return document.getElementById("consequenceTileSelectAudio");
    }

    function getAiSelectAudio() {
      return document.getElementById("aiSelectAudio");
    }

    function getAiEthicalSelectionMusicAudio() {
      return document.getElementById("aiEthicalSelectionMusicAudio");
    }

    function getHumanSelectAudio() {
      return document.getElementById("humanSelectAudio");
    }

    function getHumanEthicalSelectionMusicAudio() {
      return document.getElementById("humanEthicalSelectionMusicAudio");
    }

    function getGameplayMusicAudio() {
      return document.getElementById("gameplayMusicAudio");
    }

    function getBattleArenaMusicAudio() {
      return document.getElementById("battleArenaMusicAudio");
    }

    function getBoardMoveAudio(piece) {
      var audioConfig = getBoardMoveAudioConfig(piece);
      return audioConfig ? document.getElementById(audioConfig.elementId) : null;
    }

    function getAudioPlayState(audio) {
      return audio ? audio.getAttribute("data-archon-play-state") || "idle" : "idle";
    }

    function playConsequenceTileInspectAudio() {
      playAudio(getConsequenceTileSelectAudio(), {
        volume: consequenceTileSelectVolume
      });
    }

    function playAiEthicalAdvanceAudio() {
      var audio = getAiSelectAudio();
      var clipDuration = 1;
      var clipStart = 1.72;

      if (!audio) {
        return;
      }

      if (typeof audio.duration === "number" && isFinite(audio.duration) && audio.duration > clipDuration) {
        clipStart = Math.max(0, audio.duration - clipDuration);
      }

      resetAudio(audio);

      try {
        audio.currentTime = clipStart;
      } catch (error) {}

      playAudio(audio, {
        volume: aiEthicalAdvanceVolume,
        reset: false
      });
    }

    function playHumanEthicalDecisionAudio() {
      playAudio(getHumanSelectAudio(), {
        volume: humanEthicalDecisionVolume
      });
    }

    function stopActivationSequence(sequenceKey) {
      var animationState = activationAnimationStates[sequenceKey];

      if (!animationState) {
        return;
      }

      if (animationState.timer) {
        window.clearInterval(animationState.timer);
        animationState.timer = 0;
      }

      animationState.frameIndex = 0;
    }

    function setActivationFrame(sequenceKey, frameIndex) {
      var frames = activationFrameCache[sequenceKey] || ACTIVATION_SEQUENCE_CONFIGS[sequenceKey].frameSrcs;
      var frameSrc = frames[frameIndex % frames.length];

      Array.prototype.forEach.call(document.querySelectorAll('[data-activation-sequence="' + sequenceKey + '"]'), function (
        image
      ) {
        image.setAttribute("src", frameSrc);
      });
    }

    function setActivationMode(sequenceKey, mode) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-activation-sequence="' + sequenceKey + '"]'), function (
        image
      ) {
        var seal = image.closest(".activation-seal");

        if (seal) {
          seal.setAttribute("data-activation-mode", mode);
        }
      });
    }

    function loadAiActivationFrame(frameSrc) {
      return new Promise(function (resolve) {
        var image = new Image();

        image.decoding = "async";
        image.onload = function () {
          var canvas = document.createElement("canvas");
          var context;
          var imageData;
          var data;
          var index;
          var r;
          var g;
          var b;
          var a;
          var dominance;
          var fade;

          if (window.location.protocol === "file:") {
            resolve(null);
            return;
          }

          try {
            canvas.width = image.naturalWidth || image.width;
            canvas.height = image.naturalHeight || image.height;
            context = canvas.getContext("2d");

            if (!context) {
              resolve(null);
              return;
            }

            context.drawImage(image, 0, 0);
            imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            data = imageData.data;

            for (index = 0; index < data.length; index += 4) {
              r = data[index];
              g = data[index + 1];
              b = data[index + 2];
              a = data[index + 3];
              dominance = g - Math.max(r, b);

              if (a && g > 120 && dominance > 28 && g > r * 1.18 && g > b * 1.18) {
                fade = Math.max(0, Math.min(1, (dominance - 28) / 92));
                data[index] = Math.min(255, Math.round(r + fade * 14));
                data[index + 1] = Math.max(0, Math.round(g - fade * 150));
                data[index + 2] = Math.min(255, Math.round(b + fade * 18));
                data[index + 3] = Math.max(0, Math.round(a * (1 - fade)));
              }
            }

            context.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          } catch (error) {
            resolve(null);
          }
        };
        image.onerror = function () {
          resolve(null);
        };
        image.src = frameSrc;
      });
    }

    function ensureActivationFrames(sequenceKey) {
      var config = ACTIVATION_SEQUENCE_CONFIGS[sequenceKey];

      if (!config) {
        return Promise.resolve([]);
      }

      if (activationFrameCache[sequenceKey]) {
        return Promise.resolve(activationFrameCache[sequenceKey]);
      }

      if (activationFrameLoaders[sequenceKey]) {
        return activationFrameLoaders[sequenceKey];
      }

      if (!config.needsChromaKey) {
        activationFrameCache[sequenceKey] = config.frameSrcs.slice();
        return Promise.resolve(activationFrameCache[sequenceKey]);
      }

      activationFrameLoaders[sequenceKey] = Promise.all(
        config.frameSrcs.map(function (frameSrc) {
          return loadAiActivationFrame(frameSrc);
        })
      ).then(
        function (processedFrames) {
          activationFrameCache[sequenceKey] = processedFrames.every(Boolean) ? processedFrames : [config.fallbackSrc];
          return activationFrameCache[sequenceKey];
        },
        function () {
          activationFrameCache[sequenceKey] = [config.fallbackSrc];
          return activationFrameCache[sequenceKey];
        }
      );

      return activationFrameLoaders[sequenceKey];
    }

    function syncActivationSequence(sequenceKey) {
      var animationState = activationAnimationStates[sequenceKey];
      var selector = '[data-activation-sequence="' + sequenceKey + '"]';

      if (!document.querySelector(selector)) {
        stopActivationSequence(sequenceKey);
        return;
      }

      ensureActivationFrames(sequenceKey).then(function (frames) {
        if (!document.querySelector(selector)) {
          stopActivationSequence(sequenceKey);
          return;
        }

        setActivationMode(sequenceKey, frames.length > 1 ? "frames" : "fallback");
        setActivationFrame(sequenceKey, animationState.frameIndex);

        if (animationState.timer) {
          return;
        }

        if (frames.length <= 1) {
          return;
        }

        animationState.timer = window.setInterval(function () {
          if (!document.querySelector(selector)) {
            stopActivationSequence(sequenceKey);
            return;
          }

          animationState.frameIndex = (animationState.frameIndex + 1) % frames.length;
          setActivationFrame(sequenceKey, animationState.frameIndex);
        }, ACTIVATION_FRAME_INTERVAL_MS);
      });
    }

    function syncActivationAnimations() {
      Object.keys(ACTIVATION_SEQUENCE_CONFIGS).forEach(function (sequenceKey) {
        syncActivationSequence(sequenceKey);
      });
    }

    function playBoardIntroMusic() {
      playAudio(getBoardIntroMusicAudio(), {
        loop: true,
        volume: boardIntroMusicVolume
      });
    }

    function selectLibraryTrack(library, activeTrack, lastTrack) {
      var candidateTracks;
      var nextIndex;

      if (!library.length) {
        return "";
      }

      if (activeTrack && library.indexOf(activeTrack) !== -1) {
        return activeTrack;
      }

      candidateTracks = library.slice();
      if (lastTrack && candidateTracks.length > 1) {
        candidateTracks = candidateTracks.filter(function (trackSrc) {
          return trackSrc !== lastTrack;
        });
      }

      nextIndex = Math.floor(Math.random() * candidateTracks.length);
      return candidateTracks[nextIndex];
    }

    function clearGameplayMusicSelection() {
      if (activeGameplayMusicTrack) {
        lastGameplayMusicTrack = activeGameplayMusicTrack;
      }
      activeGameplayMusicTrack = "";
    }

    function clearBattleMusicSelection() {
      if (activeBattleMusicTrack) {
        lastBattleMusicTrack = activeBattleMusicTrack;
      }
      activeBattleMusicTrack = "";
    }

    function selectGameplayMusicTrack() {
      activeGameplayMusicTrack = selectLibraryTrack(
        gameplayMusicLibrary,
        activeGameplayMusicTrack,
        lastGameplayMusicTrack
      );
      return activeGameplayMusicTrack;
    }

    function selectBattleMusicTrack() {
      activeBattleMusicTrack = selectLibraryTrack(
        battleMusicLibrary,
        activeBattleMusicTrack,
        lastBattleMusicTrack
      );
      return activeBattleMusicTrack;
    }

    function syncMusicTrack(audio, trackSrc) {
      if (!audio || !trackSrc) {
        return;
      }

      if (audio.getAttribute("data-active-track-src") === trackSrc && audio.getAttribute("src") === trackSrc) {
        return;
      }

      audio.pause();
      audio.setAttribute("data-active-track-src", trackSrc);
      audio.setAttribute("src", trackSrc);
      audio.load();
    }

    function isGameplayPhaseActive() {
      return Boolean(currentState && boardIntroState === "open" && currentState.mode === "board" && !currentState.winner);
    }

    function isBattlePhaseActive() {
      return Boolean(currentState && currentState.mode === "battle");
    }

    function isAiEthicalSelectionPhaseActive() {
      var pending = currentState && currentState.pendingEthicalDecision;

      return Boolean(currentState && currentState.mode === "ethics" && pending && pending.controlledBy === "computer");
    }

    function isHumanEthicalSelectionPhaseActive() {
      var pending = currentState && currentState.pendingEthicalDecision;

      return Boolean(currentState && currentState.mode === "ethics" && pending && pending.controlledBy === "human");
    }

    function pauseGameplayMusic(resetTrack) {
      var audio = getGameplayMusicAudio();

      if (!audio) {
        return;
      }

      audio.setAttribute("data-archon-play-state", "idle");
      audio.setAttribute("data-archon-play-error", "");
      audio.pause();

      if (resetTrack) {
        clearGameplayMusicSelection();
        try {
          audio.currentTime = 0;
        } catch (error) {}
      }
    }

    function pauseBattleMusic(resetTrack) {
      var audio = getBattleArenaMusicAudio();

      if (!audio) {
        return;
      }

      audio.setAttribute("data-archon-play-state", "idle");
      audio.setAttribute("data-archon-play-error", "");
      audio.pause();

      if (resetTrack) {
        clearBattleMusicSelection();
        try {
          audio.currentTime = 0;
        } catch (error) {}
      }
    }

    function pauseAiEthicalSelectionMusic(resetTrack) {
      var audio = getAiEthicalSelectionMusicAudio();

      if (!audio) {
        return;
      }

      audio.setAttribute("data-archon-play-state", "idle");
      audio.setAttribute("data-archon-play-error", "");
      audio.pause();

      if (resetTrack) {
        try {
          audio.currentTime = 0;
        } catch (error) {}
      }
    }

    function pauseHumanEthicalSelectionMusic(resetTrack) {
      var audio = getHumanEthicalSelectionMusicAudio();

      if (!audio) {
        return;
      }

      audio.setAttribute("data-archon-play-state", "idle");
      audio.setAttribute("data-archon-play-error", "");
      audio.pause();

      if (resetTrack) {
        try {
          audio.currentTime = 0;
        } catch (error) {}
      }
    }

    function startGameplayMusic(options) {
      var audio = getGameplayMusicAudio();
      var settings = options || {};
      var trackSrc;

      if (!audio) {
        return;
      }

      trackSrc = selectGameplayMusicTrack();
      if (!trackSrc) {
        return;
      }

      syncMusicTrack(audio, trackSrc);

      if (settings.mutedStart) {
        playAudio(audio, {
          loop: false,
          volume: 0.0001,
          reset: false
        });
        return;
      }

      if (audio.ended) {
        try {
          audio.currentTime = 0;
        } catch (error) {}
      }

      if (getAudioPlayState(audio) === "playing" && !audio.paused) {
        audio.volume = gameplayMusicVolume;
        return;
      }

      playAudio(audio, {
        loop: false,
        volume: gameplayMusicVolume,
        reset: false
      });
    }

    function startBattleMusic(options) {
      var audio = getBattleArenaMusicAudio();
      var settings = options || {};
      var trackSrc;

      if (!audio) {
        return;
      }

      trackSrc = selectBattleMusicTrack();
      if (!trackSrc) {
        return;
      }

      syncMusicTrack(audio, trackSrc);

      if (settings.mutedStart) {
        playAudio(audio, {
          loop: false,
          volume: 0.0001,
          reset: false
        });
        return;
      }

      if (audio.ended) {
        try {
          audio.currentTime = 0;
        } catch (error) {}
      }

      if (getAudioPlayState(audio) === "playing" && !audio.paused) {
        audio.volume = battleMusicVolume;
        return;
      }

      playAudio(audio, {
        loop: false,
        volume: battleMusicVolume,
        reset: false
      });
    }

    function startAiEthicalSelectionMusic() {
      var audio = getAiEthicalSelectionMusicAudio();
      var playState;

      if (!audio) {
        return;
      }

      if (audio.ended) {
        try {
          audio.currentTime = 0;
        } catch (error) {}
      }

      playState = getAudioPlayState(audio);

      if ((playState === "playing" || playState === "pending") && !audio.paused) {
        audio.volume = aiEthicalSelectionMusicVolume;
        return;
      }

      playAudio(audio, {
        loop: true,
        volume: aiEthicalSelectionMusicVolume,
        reset: false
      });
    }

    function startHumanEthicalSelectionMusic() {
      var audio = getHumanEthicalSelectionMusicAudio();
      var playState;

      if (!audio) {
        return;
      }

      if (audio.ended) {
        try {
          audio.currentTime = 0;
        } catch (error) {}
      }

      playState = getAudioPlayState(audio);

      if ((playState === "playing" || playState === "pending") && !audio.paused) {
        audio.volume = humanEthicalSelectionMusicVolume;
        return;
      }

      playAudio(audio, {
        loop: true,
        volume: humanEthicalSelectionMusicVolume,
        reset: false
      });
    }

    function syncGameplayMusicState() {
      var audio = getGameplayMusicAudio();

      if (!audio) {
        return;
      }

      if (isGameplayPhaseActive()) {
        startGameplayMusic();
        return;
      }

      pauseGameplayMusic(false);
    }

    function syncPhaseMusicState() {
      if (isBattlePhaseActive()) {
        pauseGameplayMusic(true);
        startBattleMusic();
        return;
      }

      pauseBattleMusic(true);
      syncGameplayMusicState();
    }

    function syncAiEthicalSelectionMusicState() {
      if (isAiEthicalSelectionPhaseActive()) {
        startAiEthicalSelectionMusic();
        return;
      }

      pauseAiEthicalSelectionMusic(true);
    }

    function syncHumanEthicalSelectionMusicState() {
      if (isHumanEthicalSelectionPhaseActive()) {
        startHumanEthicalSelectionMusic();
        return;
      }

      pauseHumanEthicalSelectionMusic(true);
    }

    function shouldRetryBoardIntroMusic() {
      var audio = getBoardIntroMusicAudio();
      var playState = getAudioPlayState(audio);

      if (!audio || boardIntroState !== "closed") {
        return false;
      }

      return playState !== "playing";
    }

    function bindBoardIntroMusicRetry() {
      function retryBoardIntroMusic(event) {
        var target = event && event.target;

        if (!shouldRetryBoardIntroMusic()) {
          return;
        }

        if (target && target.closest && target.closest("#boardIntroSeal")) {
          return;
        }

        playBoardIntroMusic();
      }

      if (boardIntroMusicRetryBound) {
        return;
      }

      boardIntroMusicRetryBound = true;
      document.addEventListener("pointerdown", retryBoardIntroMusic, true);
      document.addEventListener("keydown", retryBoardIntroMusic, true);
      document.addEventListener("touchstart", retryBoardIntroMusic, true);
    }

    function clearBoardIntroTimer() {
      if (!boardIntroTimeout) {
        return;
      }

      window.clearTimeout(boardIntroTimeout);
      boardIntroTimeout = 0;
    }

    function finishBoardIntro() {
      if (!boardIntro) {
        return;
      }

      clearBoardIntroTimer();
      resetAudio(getBoardIntroMusicAudio());
      boardIntroState = "open";
      boardIntro.classList.remove("is-opening");
      boardIntro.hidden = true;
      boardFrame.classList.remove("board-frame--sealed");
      if (boardIntroSeal) {
        boardIntroSeal.disabled = false;
      }

      if (currentState) {
        render(currentState);
      }
    }

    function resetBoardIntro() {
      if (!boardIntro) {
        boardIntroState = "open";
        return;
      }

      clearBoardIntroTimer();
      playBoardIntroMusic();
      pauseGameplayMusic(true);
      pauseBattleMusic(true);
      resetAudio(getBoardUnlockAudio());
      boardIntroState = "closed";
      boardIntro.hidden = false;
      boardIntro.classList.remove("is-opening");
      boardFrame.classList.add("board-frame--sealed");
      if (boardIntroSeal) {
        boardIntroSeal.disabled = false;
      }

      if (currentState) {
        render(currentState);
      }
    }

    function openBoardIntro() {
      if (!boardIntro || boardIntroState !== "closed") {
        return;
      }

      clearBoardIntroTimer();
      boardIntroState = "opening";
      boardIntro.classList.add("is-opening");
      if (boardIntroSeal) {
        boardIntroSeal.disabled = true;
      }
      resetAudio(getBoardIntroMusicAudio());
      startGameplayMusic({
        mutedStart: true
      });
      pauseBattleMusic(true);
      playAudio(getBoardUnlockAudio(), {
        volume: boardUnlockVolume
      });

      if (currentState) {
        render(currentState);
      }

      boardIntroTimeout = window.setTimeout(finishBoardIntro, boardIntroDuration);
    }

    function isDesktopDrawerMode() {
      return window.innerWidth >= 1121;
    }

    function keepDrawersOpen() {
      drawerElements.forEach(function (drawer) {
        drawer.open = true;
      });
    }

    function syncDrawerLayout(force) {
      var nextMode = isDesktopDrawerMode() ? "desktop" : "mobile";

      if (!force && drawerLayoutMode === nextMode) {
        return;
      }

      drawerLayoutMode = nextMode;
      keepDrawersOpen();
    }

    function bindEvents() {
      boardElement.addEventListener("click", function (event) {
        var target = event.target.closest(".board-cell");
        if (!target) {
          return;
        }
        onSquareClick(Number(target.dataset.row), Number(target.dataset.col));
      });

      newGameButton.addEventListener("click", function () {
        onNewGame();
      });

      if (boardIntroSeal) {
        boardIntroSeal.addEventListener("click", function () {
          openBoardIntro();
        });
      }

      ethicalChoices.addEventListener("click", function (event) {
        var eventTarget = event.target;
        var pending = currentState && currentState.pendingEthicalDecision;
        var target =
          eventTarget && eventTarget.nodeType === 3 ? eventTarget.parentElement : eventTarget && eventTarget.closest ? eventTarget.closest("[data-choice-id]") : null;
        var shouldPlayHumanSelection = Boolean(pending && pending.controlledBy === "human" && target && !target.disabled);

        if (!target) {
          return;
        }

        if (shouldPlayHumanSelection) {
          playHumanEthicalDecisionAudio();
        }

        onEthicalDecision(target.dataset.choiceId);
      });

      if (ethicalAdvanceButton) {
        ethicalAdvanceButton.addEventListener("click", function () {
          var pending = currentState && currentState.pendingEthicalDecision;

          if (
            pending &&
            pending.controlledBy === "computer" &&
            pending.autoChoiceId &&
            !pending.revealedChoiceId &&
            !ethicalAdvanceButton.disabled
          ) {
            playAiEthicalAdvanceAudio();
          }
          onEthicalAdvance();
        });
      }

      if (getGameplayMusicAudio()) {
        getGameplayMusicAudio().addEventListener("ended", function () {
          if (!isGameplayPhaseActive()) {
            return;
          }

          clearGameplayMusicSelection();
          startGameplayMusic();
        });
      }

      if (getBattleArenaMusicAudio()) {
        getBattleArenaMusicAudio().addEventListener("ended", function () {
          if (!isBattlePhaseActive()) {
            return;
          }

          clearBattleMusicSelection();
          startBattleMusic();
        });
      }

      drawerSummaries.forEach(function (summary) {
        summary.addEventListener("click", function (event) {
          if (isDesktopDrawerMode()) {
            event.preventDefault();
          }
        });
      });

      drawerElements.forEach(function (drawer) {
        drawer.addEventListener("toggle", function () {
          if (isDesktopDrawerMode() && !drawer.open) {
            drawer.open = true;
          }
        });
      });

      document.addEventListener("click", function (event) {
        if (!isDesktopDrawerMode() || event.target.closest(".hud-drawer")) {
          return;
        }

        keepDrawersOpen();
      });

      window.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          keepDrawersOpen();
        }
      });

      window.addEventListener("resize", function () {
        syncDrawerLayout(false);
        syncBoardPieceScale();
        syncBoardAnimationBounds();
        syncBattleViewport();
      });
    }

    function syncBoardPieceScale() {
      var squareSize;
      var nextScale;

      if (!boardElement || !boardElement.clientWidth) {
        return;
      }

      squareSize = boardElement.clientWidth / 8;
      nextScale = Math.min(0.92, Math.max(0.64, (squareSize - 2) / maxBoardSpriteHeight));
      nextScale = String(Math.round(nextScale * 1000) / 1000);
      boardFrame.style.setProperty("--board-piece-scale-factor", nextScale);
      boardElement.style.setProperty("--board-piece-scale-factor", nextScale);
    }

    function syncBoardAnimationBounds() {
      boardAnimationLayer.style.left = boardElement.offsetLeft + "px";
      boardAnimationLayer.style.top = boardElement.offsetTop + "px";
      boardAnimationLayer.style.width = boardElement.clientWidth + "px";
      boardAnimationLayer.style.height = boardElement.clientHeight + "px";
    }

    function syncBattleViewport() {
      var shellStyle;
      var stageStyle;
      var shellGap;
      var stagePadding;
      var availableHeight;

      if (!battleOverlay || !battleShell || !battleCopy || !battleStage || !battleHud || !battleCanvas) {
        return;
      }

      if (battleOverlay.classList.contains("hidden")) {
        battleShell.style.removeProperty("--battle-canvas-max-height");
        return;
      }

      shellStyle = window.getComputedStyle(battleShell);
      stageStyle = window.getComputedStyle(battleStage);
      shellGap = parsePixels(shellStyle.rowGap || shellStyle.gap);
      stagePadding = parsePixels(stageStyle.paddingTop) + parsePixels(stageStyle.paddingBottom);
      availableHeight =
        battleShell.clientHeight -
        shellGap * 2 -
        battleCopy.offsetHeight -
        battleHud.offsetHeight -
        stagePadding -
        8;

      battleShell.style.setProperty(
        "--battle-canvas-max-height",
        Math.max(170, Math.min(560, Math.floor(availableHeight))) + "px"
      );
    }

    function getBoardCell(row, col) {
      return boardElement.querySelector('.board-cell[data-row="' + row + '"][data-col="' + col + '"]');
    }

    function resetBoardAnimation(shouldRenderBoard) {
      if (boardAnimationTimeout) {
        window.clearTimeout(boardAnimationTimeout);
      }
      boardAnimationTimeout = 0;
      resetAudio(activeBoardMoveAudio);
      activeBoardMoveAudio = null;
      activeBoardAnimation = null;
      boardAnimationLayer.innerHTML = "";

      if (shouldRenderBoard && currentState) {
        renderBoard(currentState);
      }
    }

    function canAnimateBoardMove(piece) {
      return Boolean(piece && ns.data.getPieceDesign(piece).boardSprite);
    }

    function getBoardMoveDuration(move) {
      var travel = Math.max(Math.abs(move.toRow - move.fromRow), Math.abs(move.toCol - move.fromCol));
      return Math.min(2400, 1100 + travel * 320);
    }

    function animateBoardMove(move, piece, onFinish) {
      var fromCell;
      var toCell;
      var overlay;
      var duration;
      var dx;
      var dy;
      var moveAudioConfig;
      var completed = false;

      if (!canAnimateBoardMove(piece)) {
        onFinish();
        return;
      }

      resetBoardAnimation(false);
      activeBoardAnimation = {
        pieceId: piece.id,
        fromRow: move.fromRow,
        fromCol: move.fromCol
      };
      moveAudioConfig = getBoardMoveAudioConfig(piece);
      activeBoardMoveAudio = getBoardMoveAudio(piece);
      renderBoard(currentState);
      syncBoardAnimationBounds();

      fromCell = getBoardCell(move.fromRow, move.fromCol);
      toCell = getBoardCell(move.toRow, move.toCol);
      if (!fromCell || !toCell) {
        resetBoardAnimation(false);
        onFinish();
        return;
      }

      duration = getBoardMoveDuration(move);
      dx = toCell.offsetLeft - fromCell.offsetLeft;
      dy = toCell.offsetTop - fromCell.offsetTop;
      playAudio(activeBoardMoveAudio, moveAudioConfig);
      boardAnimationLayer.innerHTML =
        '<div class="board-move-overlay" style="left:' +
        fromCell.offsetLeft +
        "px;top:" +
        fromCell.offsetTop +
        "px;width:" +
        fromCell.offsetWidth +
        "px;height:" +
        fromCell.offsetHeight +
        "px;transition-duration:" +
        duration +
        'ms;">' +
        renderBoardSprite(piece, "walk", "piece-actor--moving", true) +
        "</div>";
      overlay = boardAnimationLayer.firstElementChild;

      function finish() {
        if (completed) {
          return;
        }
        completed = true;
        resetBoardAnimation(false);
        onFinish();
      }

      overlay.addEventListener(
        "transitionend",
        function (event) {
          if (event.target === overlay) {
            finish();
          }
        },
        { once: true }
      );
      boardAnimationTimeout = window.setTimeout(finish, duration + 120);

      overlay.getBoundingClientRect();
      window.requestAnimationFrame(function () {
        overlay.style.transform = "translate3d(" + dx + "px, " + dy + "px, 0)";
      });
    }

    function renderBoard(state) {
      var validMap = {};
      var focusedSquare = state.selected || state.inspectedSquare;
      var selectedKey = focusedSquare ? focusedSquare.row + ":" + focusedSquare.col : "";
      var markup = "";
      var moveIndex;
      var row;
      var col;
      var key;
      var piece;
      var squareState;
      var hasEthicalState;
      var isPendingEthicalSquare;
      var introSealed = boardIntroState !== "open";
      var classes;

      for (moveIndex = 0; moveIndex < state.validMoves.length; moveIndex += 1) {
        validMap[state.validMoves[moveIndex].row + ":" + state.validMoves[moveIndex].col] = state.validMoves[moveIndex];
      }

      boardElement.classList.toggle(
        "is-locked",
        state.lockInput || state.currentTurn !== "light" || state.mode === "battle" || state.mode === "ethics"
      );

      for (row = 0; row < 8; row += 1) {
        for (col = 0; col < 8; col += 1) {
          key = row + ":" + col;
          piece = state.board[row][col];
          squareState = state.ethicalBoard[row][col];
          hasEthicalState = squareState && squareState.governanceType !== "neutral";
          isPendingEthicalSquare =
            state.pendingEthicalDecision && state.pendingEthicalDecision.row === row && state.pendingEthicalDecision.col === col;
          classes = ["board-cell", (row + col) % 2 === 0 ? "board-cell--tone-a" : "board-cell--tone-b"];

          if (piece) {
            classes.push("board-cell--occupied", "board-cell--" + ns.data.getFactionKey(piece.side));
          }

          if (hasEthicalState) {
            classes.push("board-cell--ethical", "board-cell--ethical-" + squareState.governanceType);
            if (squareState.clusterSize > 1) {
              classes.push("board-cell--ethical-connected");
            }
            if (squareState.clusterSize >= 3) {
              classes.push("board-cell--ethical-network");
            }
          }

          if (isPendingEthicalSquare) {
            classes.push("board-cell--ethical-pending");
          }

          if (key === selectedKey) {
            classes.push("board-cell--selected");
          }

          if (validMap[key]) {
            classes.push(validMap[key].isCapture ? "board-cell--capture" : "board-cell--move");
          }

          if (state.lockInput || state.mode === "battle") {
            classes.push("board-cell--disabled");
          }

          if (state.mode === "ethics") {
            classes.push("board-cell--disabled");
          }

          markup +=
            '<button type="button" class="' +
            classes.join(" ") +
            '" data-row="' +
            row +
            '" data-col="' +
            col +
            '"' +
            (introSealed ? ' disabled aria-disabled="true" tabindex="-1"' : "") +
            '>';

          if (
            piece &&
            !(
              activeBoardAnimation &&
              activeBoardAnimation.pieceId === piece.id &&
              activeBoardAnimation.fromRow === row &&
              activeBoardAnimation.fromCol === col
            )
          ) {
            markup += renderPieceChip(piece);
          }

          markup += renderEthicalMarker(isPendingEthicalSquare);
          markup += "</button>";
        }
      }

      boardElement.innerHTML = markup;
      syncBoardPieceScale();
      syncBoardAnimationBounds();
    }

    function renderStatus(state) {
      var remnantMetrics = countFactionMetrics(state, "light");
      var consensusMetrics = countFactionMetrics(state, "dark");
      var selectedPiece = state.selected ? state.board[state.selected.row][state.selected.col] : null;
      var activationSequence =
        state.mode === "board" && selectedPiece ? (selectedPiece.side === "light" ? "human" : "ai") : "";
      var inspectedSquare = state.selected || state.inspectedSquare;
      var inspectedSquareLabel = inspectedSquare ? ns.core.boardToCoord(inspectedSquare.row, inspectedSquare.col) : "";
      var inspectedSquareState = inspectedSquare ? state.ethicalBoard[inspectedSquare.row][inspectedSquare.col] : null;
      var inspectedConsequence =
        inspectedSquare && !selectedPiece && ns.ethics.hasConsequenceTile(inspectedSquareState)
          ? {
              squareLabel: inspectedSquareLabel,
              squareState: inspectedSquareState
            }
          : null;
      var turnLabel = ns.data.getSideLabel(state.currentTurn);
      var turnOverride = state.commandOverrides ? state.commandOverrides[state.currentTurn] : null;
      var healthText = "-";
      var ethicalPiece = state.pendingEthicalDecision ? state.board[state.pendingEthicalDecision.row][state.pendingEthicalDecision.col] : null;
      var battleConsensusPiece =
        state.mode === "battle" &&
        state.battle &&
        state.battle.defenderAt &&
        state.board[state.battle.defenderAt.row] &&
        state.board[state.battle.defenderAt.row][state.battle.defenderAt.col] &&
        state.board[state.battle.defenderAt.row][state.battle.defenderAt.col].side === "dark"
          ? state.board[state.battle.defenderAt.row][state.battle.defenderAt.col]
          : null;

      if (turnOverride) {
        turnLabel += " redirecting " + ns.data.getSideLabel(turnOverride.commandSide);
      }

      if (state.pendingAI && state.currentTurn === "dark") {
        turnLabel += " calculating";
      }

      if (statusPanel) {
        statusPanel.classList.toggle("status-panel--board", state.mode === "board");
      }

      if (remnantTerritoriesValue) {
        remnantTerritoriesValue.textContent = remnantMetrics.territories;
      }

      if (remnantInfluenceValue) {
        remnantInfluenceValue.textContent = remnantMetrics.influence;
      }

      if (remnantNodesValue) {
        remnantNodesValue.textContent = remnantMetrics.ethicalNodes;
      }

      if (remnantReservesValue) {
        remnantReservesValue.textContent = remnantMetrics.reserves;
      }

      if (consensusTerritoriesValue) {
        consensusTerritoriesValue.textContent = consensusMetrics.territories;
      }

      if (consensusInfluenceValue) {
        consensusInfluenceValue.textContent = consensusMetrics.influence;
      }

      if (consensusNodesValue) {
        consensusNodesValue.textContent = consensusMetrics.ethicalNodes;
      }

      if (consensusReservesValue) {
        consensusReservesValue.textContent = consensusMetrics.reserves;
      }

      if (commandSideLabel) {
        commandSideLabel.textContent = state.winner
          ? ns.data.getSideLabel(state.winner) + " Ascendant"
          : "Turn of " + ns.data.getSideLabel(state.currentTurn);
      }

      if (phaseValue) {
        phaseValue.textContent = getPhaseCopy(state);
      }

      phaseNodes.forEach(function (node, index) {
        var phaseOrder = ["board", "battle", "ethics"];
        var currentIndex = Math.max(0, phaseOrder.indexOf(state.mode));

        node.classList.toggle("is-active", index === currentIndex);
        node.classList.toggle("is-complete", index < currentIndex);
      });

      if (eraTitle || eraSummary) {
        var eraCopy = getEraCopy(state);

        if (eraTitle) {
          eraTitle.textContent = eraCopy.title;
        }

        if (eraSummary) {
          eraSummary.textContent = eraCopy.summary;
        }
      }

      modeValue.textContent =
        state.mode === "battle" ? "Arena Duel" : state.mode === "ethics" ? "Ethical Consequence" : "Board Phase";
      turnValue.textContent = state.winner ? ns.data.getSideLabel(state.winner) + " Victory" : turnLabel;
      selectedValue.textContent = selectedPiece
        ? ns.data.getPieceName(selectedPiece)
        : state.mode === "battle" && state.battle
          ? state.battle.lightPieceName
          : ethicalPiece
            ? ns.data.getPieceName(ethicalPiece)
            : inspectedConsequence
              ? inspectedConsequence.squareLabel + " " + getConsequenceLabel(inspectedConsequence.squareState)
            : "None";

      if (state.mode === "battle" && state.battle && state.battle.live) {
        healthText =
          state.battle.live.playerHealth +
          " / " +
          state.battle.live.playerMaxHealth +
          " vs " +
          state.battle.live.enemyHealth +
          " / " +
          state.battle.live.enemyMaxHealth;
      } else if (state.mode === "ethics" && ethicalPiece) {
        healthText = roundValue(ethicalPiece.health) + " / " + ns.data.getPieceDesign(ethicalPiece).stats.hp;
      } else if (selectedPiece) {
        healthText = roundValue(selectedPiece.health) + " / " + ns.data.getPieceDesign(selectedPiece).stats.hp;
      }

      healthValue.textContent = healthText;
      resultValue.textContent =
        boardIntroState === "open" ? state.lastResult : "Click the lock-seal to reveal the relay board.";

      if (remnantInspectorCard) {
        if (state.mode === "battle" && state.battle) {
          remnantInspectorCard.innerHTML = renderDetailCard(state.battle.lightPiece, null, "");
        } else if (state.mode === "ethics" && ethicalPiece && ethicalPiece.side === "light") {
          remnantInspectorCard.innerHTML = renderDetailCard(ethicalPiece, null, "");
        } else {
          remnantInspectorCard.innerHTML = renderRemnantCommandCard({
            activationSequence: activationSequence
          });
        }
      }

      if (consensusInspectorCard) {
        if (battleConsensusPiece) {
          consensusInspectorCard.innerHTML = renderDetailCard(battleConsensusPiece, null, "");
        } else if (state.mode === "ethics" && ethicalPiece && ethicalPiece.side === "dark") {
          consensusInspectorCard.innerHTML = renderDetailCard(ethicalPiece, null, "");
        } else {
          consensusInspectorCard.innerHTML = renderConsensusIntelCard({
            activationSequence: activationSequence
          });
        }
      }

      if (state.mode === "battle" && state.battle) {
        selectedCard.innerHTML = renderDetailCard(state.battle.lightPiece, null, "");
      } else if (state.mode === "ethics" && ethicalPiece) {
        selectedCard.innerHTML = renderDetailCard(ethicalPiece, null, "");
      } else if (selectedPiece) {
        selectedCard.innerHTML = renderDetailCard(selectedPiece, inspectedSquareState, inspectedSquareLabel, {
          activationSequence: activationSequence
        });
      } else if (inspectedConsequence) {
        selectedCard.innerHTML = renderConsequenceDetailCard(
          inspectedConsequence.squareState,
          inspectedConsequence.squareLabel
        );
      } else {
        selectedCard.innerHTML = emptyCard(
          "Unit Intel",
          "Board Unit",
          "Select any unit to inspect its silhouette, stats, and combat identity."
        );
      }

      syncActivationAnimations();

    }

    function renderBattle(state) {
      var snapshot = state.battle && state.battle.live ? state.battle.live : null;

      battleOverlay.classList.toggle("hidden", state.mode !== "battle");

      if (!snapshot || !state.battle) {
        battleTitle.textContent = "Contested Square";
        battlePrompt.textContent = "Pilot the Remnant fighter and hold the square.";
        battlePlayerLabel.textContent = "Awaiting duel";
        battleEnemyLabel.textContent = "Awaiting duel";
        battlePlayerHealth.textContent = "-";
        battleEnemyHealth.textContent = "-";
        battlePlayerBar.style.width = "0%";
        battleEnemyBar.style.width = "0%";
        syncBattleViewport();
        return;
      }

      battleTitle.textContent = state.battle.title;
      battlePrompt.textContent = snapshot.overchargeActive
        ? "The arena is overcharging. Stalling now damages both sides."
        : "Move, strike with Space, and hold the square for the Remnant.";
      battlePlayerLabel.textContent = snapshot.playerName;
      battleEnemyLabel.textContent = snapshot.enemyName;
      battlePlayerHealth.textContent = snapshot.playerHealth + " / " + snapshot.playerMaxHealth;
      battleEnemyHealth.textContent = snapshot.enemyHealth + " / " + snapshot.enemyMaxHealth;
      battlePlayerBar.style.width = (snapshot.playerHealth / snapshot.playerMaxHealth) * 100 + "%";
      battleEnemyBar.style.width = (snapshot.enemyHealth / snapshot.enemyMaxHealth) * 100 + "%";
      syncBattleViewport();
    }

    function renderEthicalDecision(state) {
      var pending = state.pendingEthicalDecision;
      var isComputerDecision;
      var selectedChoice;
      var promptText;
      var advanceLabel;
      var advanceIconSrc;

      ethicalOverlay.classList.toggle("hidden", !pending);

      if (!pending) {
        ethicalTitle.textContent = "Captured Square";
        ethicalPrompt.textContent = "Access the Ethical Codex. Draw 3 tiles, choose 1, discard 2.";
        if (ethicalControls) {
          ethicalControls.hidden = true;
        }
        if (ethicalAdvanceButton) {
          ethicalAdvanceButton.disabled = false;
          ethicalAdvanceButton.classList.remove("ethical-advance--display", "ethical-advance--human");
          ethicalAdvanceButton.classList.add("ethical-advance--consensus");
          ethicalAdvanceButton.tabIndex = 0;
          ethicalAdvanceButton.setAttribute("aria-label", "Click the CONSENSUS ICON to reveal their choice");
          ethicalAdvanceButton.setAttribute("title", "Click the CONSENSUS ICON to reveal their choice");
        }
        if (ethicalAdvanceIcon) {
          ethicalAdvanceIcon.setAttribute("src", "assets/ui/archon/consensus-ai-side-alpha.webp");
        }
        if (ethicalAdvanceLabel) {
          ethicalAdvanceLabel.textContent = "Click the CONSENSUS ICON to reveal their choice";
        }
        ethicalChoices.innerHTML = "";
        return;
      }

      isComputerDecision = pending.controlledBy === "computer";
      selectedChoice = pending.revealedChoiceId ? ns.ethics.getChoice(pending.revealedChoiceId) : null;
      ethicalTitle.textContent = pending.squareLabel + " accesses the Ethical Codex";
      promptText =
        ns.data.getSideLabel(pending.winnerSide) +
        " " +
        pending.outcomeVerb +
        " the square. " +
        (isComputerDecision
          ? selectedChoice
            ? "It selected " + selectedChoice.label + "."
            : "Click the CONSENSUS ICON to reveal their choice."
          : pending.humanPromptText);
      ethicalPrompt.textContent = promptText;
      if (ethicalControls) {
        ethicalControls.hidden = false;
      }
      advanceLabel = isComputerDecision
        ? "Click the CONSENSUS ICON to reveal their choice"
        : "Human-side victory emblem";
      advanceIconSrc = isComputerDecision
        ? "assets/ui/archon/consensus-ai-side-alpha.webp"
        : "assets/ui/archon/human-side-alpha.webp";
      if (ethicalAdvanceButton) {
        ethicalAdvanceButton.disabled = isComputerDecision ? Boolean(selectedChoice) : true;
        ethicalAdvanceButton.classList.toggle("ethical-advance--display", !isComputerDecision);
        ethicalAdvanceButton.classList.toggle("ethical-advance--human", !isComputerDecision);
        ethicalAdvanceButton.classList.toggle("ethical-advance--consensus", isComputerDecision);
        ethicalAdvanceButton.tabIndex = isComputerDecision ? 0 : -1;
        ethicalAdvanceButton.setAttribute("aria-label", advanceLabel);
        ethicalAdvanceButton.setAttribute("title", advanceLabel);
      }
      if (ethicalAdvanceIcon) {
        ethicalAdvanceIcon.setAttribute("src", advanceIconSrc);
      }
      if (ethicalAdvanceLabel) {
        ethicalAdvanceLabel.textContent = advanceLabel;
      }
      ethicalChoices.innerHTML = pending.choices
        .map(function (choice) {
          var isSelected = pending.revealedChoiceId === choice.id;
          var metricText = choice.metricText || "Influence " + choice.influenceStrength + " / 3";
          var visual = ns.ethics.getGovernanceVisual(choice.governanceType);

          return (
            '<button type="button" class="ethical-choice ethical-choice--' +
            choice.governanceType +
            (isComputerDecision ? " is-disabled" : "") +
            (isSelected ? " is-selected" : "") +
            '" data-choice-id="' +
            choice.id +
            '"' +
            (isComputerDecision ? ' disabled aria-disabled="true"' : "") +
            ">" +
            '<span class="ethical-choice__art-shell">' +
            '<img class="ethical-choice__art" src="' +
            visual.artSrc +
            '" alt="' +
            choice.label +
            ' codex tile artwork" loading="lazy" decoding="async" />' +
            "</span>" +
            '<span class="ethical-choice__body">' +
            '<span class="card-eyebrow">Codex Tile</span>' +
            "<strong>" +
            choice.label +
            "</strong>" +
            '<span class="ethical-choice__doctrine">' +
            choice.doctrine +
            "</span>" +
            (isSelected
              ? '<span class="ethical-choice__status">Selected by ' +
                ns.data.getSideLabel(pending.winnerSide) +
                "</span>"
              : "") +
            "<p>" +
            choice.description +
            "</p>" +
            '<span class="ethical-choice__strength">' +
            metricText +
            "</span>" +
            "</span>" +
            "</button>"
          );
        })
        .join("");
    }

    function renderEthicalNotification(state) {
      var notification = state.ethicalNotification;

      ethicalNotification.classList.toggle("hidden", !notification);

      if (!notification) {
        ethicalNotificationCard.className = "ethical-notification__card";
        ethicalNotificationTitle.textContent = "Ethical Cluster";
        ethicalNotificationMessage.textContent = "";
        return;
      }

      ethicalNotificationCard.className =
        "ethical-notification__card ethical-notification__card--" + notification.governanceType;
      ethicalNotificationTitle.textContent =
        ns.ethics.getGovernanceLabel(notification.governanceType) + " Cluster";
      ethicalNotificationMessage.textContent = notification.message;
    }

    function render(state) {
      currentState = state;
      syncPhaseMusicState();
      syncAiEthicalSelectionMusicState();
      syncHumanEthicalSelectionMusicState();
      renderBoard(state);
      renderStatus(state);
      renderBattle(state);
      renderEthicalDecision(state);
      renderEthicalNotification(state);
    }

    bindEvents();
    bindBoardIntroMusicRetry();
    resetBoardIntro();
    syncDrawerLayout(true);

    return {
      render: render,
      animateBoardMove: animateBoardMove,
      canAnimateBoardMove: canAnimateBoardMove,
      cancelBoardAnimation: function () {
        resetBoardAnimation(false);
      },
      resetBoardIntro: resetBoardIntro,
      setSquareClickHandler: function (handler) {
        onSquareClick = handler;
      },
      setNewGameHandler: function (handler) {
        onNewGame = handler;
      },
      setEthicalDecisionHandler: function (handler) {
        onEthicalDecision = handler;
      },
      setEthicalAdvanceHandler: function (handler) {
        onEthicalAdvance = handler;
      },
      playConsequenceTileInspectAudio: playConsequenceTileInspectAudio
    };
  }

  function renderConsequenceDetailCard(squareState, squareLabel) {
    var pairLabel = getConsequencePairLabel(squareState) || "Ethical Codex";
    var clusterValue = squareState.supportsClusters
      ? squareState.clusterSize > 1
        ? squareState.clusterSize + " linked"
        : "Solo"
      : "Independent";

    return (
      '<article class="unit-panel consequence-panel consequence-panel--' +
      squareState.governanceType +
      '" style="' +
      consequenceAccentStyle(squareState) +
      '">' +
      '<div class="unit-panel__topline">' +
      '<span class="unit-panel__faction">Consequence Tile</span>' +
      '<span class="unit-panel__role">' +
      pairLabel +
      "</span>" +
      "</div>" +
      '<div class="unit-panel__hero">' +
      renderPortraitShell(
        renderConsequencePortrait(squareState, "unit-panel__portrait consequence-panel__portrait"),
        "unit-panel__portrait-shell--consequence"
      ) +
      '<div class="unit-panel__copy">' +
      "<h3>" +
      getConsequenceLabel(squareState) +
      "</h3>" +
      '<p class="unit-panel__subtitle">' +
      (squareState.doctrine || "Territory doctrine active.") +
      "</p>" +
      "</div>" +
      "</div>" +
      '<div class="stat-strip">' +
      renderStatCell("SQUARE", squareLabel) +
      renderStatCell("POWER", squareState.influenceStrength + " / 3") +
      renderStatCell("CLUSTER", clusterValue) +
      "</div>" +
      '<div class="unit-note">' +
      "<strong>Rule</strong>" +
      "<span>" +
      ns.ethics.getRuleSummary(squareState) +
      "</span>" +
      "</div>" +
      "</article>"
    );
  }

  ns.ui.createRenderer = createRenderer;
})(window.ArchonEngine);
