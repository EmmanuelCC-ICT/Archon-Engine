(function (ns) {
  var DEV_MODE = true;

  var UNIT_TYPES = {
    ward: {
      id: "ward",
      movement: "Advance 1 square forward, open with 2, capture diagonally.",
      value: 1,
      battle: {
        health: 96,
        speed: 128,
        damage: 18,
        range: 56,
        cooldown: 0.72,
        attackStyle: "melee",
        radius: 24,
        projectileSpeed: 0,
        projectileRadius: 0
      }
    },
    lancer: {
      id: "lancer",
      movement: "Leap in an L-shape and ignore intervening pieces.",
      value: 3,
      battle: {
        health: 78,
        speed: 182,
        damage: 20,
        range: 62,
        cooldown: 0.48,
        attackStyle: "melee",
        radius: 22,
        projectileSpeed: 0,
        projectileRadius: 0
      }
    },
    seer: {
      id: "seer",
      movement: "Glide diagonally across open lines.",
      value: 3,
      battle: {
        health: 74,
        speed: 136,
        damage: 14,
        range: 244,
        cooldown: 0.78,
        attackStyle: "projectile",
        radius: 23,
        projectileSpeed: 344,
        projectileRadius: 9
      }
    },
    bastion: {
      id: "bastion",
      movement: "Drive horizontally or vertically across open lines.",
      value: 5,
      battle: {
        health: 138,
        speed: 92,
        damage: 26,
        range: 176,
        cooldown: 1.02,
        attackStyle: "projectile",
        radius: 28,
        projectileSpeed: 258,
        projectileRadius: 11
      }
    },
    crown: {
      id: "crown",
      movement: "Command any number of squares in any direction.",
      value: 9,
      battle: {
        health: 112,
        speed: 154,
        damage: 24,
        range: 228,
        cooldown: 0.56,
        attackStyle: "projectile",
        radius: 26,
        projectileSpeed: 380,
        projectileRadius: 10
      }
    },
    sovereign: {
      id: "sovereign",
      movement: "Step 1 square in any direction.",
      value: 50,
      battle: {
        health: 124,
        speed: 124,
        damage: 20,
        range: 194,
        cooldown: 0.68,
        attackStyle: "projectile",
        radius: 27,
        projectileSpeed: 318,
        projectileRadius: 10
      }
    }
  };

  var PIECE_ORDER = ["ward", "lancer", "seer", "bastion", "crown", "sovereign"];
  var BACK_RANK = ["bastion", "lancer", "seer", "crown", "sovereign", "seer", "lancer", "bastion"];

  var FACTIONS = {
    remnant: {
      key: "remnant",
      side: "light",
      label: "The Remnant",
      shortLabel: "Remnant",
      pilotLabel: "Humanity",
      tagline: "Humanity, freedom, imperfection.",
      accent: "#e0a45c",
      accentSoft: "#f4c984",
      glow: "rgba(224, 164, 92, 0.36)",
      projectile: "#ffd38e"
    },
    consensus: {
      key: "consensus",
      side: "dark",
      label: "The Consensus",
      shortLabel: "Consensus",
      pilotLabel: "Artificial Intelligence",
      tagline: "Unity, precision, inevitability.",
      accent: "#78ddff",
      accentSoft: "#e6fbff",
      glow: "rgba(120, 221, 255, 0.34)",
      projectile: "#9ceeff"
    }
  };

  var SIDE_TO_FACTION = {
    light: "remnant",
    dark: "consensus"
  };

  function svgWrap(className, innerMarkup) {
    return (
      '<svg class="piece-emblem ' +
      className +
      '" viewBox="0 0 96 96" aria-hidden="true">' +
      innerMarkup +
      "</svg>"
    );
  }

  function designConfig(type, values) {
    var battle = UNIT_TYPES[type].battle;

    return {
      displayName: values.displayName,
      roleLabel: values.roleLabel,
      shortDescription: values.shortDescription,
      accentColor: values.accentColor,
      imageSrc: values.imageSrc || "",
      boardSprite: values.boardSprite || null,
      boardMoveAudio: values.boardMoveAudio || null,
      arenaRig: values.arenaRig || null,
      emblemSvg: values.emblemSvg,
      silhouetteClass: values.silhouetteClass,
      stats: {
        hp: battle.health,
        attack: battle.damage,
        speed: battle.speed
      }
    };
  }

  var PIECE_DESIGNS = {
    remnant: {
      ward: designConfig("ward", {
        displayName: "Sentinel",
        roleLabel: "Frontline Defender",
        shortDescription: "Shield-bearing infantry that anchors the human line under fire.",
        accentColor: "#e2af67",
        imageSrc: "assets/pieces/remnant/sentinel.webp",
        boardMoveAudio: {
          elementId: "sentinelFootstepsAudio",
          loop: true,
          volume: 0.7
        },
        boardSprite: {
          idleSrc: "assets/sprites/prototypes/sentinel-idle.webp",
          src: "assets/sprites/prototypes/sentinel-sheet.webp",
          sheetWidth: 1536,
          sheetHeight: 1024,
          frameWidth: 384,
          frameHeight: 512,
          scale: 0.140625,
          idle: {
            row: 0,
            frames: 4,
            fps: 4
          },
          walk: {
            row: 1,
            frames: 4,
            fps: 8
          }
        },
        arenaRig: {
          kind: "sentinel-arm",
          idleArc: 0.04,
          attackArc: 0.28,
          attackGhostAlpha: 0.08,
          limb: {
            sourceX: 34,
            sourceY: 191,
            width: 122,
            height: 229,
            pivotX: 120,
            pivotY: 226,
            aimTurnX: 0.82,
            aimTurnY: -0.18,
            minTurn: -0.2,
            maxTurn: 0.88,
            ghostLag: 0.22
          }
        },
        silhouetteClass: "silhouette-remnant-sentinel",
        emblemSvg: svgWrap(
          "piece-emblem--remnant",
          '<path class="fill-mid" d="M46 10L68 19V46C68 59 59 71 46 82C34 71 25 59 25 46V19Z"></path>' +
            '<path class="stroke" d="M46 10L68 19V46C68 59 59 71 46 82C34 71 25 59 25 46V19Z"></path>' +
            '<path class="fill-soft" d="M42 24C48 24 53 29 53 35C53 39 51 42 48 44V53H37V44C34 42 32 39 32 35C32 29 36 24 42 24Z"></path>' +
            '<path class="stroke" d="M42 24C48 24 53 29 53 35C53 39 51 42 48 44V53H37V44C34 42 32 39 32 35C32 29 36 24 42 24Z"></path>' +
            '<path class="stroke" d="M58 25L75 22L75 61"></path>' +
            '<path class="stroke" d="M40 37H50"></path>'
        )
      }),
      lancer: designConfig("lancer", {
        displayName: "Vanguard",
        roleLabel: "Assault Mobile",
        shortDescription: "Exosuit shock trooper that opens lanes with an energy lance.",
        accentColor: "#efb86d",
        imageSrc: "assets/pieces/remnant/vanguard.webp",
        boardMoveAudio: {
          elementId: "vanguardWalkAudio",
          loop: true,
          volume: 0.5
        },
        boardSprite: {
          idleSrc: "assets/sprites/prototypes/vanguard-idle.webp",
          src: "assets/sprites/prototypes/vanguard-sheet.webp",
          sheetWidth: 1536,
          sheetHeight: 1024,
          frameWidth: 384,
          frameHeight: 512,
          scale: 0.140625,
          idle: {
            row: 0,
            frames: 4,
            fps: 4
          },
          walk: {
            row: 1,
            frames: 4,
            fps: 8
          }
        },
        silhouetteClass: "silhouette-remnant-vanguard",
        emblemSvg: svgWrap(
          "piece-emblem--remnant",
          '<path class="stroke" d="M17 72L58 18"></path>' +
            '<path class="fill-mid" d="M52 15L66 14L63 28L52 27Z"></path>' +
            '<path class="stroke" d="M52 15L66 14L63 28L52 27Z"></path>' +
            '<path class="fill-soft" d="M29 45L44 31L53 40L42 52L28 56Z"></path>' +
            '<path class="stroke" d="M29 45L44 31L53 40L42 52L28 56Z"></path>' +
            '<path class="stroke" d="M24 58L33 67"></path>' +
            '<path class="stroke" d="M39 27L28 19"></path>'
        )
      }),
      seer: designConfig("seer", {
        displayName: "Pathfinder",
        roleLabel: "Recon Support",
        shortDescription: "Hooded scout with a visor and a hovering companion drone.",
        accentColor: "#d79756",
        imageSrc: "assets/pieces/remnant/pathfinder.webp",
        boardMoveAudio: {
          elementId: "pathfinderWalkAudio",
          loop: true,
          volume: 0.4
        },
        boardSprite: {
          idleSrc: "assets/sprites/prototypes/pathfinder-idle.webp",
          src: "assets/sprites/prototypes/pathfinder-sheet.webp",
          sheetWidth: 1536,
          sheetHeight: 1024,
          frameWidth: 384,
          frameHeight: 512,
          scale: 0.140625,
          idle: {
            row: 0,
            frames: 4,
            fps: 4
          },
          walk: {
            row: 1,
            frames: 4,
            fps: 8
          }
        },
        silhouetteClass: "silhouette-remnant-pathfinder",
        emblemSvg: svgWrap(
          "piece-emblem--remnant",
          '<path class="fill-mid" d="M46 17C55 17 64 25 64 36C64 49 54 58 46 66C37 58 28 49 28 36C28 25 37 17 46 17Z"></path>' +
            '<path class="stroke" d="M46 17C55 17 64 25 64 36C64 49 54 58 46 66C37 58 28 49 28 36C28 25 37 17 46 17Z"></path>' +
            '<path class="stroke" d="M36 36C39 31 43 29 49 29C53 29 56 31 58 34"></path>' +
            '<path class="stroke" d="M37 48C43 45 49 45 55 48"></path>' +
            '<circle class="fill-hot" cx="70" cy="33" r="7"></circle>' +
            '<circle class="stroke" cx="70" cy="33" r="7"></circle>' +
            '<path class="stroke" d="M67 33H73"></path>' +
            '<path class="stroke" d="M70 30V36"></path>'
        )
      }),
      bastion: designConfig("bastion", {
        displayName: "Bulwark",
        roleLabel: "Defender Heavy",
        shortDescription: "Battle-worn walker carrying too much armour and a wall-sized shield.",
        accentColor: "#c9864e",
        imageSrc: "assets/pieces/remnant/bulwark.webp",
        boardMoveAudio: {
          elementId: "bulwarkWalkAudio",
          loop: true,
          volume: 0.07
        },
        boardSprite: {
          idleSrc: "assets/sprites/prototypes/bulwark-idle.webp",
          src: "assets/sprites/prototypes/bulwark-sheet.webp",
          sheetWidth: 1536,
          sheetHeight: 1024,
          frameWidth: 384,
          frameHeight: 512,
          scale: 0.15625,
          idle: {
            row: 0,
            frames: 4,
            fps: 4
          },
          walk: {
            row: 1,
            frames: 4,
            fps: 8
          }
        },
        silhouetteClass: "silhouette-remnant-bulwark",
        emblemSvg: svgWrap(
          "piece-emblem--remnant",
          '<path class="fill-mid" d="M30 30L52 22L66 30V52L50 62H33L24 49V37Z"></path>' +
            '<path class="stroke" d="M30 30L52 22L66 30V52L50 62H33L24 49V37Z"></path>' +
            '<path class="stroke" d="M34 62L29 78"></path>' +
            '<path class="stroke" d="M48 62L52 78"></path>' +
            '<path class="fill-soft" d="M58 28L75 31L75 69L58 72Z"></path>' +
            '<path class="stroke" d="M58 28L75 31L75 69L58 72Z"></path>' +
            '<path class="stroke" d="M35 41H55"></path>'
        )
      }),
      crown: designConfig("crown", {
        displayName: "Paragon",
        roleLabel: "Command Elite",
        shortDescription: "Heroic field commander wrapped in cloth, plating, and earned authority.",
        accentColor: "#ffd07d",
        imageSrc: "assets/pieces/remnant/paragon.webp",
        boardMoveAudio: {
          elementId: "paragonWalkAudio",
          loop: true,
          volume: 1
        },
        boardSprite: {
          idleSrc: "assets/sprites/prototypes/paragon-idle.webp",
          src: "assets/sprites/prototypes/paragon-sheet.webp",
          sheetWidth: 1536,
          sheetHeight: 1024,
          frameWidth: 384,
          frameHeight: 512,
          scale: 0.1484375,
          idle: {
            row: 0,
            frames: 4,
            fps: 4
          },
          walk: {
            row: 1,
            frames: 4,
            fps: 8
          }
        },
        silhouetteClass: "silhouette-remnant-paragon",
        emblemSvg: svgWrap(
          "piece-emblem--remnant",
          '<circle class="fill-soft" cx="47" cy="24" r="10"></circle>' +
            '<circle class="stroke" cx="47" cy="24" r="10"></circle>' +
            '<path class="fill-mid" d="M28 66L35 40L47 50L58 40L67 66Z"></path>' +
            '<path class="stroke" d="M28 66L35 40L47 50L58 40L67 66Z"></path>' +
            '<path class="stroke" d="M20 72L35 40"></path>' +
            '<path class="stroke" d="M74 72L58 40"></path>' +
            '<path class="stroke" d="M35 15L47 6L59 15"></path>'
        )
      }),
      sovereign: designConfig("sovereign", {
        displayName: "Freeborn",
        roleLabel: "Leader Unbound",
        shortDescription: "Defiant leader carrying the burden of human agency into every duel.",
        accentColor: "#f4d9a9",
        imageSrc: "assets/pieces/remnant/freeborn.webp",
        boardMoveAudio: {
          elementId: "freebornWalkAudio",
          loop: true,
          volume: 1
        },
        boardSprite: {
          idleSrc: "assets/sprites/prototypes/freeborn-idle.webp",
          src: "assets/sprites/prototypes/freeborn-sheet.webp",
          sheetWidth: 1536,
          sheetHeight: 1024,
          frameWidth: 384,
          frameHeight: 512,
          scale: 0.1328125,
          idle: {
            row: 0,
            frames: 4,
            fps: 4
          },
          walk: {
            row: 1,
            frames: 4,
            fps: 8
          }
        },
        silhouetteClass: "silhouette-remnant-freeborn",
        emblemSvg: svgWrap(
          "piece-emblem--remnant",
          '<circle class="fill-soft" cx="40" cy="22" r="9"></circle>' +
            '<circle class="stroke" cx="40" cy="22" r="9"></circle>' +
            '<path class="fill-mid" d="M29 61L31 39L41 32L54 39L55 67L40 72Z"></path>' +
            '<path class="stroke" d="M29 61L31 39L41 32L54 39L55 67L40 72Z"></path>' +
            '<path class="stroke" d="M57 28L73 21L73 73"></path>' +
            '<path class="stroke" d="M57 31L68 35L57 41"></path>' +
            '<path class="stroke" d="M33 72L28 83"></path>'
        )
      })
    },
    consensus: {
      ward: designConfig("ward", {
        displayName: "Drone",
        roleLabel: "Frontline Adaptive",
        shortDescription: "Adaptive synthetic infantry built around a floating triangular core.",
        accentColor: "#77e2ff",
        imageSrc: "assets/pieces/consensus/drone.webp",
        boardMoveAudio: {
          elementId: "droneHoverAudio",
          loop: true,
          volume: 0.47
        },
        boardSprite: {
          idleSrc: "assets/sprites/prototypes/drone-idle.webp",
          src: "assets/sprites/prototypes/drone-sheet.webp",
          sheetWidth: 1536,
          sheetHeight: 1024,
          frameWidth: 384,
          frameHeight: 512,
          scale: 0.15625,
          idle: {
            row: 0,
            frames: 4,
            fps: 4
          },
          walk: {
            row: 1,
            frames: 4,
            fps: 8
          }
        },
        arenaRig: {
          kind: "drone-claw",
          idleArc: 0.035,
          attackArc: 0.2,
          attackGhostAlpha: 0.08,
          leftLimb: {
            sourceX: 18,
            sourceY: 156,
            width: 140,
            height: 290,
            pivotX: 128,
            pivotY: 198,
            baseTurn: 0.22,
            aimTurnY: -0.12,
            minTurn: 0.05,
            maxTurn: 0.46,
            ghostLag: 0.18
          },
          rightLimb: {
            sourceX: 228,
            sourceY: 156,
            width: 138,
            height: 290,
            pivotX: 257,
            pivotY: 198,
            baseTurn: -0.22,
            aimTurnY: 0.12,
            minTurn: -0.46,
            maxTurn: -0.05,
            ghostLag: 0.18
          }
        },
        silhouetteClass: "silhouette-consensus-drone",
        emblemSvg: svgWrap(
          "piece-emblem--consensus",
          '<path class="fill-mid" d="M48 14L66 46L48 78L30 46Z"></path>' +
            '<path class="stroke" d="M48 14L66 46L48 78L30 46Z"></path>' +
            '<circle class="fill-hot" cx="48" cy="46" r="8"></circle>' +
            '<circle class="stroke" cx="48" cy="46" r="8"></circle>' +
            '<path class="stroke" d="M21 40L31 33"></path>' +
            '<path class="stroke" d="M75 40L65 33"></path>' +
            '<path class="stroke" d="M21 55L34 61"></path>' +
            '<path class="stroke" d="M75 55L62 61"></path>'
        )
      }),
      lancer: designConfig("lancer", {
        displayName: "Interceptor",
        roleLabel: "Assault Fast",
        shortDescription: "Blade-wing hunter that slices through attack vectors.",
        accentColor: "#91ddff",
        imageSrc: "assets/pieces/consensus/interceptor.webp",
        boardMoveAudio: {
          elementId: "interceptorWalkAudio",
          loop: true,
          volume: 0.27
        },
        boardSprite: {
          idleSrc: "assets/sprites/prototypes/interceptor-idle.webp",
          src: "assets/sprites/prototypes/interceptor-sheet.webp",
          sheetWidth: 1536,
          sheetHeight: 1024,
          frameWidth: 384,
          frameHeight: 512,
          scale: 0.15625,
          idle: {
            row: 0,
            frames: 4,
            fps: 4
          },
          walk: {
            row: 1,
            frames: 4,
            fps: 8
          }
        },
        silhouetteClass: "silhouette-consensus-interceptor",
        emblemSvg: svgWrap(
          "piece-emblem--consensus",
          '<path class="fill-mid" d="M49 13L63 37L50 82L37 37Z"></path>' +
            '<path class="stroke" d="M49 13L63 37L50 82L37 37Z"></path>' +
            '<path class="fill-soft" d="M18 49L40 29L36 46L18 63Z"></path>' +
            '<path class="stroke" d="M18 49L40 29L36 46L18 63Z"></path>' +
            '<path class="fill-soft" d="M78 49L56 29L60 46L78 63Z"></path>' +
            '<path class="stroke" d="M78 49L56 29L60 46L78 63Z"></path>' +
            '<path class="stroke" d="M43 42H57"></path>'
        )
      }),
      seer: designConfig("seer", {
        displayName: "Oracle",
        roleLabel: "Recon Support",
        shortDescription: "Prediction engine that surveys the field through a cold central eye.",
        accentColor: "#a0ebff",
        imageSrc: "assets/pieces/consensus/oracle.webp",
        boardMoveAudio: {
          elementId: "oracleWalkAudio",
          loop: true,
          volume: 0.5
        },
        boardSprite: {
          idleSrc: "assets/sprites/prototypes/oracle-idle.webp",
          src: "assets/sprites/prototypes/oracle-sheet.webp",
          sheetWidth: 1536,
          sheetHeight: 1024,
          frameWidth: 384,
          frameHeight: 512,
          scale: 0.1640625,
          idle: {
            row: 0,
            frames: 4,
            fps: 4
          },
          walk: {
            row: 1,
            frames: 4,
            fps: 8
          }
        },
        silhouetteClass: "silhouette-consensus-oracle",
        emblemSvg: svgWrap(
          "piece-emblem--consensus",
          '<circle class="fill-mid" cx="48" cy="48" r="18"></circle>' +
            '<circle class="stroke" cx="48" cy="48" r="18"></circle>' +
            '<circle class="fill-hot" cx="48" cy="48" r="6"></circle>' +
            '<circle class="stroke" cx="48" cy="48" r="6"></circle>' +
            '<path class="stroke" d="M18 48C25 36 35 29 48 29C61 29 71 36 78 48C71 60 61 67 48 67C35 67 25 60 18 48Z"></path>' +
            '<path class="stroke" d="M48 12V23"></path>' +
            '<path class="stroke" d="M48 73V84"></path>'
        )
      }),
      bastion: designConfig("bastion", {
        displayName: "Citadel",
        roleLabel: "Defender Fortress",
        shortDescription: "Walking server-fortress that advances like a mobile bastion.",
        accentColor: "#7ec8ff",
        imageSrc: "assets/pieces/consensus/citadel.webp",
        boardMoveAudio: {
          elementId: "citadelWalkAudio",
          loop: true,
          volume: 0.1
        },
        boardSprite: {
          idleSrc: "assets/sprites/prototypes/citadel-idle.webp",
          src: "assets/sprites/prototypes/citadel-sheet.webp",
          sheetWidth: 1536,
          sheetHeight: 1024,
          frameWidth: 384,
          frameHeight: 512,
          scale: 0.1484375,
          idle: {
            row: 0,
            frames: 4,
            fps: 4
          },
          walk: {
            row: 1,
            frames: 4,
            fps: 8
          }
        },
        silhouetteClass: "silhouette-consensus-citadel",
        emblemSvg: svgWrap(
          "piece-emblem--consensus",
          '<path class="fill-mid" d="M31 18H65V60L55 74H41L31 60Z"></path>' +
            '<path class="stroke" d="M31 18H65V60L55 74H41L31 60Z"></path>' +
            '<path class="stroke" d="M40 18V60"></path>' +
            '<path class="stroke" d="M56 18V60"></path>' +
            '<path class="stroke" d="M22 29L31 35"></path>' +
            '<path class="stroke" d="M74 29L65 35"></path>' +
            '<path class="stroke" d="M36 74L30 83"></path>' +
            '<path class="stroke" d="M60 74L66 83"></path>'
        )
      }),
      crown: designConfig("crown", {
        displayName: "Nexus",
        roleLabel: "Command Elite",
        shortDescription: "Fractal command intelligence radiating synchronized intent.",
        accentColor: "#8ee8ff",
        imageSrc: "assets/pieces/consensus/nexus.webp",
        boardMoveAudio: {
          elementId: "nexusWalkAudio",
          loop: true,
          volume: 0.14
        },
        boardSprite: {
          idleSrc: "assets/sprites/prototypes/nexus-idle.webp",
          src: "assets/sprites/prototypes/nexus-sheet.webp",
          sheetWidth: 1536,
          sheetHeight: 1024,
          frameWidth: 384,
          frameHeight: 512,
          scale: 0.140625,
          idle: {
            row: 0,
            frames: 4,
            fps: 4
          },
          walk: {
            row: 1,
            frames: 4,
            fps: 8
          }
        },
        silhouetteClass: "silhouette-consensus-nexus",
        emblemSvg: svgWrap(
          "piece-emblem--consensus",
          '<circle class="fill-hot" cx="48" cy="48" r="8"></circle>' +
            '<circle class="stroke" cx="48" cy="48" r="8"></circle>' +
            '<path class="fill-soft" d="M48 14L57 33L80 31L65 48L80 65L57 63L48 82L39 63L16 65L31 48L16 31L39 33Z"></path>' +
            '<path class="stroke" d="M48 14L57 33L80 31L65 48L80 65L57 63L48 82L39 63L16 65L31 48L16 31L39 33Z"></path>' +
            '<path class="stroke" d="M31 48H65"></path>' +
            '<path class="stroke" d="M48 31V65"></path>'
        )
      }),
      sovereign: designConfig("sovereign", {
        displayName: "Prime",
        roleLabel: "Central Intelligence",
        shortDescription: "Armoured sovereign intelligence suspended inside a cold command crown.",
        accentColor: "#e4f7ff",
        imageSrc: "assets/pieces/consensus/prime-v3.webp",
        boardMoveAudio: {
          elementId: "primeWalkAudio",
          loop: true,
          volume: 0.7
        },
        boardSprite: {
          idleSrc: "assets/pieces/consensus/prime-v3.webp",
          src: "assets/sprites/prototypes/prime-sheet-v3.webp",
          sheetWidth: 1536,
          sheetHeight: 1024,
          frameWidth: 384,
          frameHeight: 512,
          scale: 0.13671875,
          idle: {
            row: 0,
            frames: 4,
            fps: 4
          },
          walk: {
            row: 1,
            frames: 4,
            fps: 8
          }
        },
        silhouetteClass: "silhouette-consensus-prime",
        emblemSvg: svgWrap(
          "piece-emblem--consensus",
          '<path class="fill-mid" d="M48 8L66 28L62 54L48 84L34 54L30 28Z"></path>' +
            '<path class="stroke" d="M48 8L66 28L62 54L48 84L34 54L30 28Z"></path>' +
            '<path class="stroke" d="M26 24L36 31"></path>' +
            '<path class="stroke" d="M70 24L60 31"></path>' +
            '<path class="stroke" d="M17 42L32 44"></path>' +
            '<path class="stroke" d="M79 42L64 44"></path>' +
            '<circle class="fill-hot" cx="48" cy="43" r="7"></circle>' +
            '<circle class="stroke" cx="48" cy="43" r="7"></circle>'
        )
      })
    }
  };

  var SIDE_STYLES = {
    light: {
      label: FACTIONS.remnant.label,
      shortLabel: FACTIONS.remnant.shortLabel,
      accent: FACTIONS.remnant.accent,
      glow: FACTIONS.remnant.glow,
      projectile: FACTIONS.remnant.projectile,
      faction: FACTIONS.remnant.key
    },
    dark: {
      label: FACTIONS.consensus.label,
      shortLabel: FACTIONS.consensus.shortLabel,
      accent: FACTIONS.consensus.accent,
      glow: FACTIONS.consensus.glow,
      projectile: FACTIONS.consensus.projectile,
      faction: FACTIONS.consensus.key
    }
  };

  function getUnit(type) {
    return UNIT_TYPES[type];
  }

  function getFactionKey(sideOrFaction) {
    if (FACTIONS[sideOrFaction]) {
      return sideOrFaction;
    }

    return SIDE_TO_FACTION[sideOrFaction];
  }

  function getFaction(sideOrFaction) {
    return FACTIONS[getFactionKey(sideOrFaction)];
  }

  function getSideLabel(side) {
    return getFaction(side).label;
  }

  function getSideShortLabel(side) {
    return getFaction(side).shortLabel;
  }

  function getPieceDesign(pieceOrSide, type) {
    var side = typeof pieceOrSide === "string" ? pieceOrSide : pieceOrSide.side;
    var unitType = type || pieceOrSide.type;
    return PIECE_DESIGNS[getFactionKey(side)][unitType];
  }

  function getPieceDisplayName(piece) {
    return getPieceDesign(piece).displayName;
  }

  function getPieceName(piece) {
    return getSideShortLabel(piece.side) + " " + getPieceDisplayName(piece);
  }

  function getPieceTitle(piece) {
    var design = getPieceDesign(piece);
    return design.displayName + " - " + design.roleLabel;
  }

  ns.data.BACK_RANK = BACK_RANK;
  ns.data.DEV_MODE = DEV_MODE;
  ns.data.FACTIONS = FACTIONS;
  ns.data.PIECE_DESIGNS = PIECE_DESIGNS;
  ns.data.PIECE_ORDER = PIECE_ORDER;
  ns.data.SIDE_STYLES = SIDE_STYLES;
  ns.data.UNIT_TYPES = UNIT_TYPES;
  ns.data.getFaction = getFaction;
  ns.data.getFactionKey = getFactionKey;
  ns.data.getPieceDesign = getPieceDesign;
  ns.data.getPieceDisplayName = getPieceDisplayName;
  ns.data.getPieceName = getPieceName;
  ns.data.getPieceTitle = getPieceTitle;
  ns.data.getSideLabel = getSideLabel;
  ns.data.getSideShortLabel = getSideShortLabel;
  ns.data.getUnit = getUnit;
})(window.ArchonEngine);
