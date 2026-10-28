
  const level3 = {
    get lives() { return gameState.lives; },
    set lives(v) { gameState.lives = v; },
    gameOver: false,
    invulTimer: 0,
    victoryStarted: false,
    player: {
      x: V_WIDTH / 2,
      y: 520,
      vx: 0,
      vy: 0,
      facingRight: true,
      lastSafeX: V_WIDTH / 2,
      lastSafeY: 560,
      onGround: false,
      supportBranch: null
    },
    cameraY: 0,
    targetHeight: 3600, // Altura del árbol a escalar
    branches: [],
    nest: { x: V_WIDTH / 2, y: -3550 },

    getBranchReach(rise) {
      const jumpSpeed = Math.abs(JUMP_FORCE_PINE);
      if (rise < 0 || rise > PINE_MAX_RISE) return 0;
      const descendingTime = (jumpSpeed + Math.sqrt(jumpSpeed * jumpSpeed - 2 * PINE_GRAVITY * rise)) / PINE_GRAVITY;
      return MOVE_SPEED_PINE * descendingTime;
    },

    validateBranchReach(branch, previous, existingBranches = []) {
      const trunkLeft = V_WIDTH / 2 - 95;
      const trunkRight = V_WIDTH / 2 + 95;
      const setBranchX = () => {
        if (branch.type === 'nestBranch') {
          branch.x = V_WIDTH / 2;
        } else if (branch.branchSide < 0) {
          branch.x = trunkLeft - branch.w / 2 + PINE_BRANCH_INSET;
        } else if (branch.branchSide > 0) {
          branch.x = trunkRight + branch.w / 2 - PINE_BRANCH_INSET;
        }
      };
      setBranchX();

      let rise = previous.y - branch.y;
      rise = Math.max(BRANCH_VERTICAL_GAP * 0.96, Math.min(BRANCH_VERTICAL_GAP, rise));
      branch.y = previous.y - rise;

      if (!branch.sameSideException && branch.branchSide !== 0) {
        for (const candidate of existingBranches) {
          if (candidate.sameSideException || candidate.branchSide !== branch.branchSide) continue;
          if (Math.abs(candidate.y - branch.y) <= PINE_MAX_RISE) {
            branch.y = Math.min(branch.y, candidate.y - PINE_MAX_RISE * 1.05);
          }
        }
      }

      rise = previous.y - branch.y;
      if (rise > BRANCH_VERTICAL_GAP) {
        branch.branchSide = -previous.branchSide;
        branch.y = previous.y - BRANCH_VERTICAL_GAP;
        setBranchX();
        rise = BRANCH_VERTICAL_GAP;
      }

      const movingAllowance = (branch.type === 'moving' ? 18 : 0) + (previous.type === 'moving' ? 18 : 0);
      let edgeGap = Math.max(0, Math.abs(branch.x - previous.x) - (branch.w + previous.w) / 2) + movingAllowance;
      const allowedGap = this.getBranchReach(rise) * BRANCH_HORIZONTAL_REACH_RATIO;
      if (edgeGap > allowedGap) {
        branch.x -= Math.sign(branch.x - previous.x) * (edgeGap - allowedGap);
        edgeGap = allowedGap;
      }
      branch.baseX = branch.x;
      branch.previousX = branch.x;
      return branch;
    },

    init() {
            this.gameOver = false;
      this.invulTimer = 0;
      this.victoryStarted = false;
      duckInNest = true;
      this.player.x = V_WIDTH / 2;
      this.player.y = 520;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.facingRight = true;
      this.player.lastSafeX = V_WIDTH / 2;
      this.player.lastSafeY = 560;
      this.player.onGround = false;
      this.player.supportBranch = null;
      this.cameraY = 0;
      this.branches = [];

      // Rama base segura
      const baseBranch = {
        x: V_WIDTH / 2,
        y: 560,
        w: 240,
        type: 'normal',
        baseX: V_WIDTH / 2,
        broken: false,
        cracking: 0,
        angle: 0,
        foliageScale: 1
      };
      this.branches.push(baseBranch);

      // Una rama por piso, alternando hacia fuera del tronco en un zigzag regular.
      let previous = baseBranch;
      let row = 0;
      let previousRowFragile = false;
      while (previous.y > -this.targetHeight + 155) {
        const side = -previous.branchSide || (row % 2 === 0 ? -1 : 1);
        const width = 174 + Math.random() * 22;
        const type = row % 8 === 3 ? 'moving' : row % 9 === 7 ? 'spring' : 'normal';
        const branch = this.validateBranchReach({
          x: 0,
          y: previous.y - BRANCH_VERTICAL_GAP * (0.96 + Math.random() * 0.08),
          w: width,
          type,
          moveOffset: Math.random() * Math.PI * 2,
          broken: false,
          cracking: 0,
          branchSide: side,
          foliageScale: 0.82 + Math.random() * 0.32
        }, previous, this.branches);
        this.branches.push(branch);

        const addFragileAlternative = row > 0 && !previousRowFragile && Math.random() < SAME_SIDE_CHANCE;
        if (addFragileAlternative) {
          const fragileBranch = this.validateBranchReach({
            x: 0,
            y: branch.y,
            w: 160 + Math.random() * 18,
            type: 'fragile',
            moveOffset: 0,
            broken: false,
            cracking: 0,
            branchSide: previous.branchSide,
            sameSideException: true,
            foliageScale: 0.82 + Math.random() * 0.32
          }, previous, this.branches);
          this.branches.push(fragileBranch);
        }

        previous = branch;
        previousRowFragile = addFragileAlternative;
        row++;
      }

      // Plataforma final ancha y estable, con el nido justo encima.
      this.nest.x = V_WIDTH / 2;
      const nestBranch = this.validateBranchReach({
        x: V_WIDTH / 2,
        y: previous.y - BRANCH_VERTICAL_GAP,
        w: 696,
        type: 'nestBranch',
        broken: false,
        cracking: 0,
        angle: 0,
        foliageScale: 1
      }, previous, this.branches);
      this.nest.y = nestBranch.y - 18;
      this.branches.push(nestBranch);
    },

    update() {
      const p = this.player;

      if (this.gameOver || this.victoryStarted) return;

      if (this.invulTimer > 0) {
        this.invulTimer -= 1 / 60;
      }

      // Mover la rama bajo los pies junto con la niña, antes de leer controles.
      for (const b of this.branches) {
        b.previousX = b.x;
        if (b.cracking > 0) {
          b.cracking -= 1 / 60;
          if (b.cracking <= 0) b.broken = true;
        }
        if (b.type === 'moving') {
          b.x = b.baseX + Math.sin(stateTime * 2.5 + b.moveOffset) * 18;
        }
      }

      const wasGrounded = p.onGround && p.supportBranch && !p.supportBranch.broken;
      if (wasGrounded && p.supportBranch.type === 'moving') {
        p.x += p.supportBranch.x - p.supportBranch.previousX;
      }

      // Solo puede saltar desde el apoyo confirmado en el frame anterior.
      const jumpedFromSupport = keys.jumpPressed && wasGrounded;
      if (jumpedFromSupport) {
        p.vy = JUMP_FORCE_PINE;
        p.onGround = false;
        p.supportBranch = null;
        keys.jumpPressed = false;
        audio.sfxJump();
      }

      // Movimiento horizontal ágil (MOVE_SPEED_PINE), sin teletransporte lateral.
      if (keys.left) {
        p.vx = -MOVE_SPEED_PINE;
        p.facingRight = false;
      } else if (keys.right) {
        p.vx = MOVE_SPEED_PINE;
        p.facingRight = true;
      } else {
        p.vx *= 0.82;
      }

      p.x += p.vx;
      p.x = Math.max(18, Math.min(V_WIDTH - 18, p.x));

      const previousY = p.y;
      const remainsOnBranch = wasGrounded && !jumpedFromSupport &&
        p.x >= p.supportBranch.x - p.supportBranch.w / 2 &&
        p.x <= p.supportBranch.x + p.supportBranch.w / 2;
      if (remainsOnBranch && !jumpedFromSupport) {
        p.y = p.supportBranch.y;
        p.vy = 0;
        p.onGround = true;
      } else {
        p.onGround = false;
        p.supportBranch = null;
        // Sin apoyo, la gravedad es la única fuerza vertical salvo salto o impulso.
        p.vy += GRAVITY * 0.85;
        p.y += p.vy;
      }

      // Colisión unidireccional: únicamente al caer, cruzando desde arriba la línea sólida.
      if (p.vy > 0) {
        for (const b of this.branches) {
          if (b.broken) continue;
          const overlapsPlatform = p.x >= b.x - b.w / 2 && p.x <= b.x + b.w / 2;
          const crossedTop = previousY <= b.y && p.y >= b.y;
          if (!overlapsPlatform || !crossedTop) continue;

          p.y = b.y;
          if (b.type === 'nestBranch') {
            p.vy = 0;
            p.onGround = true;
            p.supportBranch = b;
            p.lastSafeX = p.x;
            p.lastSafeY = b.y;
            break;
          }

          if (b.type === 'spring') {
            p.vy = SPRING_BOOST_PINE;
            audio.sfxBounce();
          } else {
            p.vy = 0;
            p.onGround = true;
            p.supportBranch = b;
            if (b.type === 'fragile' && b.cracking <= 0) {
              b.cracking = 0.48;
              audio.sfxCrumble();
            }
            if (b.type !== 'fragile') {
              p.lastSafeX = b.x;
              p.lastSafeY = b.y;
            }
          }
          break;
        }
      }

      // Zona de activación que cubre el nido y el peluche, incluso si lo toca en el aire.
      if (Math.abs(p.x - this.nest.x) < 92 && p.y >= this.nest.y - 62 && p.y <= this.nest.y + 34) {
        this.cameraY = this.nest.y + 18 - FINAL_CINEMATIC.summitBranchY;
        this.victoryStarted = true;
        audio.sfxVictory();
        audio.sfxDuck();
        cineFinal.reset({ x: p.x, y: p.y, branchY: p.y });
        currentState = STATE.CINE_FINAL;
        pendingNextState = null;
        transitionAlpha = 0;
        return;
      }

      // La cámara sigue a la niña cuando sube (Doodle Jump)
      const summitProgress = Math.max(0, Math.min(1,
        (560 - p.y) / Math.max(1, 560 - (this.nest.y + 18))
      ));
      const crownProgress = Math.max(0, Math.min(1,
        (summitProgress - SUMMIT_CROWN_START_PROGRESS) / (1 - SUMMIT_CROWN_START_PROGRESS)
      ));
      const playerCameraY = p.y - V_HEIGHT * 0.55;
      const summitCameraY = this.nest.y + 18 - FINAL_CINEMATIC.summitBranchY;
      const targetCamY = playerCameraY + (summitCameraY - playerCameraY) * crownProgress;
      if (targetCamY < this.cameraY || crownProgress > 0) {
        // Seguimiento lineal suave, sin rebote ni overshoot.
        this.cameraY += (targetCamY - this.cameraY) * 0.12;
      }

      // Caída por debajo de la pantalla: pierde una vida y reaparece en la última rama estable
      if (p.y > this.cameraY + V_HEIGHT + 40) {
        audio.sfxSplash();
        this.lives = Math.max(0, this.lives - 1);

        if (this.lives <= 0) {
          this.gameOver = true;
          return;
        }

        // Reaparece exactamente en la última rama estable previa (nunca más arriba)
        p.x = p.lastSafeX;
        p.y = p.lastSafeY;
        p.vx = 0;
        p.vy = 0;
        p.onGround = false;
        p.supportBranch = null;
        this.invulTimer = BLINK_DURATION;

        // Se conserva la cámara al reaparecer para evitar cualquier salto de pantalla.
      }
    },

    draw(ctx) {
      cineFinal.buildAssets();
      const summitProgress = Math.max(0, Math.min(1,
        (560 - this.player.y) / Math.max(1, 560 - (this.nest.y + 18))
      ));
      const crownLinearProgress = Math.max(0, Math.min(1,
        (summitProgress - SUMMIT_CROWN_START_PROGRESS) / (1 - SUMMIT_CROWN_START_PROGRESS)
      ));
      const crownProgress = crownLinearProgress * crownLinearProgress * (3 - 2 * crownLinearProgress);
      ctx.save();
      ctx.translate(0, -this.cameraY);

      // Gradiente de cielo vertical (de atardecer a cielo estelar dorado)
      const skyGrad = ctx.createLinearGradient(0, 600, 0, -this.targetHeight - 200);
      skyGrad.addColorStop(0, '#533b68');
      skyGrad.addColorStop(0.3, '#312b54');
      skyGrad.addColorStop(0.7, '#1b1c3b');
      skyGrad.addColorStop(1, '#0e1124');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, -this.targetHeight - 300, V_WIDTH, this.targetHeight + 1000);

      // Interpolación visual continua al mismo cielo prerenderizado de la cinemática.
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = summitProgress;
      ctx.drawImage(cineFinal.assets.summitSky, 0, 0);
      ctx.restore();

      // Estrellas titilantes en las alturas
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 1 - summitProgress;
      for (let i = 0; i < 65; i++) {
        const starX = (i * 137) % V_WIDTH;
        const starY = -this.targetHeight + (i * 62);
        const blink = Math.sin(stateTime * 4 + i) * 0.4 + 0.6;
        ctx.globalAlpha = blink;
        ctx.fillRect(starX, starY, 2.5, 2.5);
      }
      ctx.globalAlpha = 1.0;

      // Tronco colosal del Gran Pino (en el centro)
      ctx.save();
      ctx.globalAlpha = 1 - crownProgress;
      const trunkWidth = 190;
      ctx.fillStyle = '#422c1d';
      ctx.fillRect(V_WIDTH / 2 - trunkWidth / 2, -this.targetHeight - 200, trunkWidth, this.targetHeight + 900);

      // Corteza del tronco
      ctx.strokeStyle = '#2b1b11';
      ctx.lineWidth = 4;
      for (let y = -this.targetHeight; y < 600; y += 75) {
        ctx.beginPath();
        ctx.moveTo(V_WIDTH / 2 - trunkWidth / 2 + 10, y);
        ctx.quadraticCurveTo(V_WIDTH / 2, y + 25, V_WIDTH / 2 + trunkWidth / 2 - 10, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(205, 151, 101, 0.28)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(V_WIDTH / 2 - 52, -this.targetHeight - 120);
      ctx.lineTo(V_WIDTH / 2 - 52, 690);
      ctx.moveTo(V_WIDTH / 2 + 48, -this.targetHeight - 120);
      ctx.lineTo(V_WIDTH / 2 + 48, 690);
      ctx.stroke();
      ctx.restore();

      // La copa prerenderizada comparte escala y coordenadas con la cinemática final.
      ctx.save();
      ctx.globalAlpha = crownProgress;
      ctx.drawImage(cineFinal.assets.summitTree, 0,
        this.nest.y + 18 - FINAL_CINEMATIC.summitBranchY);
      ctx.restore();

      // Dibujar Ramas del pino
      for (const b of this.branches) {
        if (b.broken) continue;
        if (b.type === 'nestBranch') {
          ctx.save();
          ctx.globalAlpha = 1 - crownProgress;
          this.drawBranch(ctx, b);
          ctx.restore();
        } else {
          ctx.save();
          ctx.globalAlpha = 1 - crownProgress;
          this.drawBranch(ctx, b);
          ctx.restore();
        }
      }

      // Dibujar Nido del águila en la cúspide
      this.drawEagleNest(ctx, this.nest.x, this.nest.y, duckInNest);

      // Dibujar Niña saltando (parpadeante si invulnerable tras reaparecer)
      const blinkVisible = isPlayerBlinkVisible(this.invulTimer);

      if (blinkVisible) {
        const pAnim = this.player.vy < 0 ? 'jump' : 'fall';
        drawGirl(ctx, this.player.x, this.player.y, {
          scale: 1.45 + crownProgress * 0.37,
          facingRight: this.player.facingRight,
          state: pAnim,
          animTime: stateTime,
          hasDuck: false
        });
      }

      // Partículas
      particles.draw(ctx, 0, this.cameraY);

      ctx.restore();

      // HUD de altitud y vidas
      this.drawHUD(ctx);

      // Modal de Game Over
      if (this.gameOver) {
        drawGameOverModal(ctx,
          () => { this.gameOver = false; gameState.retryLevel(); this.init(); },
          () => { this.gameOver = false; isPaused = false; gameState.resetLives(3); switchState(STATE.MENU); }
        );
      }
    },

    drawBranch(ctx, b) {
      ctx.save();
      const inheritedAlpha = ctx.globalAlpha;
      const side = b.type === 'nestBranch' ? 0 : (b.branchSide || (b.x < V_WIDTH / 2 ? -1 : 1));
      const shake = b.cracking > 0 ? Math.sin(stateTime * 58) * 2.5 : 0;
      const left = b.x - b.w / 2 + shake;
      const top = b.y;
      const dry = b.type === 'fragile';
      const needleColor = dry ? 'rgba(197, 174, 104, 0.62)' : 'rgba(126, 177, 139, 0.55)';

      // Conector corto y cónico que nace del costado del tronco hacia la plataforma.
      const trunkEdge = side < 0 ? V_WIDTH / 2 - 95 : V_WIDTH / 2 + 95;
      const innerEdge = side < 0 ? left + b.w : left;
      ctx.fillStyle = dry ? '#987958' : '#5b3b28';
      if (b.type === 'nestBranch') {
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#5b3b28';
        ctx.beginPath();
        ctx.moveTo(V_WIDTH / 2 - 42, top + 35); ctx.quadraticCurveTo(V_WIDTH / 2 - 88, top + 25, left + 16, top + 9);
        ctx.moveTo(V_WIDTH / 2 + 42, top + 35); ctx.quadraticCurveTo(V_WIDTH / 2 + 88, top + 25, left + b.w - 16, top + 9);
        ctx.stroke();
      } else {
        const rootInsideTrunk = trunkEdge - side * 52;
        ctx.beginPath();
        ctx.moveTo(rootInsideTrunk, top + 6);
        ctx.lineTo(innerEdge, top + 3);
        ctx.lineTo(innerEdge, top + 17);
        ctx.lineTo(rootInsideTrunk, top + 25);
        ctx.closePath();
        ctx.fill();
      }

      // Follaje decorativo detrás y debajo de la superficie, nunca sobre la hitbox.
      ctx.globalAlpha = inheritedAlpha * 0.72;
      ctx.fillStyle = needleColor;
      if (!dry && b.type !== 'nestBranch') {
        for (let i = 0; i < 6; i++) {
          const x = left + 12 + i * ((b.w - 24) / 5);
          const y = top + 20 + (i % 2) * 5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + side * 8, y + 18, x + side * 18, y + 23);
          ctx.quadraticCurveTo(x + side * 10, y + 7, x, y);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + side * 8, y + 12, 8, 4, side * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.strokeStyle = needleColor;
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
          const x = left + 18 + i * ((b.w - 36) / 4);
          ctx.beginPath();
          ctx.moveTo(x, top + 20);
          ctx.lineTo(x + side * 9, top + 31);
          ctx.moveTo(x, top + 22);
          ctx.lineTo(x - side * 7, top + 34);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = inheritedAlpha;

      // Plataforma sólida: esta barra, y solo esta barra, coincide con la hitbox.
      ctx.fillStyle = dry ? '#a9855d' : '#68472f';
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left + b.w, top);
      ctx.lineTo(left + b.w, top + 12);
      ctx.quadraticCurveTo(left + b.w, top + 17, left + b.w - 5, top + 17);
      ctx.lineTo(left + 5, top + 17);
      ctx.quadraticCurveTo(left, top + 17, left, top + 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = dry ? '#dfc28b' : '#c79a69';
      ctx.beginPath();
      ctx.roundRect(left + 5, top, b.w - 10, 3, 2);
      ctx.fill();
      ctx.strokeStyle = dry ? 'rgba(85, 57, 35, 0.85)' : 'rgba(53, 36, 25, 0.72)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(left + 10, top + 10);
      ctx.quadraticCurveTo(b.x, top + 13, left + b.w - 10, top + 9);
      ctx.stroke();

      if (b.type === 'moving') {
        ctx.fillStyle = 'rgba(255, 230, 165, 0.9)';
        ctx.beginPath();
        ctx.arc(b.x, top + 8, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.type === 'spring') {
        ctx.shadowColor = 'rgba(255, 205, 93, 0.8)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#d99152';
        ctx.beginPath();
        ctx.ellipse(b.x, top - 8, 13, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#f4d18a';
        ctx.beginPath();
        ctx.arc(b.x, top - 11, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (dry) {
        ctx.strokeStyle = '#6e5039';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x - 14, top + 3);
        ctx.lineTo(b.x - 7, top + 13);
        ctx.moveTo(b.x + 15, top + 4);
        ctx.lineTo(b.x + 8, top + 14);
        ctx.stroke();
      }

      ctx.restore();
    },

    drawEagleNest(ctx, x, y, showDuck = duckInNest) {
      ctx.save();
      ctx.translate(x, y);

      // Nido profundo: cuenco posterior, paja entrelazada y plumas.
      ctx.fillStyle = '#674832';
      ctx.beginPath();
      ctx.ellipse(0, 2, 92, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a8794c';
      ctx.beginPath();
      ctx.ellipse(0, -5, 68, 19, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d1a56e';
      ctx.lineWidth = 4;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 3 + i * 3, 76 - i * 5, 24 - i * 2, 0, 0.12, Math.PI - 0.12);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff0d8';
      ctx.beginPath();
      ctx.ellipse(-35, -12, 12, 5, -0.4, 0, Math.PI * 2);
      ctx.ellipse(37, -11, 11, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // El peluche se dibuja aparte y solo mientras la única bandera diga que sigue aquí.
      if (showDuck) {
        const bounce = Math.sin(stateTime * 2.5) * 1.5;
        ctx.fillStyle = 'rgba(255, 230, 150, 0.20)';
        ctx.beginPath();
        ctx.arc(0, -27 + bounce, 25, 0, Math.PI * 2);
        ctx.fill();
        drawDuckPlush(ctx, 0, -26 + bounce, 1.08, 0);
      }

      // Borde frontal redondeado delante de la parte inferior del peluche.
      ctx.strokeStyle = '#795437';
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.ellipse(0, 3, 82, 25, 0, 0.12, Math.PI - 0.12);
      ctx.stroke();
      ctx.strokeStyle = '#e0b779';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 1, 77, 22, 0, 0.16, Math.PI - 0.16);
      ctx.stroke();

      ctx.restore();
    },

    drawHUD(ctx) {
      // 1. Esquina superior izquierda: tarjeta de objetivo autoajustable al texto (maxW = 340)
      drawInstructionBox(ctx, 'Nivel 3: ¡Salta por las ramas del Gran Pino hasta el nido!', 24, 20, 340);

      ctx.save();
      ctx.fillStyle = 'rgba(28, 22, 36, 0.58)';
      ctx.beginPath(); ctx.roundRect(24, 76, 238, 30, 12); ctx.fill();
      ctx.fillStyle = '#fff0ce'; ctx.font = '500 15px Fredoka'; ctx.textAlign = 'left';
      ctx.fillText('Ctrl + M: probar cinemática', 36, 96);
      ctx.restore();

      // 2. Centro superior: 3 vidas mostradas como 3 corazones rojos
      drawHearts(ctx, gameState.lives, 3, V_WIDTH / 2, 24);

      ctx.save();

      // 3. Altímetro vertical en el lado derecho
      ctx.fillStyle = 'rgba(20, 24, 32, 0.65)';
      ctx.beginPath();
      ctx.roundRect(V_WIDTH - 65, 80, 42, 340, 16);
      ctx.fill();

      // Progreso de escalada
      const climbProgress = Math.min(1, Math.max(0, -this.cameraY / this.targetHeight));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.roundRect(V_WIDTH - 53, 95, 18, 310, 9);
      ctx.fill();

      ctx.fillStyle = '#4cc9f0';
      const barH = 310 * climbProgress;
      ctx.beginPath();
      ctx.roundRect(V_WIDTH - 53, 95 + 310 - barH, 18, barH, 9);
      ctx.fill();

      ctx.font = '22px Fredoka';
      ctx.textAlign = 'center';

      ctx.restore();
    }
  };
