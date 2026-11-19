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
  const TRAMO1_DIST = 2280;            // Fin del Tramo 1 (Derrumbe de rocas, sin salto, acantilado)
  const BRIDGE_END_X = 5020;           // Fin del puente colgante y comienzo del acantilado de salida

  // Físicas y movimiento (salto idéntico al Nivel 2: Lobo)
  const PLAYER_SPEED_NORMAL = 4.8;     // Velocidad normal de carrera con flechas/A-D
  const JUMP_FORCE_ESCAPE = -8.8;      // Salto idéntico al Nivel 2 (JUMP_FORCE_WOLF)
  const JUMP_HOLD_BOOST_ESCAPE = -0.18;// Salto variable idéntico al Nivel 2 (JUMP_HOLD_BOOST_WOLF)
  const GRAVITY_ESCAPE = 0.58;         // Gravedad idéntica al Nivel 2 (GRAVITY)
  const CAVE_GROUND_Y = 540;           // Altura del suelo y del puente
  const ABYSS_DEPTH_Y = 690;           // Altura para detectar caída al abismo

  // Dinámica de escalada de Rocas Grandes (Tramo 1)
  const BIG_ROCK_HEIGHT_SCALE = 2.2;   // Altura de rocas grandes relativo a la niña (~115px)
  const BIG_ROCK_BASE_HEIGHT = 115;    // Altura en píxeles (entre 2 y 2.5 veces la niña)
  const BIG_ROCK_WIDTH = 146;          // Ancho proporcional con repisas y salientes
  const CLIMB_PRESSES = 10;            // Pulsaciones necesarias para trepar por mayor altura (ajustable)
  const CLIMB_DECAY = 1.25;            // Decaimiento por segundo al dejar de presionar
  const CLIMB_RANGE = 80;              // Distancia al frente de la roca para interactuar
  const ENTER_MASH_FEEDBACK = 0.18;    // Duración de animación de tecla hundida

  // Obstáculos Tramo 1 (Rocas cayendo del techo)
  const FALLING_ROCK_SCALE = 1.5;      // Escala de rocas que caen (1.5 veces su tamaño actual, más macizas)
  const ROCK_FALL_MIN = 1.8;           // Intervalo mínimo entre caídas de rocas (segundos)
  const ROCK_FALL_MAX = 3.2;           // Intervalo máximo entre caídas de rocas (segundos)
  const ROCK_WARN_TIME = 0.8;          // Tiempo de aviso previo desde el techo (segundos)
  const EVENT_MIN_GAP = 120;           // Separación horizontal mínima para permitir esquivar caminando

  // Obstáculos y derrumbe del puente colgante
  const HOLE_WARN_TIME = 0.7;          // Tiempo de aviso previo en tabla antes de caer
  const COLLAPSE_SPEED = 160;          // Velocidad constante del derrumbe (+15%, menor que carrera de la niña a 288 px/s)

  // Parpadeo e invulnerabilidad
  const BLINK_COUNT = 2;               // Parpadeo exacto requerido (visible/invisible x 2)
  const BLINK_DURATION = 1.0;          // Duración total de invulnerabilidad (1.0 s)
  const RESPAWN_GRACE_TIME = 1.0;      // Gracia sin amenazas tras reaparecer (1.0 s)

  // Cinemática de salida hacia el Pino
  const CLIMB_OUT_TIME = 7.0;          // Duración escalando el pozo vertical hacia la luz (6-8 s)
  const SURFACE_LOOK_TIME = 1.8;       // Tiempo mirando alrededor en la superficie exterior
  const WALK_TO_TREE_TIME = 3.2;       // Tiempo caminando hacia la base del Gran Pino
  const PINE_CLIMB_TIME = 1.4;         // Tiempo saltando a la primera rama y trepando
  const CINE_FADE_OUT_TIME = 1.0;      // Fundido a negro suave (aprox. 1 s)

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

    const baseShapes = [
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

    baseShapes.forEach((baseVerts, idx) => {
      // Escalar vértices 1.5 veces para mayor tamaño y aspecto macizo
      const verts = baseVerts.map(([vx, vy]) => [Math.round(vx * FALLING_ROCK_SCALE), Math.round(vy * FALLING_ROCK_SCALE)]);
      const cv = document.createElement('canvas');
      cv.width = 88;
      cv.height = 88;
      const ctx = cv.getContext('2d');
      const theme = rockThemes[idx % rockThemes.length];

      ctx.save();
      ctx.translate(44, 44);

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
      ctx.moveTo(-8, -14);
      ctx.lineTo(36, -8);
      ctx.lineTo(36, 36);
      ctx.lineTo(-14, 36);
      ctx.closePath();
      ctx.fill();

      // Cara iluminada (superior izquierda)
      ctx.fillStyle = theme.light;
      ctx.beginPath();
      ctx.moveTo(-36, -36);
      ctx.lineTo(22, -36);
      ctx.lineTo(4, 6);
      ctx.lineTo(-36, 6);
      ctx.closePath();
      ctx.fill();

      // Grietas finas en la roca
      ctx.strokeStyle = theme.crack;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-12, -6);
      ctx.lineTo(-3, 4);
      ctx.lineTo(9, 0);
      ctx.stroke();

      // Moteado de textura suave
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(-9, -13, 3.5, 3);
      ctx.fillRect(6, -15, 3, 3);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(7, 10, 3.5, 3);
      ctx.fillRect(-11, 13, 3, 3);

      ctx.restore();

      // Contorno general oscurecido
      ctx.strokeStyle = theme.outline;
      ctx.lineWidth = 2.8;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Borde suave de luz en la cresta superior
      ctx.strokeStyle = 'rgba(255, 240, 220, 0.45)';
      ctx.lineWidth = 2.0;
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
        w: BIG_ROCK_WIDTH, h: BIG_ROCK_BASE_HEIGHT,
        theme: { light: '#8b769c', base: '#655276', shadow: '#443553', outline: '#2b1f35', crack: '#201629' },
        moss: '#6f9273', mossLight: '#8cb390'
      },
      {
        w: BIG_ROCK_WIDTH, h: BIG_ROCK_BASE_HEIGHT,
        theme: { light: '#918296', base: '#6c5c71', shadow: '#4a3d4f', outline: '#2e2432', crack: '#221926' },
        moss: '#739575', mossLight: '#8fb792'
      }
    ];

    bigConfigs.forEach((cfg) => {
      const cv = document.createElement('canvas');
      cv.width = 180;
      cv.height = 160;
      const ctx = cv.getContext('2d');
      const cx = 90;
      const cy = 145; // Base apoyada exactamente en la línea del suelo

      ctx.save();
      ctx.translate(cx, cy);

      // Silueta pesada, asimétrica y maciza (altura BIG_ROCK_BASE_HEIGHT = 115px, 2.2 veces la niña)
      ctx.beginPath();
      ctx.moveTo(-68, 2);
      ctx.quadraticCurveTo(-72, -35, -60, -42); // Repisa inferior
      ctx.quadraticCurveTo(-54, -72, -44, -78); // Repisa media
      ctx.quadraticCurveTo(-34, -114, -10, -115); // Cumbre izquierda
      ctx.quadraticCurveTo(18, -117, 46, -100); // Cumbre derecha
      ctx.quadraticCurveTo(68, -65, 66, -20);
      ctx.quadraticCurveTo(68, 0, 64, 2);
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
      ctx.moveTo(0, -125);
      ctx.lineTo(85, -125);
      ctx.lineTo(85, 10);
      ctx.lineTo(-30, 10);
      ctx.lineTo(-5, -45);
      ctx.closePath();
      ctx.fill();

      // Luz superior izquierda
      ctx.fillStyle = cfg.theme.light;
      ctx.beginPath();
      ctx.moveTo(-85, -130);
      ctx.lineTo(15, -130);
      ctx.lineTo(-15, -15);
      ctx.lineTo(-85, -15);
      ctx.closePath();
      ctx.fill();

      // Repisas y salientes visibles en la cara frontal (donde Anika apoya manos y pies)
      // Repisa 1 (inferior ~38px de altura): shelf en y = -38
      ctx.fillStyle = cfg.theme.light;
      ctx.beginPath();
      ctx.roundRect(-58, -42, 34, 7, 3);
      ctx.fill();
      ctx.fillStyle = cfg.theme.shadow;
      ctx.beginPath();
      ctx.roundRect(-56, -35, 34, 4, 2);
      ctx.fill();

      // Repisa 2 (media ~75px de altura): shelf en y = -75
      ctx.fillStyle = cfg.theme.light;
      ctx.beginPath();
      ctx.roundRect(-42, -79, 32, 7, 3);
      ctx.fill();
      ctx.fillStyle = cfg.theme.shadow;
      ctx.beginPath();
      ctx.roundRect(-40, -72, 32, 4, 2);
      ctx.fill();

      // Grietas de bloque de roca conectando repisas
      ctx.strokeStyle = cfg.theme.crack;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-32, -100);
      ctx.lineTo(-20, -75);
      ctx.lineTo(-8, -68);
      ctx.lineTo(18, -80);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-20, -75);
      ctx.lineTo(-26, -38);
      ctx.lineTo(-12, -22);
      ctx.stroke();

      // Parche de musgo verde pastel en la cresta superior y repisas
      ctx.fillStyle = cfg.moss;
      ctx.beginPath();
      ctx.ellipse(-20, -112, 28, 8, -0.06, 0, Math.PI * 2);
      ctx.ellipse(18, -110, 24, 7, 0.10, 0, Math.PI * 2);
      ctx.ellipse(-44, -43, 14, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(-30, -80, 13, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = cfg.mossLight;
      ctx.beginPath();
      ctx.ellipse(-22, -114, 18, 5, -0.06, 0, Math.PI * 2);
      ctx.ellipse(20, -112, 14, 4, 0.10, 0, Math.PI * 2);
      ctx.ellipse(-44, -44, 9, 2.5, 0, 0, Math.PI * 2);
      ctx.ellipse(-30, -81, 8, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Moteado y textura
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(-45, -95, 5, 4);
      ctx.fillRect(-38, -60, 4, 4);
      ctx.fillRect(28, -60, 5, 4);

      ctx.restore();

      // Contorno general oscurecido
      ctx.strokeStyle = cfg.theme.outline;
      ctx.lineWidth = 3.4;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Borde suave de luz en crestas superiores
      ctx.strokeStyle = 'rgba(255, 240, 225, 0.55)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-54, -78);
      ctx.quadraticCurveTo(-34, -114, -10, -115);
      ctx.quadraticCurveTo(18, -117, 46, -100);
      ctx.stroke();

      // Astillas y pequeñas piedras en la base apoyadas en el suelo
      ctx.fillStyle = cfg.theme.shadow;
      ctx.beginPath();
      ctx.ellipse(-66, 1, 11, 5, 0.2, 0, Math.PI * 2);
      ctx.ellipse(62, 1, 12, 5.5, -0.15, 0, Math.PI * 2);
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
  // CICLO ÚNICO Y FLUIDO DE CORRER, IDLE Y ESCALADA DE ANIKA
  // Sin sombras ovaladas debajo, sin emojis, estilo ilustrado pastel
  // Pies siempre apoyados en la línea del suelo (y = 0) al apoyar
  // ==========================================
  function drawAnika(ctx, x, y, options = {}) {
    const scale = options.scale || 1;
    const facing = options.facingRight !== false ? 1 : -1;
    const animState = options.state || 'idle'; // 'idle', 'run', 'jump', 'climbing', 'duck', 'hurt'
    const animTime = options.animTime || 0;
    const stepPhase = options.stepPhase || 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * facing, scale);

    // Paleta ilustrada pastel de Anika
    const C_BOOTS = '#6d4834';
    const C_DRESS = '#4c8c82';
    const C_CAPE = '#dc5847';
    const C_CAPE_TRIM = '#fff8e8';
    const C_HAIR = '#5a3825';
    const C_SKIN = '#fedec4';
    const C_CHEEK = 'rgba(255, 130, 130, 0.55)';
    const C_EYE = '#221e25';
    const C_MOUTH = '#8a4b44';

    // 1. ESTADO: AGACHARSE (DUCK)
    if (animState === 'duck') {
      ctx.fillStyle = C_BOOTS;
      ctx.beginPath();
      ctx.roundRect(-9, -6.5, 8, 6.5, 3);
      ctx.roundRect(1, -6.5, 8, 6.5, 3);
      ctx.fill();

      ctx.fillStyle = C_DRESS;
      ctx.beginPath();
      ctx.moveTo(-13, -6.5);
      ctx.lineTo(13, -6.5);
      ctx.lineTo(8, -16);
      ctx.lineTo(-8, -16);
      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.translate(-5, -16);
      ctx.rotate(-0.06);
      ctx.fillStyle = C_CAPE;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-14, 5, -11, 13);
      ctx.quadraticCurveTo(-2, 12, 4, 7);
      ctx.lineTo(4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C_CAPE_TRIM;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();

      const headY = -18;
      ctx.fillStyle = C_HAIR;
      ctx.beginPath();
      ctx.arc(2, headY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-8, headY + 2, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = C_SKIN;
      ctx.beginPath();
      ctx.arc(3, headY + 1, 9.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = C_HAIR;
      ctx.beginPath();
      ctx.arc(3, headY - 3, 9.5, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();

      ctx.fillStyle = C_CHEEK;
      ctx.beginPath();
      ctx.arc(7, headY + 3, 2.6, 0, Math.PI * 2);
      ctx.arc(0, headY + 3, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = C_EYE;
      ctx.beginPath();
      ctx.arc(7, headY + 1, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(7.6, headY + 0.3, 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = C_MOUTH;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(6, headY + 4.5, 1.5, 0, Math.PI);
      ctx.stroke();

      ctx.fillStyle = C_CAPE;
      ctx.beginPath();
      ctx.arc(0, headY - 6.5, 3.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    // 2. ESTADO: ESCALADA EN ROCA (CLIMBING)
    if (animState === 'climbing') {
      const climbBob = Math.sin(animTime * 6) * 1.0;
      const hipY = -22 + climbBob;
      const shoulderY = hipY - 14;
      const headY = shoulderY - 8;

      // Brazo lejano levantado sujetando la repisa superior
      ctx.save();
      ctx.translate(-2, shoulderY + 2);
      ctx.rotate(-1.15);
      ctx.fillStyle = C_DRESS;
      ctx.beginPath();
      ctx.roundRect(0, -2.5, 11, 5, 2.5);
      ctx.fill();
      ctx.fillStyle = C_SKIN;
      ctx.beginPath();
      ctx.arc(11, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Pierna lejana en repisa inferior
      ctx.fillStyle = C_BOOTS;
      ctx.beginPath();
      ctx.roundRect(-8, -10, 6, 10, 3);
      ctx.fill();

      // Capa colgando naturalmente hacia abajo
      ctx.save();
      ctx.translate(-4, shoulderY + 2);
      ctx.rotate(-0.08);
      ctx.fillStyle = C_CAPE;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-12, 10, -8, 22);
      ctx.lineTo(4, 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C_CAPE_TRIM;
      ctx.lineWidth = 2.0;
      ctx.stroke();
      ctx.restore();

      // Vestido verde/azul pastel
      ctx.fillStyle = C_DRESS;
      ctx.beginPath();
      ctx.moveTo(-10, hipY);
      ctx.lineTo(10, hipY);
      ctx.lineTo(8, shoulderY);
      ctx.lineTo(-8, shoulderY);
      ctx.closePath();
      ctx.fill();

      // Pierna cercana flexionada sobre saliente de la roca
      ctx.fillStyle = C_BOOTS;
      ctx.beginPath();
      ctx.roundRect(1, -18, 6, 11, 3);
      ctx.fill();

      // Brazo cercano afirmándose en la roca
      ctx.save();
      ctx.translate(3, shoulderY + 2);
      ctx.rotate(-0.55);
      ctx.fillStyle = C_DRESS;
      ctx.beginPath();
      ctx.roundRect(0, -2.5, 10, 5, 2.5);
      ctx.fill();
      ctx.fillStyle = C_SKIN;
      ctx.beginPath();
      ctx.arc(10, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Cabeza mirando hacia la cima de la roca
      ctx.fillStyle = C_HAIR;
      ctx.beginPath();
      ctx.arc(2, headY, 14.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-10, headY + 3, 6.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = C_SKIN;
      ctx.beginPath();
      ctx.arc(3, headY + 1, 11.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = C_HAIR;
      ctx.beginPath();
      ctx.arc(3, headY - 4, 11.5, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();

      ctx.fillStyle = C_CHEEK;
      ctx.beginPath();
      ctx.arc(7, headY + 4, 3.2, 0, Math.PI * 2);
      ctx.arc(0, headY + 4, 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Ojos determinados mirando hacia arriba/adelante
      ctx.fillStyle = C_EYE;
      ctx.beginPath();
      ctx.arc(6.5, headY - 0.5, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(7.2, headY - 1.2, 0.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = C_MOUTH;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(5.5, headY + 4.5, 1.8, 0.1, Math.PI * 0.9);
      ctx.stroke();

      ctx.fillStyle = C_CAPE;
      ctx.beginPath();
      ctx.arc(0, headY - 8, 4.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    // 3. ESTADO: SALTO (JUMP)
    if (animState === 'jump') {
      const hipY = -18;
      const shoulderY = hipY - 14;
      const headY = shoulderY - 9;

      // Brazo lejano estirado hacia atrás para equilibrio
      ctx.save();
      ctx.translate(-2, shoulderY + 2);
      ctx.rotate(0.65);
      ctx.fillStyle = C_DRESS;
      ctx.beginPath();
      ctx.roundRect(0, -2.5, 10, 5, 2.5);
      ctx.fill();
      ctx.fillStyle = C_SKIN;
      ctx.beginPath();
      ctx.arc(10, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Pierna lejana recogida
      ctx.fillStyle = C_BOOTS;
      ctx.beginPath();
      ctx.roundRect(-7, -8, 6, 10, 3);
      ctx.fill();

      // Capa flameando alta
      ctx.save();
      ctx.translate(-4, shoulderY + 2);
      ctx.rotate(0.48);
      ctx.fillStyle = C_CAPE;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-18, 8, -14, 22);
      ctx.lineTo(4, 15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C_CAPE_TRIM;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();

      // Vestido
      ctx.fillStyle = C_DRESS;
      ctx.beginPath();
      ctx.moveTo(-11, hipY);
      ctx.lineTo(11, hipY);
      ctx.lineTo(8, shoulderY);
      ctx.lineTo(-8, shoulderY);
      ctx.closePath();
      ctx.fill();

      // Pierna cercana recogida
      ctx.fillStyle = C_BOOTS;
      ctx.beginPath();
      ctx.roundRect(2, -6, 6, 10, 3);
      ctx.fill();

      // Brazo cercano adelantado para equilibrio
      ctx.save();
      ctx.translate(2, shoulderY + 2);
      ctx.rotate(-0.55);
      ctx.fillStyle = C_DRESS;
      ctx.beginPath();
      ctx.roundRect(0, -2.5, 10, 5, 2.5);
      ctx.fill();
      ctx.fillStyle = C_SKIN;
      ctx.beginPath();
      ctx.arc(10, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Cabeza y rostro alegre
      ctx.fillStyle = C_HAIR;
      ctx.beginPath();
      ctx.arc(0, headY, 14.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-13, headY + 3, 6.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C_SKIN;
      ctx.beginPath();
      ctx.arc(1, headY + 1, 11.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C_HAIR;
      ctx.beginPath();
      ctx.arc(1, headY - 4, 11.5, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();
      ctx.fillStyle = C_CHEEK;
      ctx.beginPath();
      ctx.arc(5, headY + 4, 3.2, 0, Math.PI * 2);
      ctx.arc(-2, headY + 4, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C_EYE;
      ctx.beginPath();
      ctx.arc(5, headY + 1, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(5.8, headY + 0.3, 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C_MOUTH;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(4, headY + 5, 2.2, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = C_CAPE;
      ctx.beginPath();
      ctx.arc(-2, headY - 8, 4.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    // 4. ESTADO: DAÑO / SUSTO (HURT)
    if (animState === 'hurt') {
      ctx.translate(-4, 0);
      ctx.rotate(-0.08);

      ctx.fillStyle = C_BOOTS;
      ctx.beginPath();
      ctx.roundRect(-7, -12, 6, 12, 3);
      ctx.roundRect(1, -12, 6, 12, 3);
      ctx.fill();

      ctx.save();
      ctx.translate(-4, -28);
      ctx.rotate(-0.1);
      ctx.fillStyle = C_CAPE;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-14, 8, -10, 20);
      ctx.lineTo(4, 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C_CAPE_TRIM;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = C_DRESS;
      ctx.beginPath();
      ctx.moveTo(-11, -12);
      ctx.lineTo(11, -12);
      ctx.lineTo(8, -28);
      ctx.lineTo(-8, -28);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = C_DRESS;
      ctx.beginPath();
      ctx.roundRect(-3, -24, 8, 5, 2.5);
      ctx.fill();
      ctx.fillStyle = C_SKIN;
      ctx.beginPath();
      ctx.arc(6, -21.5, 3, 0, Math.PI * 2);
      ctx.fill();

      const headY = -37;
      ctx.fillStyle = C_HAIR;
      ctx.beginPath();
      ctx.arc(0, headY, 14.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-13, headY + 3, 6.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C_SKIN;
      ctx.beginPath();
      ctx.arc(1, headY + 1, 11.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C_HAIR;
      ctx.beginPath();
      ctx.arc(1, headY - 4, 11.5, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();
      ctx.fillStyle = C_CHEEK;
      ctx.beginPath();
      ctx.arc(5, headY + 4, 3.2, 0, Math.PI * 2);
      ctx.arc(-2, headY + 4, 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Ojos cerrados de susto
      ctx.strokeStyle = C_EYE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(5, headY + 1, 3, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      ctx.strokeStyle = C_MOUTH;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(4, headY + 6, 1.6, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      ctx.fillStyle = C_CAPE;
      ctx.beginPath();
      ctx.arc(-2, headY - 8, 4.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    // 5. ESTADO: CORRER (RUN) - Ciclo fluido sin patinar, pies siempre en suelo
    if (animState === 'run') {
      const strideAmp = 9.5;
      const hipBob = Math.abs(Math.sin(stepPhase)) * 1.4;
      const hipY = -13 + hipBob;
      const shoulderY = hipY - 14;
      const headY = shoulderY - 9;

      // Cálculo cinemático de posición de pies para fase de apoyo (grounded, fy = 0) y vuelo (arco)
      function getLegPos(phaseOffset) {
        const theta = stepPhase + phaseOffset;
        const t = ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (t < Math.PI) {
          const p = t / Math.PI;
          return {
            fx: strideAmp - p * (strideAmp * 2),
            fy: 0, // En el suelo exactamente
            grounded: true
          };
        } else {
          const p = (t - Math.PI) / Math.PI;
          return {
            fx: -strideAmp + p * (strideAmp * 2),
            fy: -Math.sin(p * Math.PI) * 5.5, // Levantado en arco
            grounded: false
          };
        }
      }

      const nearLeg = getLegPos(0);
      const farLeg = getLegPos(Math.PI);

      function drawLeg(hx, hy, fx, fy, grounded) {
        const midX = (hx + fx) / 2;
        const midY = (hy + fy) / 2;
        const kneeX = midX + (grounded ? 2.5 : 4.0);
        const kneeY = midY - 1.0;

        ctx.strokeStyle = C_BOOTS;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(fx, fy - 3);
        ctx.stroke();

        ctx.fillStyle = C_BOOTS;
        ctx.beginPath();
        ctx.roundRect(fx - 4, fy - 6, 9.5, 6, 2.5);
        ctx.fill();
      }

      // 1. Brazo lejano (en oposición biomecánica a la pierna lejana)
      const armFarAngle = Math.cos(stepPhase) * 0.72;
      ctx.save();
      ctx.translate(-2, shoulderY + 2);
      ctx.rotate(armFarAngle);
      ctx.fillStyle = C_DRESS;
      ctx.beginPath();
      ctx.roundRect(0, -2.5, 8, 5, 2.5);
      ctx.fill();
      ctx.translate(7, 0);
      ctx.rotate(0.35);
      ctx.beginPath();
      ctx.roundRect(0, -2, 6, 4, 2);
      ctx.fill();
      ctx.fillStyle = C_SKIN;
      ctx.beginPath();
      ctx.arc(6, 0, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Pierna lejana
      drawLeg(-3, hipY, farLeg.fx, farLeg.fy, farLeg.grounded);

      // 3. Capa roja flameando hacia atrás
      const capeAngle = 0.36 + Math.sin(stepPhase) * 0.14;
      ctx.save();
      ctx.translate(-4, shoulderY + 2);
      ctx.rotate(capeAngle);
      ctx.fillStyle = C_CAPE;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-18, 9, -15, 23);
      ctx.quadraticCurveTo(-4, 19, 4, 15);
      ctx.lineTo(4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C_CAPE_TRIM;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();

      // 4. Vestido azul/verde pastel
      ctx.fillStyle = C_DRESS;
      ctx.beginPath();
      ctx.moveTo(-11, hipY);
      ctx.lineTo(11, hipY);
      ctx.lineTo(8, shoulderY);
      ctx.lineTo(-8, shoulderY);
      ctx.closePath();
      ctx.fill();

      // 5. Pierna cercana
      drawLeg(3, hipY, nearLeg.fx, nearLeg.fy, nearLeg.grounded);

      // 6. Brazo cercano (en oposición biomecánica a la pierna cercana)
      const armNearAngle = -Math.cos(stepPhase) * 0.72;
      ctx.save();
      ctx.translate(2, shoulderY + 2);
      ctx.rotate(armNearAngle);
      ctx.fillStyle = C_DRESS;
      ctx.beginPath();
      ctx.roundRect(0, -2.5, 8, 5, 2.5);
      ctx.fill();
      ctx.translate(7, 0);
      ctx.rotate(0.40);
      ctx.beginPath();
      ctx.roundRect(0, -2, 6, 4, 2);
      ctx.fill();
      ctx.fillStyle = C_SKIN;
      ctx.beginPath();
      ctx.arc(6, 0, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 7. Cabeza, rostro y expresión decidida
      ctx.fillStyle = C_HAIR;
      ctx.beginPath();
      ctx.arc(0, headY, 14.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-13, headY + 3, 6.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C_SKIN;
      ctx.beginPath();
      ctx.arc(1, headY + 1, 11.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C_HAIR;
      ctx.beginPath();
      ctx.arc(1, headY - 4, 11.5, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();
      ctx.fillStyle = C_CHEEK;
      ctx.beginPath();
      ctx.arc(5, headY + 4, 3.2, 0, Math.PI * 2);
      ctx.arc(-2, headY + 4, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C_EYE;
      ctx.beginPath();
      ctx.arc(5, headY + 1, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(5.8, headY + 0.3, 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C_MOUTH;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(4, headY + 5, 2.2, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = C_CAPE;
      ctx.beginPath();
      ctx.arc(-2, headY - 8, 4.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    // 6. ESTADO: REPOSO (IDLE) - Ambos pies firmemente en el suelo (y = 0)
    const breath = Math.sin(animTime * 3.2) * 0.8;
    const hipY = -12 - breath;
    const shoulderY = hipY - 14;
    const headY = shoulderY - 9;

    // Brazo lejano relajado
    ctx.save();
    ctx.translate(-2, shoulderY + 2);
    ctx.rotate(0.08);
    ctx.fillStyle = C_DRESS;
    ctx.beginPath();
    ctx.roundRect(-2, 0, 4, 12, 2);
    ctx.fill();
    ctx.fillStyle = C_SKIN;
    ctx.beginPath();
    ctx.arc(0, 12, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Botitas apoyadas juntas en el suelo (y = 0)
    ctx.fillStyle = C_BOOTS;
    ctx.beginPath();
    ctx.roundRect(-7, -12, 6, 12, 3);
    ctx.roundRect(1, -12, 6, 12, 3);
    ctx.fill();

    // Capa roja
    const idleCape = Math.sin(animTime * 2.5) * 0.05;
    ctx.save();
    ctx.translate(-4, shoulderY + 2);
    ctx.rotate(idleCape);
    ctx.fillStyle = C_CAPE;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-16, 9, -13, 23);
    ctx.lineTo(4, 15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C_CAPE_TRIM;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();

    // Vestido
    ctx.fillStyle = C_DRESS;
    ctx.beginPath();
    ctx.moveTo(-11, hipY);
    ctx.lineTo(11, hipY);
    ctx.lineTo(8, shoulderY);
    ctx.lineTo(-8, shoulderY);
    ctx.closePath();
    ctx.fill();

    // Brazo cercano relajado
    ctx.save();
    ctx.translate(2, shoulderY + 2);
    ctx.rotate(-0.06);
    ctx.fillStyle = C_DRESS;
    ctx.beginPath();
    ctx.roundRect(-2, 0, 4, 12, 2);
    ctx.fill();
    ctx.fillStyle = C_SKIN;
    ctx.beginPath();
    ctx.arc(0, 12, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Cabeza y rostro dulce
    ctx.fillStyle = C_HAIR;
    ctx.beginPath();
    ctx.arc(0, headY, 14.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-13, headY + 3, 6.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C_SKIN;
    ctx.beginPath();
    ctx.arc(1, headY + 1, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C_HAIR;
    ctx.beginPath();
    ctx.arc(1, headY - 4, 11.5, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    ctx.fillStyle = C_CHEEK;
    ctx.beginPath();
    ctx.arc(5, headY + 4, 3.2, 0, Math.PI * 2);
    ctx.arc(-2, headY + 4, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C_EYE;
    ctx.beginPath();
    ctx.arc(5, headY + 1, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(5.8, headY + 0.3, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C_MOUTH;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(4, headY + 5, 1.8, 0.1, Math.PI * 0.9);
    ctx.stroke();
    ctx.fillStyle = C_CAPE;
    ctx.beginPath();
    ctx.arc(-2, headY - 8, 4.8, 0, Math.PI * 2);
    ctx.fill();

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

        // Dibujar a la niña con ciclo de correr fluido (sin sombra ovalada debajo)
        let girlState = 'idle';
        if (phase === 'react') {
          girlState = 'duck'; // Se cubre la cabeza asustada
        } else if (phase === 'run') {
          girlState = 'run';
        }

        drawAnika(ctx, girlX, girlY, {
          state: girlState,
          facingRight: true,
          stepPhase: (girlX / 18) * Math.PI,
          animTime: elapsed
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
    let cameraY = 0; // Seguimiento vertical suave y lineal durante la escalada
    let livesAtLevelStart = 3;
    let levelInitialized = false;

    let maxCameraX = 0; // Límite izquierdo que avanza con la cámara (no volver atrás)

    // Cinemática de salida hacia el Gran Pino (Nivel 6)
    let exitCinePhase = 'shaft_climb'; // 'shaft_climb', 'surface_emerge', 'walk_to_tree', 'tree_jump_branch', 'tree_climb_trunk'
    let exitCineTimer = 0;
    let exitCineGirlX = 0;
    let exitCineGirlY = 0;
    let exitCineGirlState = 'climbing';
    let exitCineFacingRight = true;
    let exitDustParticles = [];
    let exitFlashAlpha = 0;
    let exitFadeBlackAlpha = 0;

    // Repisas del pozo vertical (29 repisas, separación vertical 30.0px <= 60% altura de la niña, zigzag suave)
    const shaftLedges = [];
    const SHAFT_TOTAL_LEDGES = 29;
    const SHAFT_BOTTOM_Y = 950;
    const SHAFT_TOP_Y = 110;
    const SHAFT_STEP_DY = (SHAFT_BOTTOM_Y - SHAFT_TOP_Y) / (SHAFT_TOTAL_LEDGES - 1); // 30.0 px
    for (let i = 0; i < SHAFT_TOTAL_LEDGES; i++) {
      const ly = SHAFT_BOTTOM_Y - i * SHAFT_STEP_DY;
      const lx = (i % 2 === 0) ? 604 : 676;
      shaftLedges.push({
        x: lx,
        y: ly,
        w: 68,
        h: 14
      });
    }

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
      stepPhase: 0,
      jumpHold: false
    };

    // Dinámica de trepada en Roca Grande (Tramo 1)
    let isClimbing = false;
    let climbProgress = 0;             // De 0 a CLIMB_PRESSES
    let activeClimbRock = null;
    let enterBadgeAnimTimer = 0;       // Efecto de tecla hundida al presionar

    // Dinámica de Derrumbe del puente colgante
    let collapseActive = false;
    let collapseX = TRAMO1_DIST - 100;

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

    // Rocas gigantes que bloquean el camino (Tramo 1) - Altura BIG_ROCK_BASE_HEIGHT = 115px (2.2 veces la niña)
    const bigRocks = [
      { x: 920, w: BIG_ROCK_WIDTH, h: BIG_ROCK_BASE_HEIGHT, climbed: false, variant: 0 },
      { x: 1840, w: BIG_ROCK_WIDTH, h: BIG_ROCK_BASE_HEIGHT, climbed: false, variant: 1 }
    ];

    // --- OBSTÁCULOS: TABLAS DEL PUENTE CON HUECOS ---
    const PLANK_WIDTH = 48;
    const bridgePlanks = [];
    const totalBridgeLength = BRIDGE_END_X - TRAMO1_DIST;
    const totalPlanks = Math.ceil(totalBridgeLength / PLANK_WIDTH);

    // Huecos programados (máximo 2 tablas consecutivas = ~96px, fácilmente cruzables con el salto del Nivel 2: 145-193px)
    const holeIndices = new Set([
      6, 7,        // Primer hueco (2 tablas)
      14, 15,      // Segundo hueco (2 tablas)
      23, 24,      // Tercer hueco (2 tablas)
      32, 33,      // Cuarto hueco (2 tablas)
      42, 43,      // Quinto hueco (2 tablas)
      49           // Sexto hueco (1 tabla = 48px)
    ]);

    // Tablas flojas que crujen y dan aviso previo de 0.7s antes de caer
    const looseIndices = new Set([11, 20, 28, 38, 46]);

    for (let i = 0; i < totalPlanks; i++) {
      const px = TRAMO1_DIST + i * PLANK_WIDTH;
      bridgePlanks.push({
        index: i,
        x: px,
        y: CAVE_GROUND_Y,
        w: PLANK_WIDTH - 4,
        h: 18,
        isHole: holeIndices.has(i),
        isLoose: looseIndices.has(i),
        creaked: false,
        warnTimer: HOLE_WARN_TIME,
        collapsed: false,
        falling: false,
        vy: 0,
        rot: 0,
        rotSpeed: 0
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

    function init(isRetry = false) {
      timer = 0;
      gameOver = false;
      completed = false;
      tutorialTimer = 5.0;
      invulTimer = 0;
      hurtTimer = 0;
      graceTimer = 0;
      transitionSent = false;
      exitLightAlpha = 0;
      cameraY = 0;

      exitCinePhase = 'shaft_climb';
      exitCineTimer = 0;
      exitCineGirlX = (shaftLedges.length > 0) ? shaftLedges[0].x : 604;
      exitCineGirlY = (shaftLedges.length > 0) ? shaftLedges[0].y : 950;
      exitCineGirlState = 'climbing';
      exitCineFacingRight = true;
      exitFlashAlpha = 0;
      exitFadeBlackAlpha = 0;
      exitDustParticles = [];

      enterPressCount = 0;
      enterBadgeAnimTimer = 0;

      // 3. VIDAS: Compartidas, sin recuperar al entrar ni salir del nivel.
      // REINTENTAR reinicia con las vidas con que entró al nivel (mínimo 1).
      if (!isRetry) {
        const currentLives = (dependencies.gameState && typeof dependencies.gameState.lives === 'number')
          ? dependencies.gameState.lives
          : 3;
        livesAtLevelStart = Math.max(1, Math.min(3, currentLives));
        if (dependencies.gameState) {
          dependencies.gameState.lives = livesAtLevelStart;
          dependencies.gameState.livesAtLevelStart = livesAtLevelStart;
        }
      } else {
        if (dependencies.gameState) {
          dependencies.gameState.lives = Math.max(1, livesAtLevelStart);
          dependencies.gameState.livesAtLevelStart = livesAtLevelStart;
        }
      }
      levelInitialized = true;

      player.x = 120;
      player.y = CAVE_GROUND_Y;
      player.vx = 0;
      player.vy = 0;
      player.facingRight = true;
      player.onGround = true;
      player.state = 'idle';
      player.animTime = 0;
      player.stepPhase = 0;
      player.jumpHold = false;

      maxCameraX = 0;
      isClimbing = false;
      climbProgress = 0;
      activeClimbRock = null;

      collapseActive = false;
      collapseX = TRAMO1_DIST - 100;

      rockPool.forEach(r => { r.active = false; });
      rockSpawnTimer = 1.8;

      bigRocks.forEach(br => { br.climbed = false; });

      bridgePlanks.forEach(p => {
        p.creaked = false;
        p.warnTimer = HOLE_WARN_TIME;
        p.collapsed = false;
        p.falling = false;
        p.y = CAVE_GROUND_Y;
        p.vy = 0;
        p.rot = 0;
        p.rotSpeed = 0;
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
      return 2;
    }

    // Sistema unificado de daño: quita exactamente 1 vida con invulnerabilidad y parpadeo
    function takeDamage() {
      if (invulTimer > 0) return false;

      if (dependencies.gameState) {
        if (typeof dependencies.gameState.loseLife === 'function') {
          dependencies.gameState.loseLife();
        } else {
          dependencies.gameState.lives = Math.max(0, dependencies.gameState.lives - 1);
        }
      }

      invulTimer = BLINK_DURATION;
      hurtTimer = 0.45;
      graceTimer = RESPAWN_GRACE_TIME;

      if (dependencies.gameState && dependencies.gameState.lives <= 0) {
        gameOver = true;
      }
      return true;
    }

    // Reaparición tras daño por abismo o derrumbe
    function respawnPlayer() {
      // Reaparece exactamente al inicio del puente
      player.x = TRAMO1_DIST + 40;
      player.y = CAVE_GROUND_Y;
      player.vx = 0;
      player.vy = 0;
      player.onGround = true;
      player.state = 'idle';
      player.stepPhase = 0;

      // Derrumbe completamente reiniciado
      collapseActive = false;
      collapseX = TRAMO1_DIST - 100;

      // Gracia de 1 segundo sin amenazas
      invulTimer = BLINK_DURATION;
      hurtTimer = 0;
      graceTimer = RESPAWN_GRACE_TIME;

      // Restaurar todas las tablas colapsadas del puente
      bridgePlanks.forEach(p => {
        p.creaked = false;
        p.warnTimer = HOLE_WARN_TIME;
        p.collapsed = false;
        p.falling = false;
        p.y = CAVE_GROUND_Y;
        p.vy = 0;
        p.rot = 0;
        p.rotSpeed = 0;
      });

      // Ajustar cámara para que el límite izquierdo no la bloquee
      maxCameraX = Math.max(0, TRAMO1_DIST - dependencies.width * 0.38);
    }

    // --- ACCIÓN ENTER PRINCIPAL (REGISTRO POR PULSACIÓN INDIVIDUAL) ---
    function registerEnterPress() {
      enterPressCount++;
      enterBadgeAnimTimer = ENTER_MASH_FEEDBACK;

      // ÚNICAMENTE en Tramo 1 para trepar Rocas Grandes (no se usa en el puente)
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
          const triggerMin = br.x - br.w * 0.45 - CLIMB_RANGE;
          const triggerMax = br.x - br.w * 0.25;
          if (!br.climbed && player.x >= triggerMin && player.x <= triggerMax) {
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

      return false;
    }

    function toggleDebug() {
      debugMode = !debugMode;
    }

    function initExitDustParticles() {
      exitDustParticles = [];
      for (let i = 0; i < 30; i++) {
        exitDustParticles.push({
          x: (dependencies.width / 2) + (Math.random() - 0.5) * 220,
          y: Math.random() * dependencies.height,
          vy: -14 - Math.random() * 22,
          swayAmp: 10 + Math.random() * 16,
          swayFreq: 1.4 + Math.random() * 2,
          phase: Math.random() * Math.PI * 2,
          size: 1.8 + Math.random() * 2.2,
          alpha: 0.35 + Math.random() * 0.45
        });
      }
    }

    function skipExitCinematic() {
      if (transitionSent) return;
      transitionSent = true;
      dependencies.switchState(dependencies.states.LEVEL3, 0.05, 0.2);
    }

    function updateExitCinematic(dt) {
      exitCineTimer += dt;

      // Partículas de polvo ascendiendo en el haz de luz
      exitDustParticles.forEach(p => {
        p.y += p.vy * dt;
        p.x += Math.sin(exitCineTimer * p.swayFreq + p.phase) * (p.swayAmp * 0.4) * dt;
        if (p.y < 0) {
          p.y = dependencies.height + 150;
          p.x = (dependencies.width / 2) + (Math.random() - 0.5) * 220;
        }
      });

      if (exitCinePhase === 'shaft_climb') {
        const prog = Math.min(1.0, exitCineTimer / CLIMB_OUT_TIME);
        const totalSteps = SHAFT_TOTAL_LEDGES - 1; // 28 pasos de repisa a repisa
        const stepDuration = CLIMB_OUT_TIME / totalSteps;

        const currentStep = Math.min(totalSteps - 1, Math.floor(exitCineTimer / stepDuration));
        const stepProgress = (exitCineTimer - currentStep * stepDuration) / stepDuration;
        const curLedge = shaftLedges[currentStep];
        const nextLedge = shaftLedges[currentStep + 1];

        exitCineFacingRight = (nextLedge.x >= curLedge.x);

        if (stepProgress < 0.22) {
          // Fase 1: Apoyo firme de botas en la repisa y flexión previa
          exitCineGirlX = curLedge.x;
          exitCineGirlY = curLedge.y;
          exitCineGirlState = 'climbing';
        } else if (stepProgress < 0.82) {
          // Fase 2: Impulso natural en arco de salto corto hacia la repisa superior
          const s = (stepProgress - 0.22) / 0.60;
          const jumpArc = Math.sin(s * Math.PI) * 12;
          exitCineGirlX = curLedge.x + s * (nextLedge.x - curLedge.x);
          exitCineGirlY = curLedge.y + s * (nextLedge.y - curLedge.y) - jumpArc;
          exitCineGirlState = 'jump';
        } else {
          // Fase 3: Aterrizaje firme con los pies sobre la repisa y manos agarradas
          exitCineGirlX = nextLedge.x;
          exitCineGirlY = nextLedge.y;
          exitCineGirlState = 'climbing';
        }

        if (prog >= 1.0) {
          exitCinePhase = 'surface_emerge';
          exitCineTimer = 0;
          exitFlashAlpha = 0.95;
          if (dependencies.audio && dependencies.audio.sfxStep) dependencies.audio.sfxStep();
        }
      } else if (exitCinePhase === 'surface_emerge') {
        exitFlashAlpha = Math.max(0, exitFlashAlpha - dt * 1.5);
        exitCineGirlX = 240;
        exitCineGirlY = 560; // Pies sobre el pasto exterior (560)
        exitCineGirlState = 'idle';
        exitCineFacingRight = true;

        if (exitCineTimer >= SURFACE_LOOK_TIME) {
          exitCinePhase = 'walk_to_tree';
          exitCineTimer = 0;
        }
      } else if (exitCinePhase === 'walk_to_tree') {
        const prog = Math.min(1.0, exitCineTimer / WALK_TO_TREE_TIME);
        const startX = 240;
        const targetX = (dependencies.width / 2) - 30; // 610, base del tronco del gran pino
        exitCineGirlX = startX + prog * (targetX - startX);
        exitCineGirlY = 560; // Pies firmes sobre el pasto
        exitCineGirlState = (prog >= 1.0) ? 'idle' : 'run';
        exitCineFacingRight = true;

        if (prog >= 1.0) {
          exitCinePhase = 'tree_jump_branch';
          exitCineTimer = 0;
        }
      } else if (exitCinePhase === 'tree_jump_branch') {
        const JUMP_BRANCH_TIME = 0.85;
        const prog = Math.min(1.0, exitCineTimer / JUMP_BRANCH_TIME);
        const branchX = dependencies.width / 2 - 10; // 630
        const branchY = 515; // Primera rama gruesa baja del pino

        if (prog < 0.2) {
          // Flexión previa antes de impulsarse
          exitCineGirlX = (dependencies.width / 2) - 30;
          exitCineGirlY = 560;
          exitCineGirlState = 'duck';
          exitCineFacingRight = true;
        } else if (prog < 0.78) {
          // Salto en arco hacia la primera rama gruesa
          const s = (prog - 0.2) / 0.58;
          const jumpArc = Math.sin(s * Math.PI) * 26;
          exitCineGirlX = (dependencies.width / 2 - 30) + s * 20;
          exitCineGirlY = 560 + s * (branchY - 560) - jumpArc;
          exitCineGirlState = 'jump';
          exitCineFacingRight = true;
          if (exitCineTimer - dt < 0.2 && dependencies.audio && dependencies.audio.sfxJump) {
            dependencies.audio.sfxJump();
          }
        } else {
          // Aterrizaje firme con los pies sobre la rama
          exitCineGirlX = branchX;
          exitCineGirlY = branchY;
          exitCineGirlState = 'idle';
          exitCineFacingRight = true;
        }

        if (prog >= 1.0) {
          exitCinePhase = 'tree_climb_trunk';
          exitCineTimer = 0;
          if (dependencies.audio && dependencies.audio.sfxClimb) dependencies.audio.sfxClimb();
        }
      } else if (exitCinePhase === 'tree_climb_trunk') {
        const CLIMB_TRUNK_TIME = 2.2;
        const prog = Math.min(1.0, exitCineTimer / CLIMB_TRUNK_TIME);
        const startY = 515;
        const targetY = 430; // Ascendiendo por el tronco hacia la copa

        exitCineGirlX = (dependencies.width / 2 - 10) + Math.sin(exitCineTimer * 4.5) * 6;
        exitCineGirlY = startY + prog * (targetY - startY);
        exitCineGirlState = 'climbing';
        exitCineFacingRight = true;

        // Fundido suave a negro de 1 segundo hacia el nivel 6
        if (exitCineTimer >= 1.1) {
          const fadeProg = Math.min(1.0, (exitCineTimer - 1.1) / CINE_FADE_OUT_TIME);
          exitFadeBlackAlpha = fadeProg;
          if (fadeProg >= 1.0 && !transitionSent) {
            transitionSent = true;
            dependencies.switchState(dependencies.states.LEVEL3, 0.035, 0.3);
          }
        }
      }
    }

    function drawExitCinematic(ctx) {
      const W = dependencies.width;
      const H = dependencies.height;

      if (exitCinePhase === 'shaft_climb') {
        // --- 1. POZO VERTICAL ALTO DE ROCA ---
        ctx.fillStyle = '#1c1524';
        ctx.fillRect(0, 0, W, H);

        const shaftCenterX = W / 2;
        const shaftLeft = shaftCenterX - 110;
        const shaftRight = shaftCenterX + 110;

        // Cálculo de cámara suave y lineal sin rebote
        const prog = Math.min(1.0, exitCineTimer / CLIMB_OUT_TIME);
        const shaftCamY = (1.0 - prog) * (SHAFT_BOTTOM_Y - (H - 90));

        ctx.save();
        ctx.translate(0, -shaftCamY);

        // Pared rocosa izquierda
        ctx.fillStyle = '#2b1f33';
        ctx.fillRect(0, -60, shaftLeft, SHAFT_BOTTOM_Y + 140);
        ctx.fillStyle = '#382842';
        for (let y = -40; y < SHAFT_BOTTOM_Y + 120; y += 95) {
          ctx.beginPath();
          ctx.roundRect(shaftLeft - 90, y, 90, 48, [0, 16, 16, 0]);
          ctx.fill();
        }

        // Pared rocosa derecha
        ctx.fillStyle = '#2b1f33';
        ctx.fillRect(shaftRight, -60, W - shaftRight, SHAFT_BOTTOM_Y + 140);
        ctx.fillStyle = '#382842';
        for (let y = 10; y < SHAFT_BOTTOM_Y + 120; y += 95) {
          ctx.beginPath();
          ctx.roundRect(shaftRight, y, 90, 48, [16, 0, 0, 16]);
          ctx.fill();
        }

        // Haz de luz cálida cayendo desde la salida en el techo
        const beamGrad = ctx.createLinearGradient(shaftCenterX, SHAFT_TOP_Y - 40, shaftCenterX, SHAFT_BOTTOM_Y + 40);
        beamGrad.addColorStop(0, 'rgba(255, 235, 175, 0.48)');
        beamGrad.addColorStop(0.35, 'rgba(255, 220, 145, 0.24)');
        beamGrad.addColorStop(1, 'rgba(255, 205, 120, 0.03)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(shaftCenterX - 45, SHAFT_TOP_Y - 30);
        ctx.lineTo(shaftCenterX + 45, SHAFT_TOP_Y - 30);
        ctx.lineTo(shaftRight + 20, SHAFT_BOTTOM_Y + 40);
        ctx.lineTo(shaftLeft - 20, SHAFT_BOTTOM_Y + 40);
        ctx.closePath();
        ctx.fill();

        // Raíces colgantes desde la superficie
        ctx.strokeStyle = '#4a3319';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(shaftLeft + 10, SHAFT_TOP_Y - 20);
        ctx.quadraticCurveTo(shaftLeft + 25, SHAFT_BOTTOM_Y * 0.4, shaftLeft - 5, SHAFT_BOTTOM_Y * 0.7);
        ctx.quadraticCurveTo(shaftLeft + 15, SHAFT_BOTTOM_Y * 0.9, shaftLeft + 5, SHAFT_BOTTOM_Y + 20);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(shaftRight - 10, SHAFT_TOP_Y - 20);
        ctx.quadraticCurveTo(shaftRight - 28, SHAFT_BOTTOM_Y * 0.45, shaftRight + 5, SHAFT_BOTTOM_Y * 0.75);
        ctx.quadraticCurveTo(shaftRight - 15, SHAFT_BOTTOM_Y * 0.92, shaftRight - 8, SHAFT_BOTTOM_Y + 20);
        ctx.stroke();

        // Musgo en paredes y raíces
        ctx.fillStyle = '#5b8c5a';
        for (let y = SHAFT_TOP_Y; y < SHAFT_BOTTOM_Y; y += 75) {
          ctx.beginPath();
          ctx.arc(shaftLeft + 10 + Math.sin(y) * 6, y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(shaftRight - 10 + Math.cos(y) * 6, y + 25, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Repisas de piedra alternadas (29 repisas, separación vertical 30px <= 60% de la niña)
        shaftLedges.forEach(ledge => {
          ctx.save();
          const ledgeGrad = ctx.createLinearGradient(ledge.x, ledge.y - ledge.h, ledge.x, ledge.y);
          ledgeGrad.addColorStop(0, '#584364');
          ledgeGrad.addColorStop(1, '#3b2b44');
          ctx.fillStyle = ledgeGrad;
          ctx.strokeStyle = '#755885';
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.roundRect(ledge.x - ledge.w / 2, ledge.y - ledge.h, ledge.w, ledge.h, [5, 5, 4, 4]);
          ctx.fill();
          ctx.stroke();

          // Capa de musgo verde pastel en la parte superior donde apoyan los pies
          ctx.fillStyle = '#629e63';
          ctx.beginPath();
          ctx.roundRect(ledge.x - ledge.w / 2 + 4, ledge.y - ledge.h - 2, ledge.w - 8, 4, 2);
          ctx.fill();

          ctx.restore();
        });

        // Apertura luminosa hacia la superficie arriba
        ctx.fillStyle = '#ffecb3';
        ctx.beginPath();
        ctx.ellipse(shaftCenterX, SHAFT_TOP_Y - 25, 75, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff9e6';
        ctx.beginPath();
        ctx.ellipse(shaftCenterX, SHAFT_TOP_Y - 28, 58, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Partículas de polvo doradas flotando en el haz
        exitDustParticles.forEach(p => {
          ctx.save();
          ctx.fillStyle = `rgba(255, 245, 195, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y + shaftCamY * 0.4, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // La niña escalando con pies firmes en repisas
        drawAnika(ctx, exitCineGirlX, exitCineGirlY, {
          state: exitCineGirlState,
          animTime: exitCineTimer,
          facingRight: exitCineFacingRight
        });

        ctx.restore();

      } else {
        // --- 2. SUPERFICIE: ATARDECER, MONTAÑAS Y EL GRAN PINO ---
        // Cielo de atardecer (mismo gradiente del inicio del Nivel 6)
        const skyGrad = ctx.createLinearGradient(0, 0, 0, 560);
        skyGrad.addColorStop(0, '#533b68');
        skyGrad.addColorStop(0.35, '#784464');
        skyGrad.addColorStop(0.7, '#ab5660');
        skyGrad.addColorStop(1, '#e89464');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);

        // Montañas lejanas en tonos pasteles violetas
        ctx.fillStyle = '#3a284c';
        ctx.beginPath();
        ctx.moveTo(-40, 560);
        ctx.lineTo(160, 360);
        ctx.lineTo(380, 480);
        ctx.lineTo(600, 340);
        ctx.lineTo(880, 500);
        ctx.lineTo(1120, 370);
        ctx.lineTo(W + 50, 560);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#553b66';
        ctx.beginPath();
        ctx.moveTo(-40, 560);
        ctx.lineTo(100, 430);
        ctx.lineTo(290, 510);
        ctx.lineTo(490, 420);
        ctx.lineTo(760, 530);
        ctx.lineTo(980, 440);
        ctx.lineTo(W + 50, 560);
        ctx.closePath();
        ctx.fill();

        // Tronco colosal del Gran Pino (en el centro, idéntico al Nivel 6)
        const trunkWidth = 190;
        const pineBaseX = W / 2;

        ctx.fillStyle = '#422c1d';
        ctx.fillRect(pineBaseX - trunkWidth / 2, 0, trunkWidth, 560);

        // Corteza del tronco
        ctx.strokeStyle = '#2b1b11';
        ctx.lineWidth = 4;
        for (let y = 40; y < 560; y += 65) {
          ctx.beginPath();
          ctx.moveTo(pineBaseX - trunkWidth / 2 + 10, y);
          ctx.quadraticCurveTo(pineBaseX, y + 22, pineBaseX + trunkWidth / 2 - 10, y);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(205, 151, 101, 0.28)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(pineBaseX - 52, 0);
        ctx.lineTo(pineBaseX - 52, 560);
        ctx.moveTo(pineBaseX + 48, 0);
        ctx.lineTo(pineBaseX + 48, 560);
        ctx.stroke();

        // Primera rama gruesa donde aterriza la niña (y = 515 / 545)
        ctx.fillStyle = '#3a2416';
        ctx.beginPath();
        ctx.roundRect(pineBaseX - 120, 515, 240, 20, 10);
        ctx.fill();
        ctx.strokeStyle = '#26170d';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Follaje de agujas de pino pastel alrededor de la rama base
        ctx.fillStyle = '#264d36';
        for (let fx = pineBaseX - 140; fx <= pineBaseX + 140; fx += 35) {
          ctx.beginPath();
          ctx.arc(fx, 525, 16, 0, Math.PI * 2);
          ctx.fill();
        }

        // Suelo exterior de pasto verde (a y = 560)
        ctx.fillStyle = '#4c804c';
        ctx.fillRect(0, 560, W, H - 560);

        // Borde superior de pasto con césped estilizado
        ctx.fillStyle = '#5ea65e';
        for (let gx = 0; gx < W; gx += 20) {
          ctx.beginPath();
          ctx.moveTo(gx, 560);
          ctx.lineTo(gx + 10, 550);
          ctx.lineTo(gx + 20, 560);
          ctx.fill();
        }

        // Borde del hueco de la cueva por donde salió (a la izquierda, x = 240)
        ctx.fillStyle = '#2b1f33';
        ctx.beginPath();
        ctx.ellipse(240, 564, 48, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5a3f68';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Niña animada en la superficie
        drawAnika(ctx, exitCineGirlX, exitCineGirlY, {
          state: exitCineGirlState,
          animTime: exitCineTimer,
          facingRight: exitCineFacingRight
        });

        // Breve destello de luz al salir al exterior
        if (exitFlashAlpha > 0) {
          ctx.fillStyle = `rgba(255, 248, 220, ${exitFlashAlpha})`;
          ctx.fillRect(0, 0, W, H);
        }

        // Fundido a negro suave de 1 s al empezar el nivel 6
        if (exitFadeBlackAlpha > 0) {
          ctx.fillStyle = `rgba(14, 12, 22, ${exitFadeBlackAlpha})`;
          ctx.fillRect(0, 0, W, H);
        }
      }

      // Botón SALTAR común a toda la cinemática
      const skipX = 75, skipY = 26, skipW = 110, skipH = 34;
      const skipHover = dependencies.mouse &&
        Math.abs(dependencies.mouse.x - skipX) < skipW / 2 &&
        Math.abs(dependencies.mouse.y - skipY) < skipH / 2;

      ctx.save();
      ctx.fillStyle = skipHover ? 'rgba(255, 255, 255, 0.32)' : 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.roundRect(skipX - skipW / 2, skipY - skipH / 2, skipW, skipH, 17);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = '600 14px Fredoka, Quicksand, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SALTAR', skipX, skipY);
      ctx.restore();

      if (dependencies.mouse && dependencies.mouse.clicked) {
        dependencies.mouse.clicked = false;
        skipExitCinematic();
      }

      dependencies.drawLogo(ctx, dependencies.logoSize);
    }

    function handleKey(e) {
      debugLastKey = e.code || e.key || 'Desconocida';

      if (e.code === 'KeyP' || e.code === 'Escape') {
        return false; // Permite pausar con P o Esc
      }

      if (completed) {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') {
          skipExitCinematic();
          if (typeof e.preventDefault === 'function') e.preventDefault();
          return true;
        }
        return false;
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
      if (!levelInitialized) {
        init(false);
      }

      timer += dt;
      if (tutorialTimer > 0) tutorialTimer -= dt;
      if (invulTimer > 0) invulTimer -= dt;
      if (hurtTimer > 0) hurtTimer -= dt;
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

      // Si el nivel ya fue completado, reproducir la cinemática de salida hacia el Gran Pino
      if (completed) {
        updateExitCinematic(dt);
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
          player.x = br.x + br.w * 0.42 + 25;
          player.y = CAVE_GROUND_Y;
          player.state = 'idle';
          activeClimbRock = null;
          if (dependencies.audio && dependencies.audio.sfxStep) {
            dependencies.audio.sfxStep();
          }
        } else {
          // Decaimiento suave si se deja de presionar
          climbProgress = Math.max(0, climbProgress - CLIMB_DECAY * dt);
          const frac = Math.min(1.0, climbProgress / CLIMB_PRESSES);

          // Escalada real en etapas visibles por la cara frontal de la roca
          if (frac < 0.35) {
            // Etapa 1: Manos en repisa 1 (-38px), pies levantándose del suelo
            const s1 = frac / 0.35;
            player.x = (br.x - br.w * 0.38) + s1 * 8;
            player.y = CAVE_GROUND_Y - s1 * 38;
            player.state = 'climbing';
          } else if (frac < 0.70) {
            // Etapa 2: Manos en repisa 2 (-75px), pies en repisa 1
            const s2 = (frac - 0.35) / 0.35;
            player.x = (br.x - br.w * 0.32) + s2 * 14;
            player.y = CAVE_GROUND_Y - 38 - s2 * 38;
            player.state = 'climbing';
          } else if (frac < 0.90) {
            // Etapa 3: Manos en la cresta superior (-115px), rodilla subiendo
            const s3 = (frac - 0.70) / 0.20;
            player.x = (br.x - br.w * 0.20) + s3 * 16;
            player.y = CAVE_GROUND_Y - 76 - s3 * 35;
            player.state = 'climbing';
          } else {
            // Etapa 4: De pie en la cima de la roca
            const s4 = (frac - 0.90) / 0.10;
            player.x = (br.x - 4) + s4 * 10;
            player.y = CAVE_GROUND_Y - BIG_ROCK_BASE_HEIGHT;
            player.state = 'idle';
          }
        }

        // Cámara vertical suave y lineal acompañando la escalada sin rebotes
        const targetCamY = Math.max(0, (CAVE_GROUND_Y - player.y) * 0.45);
        cameraY += (targetCamY - cameraY) * Math.min(1.0, 5.0 * dt);
      } else {
        // Al terminar o bajar de la roca, la cámara vertical vuelve suavemente a 0
        cameraY += (0 - cameraY) * Math.min(1.0, 5.0 * dt);
      }

      // --- 2. MOVIMIENTO Y SALTO DEL JUGADOR (BLOQUEADO SI ESTÁ TREPANDO) ---
      if (!isClimbing) {
        let moveDir = 0;
        if (dependencies.keys.left) moveDir -= 1;
        if (dependencies.keys.right) moveDir += 1;

        if (moveDir !== 0) {
          player.facingRight = (moveDir > 0);
          player.vx = moveDir * PLAYER_SPEED_NORMAL;
          player.animTime += dt * 8;
          if (player.onGround) {
            player.state = 'run';
            // Sincronización exacta de avance horizontal con paso de correr: 18px = 1 paso (pi rad)
            const dx = Math.abs(player.vx);
            player.stepPhase += (dx / 18) * Math.PI;
          }
        } else {
          player.vx = 0;
          if (player.onGround && hurtTimer <= 0) {
            player.state = 'idle';
            // Relajación suave hacia pose de reposo al detenerse
            player.stepPhase = (player.stepPhase % (Math.PI * 2));
            if (player.stepPhase > 0.05) {
              player.stepPhase += (0 - player.stepPhase) * Math.min(1.0, 10.0 * dt);
            } else {
              player.stepPhase = 0;
            }
          }
        }

        // SALTO: Desactivado en Tramo 1; habilitado en el puente (Tramo 2) con físicas exactas del Nivel 2
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
          dependencies.keys.jumpPressed = false;
        }

        // Aplicar gravedad en el aire
        if (!player.onGround || currentTramo >= 2) {
          player.vy += GRAVITY_ESCAPE;
          player.y += player.vy;
          if (!player.onGround) player.state = 'jump';
        }

        // Bloqueo horizontal frente a Rocas Grandes
        let nextX = player.x + player.vx;
        for (let i = 0; i < bigRocks.length; i++) {
          const br = bigRocks[i];
          const leftBound = br.x - br.w * 0.42;
          const rightBound = br.x + br.w * 0.42;

          if (!br.climbed) {
            // Aún no trepada: no puede atravesar hacia la derecha
            if (player.x <= leftBound && nextX > leftBound) {
              nextX = leftBound;
              player.vx = 0;
            }
          } else {
            // Ya trepada: la roca es sólida en ambas direcciones, no puede regresar hacia la izquierda
            if (player.x >= rightBound && nextX < rightBound) {
              nextX = rightBound;
              player.vx = 0;
            }
          }
        }

        // Límite izquierdo que avanza con la cámara (no puede retroceder por zonas ya superadas)
        const targetCamX = Math.max(0, Math.min(LEVEL5_TOTAL_DIST - dependencies.width, player.x - dependencies.width * 0.38));
        maxCameraX = Math.max(maxCameraX, targetCamX);

        const cameraLeftLimit = maxCameraX + 28;
        if (nextX < cameraLeftLimit) {
          nextX = cameraLeftLimit;
          if (player.vx < 0) player.vx = 0;
        }
        player.x = nextX;

        // Comprobar apoyo en suelo o puente
        if (currentTramo === 1) {
          // En Tramo 1 siempre está apoyada en el suelo
          player.y = CAVE_GROUND_Y;
          player.vy = 0;
          player.onGround = true;
        } else {
          // Tramo 2: Sobre el puente o sobre el acantilado de llegada
          let hasSupport = false;

          // Si ya cruzó al acantilado de llegada (x >= BRIDGE_END_X)
          if (player.x >= BRIDGE_END_X) {
            if (player.vy >= 0 && player.y >= CAVE_GROUND_Y - 6) {
              hasSupport = true;
              player.y = CAVE_GROUND_Y;
              player.vy = 0;
              player.onGround = true;
            }
          } else {
            // Sobre las tablas del puente colgante
            if (player.vy >= 0 && player.y >= CAVE_GROUND_Y - 6 && player.y <= CAVE_GROUND_Y + 12) {
              const plank = bridgePlanks.find(p => !p.isHole && !p.collapsed && player.x >= p.x - 8 && player.x <= p.x + p.w + 8);
              if (plank) {
                hasSupport = true;
                player.y = CAVE_GROUND_Y;
                player.vy = 0;
                player.onGround = true;

                // Tabla floja cruje y comienza su cuenta atrás
                if (plank.isLoose && !plank.creaked) {
                  plank.creaked = true;
                  if (dependencies.audio && dependencies.audio.sfxPlankCreak) {
                    dependencies.audio.sfxPlankCreak();
                  }
                }
              }
            }
          }

          if (!hasSupport && player.y > CAVE_GROUND_Y + 6) {
            player.onGround = false;
          }

          // Caída al abismo (pierde 1 vida y reaparece al inicio del puente)
          if (player.y > ABYSS_DEPTH_Y) {
            if (dependencies.audio && dependencies.audio.sfxSplash) {
              dependencies.audio.sfxSplash();
            }
            takeDamage();
            if (!gameOver) {
              respawnPlayer();
            }
          }
        }
      }

      // --- 3. CAÍDA DE ROCAS EN TRAMO 1 (CONTINÚA SIEMPRE, INCLUSO AL TREPAR) ---
      if (currentTramo === 1 && graceTimer <= 0) {
        rockSpawnTimer -= dt;
        if (rockSpawnTimer <= 0) {
          rockSpawnTimer = ROCK_FALL_MIN + Math.random() * (ROCK_FALL_MAX - ROCK_FALL_MIN);

          // Buscar columna adecuada en la pantalla visible
          const minSpawnX = Math.max(80, player.x - 260);
          const maxSpawnX = Math.min(TRAMO1_DIST - 100, player.x + 360);
          let targetX = minSpawnX + Math.random() * (maxSpawnX - minSpawnX);

          // No caer en la columna de ninguna roca grande
          const nearBigRock = bigRocks.some(br => Math.abs(targetX - br.x) < br.w * 0.55);

          // Si la niña está trepando, no caer en la columna de la niña
          const nearClimbingGirl = isClimbing && Math.abs(targetX - player.x) < 85;

          // Mantener EVENT_MIN_GAP entre columnas para permitir esquivar caminando
          const nearOtherRock = rockPool.some(r => r.active && Math.abs(r.x - targetX) < EVENT_MIN_GAP);

          if (!nearBigRock && !nearClimbingGirl && !nearOtherRock) {
            const r = rockPool.find(item => !item.active);
            if (r) {
              r.active = true;
              r.x = targetX;
              r.y = 35;
              r.vy = 0;
              r.radius = Math.round((18 + Math.random() * 4) * FALLING_ROCK_SCALE);
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
            if (dist < r.radius * 0.85 + 16) {
              r.hasHitPlayer = true;
              takeDamage();
              if (dependencies.audio && dependencies.audio.sfxRockImpact) {
                dependencies.audio.sfxRockImpact();
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

      // --- 4. HUECOS Y DERRUMBE DEL PUENTE (TRAMO 2) ---
      if (currentTramo >= 2) {
        // El derrumbe se activa en cuanto Anika pisa el puente
        if (!collapseActive && player.x >= TRAMO1_DIST) {
          collapseActive = true;
          collapseX = TRAMO1_DIST;
        }

        if (collapseActive) {
          // Velocidad constante COLLAPSE_SPEED (160 px/s, ligeramente menor que la carrera normal de 288 px/s)
          collapseX += COLLAPSE_SPEED * dt;
          if (collapseX > BRIDGE_END_X) collapseX = BRIDGE_END_X;

          // Derrumbar tablas que queden detrás
          bridgePlanks.forEach(p => {
            if (p.x + p.w <= collapseX && !p.collapsed) {
              p.collapsed = true;
              p.falling = true;
              p.vy = 1.0 + Math.random() * 2.0;
              p.rotSpeed = (Math.random() - 0.5) * 5;
              if (Math.random() < 0.6) {
                spawnDust(p.x + p.w / 2, CAVE_GROUND_Y + 10, 4, '#8a6e55');
              }
              if (Math.random() < 0.3) {
                spawnShatterFragments(p.x + p.w / 2, CAVE_GROUND_Y + 10);
              }
            }
          });

          // Si el derrumbe alcanza a la niña antes del acantilado de destino (pierde 1 vida y reaparece al inicio del puente)
          if (collapseX >= player.x - 14 && graceTimer <= 0 && invulTimer <= 0 && player.x < BRIDGE_END_X) {
            takeDamage();
            if (dependencies.audio && dependencies.audio.sfxRockImpact) {
              dependencies.audio.sfxRockImpact();
            }
            if (!gameOver) {
              respawnPlayer();
            }
          }
        }

        // Tablas flojas que crujieron: aviso previo de HOLE_WARN_TIME (0.7 s) antes de caer
        bridgePlanks.forEach(p => {
          if (p.creaked && !p.collapsed) {
            p.warnTimer -= dt;
            if (p.warnTimer <= 0) {
              p.collapsed = true;
              p.falling = true;
              p.vy = 1.2;
              p.rotSpeed = (Math.random() - 0.5) * 4;
              spawnDust(p.x + p.w / 2, CAVE_GROUND_Y + 10, 5, '#8a6e55');
            }
          }
          if (p.falling) {
            p.vy += GRAVITY_ESCAPE;
            p.y += p.vy;
            p.rot += p.rotSpeed * dt;
            if (p.y > dependencies.height + 60) p.falling = false;
          }
        });

        // Salida de la cueva al llegar al final del acantilado
        if (player.x >= LEVEL5_TOTAL_DIST - 60 && !completed) {
          completed = true;
          exitCinePhase = 'shaft_climb';
          exitCineTimer = 0;
          initExitDustParticles();
          if (dependencies.audio && dependencies.audio.sfxVictory) {
            dependencies.audio.sfxVictory();
          }
        }
      }
    }

    // --- POSTES DE ANCLAJE EN LOS ACANTILADOS ---
    function drawAnchorPost(ctx, x, groundY, isLeft) {
      ctx.save();
      const pw = 20;
      const ph = 68;
      const topY = groundY - 50;

      // Sombra proyectada del poste
      ctx.fillStyle = 'rgba(20, 14, 28, 0.45)';
      ctx.beginPath();
      ctx.ellipse(x, groundY + 2, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Madero vertical principal
      const postGrad = ctx.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
      postGrad.addColorStop(0, '#533924');
      postGrad.addColorStop(0.3, '#735235');
      postGrad.addColorStop(0.8, '#8a6442');
      postGrad.addColorStop(1, '#48301e');
      ctx.fillStyle = postGrad;
      ctx.beginPath();
      ctx.roundRect(x - pw / 2, topY, pw, ph, [5, 5, 2, 2]);
      ctx.fill();

      // Borde del madero
      ctx.strokeStyle = '#322013';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Remates metálicos / herrajes empernados a la roca
      ctx.fillStyle = '#423447';
      ctx.strokeStyle = '#6a5770';
      ctx.lineWidth = 1.5;
      // Abrazadera inferior
      ctx.beginPath();
      ctx.roundRect(x - pw / 2 - 2, groundY - 14, pw + 4, 10, 2);
      ctx.fill();
      ctx.stroke();
      // Pernos dorados/brillantes
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(x - 5, groundY - 9, 2, 0, Math.PI * 2);
      ctx.arc(x + 5, groundY - 9, 2, 0, Math.PI * 2);
      ctx.fill();

      // Abrazadera superior con argolla de donde sale la cuerda principal
      ctx.fillStyle = '#423447';
      ctx.beginPath();
      ctx.roundRect(x - pw / 2 - 2, topY + 12, pw + 4, 10, 2);
      ctx.fill();
      ctx.stroke();

      // Argolla de hierro
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x + (isLeft ? 8 : -8), topY + 17, 5, 0, Math.PI * 2);
      ctx.stroke();

      // Vueltas de cuerda enrollada en el poste
      ctx.strokeStyle = '#caa57a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x - pw / 2, topY + 28);
      ctx.lineTo(x + pw / 2, topY + 31);
      ctx.moveTo(x - pw / 2, topY + 33);
      ctx.lineTo(x + pw / 2, topY + 36);
      ctx.stroke();

      // Cuerda de retención anclada hacia atrás en la roca (guy-rope)
      ctx.strokeStyle = '#9c7b56';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      if (isLeft) {
        ctx.moveTo(x - 4, topY + 16);
        ctx.lineTo(x - 55, groundY - 4);
      } else {
        ctx.moveTo(x + 4, topY + 16);
        ctx.lineTo(x + 55, groundY - 4);
      }
      ctx.stroke();

      // Piquete de anclaje de la cuerda en la tierra
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      const stakeX = isLeft ? x - 55 : x + 55;
      ctx.roundRect(stakeX - 3, groundY - 8, 6, 12, 2);
      ctx.fill();

      ctx.restore();
    }

    // --- RENDERIZADO DEL NIVEL ---
    function draw(ctx) {
      if (completed) {
        drawExitCinematic(ctx);
        return;
      }
      buildCaveEscapeOffscreens(dependencies.width, dependencies.height);

      ctx.save();
      try {
        // Cálculo de cámara suave sin rebotes (únicamente avanza con límite izquierdo fijo)
        const targetCamX = Math.max(0, Math.min(LEVEL5_TOTAL_DIST - dependencies.width, player.x - dependencies.width * 0.38));
        const cameraX = Math.max(maxCameraX, targetCamX);

        // 1. Fondo de cueva con paralaje
        ctx.save();
        ctx.translate(-cameraX * 0.22, cameraY * 0.22);
        ctx.drawImage(bgCanvas, 0, 0);
        ctx.drawImage(bgCanvas, dependencies.width, 0);
        ctx.drawImage(bgCanvas, dependencies.width * 2, 0);
        ctx.restore();

        // 2. Abismo con niebla violeta suave
        ctx.save();
        ctx.translate(-cameraX * 0.5, cameraY * 0.35);
        ctx.drawImage(abyssCanvas, 0, 0);
        ctx.drawImage(abyssCanvas, dependencies.width, 0);
        ctx.drawImage(abyssCanvas, dependencies.width * 2, 0);
        ctx.restore();

        // 3. Suelo de roca firme del Tramo 1 (recortado exactamente en el acantilado x = TRAMO1_DIST)
        ctx.save();
        ctx.translate(-cameraX, cameraY);

        if (cameraX < TRAMO1_DIST + 100) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, CAVE_GROUND_Y, TRAMO1_DIST, dependencies.height - CAVE_GROUND_Y);
          ctx.clip();
          ctx.drawImage(foreGroundCanvas, 0, 0);
          ctx.drawImage(foreGroundCanvas, dependencies.width, 0);
          ctx.restore();
        }

        // Borde vertical de roca y acantilado de inicio (x = TRAMO1_DIST)
        if (TRAMO1_DIST >= cameraX - 100 && TRAMO1_DIST <= cameraX + dependencies.width + 100) {
          ctx.save();
          // Cara rocosa vertical hacia el abismo
          const cliffGrad = ctx.createLinearGradient(TRAMO1_DIST - 50, 0, TRAMO1_DIST, 0);
          cliffGrad.addColorStop(0, '#433452');
          cliffGrad.addColorStop(0.7, '#342646');
          cliffGrad.addColorStop(1, '#231830');
          ctx.fillStyle = cliffGrad;
          ctx.beginPath();
          ctx.moveTo(TRAMO1_DIST, CAVE_GROUND_Y);
          ctx.lineTo(TRAMO1_DIST, dependencies.height);
          ctx.lineTo(TRAMO1_DIST - 50, dependencies.height);
          ctx.lineTo(TRAMO1_DIST - 50, CAVE_GROUND_Y);
          ctx.closePath();
          ctx.fill();

          // Estratos y grietas de la roca vertical
          ctx.strokeStyle = '#1a1224';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let cy = CAVE_GROUND_Y + 18; cy < dependencies.height; cy += 32) {
            ctx.moveTo(TRAMO1_DIST - 42, cy);
            ctx.lineTo(TRAMO1_DIST - 2, cy + (cy % 10) - 5);
          }
          ctx.stroke();

          // Arista superior iluminada
          ctx.strokeStyle = 'rgba(255, 230, 200, 0.45)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(TRAMO1_DIST - 1, CAVE_GROUND_Y);
          ctx.lineTo(TRAMO1_DIST - 1, dependencies.height);
          ctx.stroke();

          // Poste de anclaje de madera clavado y empernado en la roca del acantilado
          drawAnchorPost(ctx, TRAMO1_DIST - 14, CAVE_GROUND_Y, true);
          ctx.restore();
        }

        // Acantilado de llegada y suelo firme de destino (x = BRIDGE_END_X hasta LEVEL5_TOTAL_DIST)
        if (BRIDGE_END_X <= cameraX + dependencies.width + 100) {
          ctx.save();
          // Suelo de roca firme en el lado opuesto
          const rightGroundGrad = ctx.createLinearGradient(0, CAVE_GROUND_Y, 0, dependencies.height);
          rightGroundGrad.addColorStop(0, '#564268');
          rightGroundGrad.addColorStop(0.3, '#433452');
          rightGroundGrad.addColorStop(1, '#2a2034');
          ctx.fillStyle = rightGroundGrad;
          ctx.fillRect(BRIDGE_END_X, CAVE_GROUND_Y, LEVEL5_TOTAL_DIST - BRIDGE_END_X + 200, dependencies.height - CAVE_GROUND_Y);

          // Borde superior iluminado del suelo
          ctx.strokeStyle = 'rgba(255, 230, 200, 0.35)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(BRIDGE_END_X, CAVE_GROUND_Y + 1);
          ctx.lineTo(LEVEL5_TOTAL_DIST + 200, CAVE_GROUND_Y + 1);
          ctx.stroke();

          // Cara rocosa vertical del acantilado de llegada bajando al abismo
          const rightCliffGrad = ctx.createLinearGradient(BRIDGE_END_X, 0, BRIDGE_END_X + 50, 0);
          rightCliffGrad.addColorStop(0, '#231830');
          rightCliffGrad.addColorStop(0.3, '#342646');
          rightCliffGrad.addColorStop(1, '#433452');
          ctx.fillStyle = rightCliffGrad;
          ctx.beginPath();
          ctx.moveTo(BRIDGE_END_X, CAVE_GROUND_Y);
          ctx.lineTo(BRIDGE_END_X, dependencies.height);
          ctx.lineTo(BRIDGE_END_X + 50, dependencies.height);
          ctx.lineTo(BRIDGE_END_X + 50, CAVE_GROUND_Y);
          ctx.closePath();
          ctx.fill();

          // Estratos y grietas en pared derecha
          ctx.strokeStyle = '#1a1224';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let cy = CAVE_GROUND_Y + 22; cy < dependencies.height; cy += 34) {
            ctx.moveTo(BRIDGE_END_X + 2, cy + (cy % 10) - 5);
            ctx.lineTo(BRIDGE_END_X + 42, cy);
          }
          ctx.stroke();

          // Arista derecha iluminada
          ctx.strokeStyle = 'rgba(255, 230, 200, 0.35)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(BRIDGE_END_X + 1, CAVE_GROUND_Y);
          ctx.lineTo(BRIDGE_END_X + 1, dependencies.height);
          ctx.stroke();

          // Poste de anclaje derecho
          drawAnchorPost(ctx, BRIDGE_END_X + 14, CAVE_GROUND_Y, false);
          ctx.restore();
        }

        // 4. Puente colgante real: cuerdas, tirantes y tablas de madera sobre el abismo
        // Cuerda pasamanos superior y cable inferior de soporte
        const ropeStart = Math.max(TRAMO1_DIST, collapseActive ? collapseX : TRAMO1_DIST);
        if (ropeStart < BRIDGE_END_X) {
          ctx.save();

          // Cuerda pasamanos superior
          ctx.strokeStyle = '#cda97e';
          ctx.lineWidth = 3.8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (let bx = ropeStart; bx <= BRIDGE_END_X; bx += 24) {
            const sag = Math.sin(((bx - TRAMO1_DIST) / (BRIDGE_END_X - TRAMO1_DIST)) * Math.PI) * 12;
            const ry = CAVE_GROUND_Y - 32 + sag;
            if (bx === ropeStart) ctx.moveTo(bx, ry);
            else ctx.lineTo(bx, ry);
          }
          ctx.lineTo(BRIDGE_END_X + 14, CAVE_GROUND_Y - 32);
          ctx.stroke();

          // Cable inferior de soporte bajo las tablas
          ctx.strokeStyle = '#7c5837';
          ctx.lineWidth = 4.2;
          ctx.beginPath();
          for (let bx = ropeStart; bx <= BRIDGE_END_X; bx += 24) {
            const sag = Math.sin(((bx - TRAMO1_DIST) / (BRIDGE_END_X - TRAMO1_DIST)) * Math.PI) * 14;
            const ry = CAVE_GROUND_Y + 12 + sag;
            if (bx === ropeStart) ctx.moveTo(bx, ry);
            else ctx.lineTo(bx, ry);
          }
          ctx.lineTo(BRIDGE_END_X + 14, CAVE_GROUND_Y + 12);
          ctx.stroke();

          // Tirantes verticales que unen el pasamanos con las tablas cada 2 tablas (96 px)
          ctx.strokeStyle = 'rgba(205, 169, 126, 0.78)';
          ctx.lineWidth = 2.4;
          for (let tx = Math.ceil(ropeStart / 96) * 96; tx <= BRIDGE_END_X; tx += 96) {
            const sagTop = Math.sin(((tx - TRAMO1_DIST) / (BRIDGE_END_X - TRAMO1_DIST)) * Math.PI) * 12;
            const sagBot = Math.sin(((tx - TRAMO1_DIST) / (BRIDGE_END_X - TRAMO1_DIST)) * Math.PI) * 14;
            ctx.beginPath();
            ctx.moveTo(tx, CAVE_GROUND_Y - 32 + sagTop);
            ctx.lineTo(tx, CAVE_GROUND_Y + 12 + sagBot);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Tablas del puente colgante
        bridgePlanks.forEach(p => {
          if (p.x + p.w < cameraX - 60 || p.x > cameraX + dependencies.width + 60) return;
          if (p.isHole && !p.falling) return;
          if (p.collapsed && !p.falling) return;

          ctx.save();
          if (p.falling) {
            ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
            ctx.rotate(p.rot);
            ctx.fillStyle = '#65442b';
            ctx.beginPath();
            ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, 4);
            ctx.fill();
            ctx.strokeStyle = '#3e2716';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            const shake = (p.creaked && !p.collapsed) ? Math.sin((HOLE_WARN_TIME - p.warnTimer) * 45) * 2.2 : 0;
            ctx.translate(p.x, p.y + shake);

            // Tabla de madera en estilo pastel cálido
            ctx.fillStyle = p.creaked ? '#9c6f4a' : '#7d5738';
            ctx.beginPath();
            ctx.roundRect(0, 0, p.w, p.h, 4);
            ctx.fill();

            // Veta de luz en la tabla
            ctx.fillStyle = p.creaked ? '#b0825c' : '#946944';
            ctx.fillRect(4, 2, p.w - 8, 4);

            // Borde inferior sombreado
            ctx.fillStyle = '#4c311c';
            ctx.fillRect(2, p.h - 4, p.w - 4, 3);

            // Contorno de madera
            ctx.strokeStyle = '#3d2514';
            ctx.lineWidth = 1.8;
            ctx.stroke();

            // Anillas de cuerda en los extremos
            ctx.fillStyle = '#c5a77d';
            ctx.beginPath();
            ctx.arc(5, p.h / 2, 2.6, 0, Math.PI * 2);
            ctx.arc(p.w - 5, p.h / 2, 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        });

        // Frente de derrumbe con polvo y cuerdas rotas colgando
        if (collapseActive && collapseX >= TRAMO1_DIST && collapseX <= BRIDGE_END_X) {
          ctx.save();
          // Cuerda rota colgante
          ctx.strokeStyle = '#a6825a';
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(collapseX, CAVE_GROUND_Y - 26);
          ctx.quadraticCurveTo(collapseX - 18, CAVE_GROUND_Y - 6, collapseX - 28, CAVE_GROUND_Y + 28);
          ctx.stroke();

          // Nube de polvo de derrumbe
          ctx.fillStyle = 'rgba(125, 98, 76, 0.45)';
          ctx.beginPath();
          ctx.ellipse(collapseX, CAVE_GROUND_Y + 12, 52, 24, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 5. Rocas gigantes macizas (Tramo 1)
        bigRocks.forEach(br => {
          if (br.x + br.w < cameraX - 60 || br.x - br.w > cameraX + dependencies.width + 60) return;

          const cv = bigRockCanvases[br.variant % bigRockCanvases.length];
          if (cv) {
            ctx.drawImage(cv, br.x - cv.width / 2, CAVE_GROUND_Y - 145);
          }

          // Cartel de interacción sobre la roca
          const inRange = (!br.climbed && player.x >= br.x - br.w * 0.45 - CLIMB_RANGE && player.x <= br.x - br.w * 0.25);
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

        // 8. Salida de la cueva hacia el Gran Pino (Nivel 6)
        const exitX = LEVEL5_TOTAL_DIST - 80;
        const exitGrad = ctx.createRadialGradient(exitX, CAVE_GROUND_Y - 80, 20, exitX, CAVE_GROUND_Y - 80, 220);
        exitGrad.addColorStop(0, 'rgba(255, 245, 215, 0.95)');
        exitGrad.addColorStop(0.5, 'rgba(255, 230, 160, 0.55)');
        exitGrad.addColorStop(1, 'rgba(255, 210, 120, 0)');
        ctx.fillStyle = exitGrad;
        ctx.beginPath();
        ctx.arc(exitX, CAVE_GROUND_Y - 80, 220, 0, Math.PI * 2);
        ctx.fill();

        // 9. Dibujar a Anika con ciclo fluido y pies en suelo (sin sombras ovaladas debajo)
        const shouldBlink = invulTimer > 0 && !(
          typeof dependencies.isPlayerBlinkVisible === 'function'
            ? dependencies.isPlayerBlinkVisible(invulTimer)
            : (Math.floor(invulTimer * 8) % 2 === 0)
        );

        if (!shouldBlink) {
          let girlState = player.state;
          if (isClimbing) {
            girlState = (climbProgress >= CLIMB_PRESSES * 0.90) ? 'idle' : 'climbing';
          } else if (hurtTimer > 0) {
            girlState = 'hurt';
          }
          drawAnika(ctx, player.x, player.y, {
            state: girlState,
            facingRight: player.facingRight,
            stepPhase: player.stepPhase,
            animTime: player.animTime || timer
          });
        }

        ctx.restore(); // Fin de espacio de cámara

        // 10. Fundido blanco cálido de victoria / salida
        if (exitLightAlpha > 0) {
          ctx.fillStyle = `rgba(255, 248, 220, ${exitLightAlpha})`;
          ctx.fillRect(0, 0, dependencies.width, dependencies.height);
        }

        // 11. HUD general
        drawHUD(ctx);

        // 12. Modal de Game Over
        if (gameOver) {
          dependencies.drawGameOverModal(
            ctx,
            () => {
              gameOver = false;
              if (dependencies.gameState && typeof dependencies.gameState.retryLevel === 'function') {
                dependencies.gameState.retryLevel();
              }
              init(true);
            },
            () => {
              gameOver = false;
              if (dependencies.gameState && typeof dependencies.gameState.resetLives === 'function') {
                dependencies.gameState.resetLives(3);
              }
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
      if (tramo >= 2) {
        instrText = 'Nivel 5: ¡Avanza y salta los huecos! El puente se derrumba';
      }
      dependencies.drawInstructionBox(ctx, instrText, 24, 20, 500);

      // 2. Corazones de vida compartida (misma posición y lectura global que los demás niveles)
      dependencies.drawHearts(ctx, dependencies.gameState.lives, 3, dependencies.width / 2, 56);

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

      // 4. Indicador de distancia al derrumbe
      if (tramo >= 2 && collapseActive && player.x < BRIDGE_END_X) {
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
