/**
 * EL VIAJE DE ANIKA - NIVEL 4: LA CUEVA DE LOS MURCIÉLAGOS Y CINEMÁTICA
 * Nivel de mecanografía ilustrado con estética suave y paleta pastel.
 * Versión optimizada: hasta 10 murciélagos simultáneos desde todas direcciones,
 * proyectiles fluidos desacoplados, separación anticolisión de carteles y object pooling.
 */

(function () {
  'use strict';

  // ==========================================
  // CONSTANTES AJUSTABLES DE DIFICULTAD
  // Agrupadas y documentadas para fácil calibración
  // ==========================================
  const BAT_MAX_SIMULTANEOUS = 4;      // Cantidad máxima de murciélagos simultáneos en pantalla (último tercio)
  const BAT_SPAWN_MIN = 1.5;           // Intervalo mínimo entre apariciones de murciélagos en segundos
  const BAT_SPAWN_MAX = 3.0;           // Intervalo máximo entre apariciones de murciélagos en segundos
  const BAT_TIME_PER_LETTER = 0.95;    // Tiempo adicional por letra para leer y escribir (~40% más que antes)
  const BAT_BASE_TIME = 3.20;          // Tiempo base de llegada del murciélago (~25% más que antes)
  const BAT_MIN_READ_TIME = 2.5;       // Tiempo mínimo visible y legible antes de llegar a la niña
  const BAT_MIN_SEPARATION = 75;       // Separación mínima entre murciélagos para evitar carteles superpuestos
  const BAT_MAX_PENDING_LETTERS = 15;  // Carga máxima de letras pendientes en pantalla antes de pausar spawns
  const BAT_SPEED_RAMP = 1.10;         // Incremento máximo de velocidad en el último tercio (10%)
  const TYPO_TIME_PENALTY = 0.3;       // Penalización suave de tiempo por letra errónea (máximo 1.0 s total por palabra)
  const TYPO_TOLERANCE = 0;            // Tolerancia de errores tipográficos (mantenida por compatibilidad)
  const LEVEL4_DURATION = 35.0;        // Duración total del nivel en segundos
  const STONE_FLIGHT_TIME = 0.35;      // Duración del vuelo de la piedra (0.3 - 0.4 s)
  const FALL_TIME = 0.9;               // Duración de la caída en el hueco (cinemática)
  const GOBLIN_LAUGH_TIME = 3.5;       // Duración de la risa del duende (mínimo 3s)
  const CAVE_CINEMATIC_FADE = 1.0;     // Tiempo de fundido a negro al terminar la cinemática
  const CAVE_GROUND_Y = 540;           // Altura del suelo dentro de la cueva
  const GIRL_X = 220;                  // Posición fija horizontal de la niña (espacio a ambos lados)

  // ==========================================
  // BANCO DE PALABRAS EN ESPAÑOL (MÁS DE 130 PALABRAS)
  // Sin acentos problemáticos, sin 'ñ', uso común,
  // cubriendo prácticamente todo el alfabeto para soportar
  // 10 murciélagos simultáneos con iniciales distintas.
  // ==========================================
  const WORD_BANK = {
    short: [
      'ala', 'arco', 'agua', 'aire',
      'buho', 'barro', 'bota', 'baul',
      'cueva', 'caliz', 'copa',
      'duna', 'dardo', 'dado',
      'eco', 'eje', 'era',
      'flor', 'fuego', 'farol', 'fiel',
      'gota', 'gruta', 'gema', 'gris',
      'hoja', 'hongo', 'humo', 'hielo',
      'isla', 'iman', 'iris',
      'joya', 'jaula', 'jarra',
      'luz', 'lago', 'lobo', 'luna',
      'mar', 'mina', 'musgo', 'magia',
      'nube', 'nieve', 'nido',
      'oro', 'ola', 'oso', 'olmo',
      'paz', 'pozo', 'pino', 'perla', 'pala',
      'queso',
      'rio', 'roca', 'rama', 'raiz', 'rosa',
      'sol', 'seta', 'senda', 'sapo', 'selva',
      'topo', 'toro', 'tallo', 'torre',
      'uva', 'uno',
      'voz', 'vapor', 'viaje', 'vela',
      'yate', 'yeso',
      'zorro', 'zona'
    ],
    medium: [
      'abismo', 'antorcha', 'arena', 'ardilla', 'arroyo',
      'bosque', 'bruma', 'bellota', 'brote',
      'cristal', 'camino', 'cuarzo', 'corona', 'castor', 'charco',
      'destino', 'dorado', 'duende', 'diente',
      'espada', 'escudo', 'estrella', 'espejo',
      'fuente', 'flecha', 'fogata', 'fresco',
      'galeria', 'grieta', 'guijarro', 'grillo',
      'hierba', 'huella', 'hondonada',
      'invierno', 'imperio',
      'jungla', 'jinete',
      'laguna', 'linterna', 'lienzo', 'limon',
      'madera', 'misterio', 'mineral', 'molino',
      'niebla', 'navio', 'noble',
      'orilla', 'ocaso', 'oriente',
      'piedra', 'puente', 'portal', 'peligro',
      'quimera',
      'refugio', 'sendero', 'resina', 'roble',
      'sombra', 'secreto', 'silbido',
      'tierra', 'tronco', 'tesoro', 'tunel', 'trampa',
      'umbral', 'union',
      'viento', 'valle', 'volcan', 'viajero',
      'zafiro'
    ],
    long: [
      'aventura', 'antorcha', 'alcazar', 'amatista',
      'brillante', 'baluarte', 'burbuja',
      'caverna', 'catacumba', 'campana', 'cascada', 'centella',
      'diamante', 'destello', 'desfiladero',
      'esmeralda', 'escondite', 'estalactita', 'estalagmita', 'escorpion',
      'fortaleza', 'fantasia', 'frontera',
      'guardian', 'galeria', 'girasol',
      'horizonte', 'hechizo', 'hoguera',
      'ilusion', 'infinito',
      'laberinto', 'linterna', 'luciernaga',
      'murcielago', 'manantial', 'mariposa',
      'nebulosa', 'nostalgia',
      'orquidea', 'obelisco',
      'profundo', 'penumbra', 'pasadizo', 'piramide',
      'relampago', 'resplandor',
      'silencio', 'santuario', 'sosiego',
      'torrente', 'tempestad', 'travesia',
      'universo',
      'volcanico', 'vigilante', 'ventisca',
      'zafiro'
    ]
  };

  // Mezclador Fisher-Yates
  function fisherYatesShuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  // Normalizador de texto (ignora mayúsculas y acentos)
  function normalizeChar(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // ==========================================
  // PRE-RENDERIZADO DE FONDOS Y SPRITES OFFSCREEN
  // ==========================================
  let offscreenReady = false;
  let caveBgCanvas = null;
  let caveMidCanvas = null;
  let caveForeCanvas = null;
  let batBaseCanvas = null;

  function buildCaveOffscreens(width, height) {
    if (offscreenReady && caveBgCanvas) return;

    // 1. Capa trasera: degradado profundo y siluetas de roca lejanas
    caveBgCanvas = document.createElement('canvas');
    caveBgCanvas.width = width;
    caveBgCanvas.height = height;
    const bgCtx = caveBgCanvas.getContext('2d');

    const gradBg = bgCtx.createLinearGradient(0, 0, 0, height);
    gradBg.addColorStop(0, '#1c1626');
    gradBg.addColorStop(0.45, '#2b213b');
    gradBg.addColorStop(0.85, '#352847');
    gradBg.addColorStop(1, '#261c33');
    bgCtx.fillStyle = gradBg;
    bgCtx.fillRect(0, 0, width, height);

    // Formaciones rocosas lejanas en tonos violeta-grisáceos suaves
    bgCtx.fillStyle = 'rgba(67, 52, 86, 0.55)';
    bgCtx.beginPath();
    bgCtx.moveTo(0, height * 0.7);
    bgCtx.quadraticCurveTo(180, height * 0.45, 340, height * 0.65);
    bgCtx.quadraticCurveTo(520, height * 0.42, 700, height * 0.62);
    bgCtx.quadraticCurveTo(890, height * 0.44, 1080, height * 0.64);
    bgCtx.quadraticCurveTo(1190, height * 0.5, width, height * 0.68);
    bgCtx.lineTo(width, height);
    bgCtx.lineTo(0, height);
    bgCtx.closePath();
    bgCtx.fill();

    // Iluminación cálida suave de fondo
    const glow1 = bgCtx.createRadialGradient(280, 420, 20, 280, 420, 260);
    glow1.addColorStop(0, 'rgba(255, 215, 160, 0.12)');
    glow1.addColorStop(1, 'rgba(255, 215, 160, 0)');
    bgCtx.fillStyle = glow1;
    bgCtx.fillRect(0, 0, width, height);

    const glow2 = bgCtx.createRadialGradient(880, 360, 20, 880, 360, 320);
    glow2.addColorStop(0, 'rgba(180, 160, 240, 0.11)');
    glow2.addColorStop(1, 'rgba(180, 160, 240, 0)');
    bgCtx.fillStyle = glow2;
    bgCtx.fillRect(0, 0, width, height);

    // 2. Capa media: paredes de roca intermedias, estalactitas redondeadas y cristales
    caveMidCanvas = document.createElement('canvas');
    caveMidCanvas.width = width;
    caveMidCanvas.height = height;
    const midCtx = caveMidCanvas.getContext('2d');

    midCtx.fillStyle = '#4c3c62';
    const stalactites = [
      { x: 90, w: 70, h: 140 },
      { x: 210, w: 55, h: 95 },
      { x: 340, w: 60, h: 120 },
      { x: 520, w: 80, h: 110 },
      { x: 670, w: 50, h: 85 },
      { x: 790, w: 75, h: 135 },
      { x: 940, w: 65, h: 100 },
      { x: 1080, w: 85, h: 155 },
      { x: 1210, w: 90, h: 130 }
    ];

    stalactites.forEach((s) => {
      midCtx.beginPath();
      midCtx.moveTo(s.x - s.w / 2, 0);
      midCtx.quadraticCurveTo(s.x - s.w * 0.35, s.h * 0.65, s.x, s.h);
      midCtx.quadraticCurveTo(s.x + s.w * 0.35, s.h * 0.65, s.x + s.w / 2, 0);
      midCtx.closePath();
      midCtx.fill();

      midCtx.fillStyle = '#5c4a75';
      midCtx.beginPath();
      midCtx.moveTo(s.x - s.w * 0.3, 0);
      midCtx.quadraticCurveTo(s.x - s.w * 0.18, s.h * 0.6, s.x - 2, s.h - 6);
      midCtx.lineTo(s.x, s.h);
      midCtx.quadraticCurveTo(s.x - s.w * 0.35, s.h * 0.65, s.x - s.w / 2, 0);
      midCtx.closePath();
      midCtx.fill();
      midCtx.fillStyle = '#4c3c62';
    });

    const crystals = [
      { x: 130, y: 130, c: '#7ee3f2', r: 7 },
      { x: 142, y: 144, c: '#a4edff', r: 5 },
      { x: 360, y: 110, c: '#fca5c2', r: 6 },
      { x: 535, y: 105, c: '#fde088', r: 7 },
      { x: 810, y: 125, c: '#7ee3f2', r: 8 },
      { x: 960, y: 92, c: '#fca5c2', r: 6 },
      { x: 1110, y: 145, c: '#fde088', r: 7 },
      { x: 1125, y: 160, c: '#a4edff', r: 5 }
    ];

    crystals.forEach((cr) => {
      const crGlow = midCtx.createRadialGradient(cr.x, cr.y, 1, cr.x, cr.y, cr.r * 3.5);
      crGlow.addColorStop(0, cr.c);
      crGlow.addColorStop(1, 'rgba(0,0,0,0)');
      midCtx.fillStyle = crGlow;
      midCtx.beginPath();
      midCtx.arc(cr.x, cr.y, cr.r * 3.5, 0, Math.PI * 2);
      midCtx.fill();

      midCtx.fillStyle = '#ffffff';
      midCtx.beginPath();
      midCtx.moveTo(cr.x, cr.y - cr.r);
      midCtx.lineTo(cr.x + cr.r * 0.6, cr.y);
      midCtx.lineTo(cr.x, cr.y + cr.r);
      midCtx.lineTo(cr.x - cr.r * 0.6, cr.y);
      midCtx.closePath();
      midCtx.fill();
    });

    // 3. Capa delantera: suelo de tierra marrón cálido con borde de musgo
    caveForeCanvas = document.createElement('canvas');
    caveForeCanvas.width = width;
    caveForeCanvas.height = height;
    const foreCtx = caveForeCanvas.getContext('2d');

    foreCtx.fillStyle = '#463228';
    foreCtx.fillRect(0, CAVE_GROUND_Y, width, height - CAVE_GROUND_Y);

    foreCtx.fillStyle = '#39281f';
    foreCtx.fillRect(0, CAVE_GROUND_Y + 50, width, height - CAVE_GROUND_Y - 50);

    foreCtx.fillStyle = '#658c4e';
    foreCtx.beginPath();
    foreCtx.moveTo(0, CAVE_GROUND_Y);
    for (let x = 0; x <= width; x += 32) {
      const my = CAVE_GROUND_Y + Math.sin(x * 0.04) * 4;
      foreCtx.lineTo(x, my);
    }
    foreCtx.lineTo(width, CAVE_GROUND_Y + 18);
    foreCtx.lineTo(0, CAVE_GROUND_Y + 18);
    foreCtx.closePath();
    foreCtx.fill();

    foreCtx.strokeStyle = '#8ab66f';
    foreCtx.lineWidth = 2.5;
    foreCtx.lineCap = 'round';
    for (let x = 12; x < width; x += 18) {
      const gy = CAVE_GROUND_Y + Math.sin(x * 0.04) * 3;
      const gh = 6 + (x % 5) * 2;
      foreCtx.beginPath();
      foreCtx.moveTo(x, gy + 3);
      foreCtx.quadraticCurveTo(x + (x % 4 ? 3 : -3), gy - gh * 0.5, x + (x % 4 ? 2 : -2), gy - gh);
      foreCtx.stroke();
    }

    foreCtx.fillStyle = '#7a6051';
    const stones = [40, 110, 230, 390, 560, 720, 890, 1020, 1180];
    stones.forEach((sx) => {
      foreCtx.beginPath();
      foreCtx.ellipse(sx, CAVE_GROUND_Y + 14, 8, 4.5, 0, 0, Math.PI * 2);
      foreCtx.fill();
    });

    // 4. Pre-renderizado del sprite base del murciélago (cuerpo, rostro, orejas y colmillos)
    batBaseCanvas = document.createElement('canvas');
    batBaseCanvas.width = 64;
    batBaseCanvas.height = 64;
    const bCtx = batBaseCanvas.getContext('2d');
    bCtx.translate(32, 32);

    // Orejas
    bCtx.fillStyle = '#6c5387';
    bCtx.beginPath(); bCtx.arc(-11, -16, 7.5, 0, Math.PI * 2); bCtx.fill();
    bCtx.fillStyle = '#d99ebb';
    bCtx.beginPath(); bCtx.arc(-11, -16, 4.2, 0, Math.PI * 2); bCtx.fill();

    bCtx.fillStyle = '#6c5387';
    bCtx.beginPath(); bCtx.arc(11, -16, 7.5, 0, Math.PI * 2); bCtx.fill();
    bCtx.fillStyle = '#d99ebb';
    bCtx.beginPath(); bCtx.arc(11, -16, 4.2, 0, Math.PI * 2); bCtx.fill();

    // Cuerpo
    bCtx.fillStyle = '#5c4575';
    bCtx.beginPath(); bCtx.arc(0, 2, 17, 0, Math.PI * 2); bCtx.fill();

    // Panza
    bCtx.fillStyle = '#70578c';
    bCtx.beginPath(); bCtx.arc(0, 5, 11, 0, Math.PI * 2); bCtx.fill();

    // Ojos tiernos
    bCtx.fillStyle = '#ffffff';
    bCtx.beginPath();
    bCtx.arc(-6, -2, 5.2, 0, Math.PI * 2);
    bCtx.arc(6, -2, 5.2, 0, Math.PI * 2);
    bCtx.fill();

    bCtx.fillStyle = '#2b1b36';
    bCtx.beginPath();
    bCtx.arc(-6, -2, 3.2, 0, Math.PI * 2);
    bCtx.arc(6, -2, 3.2, 0, Math.PI * 2);
    bCtx.fill();

    bCtx.fillStyle = '#ffffff';
    bCtx.beginPath();
    bCtx.arc(-7, -3.5, 1.3, 0, Math.PI * 2);
    bCtx.arc(5, -3.5, 1.3, 0, Math.PI * 2);
    bCtx.fill();

    // Nariz
    bCtx.fillStyle = '#b07b9a';
    bCtx.beginPath(); bCtx.arc(0, 3, 2, 0, Math.PI * 2); bCtx.fill();

    // Colmillitos
    bCtx.fillStyle = '#ffffff';
    bCtx.beginPath();
    bCtx.moveTo(-4, 6); bCtx.lineTo(-2.5, 9.5); bCtx.lineTo(-1, 6); bCtx.closePath();
    bCtx.fill();
    bCtx.beginPath();
    bCtx.moveTo(1, 6); bCtx.lineTo(2.5, 9.5); bCtx.lineTo(4, 6); bCtx.closePath();
    bCtx.fill();

    // Patitas
    bCtx.fillStyle = '#49355e';
    bCtx.beginPath(); bCtx.arc(-6, 17, 3, 0, Math.PI * 2); bCtx.arc(6, 17, 3, 0, Math.PI * 2); bCtx.fill();

    offscreenReady = true;
  }

  // ==========================================
  // DIBUJAR MURCIÉLAGO TIERNO CON CARTEL
  // Cartel siempre legible, sin voltearse boca abajo
  // ==========================================
  function drawBat(ctx, bat, isActive) {
    if (!bat || !Number.isFinite(bat.x) || !Number.isFinite(bat.y)) return;

    const sepX = Number.isFinite(bat.sepX) ? bat.sepX : 0;
    const sepY = Number.isFinite(bat.sepY) ? bat.sepY : 0;
    const rx = bat.x + sepX;
    const ry = Math.max(75, Math.min(CAVE_GROUND_Y - 45, bat.y + sepY));
    if (!Number.isFinite(rx) || !Number.isFinite(ry)) return;

    ctx.save();
    try {
      ctx.translate(rx, ry);

      const anim = Number.isFinite(bat.animTime) ? bat.animTime : 0;
      const flap = Math.sin(anim * 11);
      const wingAngle = flap * 0.38;
      const facingRight = Number.isFinite(bat.vx) ? bat.vx >= 0 : true;

      // Resaltado de borde suave si es el objetivo activo
      if (isActive && bat.state === 'flying') {
        ctx.save();
        try {
          ctx.shadowColor = '#ffe27a';
          ctx.shadowBlur = 18;
          ctx.strokeStyle = 'rgba(255, 230, 120, 0.9)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(0, 0, 34, 25, 0, 0, Math.PI * 2);
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }

      // --- ALAS DIBUJADAS COMO FORMA CONTINUA Y CERRADA ---
      ctx.save();
      try {
        ctx.scale(facingRight ? 1 : -1, 1);

        // Ala izquierda
        ctx.save();
        try {
          ctx.translate(-14, -2);
          ctx.rotate(-wingAngle);
          ctx.fillStyle = '#6c5387';
          ctx.beginPath();
          ctx.moveTo(0, 4);
          ctx.quadraticCurveTo(-18, -26, -42, -18);
          ctx.quadraticCurveTo(-48, -4, -40, 10);
          ctx.quadraticCurveTo(-26, 4, -18, 12);
          ctx.quadraticCurveTo(-10, 6, 0, 4);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#7e649b';
          ctx.beginPath();
          ctx.moveTo(-2, 2);
          ctx.quadraticCurveTo(-16, -20, -36, -14);
          ctx.quadraticCurveTo(-30, 4, -16, 8);
          ctx.closePath();
          ctx.fill();
        } finally {
          ctx.restore();
        }

        // Ala derecha
        ctx.save();
        try {
          ctx.translate(14, -2);
          ctx.rotate(wingAngle);
          ctx.fillStyle = '#6c5387';
          ctx.beginPath();
          ctx.moveTo(0, 4);
          ctx.quadraticCurveTo(18, -26, 42, -18);
          ctx.quadraticCurveTo(48, -4, 40, 10);
          ctx.quadraticCurveTo(26, 4, 18, 12);
          ctx.quadraticCurveTo(10, 6, 0, 4);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#7e649b';
          ctx.beginPath();
          ctx.moveTo(2, 2);
          ctx.quadraticCurveTo(16, -20, 36, -14);
          ctx.quadraticCurveTo(30, 4, 16, 8);
          ctx.closePath();
          ctx.fill();
        } finally {
          ctx.restore();
        }

        // Cuerpo base pre-renderizado
        if (batBaseCanvas) {
          ctx.drawImage(batBaseCanvas, -32, -32);
        }
      } finally {
        ctx.restore();
      }

      // Si fue golpeado, dibujar expresión cómica de sorpresa (ojos grandes saltones y boquita abierta)
      if (bat.state === 'hit') {
        ctx.save();
        try {
          ctx.scale(facingRight ? 1 : -1, 1);
          // Ojos saltones de sorpresa
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-7, -3, 6, 0, Math.PI * 2);
          ctx.arc(7, -3, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#352243';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#2b1b36';
          ctx.beginPath();
          ctx.arc(-7, -3, 1.8, 0, Math.PI * 2);
          ctx.arc(7, -3, 1.8, 0, Math.PI * 2);
          ctx.fill();

          // Boquita abierta de sorpresa 'O'
          ctx.fillStyle = '#ff8888';
          ctx.beginPath();
          ctx.ellipse(0, 6.5, 3.2, 4.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#2b1b36';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }

      // --- CUERDAS Y CARTEL DE MADERA (SIEMPRE HORIZONTAL Y DERECHO) ---
      // Si fue golpeado, huye o se retira, el cartel se oculta
      if (bat.state === 'hit' || bat.state === 'fleeing' || bat.state === 'retreating') {
        return;
      }

      const sway = Math.sin(anim * 3.2 + (Number.isFinite(bat.swayOffset) ? bat.swayOffset : 0)) * 0.05;
      const signY = 28;

      ctx.save();
      try {
        ctx.translate(0, 18);
        ctx.rotate(sway);

        // Cuerdas
        ctx.strokeStyle = '#8d7054';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(-14, signY - 18);
        ctx.moveTo(7, 0);
        ctx.lineTo(14, signY - 18);
        ctx.stroke();

        // Medición exacta con measureText
        ctx.font = '700 20px Fredoka, Quicksand, sans-serif';
        const word = bat.word || '';
        const textW = ctx.measureText(word).width;
        const padX = 16;
        const signW = Math.max(84, textW + padX * 2);
        const signH = 36;
        const signX = -signW / 2;
        const signTop = signY - 18;

        const isError = bat.signErrorTimer > 0;
        const isDefeated = bat.state === 'defeated';
        const woodFill = isDefeated ? '#eefdec' : (isActive ? '#fff6e5' : '#fcedd2');
        const woodBorder = (isError && isActive) ? '#e05353' : (isDefeated ? '#58ba6d' : (isActive ? '#e09838' : '#b3824f'));

        ctx.fillStyle = 'rgba(38, 25, 20, 0.16)';
        ctx.beginPath();
        ctx.roundRect(signX + 2, signTop + 3, signW, signH, 10);
        ctx.fill();

        ctx.fillStyle = woodFill;
        ctx.beginPath();
        ctx.roundRect(signX, signTop, signW, signH, 10);
        ctx.fill();

        ctx.strokeStyle = woodBorder;
        ctx.lineWidth = (isActive || isDefeated) ? 3 : 2;
        ctx.stroke();

        // Letras: verde = acertadas o derrotado, rojo suave = letra esperada parpadeando si error, marrón = pendientes
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        let currentX = signX + (signW - textW) / 2;
        const textMidY = signTop + signH / 2 + 1;
        const typedLen = bat.typedLength || 0;

        for (let i = 0; i < word.length; i++) {
          const ch = word[i];
          const chW = ctx.measureText(ch).width;

          if (isDefeated || i < typedLen) {
            ctx.fillStyle = '#229944';
          } else if (i === typedLen && isError) {
            ctx.fillStyle = '#d94343'; // Letra esperada parpadea en rojo suave al fallar
          } else {
            ctx.fillStyle = '#523a2b'; // Resto de la palabra mantiene su color legible normal
          }
          ctx.fillText(ch, currentX, textMidY);
          currentX += chW;
        }
      } finally {
        ctx.restore();
      }
    } catch (err) {
      console.error('Error en drawBat:', err);
    } finally {
      ctx.restore();
    }
  }

  // ==========================================
  // ESTRELLITAS GENERADAS POR CÓDIGO AL ACERTAR
  // ==========================================
  function drawSparkleStar(ctx, x, y, size, color, rot) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size) || size <= 0) return;
    ctx.save();
    try {
      ctx.translate(x, y);
      ctx.rotate(Number.isFinite(rot) ? rot : 0);
      ctx.fillStyle = color || '#ffffff';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.lineTo(Math.cos((i * Math.PI) / 2) * size, Math.sin((i * Math.PI) / 2) * size);
        ctx.lineTo(
          Math.cos((i * Math.PI) / 2 + Math.PI / 4) * (size * 0.32),
          Math.sin((i * Math.PI) / 2 + Math.PI / 4) * (size * 0.32)
        );
      }
      ctx.closePath();
      ctx.fill();
    } finally {
      ctx.restore();
    }
  }

  // ==========================================
  // OBJETO Y LÓGICA DE LA CINEMÁTICA (LA NIÑA CAE A LA CUEVA)
  // Se conserva intacta según especificación
  // ==========================================
  function createCaveCinematic(dependencies) {
    let elapsed = 0;
    let phase = 'land';
    let girlX = 380;
    const girlY = CAVE_GROUND_Y;
    let transitionStarted = false;
    let leaves = [];

    function init() {
      elapsed = 0;
      phase = 'land';
      girlX = 380;
      transitionStarted = false;

      leaves = [];
      const leafColors = ['#d48046', '#e5a350', '#b9663d', '#dfbb66', '#a65d38'];
      for (let i = 0; i < 6; i++) {
        leaves.push({
          x: 350 + Math.random() * 80,
          y: 70 + Math.random() * 80,
          vy: 35 + Math.random() * 30,
          swayFreq: 2 + Math.random() * 2,
          swayAmp: 12 + Math.random() * 15,
          color: leafColors[i % leafColors.length],
          rot: Math.random() * Math.PI * 2,
          size: 4 + Math.random() * 3
        });
      }
    }

    function skipToCaveLevel() {
      if (transitionStarted) return;
      transitionStarted = true;
      dependencies.switchState(dependencies.states.CAVE_TYPING, 0.05, 0.1);
    }

    function update(dt) {
      elapsed += dt;

      leaves.forEach((l) => {
        l.y += l.vy * dt;
        l.rot += 0.03;
        if (l.y > CAVE_GROUND_Y - 4) {
          l.y = CAVE_GROUND_Y - 4;
          l.vy = 0;
        }
      });

      if (phase === 'land') {
        if (elapsed >= GOBLIN_LAUGH_TIME) {
          phase = 'recover';
          elapsed = 0;
        }
      } else if (phase === 'recover') {
        if (elapsed >= 0.85) {
          phase = 'run';
          elapsed = 0;
        }
      } else if (phase === 'run') {
        girlX += 210 * dt;
        if (girlX > 640 && !transitionStarted) {
          transitionStarted = true;
          dependencies.switchState(
            dependencies.states.CAVE_TYPING,
            1 / (60 * CAVE_CINEMATIC_FADE),
            0.15
          );
        }
      }
    }

    function draw(ctx) {
      buildCaveOffscreens(dependencies.width, dependencies.height);

      ctx.drawImage(caveBgCanvas, 0, 0);
      ctx.drawImage(caveMidCanvas, 0, 0);

      ctx.save();
      const holeX = 380;
      const holeY = 40;

      const lightBeam = ctx.createLinearGradient(holeX, holeY, holeX + 20, CAVE_GROUND_Y);
      lightBeam.addColorStop(0, 'rgba(255, 240, 200, 0.22)');
      lightBeam.addColorStop(1, 'rgba(255, 240, 200, 0.02)');
      ctx.fillStyle = lightBeam;
      ctx.beginPath();
      ctx.moveTo(holeX - 35, holeY + 10);
      ctx.lineTo(holeX + 35, holeY + 10);
      ctx.lineTo(holeX + 110, CAVE_GROUND_Y);
      ctx.lineTo(holeX - 70, CAVE_GROUND_Y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#2b213b';
      ctx.beginPath();
      ctx.ellipse(holeX, holeY, 48, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4e3a63';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#78c6e8';
      ctx.beginPath();
      ctx.ellipse(holeX, holeY - 2, 40, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      if (dependencies.goblinQuiz && dependencies.goblinQuiz.drawGoblin) {
        ctx.save();
        const laughBob = Math.sin(elapsed * 13) * 3;
        dependencies.goblinQuiz.drawGoblin(ctx, holeX + 8, holeY + 28 - laughBob, {
          peeking: true,
          laughing: true,
          elapsed
        });
        ctx.restore();
      }

      if (phase === 'land') {
        const dialogText = 'Ja, ja, ja. Cuidado con las hojas';
        ctx.font = '600 19px Fredoka, Quicksand, sans-serif';
        const tw = ctx.measureText(dialogText).width;
        const dw = tw + 32;
        const dh = 44;
        const dx = holeX + 55;
        const dy = holeY - 10;

        ctx.save();
        ctx.fillStyle = 'rgba(38, 25, 20, 0.18)';
        ctx.beginPath();
        ctx.roundRect(dx + 2, dy + 4, dw, dh, 14);
        ctx.fill();

        ctx.fillStyle = '#fff4da';
        ctx.beginPath();
        ctx.roundRect(dx, dy, dw, dh, 14);
        ctx.fill();

        ctx.strokeStyle = '#a6774e';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#fff4da';
        ctx.beginPath();
        ctx.moveTo(dx, dy + 22);
        ctx.lineTo(dx - 12, dy + 28);
        ctx.lineTo(dx + 4, dy + 32);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#a6774e';
        ctx.stroke();

        ctx.fillStyle = '#4f392b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dialogText, dx + dw / 2, dy + dh / 2);
        ctx.restore();
      }

      ctx.restore();

      ctx.drawImage(caveForeCanvas, 0, 0);

      leaves.forEach((l) => {
        ctx.save();
        const swayX = Math.sin(elapsed * l.swayFreq) * l.swayAmp;
        ctx.translate(l.x + swayX, l.y);
        ctx.rotate(l.rot);
        ctx.fillStyle = l.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, l.size, l.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      let girlAnim = 'sit';
      if (phase === 'recover') girlAnim = 'dust_off';
      else if (phase === 'run') girlAnim = 'run';

      dependencies.drawGirl(ctx, girlX, girlY, {
        state: girlAnim,
        facingRight: true,
        animTime: elapsed,
        hasDuck: false
      });

      dependencies.drawLogo(ctx, dependencies.logoSize);

      if (dependencies.mouse && dependencies.mouse.clicked) {
        dependencies.mouse.clicked = false;
        skipToCaveLevel();
      }
    }

    function handleKey(e) {
      if (e.code === 'Space' || e.code === 'Enter') {
        skipToCaveLevel();
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
  // OBJETO Y LÓGICA DEL NIVEL 4 (CAVE TYPING)
  // Con soporte para 10 murciélagos, trayectorias variadas,
  // desacoplamiento de piedras y piscinas de memoria fija.
  // ==========================================
  function createCaveLevel(dependencies) {
    let timer = 0;
    let gameOver = false;
    let completed = false;
    let activeBat = null;
    let streak = 0;
    let tutorialTimer = 5.0;
    let invulTimer = 0;
    let girlHurtTimer = 0;
    let girlThrowTimer = 0;
    let girlThrowDir = 'side';
    let girlFacingRight = true;
    let graceTimer = 0;
    let spawnTimer = 0.4;
    let lastSpawnedInitial = '';
    let wordPool = { short: [], medium: [], long: [] };
    let transitionSent = false;
    let girlX_offset = 0;
    let debugMode = false;

    // --- OBJECT POOLS REUTILIZABLES ---
    const BAT_POOL_SIZE = 20;
    const batPool = [];
    for (let i = 0; i < BAT_POOL_SIZE; i++) {
      batPool.push({
        active: false,
        markedForRemoval: false,
        word: '',
        typedLength: 0,
        x: 0,
        y: 0,
        spawnX: 0,
        spawnY: 0,
        targetX: 0,
        targetY: 0,
        controlX: 0,
        controlY: 0,
        curveType: 'straight',
        waveAmp: 0,
        progress: 0,
        totalTime: 4.0,
        state: 'flying', // 'flying', 'defeated', 'attacking', 'hit', 'retreating', 'fleeing'
        hasBitten: false,
        animTime: 0,
        swayOffset: 0,
        signErrorTimer: 0,
        typoPenaltyTotal: 0,
        vx: 0,
        vy: 0,
        sepX: 0,
        sepY: 0
      });
    }

    const PROJ_POOL_SIZE = 16;
    const projPool = [];
    for (let i = 0; i < PROJ_POOL_SIZE; i++) {
      projPool.push({
        active: false,
        startX: 0,
        startY: 0,
        targetBat: null,
        targetX: 0,
        targetY: 0,
        currentX: 0,
        currentY: 0,
        elapsed: 0,
        duration: STONE_FLIGHT_TIME,
        arcHeight: 50,
        rot: 0
      });
    }

    const SPARKLE_POOL_SIZE = 40;
    const sparklePool = [];
    for (let i = 0; i < SPARKLE_POOL_SIZE; i++) {
      sparklePool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        color: '#ffffff',
        size: 6,
        rot: 0,
        vrot: 0,
        life: 0,
        maxLife: 0.5
      });
    }

    function resetWordPools() {
      const allWords = [...new Set([...WORD_BANK.short, ...WORD_BANK.medium, ...WORD_BANK.long])];
      wordPool.short = fisherYatesShuffle(allWords.filter(w => w.length >= 3 && w.length <= 5));
      wordPool.medium = fisherYatesShuffle(allWords.filter(w => w.length >= 4 && w.length <= 6));
      wordPool.long = fisherYatesShuffle(allWords.filter(w => w.length >= 5 && w.length <= 7));
    }

    function init() {
      timer = 0;
      gameOver = false;
      completed = false;
      activeBat = null;
      streak = 0;
      tutorialTimer = 5.0;
      invulTimer = 0;
      girlHurtTimer = 0;
      girlThrowTimer = 0;
      girlThrowDir = 'side';
      girlFacingRight = true;
      graceTimer = 0;
      spawnTimer = 0.8;
      lastSpawnedInitial = '';
      transitionSent = false;
      girlX_offset = 0;

      // Desactivar todos los objetos de las piscinas de forma limpia
      for (let i = 0; i < BAT_POOL_SIZE; i++) {
        const b = batPool[i];
        b.active = false;
        b.markedForRemoval = false;
        b.state = 'flying';
        b.hasBitten = false;
        b.typedLength = 0;
        b.word = '';
        b.signErrorTimer = 0;
        b.typoPenaltyTotal = 0;
        b.sepX = 0;
        b.sepY = 0;
      }
      for (let i = 0; i < PROJ_POOL_SIZE; i++) {
        projPool[i].active = false;
        projPool[i].targetBat = null;
      }
      for (let i = 0; i < SPARKLE_POOL_SIZE; i++) {
        sparklePool[i].active = false;
      }

      resetWordPools();
    }

    // Obtener palabra adecuada según el tercio actual sin repetir iniciales activas
    function getNextWord(category) {
      if (!wordPool[category] || wordPool[category].length === 0) {
        const allWords = [...new Set([...WORD_BANK.short, ...WORD_BANK.medium, ...WORD_BANK.long])];
        const minLen = category === 'short' ? 3 : (category === 'medium' ? 4 : 5);
        const maxLen = category === 'short' ? 5 : (category === 'medium' ? 6 : 7);
        wordPool[category] = fisherYatesShuffle(allWords.filter(w => w.length >= minLen && w.length <= maxLen));
      }

      // Iniciales de todos los murciélagos activos en vuelo o ataque
      const usedInitials = new Set();
      for (let i = 0; i < BAT_POOL_SIZE; i++) {
        const b = batPool[i];
        if (b.active && (b.state === 'flying' || b.state === 'attacking') && b.word) {
          usedInitials.add(b.word[0]);
        }
      }

      let chosenIdx = -1;
      for (let i = 0; i < wordPool[category].length; i++) {
        const w = wordPool[category][i];
        const initChar = w[0];
        if (!usedInitials.has(initChar) && initChar !== lastSpawnedInitial) {
          chosenIdx = i;
          break;
        }
      }

      let word = '';
      if (chosenIdx !== -1) {
        word = wordPool[category].splice(chosenIdx, 1)[0];
      } else {
        word = wordPool[category].pop() || 'cueva';
      }

      lastSpawnedInitial = word[0];
      return word;
    }

    // Spawn de murciélago desde todos los lados (derecha, izquierda, arriba, diagonales)
    function spawnBat(tier, speedMult) {
      // Buscar ranura disponible en la piscina
      let bat = null;
      for (let i = 0; i < BAT_POOL_SIZE; i++) {
        if (!batPool[i].active) {
          bat = batPool[i];
          break;
        }
      }
      if (!bat) return;

      const word = getNextWord(tier);

      // Tiempo de llegada justo garantizando BAT_MIN_READ_TIME
      const calcTime = (word.length * BAT_TIME_PER_LETTER + BAT_BASE_TIME) / speedMult;
      const totalTime = Math.max(BAT_MIN_READ_TIME, calcTime);

      // Selección aleatoria del punto de origen fuera de pantalla (derecha, arriba, izquierda)
      const dirRoll = Math.random();
      let spawnX = 0;
      let spawnY = 0;
      let curveType = 'straight';
      let controlX = 0;
      let controlY = 0;
      let waveAmp = 0;

      const girlTargetX = GIRL_X;
      const girlTargetY = CAVE_GROUND_Y - 30;

        if (dirRoll < 0.45) {
          // Desde la derecha (trayectoria suave y recta)
          spawnX = dependencies.width + 80;
          spawnY = 120 + Math.random() * 240;
          curveType = 'straight';
          controlX = (spawnX + girlTargetX) / 2;
          controlY = spawnY;
        } else if (dirRoll < 0.75) {
          // Desde arriba (techo de la cueva, suave descenso en curva)
          spawnX = 300 + Math.random() * 520;
          spawnY = -70;
          curveType = 'curve_high';
          controlX = spawnX;
          controlY = 130 + Math.random() * 60;
        } else {
          // Desde la izquierda (trayectoria suave y recta)
          spawnX = -80;
          spawnY = 130 + Math.random() * 230;
          curveType = 'straight';
          controlX = (spawnX + girlTargetX) / 2;
          controlY = spawnY;
        }

        bat.active = true;
        bat.markedForRemoval = false;
        bat.word = word;
        bat.typedLength = 0;
        bat.x = spawnX;
        bat.y = spawnY;
        bat.spawnX = spawnX;
        bat.spawnY = spawnY;
        bat.targetX = girlTargetX;
        bat.targetY = girlTargetY;
        bat.controlX = controlX;
        bat.controlY = controlY;
        bat.curveType = curveType;
        bat.waveAmp = waveAmp;
        bat.progress = 0;
        bat.totalTime = totalTime;
        bat.state = 'flying';
        bat.hasBitten = false;
        bat.animTime = Math.random() * 6;
        bat.swayOffset = Math.random() * 10;
        bat.signErrorTimer = 0;
        bat.typoPenaltyTotal = 0;
        bat.vx = (girlTargetX >= spawnX) ? 120 : -120;
        bat.vy = 0;
        bat.sepX = 0;
        bat.sepY = 0;

        if (dependencies.audio && dependencies.audio.sfxBatFlap) {
          dependencies.audio.sfxBatFlap();
        }
      }

      // Ejecutar mordida (exactamente 1 vida una sola vez con bandera hasBitten)
      function executeBite(bat) {
        if (bat.hasBitten) return;
        bat.hasBitten = true;
        bat.state = 'retreating';
        bat.vx = (bat.x >= GIRL_X ? 1 : -1) * 440;
        bat.vy = -280;

        dependencies.gameState.lives = Math.max(0, dependencies.gameState.lives - 1);
        invulTimer = 1.0;
        girlHurtTimer = 0.5;
        streak = 0;
        graceTimer = 1.0;

        if (dependencies.audio && dependencies.audio.sfxBite) {
          dependencies.audio.sfxBite();
        }

        if (dependencies.gameState.lives <= 0) {
          gameOver = true;
        }
      }

      // Derrotar murciélago: instantáneamente marcado como derrotado y liberado del target,
      // mientras la piedra sale en arco hacia él con animación dirigida
      function defeatBat(targetBat) {
        if (!targetBat) return;

        targetBat.state = 'defeated';
        targetBat.hasBitten = true; // Jamás podrá morder
        if (activeBat === targetBat) activeBat = null; // Liberado de inmediato

        // Orientar a la niña hacia la posición del murciélago
        const batX = Number.isFinite(targetBat.x) ? targetBat.x : GIRL_X;
        const batY = Number.isFinite(targetBat.y) ? targetBat.y : CAVE_GROUND_Y - 100;
        girlFacingRight = batX >= GIRL_X;
        girlThrowTimer = 0.25;
        girlThrowDir = batY < CAVE_GROUND_Y - 220 ? 'up' : 'side';

        // Buscar proyectil libre en el pool (o reutilizar el más antiguo)
        let stone = null;
        for (let i = 0; i < PROJ_POOL_SIZE; i++) {
          if (!projPool[i].active) {
            stone = projPool[i];
            break;
          }
        }
        if (!stone) {
          let maxElapsed = -1;
          for (let i = 0; i < PROJ_POOL_SIZE; i++) {
            if (projPool[i].elapsed > maxElapsed) {
              maxElapsed = projPool[i].elapsed;
              stone = projPool[i];
            }
          }
        }

        if (stone) {
          const handX = GIRL_X + (girlFacingRight ? 1 : -1) * (girlThrowDir === 'up' ? 10 : 18);
          const handY = CAVE_GROUND_Y - (girlThrowDir === 'up' ? 38 : 28);
          const sepX = Number.isFinite(targetBat.sepX) ? targetBat.sepX : 0;
          const sepY = Number.isFinite(targetBat.sepY) ? targetBat.sepY : 0;

          stone.active = true;
          stone.startX = handX;
          stone.startY = handY;
          stone.targetBat = targetBat;
          stone.targetX = batX + sepX;
          stone.targetY = batY + sepY;
          stone.currentX = handX;
          stone.currentY = handY;
          stone.elapsed = 0;
          stone.duration = STONE_FLIGHT_TIME;
          stone.rot = 0;

          const dx = Math.abs(stone.targetX - stone.startX);
          stone.arcHeight = Math.max(30, Math.min(80, dx * 0.18));
        }

        if (dependencies.audio && dependencies.audio.sfxThrow) {
          dependencies.audio.sfxThrow();
        }
      }

      // Estrellitas al golpear (piscina fija de partículas)
      function spawnHitSparkles(x, y) {
        const colors = ['#ffe17d', '#86ebfc', '#ffaad0', '#ffffff'];
        let count = 0;
        for (let i = 0; i < SPARKLE_POOL_SIZE && count < 6; i++) {
          const s = sparklePool[i];
          if (!s.active) {
            s.active = true;
            s.x = x;
            s.y = y;
            s.vx = (Math.random() - 0.5) * 260;
            s.vy = (Math.random() - 0.5) * 260;
            s.color = colors[count % colors.length];
            s.size = 5 + Math.random() * 3.5;
            s.rot = Math.random() * Math.PI * 2;
            s.vrot = (Math.random() - 0.5) * 8;
            s.life = 0.45;
            s.maxLife = 0.45;
            count++;
          }
        }
      }

      function update(dt) {
        try {
          if (dependencies.isPaused() || gameOver) return;

          // Animación de victoria y salida
          if (completed) {
            for (let i = 0; i < BAT_POOL_SIZE; i++) {
              const b = batPool[i];
              if (b.active) {
                b.x += (b.vx >= 0 ? 420 : -420) * dt;
                b.y -= 190 * dt;
                b.animTime += dt;
                if (b.x < -160 || b.x > dependencies.width + 160 || b.y < -160) {
                  b.active = false;
                }
              }
            }

            girlFacingRight = true;
            girlX_offset += 210 * dt;
            if (girlX_offset > dependencies.width - GIRL_X + 80 && !transitionSent) {
              transitionSent = true;
              dependencies.switchState(dependencies.states.LEVEL3, 0.035, 0.4);
            }
            return;
          }

          timer += dt;
          tutorialTimer = Math.max(0, tutorialTimer - dt);
          invulTimer = Math.max(0, invulTimer - dt);
          girlHurtTimer = Math.max(0, girlHurtTimer - dt);
          if (girlThrowTimer > 0) girlThrowTimer = Math.max(0, girlThrowTimer - dt);
          graceTimer = Math.max(0, graceTimer - dt);

          // Fin del tiempo de nivel
          if (timer >= LEVEL4_DURATION) {
            completed = true;
            activeBat = null;
            for (let i = 0; i < BAT_POOL_SIZE; i++) {
              if (batPool[i].active) batPool[i].state = 'fleeing';
            }
            return;
          }

          // Dificultad progresiva por tercios
          const prog = Math.min(1, timer / LEVEL4_DURATION);
          let maxSimul = 2;
          let tier = 'short';
          let speedMult = 1.0;

          if (prog >= 0.66) {
            maxSimul = BAT_MAX_SIMULTANEOUS; // 3 a 4 murciélagos como máximo
            tier = 'long';
            speedMult = BAT_SPEED_RAMP;      // 1.10 (máximo 10% en último tercio)
          } else if (prog >= 0.33) {
            maxSimul = 3;                    // 2 a 3 murciélagos
            tier = 'medium';
            speedMult = 1.05;                // Aumento intermedio suave (5%)
          } else {
            maxSimul = 2;                    // 1 a 2 murciélagos
            tier = 'short';
            speedMult = 1.0;
          }

          // Conteo de letras pendientes y murciélagos activos
          let totalPendingLetters = 0;
          let activeFlyingCount = 0;
          for (let i = 0; i < BAT_POOL_SIZE; i++) {
            const b = batPool[i];
            if (b.active && (b.state === 'flying' || b.state === 'attacking')) {
              totalPendingLetters += (b.word.length - b.typedLength);
              activeFlyingCount++;
            }
          }

          // Aparición escalonada
          if (graceTimer <= 0 && activeFlyingCount < maxSimul && totalPendingLetters < BAT_MAX_PENDING_LETTERS) {
            spawnTimer -= dt;
            if (spawnTimer <= 0) {
              spawnBat(tier, speedMult);
              spawnTimer = BAT_SPAWN_MIN + Math.random() * (BAT_SPAWN_MAX - BAT_SPAWN_MIN);
            }
          }

          // Separación anticolisión entre murciélagos para que no se encimen los carteles
          for (let i = 0; i < BAT_POOL_SIZE; i++) {
            const b1 = batPool[i];
            if (!b1.active || (b1.state !== 'flying' && b1.state !== 'attacking')) continue;

            for (let j = i + 1; j < BAT_POOL_SIZE; j++) {
              const b2 = batPool[j];
              if (!b2.active || (b2.state !== 'flying' && b2.state !== 'attacking')) continue;

              const dx = (b1.x + b1.sepX) - (b2.x + b2.sepX);
              const dy = (b1.y + b1.sepY) - (b2.y + b2.sepY);
              const dist = Math.hypot(dx, dy);

              if (dist < BAT_MIN_SEPARATION && dist > 0.01) {
                const overlap = (BAT_MIN_SEPARATION - dist) * 0.5;
                const nx = dx / dist;
                const ny = dy / dist;
                b1.sepX += nx * overlap * 3.6 * dt;
                b1.sepY += ny * overlap * 3.6 * dt;
                b2.sepX -= nx * overlap * 3.6 * dt;
                b2.sepY -= ny * overlap * 3.6 * dt;
              }
            }

            // Amortiguación
            b1.sepX *= Math.pow(0.85, dt * 60);
            b1.sepY *= Math.pow(0.85, dt * 60);
          }

          // Actualizar murciélagos
          for (let i = 0; i < BAT_POOL_SIZE; i++) {
            const b = batPool[i];
            if (!b.active) continue;

            b.animTime += dt;
            if (b.signErrorTimer > 0) b.signErrorTimer -= dt;

            if (b.state === 'flying') {
              b.progress += dt / b.totalTime;
              const t = Math.min(1, b.progress);

              // Trayectoria suave (bezier paramétrica)
              const omt = 1 - t;
              let nx = omt * omt * b.spawnX + 2 * omt * t * b.controlX + t * t * b.targetX;
              let ny = omt * omt * b.spawnY + 2 * omt * t * b.controlY + t * t * b.targetY;

              if (b.curveType === 'wave') {
                ny += Math.sin(b.animTime * 3) * b.waveAmp;
              }

              // Orientación
              b.vx = nx - b.x;
              b.vy = ny - b.y;
              b.x = nx;
              b.y = ny;

              if (b.progress >= 1) {
                executeBite(b);
                if (activeBat === b) activeBat = null;
              }
            } else if (b.state === 'attacking') {
              const dx = b.targetX - b.x;
              const dy = b.targetY - b.y;
              const dist = Math.hypot(dx, dy);
              if (dist < 22) {
                executeBite(b);
                if (activeBat === b) activeBat = null;
              } else {
                const spd = 700 * dt;
                b.vx = (dx / dist) * spd;
                b.vy = (dy / dist) * spd;
                b.x += b.vx;
                b.y += b.vy;
              }
            } else if (b.state === 'defeated') {
              // El murciélago espera el impacto de la piedra frenando suavemente
              b.y += Math.sin(b.animTime * 4) * 8 * dt;
            } else if (b.state === 'hit' || b.state === 'retreating' || b.state === 'fleeing') {
              b.x += b.vx * dt;
              b.y += b.vy * dt;
              if (b.x < -160 || b.x > dependencies.width + 160 || b.y < -160 || b.y > dependencies.height + 120) {
                b.markedForRemoval = true;
              }
            }
          }

          // Actualizar proyectiles (piedras en arco fluido hacia el murciélago)
          for (let i = 0; i < PROJ_POOL_SIZE; i++) {
            const p = projPool[i];
            if (!p.active) continue;

            p.elapsed += dt;
            const dur = Math.max(0.05, p.duration);
            const t = Math.min(1, Math.max(0, p.elapsed / dur));

            // Seguir dinámicamente la posición del murciélago objetivo
            if (p.targetBat && p.targetBat.active) {
              const sepX = Number.isFinite(p.targetBat.sepX) ? p.targetBat.sepX : 0;
              const sepY = Number.isFinite(p.targetBat.sepY) ? p.targetBat.sepY : 0;
              if (Number.isFinite(p.targetBat.x)) p.targetX = p.targetBat.x + sepX;
              if (Number.isFinite(p.targetBat.y)) p.targetY = p.targetBat.y + sepY;
            }

            p.currentX = p.startX + (p.targetX - p.startX) * t;
            const linearY = p.startY + (p.targetY - p.startY) * t;
            const arc = 4 * p.arcHeight * t * (1 - t);
            p.currentY = linearY - arc;
            p.rot += 14 * dt;

            if (t >= 1) {
              p.active = false;
              const target = p.targetBat;
              if (target && target.active && target.state === 'defeated') {
                target.state = 'hit';
                const facingDir = target.x >= GIRL_X ? 1 : -1;
                target.vx = facingDir * (380 + Math.random() * 80);
                target.vy = -300 - Math.random() * 70;
                streak++;

                if (dependencies.audio && dependencies.audio.sfxStoneHit) {
                  dependencies.audio.sfxStoneHit();
                }

                const hitX = target.x + (Number.isFinite(target.sepX) ? target.sepX : 0);
                const hitY = target.y + (Number.isFinite(target.sepY) ? target.sepY : 0);
                spawnHitSparkles(hitX, hitY);
              }
            }
          }

          // Actualizar partículas
          for (let i = 0; i < SPARKLE_POOL_SIZE; i++) {
            const s = sparklePool[i];
            if (!s.active) continue;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.rot += s.vrot * dt;
            s.life -= dt;
            if (s.life <= 0) s.active = false;
          }

          // Limpieza segura al final del frame para devolver al pool
          for (let i = 0; i < BAT_POOL_SIZE; i++) {
            const b = batPool[i];
            if (b.active && b.markedForRemoval) {
              b.active = false;
              b.markedForRemoval = false;
              b.state = 'flying';
              b.hasBitten = false;
              b.typedLength = 0;
              b.word = '';
              b.signErrorTimer = 0;
              b.typoPenaltyTotal = 0;
              b.sepX = 0;
              b.sepY = 0;
            }
          }

          // Limpiar objetivo activo si ya no es válido
          if (activeBat && (!activeBat.active || (activeBat.state !== 'flying' && activeBat.state !== 'attacking'))) {
            activeBat = null;
          }
        } catch (err) {
          console.error('Error en caveLevel.update:', err);
        }
      }

      function draw(ctx) {
        try {
          buildCaveOffscreens(dependencies.width, dependencies.height);

          // 1. Fondos pre-renderizados en capas
          ctx.drawImage(caveBgCanvas, 0, 0);
          ctx.drawImage(caveMidCanvas, 0, 0);
          ctx.drawImage(caveForeCanvas, 0, 0);

          // 2. Niña: parada sobre el suelo, quieta (sin sombra ovalada debajo)
          const currentGirlX = GIRL_X + girlX_offset;
          let girlAnim = 'idle';
          if (completed) girlAnim = 'run';
          else if (girlHurtTimer > 0) girlAnim = 'hurt';
          else if (girlThrowTimer > 0) girlAnim = 'throw';

          const blinkVisible = dependencies.isPlayerBlinkVisible(invulTimer);
          if (blinkVisible) {
            dependencies.drawGirl(ctx, currentGirlX, CAVE_GROUND_Y, {
              state: girlAnim,
              facingRight: girlFacingRight,
              throwDir: girlThrowDir,
              animTime: timer,
              hasDuck: false
            });
          }

          // 3. Proyectiles (piedras en vuelo con arco y rotación)
          for (let i = 0; i < PROJ_POOL_SIZE; i++) {
            const p = projPool[i];
            if (!p.active) continue;
            if (!Number.isFinite(p.currentX) || !Number.isFinite(p.currentY)) continue;

            ctx.save();
            try {
              ctx.translate(p.currentX, p.currentY);
              ctx.rotate(Number.isFinite(p.rot) ? p.rot : 0);

              ctx.fillStyle = '#827166';
              ctx.beginPath();
              ctx.ellipse(0, 0, 6.5, 5, 0, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#b09f92';
              ctx.beginPath();
              ctx.arc(-1.5, -1.2, 2.2, 0, Math.PI * 2);
              ctx.fill();
            } finally {
              ctx.restore();
            }
          }

          // 4. Estrellitas por código al impactar
          for (let i = 0; i < SPARKLE_POOL_SIZE; i++) {
            const s = sparklePool[i];
            if (!s.active) continue;
            drawSparkleStar(ctx, s.x, s.y, s.size * (s.life / s.maxLife), s.color, s.rot);
          }

          // 5. Murciélagos activos
          for (let i = 0; i < BAT_POOL_SIZE; i++) {
            const b = batPool[i];
            if (b.active) {
              drawBat(ctx, b, b === activeBat);
            }
          }

          // 6. HUD y textos
          drawHUD(ctx);

          // 7. Modal Game Over si pierde las vidas
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

          // 8. Modo de depuración opcional F3
          if (debugMode) {
            drawDebugOverlay(ctx);
          }
        } catch (err) {
          console.error('Error en caveLevel.draw:', err);
        }
      }

      function drawDebugOverlay(ctx) {
        ctx.save();
        try {
          ctx.font = '600 13px monospace, sans-serif';
          let activeCount = 0;
          let flyingCount = 0;
          let defeatedCount = 0;
          for (let i = 0; i < BAT_POOL_SIZE; i++) {
            if (batPool[i].active) {
              activeCount++;
              if (batPool[i].state === 'flying' || batPool[i].state === 'attacking') flyingCount++;
              else if (batPool[i].state === 'defeated') defeatedCount++;
            }
          }
          let stonesCount = 0;
          for (let i = 0; i < PROJ_POOL_SIZE; i++) {
            if (projPool[i].active) stonesCount++;
          }
          let sparklesCount = 0;
          for (let i = 0; i < SPARKLE_POOL_SIZE; i++) {
            if (sparklePool[i].active) sparklesCount++;
          }

          const lines = [
            '[F3] DEPURE CUEVA (NIVEL 4)',
            `Estado: ${completed ? 'COMPLETADO' : (gameOver ? 'GAME OVER' : 'JUGANDO')}`,
            `Murciélagos activos: ${activeCount} (volando: ${flyingCount}, derrotados: ${defeatedCount})`,
            `Piedras en aire: ${stonesCount} / ${PROJ_POOL_SIZE}`,
            `Partículas: ${sparklesCount} / ${SPARKLE_POOL_SIZE}`,
            `Objetivo activo: ${activeBat ? activeBat.word + ' (' + activeBat.typedLength + '/' + activeBat.word.length + ')' : '(ninguno)'}`,
            `Tiempo: ${timer.toFixed(1)}s / ${LEVEL4_DURATION}s | Racha: ${streak}`
          ];

          const boxW = 360;
          const boxH = lines.length * 18 + 16;
          ctx.fillStyle = 'rgba(15, 10, 24, 0.85)';
          ctx.strokeStyle = '#9d72d6';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(16, 75, boxW, boxH, 8);
          ctx.fill();
          ctx.stroke();

          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          for (let i = 0; i < lines.length; i++) {
            ctx.fillStyle = i === 0 ? '#ffe27a' : '#d8d4ff';
            ctx.fillText(lines[i], 26, 85 + i * 18);
          }
        } catch (err) {
          console.error('Error en drawDebugOverlay:', err);
        } finally {
          ctx.restore();
        }
      }

      function drawHUD(ctx) {
        if (tutorialTimer > 0) {
          ctx.save();
          const fade = Math.min(1, tutorialTimer / 0.8);
          ctx.globalAlpha = fade;
          dependencies.drawInstructionBox(
            ctx,
            'Escribe la palabra del cartel para espantar al murciélago',
            24,
            20,
            340
          );
          ctx.restore();
        }

        ctx.save();
        const barW = 260;
        const barH = 26;
        const barX = dependencies.width / 2 - barW / 2;
        const barY = 20;
        const progress = Math.min(1, Math.max(0, timer / LEVEL4_DURATION));

        ctx.fillStyle = 'rgba(25, 20, 32, 0.68)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 13);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.beginPath();
        ctx.roundRect(barX + 6, barY + 6, barW - 12, barH - 12, 7);
        ctx.fill();

        ctx.fillStyle = '#b388eb';
        ctx.beginPath();
        ctx.roundRect(barX + 6, barY + 6, (barW - 12) * progress, barH - 12, 7);
        ctx.fill();
        ctx.restore();

        dependencies.drawHearts(ctx, dependencies.gameState.lives, 3, dependencies.width / 2, 56);

        if (streak >= 2) {
          ctx.save();
          const streakText = 'Racha: ' + streak;
          ctx.font = '600 15px Fredoka, Quicksand, sans-serif';
          const stW = ctx.measureText(streakText).width + 24;
          const stX = dependencies.width / 2 - stW / 2;
          const stY = 96;

          ctx.fillStyle = 'rgba(32, 24, 44, 0.7)';
          ctx.beginPath();
          ctx.roundRect(stX, stY, stW, 26, 12);
          ctx.fill();

          ctx.fillStyle = '#ffe27a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(streakText, dependencies.width / 2, stY + 13);
          ctx.restore();
        }

        dependencies.drawLogo(ctx, dependencies.logoSize);
      }

      // Entrada de caracteres
      function handleCharInput(char) {
        if (gameOver || completed || dependencies.isPaused()) return false;
        const c = normalizeChar(char);
        if (!c || c < 'a' || c > 'z') return false;

        // Si no hay objetivo activo, buscar murciélago en vuelo cuya primera letra coincida
        if (!activeBat) {
          let bestBat = null;
          let bestDist = Infinity;

          for (let i = 0; i < BAT_POOL_SIZE; i++) {
            const b = batPool[i];
            if (b.active && b.state === 'flying' && b.word && normalizeChar(b.word[0]) === c) {
              const dist = Math.hypot(b.x - GIRL_X, b.y - (CAVE_GROUND_Y - 30));
              if (dist < bestDist) {
                bestDist = dist;
                bestBat = b;
              }
            }
          }

          if (!bestBat) return false;

          activeBat = bestBat;
          activeBat.typedLength = 1;

          if (dependencies.audio && dependencies.audio.sfxKeyCorrect) {
            dependencies.audio.sfxKeyCorrect();
          }

          if (activeBat.typedLength === activeBat.word.length) {
            defeatBat(activeBat);
          }
          return true;
        }

        // Si ya hay objetivo activo, verificar siguiente letra esperada
        const expectedChar = normalizeChar(activeBat.word[activeBat.typedLength]);
        if (c === expectedChar) {
          activeBat.typedLength++;
          if (dependencies.audio && dependencies.audio.sfxKeyCorrect) {
            dependencies.audio.sfxKeyCorrect();
          }

          if (activeBat.typedLength === activeBat.word.length) {
            defeatBat(activeBat);
          }
          return true;
        } else {
          // Letra errónea
          if (dependencies.audio && dependencies.audio.sfxKeyError) {
            dependencies.audio.sfxKeyError();
          }

          activeBat.signErrorTimer = 0.45;
          activeBat.state = 'attacking';
          activeBat = null; // Liberado de inmediato
          return true;
        }
      }

      function handleKey(e) {
        if (e.code === 'KeyP') return true;
        if (e.code === 'Space') return true;
        if (e.code === 'F3' || e.key === 'F3') {
          debugMode = !debugMode;
          return true;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) return false;
        return handleCharInput(e.key);
      }

      return {
        init,
        update,
        draw,
        handleKey,
        handleCharInput,
        toggleDebug: () => { debugMode = !debugMode; },
        getDebugState: () => ({
          activeBat,
          batPool,
          projPool,
          sparklePool,
          streak,
          timer,
          completed,
          gameOver,
          debugMode
        })
      };
    }

    window.createCaveCinematic = createCaveCinematic;
    window.createCaveLevel = createCaveLevel;
  }) ();