/**
 * EL VIAJE DE ANIKA - NIVEL 5: EL ESCAPE DE LA CUEVA & CINEMÁTICA DEL TEMBLOR
 * 
 * Correcciones y dinámicas actualizadas:
 * 1. Manejo robusto de la tecla ENTER (Enter, NumpadEnter, e.key === 'Enter'):
 *    - Listener en captura sin depender del foco, preventDefault y blur de elementos activos.
 *    - Contador de pulsaciones reales por keydown (ignora event.repeat).
 *    - Modo depuración opcional con tecla F3 (muestra última tecla, subestado y pulsaciones).
 *    - Botón táctil en pantalla suma una pulsación por toque.
 * 2. Nueva dinámica de pulsaciones múltiples de ENTER:
 *    - Rocas grandes: pulsar ENTER varias veces (CLIMB_PRESSES = 8) para trepar con barra de progreso.
 *      Decae lentamente (CLIMB_DECAY) si se deja de presionar. Anika sube en etapas visibles.
 *    - Tramo 1 (Rocas): Salto desactivado. Se esquivan caminando lateralmente con aviso de 0.8 s.
 *      Mínimo espacio garantizado (EVENT_MIN_GAP) para esquivar.
 *    - Tramo 2 (Puente con huecos): Salto activo con Espacio/Arriba.
 *    - Tramo 3 (El derrumbe): ENTER repetido para correr (SPRINT_STEP_PER_PRESS). Derrumbe detrás a COLLAPSE_SPEED.
 *      Aviso con SPRINT_REACTION_TIME (2.5 s). Indicador claro de distancia al derrumbe.
 * 3. Aspecto de piedras realista e ilustrado:
 *    - 6 variantes de rocas que caen con siluetas irregulares, 3 tonos de facetas (luz, base, sombra),
 *      grietas finas, textura y borde iluminado.
 *    - 2 variantes de rocas grandes macizas y pesadas, más altas que Anika, con grietas, parches de musgo pastel
 *      y astillas en la base.
 *    - 4 variantes de fragmentos de impacto con 3 tonos (utilizados también en las piedritas del temblor).
 *    - Pre-renderizado en offscreen canvases reutilizables sin crear objetos en cada fotograma.
 *
 * Estilo ilustrado con formas redondeadas, paleta pastel cálida, sin sombras ovaladas y sin emojis.
 */

(function () {
  'use strict';

  // ==========================================
  // CONSTANTES DE LA CINEMÁTICA DEL TEMBLOR
  // ==========================================
  const QUAKE_TIME = 4.2;              // Duración total de la cinemática en segundos
  const QUAKE_SHAKE_AMPLITUDE = 4.2;   // Amplitud máxima del temblor suave de cámara (en píxeles)
  const QUAKE_FADE_TIME = 1.0;         // Duración del fundido suave a negro al terminar

  // ==========================================
  // CONSTANTES DEL NIVEL 5: EL ESCAPE DE LA CUEVA
  // ==========================================
  const LEVEL5_TOTAL_DIST = 5200;      // Distancia total del nivel en píxeles
  const TRAMO1_DIST = 2280;            // Fin del Tramo 1 (Derrumbe de rocas, sin salto)
  const TRAMO2_DIST = 4120;            // Fin del Tramo 2 (Puente con huecos y salto)
  // Tramo 3 va de TRAMO2_DIST a LEVEL5_TOTAL_DIST (Derrumbe del puente con sprint ENTER)

  // Físicas y movimiento
  const PLAYER_SPEED_NORMAL = 4.8;     // Velocidad normal de carrera con flechas/A-D
  const JUMP_FORCE_ESCAPE = -11.2;     // Impulso inicial del salto (Tramos 2 y 3)
  const JUMP_HOLD_BOOST_ESCAPE = -0.30;// Salto variable al mantener presionada la tecla
  const GRAVITY_ESCAPE = 0.58;         // Gravedad aplicada en el nivel
  const CAVE_GROUND_Y = 540;           // Altura del suelo y del puente
  const ABYSS_DEPTH_Y = 690;           // Altura para detectar caída al abismo

  // Dinámica de ENTER en Roca Grande (Tramo 1)
  const CLIMB_PRESSES = 8;             // Pulsaciones necesarias para trepar
  const CLIMB_DECAY = 1.35;            // Decaimiento por segundo al dejar de presionar
  const CLIMB_RANGE = 75;              // Distancia al frente de la roca para interactuar
  const ENTER_MASH_FEEDBACK = 0.18;    // Duración de animación de tecla hundida

  // Obstáculos Tramo 1 (Rocas cayendo)
  const ROCK_FALL_MIN = 1.8;           // Intervalo mínimo entre caídas de rocas (segundos)
  const ROCK_FALL_MAX = 3.2;           // Intervalo máximo entre caídas de rocas (segundos)
  const ROCK_WARN_TIME = 0.8;          // Tiempo de aviso previo desde el techo (segundos)
  const EVENT_MIN_GAP = 145;           // Separación horizontal mínima entre columnas de rocas

  // Obstáculos Tramo 2 (Puente con huecos)
  const HOLE_WARN_TIME = 0.7;          // Tiempo de aviso previo en tabla antes de caer

  // Dinámica de ENTER en Tramo 3 (El Derrumbe)
  const SPRINT_STEP_PER_PRESS = 28;    // Avance en píxeles por cada pulsación de ENTER
  const COLLAPSE_SPEED = 125;          // Velocidad del derrumbe persiguiendo a la niña (px/s)
  const SPRINT_REACTION_TIME = 2.5;    // Tiempo límite de aviso inicial antes del avance del derrumbe
  const INITIAL_COLLAPSE_GAP = 220;    // Ventaja inicial de distancia de Anika sobre el derrumbe

  // Parpadeo e invulnerabilidad
  const BLINK_COUNT = 2;               // Parpadeo exacto requerido
  const BLINK_DURATION = 1.5;          // Duración de invulnerabilidad tras recibir daño
  const RESPAWN_GRACE_TIME = 1.0;      // Gracia sin amenazas tras reaparecer

  // ==========================================
  // CANVASES OFFSCREEN PRE-RENDERIZADOS
  // ==========================================
  let offscreenReady = false;
  let bgCanvas = null;
  let foreGroundCanvas = null;
  let abyssCanvas = null;

  // Canvases de rocas y fragmentos
  const rockFallingCanvases = [];
  const bigRockCanvases = [];
  const fragmentCanvases = [];

  function buildCaveEscapeOffscreens(width, height) {
    if (offscreenReady && bgCanvas) return;

    // 1. Fondo de cueva profunda (tonos violetas y azules profundos con gradiente y estalactitas)
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = width;
    bgCanvas.height = height;
    const bgCtx = bgCanvas.getContext('2d');

    const gradBg = bgCtx.createLinearGradient(0, 0, 0, height);
    gradBg.addColorStop(0, '#191323');
    gradBg.addColorStop(0.45, '#281d36');
    gradBg.addColorStop(0.85, '#342646');
    gradBg.addColorStop(1, '#231830');
    bgCtx.fillStyle = gradBg;
    bgCtx.fillRect(0, 0, width, height);

    // Siluetas lejanas
    bgCtx.fillStyle = 'rgba(64, 48, 82, 0.55)';
    bgCtx.beginPath();
    bgCtx.moveTo(0, height * 0.65);
    bgCtx.quadraticCurveTo(200, height * 0.45, 420, height * 0.62);
    bgCtx.quadraticCurveTo(640, height * 0.42, 860, height * 0.64);
    bgCtx.quadraticCurveTo(1060, height * 0.48, width, height * 0.65);
    bgCtx.lineTo(width, height);
    bgCtx.lineTo(0, height);
    bgCtx.closePath();
    bgCtx.fill();

    // Iluminación cálida suave de fondo
    const glow1 = bgCtx.createRadialGradient(320, 380, 20, 320, 380, 280);
    glow1.addColorStop(0, 'rgba(255, 215, 160, 0.12)');
    glow1.addColorStop(1, 'rgba(255, 215, 160, 0)');
    bgCtx.fillStyle = glow1;
    bgCtx.fillRect(0, 0, width, height);

    const glow2 = bgCtx.createRadialGradient(920, 340, 20, 920, 340, 300);
    glow2.addColorStop(0, 'rgba(180, 160, 240, 0.11)');
    glow2.addColorStop(1, 'rgba(180, 160, 240, 0)');
    bgCtx.fillStyle = glow2;
    bgCtx.fillRect(0, 0, width, height);

    // Estalactitas del techo
    bgCtx.fillStyle = '#4a385f';
    const stalactites = [
      { x: 80, w: 60, h: 130 },
      { x: 220, w: 50, h: 90 },
      { x: 380, w: 70, h: 125 },
      { x: 560, w: 65, h: 105 },
      { x: 740, w: 80, h: 140 },
      { x: 920, w: 55, h: 95 },
      { x: 1100, w: 75, h: 135 },
      { x: 1230, w: 65, h: 110 }
    ];
    stalactites.forEach((s) => {
      bgCtx.beginPath();
      bgCtx.moveTo(s.x - s.w / 2, 0);
      bgCtx.quadraticCurveTo(s.x - s.w * 0.35, s.h * 0.65, s.x, s.h);
      bgCtx.quadraticCurveTo(s.x + s.w * 0.35, s.h * 0.65, s.x + s.w / 2, 0);
      bgCtx.closePath();
      bgCtx.fill();
    });

    // Cristales resplandecientes en el techo y paredes
    const crystals = [
      { x: 120, y: 120, c: '#7ee3f2', r: 6 },
      { x: 390, y: 115, c: '#fca5c2', r: 5 },
      { x: 575, y: 95, c: '#fde088', r: 7 },
      { x: 760, y: 130, c: '#7ee3f2', r: 7 },
      { x: 935, y: 88, c: '#fca5c2', r: 6 },
      { x: 1120, y: 125, c: '#fde088', r: 7 }
    ];
    crystals.forEach((cr) => {
      const crGlow = bgCtx.createRadialGradient(cr.x, cr.y, 1, cr.x, cr.y, cr.r * 3.2);
      crGlow.addColorStop(0, cr.c);
      crGlow.addColorStop(1, 'rgba(0,0,0,0)');
      bgCtx.fillStyle = crGlow;
      bgCtx.beginPath();
      bgCtx.arc(cr.x, cr.y, cr.r * 3.2, 0, Math.PI * 2);
      bgCtx.fill();

      bgCtx.fillStyle = '#ffffff';
      bgCtx.beginPath();
      bgCtx.moveTo(cr.x, cr.y - cr.r);
      bgCtx.lineTo(cr.x + cr.r * 0.6, cr.y);
      bgCtx.lineTo(cr.x, cr.y + cr.r);
      bgCtx.lineTo(cr.x - cr.r * 0.6, cr.y);
      bgCtx.closePath();
      bgCtx.fill();
    });

    // 2. Fondo del abismo (sin zonas negras, tonos violetas y azules profundos con niebla)
    abyssCanvas = document.createElement('canvas');
    abyssCanvas.width = width;
    abyssCanvas.height = height;
    const aCtx = abyssCanvas.getContext('2d');
    const abyssGrad = aCtx.createLinearGradient(0, CAVE_GROUND_Y, 0, height);
    abyssGrad.addColorStop(0, 'rgba(32, 22, 46, 0.95)');
    abyssGrad.addColorStop(0.35, '#181226');
    abyssGrad.addColorStop(0.7, '#130e20');
    abyssGrad.addColorStop(1, '#0e0918');
    aCtx.fillStyle = abyssGrad;
    aCtx.fillRect(0, CAVE_GROUND_Y, width, height - CAVE_GROUND_Y);

    // Cristales lejanos en el fondo del abismo
    const abyssCrystals = [
      { x: 140, y: 640, c: '#8b6ff0', r: 4 },
      { x: 360, y: 660, c: '#5fd8eb', r: 5 },
      { x: 620, y: 630, c: '#eb6bb0', r: 4 },
      { x: 880, y: 655, c: '#5fd8eb', r: 5 },
      { x: 1100, y: 635, c: '#ffd166', r: 4 }
    ];
    abyssCrystals.forEach(ac => {
      const g = aCtx.createRadialGradient(ac.x, ac.y, 1, ac.x, ac.y, 20);
      g.addColorStop(0, ac.c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      aCtx.fillStyle = g;
      aCtx.beginPath();
      aCtx.arc(ac.x, ac.y, 20, 0, Math.PI * 2);
      aCtx.fill();
    });

    // Niebla suave ondulada en el abismo
    aCtx.fillStyle = 'rgba(74, 52, 98, 0.28)';
    aCtx.beginPath();
    aCtx.moveTo(0, CAVE_GROUND_Y + 45);
    for (let x = 0; x <= width; x += 80) {
      const ny = CAVE_GROUND_Y + 45 + Math.sin(x * 0.015) * 14;
      aCtx.lineTo(x, ny);
    }
    aCtx.lineTo(width, height);
    aCtx.lineTo(0, height);
    aCtx.closePath();
    aCtx.fill();

    // 3. Suelo de roca firme del Tramo 1
    foreGroundCanvas = document.createElement('canvas');
    foreGroundCanvas.width = width;
    foreGroundCanvas.height = height;
    const fCtx = foreGroundCanvas.getContext('2d');

    const groundGrad = fCtx.createLinearGradient(0, CAVE_GROUND_Y, 0, height);
    groundGrad.addColorStop(0, '#564268');
    groundGrad.addColorStop(0.3, '#433452');
    groundGrad.addColorStop(1, '#2a2034');
    fCtx.fillStyle = groundGrad;
    fCtx.fillRect(0, CAVE_GROUND_Y, width, height - CAVE_GROUND_Y);

    // Borde superior iluminado del suelo
    fCtx.strokeStyle = 'rgba(255, 230, 200, 0.35)';
    fCtx.lineWidth = 3;
    fCtx.beginPath();
    fCtx.moveTo(0, CAVE_GROUND_Y + 1);
    fCtx.lineTo(width, CAVE_GROUND_Y + 1);
    fCtx.stroke();

    // Textura y guijarros en el suelo
    fCtx.fillStyle = '#3a2d46';
    for (let i = 20; i < width; i += 65) {
      fCtx.beginPath();
      fCtx.ellipse(i + (i % 23), CAVE_GROUND_Y + 12 + (i % 15), 10, 5, 0.1, 0, Math.PI * 2);
      fCtx.fill();
    }

    // 4. Pre-renderizar las 6 variantes de rocas que caen
    buildFallingRockVariants();

    // 5. Pre-renderizar las 2 variantes de rocas gigantes
    buildBigRockVariants();

    // 6. Pre-renderizar los 4 fragmentos y astillas
    buildFragmentVariants();

    offscreenReady = true;
  }

  // --- GENERACIÓN DE CANVASES DE ROCAS (3 TONOS, GRIETAS, FORMA IRREGULAR) ---

  function buildFallingRockVariants() {
    rockFallingCanvases.length = 0;

    const rockThemes = [
      // 0: Gris violáceo cálido
      { light: '#9380a5', base: '#6a577c', shadow: '#4a3b5a', outline: '#31233d', crack: '#261b30' },
      // 1: Azul grisáceo pálido
      { light: '#94a5b0', base: '#697a85', shadow: '#465660', outline: '#2f3b43', crack: '#232c32' },
      // 2: Marrón cálido pastel
      { light: '#a38d7f', base: '#7b6557', shadow: '#56443a', outline: '#3a2c24', crack: '#291d17' },
      // 3: Lavanda pétreo
      { light: '#9f8db1', base: '#756388', shadow: '#524362', outline: '#372a44', crack: '#281c33' },
      // 4: Ceniza oscuro
      { light: '#8b969e', base: '#636e75', shadow: '#434d53', outline: '#2c3439', crack: '#1f2529' },
      // 5: Púrpura suave
      { light: '#9b849c', base: '#725c73', shadow: '#4f3e50', outline: '#342735', crack: '#261b27' }
    ];

    const polyShapes = [
      // 0: Cráter asimétrico
      [[-16, -14], [3, -19], [17, -9], [18, 8], [4, 18], [-14, 15], [-19, 0]],
      // 1: Cincelada angulosa
      [[-14, -18], [11, -17], [19, -4], [15, 16], [-3, 19], [-18, 10], [-17, -8]],
      // 2: Bloque trapezoidal suavizado
      [[-18, -11], [0, -19], [18, -13], [19, 12], [-2, 19], [-19, 12]],
      // 3: Facetas hexagonales irregulares
      [[-12, -18], [13, -15], [19, 2], [12, 18], [-11, 18], [-19, -1]],
      // 4: Romboide rugoso
      [[-8, -19], [15, -12], [19, 11], [3, 19], [-16, 14], [-19, -6]],
      // 5: Prisma arqueado
      [[-15, -16], [7, -19], [19, -8], [17, 14], [-5, 19], [-19, 7]]
    ];

    polyShapes.forEach((verts, idx) => {
      const cv = document.createElement('canvas');
      cv.width = 56;
      cv.height = 56;
      const ctx = cv.getContext('2d');
      const theme = rockThemes[idx % rockThemes.length];

      ctx.save();
      ctx.translate(28, 28);

      // Trazo de silueta exterior con esquinas redondeadas
      ctx.beginPath();
      const n = verts.length;
      for (let i = 0; i < n; i++) {
        const curr = verts[i];
        const next = verts[(i + 1) % n];
        const mx = (curr[0] + next[0]) / 2;
        const my = (curr[1] + next[1]) / 2;
        if (i === 0) ctx.moveTo(mx, my);
        ctx.quadraticCurveTo(next[0], next[1], (next[0] + verts[(i + 2) % n][0]) / 2, (next[1] + verts[(i + 2) % n][1]) / 2);
      }
      ctx.closePath();

      // Relleno base (tono medio)
      ctx.fillStyle = theme.base;
      ctx.fill();

      // Cara de sombra (lateral derecha e inferior)
      ctx.save();
      ctx.clip();
      ctx.fillStyle = theme.shadow;
      ctx.beginPath();
      ctx.moveTo(-5, -10);
      ctx.lineTo(25, -5);
      ctx.lineTo(25, 25);
      ctx.lineTo(-10, 25);
      ctx.closePath();
      ctx.fill();

      // Cara iluminada (superior izquierda)
      ctx.fillStyle = theme.light;
      ctx.beginPath();
      ctx.moveTo(-25, -25);
      ctx.lineTo(15, -25);
      ctx.lineTo(2, 4);
      ctx.lineTo(-25, 4);
      ctx.closePath();
      ctx.fill();

      // Grietas finas en la roca
      ctx.strokeStyle = theme.crack;
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-2, 3);
      ctx.lineTo(6, 0);
      ctx.stroke();

      // Moteado de textura suave
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(-6, -9, 2.5, 2);
      ctx.fillRect(4, -11, 2, 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(5, 7, 2.5, 2);
      ctx.fillRect(-8, 9, 2, 2);

      ctx.restore();

      // Contorno general oscurecido
      ctx.strokeStyle = theme.outline;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Borde suave de luz en la cresta superior
      ctx.strokeStyle = 'rgba(255, 240, 220, 0.45)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(verts[0][0], verts[0][1]);
      ctx.lineTo(verts[1][0], verts[1][1]);
      ctx.lineTo(verts[2][0], verts[2][1]);
      ctx.stroke();

      ctx.restore();
      rockFallingCanvases.push(cv);
    });
  }

  function buildBigRockVariants() {
    bigRockCanvases.length = 0;

    const bigConfigs = [
      {
        w: 120, h: 96,
        theme: { light: '#8b769c', base: '#655276', shadow: '#443553', outline: '#2b1f35', crack: '#201629' },
        moss: '#6f9273', mossLight: '#8cb390'
      },
      {
        w: 120, h: 96,
        theme: { light: '#918296', base: '#6c5c71', shadow: '#4a3d4f', outline: '#2e2432', crack: '#221926' },
        moss: '#739575', mossLight: '#8fb792'
      }
    ];

    bigConfigs.forEach(cfg => {
      const cv = document.createElement('canvas');
      cv.width = 140;
      cv.height = 120;
      const ctx = cv.getContext('2d');
      const cx = 70;
      const cy = 110; // Base apoyada en el suelo

      ctx.save();
      ctx.translate(cx, cy);

      // Silueta pesada, asimétrica y maciza (más alta que Anika)
      ctx.beginPath();
      ctx.moveTo(-52, 4); // Ligeramente hundida en el suelo
      ctx.quadraticCurveTo(-56, -45, -42, -72);
      ctx.quadraticCurveTo(-26, -92, -6, -92);
      ctx.quadraticCurveTo(18, -94, 40, -78);
      ctx.quadraticCurveTo(56, -50, 52, 4);
      ctx.closePath();

      // Relleno base
      ctx.fillStyle = cfg.theme.base;
      ctx.fill();

      // Recorte para sombras y luces volumétricas
      ctx.save();
      ctx.clip();

      // Sombra inferior y lateral derecha
      ctx.fillStyle = cfg.theme.shadow;
      ctx.beginPath();
      ctx.moveTo(0, -90);
      ctx.lineTo(60, -90);
      ctx.lineTo(60, 10);
      ctx.lineTo(-20, 10);
      ctx.lineTo(-5, -30);
      ctx.closePath();
      ctx.fill();

      // Luz superior izquierda
      ctx.fillStyle = cfg.theme.light;
      ctx.beginPath();
      ctx.moveTo(-60, -95);
      ctx.lineTo(10, -95);
      ctx.lineTo(-10, -10);
      ctx.lineTo(-60, -10);
      ctx.closePath();
      ctx.fill();

      // Grietas de bloque de roca
      ctx.strokeStyle = cfg.theme.crack;
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-22, -80);
      ctx.lineTo(-14, -54);
      ctx.lineTo(-2, -48);
      ctx.lineTo(16, -58);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-14, -54);
      ctx.lineTo(-20, -28);
      ctx.stroke();

      // Parche de musgo verde pastel en la cresta superior
      ctx.fillStyle = cfg.moss;
      ctx.beginPath();
      ctx.ellipse(-14, -86, 22, 7, -0.08, 0, Math.PI * 2);
      ctx.ellipse(12, -84, 18, 6, 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = cfg.mossLight;
      ctx.beginPath();
      ctx.ellipse(-16, -88, 14, 4, -0.08, 0, Math.PI * 2);
      ctx.ellipse(14, -86, 10, 3.5, 0.12, 0, Math.PI * 2);
      ctx.fill();

      // Moteado y textura
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(-32, -60, 4, 3);
      ctx.fillRect(-28, -40, 3, 3);
      ctx.fillRect(20, -40, 4, 3);

      ctx.restore();

      // Contorno general oscurecido
      ctx.strokeStyle = cfg.theme.outline;
      ctx.lineWidth = 3.2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Línea suave de luz en bordes superiores
      ctx.strokeStyle = 'rgba(255, 240, 225, 0.5)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-42, -72);
      ctx.quadraticCurveTo(-26, -92, -6, -92);
      ctx.quadraticCurveTo(18, -94, 40, -78);
      ctx.stroke();

      // Astillas y pequeñas piedras en la base apoyadas en el suelo
      ctx.fillStyle = cfg.theme.shadow;
      ctx.beginPath();
      ctx.ellipse(-54, 1, 9, 4, 0.2, 0, Math.PI * 2);
      ctx.ellipse(50, 1, 10, 4.5, -0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      bigRockCanvases.push(cv);
    });
  }

  function buildFragmentVariants() {
    fragmentCanvases.length = 0;
    const colors = [
      { light: '#9883a9', base: '#6f5a81', shadow: '#4d3d5b' },
      { light: '#98a8b2', base: '#6e7e89', shadow: '#4b5b64' },
      { light: '#a69082', base: '#7d6759', shadow: '#564438' },
      { light: '#9b849c', base: '#735c74', shadow: '#503e52' }
    ];

    colors.forEach(col => {
      const cv = document.createElement('canvas');
      cv.width = 18;
      cv.height = 18;
      const ctx = cv.getContext('2d');
      ctx.save();
      ctx.translate(9, 9);

      ctx.fillStyle = col.base;
      ctx.beginPath();
      ctx.moveTo(-6, -4);
      ctx.lineTo(2, -7);
      ctx.lineTo(7, -1);
      ctx.lineTo(5, 6);
      ctx.lineTo(-4, 7);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = col.light;
      ctx.beginPath();
      ctx.moveTo(-6, -4);
      ctx.lineTo(2, -7);
      ctx.lineTo(1, 0);
      ctx.lineTo(-5, 1);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = col.shadow;
      ctx.beginPath();
      ctx.moveTo(1, 0);
      ctx.lineTo(7, -1);
      ctx.lineTo(5, 6);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#2d2036';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.restore();
      fragmentCanvases.push(cv);
    });
  }

  // ==========================================
  // FUNCIÓN AUXILIAR: DIBUJAR TECLA ENTER
  // ==========================================
  function drawEnterKeyBadge(ctx, x, y, isPressed = false) {
    const scale = isPressed ? 0.92 : 1.0;
    const kw = 58 * scale;
    const kh = 28 * scale;

    ctx.save();
    ctx.translate(x, y + (isPressed ? 2.5 : 0));

    // Fondo tecla
    ctx.fillStyle = isPressed ? '#e0b852' : '#ffd166';
    ctx.beginPath();
    ctx.roundRect(-kw / 2, -kh / 2, kw, kh, 6);
    ctx.fill();

    // Borde biselado
    ctx.strokeStyle = isPressed ? '#c69c36' : '#fff4d0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Flecha de Enter o texto ENTER
    ctx.fillStyle = '#221528';
    ctx.font = `700 ${Math.round(13 * scale)}px Fredoka, Quicksand, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ENTER ↵', 0, 1);

    ctx.restore();
  }

  // ==========================================
  // 1. CINEMÁTICA DEL TEMBLOR (QUAKE CINEMATIC)
  // ==========================================
  function createQuakeCinematic(dependencies) {
    let elapsed = 0;
    let transitionSent = false;
    let girlX = 260;
    const girlY = CAVE_GROUND_Y;
    let phase = 'react'; // 'react', 'run'
    let shakeAmp = 0;
    let soundTriggered = false;

    // Partículas de polvo y piedritas cayendo
    const PEBBLE_COUNT = 24;
    const pebbles = [];
    for (let i = 0; i < PEBBLE_COUNT; i++) {
      pebbles.push({
        active: false,
        x: 0,
        y: 0,
        vy: 0,
        size: 1,
        rot: 0,
        rotSpeed: 0,
        variant: 0
      });
    }

    function init() {
      elapsed = 0;
      transitionSent = false;
      girlX = 260;
      phase = 'react';
      shakeAmp = 0;
      soundTriggered = false;

      // Resetear piedritas
      pebbles.forEach(p => { p.active = false; });
      buildCaveEscapeOffscreens(dependencies.width, dependencies.height);
    }

    function spawnPebble() {
      const p = pebbles.find(item => !item.active);
      if (!p) return;
      p.active = true;
      p.x = Math.random() * dependencies.width;
      p.y = 10 + Math.random() * 50;
      p.vy = 2.5 + Math.random() * 4.5;
      p.size = 0.7 + Math.random() * 0.6;
      p.rot = Math.random() * Math.PI * 2;
      p.rotSpeed = (Math.random() - 0.5) * 4;
      p.variant = Math.floor(Math.random() * (fragmentCanvases.length || 1));
    }

    function skipToCaveEscape() {
      if (transitionSent) return;
      transitionSent = true;
      dependencies.switchState(dependencies.states.CAVE_ESCAPE, 0.05, 0.1);
    }

    function update(dt) {
      if (dependencies.isPaused()) return;
      elapsed += dt;

      // Sonido de temblor grave
      if (!soundTriggered && elapsed >= 0.2) {
        soundTriggered = true;
        if (dependencies.audio.sfxQuake) dependencies.audio.sfxQuake();
      }

      // Cálculo de amplitud del temblor con curva suave (sube, se mantiene y baja sin rebote)
      if (elapsed < 0.6) {
        shakeAmp = (elapsed / 0.6) * QUAKE_SHAKE_AMPLITUDE;
      } else if (elapsed < QUAKE_TIME - 1.2) {
        shakeAmp = QUAKE_SHAKE_AMPLITUDE;
      } else {
        const fadeFrac = Math.max(0, (QUAKE_TIME - elapsed) / 1.2);
        shakeAmp = QUAKE_SHAKE_AMPLITUDE * fadeFrac;
      }

      // Generar piedritas cayendo
      if (elapsed < QUAKE_TIME - 0.8 && Math.random() < 0.35) {
        spawnPebble();
      }

      // Actualizar piedritas
      pebbles.forEach(p => {
        if (!p.active) return;
        p.y += p.vy;
        p.rot += p.rotSpeed * dt;
        if (p.y >= CAVE_GROUND_Y) {
          p.y = CAVE_GROUND_Y;
          p.active = false;
        }
      });

      // Animación de la niña
      if (elapsed < 1.8) {
        phase = 'react';
      } else {
        phase = 'run';
        girlX += 3.8;
      }

      // Fin de la cinemática: transición suave a negro hacia el Nivel 5
      if (elapsed >= QUAKE_TIME && !transitionSent) {
        transitionSent = true;
        dependencies.switchState(dependencies.states.CAVE_ESCAPE, 1 / (60 * QUAKE_FADE_TIME), 0.2);
      }
    }

    function draw(ctx) {
      buildCaveEscapeOffscreens(dependencies.width, dependencies.height);

      // Desplazamiento suave con senos de alta frecuencia (sin rebote de cámara)
      const shakeX = shakeAmp > 0 ? (Math.sin(elapsed * 46) + Math.sin(elapsed * 28) * 0.7) * shakeAmp : 0;
      const shakeY = shakeAmp > 0 ? (Math.cos(elapsed * 38) + Math.sin(elapsed * 54) * 0.5) * (shakeAmp * 0.6) : 0;

      ctx.save();
      try {
        ctx.translate(shakeX, shakeY);
        ctx.drawImage(bgCanvas, 0, 0);
        ctx.drawImage(foreGroundCanvas, 0, 0);

        // Dibujar piedritas con textura realista de fragmentos
        pebbles.forEach(p => {
          if (!p.active) return;
          const frag = fragmentCanvases[p.variant % fragmentCanvases.length];
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(p.size, p.size);
          if (frag) {
            ctx.drawImage(frag, -frag.width / 2, -frag.height / 2);
          } else {
            ctx.fillStyle = '#6b587c';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        });

        // Dibujar a la niña (sin sombra ovalada debajo)
        let girlState = 'idle';
        if (phase === 'react') {
          girlState = 'duck'; // Se cubre la cabeza asustada
        } else if (phase === 'run') {
          girlState = 'run';
        }

        dependencies.drawGirl(ctx, girlX, girlY, {
          state: girlState,
          facingRight: true,
          throwDir: 'side',
          animTime: elapsed,
          hasDuck: false
        });

      } finally {
        ctx.restore();
      }

      // Interfaz fija
      dependencies.drawSkipButton(ctx, dependencies.width - 130, dependencies.height - 40, 110, 32);
      dependencies.drawLogo(ctx, dependencies.logoSize);
    }

    function handleKey(e) {
      const isEnter = (e.code === 'Enter' || e.code === 'NumpadEnter' || e.key === 'Enter');
      if (e.code === 'Space' || isEnter) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        skipToCaveEscape();
        return true;
      }
      return false;
    }

    return {
      init,
      update,
      draw,
      handleKey
    };
  }

  // ==========================================
  // 2. NIVEL 5: EL ESCAPE DE LA CUEVA
  // ==========================================
  function createCaveEscapeLevel(dependencies) {
    let timer = 0;
    let gameOver = false;
    let completed = false;
    let tutorialTimer = 5.0;
    let invulTimer = 0;
    let hurtTimer = 0;
    let graceTimer = 0;
    let transitionSent = false;
    let exitLightAlpha = 0;

    // Depuración (F3)
    let debugMode = false;
    let debugLastKey = 'Ninguna';
    let enterPressCount = 0;

    // Estado del jugador
    const player = {
      x: 120,
      y: CAVE_GROUND_Y,
      vx: 0,
      vy: 0,
      facingRight: true,
      onGround: true,
      state: 'idle', // 'idle', 'run', 'jump', 'climbing', 'hurt'
      animTime: 0,
      jumpHold: false
    };

    // Dinámica de trepada en Roca Grande (Tramo 1)
    let isClimbing = false;
    let climbProgress = 0;             // De 0 a CLIMB_PRESSES
    let activeClimbRock = null;
    let enterBadgeAnimTimer = 0;       // Efecto de tecla hundida al presionar

    // Dinámica de Sprint y Derrumbe del puente (Tramo 3)
    let collapseActive = false;
    let collapseX = TRAMO2_DIST - INITIAL_COLLAPSE_GAP;
    let sprintReactionTimer = SPRINT_REACTION_TIME;
    let sprintPressTimer = 0;

    // --- OBSTÁCULOS: ROCAS CAYENDO (TRAMO 1) ---
    const MAX_ROCKS = 8;
    const rockPool = [];
    for (let i = 0; i < MAX_ROCKS; i++) {
      rockPool.push({
        active: false,
        x: 0,
        y: 0,
        vy: 0,
        radius: 19,
        rot: 0,
        rotSpeed: 0,
        variant: 0,
        state: 'idle', // 'warning', 'falling', 'broken'
        warnTimer: 0,
        hasHitPlayer: false,
        breakTimer: 0
      });
    }
    let rockSpawnTimer = 1.6;

    // Rocas gigantes que bloquean el camino (Tramo 1)
    const bigRocks = [
      { x: 920, w: 104, h: 88, climbed: false, variant: 0 },
      { x: 1840, w: 104, h: 88, climbed: false, variant: 1 }
    ];

    // --- OBSTÁCULOS: TABLAS DEL PUENTE CON HUECOS (TRAMOS 2 Y 3) ---
    const PLANK_WIDTH = 48;
    const bridgePlanks = [];
    const totalBridgeLength = LEVEL5_TOTAL_DIST - TRAMO1_DIST;
    const totalPlanks = Math.ceil(totalBridgeLength / PLANK_WIDTH);

    // Huecos programados
    const holeIndices = new Set([
      6, 7,        // Primer hueco en Tramo 2
      14, 15,      // Segundo hueco
      23, 24,      // Tercer hueco
      32, 33,      // Cuarto hueco cerca del final de Tramo 2
      46,          // Hueco aislado en Tramo 3
      54           // Hueco final en Tramo 3
    ]);

    for (let i = 0; i < totalPlanks; i++) {
      const px = TRAMO1_DIST + i * PLANK_WIDTH;
      bridgePlanks.push({
        x: px,
        y: CAVE_GROUND_Y,
        w: PLANK_WIDTH - 4,
        h: 18,
        isHole: holeIndices.has(i),
        isLoose: (i % 5 === 0 && !holeIndices.has(i)),
        creaked: false,
        warnTimer: HOLE_WARN_TIME,
        collapsed: false,
        falling: false,
        vy: 0
      });
    }

    // --- PISCINA DE PARTÍCULAS (POLVO Y ASTILLAS) ---
    const MAX_PARTICLES = 36;
    const particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 3,
        color: '#bda68a',
        isFragment: false,
        fragVariant: 0,
        rot: 0,
        rotSpeed: 0
      });
    }

    function spawnDust(x, y, count = 4, color = '#bda68a') {
      for (let c = 0; c < count; c++) {
        const p = particles.find(item => !item.active);
        if (!p) break;
        p.active = true;
        p.x = x + (Math.random() * 20 - 10);
        p.y = y + (Math.random() * 10 - 5);
        p.vx = (Math.random() - 0.5) * 2.5;
        p.vy = -Math.random() * 2.0;
        p.life = 0;
        p.maxLife = 0.5 + Math.random() * 0.4;
        p.size = 2 + Math.random() * 3.5;
        p.color = color;
        p.isFragment = false;
      }
    }

    function spawnShatterFragments(x, y) {
      for (let c = 0; c < 4; c++) {
        const p = particles.find(item => !item.active);
        if (!p) break;
        p.active = true;
        p.x = x + (Math.random() * 16 - 8);
        p.y = y - 4;
        p.vx = (Math.random() - 0.5) * 3.5;
        p.vy = -(Math.random() * 3.0 + 1.2);
        p.life = 0;
        p.maxLife = 1.4 + Math.random() * 0.4;
        p.size = 1;
        p.isFragment = true;
        p.fragVariant = Math.floor(Math.random() * (fragmentCanvases.length || 1));
        p.rot = Math.random() * Math.PI * 2;
        p.rotSpeed = (Math.random() - 0.5) * 6;
      }
    }

    function init() {
      timer = 0;
      gameOver = false;
      completed = false;
      tutorialTimer = 5.0;
      invulTimer = 0;
      hurtTimer = 0;
      graceTimer = 0;
      transitionSent = false;
      exitLightAlpha = 0;

      enterPressCount = 0;
      enterBadgeAnimTimer = 0;

      player.x = 120;
      player.y = CAVE_GROUND_Y;
      player.vx = 0;
      player.vy = 0;
      player.facingRight = true;
      player.onGround = true;
      player.state = 'idle';
      player.animTime = 0;
      player.jumpHold = false;

      isClimbing = false;
      climbProgress = 0;
      activeClimbRock = null;

      collapseActive = false;
      collapseX = TRAMO2_DIST - INITIAL_COLLAPSE_GAP;
      sprintReactionTimer = SPRINT_REACTION_TIME;
      sprintPressTimer = 0;

      rockPool.forEach(r => { r.active = false; });
      rockSpawnTimer = 1.8;

      bigRocks.forEach(br => { br.climbed = false; });

      bridgePlanks.forEach(p => {
        p.creaked = false;
        p.warnTimer = HOLE_WARN_TIME;
        p.collapsed = false;
        p.falling = false;
        p.vy = 0;
      });

      particles.forEach(p => { p.active = false; });

      // Resetear estado de teclas globales para que no queden pegadas
      if (dependencies.keys) {
        dependencies.keys.left = false;
        dependencies.keys.right = false;
        dependencies.keys.jump = false;
        dependencies.keys.jumpPressed = false;
        dependencies.keys.enter = false;
        dependencies.keys.enterPressed = false;
      }

      buildCaveEscapeOffscreens(dependencies.width, dependencies.height);
    }

    function getCurrentTramo() {
      if (player.x < TRAMO1_DIST) return 1;
      if (player.x < TRAMO2_DIST) return 2;
      return 3;
    }

    // Reaparición tras daño por abismo o derrumbe
    function respawnPlayer() {
      const tramo = getCurrentTramo();
      if (tramo <= 2) {
        player.x = TRAMO1_DIST + 45;
      } else {
        // En Tramo 3, reaparece al inicio del tramo 3 con el derrumbe reiniciado
        player.x = TRAMO2_DIST + 35;
        collapseX = TRAMO2_DIST - INITIAL_COLLAPSE_GAP;
        sprintReactionTimer = SPRINT_REACTION_TIME;
      }
      player.y = CAVE_GROUND_Y;
      player.vx = 0;
      player.vy = 0;
      player.onGround = true;
      player.state = 'idle';

      invulTimer = BLINK_DURATION;
      hurtTimer = 0;
      graceTimer = RESPAWN_GRACE_TIME;
    }

    // --- ACCIÓN ENTER PRINCIPAL (REGISTRO POR PULSACIÓN INDIVIDUAL) ---
    function registerEnterPress() {
      enterPressCount++;
      enterBadgeAnimTimer = ENTER_MASH_FEEDBACK;

      // 1. En Roca Grande (Tramo 1): trepar por etapas
      if (getCurrentTramo() === 1) {
        if (isClimbing && activeClimbRock) {
          climbProgress = Math.min(CLIMB_PRESSES, climbProgress + 1);
          if (dependencies.audio && dependencies.audio.sfxClimb) {
            dependencies.audio.sfxClimb();
          }
          return true;
        }

        for (let i = 0; i < bigRocks.length; i++) {
          const br = bigRocks[i];
          if (!br.climbed && player.x >= br.x - 30 - CLIMB_RANGE && player.x <= br.x - 15) {
            isClimbing = true;
            activeClimbRock = br;
            climbProgress = Math.min(CLIMB_PRESSES, climbProgress + 1);
            if (dependencies.audio && dependencies.audio.sfxClimb) {
              dependencies.audio.sfxClimb();
            }
            return true;
          }
        }
      }

      // 2. En Tramo 3 (Derrumbe): sprint hacia la salida por cada pulsación
      if (getCurrentTramo() === 3 && !completed) {
        collapseActive = true;
        sprintPressTimer = 0.22;
        player.x += SPRINT_STEP_PER_PRESS;
        player.animTime += 0.3;
        player.facingRight = true;
        if (player.onGround) player.state = 'run';

        if (dependencies.audio && dependencies.audio.sfxSprint) {
          dependencies.audio.sfxSprint();
        }
        return true;
      }

      return false;
    }

    function toggleDebug() {
      debugMode = !debugMode;
    }

    function handleKey(e) {
      debugLastKey = e.code || e.key || 'Desconocida';

      if (e.code === 'KeyP' || e.code === 'Escape') {
        return false; // Permite pausar con P o Esc
      }

      if (e.code === 'F3') {
        toggleDebug();
        if (typeof e.preventDefault === 'function') e.preventDefault();
        return true;
      }

      const isEnter = (e.code === 'Enter' || e.code === 'NumpadEnter' || e.key === 'Enter');
      if (isEnter) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }
        // Ignorar repetición continua al mantener presionada la tecla
        if (e.repeat) return true;
        registerEnterPress();
        return true;
      }

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
      }

      return false;
    }

    function update(dt) {
      if (dependencies.isPaused() || gameOver) return;

      timer += dt;
      if (tutorialTimer > 0) tutorialTimer -= dt;
      if (invulTimer > 0) invulTimer -= dt;
      if (graceTimer > 0) graceTimer -= dt;
      if (enterBadgeAnimTimer > 0) enterBadgeAnimTimer -= dt;

      // Actualizar partículas
      particles.forEach(p => {
        if (!p.active) return;
        p.life += dt;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += GRAVITY_ESCAPE * 0.35;
        if (p.isFragment) p.rot += p.rotSpeed * dt;
        if (p.life >= p.maxLife) p.active = false;
      });

      // Si el nivel ya fue completado, fundido de luz final hacia el Pino
      if (completed) {
        exitLightAlpha = Math.min(1.0, exitLightAlpha + dt * 1.2);
        player.x += 3.2;
        if (exitLightAlpha >= 1.0 && !transitionSent) {
          transitionSent = true;
          dependencies.switchState(dependencies.states.LEVEL3, 0.035, 0.4);
        }
        return;
      }

      const currentTramo = getCurrentTramo();

      // --- 1. TREPADA DE ROCA GRANDE (TRAMO 1) ---
      if (isClimbing && activeClimbRock) {
        player.state = 'climbing';
        player.vx = 0;
        player.vy = 0;
        invulTimer = Math.max(invulTimer, 0.5); // Invulnerable a rocas mientras trepa

        const br = activeClimbRock;

        // Si completa la barra de trepadas, pasa al otro lado
        if (climbProgress >= CLIMB_PRESSES) {
          br.climbed = true;
          isClimbing = false;
          climbProgress = 0;
          player.x = br.x + br.w / 2 + 25;
          player.y = CAVE_GROUND_Y;
          player.state = 'idle';
          activeClimbRock = null;
          if (dependencies.audio && dependencies.audio.sfxStep) {
            dependencies.audio.sfxStep();
          }
          return;
        }

        // Decaimiento suave si se deja de presionar
        climbProgress = Math.max(0, climbProgress - CLIMB_DECAY * dt);
        const frac = Math.min(1.0, climbProgress / CLIMB_PRESSES);

        // Posicionamiento en etapas visibles
        if (frac < 0.4) {
          // Etapa 1: agarrándose a la pared de la roca
          const s1 = frac / 0.4;
          player.x = (br.x - 32) + s1 * 8;
          player.y = CAVE_GROUND_Y - s1 * (br.h * 0.45);
        } else if (frac < 0.85) {
          // Etapa 2: subiendo el torso y rodillas al borde superior
          const s2 = (frac - 0.4) / 0.45;
          player.x = (br.x - 24) + s2 * 18;
          player.y = CAVE_GROUND_Y - (br.h * 0.45) - s2 * (br.h * 0.42);
        } else {
          // Etapa 3: de pie en la cima de la roca
          const s3 = (frac - 0.85) / 0.15;
          player.x = (br.x - 6) + s3 * 10;
          player.y = CAVE_GROUND_Y - br.h - 4;
        }

        return; // Control bloqueado durante la subida
      }

      // --- 2. MOVIMIENTO Y SALTO DEL JUGADOR ---
      let moveDir = 0;
      if (dependencies.keys.left) moveDir -= 1;
      if (dependencies.keys.right) moveDir += 1;

      if (moveDir !== 0) {
        player.facingRight = (moveDir > 0);
        player.vx = moveDir * PLAYER_SPEED_NORMAL;
        player.animTime += dt * 8;
        if (player.onGround) player.state = 'run';
      } else {
        player.vx = 0;
        if (player.onGround && hurtTimer <= 0) player.state = 'idle';
      }

      // SALTO: Desactivado en Tramo 1; habilitado únicamente en Tramos 2 y 3
      if (currentTramo >= 2) {
        if (dependencies.keys.jumpPressed && player.onGround) {
          player.vy = JUMP_FORCE_ESCAPE;
          player.onGround = false;
          dependencies.keys.jumpPressed = false;
          if (dependencies.audio && dependencies.audio.sfxJump) {
            dependencies.audio.sfxJump();
          }
        }
        if (player.vy < 0 && dependencies.keys.jump) {
          player.vy += JUMP_HOLD_BOOST_ESCAPE;
        }
      } else {
        // En Tramo 1 se ignora cualquier intento de salto
        dependencies.keys.jumpPressed = false;
      }

      // Aplicar gravedad en tramos con salto o al estar en el aire
      if (!player.onGround || currentTramo >= 2) {
        player.vy += GRAVITY_ESCAPE;
        player.y += player.vy;
        if (!player.onGround) player.state = 'jump';
      }

      // Bloqueo horizontal frente a Rocas Grandes no trepadas
      let nextX = player.x + player.vx;
      for (let i = 0; i < bigRocks.length; i++) {
        const br = bigRocks[i];
        if (!br.climbed && player.x <= br.x - 30 && nextX > br.x - 30) {
          nextX = br.x - 30;
          player.vx = 0;
        }
      }
      player.x = Math.max(40, nextX);

      // Comprobar apoyo en suelo o puente
      if (currentTramo === 1) {
        // En Tramo 1 siempre está apoyada en el suelo
        player.y = CAVE_GROUND_Y;
        player.vy = 0;
        player.onGround = true;
      } else {
        // En Tramos 2 y 3, apoyo sobre tablas que no sean huecos ni estén colapsadas
        let hasSupport = false;
        if (player.vy >= 0 && player.y >= CAVE_GROUND_Y - 4 && player.y <= CAVE_GROUND_Y + 12) {
          const plank = bridgePlanks.find(p => !p.isHole && !p.collapsed && player.x >= p.x - 8 && player.x <= p.x + p.w + 8);
          if (plank) {
            hasSupport = true;
            player.y = CAVE_GROUND_Y;
            player.vy = 0;
            player.onGround = true;

            // Tabla floja cruje y comienza a caer
            if (plank.isLoose && !plank.creaked) {
              plank.creaked = true;
              if (dependencies.audio && dependencies.audio.sfxPlankCreak) {
                dependencies.audio.sfxPlankCreak();
              }
            }
          }
        }

        if (!hasSupport && player.y > CAVE_GROUND_Y + 8) {
          player.onGround = false;
        }

        // Caída al abismo
        if (player.y > ABYSS_DEPTH_Y) {
          dependencies.gameState.loseLife();
          if (dependencies.audio && dependencies.audio.sfxSplash) {
            dependencies.audio.sfxSplash();
          }
          if (dependencies.gameState.lives <= 0) {
            gameOver = true;
          } else {
            respawnPlayer();
          }
        }
      }

      // --- 3. CAÍDA DE ROCAS EN TRAMO 1 ---
      if (currentTramo === 1 && graceTimer <= 0) {
        rockSpawnTimer -= dt;
        if (rockSpawnTimer <= 0) {
          rockSpawnTimer = ROCK_FALL_MIN + Math.random() * (ROCK_FALL_MAX - ROCK_FALL_MIN);

          // Buscar columna adecuada dejando espacio libre horizontal
          let targetX = player.x + 85 + Math.random() * 220;

          // No caer sobre rocas grandes
          const nearBigRock = bigRocks.some(br => Math.abs(targetX - br.x) < 85);

          // Mantener EVENT_MIN_GAP entre columnas para permitir esquivar caminando
          const nearOtherRock = rockPool.some(r => r.active && Math.abs(r.x - targetX) < EVENT_MIN_GAP);

          if (!nearBigRock && !nearOtherRock && targetX < TRAMO1_DIST - 100) {
            const r = rockPool.find(item => !item.active);
            if (r) {
              r.active = true;
              r.x = targetX;
              r.y = 35;
              r.vy = 0;
              r.radius = 18 + Math.random() * 4;
              r.rot = Math.random() * Math.PI * 2;
              r.rotSpeed = (Math.random() - 0.5) * 3;
              r.variant = Math.floor(Math.random() * (rockFallingCanvases.length || 1));
              r.state = 'warning';
              r.warnTimer = ROCK_WARN_TIME;
              r.hasHitPlayer = false;
              r.breakTimer = 0;

              if (dependencies.audio && dependencies.audio.sfxRockFall) {
                dependencies.audio.sfxRockFall();
              }
            }
          }
        }
      }

      // Actualizar rocas
      rockPool.forEach(r => {
        if (!r.active) return;

        if (r.state === 'warning') {
          r.warnTimer -= dt;
          // Partículas de polvo y piedritas avisando desde el techo exacto
          if (Math.random() < 0.35) {
            spawnDust(r.x, 30, 2, '#9c8872');
          }
          if (r.warnTimer <= 0) {
            r.state = 'falling';
          }
        } else if (r.state === 'falling') {
          r.vy += 32 * dt;
          r.y += r.vy * (60 * dt);
          r.rot += r.rotSpeed * dt;

          // Impacto en Anika (quita exactamente 1 vida)
          if (!r.hasHitPlayer && invulTimer <= 0 && !isClimbing) {
            const dist = Math.hypot(r.x - player.x, r.y - (player.y - 25));
            if (dist < r.radius + 18) {
              r.hasHitPlayer = true;
              dependencies.gameState.loseLife();
              invulTimer = BLINK_DURATION;
              hurtTimer = 0.5;
              graceTimer = RESPAWN_GRACE_TIME;

              if (dependencies.audio && dependencies.audio.sfxRockImpact) {
                dependencies.audio.sfxRockImpact();
              }

              if (dependencies.gameState.lives <= 0) {
                gameOver = true;
              }
            }
          }

          // Impacto con el suelo: romperse en 3-5 fragmentos
          if (r.y >= CAVE_GROUND_Y - r.radius * 0.4) {
            r.y = CAVE_GROUND_Y - r.radius * 0.4;
            r.active = false;
            spawnShatterFragments(r.x, CAVE_GROUND_Y);
            spawnDust(r.x, CAVE_GROUND_Y, 8, '#7d6854');
            if (dependencies.audio && dependencies.audio.sfxRockImpact) {
              dependencies.audio.sfxRockImpact();
            }
          }
        }
      });

      // --- 4. HUECOS Y COLAPSO DE TABLAS EN TRAMO 2 ---
      bridgePlanks.forEach(p => {
        if (p.creaked && !p.collapsed) {
          p.warnTimer -= dt;
          if (p.warnTimer <= 0) {
            p.collapsed = true;
            p.falling = true;
            spawnDust(p.x + p.w / 2, CAVE_GROUND_Y + 10, 4, '#8a6e55');
          }
        }
        if (p.falling) {
          p.vy += GRAVITY_ESCAPE;
          p.y += p.vy;
          if (p.y > dependencies.height + 50) p.falling = false;
        }
      });

      // --- 5. TRAMO 3: DERRUMBE EN CADENA Y SPRINT ---
      if (currentTramo === 3) {
        if (!collapseActive) {
          if (sprintReactionTimer > 0) {
            sprintReactionTimer -= dt;
            if (sprintReactionTimer <= 0) {
              collapseActive = true;
            }
          }
        }

        if (collapseActive) {
          collapseX += COLLAPSE_SPEED * dt;

          // Derrumbar tablas que queden detrás
          bridgePlanks.forEach(p => {
            if (p.x < collapseX && !p.collapsed) {
              p.collapsed = true;
              p.falling = true;
              if (Math.random() < 0.4) spawnDust(p.x + p.w / 2, CAVE_GROUND_Y + 10, 3, '#755c46');
            }
          });

          // Si el derrumbe alcanza a la niña
          if (collapseX >= player.x - 18 && graceTimer <= 0) {
            dependencies.gameState.loseLife();
            if (dependencies.audio && dependencies.audio.sfxRockImpact) {
              dependencies.audio.sfxRockImpact();
            }
            if (dependencies.gameState.lives <= 0) {
              gameOver = true;
            } else {
              respawnPlayer();
            }
          }
        }

        if (sprintPressTimer > 0) {
          sprintPressTimer -= dt;
        }

        // Salida de la cueva al llegar al final
        if (player.x >= LEVEL5_TOTAL_DIST - 60 && !completed) {
          completed = true;
          if (dependencies.audio && dependencies.audio.sfxVictory) {
            dependencies.audio.sfxVictory();
          }
        }
      }
    }

    // --- RENDERIZADO DEL NIVEL ---
    function draw(ctx) {
      buildCaveEscapeOffscreens(dependencies.width, dependencies.height);

      ctx.save();
      try {
        // Cálculo de cámara suave sin rebotes
        let cameraX = player.x - dependencies.width * 0.38;
        cameraX = Math.max(0, Math.min(LEVEL5_TOTAL_DIST - dependencies.width, cameraX));

        // 1. Fondo de cueva con paralaje
        ctx.save();
        ctx.translate(-cameraX * 0.22, 0);
        ctx.drawImage(bgCanvas, 0, 0);
        ctx.drawImage(bgCanvas, dependencies.width, 0);
        ctx.drawImage(bgCanvas, dependencies.width * 2, 0);
        ctx.restore();

        // 2. Abismo con niebla violeta suave
        ctx.save();
        ctx.translate(-cameraX * 0.5, 0);
        ctx.drawImage(abyssCanvas, 0, 0);
        ctx.drawImage(abyssCanvas, dependencies.width, 0);
        ctx.drawImage(abyssCanvas, dependencies.width * 2, 0);
        ctx.restore();

        // 3. Suelo de roca firme (Tramo 1)
        ctx.save();
        ctx.translate(-cameraX, 0);

        if (cameraX < TRAMO1_DIST) {
          ctx.drawImage(foreGroundCanvas, 0, 0);
          ctx.drawImage(foreGroundCanvas, dependencies.width, 0);
        }

        // 4. Tablas del puente colgante (Tramos 2 y 3)
        bridgePlanks.forEach(p => {
          if (p.x + p.w < cameraX - 50 || p.x > cameraX + dependencies.width + 50) return;
          if (p.isHole && !p.falling) return;

          ctx.save();
          ctx.translate(p.x, p.y);

          // Tabla de madera
          ctx.fillStyle = p.creaked ? '#996f4c' : '#7d593b';
          ctx.beginPath();
          ctx.roundRect(0, 0, p.w, p.h, 4);
          ctx.fill();

          ctx.strokeStyle = '#5a3d24';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Remaches / cuerda en los bordes
          ctx.fillStyle = '#bda078';
          ctx.beginPath();
          ctx.arc(4, p.h / 2, 2.5, 0, Math.PI * 2);
          ctx.arc(p.w - 4, p.h / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        });

        // Cuerdas del puente colgante
        ctx.strokeStyle = 'rgba(168, 134, 98, 0.65)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        for (let bx = TRAMO1_DIST; bx <= LEVEL5_TOTAL_DIST; bx += 70) {
          const sy = CAVE_GROUND_Y - 22 + Math.sin(bx * 0.03) * 6;
          if (bx === TRAMO1_DIST) ctx.moveTo(bx, sy);
          else ctx.lineTo(bx, sy);
        }
        ctx.stroke();

        // 5. Rocas gigantes macizas (Tramo 1)
        bigRocks.forEach(br => {
          if (br.x + br.w < cameraX - 60 || br.x - br.w > cameraX + dependencies.width + 60) return;

          const cv = bigRockCanvases[br.variant % bigRockCanvases.length];
          if (cv) {
            ctx.drawImage(cv, br.x - cv.width / 2, CAVE_GROUND_Y - cv.height + 14);
          }

          // Cartel de interacción sobre la roca
          const inRange = (!br.climbed && player.x >= br.x - 30 - CLIMB_RANGE && player.x <= br.x - 15);
          if (inRange || (isClimbing && activeClimbRock === br)) {
            ctx.save();
            const textY = CAVE_GROUND_Y - br.h - 52;
            const msg = 'Presiona ENTER varias veces para trepar';
            ctx.font = '600 16px Fredoka, Quicksand, sans-serif';
            const tw = ctx.measureText(msg).width;
            const bw = tw + 34;
            const bh = 34;

            ctx.fillStyle = 'rgba(26, 18, 36, 0.90)';
            ctx.beginPath();
            ctx.roundRect(br.x - bw / 2, textY, bw, bh, 10);
            ctx.fill();

            ctx.strokeStyle = '#ffd166';
            ctx.lineWidth = 2.2;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(msg, br.x, textY + bh / 2);

            // Tecla ENTER animada
            drawEnterKeyBadge(ctx, br.x, textY - 22, enterBadgeAnimTimer > 0);

            // Barra de progreso de trepada
            const barW = 140;
            const barH = 10;
            const barY = textY + bh + 8;
            const frac = Math.min(1.0, climbProgress / CLIMB_PRESSES);

            ctx.fillStyle = 'rgba(24, 16, 32, 0.9)';
            ctx.beginPath();
            ctx.roundRect(br.x - barW / 2, barY, barW, barH, 5);
            ctx.fill();

            ctx.strokeStyle = '#ffd166';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (frac > 0) {
              ctx.fillStyle = '#ffd166';
              ctx.beginPath();
              ctx.roundRect(br.x - barW / 2 + 1, barY + 1, (barW - 2) * frac, barH - 2, 4);
              ctx.fill();
            }

            ctx.restore();
          }
        });

        // 6. Rocas cayendo del techo (pre-renderizadas con facetas y rotación)
        rockPool.forEach(r => {
          if (!r.active) return;
          ctx.save();
          ctx.translate(r.x, r.y);

          if (r.state === 'falling') {
            ctx.rotate(r.rot);
            const cv = rockFallingCanvases[r.variant % rockFallingCanvases.length];
            if (cv) {
              ctx.drawImage(cv, -cv.width / 2, -cv.height / 2);
            }
          }
          ctx.restore();
        });

        // 7. Partículas (polvo y fragmentos de rocas)
        particles.forEach(p => {
          if (!p.active) return;
          ctx.save();
          ctx.translate(p.x, p.y);

          if (p.isFragment) {
            ctx.rotate(p.rot);
            const frag = fragmentCanvases[p.fragVariant % fragmentCanvases.length];
            if (frag) {
              const alpha = Math.max(0, 1 - (p.life / p.maxLife));
              ctx.globalAlpha = alpha;
              ctx.drawImage(frag, -frag.width / 2, -frag.height / 2);
            }
          } else {
            const alpha = Math.max(0, 1 - (p.life / p.maxLife));
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        });

        // 8. Polvo y derrumbe en Tramo 3
        if (getCurrentTramo() === 3 && collapseActive) {
          ctx.fillStyle = 'rgba(100, 78, 62, 0.45)';
          ctx.beginPath();
          ctx.ellipse(collapseX, CAVE_GROUND_Y + 15, 60, 25, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // 9. Salida de la cueva hacia el Gran Pino (Nivel 6)
        const exitX = LEVEL5_TOTAL_DIST - 80;
        const exitGrad = ctx.createRadialGradient(exitX, CAVE_GROUND_Y - 80, 20, exitX, CAVE_GROUND_Y - 80, 220);
        exitGrad.addColorStop(0, 'rgba(255, 245, 215, 0.95)');
        exitGrad.addColorStop(0.5, 'rgba(255, 230, 160, 0.55)');
        exitGrad.addColorStop(1, 'rgba(255, 210, 120, 0)');
        ctx.fillStyle = exitGrad;
        ctx.beginPath();
        ctx.arc(exitX, CAVE_GROUND_Y - 80, 220, 0, Math.PI * 2);
        ctx.fill();

        // 10. Dibujar a Anika (sin sombras ovaladas debajo)
        const shouldBlink = invulTimer > 0 && !dependencies.isPlayerBlinkVisible(invulTimer, BLINK_DURATION, BLINK_COUNT);

        if (!shouldBlink) {
          let girlState = player.state;
          if (isClimbing) {
            girlState = (climbProgress >= CLIMB_PRESSES * 0.85) ? 'idle' : 'duck';
          }
          dependencies.drawGirl(ctx, player.x, player.y, {
            state: girlState,
            facingRight: player.facingRight,
            throwDir: 'side',
            animTime: player.animTime,
            hasDuck: false
          });
        }

        ctx.restore(); // Fin de espacio de cámara

        // 11. Aviso grande de Derrumbe en Tramo 3
        if (getCurrentTramo() === 3 && !completed) {
          ctx.save();
          const bannerY = 85;
          const msg = '¡El puente se derrumba! Presiona ENTER varias veces para correr';
          ctx.font = '700 20px Fredoka, Quicksand, sans-serif';
          const tw = ctx.measureText(msg).width;
          const bw = tw + 40;
          const bh = 44;

          ctx.fillStyle = 'rgba(38, 22, 28, 0.92)';
          ctx.beginPath();
          ctx.roundRect((dependencies.width - bw) / 2, bannerY, bw, bh, 14);
          ctx.fill();

          ctx.strokeStyle = '#ffd166';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(msg, dependencies.width / 2, bannerY + bh / 2);

          drawEnterKeyBadge(ctx, dependencies.width / 2, bannerY - 24, enterBadgeAnimTimer > 0);
          ctx.restore();
        }

        // 12. Fundido blanco cálido de victoria / salida
        if (exitLightAlpha > 0) {
          ctx.fillStyle = `rgba(255, 248, 220, ${exitLightAlpha})`;
          ctx.fillRect(0, 0, dependencies.width, dependencies.height);
        }

        // 13. HUD general
        drawHUD(ctx);

        // 14. Modal de Game Over
        if (gameOver) {
          dependencies.drawGameOverModal(
            ctx,
            () => {
              gameOver = false;
              dependencies.gameState.retryLevel();
              init();
            },
            () => {
              gameOver = false;
              dependencies.gameState.resetLives(3);
              dependencies.switchState(dependencies.states.MENU);
            }
          );
        }

      } catch (err) {
        console.error('Error en caveEscape.draw:', err);
      } finally {
        ctx.restore();
      }
    }

    function drawHUD(ctx) {
      // 1. Instrucción superior izquierda
      let instrText = 'Nivel 5: Muévete con las flechas y esquiva las rocas';
      const tramo = getCurrentTramo();
      if (tramo === 2) {
        instrText = 'Nivel 5: Salta los huecos del puente colgante';
      } else if (tramo === 3) {
        instrText = 'Nivel 5: ¡Corre! Presiona ENTER para escapar del derrumbe';
      }
      dependencies.drawInstructionBox(ctx, instrText, 24, 20, 480);

      // 2. Corazones de vida compartida
      dependencies.drawHearts(ctx, 24, 76, dependencies.gameState.lives, dependencies.gameState.maxLives);

      // 3. Barra de progreso general del nivel
      const barW = 200;
      const barH = 14;
      const barX = dependencies.width - barW - 24;
      const barY = 24;
      const progress = Math.min(1.0, player.x / LEVEL5_TOTAL_DIST);

      ctx.save();
      ctx.fillStyle = 'rgba(28, 20, 38, 0.82)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 7);
      ctx.fill();

      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (progress > 0) {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.roundRect(barX + 1, barY + 1, (barW - 2) * progress, barH - 2, 6);
        ctx.fill();
      }

      ctx.fillStyle = '#ffd166';
      ctx.font = '600 13px Fredoka, Quicksand, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('ESCAPE', barX - 10, barY + 11);
      ctx.restore();

      // 4. Indicador de distancia al derrumbe en Tramo 3
      if (tramo === 3 && collapseActive) {
        ctx.save();
        const distBoxW = 190;
        const distBoxH = 36;
        const distBoxX = dependencies.width - distBoxW - 24;
        const distBoxY = 55;

        ctx.fillStyle = 'rgba(32, 20, 36, 0.88)';
        ctx.beginPath();
        ctx.roundRect(distBoxX, distBoxY, distBoxW, distBoxH, 10);
        ctx.fill();

        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2;
        ctx.stroke();

        const meters = Math.max(0, Math.round((player.x - collapseX) / 10));
        ctx.fillStyle = '#ffd166';
        ctx.font = '700 14px Fredoka, Quicksand, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Derrumbe:', distBoxX + 12, distBoxY + distBoxH / 2);

        ctx.fillStyle = meters < 10 ? '#ff6b6b' : '#ffffff';
        ctx.font = '700 15px Fredoka, Quicksand, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${meters} m`, distBoxX + distBoxW - 12, distBoxY + distBoxH / 2);
        ctx.restore();
      }

      // 5. Panel de depuración opcional (F3)
      if (debugMode) {
        ctx.save();
        const dbW = 280;
        const dbH = 110;
        const dbX = 24;
        const dbY = dependencies.height - dbH - 20;

        ctx.fillStyle = 'rgba(15, 12, 22, 0.92)';
        ctx.beginPath();
        ctx.roundRect(dbX, dbY, dbW, dbH, 10);
        ctx.fill();

        ctx.strokeStyle = '#5bc0be';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#5bc0be';
        ctx.font = '700 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('--- MODO DEBUG (F3) ---', dbX + 12, dbY + 22);

        ctx.fillStyle = '#ffffff';
        ctx.font = '13px monospace';
        ctx.fillText(`Tramo: ${tramo} | Estado: ${player.state}`, dbX + 12, dbY + 44);
        ctx.fillText(`Última tecla: ${debugLastKey}`, dbX + 12, dbY + 66);
        ctx.fillText(`Pulsaciones ENTER: ${enterPressCount}`, dbX + 12, dbY + 88);
        ctx.restore();
      }

      dependencies.drawLogo(ctx, dependencies.logoSize);
    }

    return {
      init,
      update,
      draw,
      handleKey,
      registerEnterPress,
      toggleDebug,
      getCurrentTramo,
      getX: () => player.x,
      setX: (v) => { player.x = v; }
    };
  }

  window.createQuakeCinematic = createQuakeCinematic;
  window.createCaveEscapeLevel = createCaveEscapeLevel;
})();
