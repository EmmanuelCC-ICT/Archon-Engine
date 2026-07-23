(function (ns) {
  function normalize(x, y) {
    var length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function roundHealth(value) {
    return Math.max(0, Math.ceil(value));
  }

  function getSpritePose(sprite, poseName) {
    var pose = sprite[poseName] || sprite.idle;

    return {
      row: pose.row || 0,
      frames: pose.frames || 4,
      fps: pose.fps || 4
    };
  }

  function getSpriteFrameIndex(pose, now, offsetMs) {
    var frameDuration = 1000 / pose.fps;
    return Math.floor((now + offsetMs) / frameDuration) % pose.frames;
  }

  function getPieceIdNumber(id) {
    var match = String(id || "").match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  function drawUnitGlyph(ctx, type, x, y, size, color) {
    var scale = size / 24;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (type === "ward") {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(9, -6);
      ctx.lineTo(9, 3);
      ctx.quadraticCurveTo(9, 11, 0, 17);
      ctx.quadraticCurveTo(-9, 11, -9, 3);
      ctx.lineTo(-9, -6);
      ctx.closePath();
      ctx.globalAlpha = 0.18;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(0, 9);
      ctx.moveTo(-6, 3);
      ctx.lineTo(6, 3);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (type === "lancer") {
      ctx.beginPath();
      ctx.moveTo(-8, 10);
      ctx.lineTo(0, -13);
      ctx.lineTo(10, -3);
      ctx.lineTo(0, 14);
      ctx.closePath();
      ctx.globalAlpha = 0.22;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, 7);
      ctx.lineTo(7, -4);
      ctx.moveTo(-1, -7);
      ctx.lineTo(9, 3);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (type === "seer") {
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.quadraticCurveTo(0, -10, 14, 0);
      ctx.quadraticCurveTo(0, 10, -14, 0);
      ctx.closePath();
      ctx.globalAlpha = 0.16;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.globalAlpha = 0.26;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(0, -9);
      ctx.moveTo(0, 14);
      ctx.lineTo(0, 9);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (type === "bastion") {
      ctx.beginPath();
      ctx.rect(-12, -10, 24, 20);
      ctx.globalAlpha = 0.16;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-12, -10);
      ctx.lineTo(-12, -15);
      ctx.lineTo(-7, -15);
      ctx.lineTo(-7, -10);
      ctx.moveTo(-2, -10);
      ctx.lineTo(-2, -15);
      ctx.lineTo(3, -15);
      ctx.lineTo(3, -10);
      ctx.moveTo(8, -10);
      ctx.lineTo(8, -15);
      ctx.lineTo(12, -15);
      ctx.lineTo(12, -10);
      ctx.moveTo(-5, 10);
      ctx.lineTo(-5, 1);
      ctx.lineTo(5, 1);
      ctx.lineTo(5, 10);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (type === "crown") {
      ctx.beginPath();
      ctx.moveTo(-12, 10);
      ctx.lineTo(-8, -7);
      ctx.lineTo(0, 1);
      ctx.lineTo(8, -11);
      ctx.lineTo(12, 10);
      ctx.closePath();
      ctx.globalAlpha = 0.18;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-9, 3);
      ctx.lineTo(9, 3);
      ctx.moveTo(8, -11);
      ctx.arc(8, -11, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.arc(0, -8, 6, 0, Math.PI * 2);
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.lineTo(0, 13);
    ctx.moveTo(-8, 4);
    ctx.lineTo(8, 4);
    ctx.moveTo(-6, 10);
    ctx.lineTo(6, 10);
    ctx.moveTo(-5, -14);
    ctx.lineTo(6, -3);
    ctx.stroke();
    ctx.restore();
  }

  function createArena(options) {
    var canvas = options.canvas;
    var ctx = canvas.getContext("2d");
    var active = false;
    var rafId = 0;
    var lastFrameTime = 0;
    var keys = Object.create(null);
    var battle = null;
    var spriteCache = Object.create(null);
    var humanShootAudio =
      options.humanShootAudio || (typeof document !== "undefined" ? document.getElementById("humanShootAudio") : null);
    var aiShootAudio = options.aiShootAudio || (typeof document !== "undefined" ? document.getElementById("aiShootAudio") : null);
    var humanBattleStrikeAudio =
      options.humanBattleStrikeAudio ||
      (typeof document !== "undefined" ? document.getElementById("humanBattleStrikeAudio") : null);
    var aiBattleStrikeAudio =
      options.aiBattleStrikeAudio ||
      (typeof document !== "undefined" ? document.getElementById("aiBattleStrikeAudio") : null);
    var humanShootVolume = typeof options.humanShootVolume === "number" ? options.humanShootVolume : 0.2;
    var aiShootVolume = typeof options.aiShootVolume === "number" ? options.aiShootVolume : 0.2;
    var humanBattleStrikeVolume = typeof options.humanBattleStrikeVolume === "number" ? options.humanBattleStrikeVolume : 0.8;
    var aiBattleStrikeVolume = typeof options.aiBattleStrikeVolume === "number" ? options.aiBattleStrikeVolume : 0.5;
    var callbacks = {
      onUpdate: function () {},
      onFinish: function () {}
    };

    function resetAudio(audio) {
      if (!audio) {
        return;
      }

      audio.pause();

      try {
        audio.currentTime = 0;
      } catch (error) {}
    }

    function playAudio(audio, options) {
      var playPromise;
      var settings = options || {};

      if (!audio) {
        return;
      }

      resetAudio(audio);
      if (typeof settings.volume === "number") {
        audio.volume = Math.max(0, Math.min(1, settings.volume));
      }

      try {
        playPromise = audio.play();
      } catch (error) {
        return;
      }

      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function () {});
      }
    }

    function playProjectileShootAudio(side) {
      playAudio(side === "light" ? humanShootAudio : aiShootAudio, {
        volume: side === "light" ? humanShootVolume : aiShootVolume
      });
    }

    function playHumanBattleStrikeAudio(attacker, target) {
      if (!attacker || !target || attacker.side !== "light" || target.side !== "dark" || attacker.attackStyle !== "melee") {
        return;
      }

      playAudio(humanBattleStrikeAudio, {
        volume: humanBattleStrikeVolume
      });
    }

    function playAiBattleStrikeAudio(attacker, target) {
      if (!attacker || !target || attacker.side !== "dark" || target.side !== "light" || attacker.attackStyle !== "melee") {
        return;
      }

      playAudio(aiBattleStrikeAudio, {
        volume: aiBattleStrikeVolume
      });
    }

    function ensureSpriteImage(src) {
      var image;

      if (!src) {
        return null;
      }

      image = spriteCache[src];

      if (!image) {
        image = new window.Image();
        image.decoding = "async";
        image.src = src;
        spriteCache[src] = image;
      }

      return image;
    }

    function getArenaSpriteScale(sprite) {
      if (sprite.battleScale) {
        return sprite.battleScale;
      }

      return clamp((sprite.scale || 0.14) * 2.2, 0.28, 0.37);
    }

    function getRigAim(fighter, target) {
      if (target && fighter.attackStyle === "melee") {
        return normalize(target.x - fighter.x, target.y - fighter.y);
      }

      return normalize(fighter.facingX || 0, fighter.facingY || 0);
    }

    function getAttackProgress(fighter, now) {
      if (fighter.attackAnimUntil <= now) {
        return 0;
      }

      return clamp(1 - (fighter.attackAnimUntil - now) / 180, 0, 1);
    }

    function getActiveArenaLimb(rig, aim) {
      if (rig.kind === "drone-claw") {
        return aim.x <= 0 ? rig.leftLimb : rig.rightLimb;
      }

      return rig.limb || null;
    }

    function getTurnDirection(value) {
      return value < 0 ? -1 : 1;
    }

    function getArenaLimbRotation(rig, limb, aim, now, fighter, attackProgress) {
      var baseTurn;
      var swingDirection;
      var swingOffset;

      if (rig.kind === "drone-claw") {
        baseTurn = clamp(limb.baseTurn + aim.y * limb.aimTurnY, limb.minTurn, limb.maxTurn);
        swingDirection = getTurnDirection(limb.baseTurn);
      } else {
        baseTurn = clamp(aim.x * limb.aimTurnX + aim.y * limb.aimTurnY, limb.minTurn, limb.maxTurn);
        swingDirection = getTurnDirection(baseTurn || aim.x || 1);
      }

      swingOffset =
        attackProgress > 0
          ? (attackProgress * 2 - 1) * rig.attackArc * swingDirection
          : Math.sin((now + fighter.animOffsetMs) * 0.006) * rig.idleArc * swingDirection;

      return {
        rotation: baseTurn + swingOffset,
        swingDirection: swingDirection
      };
    }

    function eraseArenaLimb(image, sx, sy, limb, drawX, drawY, scaleX, scaleY) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(
        image,
        sx + limb.sourceX,
        sy + limb.sourceY,
        limb.width,
        limb.height,
        drawX + limb.sourceX * scaleX,
        drawY + limb.sourceY * scaleY,
        limb.width * scaleX,
        limb.height * scaleY
      );
      ctx.restore();
    }

    function drawArenaLimbSlice(image, sx, sy, limb, drawX, drawY, scaleX, scaleY, rotation, alpha, flash) {
      var pivotX = drawX + limb.pivotX * scaleX;
      var pivotY = drawY + limb.pivotY * scaleY;
      var localPivotX = (limb.pivotX - limb.sourceX) * scaleX;
      var localPivotY = (limb.pivotY - limb.sourceY) * scaleY;

      ctx.save();
      ctx.globalAlpha = alpha;
      if (flash) {
        ctx.filter = "brightness(1.5) saturate(0.75)";
      }
      ctx.translate(pivotX, pivotY);
      ctx.rotate(rotation);
      ctx.drawImage(
        image,
        sx + limb.sourceX,
        sy + limb.sourceY,
        limb.width,
        limb.height,
        -localPivotX,
        -localPivotY,
        limb.width * scaleX,
        limb.height * scaleY
      );
      ctx.filter = "none";
      ctx.restore();
    }

    function drawArenaRig(fighter, target, now, image, sx, sy, drawX, drawY, drawWidth, drawHeight, flash) {
      var rig = fighter.design.arenaRig;
      var aim;
      var attackProgress;
      var limb;
      var rotationState;
      var scaleX;
      var scaleY;

      if (!rig || fighter.attackStyle !== "melee") {
        return;
      }

      aim = getRigAim(fighter, target);
      attackProgress = getAttackProgress(fighter, now);
      limb = getActiveArenaLimb(rig, aim);

      if (!limb) {
        return;
      }

      rotationState = getArenaLimbRotation(rig, limb, aim, now, fighter, attackProgress);
      scaleX = drawWidth / fighter.design.boardSprite.frameWidth;
      scaleY = drawHeight / fighter.design.boardSprite.frameHeight;

      eraseArenaLimb(image, sx, sy, limb, drawX, drawY, scaleX, scaleY);

      if (attackProgress > 0 && rig.attackGhostAlpha > 0) {
        drawArenaLimbSlice(
          image,
          sx,
          sy,
          limb,
          drawX,
          drawY,
          scaleX,
          scaleY,
          rotationState.rotation - limb.ghostLag * rotationState.swingDirection,
          rig.attackGhostAlpha,
          flash
        );
      }

      drawArenaLimbSlice(image, sx, sy, limb, drawX, drawY, scaleX, scaleY, rotationState.rotation, 1, flash);
    }

    function buildFighter(piece, x, y, modifier) {
      var unit = ns.data.getUnit(piece.type);
      var sideStyle = ns.data.SIDE_STYLES[piece.side];
      var design = ns.data.getPieceDesign(piece);
      var territoryBonus = modifier || {};
      var maxHealth = unit.battle.health + (territoryBonus.healthBonus || 0);

      // Fighters inherit their persistent board health so surviving battles matters.
      return {
        piece: piece,
        design: design,
        side: piece.side,
        name: ns.data.getPieceName(piece),
        unit: unit,
        x: x,
        y: y,
        radius: unit.battle.radius,
        health: Math.min(maxHealth, piece.health + (territoryBonus.healthBonus || 0)),
        maxHealth: maxHealth,
        speed: unit.battle.speed + (territoryBonus.speedBonus || 0),
        damage: unit.battle.damage + (territoryBonus.damageBonus || 0),
        range: unit.battle.range,
        cooldown: unit.battle.cooldown * 1000 * (territoryBonus.cooldownMultiplier || 1),
        projectileSpeed: unit.battle.projectileSpeed,
        projectileRadius: unit.battle.projectileRadius,
        attackStyle: unit.battle.attackStyle,
        lastAttackAt: -1000,
        facingX: piece.side === "light" ? 1 : -1,
        facingY: 0,
        flashUntil: 0,
        attackAnimUntil: 0,
        isMoving: false,
        spriteImage: design.boardSprite ? ensureSpriteImage(design.boardSprite.src) : null,
        spriteScale: design.boardSprite ? getArenaSpriteScale(design.boardSprite) : 1,
        animOffsetMs: (getPieceIdNumber(piece.id) % 9) * 53,
        accent: sideStyle.accent,
        projectileColor: sideStyle.projectile,
        glow: sideStyle.glow
      };
    }

    function buildSnapshot() {
      return {
        playerName: battle.player.name,
        enemyName: battle.enemy.name,
        playerHealth: roundHealth(battle.player.health),
        playerMaxHealth: battle.player.maxHealth,
        enemyHealth: roundHealth(battle.enemy.health),
        enemyMaxHealth: battle.enemy.maxHealth,
        elapsed: battle.elapsed,
        overchargeActive: battle.overchargeActive,
        resultText: battle.result ? battle.result.summary : ""
      };
    }

    function syncHud(now) {
      if (now - battle.lastHudUpdate < 75 && !battle.result) {
        return;
      }
      battle.lastHudUpdate = now;
      callbacks.onUpdate(buildSnapshot());
    }

    function setKeyState(event, value) {
      if (!active) {
        return;
      }

      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === " " ||
        event.key === "Spacebar" ||
        event.key.toLowerCase() === "w" ||
        event.key.toLowerCase() === "a" ||
        event.key.toLowerCase() === "s" ||
        event.key.toLowerCase() === "d"
      ) {
        event.preventDefault();
      }

      keys[event.key] = value;
    }

    function handleKeyDown(event) {
      setKeyState(event, true);
    }

    function handleKeyUp(event) {
      setKeyState(event, false);
    }

    function clearKeys() {
      keys = Object.create(null);
    }

    function moveWithinBounds(fighter, dx, dy, dt) {
      fighter.x = clamp(fighter.x + dx * fighter.speed * dt, fighter.radius + 8, canvas.width - fighter.radius - 8);
      fighter.y = clamp(fighter.y + dy * fighter.speed * dt, fighter.radius + 8, canvas.height - fighter.radius - 8);
      fighter.isMoving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;

      if (dx || dy) {
        fighter.facingX = dx;
        fighter.facingY = dy;
      }
    }

    function getInputVector() {
      var x = 0;
      var y = 0;

      if (keys.ArrowLeft || keys.a || keys.A) {
        x -= 1;
      }
      if (keys.ArrowRight || keys.d || keys.D) {
        x += 1;
      }
      if (keys.ArrowUp || keys.w || keys.W) {
        y -= 1;
      }
      if (keys.ArrowDown || keys.s || keys.S) {
        y += 1;
      }

      return normalize(x, y);
    }

    function distanceBetween(left, right) {
      return Math.hypot(right.x - left.x, right.y - left.y);
    }

    function segmentIntersectsCircle(startX, startY, endX, endY, centerX, centerY, radius) {
      var deltaX = endX - startX;
      var deltaY = endY - startY;
      var lengthSq = deltaX * deltaX + deltaY * deltaY;
      var projection;
      var closestX;
      var closestY;

      if (!lengthSq) {
        return Math.hypot(centerX - startX, centerY - startY) <= radius;
      }

      projection = ((centerX - startX) * deltaX + (centerY - startY) * deltaY) / lengthSq;
      projection = clamp(projection, 0, 1);
      closestX = startX + deltaX * projection;
      closestY = startY + deltaY * projection;

      return Math.hypot(centerX - closestX, centerY - closestY) <= radius;
    }

    function createImpact(x, y, color) {
      battle.effects.push({
        x: x,
        y: y,
        color: color,
        radius: 10,
        life: 0.22
      });
    }

    function applyDamage(target, amount, now, color) {
      target.health = Math.max(0, target.health - amount);
      target.flashUntil = now + 120;
      createImpact(target.x, target.y, color);
    }

    function fireProjectile(attacker, target, now) {
      var aim = normalize(target.x - attacker.x, target.y - attacker.y);
      var launchDistance = Math.min(
        attacker.radius + 8,
        Math.max(0, distanceBetween(attacker, target) - target.radius - attacker.projectileRadius)
      );
      var startX = attacker.x + aim.x * launchDistance;
      var startY = attacker.y + aim.y * launchDistance;

      battle.projectiles.push({
        side: attacker.side,
        x: startX,
        y: startY,
        previousX: startX,
        previousY: startY,
        vx: aim.x * attacker.projectileSpeed,
        vy: aim.y * attacker.projectileSpeed,
        damage: attacker.damage,
        radius: attacker.projectileRadius,
        color: attacker.projectileColor,
        ownerId: attacker.piece.id
      });
      playProjectileShootAudio(attacker.side);

      attacker.lastAttackAt = now;
      attacker.attackAnimUntil = now + 180;
      attacker.facingX = aim.x;
      attacker.facingY = aim.y;
    }

    function attemptAttack(attacker, target, now) {
      var distance = distanceBetween(attacker, target);

      if (now - attacker.lastAttackAt < attacker.cooldown) {
        return;
      }

      if (distance > attacker.range + target.radius + 6) {
        return;
      }

      if (attacker.attackStyle === "melee") {
        attacker.lastAttackAt = now;
        attacker.attackAnimUntil = now + 180;
        attacker.facingX = normalize(target.x - attacker.x, target.y - attacker.y).x;
        attacker.facingY = normalize(target.x - attacker.x, target.y - attacker.y).y;
        applyDamage(target, attacker.damage, now, attacker.accent);
        playHumanBattleStrikeAudio(attacker, target);
        playAiBattleStrikeAudio(attacker, target);
        return;
      }

      fireProjectile(attacker, target, now);
    }

    function getThreatVector(fighter) {
      var index;
      var projectile;
      var toFighterX;
      var toFighterY;
      var distance;
      var travel;
      var bestThreat = null;

      for (index = 0; index < battle.projectiles.length; index += 1) {
        projectile = battle.projectiles[index];
        if (projectile.side === fighter.side) {
          continue;
        }

        toFighterX = fighter.x - projectile.x;
        toFighterY = fighter.y - projectile.y;
        distance = Math.hypot(toFighterX, toFighterY);
        travel = (toFighterX * projectile.vx + toFighterY * projectile.vy) / ((Math.hypot(projectile.vx, projectile.vy) || 1) * (distance || 1));

        if (distance < 170 && travel > 0.82) {
          bestThreat = {
            vx: projectile.vx,
            vy: projectile.vy,
            distance: distance
          };
          break;
        }
      }

      return bestThreat;
    }

    function updateEnemyAI(dt, now) {
      var fighter = battle.enemy;
      var target = battle.player;
      var threat = getThreatVector(fighter);
      var deltaX = target.x - fighter.x;
      var deltaY = target.y - fighter.y;
      var distance = Math.hypot(deltaX, deltaY) || 1;
      var moveX = 0;
      var moveY = 0;
      var desiredRange;
      var orbit;
      var dodge;

      // The AI sidesteps obvious projectile lanes, otherwise it closes or kites by unit range.
      if (threat) {
        dodge = normalize(-threat.vy, threat.vx);
        moveX = dodge.x;
        moveY = dodge.y;
      } else {
        desiredRange = fighter.attackStyle === "melee" ? fighter.range * 0.72 : fighter.range * 0.84;
        if (distance > desiredRange + 20) {
          moveX = deltaX / distance;
          moveY = deltaY / distance;
        } else if (fighter.attackStyle === "projectile" && distance < desiredRange - 28) {
          moveX = -deltaX / distance;
          moveY = -deltaY / distance;
        } else {
          orbit = normalize(-deltaY, deltaX);
          moveX = orbit.x * 0.7;
          moveY = orbit.y * 0.7;
        }
      }

      moveWithinBounds(fighter, moveX, moveY, dt);
      attemptAttack(fighter, target, now);
    }

    function updateProjectiles(dt, now) {
      var survivors = [];
      var index;
      var projectile;
      var target;
      var distance;

      for (index = 0; index < battle.projectiles.length; index += 1) {
        projectile = battle.projectiles[index];
        projectile.previousX = projectile.x;
        projectile.previousY = projectile.y;
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;

        if (
          projectile.x < -24 ||
          projectile.x > canvas.width + 24 ||
          projectile.y < -24 ||
          projectile.y > canvas.height + 24
        ) {
          continue;
        }

        target = projectile.side === battle.player.side ? battle.enemy : battle.player;
        distance = Math.hypot(target.x - projectile.x, target.y - projectile.y);

        if (
          distance <= target.radius + projectile.radius ||
          segmentIntersectsCircle(
            projectile.previousX,
            projectile.previousY,
            projectile.x,
            projectile.y,
            target.x,
            target.y,
            target.radius + projectile.radius
          )
        ) {
          applyDamage(target, projectile.damage, now, projectile.color);
          continue;
        }

        survivors.push(projectile);
      }

      battle.projectiles = survivors;
    }

    function updateEffects(dt) {
      var effects = [];
      var index;
      var effect;

      for (index = 0; index < battle.effects.length; index += 1) {
        effect = battle.effects[index];
        effect.life -= dt;
        effect.radius += 48 * dt;
        if (effect.life > 0) {
          effects.push(effect);
        }
      }

      battle.effects = effects;
    }

    function updateOvercharge(now) {
      if (battle.elapsed < battle.overchargeStartsAt) {
        return;
      }

      // Long duels trigger arena damage so the board loop cannot stall indefinitely.
      battle.overchargeActive = true;

      if (now - battle.lastOverchargeAt > 3000) {
        battle.lastOverchargeAt = now;
        applyDamage(battle.player, 5, now, "#d96458");
        applyDamage(battle.enemy, 5, now, "#d96458");
      }
    }

    function maybeFinish(now) {
      var attackerDown = battle.attacker.health <= 0;
      var defenderDown = battle.defender.health <= 0;
      var winner;
      var loser;

      if (!attackerDown && !defenderDown) {
        return false;
      }

      if (!battle.result) {
        winner = attackerDown && defenderDown ? battle.defender : attackerDown ? battle.defender : battle.attacker;
        loser = winner === battle.attacker ? battle.defender : battle.attacker;
        battle.attacker.isMoving = false;
        battle.defender.isMoving = false;
        battle.attacker.attackAnimUntil = 0;
        battle.defender.attackAnimUntil = 0;

        battle.result = {
          winnerSide: winner.side,
          loserSide: loser.side,
          attackerRemainingHealth: roundHealth(battle.attacker.health),
          defenderRemainingHealth: roundHealth(battle.defender.health),
          summary:
            ns.data.getPieceName(winner.piece) +
            " holds the square after defeating " +
            ns.data.getPieceName(loser.piece) +
            "."
        };
        battle.resultAt = now;
        syncHud(now);
      }

      if (now - battle.resultAt > 700) {
        finalizeBattle();
        return true;
      }

      return false;
    }

    function renderArena(now) {
      var pulse = Math.sin(now * 0.002) * 0.5 + 0.5;
      var floorGradient;
      var sideGradient;
      var gridX;
      var gridY;
      var ringRadius;
      var ringIndex;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      floorGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      floorGradient.addColorStop(0, "rgba(3, 9, 13, 0.08)");
      floorGradient.addColorStop(0.5, "rgba(3, 9, 13, 0.02)");
      floorGradient.addColorStop(1, "rgba(3, 9, 13, 0.14)");
      ctx.fillStyle = floorGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      sideGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      sideGradient.addColorStop(0, "rgba(224, 164, 92, 0.12)");
      sideGradient.addColorStop(0.34, "rgba(224, 164, 92, 0.02)");
      sideGradient.addColorStop(0.5, "rgba(8, 17, 22, 0)");
      sideGradient.addColorStop(0.66, "rgba(120, 221, 255, 0.02)");
      sideGradient.addColorStop(1, "rgba(120, 221, 255, 0.12)");
      ctx.fillStyle = sideGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      for (ringIndex = 0; ringIndex < 6; ringIndex += 1) {
        ringRadius = 54 + ringIndex * 34;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(244, 237, 219, " + (0.085 - ringIndex * 0.01) + ")";
        ctx.lineWidth = Math.max(0.8, 1.6 - ringIndex * 0.14);
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = "rgba(244, 237, 219, 0.045)";
      for (gridX = 0; gridX <= canvas.width; gridX += 48) {
        ctx.fillRect(gridX, 0, 1, canvas.height);
      }
      for (gridY = 0; gridY <= canvas.height; gridY += 48) {
        ctx.fillRect(0, gridY, canvas.width, 1);
      }

      ctx.strokeStyle = battle.overchargeActive ? "rgba(217, 100, 88, 0.45)" : "rgba(244, 214, 152, 0.18)";
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

      if (battle.overchargeActive) {
        ctx.fillStyle = "rgba(217, 100, 88, " + (0.04 + pulse * 0.06) + ")";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      drawFighter(battle.player, battle.enemy, now);
      drawFighter(battle.enemy, battle.player, now);
      drawProjectiles();
      drawEffects();

      ctx.fillStyle = "rgba(245, 236, 213, 0.64)";
      ctx.font = '14px "Avenir Next", "Segoe UI", sans-serif';
      ctx.fillText("Arena overcharge begins at 18 seconds.", 18, canvas.height - 30);
    }

    function drawFallbackFighter(fighter, now) {
      var flash = fighter.flashUntil > now;

      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = fighter.glow;
      ctx.arc(fighter.x, fighter.y, fighter.radius + 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = flash ? "#ffffff" : fighter.accent;
      ctx.arc(fighter.x, fighter.y, fighter.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
      ctx.lineWidth = 2;
      ctx.arc(fighter.x, fighter.y, fighter.radius + 4, 0, Math.PI * 2);
      ctx.stroke();

      drawUnitGlyph(ctx, fighter.piece.type, fighter.x, fighter.y, fighter.radius * 1.1, "#071015");
      ctx.restore();
    }

    function drawFighter(fighter, target, now) {
      var sprite = fighter.design.boardSprite;
      var image = fighter.spriteImage;
      var flash = fighter.flashUntil > now;
      var poseName = fighter.isMoving || fighter.attackAnimUntil > now ? "walk" : "idle";
      var pose;
      var frameIndex;
      var drawWidth;
      var drawHeight;
      var drawX;
      var drawY;
      var anchorY;
      var glowRadius;
      var shadowY;
      var sx;
      var sy;

      if (!sprite || !image || !image.complete || !image.naturalWidth) {
        drawFallbackFighter(fighter, now);
        return;
      }

      pose = getSpritePose(sprite, poseName);
      frameIndex = getSpriteFrameIndex(pose, now, fighter.animOffsetMs);
      drawWidth = sprite.frameWidth * fighter.spriteScale;
      drawHeight = sprite.frameHeight * fighter.spriteScale;
      anchorY = 0.58;
      drawX = fighter.x - drawWidth / 2;
      drawY = fighter.y - drawHeight * anchorY;
      glowRadius = Math.max(drawWidth, drawHeight) * 0.32;
      shadowY = drawY + drawHeight * 0.88;
      sx = frameIndex * sprite.frameWidth;
      sy = pose.row * sprite.frameHeight;

      ctx.save();

      ctx.beginPath();
      ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
      ctx.ellipse(fighter.x, shadowY, drawWidth * 0.22, Math.max(8, drawHeight * 0.05), 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = fighter.glow;
      ctx.globalAlpha = flash ? 0.34 : 0.2;
      ctx.arc(fighter.x, fighter.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (flash) {
        ctx.filter = "brightness(1.5) saturate(0.75)";
      }

      ctx.drawImage(image, sx, sy, sprite.frameWidth, sprite.frameHeight, drawX, drawY, drawWidth, drawHeight);
      ctx.filter = "none";

      if (flash) {
        ctx.beginPath();
        ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
        ctx.arc(fighter.x, fighter.y, glowRadius * 0.82, 0, Math.PI * 2);
        ctx.fill();
      }

      drawArenaRig(fighter, target, now, image, sx, sy, drawX, drawY, drawWidth, drawHeight, flash);

      ctx.restore();
    }

    function drawProjectiles() {
      var index;
      var projectile;

      for (index = 0; index < battle.projectiles.length; index += 1) {
        projectile = battle.projectiles[index];
        ctx.save();
        ctx.strokeStyle = projectile.color;
        ctx.globalAlpha = 0.38;
        ctx.lineWidth = Math.max(2, projectile.radius * 1.35);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(projectile.previousX, projectile.previousY);
        ctx.lineTo(projectile.x, projectile.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.fillStyle = projectile.color;
        ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawEffects() {
      var index;
      var effect;

      for (index = 0; index < battle.effects.length; index += 1) {
        effect = battle.effects[index];
        ctx.beginPath();
        ctx.strokeStyle = effect.color;
        ctx.globalAlpha = effect.life / 0.22;
        ctx.lineWidth = 2;
        ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    function updateFrame(now) {
      var dt;
      var input;

      if (!active) {
        return;
      }

      dt = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;
      battle.elapsed += dt;

      if (!battle.result) {
        // Player input, AI, projectiles, and hazards all resolve inside one animation loop.
        input = getInputVector();
        moveWithinBounds(battle.player, input.x, input.y, dt);

        if (keys[" "] || keys.Spacebar) {
          attemptAttack(battle.player, battle.enemy, now);
        }

        updateEnemyAI(dt, now);
        updateProjectiles(dt, now);
        updateEffects(dt);
        updateOvercharge(now);
      }

      renderArena(now);
      syncHud(now);

      if (!maybeFinish(now)) {
        rafId = window.requestAnimationFrame(updateFrame);
      }
    }

    function finalizeBattle() {
      var result = battle.result;

      callbacks.onFinish(result);
      stop();
    }

    function start(config) {
      var spawnOffset;

      stop();

      callbacks.onUpdate = config.onUpdate || callbacks.onUpdate;
      callbacks.onFinish = config.onFinish || callbacks.onFinish;
      active = true;
      lastFrameTime = performance.now();
      spawnOffset = Math.min(
        Math.max(160, Math.round(canvas.width * 0.333)),
        Math.floor(canvas.width / 2 - 120)
      );

      battle = {
        attacker: buildFighter(config.attacker, spawnOffset, canvas.height / 2, config.attackerModifiers),
        defender: buildFighter(config.defender, canvas.width - spawnOffset, canvas.height / 2, config.defenderModifiers),
        player: null,
        enemy: null,
        projectiles: [],
        effects: [],
        elapsed: 0,
        lastHudUpdate: -1,
        lastOverchargeAt: 0,
        overchargeStartsAt: config.overchargeStartsAt || 18,
        overchargeActive: false,
        result: null,
        resultAt: 0
      };

      battle.player = battle.attacker.side === "light" ? battle.attacker : battle.defender;
      battle.enemy = battle.player === battle.attacker ? battle.defender : battle.attacker;

      syncHud(lastFrameTime);
      rafId = window.requestAnimationFrame(updateFrame);
    }

    function stop() {
      active = false;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = 0;
      battle = null;
      clearKeys();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function isActive() {
      return active;
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearKeys);

    return {
      start: start,
      stop: stop,
      isActive: isActive
    };
  }

  ns.battle.createArena = createArena;
})(window.ArchonEngine);
