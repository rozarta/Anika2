(function () {
  const GIRL_HEIGHT = 60;
  const DUENDE_HEIGHT = GIRL_HEIGHT;
  const CAMERA_ZOOM = 1.65;
  const GOBLIN_RESTART_KEY = 'd';
  const GOBLIN_WALK_SPEED = 118;
  const GOBLIN_FADE_OUT_TIME = 1;
  const GOBLIN_BLACK_HOLD_TIME = 0.5;
  const GOBLIN_STOP_DISTANCE = 54;
  const GOBLIN_STOP_PAUSE_TIME = 0.3;
  const GOBLIN_INITIAL_GIRL_X = 400;
  const GOBLIN_TRUNK_ROOT_X = 826;
  const GOBLIN_WALK_TARGET_X = GOBLIN_TRUNK_ROOT_X - GOBLIN_STOP_DISTANCE / CAMERA_ZOOM - 16;
  const DIALOGUE_MIN_TIME = 3.5;
  const DIALOGUE_SECONDS_PER_CHARACTER = 0.06;
  const GOBLIN_QUIZ_CONFIG = {
    dialogueFadeSeconds: 0.2,
    feedbackSeconds: 2.5,
    winAnimationSeconds: 2.8,
    panel: { maxWidthRatio: 0.64, narrowWidthRatio: 0.9, top: 122, narrowTop: 76, padding: 16, blockGap: 9, optionHeight: 44, narrowOptionHeight: 40 },
    groundY: 520,
    difficulties: {
      facil: { questions: 6, errorsToLose: 4, extraAtCorrect: 3, hasExtra: true, winsAtCorrect: 4 },
      medio: { questions: 5, errorsToLose: 3, extraAtCorrect: null, hasExtra: false, winsAtCorrect: 3 },
      dificil: { questions: 4, errorsToLose: 3, extraAtCorrect: 2, hasExtra: true, winsAtCorrect: 3 }
    }
  };

  const questionIdOccurrences = new Map();
  const question = (categoria, pregunta, opciones, correcta, nivel) => {
    let hash = 2166136261;
    for (const character of `${nivel}:${pregunta}`) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    const baseId = `${nivel}-${(hash >>> 0).toString(36)}`;
    const occurrence = questionIdOccurrences.get(baseId) || 0;
    questionIdOccurrences.set(baseId, occurrence + 1);
    return { id: `${baseId}-${occurrence}`, categoria, pregunta, opciones, correcta, nivel };
  };
  const QUESTION_BANK = {
    facil: [
      question('Matemática', '¿Cuánto es 9 + 6?', ['15', '14', '16', '13'], 0, 'facil'),
      question('Matemática', '¿Cuánto es 30 - 12?', ['18', '16', '20', '14'], 0, 'facil'),
      question('Matemática', '¿Cuánto es 4 por 3?', ['12', '7', '14', '16'], 0, 'facil'),
      question('Matemática', '¿Cuántos centímetros hay en un metro?', ['100', '10', '1000', '50'], 0, 'facil'),
      question('Matemática', '¿Cuántos lados tiene un cuadrado?', ['Cuatro', 'Tres', 'Cinco', 'Seis'], 0, 'facil'),
      question('Historia', '¿En qué país se encuentra la Gran Muralla?', ['China', 'India', 'Japón', 'Mongolia'], 0, 'facil'),
      question('Historia', '¿Qué civilización construyó las pirámides de Guiza?', ['Antiguo Egipto', 'Imperio romano', 'Antigua Grecia', 'Imperio inca'], 0, 'facil'),
      question('Historia', '¿Qué ciudad fue el centro del Imperio romano?', ['Roma', 'Atenas', 'Cartago', 'Alejandría'], 0, 'facil'),
      question('Historia', '¿En qué año llegó el Apolo 11 a la Luna?', ['1969', '1959', '1975', '1981'], 0, 'facil'),
      question('Historia', '¿Cuántos días tiene una semana?', ['Siete', 'Cinco', 'Seis', 'Ocho'], 0, 'facil'),
      question('Deportes', '¿En qué deporte se juega el torneo de Wimbledon?', ['Tenis', 'Golf', 'Rugby', 'Críquet'], 0, 'facil'),
      question('Deportes', '¿Cuántos jugadores de un equipo de baloncesto están en la cancha?', ['Cinco', 'Cuatro', 'Seis', 'Siete'], 0, 'facil'),
      question('Deportes', '¿Qué deportista suele defender el arco en fútbol?', ['Arquero', 'Delantero', 'Árbitro', 'Capitán'], 0, 'facil'),
      question('Deportes', '¿En qué disciplina se nada en una piscina?', ['Natación', 'Esgrima', 'Ciclismo', 'Gimnasia'], 0, 'facil'),
      question('Deportes', '¿Qué objeto se golpea con una raqueta en el tenis?', ['Pelota', 'Disco', 'Pluma', 'Balón ovalado'], 0, 'facil'),
      question('Geografía', '¿Cuál es la capital de Francia?', ['París', 'Roma', 'Lisboa', 'Atenas'], 0, 'facil'),
      question('Geografía', '¿Cuál es la capital de España?', ['Madrid', 'Sevilla', 'Barcelona', 'Valencia'], 0, 'facil'),
      question('Geografía', '¿En qué continente está Egipto?', ['África', 'Europa', 'Oceanía', 'América'], 0, 'facil'),
      question('Geografía', '¿Qué océano es el más extenso?', ['Pacífico', 'Atlántico', 'Índico', 'Ártico'], 0, 'facil'),
      question('Geografía', '¿Qué línea divide la Tierra en hemisferios norte y sur?', ['Ecuador', 'Meridiano de Greenwich', 'Trópico de Cáncer', 'Círculo polar ártico'], 0, 'facil'),
      question('Arte', '¿Quién pintó la Mona Lisa?', ['Leonardo da Vinci', 'Pablo Picasso', 'Claude Monet', 'Vincent van Gogh'], 0, 'facil'),
      question('Arte', '¿Quién pintó el Guernica?', ['Pablo Picasso', 'Joan Miró', 'Salvador Dalí', 'Francisco Goya'], 0, 'facil'),
      question('Arte', '¿Qué material se usa habitualmente para modelar una escultura?', ['Arcilla', 'Algodón', 'Vidrio líquido', 'Papel de lija'], 0, 'facil'),
      question('Arte', '¿Qué herramienta usa un pintor para aplicar pintura?', ['Pincel', 'Brújula', 'Martillo', 'Regla'], 0, 'facil'),
      question('Arte', '¿Qué nombre recibe una imagen dibujada sobre una pared?', ['Mural', 'Soneto', 'Retrato hablado', 'Bodegón musical'], 0, 'facil'),
      question('Entretenimiento', '¿Cómo se llama el vaquero de Toy Story?', ['Woody', 'Buzz', 'Rex', 'Andy'], 0, 'facil'),
      question('Entretenimiento', '¿Qué tipo de animal es Dumbo?', ['Elefante', 'León', 'Ratón', 'Caballo'], 0, 'facil'),
      question('Entretenimiento', '¿Qué instrumento toca el personaje principal de Coco?', ['Guitarra', 'Arpa', 'Trompeta', 'Acordeón'], 0, 'facil'),
      question('Entretenimiento', '¿Cómo se llama la hermana de Elsa en Frozen?', ['Anna', 'Moana', 'Mérida', 'Rapunzel'], 0, 'facil'),
      question('Entretenimiento', '¿Qué tipo de película suele incluir canciones y bailes en su historia?', ['Musical', 'Documental', 'Suspenso', 'Western'], 0, 'facil'),
      question('Ciencia', '¿Qué planeta es conocido como el planeta rojo?', ['Marte', 'Venus', 'Mercurio', 'Neptuno'], 0, 'facil'),
      question('Ciencia', '¿Cuál es el símbolo químico del oxígeno?', ['O', 'Ox', 'Og', 'Os'], 0, 'facil'),
      question('Ciencia', '¿A qué temperatura se congela el agua pura a presión normal?', ['0 grados C', '10 grados C', '32 grados C', '100 grados C'], 0, 'facil'),
      question('Ciencia', '¿Cuántas patas tiene una araña?', ['Ocho', 'Seis', 'Diez', 'Doce'], 0, 'facil'),
      question('Ciencia', '¿Cuál es el mamífero más grande del planeta?', ['Ballena azul', 'Elefante africano', 'Jirafa', 'Rinoceronte'], 0, 'facil'),
      question('Cultura pop', '¿Cuál es la moneda oficial de Japón?', ['Yen', 'Won', 'Dólar', 'Euro'], 0, 'facil'),
      question('Cultura pop', '¿Qué día viene después del martes?', ['Miércoles', 'Jueves', 'Lunes', 'Viernes'], 0, 'facil'),
      question('Cultura pop', '¿Qué color se obtiene al mezclar azul y amarillo?', ['Verde', 'Violeta', 'Naranja', 'Marrón'], 0, 'facil'),
      question('Cultura pop', '¿Qué animal aparece en el emblema de la marca Ferrari?', ['Caballo', 'Toro', 'Águila', 'León'], 0, 'facil'),
      question('Cultura pop', '¿Qué forma tiene una señal de tránsito de STOP en muchos países?', ['Octágono', 'Círculo', 'Triángulo', 'Rombo'], 0, 'facil'),
      question('Literatura', '¿Quién escribió Don Quijote de la Mancha?', ['Miguel de Cervantes', 'Federico García Lorca', 'Lope de Vega', 'Benito Pérez Galdós'], 0, 'facil'),
      question('Literatura', '¿Qué animal acompaña a Dorothy en El maravilloso mago de Oz?', ['Un perro llamado Toto', 'Un gato llamado Félix', 'Un caballo llamado Tornado', 'Un loro llamado Paco'], 0, 'facil'),
      question('Literatura', '¿Cómo se llama un relato breve con animales que suele terminar con una enseñanza?', ['Fábula', 'Novela', 'Biografía', 'Crónica'], 0, 'facil'),
      question('Literatura', '¿Qué personaje de cuento pierde un zapato de cristal?', ['Cenicienta', 'Blancanieves', 'Alicia', 'Pinocho'], 0, 'facil'),
      question('Literatura', '¿Qué signo se coloca al comienzo de una pregunta en español?', ['Signo de apertura', 'Punto y coma', 'Comillas', 'Guion largo'], 0, 'facil'),
      question('Música', '¿Qué instrumento tiene teclas blancas y negras?', ['Piano', 'Flauta', 'Tambor', 'Violín'], 0, 'facil'),
      question('Música', '¿Cuántas cuerdas tiene normalmente una guitarra clásica?', ['Seis', 'Cuatro', 'Cinco', 'Ocho'], 0, 'facil'),
      question('Música', '¿Qué instrumento se toca golpeándolo con baquetas?', ['Batería', 'Arpa', 'Oboe', 'Clarinete'], 0, 'facil'),
      question('Música', '¿Cómo se llama la persona que dirige una orquesta?', ['Director', 'Solista', 'Compositor de escena', 'Afinador'], 0, 'facil'),
      question('Música', '¿Qué símbolo musical indica silencio?', ['Pausa', 'Acorde', 'Escala', 'Arpegio'], 0, 'facil'),
      question('Tecnología', '¿Qué dispositivo se usa principalmente para mover el puntero de una computadora?', ['Ratón', 'Escáner', 'Impresora', 'Altavoz'], 0, 'facil'),
      question('Tecnología', '¿Qué componente muestra imágenes de una computadora?', ['Monitor', 'Teclado', 'Micrófono', 'Router'], 0, 'facil'),
      question('Tecnología', '¿Qué tecla suele borrar el carácter situado a la izquierda del cursor?', ['Retroceso', 'Mayúsculas', 'Tabulador', 'Escape'], 0, 'facil'),
      question('Tecnología', '¿Qué aparato permite hacer llamadas y ejecutar aplicaciones móviles?', ['Teléfono inteligente', 'Proyector', 'Reproductor de vinilo', 'Escáner de mesa'], 0, 'facil'),
      question('Tecnología', '¿Qué se necesita para conectar un dispositivo a una red inalámbrica local?', ['Wi-Fi', 'HDMI', 'USB', 'VGA'], 0, 'facil'),
      question('Naturaleza', '¿Qué animal produce miel?', ['Abeja', 'Mariposa', 'Hormiga', 'Libélula'], 0, 'facil'),
      question('Naturaleza', '¿Qué parte de la planta absorbe agua del suelo?', ['Raíz', 'Flor', 'Fruto', 'Semilla'], 0, 'facil'),
      question('Naturaleza', '¿Cuál de estos cítricos suele tener pulpa anaranjada?', ['Naranja', 'Limón', 'Lima', 'Pomelo verde'], 0, 'facil'),
      question('Naturaleza', '¿Qué estación suele seguir al invierno?', ['Primavera', 'Otoño', 'Verano', 'Monzón'], 0, 'facil'),
      question('Naturaleza', '¿Qué animal es conocido por cambiar de color para camuflarse?', ['Camaleón', 'Caballo', 'Pingüino', 'Delfín'], 0, 'facil'),
      question('Cultura pop', 'Los padres de Héctor tienen cuatro hijos: Luis, Juan, Víctor y... ¿Cómo se llama el cuarto?', ['Héctor', 'Pedro', 'Carlos', 'Miguel'], 0, 'facil'),
      question('Ciencia', '¿Cuál es el órgano más grande del cuerpo humano?', ['La piel', 'El hígado', 'El cerebro', 'El intestino delgado'], 0, 'facil'),
      question('Geografía', '¿Cuál es considerado el río más largo del mundo?', ['El río Amazonas', 'El río Misisipi', 'El río Danubio', 'El río Yangtsé'], 0, 'facil'),
      question('Literatura', '¿Quién escribió la tragedia Romeo y Julieta?', ['William Shakespeare', 'Christopher Marlowe', 'Ben Jonson', 'John Webster'], 0, 'facil'),
      question('Geografía', '¿Cuál es el país más grande del mundo por superficie?', ['Rusia', 'Canadá', 'China', 'Estados Unidos'], 0, 'facil'),
      question('Mitología', 'En la mitología griega, ¿quién era el dios del inframundo y de los muertos?', ['Hades', 'Poseidón', 'Ares', 'Hermes'], 0, 'facil')
    ],
    /*
      const headerHeight = 43;
      question('Historia', '¿En qué país se encuentra la Gran Muralla?', ['China', 'India', 'Japón', 'Mongolia'], 0, 'facil'),
      question('Historia', '¿Qué civilización construyó las pirámides de Guiza?', ['Antiguo Egipto', 'Imperio romano', 'Antigua Grecia', 'Imperio inca'], 0, 'facil'),
      const optionHeight = narrow ? GOBLIN_QUIZ_CONFIG.panel.narrowOptionHeight : GOBLIN_QUIZ_CONFIG.panel.optionHeight;
      const optionGap = 7;
      question('Historia', '¿Cuántos días tiene una semana?', ['Siete', 'Cinco', 'Seis', 'Ocho'], 0, 'facil'),
      const feedbackTextHeight = substate === 'feedback' ? 22 : 0;
      const feedbackButtonHeight = substate === 'feedback' ? 38 : 0;
      const feedbackHeight = substate === 'feedback' ? gap + feedbackTextHeight + 6 + feedbackButtonHeight : 0;
      question('Deportes', '¿Cuántos jugadores de un equipo de baloncesto están en la cancha?', ['Cinco', 'Cuatro', 'Seis', 'Siete'], 0, 'facil'),
      const topLimit = narrow ? GOBLIN_QUIZ_CONFIG.panel.narrowTop : GOBLIN_QUIZ_CONFIG.panel.top;
      const panelY = Math.max(12, Math.min(topLimit, GOBLIN_QUIZ_CONFIG.groundY - panelHeight - 12));
      question('Deportes', '¿En qué disciplina se nada en una piscina?', ['Natación', 'Esgrima', 'Ciclismo', 'Gimnasia'], 0, 'facil'),
      drawRoundedPanel(ctx, panel.x, panel.y, panel.width, panel.height, 'rgba(255, 242, 216, 0.88)', '#9d704b');
      ctx.fillStyle = '#65462f';
      ctx.font = '700 17px Fredoka, Quicksand, sans-serif';
      question('Geografía', '¿En qué continente está Egipto?', ['África', 'Europa', 'Oceanía', 'América'], 0, 'facil'),
      question('Geografía', '¿Qué océano es el más extenso?', ['Pacífico', 'Atlántico', 'Índico', 'Ártico'], 0, 'facil'),
      question('Geografía', '¿Qué línea imaginaria divide la Tierra en hemisferios norte y sur?', ['Ecuador', 'Meridiano de Greenwich', 'Trópico de Cáncer', 'Círculo polar ártico'], 0, 'facil'),
      question('Arte', '¿Quién pintó la Mona Lisa?', ['Leonardo da Vinci', 'Pablo Picasso', 'Claude Monet', 'Vincent van Gogh'], 0, 'facil'),
      question('Arte', '¿Quién pintó el Guernica?', ['Pablo Picasso', 'Joan Miró', 'Salvador Dalí', 'Francisco Goya'], 0, 'facil'),
      ctx.fillText(progress, panel.x + padding, headerY + 2);
      const scoreY = headerY + 28;
      const scoreX = panel.x + panel.width * 0.43;
      question('Cultura pop', '¿Qué día viene después del martes?', ['Miércoles', 'Jueves', 'Lunes', 'Viernes'], 0, 'facil'),
      ctx.font = '600 12px Fredoka, Quicksand, sans-serif';
      question('Cultura pop', '¿Qué animal aparece en el emblema de la marca Ferrari?', ['Caballo', 'Toro', 'Águila', 'León'], 0, 'facil'),
      question('Cultura pop', '¿Qué forma tiene una señal de tránsito de STOP en muchos países?', ['Octágono', 'Círculo', 'Triángulo', 'Rombo'], 0, 'facil'),
      ctx.fillText('ACIERTOS', scoreX, scoreY);
      drawCounterIcon(ctx, scoreX + 67, scoreY, true);
      question('Literatura', '¿Cómo se llama un relato breve con animales que suele terminar con una enseñanza?', ['Fábula', 'Novela', 'Biografía', 'Crónica'], 0, 'facil'),
      ctx.font = '700 14px Fredoka, Quicksand, sans-serif';
      ctx.fillText(String(correctCount), scoreX + 78, scoreY);
      question('Música', '¿Qué instrumento tiene teclas blancas y negras?', ['Piano', 'Flauta', 'Tambor', 'Violín'], 0, 'facil'),
      ctx.font = '600 12px Fredoka, Quicksand, sans-serif';
      ctx.fillText('ERRORES', scoreX + 103, scoreY);
      drawCounterIcon(ctx, scoreX + 163, scoreY, false);
      question('Música', '¿Qué símbolo musical indica silencio?', ['Pausa', 'Acorde', 'Escala', 'Arpegio'], 0, 'facil'),
      ctx.font = '700 14px Fredoka, Quicksand, sans-serif';
      ctx.fillText(String(errorCount), scoreX + 174, scoreY);

      const categoryWidth = 140;
      const categoryX = panel.x + panel.width - categoryWidth - padding;
      ctx.fillStyle = '#78905c';
      ctx.beginPath();
      ctx.roundRect(categoryX, headerY - 2, categoryWidth, 25, 10);
      ctx.fill();
      ctx.fillStyle = '#fffaf0';
      ctx.font = '600 14px Fredoka, Quicksand, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(currentQuestion.categoria, categoryX + categoryWidth / 2, headerY + 10);
      question('Tecnología', '¿Qué tecla suele borrar el carácter situado a la izquierda del cursor?', ['Retroceso', 'Mayúsculas', 'Tabulador', 'Escape'], 0, 'facil'),
      question('Tecnología', '¿Qué aparato permite hacer llamadas y ejecutar aplicaciones móviles?', ['Teléfono inteligente', 'Proyector', 'Reproductor de vinilo', 'Escáner de mesa'], 0, 'facil'),
      drawTextLines(ctx, questionLines, dependencies.width / 2, questionTop, questionLineHeight, '#49382d', `600 ${questionFontSize}px Fredoka, Quicksand, sans-serif`);
      question('Naturaleza', '¿Qué animal produce miel?', ['Abeja', 'Mariposa', 'Hormiga', 'Libélula'], 0, 'facil'),
      const optionWidth = narrow ? Math.min(710, panel.width - padding * 2) : (panel.width - padding * 2 - optionGap) / columns;
      const optionStartX = panel.x + (panel.width - (optionWidth * columns + optionGap * (columns - 1))) / 2;
      question('Naturaleza', '¿Cuál de estos cítricos suele tener pulpa anaranjada?', ['Naranja', 'Limón', 'Lima', 'Pomelo verde'], 0, 'facil'),
      question('Naturaleza', '¿Qué estación suele seguir al invierno?', ['Primavera', 'Otoño', 'Verano', 'Monzón'], 0, 'facil'),
      question('Naturaleza', '¿Qué animal es conocido por cambiar de color para camuflarse?', ['Camaleón', 'Caballo', 'Pingüino', 'Delfín'], 0, 'facil')
        const optionX = optionStartX + optionWidth / 2 + column * (optionWidth + optionGap);
    */
    medio: [
      question('Matemática', '¿Cuánto es tres cuartos de 48?', ['36', '32', '40', '42'], 0, 'medio'),
      question('Matemática', '¿Cuál es el menor número primo mayor que 20?', ['23', '21', '25', '27'], 0, 'medio'),
      question('Matemática', 'Un rectángulo mide 8 cm por 5 cm. ¿Cuál es su área?', ['40 cm cuadrados', '26 cm cuadrados', '13 cm cuadrados', '80 cm cuadrados'], 0, 'medio'),
      question('Matemática', '¿Cuál es el resultado de 2 elevado a la quinta potencia?', ['32', '16', '25', '64'], 0, 'medio'),
      question('Matemática', '¿Cuánto suman los ángulos interiores de un cuadrilátero plano?', ['360 grados', '180 grados', '270 grados', '540 grados'], 0, 'medio'),
      question('Historia', '¿Qué misión llevó a los primeros seres humanos a la Luna?', ['Apolo 11', 'Apolo 8', 'Géminis 7', 'Mercury 6'], 0, 'medio'),
      question('Historia', '¿En qué año comenzó la Revolución francesa?', ['1789', '1776', '1815', '1848'], 0, 'medio'),
      question('Historia', '¿Qué ciudad quedó dividida por un muro entre 1961 y 1989?', ['Berlín', 'Viena', 'Praga', 'Varsovia'], 0, 'medio'),
      question('Historia', '¿Qué navegante llegó a América en 1492 al servicio de Castilla?', ['Cristóbal Colón', 'Fernando de Magallanes', 'Vasco da Gama', 'Juan Sebastián Elcano'], 0, 'medio'),
      question('Deportes', '¿Cuántos anillos aparecen en el símbolo olímpico?', ['Cinco', 'Cuatro', 'Seis', 'Siete'], 0, 'medio'),
      question('Deportes', '¿Cuántos hoyos tiene una ronda estándar de golf?', ['18', '9', '12', '21'], 0, 'medio'),
      question('Deportes', '¿Qué país ganó la Copa Mundial masculina de fútbol de 2010?', ['España', 'Países Bajos', 'Alemania', 'Uruguay'], 0, 'medio'),
      question('Deportes', '¿En qué deporte se usa un florete?', ['Esgrima', 'Hockey', 'Bádminton', 'Lanzamiento de jabalina'], 0, 'medio'),
      question('Geografía', '¿Qué estrecho separa España de Marruecos?', ['Estrecho de Gibraltar', 'Estrecho de Bering', 'Canal de la Mancha', 'Estrecho de Magallanes'], 0, 'medio'),
      question('Geografía', '¿Cuál es la capital de Canadá?', ['Ottawa', 'Toronto', 'Vancouver', 'Montreal'], 0, 'medio'),
      question('Geografía', '¿En qué cordillera se encuentra el monte Aconcagua?', ['Andes', 'Alpes', 'Himalaya', 'Montes Urales'], 0, 'medio'),
      question('Geografía', '¿Qué mar se encuentra entre Europa y África?', ['Mar Mediterráneo', 'Mar Báltico', 'Mar del Norte', 'Mar de Bering'], 0, 'medio'),
      question('Arte', '¿Quién pintó el Guernica?', ['Pablo Picasso', 'Joan Miró', 'Salvador Dalí', 'Francisco Goya'], 0, 'medio'),
      question('Arte', '¿A qué movimiento se asocia Claude Monet?', ['Impresionismo', 'Cubismo', 'Futurismo', 'Surrealismo'], 0, 'medio'),
      question('Arte', '¿Qué escultor creó el David de mármol conservado en Florencia?', ['Miguel Ángel', 'Donatello', 'Bernini', 'Canova'], 0, 'medio'),
      question('Arte', '¿Qué técnica pictórica utiliza pigmentos mezclados con agua sobre papel?', ['Acuarela', 'Fresco', 'Óleo sobre tabla', 'Temple al huevo'], 0, 'medio'),
      question('Entretenimiento', '¿Cuál es el nombre del reino ficticio de la película Frozen?', ['Arendelle', 'Narnia', 'Genovia', 'Zamunda'], 0, 'medio'),
      question('Entretenimiento', '¿Qué saga cinematográfica incluye al personaje de Indiana Jones?', ['Indiana Jones', 'Rocky', 'Jurassic Park', 'Volver al futuro'], 0, 'medio'),
      question('Entretenimiento', '¿Qué personaje de Star Wars es conocido como un maestro Jedi verde?', ['Yoda', 'Chewbacca', 'C-3PO', 'Boba Fett'], 0, 'medio'),
      question('Entretenimiento', '¿Qué estudio produjo la película animada Mi vecino Totoro?', ['Studio Ghibli', 'Aardman Animations', 'Pixar', 'Laika'], 0, 'medio'),
      question('Ciencia', '¿Qué estructura de la sangre transporta la mayor parte del oxígeno?', ['Glóbulos rojos', 'Glóbulos blancos', 'Plaquetas', 'Plasma'], 0, 'medio'),
      question('Ciencia', '¿Qué carga eléctrica tiene un protón?', ['Positiva', 'Negativa', 'Neutra', 'Variable'], 0, 'medio'),
      question('Ciencia', 'A presión normal, ¿a qué temperatura hierve el agua pura?', ['100 grados C', '80 grados C', '90 grados C', '120 grados C'], 0, 'medio'),
      question('Ciencia', '¿Qué órgano produce la insulina?', ['Páncreas', 'Bazo', 'Vesícula biliar', 'Tiroides'], 0, 'medio'),
      question('Ciencia', '¿Qué gas absorben principalmente las plantas durante la fotosíntesis?', ['Dióxido de carbono', 'Oxígeno', 'Nitrógeno', 'Helio'], 0, 'medio'),
      question('Cultura pop', '¿Cuál es la moneda oficial de Japón?', ['Yen', 'Won', 'Dólar', 'Euro'], 0, 'medio'),
      question('Cultura pop', '¿Qué ciudad es conocida por la torre inclinada de Pisa?', ['Pisa', 'Génova', 'Turín', 'Bolonia'], 0, 'medio'),
      question('Cultura pop', '¿Qué color se asocia tradicionalmente con una esmeralda?', ['Verde', 'Azul', 'Rojo', 'Violeta'], 0, 'medio'),
      question('Cultura pop', '¿Qué animal es el símbolo nacional de Australia que aparece en su escudo junto al emú?', ['Canguro', 'Koala', 'Ornitorrinco', 'Wombat'], 0, 'medio'),
      question('Literatura', '¿Quién escribió la obra teatral Hamlet?', ['William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Oscar Wilde'], 0, 'medio'),
      question('Literatura', '¿Quién escribió Cien años de soledad?', ['Gabriel García Márquez', 'Mario Vargas Llosa', 'Jorge Luis Borges', 'Julio Cortázar'], 0, 'medio'),
      question('Literatura', '¿Qué poeta escribió Veinte poemas de amor y una canción desesperada?', ['Pablo Neruda', 'Octavio Paz', 'Rubén Darío', 'César Vallejo'], 0, 'medio'),
      question('Literatura', '¿En qué novela aparece el capitán Ahab?', ['Moby-Dick', 'La isla del tesoro', 'Robinson Crusoe', 'Veinte mil leguas de viaje submarino'], 0, 'medio'),
      question('Música', '¿Qué familia de instrumentos incluye al violonchelo?', ['Cuerdas frotadas', 'Viento madera', 'Percusión', 'Teclados electrónicos'], 0, 'medio'),
      question('Música', '¿Qué compositor escribió Las cuatro estaciones?', ['Antonio Vivaldi', 'Johann Sebastian Bach', 'Frédéric Chopin', 'Joseph Haydn'], 0, 'medio'),
      question('Música', '¿Cuántos semitonos hay en una octava de la escala cromática occidental?', ['Doce', 'Ocho', 'Diez', 'Catorce'], 0, 'medio'),
      question('Música', '¿Qué instrumento de viento tiene una lengüeta simple?', ['Clarinete', 'Flauta traversa', 'Trompeta', 'Trombón'], 0, 'medio'),
      question('Tecnología', '¿Quién es reconocido por crear la World Wide Web mientras trabajaba en el CERN?', ['Tim Berners-Lee', 'Vint Cerf', 'Steve Wozniak', 'Linus Torvalds'], 0, 'medio'),
      question('Tecnología', '¿Qué significan las siglas CPU en una computadora?', ['Unidad central de procesamiento', 'Control principal de usuario', 'Circuito programable universal', 'Unidad de potencia conectada'], 0, 'medio'),
      question('Tecnología', '¿Qué lenguaje se usa principalmente para estructurar páginas web?', ['HTML', 'SQL', 'Bash', 'Fortran'], 0, 'medio'),
      question('Tecnología', '¿Qué tipo de memoria pierde su contenido al apagar la computadora?', ['RAM', 'ROM', 'Disco óptico', 'Memoria flash'], 0, 'medio'),
      question('Naturaleza', '¿Qué proceso convierte el agua líquida en vapor?', ['Evaporación', 'Condensación', 'Congelación', 'Precipitación'], 0, 'medio'),
      question('Naturaleza', '¿Qué animal es un marsupial nativo de Australia?', ['Canguro', 'Lémur', 'Panda', 'Llama'], 0, 'medio'),
      question('Naturaleza', '¿Cómo se llama la capa externa sólida de la Tierra?', ['Corteza', 'Núcleo interno', 'Manto inferior', 'Núcleo externo'], 0, 'medio'),
      question('Naturaleza', '¿Qué tipo de roca se forma al enfriarse el magma?', ['Ígnea', 'Sedimentaria', 'Metamórfica', 'Orgánica'], 0, 'medio'),
      question('Tecnología', '¿Qué protocolo se utiliza para cargar páginas web de forma segura?', ['HTTPS', 'FTP', 'SMTP', 'Telnet'], 0, 'medio'),
      question('Geografía', '¿En qué ciudad se encuentra la sede principal de la Organización de las Naciones Unidas?', ['Nueva York', 'Ginebra', 'París', 'La Haya'], 0, 'medio'),
      question('Geografía', '¿Qué país soberano posee la mayor longitud de frontera terrestre con Francia?', ['Brasil', 'España', 'Bélgica', 'Alemania'], 0, 'medio'),
      question('Matemática', 'Al lanzar un dado común de seis caras, ¿cuál es la probabilidad de obtener un número mayor que 6?', ['0', '1/6', '1/3', '1/2'], 0, 'medio'),
      question('Ciencia', '¿Cuál es el planeta más cercano al Sol?', ['Mercurio', 'Venus', 'Marte', 'La Tierra'], 0, 'medio'),
      question('Historia', '¿En qué año pisó por primera vez un ser humano la superficie de la Luna?', ['1969', '1968', '1970', '1972'], 0, 'medio'),
      question('Ciencia', '¿Qué orgánulo produce la mayor parte del ATP y se conoce como la central energética celular?', ['La mitocondria', 'El ribosoma', 'El lisosoma', 'El aparato de Golgi'], 0, 'medio'),
      question('Historia', '¿En qué año terminó oficialmente la Segunda Guerra Mundial?', ['1945', '1944', '1946', '1947'], 0, 'medio'),
      question('Literatura', '¿Quién escribió la novela distópica 1984, publicada en 1949?', ['George Orwell', 'Aldous Huxley', 'Ray Bradbury', 'H. G. Wells'], 0, 'medio')
    ],
    dificil: [
      question('Matemática', 'Si 3x + 5 = 26, ¿cuánto vale x?', ['7', '6', '8', '9'], 0, 'dificil'),
      question('Matemática', '¿Cuál es el máximo común divisor de 84 y 126?', ['42', '21', '14', '63'], 0, 'dificil'),
      question('Matemática', '¿Cuánto mide cada ángulo interior de un hexágono regular?', ['120 grados', '108 grados', '135 grados', '150 grados'], 0, 'dificil'),
      question('Matemática', '¿Cuál es la solución positiva de x al cuadrado = 196?', ['14', '12', '13', '16'], 0, 'dificil'),
      question('Historia', '¿En qué año se firmó el Tratado de Tordesillas?', ['1494', '1453', '1519', '1588'], 0, 'dificil'),
      question('Historia', '¿En qué año cayó Constantinopla ante los otomanos?', ['1453', '1415', '1492', '1529'], 0, 'dificil'),
      question('Historia', '¿Qué acuerdo de 1648 puso fin a la Guerra de los Treinta Años?', ['Paz de Westfalia', 'Paz de Augsburgo', 'Tratado de Utrecht', 'Congreso de Viena'], 0, 'dificil'),
      question('Historia', '¿En qué año comenzó la Restauración Meiji en Japón?', ['1868', '1848', '1877', '1905'], 0, 'dificil'),
      question('Deportes', '¿Qué país ganó la Copa Mundial masculina de fútbol de 1966?', ['Inglaterra', 'Alemania Occidental', 'Brasil', 'Argentina'], 0, 'dificil'),
      question('Deportes', '¿Qué país ganó la primera Copa Mundial masculina de fútbol, en 1930?', ['Uruguay', 'Argentina', 'Italia', 'Brasil'], 0, 'dificil'),
      question('Deportes', '¿En qué ciudad se celebraron los Juegos Olímpicos de verano de 1896?', ['Atenas', 'París', 'Roma', 'Londres'], 0, 'dificil'),
      question('Geografía', '¿Cuál es la capital de Kirguistán?', ['Biskek', 'Taskent', 'Dusambé', 'Asjabad'], 0, 'dificil'),
      question('Geografía', '¿Cuál es la capital de Bután?', ['Timbu', 'Katmandú', 'Daca', 'Vientián'], 0, 'dificil'),
      question('Geografía', '¿Qué río atraviesa la ciudad de Budapest?', ['Danubio', 'Rin', 'Elba', 'Sena'], 0, 'dificil'),
      question('Geografía', '¿Qué cordillera separa tradicionalmente Europa de Asia en Rusia?', ['Montes Urales', 'Montes Cárpatos', 'Montes Apeninos', 'Montes Escandinavos'], 0, 'dificil'),
      question('Arte', '¿Qué arquitecto diseñó la Casa Batlló de Barcelona?', ['Antoni Gaudí', 'Frank Lloyd Wright', 'Le Corbusier', 'Mies van der Rohe'], 0, 'dificil'),
      question('Arte', '¿Qué artista neerlandés pintó La ronda de noche?', ['Rembrandt', 'Johannes Vermeer', 'Frans Hals', 'Vincent van Gogh'], 0, 'dificil'),
      question('Arte', '¿Qué movimiento artístico se asocia con André Breton y los sueños?', ['Surrealismo', 'Fauvismo', 'Neoclasicismo', 'Constructivismo'], 0, 'dificil'),
      question('Entretenimiento', '¿En qué año se estrenó la película animada japonesa El viaje de Chihiro?', ['2001', '1997', '2004', '2008'], 0, 'dificil'),
      question('Entretenimiento', '¿Qué película ganó el primer premio Óscar a mejor película animada?', ['Shrek', 'Monsters, Inc.', 'Toy Story', 'El viaje de Chihiro'], 0, 'dificil'),
      question('Entretenimiento', '¿Qué director realizó la película Rashomon, estrenada en 1950?', ['Akira Kurosawa', 'Yasujirō Ozu', 'Kenji Mizoguchi', 'Hayao Miyazaki'], 0, 'dificil'),
      question('Ciencia', '¿Qué número atómico tiene el hierro?', ['26', '24', '28', '30'], 0, 'dificil'),
      question('Ciencia', '¿Qué número atómico tiene el tungsteno?', ['74', '72', '76', '78'], 0, 'dificil'),
      question('Ciencia', '¿Qué orgánulo celular produce la mayor parte del ATP mediante respiración aeróbica?', ['Mitocondria', 'Ribosoma', 'Lisosoma', 'Aparato de Golgi'], 0, 'dificil'),
      question('Ciencia', '¿Qué ley relaciona presión y volumen de un gas a temperatura constante?', ['Ley de Boyle', 'Ley de Ohm', 'Ley de Hooke', 'Ley de Coulomb'], 0, 'dificil'),
      question('Cultura pop', '¿Qué lengua dio origen a la palabra «álgebra» a través del término al-jabr?', ['Árabe', 'Persa', 'Griego', 'Sánscrito'], 0, 'dificil'),
      question('Cultura pop', '¿Qué sistema de escritura japonés se emplea principalmente para palabras de origen extranjero?', ['Katakana', 'Hiragana', 'Kanji clásico', 'Man’yōgana'], 0, 'dificil'),
      question('Cultura pop', '¿Qué ciudad es sede histórica del festival de cine conocido como la Berlinale?', ['Berlín', 'Cannes', 'Venecia', 'Locarno'], 0, 'dificil'),
      question('Literatura', '¿Quién escribió la novela El proceso?', ['Franz Kafka', 'Robert Musil', 'Hermann Hesse', 'Thomas Mann'], 0, 'dificil'),
      question('Literatura', '¿Quién escribió la novela La montaña mágica?', ['Thomas Mann', 'Franz Kafka', 'Stefan Zweig', 'Hermann Broch'], 0, 'dificil'),
      question('Literatura', '¿A qué poeta se atribuye tradicionalmente La Odisea?', ['Homero', 'Virgilio', 'Sófocles', 'Píndaro'], 0, 'dificil'),
      question('Música', '¿En qué año se estrenó la Novena sinfonía de Beethoven?', ['1824', '1812', '1837', '1848'], 0, 'dificil'),
      question('Música', '¿Qué compositor escribió la ópera La flauta mágica?', ['Wolfgang Amadeus Mozart', 'Ludwig van Beethoven', 'Christoph Willibald Gluck', 'Joseph Haydn'], 0, 'dificil'),
      question('Música', '¿Qué compositor francés escribió el Bolero, estrenado en 1928?', ['Maurice Ravel', 'Claude Debussy', 'Erik Satie', 'Camille Saint-Saëns'], 0, 'dificil'),
      question('Tecnología', '¿Qué científico formuló el algoritmo publicado para la máquina analítica de Babbage?', ['Ada Lovelace', 'Grace Hopper', 'Katherine Johnson', 'Hedy Lamarr'], 0, 'dificil'),
      question('Tecnología', '¿Qué lenguaje de programación creó Guido van Rossum?', ['Python', 'Ruby', 'Lua', 'Perl'], 0, 'dificil'),
      question('Tecnología', '¿Qué estándar de codificación representa texto Unicode con longitud variable y compatibilidad ASCII?', ['UTF-8', 'UTF-16BE', 'EBCDIC', 'Morse'], 0, 'dificil'),
      question('Naturaleza', '¿Cuál es el lago más profundo del mundo?', ['Baikal', 'Tanganica', 'Superior', 'Victoria'], 0, 'dificil'),
      question('Naturaleza', '¿Qué desierto frío se extiende por Mongolia y el norte de China?', ['Gobi', 'Kalahari', 'Atacama', 'Sonora'], 0, 'dificil'),
      question('Naturaleza', '¿Qué tipo de roca es el mármol después de la recristalización de caliza?', ['Metamórfica', 'Ígnea', 'Sedimentaria clástica', 'Volcánica vítrea'], 0, 'dificil'),
      question('Naturaleza', '¿Qué río atraviesa la ciudad de Viena?', ['Danubio', 'Dniéper', 'Po', 'Ródano'], 0, 'dificil'),
      question('Matemática', 'Al lanzar un dado equilibrado de seis caras, ¿cuál es la probabilidad de obtener un número primo?', ['1/2', '1/3', '2/3', '1/6'], 0, 'dificil'),
      question('Ciencia', '¿Qué planeta del Sistema Solar completa su rotación sobre el eje en menos de diez horas?', ['Júpiter', 'Saturno', 'Neptuno', 'Urano'], 0, 'dificil'),
      question('Matemática', '¿Qué valor de x satisface la ecuación 2x + 6 = 14?', ['4', '3', '5', '6'], 0, 'dificil'),
      question('Ciencia', '¿Qué tipo de cuerpo celeste es el Sol?', ['Una estrella', 'Un planeta', 'Un satélite natural', 'Un cometa'], 0, 'dificil'),
      question('Matemática', '¿Qué valor de x satisface la ecuación 3x - 7 = 2x + 5?', ['12', '10', '14', '6'], 0, 'dificil')
    ],
    extraFacil: [
      question('Matemática', '¿Cuánto es la mitad de 18?', ['9', '8', '10', '12'], 0, 'facil'),
      question('Geografía', '¿Cuál es la capital de Italia?', ['Roma', 'Milán', 'Nápoles', 'Venecia'], 0, 'facil'),
      question('Ciencia', '¿Qué animal produce miel?', ['Abeja', 'Mariposa', 'Hormiga', 'Libélula'], 0, 'facil'),
      question('Literatura', '¿Cuántas patas tiene una araña?', ['Ocho', 'Seis', 'Diez', 'Doce'], 0, 'facil'),
      question('Naturaleza', '¿Qué estación suele seguir al invierno?', ['Primavera', 'Otoño', 'Verano', 'Monzón'], 0, 'facil'),
      question('Música', '¿Qué instrumento tiene seis cuerdas en su forma clásica más común?', ['Guitarra', 'Violín', 'Arpa pequeña', 'Ukelele'], 0, 'facil'),
      question('Matemática', '¿Cuánto es 8 dividido entre 2?', ['4', '2', '6', '8'], 0, 'facil'),
      question('Geografía', '¿En qué continente se encuentra Brasil?', ['América del Sur', 'África', 'Europa', 'Asia'], 0, 'facil'),
      question('Ciencia', '¿Qué astro ilumina la Tierra durante el día?', ['Sol', 'Luna', 'Venus', 'Marte'], 0, 'facil'),
      question('Deportes', '¿Qué deporte se juega con una pelota y una canasta elevada?', ['Baloncesto', 'Tenis', 'Hockey', 'Béisbol'], 0, 'facil')
    ],
    extraDificil: [
      question('Ciencia', '¿Qué número atómico tiene el osmio?', ['76', '74', '75', '78'], 0, 'muy dificil'),
      question('Arte', '¿Quién pintó Las meninas?', ['Diego Velázquez', 'El Greco', 'Bartolomé Esteban Murillo', 'Francisco de Zurbarán'], 0, 'muy dificil'),
      question('Geografía', '¿Cuál es la capital de Nepal?', ['Katmandú', 'Thimphu', 'Daca', 'Colombo'], 0, 'muy dificil'),
      question('Historia', '¿En qué año se proclamó la independencia de Haití?', ['1804', '1791', '1801', '1810'], 0, 'muy dificil'),
      question('Literatura', '¿Quién escribió la novela El hombre sin atributos?', ['Robert Musil', 'Thomas Mann', 'Hermann Hesse', 'Franz Kafka'], 0, 'muy dificil'),
      question('Matemática', 'Si las raíces de x² - 5x + 6 = 0 son positivas, ¿cuál es su producto?', ['6', '5', '3', '11'], 0, 'muy dificil'),
      question('Música', '¿Qué compositor escribió el ciclo de óperas El anillo del nibelungo?', ['Richard Wagner', 'Richard Strauss', 'Gustav Mahler', 'Carl Maria von Weber'], 0, 'muy dificil'),
      question('Geografía', '¿Qué país tiene como capital a Ulán Bator?', ['Mongolia', 'Kazajistán', 'Kirguistán', 'Tayikistán'], 0, 'muy dificil'),
      question('Ciencia', '¿Qué elemento tiene número atómico 47?', ['Plata', 'Paladio', 'Cadmio', 'Estaño'], 0, 'muy dificil'),
      question('Historia', '¿Qué tratado de 1713 cedió Gibraltar y Menorca a Gran Bretaña?', ['Tratado de Utrecht', 'Tratado de París', 'Tratado de Rastatt', 'Paz de Westfalia'], 0, 'muy dificil')
    ]
  };

  const DIFFICULTY_OPTIONS = [
    { key: 'facil', title: 'FÁCIL', description: '6 preguntas; puedes fallar hasta 3.' },
    { key: 'medio', title: 'MEDIO', description: '5 preguntas; pierdes al tercer error.' },
    { key: 'dificil', title: 'DIFÍCIL', description: '4 preguntas; una extra si empatas.' }
  ];
  const INTRO_TEXT = 'Alto ahí, pequeña. Nadie trepa este pino sin demostrar su ingenio. Responde mis preguntas y te dejaré pasar. ¿Qué nivel de desafío eliges?';
  const EXTRA_EASY_TEXT = 'Empatados... Te haré una última pregunta';
  const EXTRA_HARD_TEXT = 'Esta es la última y la más difícil';
  const WIN_TEXT = 'Has demostrado tu ingenio. El pino es todo tuyo';
  const LOSE_TEXT = 'Aún te falta estudiar un poco. Inténtalo de nuevo';
  const memoryQuestionHistory = {};
  const memoryLastAttempt = {};

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  }

  function readQuestionHistory(bucket) {
    let stored = memoryQuestionHistory[bucket] || [];
    try {
      const saved = JSON.parse(localStorage.getItem(`anika.goblinQuiz.used.${bucket}.v1`) || '[]');
      if (Array.isArray(saved)) stored = saved.filter(id => typeof id === 'string');
    } catch (error) {}
    memoryQuestionHistory[bucket] = stored;
    return stored.slice();
  }

  function readLastAttempt(bucket) {
    let stored = memoryLastAttempt[bucket] || [];
    try {
      const saved = JSON.parse(localStorage.getItem(`anika.goblinQuiz.last.${bucket}.v1`) || '[]');
      if (Array.isArray(saved)) stored = saved.filter(id => typeof id === 'string');
    } catch (error) {}
    memoryLastAttempt[bucket] = stored;
    return stored.slice();
  }

  function saveQuestionHistory(bucket, ids) {
    memoryQuestionHistory[bucket] = ids.slice();
    try {
      localStorage.setItem(`anika.goblinQuiz.used.${bucket}.v1`, JSON.stringify(ids));
    } catch (error) {}
  }

  function chooseQuestionsWithoutRepeats(pool, count, bucket) {
    const history = readQuestionHistory(bucket);
    const lastAttempt = readLastAttempt(bucket);
    const candidates = shuffle(pool.filter(item => !history.includes(item.id)));
    const selected = candidates.slice(0, count);
    const nextHistory = history.concat(selected.map(item => item.id));

    if (selected.length < count) {
      const selectedIds = new Set(selected.map(item => item.id));
      const rolloverPool = shuffle(pool.filter(item => !selectedIds.has(item.id) && !lastAttempt.includes(item.id)));
      const rollover = rolloverPool.slice(0, count - selected.length);
      selected.push(...rollover);
      nextHistory.splice(0, nextHistory.length, ...rollover.map(item => item.id));
    }

    for (let index = 1; index < selected.length; index++) {
      if (selected[index].categoria === selected[index - 1].categoria) {
        const swapIndex = selected.findIndex((item, candidateIndex) => candidateIndex > index && item.categoria !== selected[index - 1].categoria);
        if (swapIndex >= 0) [selected[index], selected[swapIndex]] = [selected[swapIndex], selected[index]];
      }
    }
    saveQuestionHistory(bucket, nextHistory);
    memoryLastAttempt[bucket] = selected.map(item => item.id);
    try {
      localStorage.setItem(`anika.goblinQuiz.last.${bucket}.v1`, JSON.stringify(selected.map(item => item.id)));
    } catch (error) {}
    return selected;
  }

  function wrapText(ctx, text, maxWidth) {
    const lines = [];
    const words = text.split(/\s+/);
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function validateQuestionBank() {
    const pools = [QUESTION_BANK.facil, QUESTION_BANK.medio, QUESTION_BANK.dificil, QUESTION_BANK.extraFacil, QUESTION_BANK.extraDificil];
    const ids = new Set();
    for (const pool of pools) {
      const prompts = new Set();
      for (const item of pool) {
        if (item.opciones.length !== 4 || item.correcta < 0 || item.correcta > 3 || new Set(item.opciones).size !== 4 ||
            prompts.has(item.pregunta) || ids.has(item.id)) {
          throw new Error(`Pregunta inválida: ${item.pregunta}`);
        }
        prompts.add(item.pregunta);
        ids.add(item.id);
      }
    }
    if (QUESTION_BANK.facil.length < 66 || QUESTION_BANK.medio.length < 57 || QUESTION_BANK.dificil.length < 45 ||
        QUESTION_BANK.extraFacil.length < 10 || QUESTION_BANK.extraDificil.length < 10) {
      throw new Error('El banco de preguntas no alcanza las cantidades mínimas.');
    }
  }

  validateQuestionBank();

  window.createGoblinQuiz = function (dependencies) {
    const sceneCanvas = document.createElement('canvas');
    sceneCanvas.width = dependencies.width;
    sceneCanvas.height = dependencies.height;
    const goblinBaseCanvas = document.createElement('canvas');
    goblinBaseCanvas.width = 180;
    goblinBaseCanvas.height = 190;
    let sceneReady = false;
    let questionLines = [];
    let questionLayoutNarrow = null;
    let questionFontSize = 20;
    let questionLineHeight = 25;
    let questionHeight = 0;
    let dialogueLines = [];
    let dialogueMeasuredWidth = 0;
    let currentQuestion = null;
    let questionIndex = 0;
    let questions = [];
    let difficulty = null;
    let substate = 'intro';
    let elapsed = 0;
    let feedbackElapsed = 0;
    let correctCount = 0;
    let errorCount = 0;
    let selectedOption = -1;
    let extraMode = false;
    let plannedResult = 'continue';
    let feedbackText = '';
    let reaction = 'idle';
    let transitionSent = false;
    let dialogueText = '';
    let dialogueNext = '';
    let girlOptions = { facingRight: true, animTime: 0, hasDuck: false, state: 'idle' };
    let interactionsEnabled = true;
    let victoryGirlX = GOBLIN_INITIAL_GIRL_X;

    function buildScene() {
      if (sceneReady) return;
      const sceneCtx = sceneCanvas.getContext('2d');
      const groundLine = GOBLIN_QUIZ_CONFIG.groundY;
      dependencies.drawSky(sceneCtx, 'day');
      dependencies.drawParallaxMountains(sceneCtx, 0, '#9fc0b5', '#7da397');
      for (let index = 0; index < 11; index++) {
        const x = 22 + index * 128;
        const scale = 0.5 + (index % 3) * 0.06;
        dependencies.drawStoryTree(sceneCtx, x, 506, scale, ['#5b9b61', '#70a969', '#4b8754'][index % 3], '#684b36');
      }

      sceneCtx.fillStyle = '#86583b';
      sceneCtx.fillRect(0, groundLine, dependencies.width, dependencies.height - groundLine);
      sceneCtx.fillStyle = '#78a85d';
      sceneCtx.beginPath();
      sceneCtx.moveTo(0, 512);
      sceneCtx.quadraticCurveTo(170, 503, 338, 512);
      sceneCtx.quadraticCurveTo(520, 522, 710, 510);
      sceneCtx.quadraticCurveTo(900, 500, 1080, 512);
      sceneCtx.quadraticCurveTo(1180, 518, dependencies.width, 508);
      sceneCtx.lineTo(dependencies.width, 535);
      sceneCtx.lineTo(0, 535);
      sceneCtx.closePath();
      sceneCtx.fill();
      sceneCtx.strokeStyle = '#a6bf70';
      sceneCtx.lineWidth = 3;
      for (let index = 0; index < 58; index++) {
        const x = (index * 47) % dependencies.width;
        const y = 509 + (index % 4) * 3;
        sceneCtx.beginPath();
        sceneCtx.moveTo(x, y + 5);
        sceneCtx.lineTo(x + ((index % 2) ? -3 : 4), y - 3);
        sceneCtx.stroke();
      }

      sceneCtx.fillStyle = '#326a49';
      sceneCtx.beginPath();
      sceneCtx.moveTo(1080, -30);
      sceneCtx.lineTo(780, 190);
      sceneCtx.quadraticCurveTo(900, 184, 1000, 210);
      sceneCtx.lineTo(730, 345);
      sceneCtx.quadraticCurveTo(900, 330, 1005, 365);
      sceneCtx.lineTo(780, 485);
      sceneCtx.quadraticCurveTo(980, 470, 1110, 514);
      sceneCtx.lineTo(1280, 514);
      sceneCtx.lineTo(1280, -30);
      sceneCtx.closePath();
      sceneCtx.fill();
      sceneCtx.fillStyle = '#39774f';
      sceneCtx.beginPath();
      sceneCtx.moveTo(1150, -20);
      sceneCtx.lineTo(930, 200);
      sceneCtx.quadraticCurveTo(1080, 180, 1190, 228);
      sceneCtx.lineTo(880, 360);
      sceneCtx.quadraticCurveTo(1080, 342, 1210, 395);
      sceneCtx.lineTo(1010, 510);
      sceneCtx.lineTo(1280, 510);
      sceneCtx.lineTo(1280, -20);
      sceneCtx.closePath();
      sceneCtx.fill();

      sceneCtx.fillStyle = '#79543b';
      sceneCtx.beginPath();
      sceneCtx.moveTo(930, -30);
      sceneCtx.quadraticCurveTo(915, 180, 900, 390);
      sceneCtx.quadraticCurveTo(894, groundLine - 34, 826, groundLine - 9);
      sceneCtx.quadraticCurveTo(895, groundLine + 7, 973, groundLine - 10);
      sceneCtx.quadraticCurveTo(1045, groundLine + 10, 1115, groundLine - 8);
      sceneCtx.quadraticCurveTo(1192, groundLine + 8, 1278, groundLine - 7);
      sceneCtx.lineTo(1278, -30);
      sceneCtx.closePath();
      sceneCtx.fill();
      sceneCtx.fillStyle = '#906744';
      sceneCtx.beginPath();
      sceneCtx.moveTo(978, -20);
      sceneCtx.quadraticCurveTo(966, 210, 950, 445);
      sceneCtx.quadraticCurveTo(1018, 465, 1072, 490);
      sceneCtx.quadraticCurveTo(1050, 414, 1081, 294);
      sceneCtx.quadraticCurveTo(1091, 146, 1110, -20);
      sceneCtx.closePath();
      sceneCtx.fill();
      sceneCtx.strokeStyle = '#60422f';
      sceneCtx.lineWidth = 7;
      for (let index = 0; index < 8; index++) {
        const barkX = 926 + index * 47;
        sceneCtx.beginPath();
        sceneCtx.moveTo(barkX, -10 + (index % 3) * 13);
        sceneCtx.bezierCurveTo(barkX - 18, 138, barkX + 16, 286, barkX - 8, 446 + (index % 2) * 24);
        sceneCtx.stroke();
      }
      sceneCtx.strokeStyle = '#b18056';
      sceneCtx.lineWidth = 4;
      sceneCtx.beginPath();
      sceneCtx.moveTo(904, groundLine - 26);
      sceneCtx.quadraticCurveTo(873, groundLine + 3, 832, groundLine + 1);
      sceneCtx.moveTo(965, groundLine - 23);
      sceneCtx.quadraticCurveTo(1008, groundLine + 7, 1062, groundLine + 2);
      sceneCtx.moveTo(1093, groundLine - 26);
      sceneCtx.quadraticCurveTo(1150, groundLine + 6, 1216, groundLine - 4);
      sceneCtx.stroke();
      sceneCtx.fillStyle = '#684832';
      sceneCtx.beginPath();
      sceneCtx.ellipse(978, 396, 15, 23, 0.15, 0, Math.PI * 2);
      sceneCtx.fill();
      sceneCtx.strokeStyle = '#a87a51';
      sceneCtx.lineWidth = 3;
      sceneCtx.beginPath();
      sceneCtx.ellipse(978, 396, 7, 14, 0.15, 0, Math.PI * 2);
      sceneCtx.stroke();

      sceneCtx.fillStyle = '#78a85d';
      sceneCtx.beginPath();
      sceneCtx.moveTo(0, groundLine - 8);
      sceneCtx.quadraticCurveTo(170, groundLine - 17, 338, groundLine - 8);
      sceneCtx.quadraticCurveTo(520, groundLine + 2, 710, groundLine - 10);
      sceneCtx.quadraticCurveTo(900, groundLine - 20, 1080, groundLine - 8);
      sceneCtx.quadraticCurveTo(1180, groundLine - 2, dependencies.width, groundLine - 12);
      sceneCtx.lineTo(dependencies.width, groundLine + 5);
      sceneCtx.lineTo(0, groundLine + 5);
      sceneCtx.closePath();
      sceneCtx.fill();
      sceneCtx.strokeStyle = '#a6bf70';
      sceneCtx.lineWidth = 3;
      for (let index = 0; index < 58; index++) {
        const x = (index * 47) % dependencies.width;
        const y = groundLine - 8 + (index % 4) * 3;
        sceneCtx.beginPath();
        sceneCtx.moveTo(x, y + 5);
        sceneCtx.lineTo(x + ((index % 2) ? -3 : 4), y - 3);
        sceneCtx.stroke();
      }
      buildGoblinBase();
      sceneReady = true;
    }

    function buildGoblinBase() {
      const base = goblinBaseCanvas.getContext('2d');
      base.translate(90, 180);

      base.fillStyle = '#65442f';
      base.beginPath();
      base.moveTo(-20, -8);
      base.quadraticCurveTo(-22, -2, -15, 0);
      base.lineTo(-2, 0);
      base.quadraticCurveTo(3, -2, -1, -8);
      base.closePath();
      base.moveTo(2, -8);
      base.quadraticCurveTo(-1, -2, 5, 0);
      base.lineTo(19, 0);
      base.quadraticCurveTo(26, -3, 18, -8);
      base.closePath();
      base.fill();
      base.strokeStyle = '#b37a4e';
      base.lineWidth = 2;
      base.beginPath();
      base.moveTo(-16, -3);
      base.quadraticCurveTo(-8, -5, -4, -2);
      base.moveTo(8, -3);
      base.quadraticCurveTo(16, -5, 21, -2);
      base.stroke();

      base.fillStyle = '#5c8351';
      base.beginPath();
      base.moveTo(-19, -31);
      base.quadraticCurveTo(-27, -29, -26, -20);
      base.lineTo(-21, -12);
      base.quadraticCurveTo(-19, -9, -15, -12);
      base.lineTo(-12, -18);
      base.lineTo(-11, -8);
      base.quadraticCurveTo(0, -4, 12, -8);
      base.lineTo(12, -19);
      base.lineTo(17, -11);
      base.quadraticCurveTo(21, -8, 24, -13);
      base.lineTo(28, -22);
      base.quadraticCurveTo(28, -29, 20, -32);
      base.lineTo(15, -35);
      base.lineTo(-14, -35);
      base.closePath();
      base.fill();
      base.fillStyle = '#709b61';
      base.beginPath();
      base.moveTo(-13, -31);
      base.quadraticCurveTo(-5, -35, 0, -31);
      base.lineTo(-1, -10);
      base.lineTo(-12, -11);
      base.closePath();
      base.fill();
      base.strokeStyle = '#456a43';
      base.lineWidth = 2;
      base.stroke();
      base.fillStyle = '#6f4a32';
      base.beginPath();
      base.roundRect(-16, -16, 32, 6, 3);
      base.fill();
      base.fillStyle = '#e2b65f';
      base.beginPath();
      base.roundRect(-4, -17, 9, 8, 2);
      base.fill();
      base.fillStyle = '#f6d88c';
      base.fillRect(-1, -15, 3, 4);
      base.fillStyle = '#d9ac64';
      for (let index = 0; index < 3; index++) {
        base.beginPath();
        base.arc(7, -27 + index * 6, 1.6, 0, Math.PI * 2);
        base.fill();
      }

      base.fillStyle = '#c58e61';
      base.beginPath();
      base.moveTo(-12, -47);
      base.quadraticCurveTo(-30, -60, -35, -47);
      base.quadraticCurveTo(-30, -39, -15, -42);
      base.moveTo(12, -47);
      base.quadraticCurveTo(30, -60, 35, -47);
      base.quadraticCurveTo(30, -39, 15, -42);
      base.fill();
      base.fillStyle = '#dfaa94';
      base.beginPath();
      base.moveTo(-17, -48);
      base.lineTo(-29, -49);
      base.lineTo(-18, -44);
      base.moveTo(17, -48);
      base.lineTo(29, -49);
      base.lineTo(18, -44);
      base.fill();

      base.fillStyle = '#edc49b';
      base.beginPath();
      base.arc(0, -46, 15, 0, Math.PI * 2);
      base.fill();
      base.fillStyle = '#d9a77f';
      base.beginPath();
      base.arc(-10, -48, 4, Math.PI * 0.6, Math.PI * 1.75);
      base.arc(10, -48, 4, Math.PI * 1.25, Math.PI * 0.4);
      base.fill();

      base.fillStyle = '#f6ecd7';
      base.beginPath();
      base.moveTo(-12, -43);
      base.quadraticCurveTo(-15, -34, -9, -30);
      base.quadraticCurveTo(-5, -27, -2, -33);
      base.quadraticCurveTo(0, -27, 4, -30);
      base.quadraticCurveTo(9, -26, 13, -32);
      base.quadraticCurveTo(17, -37, 12, -43);
      base.quadraticCurveTo(0, -38, -12, -43);
      base.fill();
      base.fillStyle = '#fff8e9';
      base.beginPath();
      base.arc(-7, -35, 4, 0, Math.PI * 2);
      base.arc(1, -33, 4, 0, Math.PI * 2);
      base.arc(8, -36, 4, 0, Math.PI * 2);
      base.fill();

      base.strokeStyle = '#76543a';
      base.lineWidth = 3;
      base.lineCap = 'round';
      base.beginPath();
      base.moveTo(-28, -11);
      base.lineTo(-35, -59);
      base.stroke();
      base.fillStyle = '#8bbf85';
      base.beginPath();
      base.ellipse(-35, -61, 4, 8, -0.5, 0, Math.PI * 2);
      base.fill();
      base.fillStyle = '#d9b866';
      base.beginPath();
      base.arc(-35, -61, 2.3, 0, Math.PI * 2);
      base.fill();
    }

    function makeDialogueLines(text) {
      const context = dependencies.context;
      context.font = '500 21px Fredoka, Quicksand, sans-serif';
      dialogueLines = wrapText(context, text, Math.min(780, dependencies.width * 0.84) - 36);
      dialogueMeasuredWidth = 0;
      for (const line of dialogueLines) dialogueMeasuredWidth = Math.max(dialogueMeasuredWidth, context.measureText(line).width);
    }

    function dialogueDuration(text) {
      return DIALOGUE_MIN_TIME + text.length * DIALOGUE_SECONDS_PER_CHARACTER;
    }

    function beginDialogue(text, nextSubstate) {
      dialogueText = text;
      dialogueNext = nextSubstate;
      makeDialogueLines(text);
      reaction = 'talk';
      elapsed = 0;
      substate = nextSubstate;
    }

    function advanceDialogue() {
      const nextState = dialogueNext;
      dialogueNext = '';
      if (nextState === 'intro') {
        substate = 'difficulty';
      } else if (nextState === 'extraNotice') {
        beginExtraQuestion();
      } else if (nextState === 'victory') {
        substate = 'victoryExit';
        elapsed = 0;
        victoryGirlX = GOBLIN_INITIAL_GIRL_X;
      } else if (nextState === 'defeatDialog') {
        substate = 'defeat';
      }
    }

    function prepareQuestion(item) {
      currentQuestion = item;
      questionLayoutNarrow = null;
      updateQuestionLayout(dependencies.canvas.getBoundingClientRect().width < 760);
    }

    function updateQuestionLayout(narrow) {
      if (questionLayoutNarrow === narrow || !currentQuestion) return;
      questionLayoutNarrow = narrow;
      questionFontSize = narrow ? 18 : 20;
      questionLineHeight = questionFontSize + 5;
      const context = dependencies.context;
      context.font = `600 ${questionFontSize}px Fredoka, Quicksand, sans-serif`;
      const padding = GOBLIN_QUIZ_CONFIG.panel.padding;
      const panelWidth = dependencies.width * (narrow ? GOBLIN_QUIZ_CONFIG.panel.narrowWidthRatio : GOBLIN_QUIZ_CONFIG.panel.maxWidthRatio);
      questionLines = wrapText(context, currentQuestion.pregunta, panelWidth - padding * 2);
      questionHeight = questionLines.length * questionLineHeight;
    }

    function createSession(selectedDifficulty) {
      difficulty = selectedDifficulty;
      const rules = GOBLIN_QUIZ_CONFIG.difficulties[difficulty];
      const pool = chooseQuestionsWithoutRepeats(QUESTION_BANK[difficulty], rules.questions, difficulty);
      questions = [];
      let previousCategory = '';
      for (const item of pool) {
        previousCategory = item.categoria;
        const correctAnswer = item.opciones[item.correcta];
        const options = shuffle(item.opciones.slice());
        questions.push({
          id: item.id,
          categoria: item.categoria,
          pregunta: item.pregunta,
          opciones: options,
          correcta: options.indexOf(correctAnswer),
          nivel: item.nivel
        });
      }

      correctCount = 0;
      errorCount = 0;
      questionIndex = 0;
      extraMode = false;
      selectedOption = -1;
      plannedResult = 'continue';
      transitionSent = false;
      reaction = 'idle';
      substate = 'question';
      prepareQuestion(questions[0]);
    }

    function decideOutcome(answeredCount, correct, errors) {
      const rules = GOBLIN_QUIZ_CONFIG.difficulties[difficulty];
      if (errors >= rules.errorsToLose) return 'lose';
      if (answeredCount < rules.questions) return 'continue';
      if (rules.hasExtra && correct === rules.extraAtCorrect) return 'extra';
      return correct >= rules.winsAtCorrect ? 'win' : 'lose';
    }

    function answer(optionIndex) {
      if (substate !== 'question' || !currentQuestion || optionIndex < 0 || optionIndex > 3) return;
      selectedOption = optionIndex;
      if (optionIndex === currentQuestion.correcta) {
        correctCount++;
        reaction = 'happy';
        feedbackText = '¡Muy bien!';
        dependencies.audio.playTone(680, 'sine', 0.18, 110, 0.12);
        dependencies.audio.playTone(840, 'triangle', 0.2, 70, 0.08);
      } else {
        errorCount++;
        reaction = 'sad';
        feedbackText = `Casi, la respuesta era ${currentQuestion.opciones[currentQuestion.correcta]}.`;
        dependencies.audio.playTone(390, 'sine', 0.2, -75, 0.1);
      }
      if (extraMode) {
        plannedResult = optionIndex === currentQuestion.correcta ? 'win' : 'lose';
      } else {
        plannedResult = decideOutcome(questionIndex + 1, correctCount, errorCount);
      }
      feedbackElapsed = 0;
      substate = 'feedback';
    }

    function beginExtraQuestion() {
      const pool = difficulty === 'facil' ? QUESTION_BANK.extraFacil : QUESTION_BANK.extraDificil;
      const poolKey = difficulty === 'facil' ? 'facil-extra' : 'dificil-extra';
      const item = chooseQuestionsWithoutRepeats(pool, 1, poolKey)[0];
      const options = shuffle(item.opciones.slice());
      const correctAnswer = item.opciones[item.correcta];
      extraMode = true;
      questionIndex = GOBLIN_QUIZ_CONFIG.difficulties[difficulty].questions;
      prepareQuestion({
        id: item.id,
        categoria: item.categoria,
        pregunta: item.pregunta,
        opciones: options,
        correcta: options.indexOf(correctAnswer),
        nivel: item.nivel
      });
      selectedOption = -1;
      reaction = 'idle';
      substate = 'question';
    }

    function advanceFeedback() {
      if (plannedResult === 'lose') {
        reaction = 'sad';
        beginDialogue(LOSE_TEXT, 'defeatDialog');
      } else if (plannedResult === 'win') {
        transitionSent = false;
        reaction = 'happy';
        beginDialogue(WIN_TEXT, 'victory');
      } else if (plannedResult === 'extra') {
        beginDialogue(difficulty === 'facil' ? EXTRA_EASY_TEXT : EXTRA_HARD_TEXT, 'extraNotice');
      } else {
        questionIndex++;
        selectedOption = -1;
        reaction = 'idle';
        substate = 'question';
        prepareQuestion(questions[questionIndex]);
      }
    }

    function resetToDifficulty() {
      difficulty = null;
      questions = [];
      currentQuestion = null;
      questionIndex = 0;
      correctCount = 0;
      errorCount = 0;
      selectedOption = -1;
      extraMode = false;
      elapsed = 0;
      substate = 'difficulty';
      reaction = 'idle';
      dialogueText = INTRO_TEXT;
      makeDialogueLines(INTRO_TEXT);
    }

    function startLevel() {
      buildScene();
      elapsed = 0;
      feedbackElapsed = 0;
      questionIndex = 0;
      questions = [];
      difficulty = null;
      currentQuestion = null;
      correctCount = 0;
      errorCount = 0;
      selectedOption = -1;
      extraMode = false;
      plannedResult = 'continue';
      transitionSent = false;
      victoryGirlX = GOBLIN_INITIAL_GIRL_X;
      beginDialogue(INTRO_TEXT, 'intro');
    }

    function restartLevel() {
      dependencies.cancelTransition();
      startLevel();
    }

    function startPineTransition() {
      if (transitionSent) return;
      transitionSent = true;
      substate = 'transitioning';
      dependencies.switchState(
        dependencies.states.LEVEL3,
        1 / (60 * GOBLIN_FADE_OUT_TIME),
        GOBLIN_BLACK_HOLD_TIME
      );
    }

    function update(deltaTime) {
      elapsed += deltaTime;
      if ((substate === 'intro' || substate === 'extraNotice' || substate === 'victory' || substate === 'defeatDialog') &&
          elapsed >= dialogueDuration(dialogueText)) {
        advanceDialogue();
      } else if (substate === 'feedback') {
        feedbackElapsed += deltaTime;
        if (feedbackElapsed >= GOBLIN_QUIZ_CONFIG.feedbackSeconds) advanceFeedback();
      } else if (substate === 'victoryExit') {
        victoryGirlX = Math.min(GOBLIN_WALK_TARGET_X, victoryGirlX + GOBLIN_WALK_SPEED * deltaTime);
        if (victoryGirlX >= GOBLIN_WALK_TARGET_X) {
          substate = 'victoryPause';
          elapsed = 0;
        }
      } else if (substate === 'victoryPause' && elapsed >= GOBLIN_STOP_PAUSE_TIME) {
        startPineTransition();
      }
    }

    function drawRoundedPanel(ctx, x, y, width, height, fill, border) {
      ctx.fillStyle = 'rgba(58, 42, 34, 0.16)';
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 6, width, height, 22);
      ctx.fill();
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 22);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = border;
      ctx.stroke();
    }

    function drawTextLines(ctx, lines, centerX, top, lineHeight, color, font) {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let index = 0; index < lines.length; index++) {
        ctx.fillText(lines[index], centerX, top + index * lineHeight);
      }
    }

    function drawDialoguePanel(ctx, text, top, maxWidth, withButton = true) {
      const fontSize = 21;
      const padding = 16;
      const lineHeight = 28;
      const buttonHeight = withButton ? 42 : 0;
      const buttonGap = withButton ? 8 : 0;
      const lines = dialogueLines;
      const width = Math.min(maxWidth, dependencies.width * 0.9, dialogueMeasuredWidth + padding * 2);
      const height = lines.length * lineHeight + padding * 2 + buttonGap + buttonHeight;
      const left = (dependencies.width - width) / 2;
      const fade = Math.min(1, elapsed / GOBLIN_QUIZ_CONFIG.dialogueFadeSeconds);
      ctx.save();
      ctx.globalAlpha *= fade;
      drawRoundedPanel(ctx, left, top, width, height, '#fff3da', '#9d704b');
      drawTextLines(ctx, lines, dependencies.width / 2, top + padding, lineHeight, '#4f3a2d', `500 ${fontSize}px Fredoka, Quicksand, sans-serif`);
      if (withButton) {
        const buttonX = dependencies.width / 2;
        const buttonY = top + height - padding - buttonHeight / 2;
        const hover = dependencies.isMouseInBox(buttonX, buttonY, Math.min(210, width - padding * 2), buttonHeight);
        drawResultButton(ctx, buttonX, buttonY, Math.min(210, width - padding * 2), buttonHeight, 'CONTINUAR', hover);
        if (interactionsEnabled && dependencies.mouse.clicked && hover) {
          dependencies.mouse.clicked = false;
          advanceDialogue();
        }
      }
      ctx.restore();
      return { width, height, lines };
    }

    function drawDifficultyCard(ctx, index, narrow) {
      const option = DIFFICULTY_OPTIONS[index];
      const x = narrow ? dependencies.width / 2 : 430 + (index % 2) * 420;
      const y = narrow ? 166 + index * 68 : 220 + Math.floor(index / 2) * 116;
      const width = narrow ? 720 : 360;
      const height = narrow ? 58 : 94;
      const hover = dependencies.isMouseInBox(x, y, width, height);
      const fill = hover ? '#f5bc63' : '#f1d49c';
      drawRoundedPanel(ctx, x - width / 2, y - height / 2, width, height, fill, hover ? '#fff1cb' : '#b47d4a');
      ctx.fillStyle = '#68452e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${narrow ? 18 : 21}px Fredoka, Quicksand, sans-serif`;
      ctx.fillText(option.title, x, y - (narrow ? 10 : 17));
      ctx.fillStyle = '#72543b';
      ctx.font = '500 14px Fredoka, Quicksand, sans-serif';
      ctx.fillText(option.description, x, y + (narrow ? 14 : 21), width - 20);
      if (interactionsEnabled && dependencies.mouse.clicked && hover) {
        dependencies.mouse.clicked = false;
        dependencies.audio.sfxClick();
        createSession(option.key);
      }
    }

    function drawDifficulty(ctx) {
      drawDialoguePanel(ctx, INTRO_TEXT, 44, 850, false);
      const narrow = dependencies.canvas.getBoundingClientRect().width < 760;
      for (let index = 0; index < DIFFICULTY_OPTIONS.length; index++) drawDifficultyCard(ctx, index, narrow);
    }

    function drawCounterIcon(ctx, x, y, isCorrect) {
      ctx.save();
      ctx.translate(x, y);
      if (isCorrect) {
        ctx.fillStyle = '#6f9c5e';
        ctx.beginPath();
        for (let point = 0; point < 10; point++) {
          const angle = -Math.PI / 2 + point * Math.PI / 5;
          const radius = point % 2 === 0 ? 8 : 3.8;
          const px = Math.cos(angle) * radius;
          const py = Math.sin(angle) * radius;
          if (point === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.strokeStyle = '#c76d62';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-5, -5);
        ctx.lineTo(5, 5);
        ctx.moveTo(5, -5);
        ctx.lineTo(-5, 5);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawOption(ctx, index, x, y, width, height) {
      const hover = substate === 'question' && dependencies.isMouseInBox(x, y, width, height);
      let fill = hover ? '#f6dfb1' : '#fffaf0';
      let border = '#bd9365';
      if (substate === 'feedback') {
        if (index === currentQuestion.correcta) {
          fill = '#cce6bd';
          border = '#6f9c5e';
        } else if (index === selectedOption) {
          fill = '#f0c1b6';
          border = '#ba7163';
        }
      }
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x - width / 2, y - height / 2, width, height, 16);
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#a97949';
      ctx.beginPath();
      ctx.arc(x - width / 2 + 27, y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fffaf0';
      ctx.font = '700 17px Fredoka, Quicksand, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String.fromCharCode(65 + index), x - width / 2 + 27, y + 1);

      ctx.fillStyle = '#4f3d31';
      ctx.font = '600 17px Fredoka, Quicksand, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(currentQuestion.opciones[index], x - width / 2 + 54, y + 1, width - 68);
      if (interactionsEnabled && dependencies.mouse.clicked && hover) {
        dependencies.mouse.clicked = false;
        answer(index);
      }
    }

    function drawQuestion(ctx) {
      const narrow = dependencies.canvas.getBoundingClientRect().width < 760;
      updateQuestionLayout(narrow);
      const padding = GOBLIN_QUIZ_CONFIG.panel.padding;
      const gap = GOBLIN_QUIZ_CONFIG.panel.blockGap;
      const panelWidth = dependencies.width * (narrow ? GOBLIN_QUIZ_CONFIG.panel.narrowWidthRatio : GOBLIN_QUIZ_CONFIG.panel.maxWidthRatio);
      const panelX = (dependencies.width - panelWidth) / 2;
      const headerHeight = 54;
      const lines = questionLines;
      const columns = narrow ? 1 : 2;
      const rows = Math.ceil(4 / columns);
      const optionHeight = narrow ? GOBLIN_QUIZ_CONFIG.panel.narrowOptionHeight : GOBLIN_QUIZ_CONFIG.panel.optionHeight;
      const optionGap = 8;
      const optionsHeight = rows * optionHeight + (rows - 1) * optionGap;
      const feedbackTextHeight = substate === 'feedback' ? 22 : 0;
      const feedbackButtonHeight = substate === 'feedback' ? 38 : 0;
      const feedbackHeight = substate === 'feedback' ? gap + feedbackTextHeight + 6 + feedbackButtonHeight : 0;
      const panelHeight = padding * 2 + headerHeight + gap + questionHeight + gap + optionsHeight + feedbackHeight;
      const panelY = Math.max(12, Math.min(GOBLIN_QUIZ_CONFIG.panel.top, GOBLIN_QUIZ_CONFIG.groundY - panelHeight - 12));
      const panel = { x: panelX, y: panelY, width: panelWidth, height: panelHeight };
      drawRoundedPanel(ctx, panel.x, panel.y, panel.width, panel.height, '#fff2d8', '#9d704b');
      ctx.fillStyle = '#65462f';
      ctx.font = '700 18px Fredoka, Quicksand, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const rules = GOBLIN_QUIZ_CONFIG.difficulties[difficulty];
      const progress = extraMode ? 'Pregunta extra' : `Pregunta ${questionIndex + 1} de ${rules.questions}`;
      const headerY = panel.y + padding;
      const progressX = panel.x + Math.max(padding, 150);
      ctx.fillText(progress, progressX, headerY + 2);
      ctx.fillStyle = '#78905c';
      ctx.beginPath();
      const categoryX = panel.x + panel.width - 276;
      ctx.roundRect(categoryX, headerY - 2, 140, 25, 10);
      ctx.fill();
      ctx.fillStyle = '#fffaf0';
      ctx.font = '600 14px Fredoka, Quicksand, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(currentQuestion.categoria, categoryX + 70, headerY + 10);

      const scoreY = headerY + 36;
      ctx.fillStyle = '#765a40';
      ctx.font = '600 13px Fredoka, Quicksand, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText('ACIERTOS', panel.x + padding, scoreY);
      drawCounterIcon(ctx, panel.x + padding + 82, scoreY, true);
      ctx.fillStyle = '#4f7950';
      ctx.font = '700 15px Fredoka, Quicksand, sans-serif';
      ctx.fillText(String(correctCount), panel.x + padding + 95, scoreY);
      ctx.fillStyle = '#765a40';
      ctx.font = '600 13px Fredoka, Quicksand, sans-serif';
      ctx.fillText('ERRORES', panel.x + padding + 142, scoreY);
      drawCounterIcon(ctx, panel.x + padding + 213, scoreY, false);
      ctx.fillStyle = '#b4554c';
      ctx.font = '700 15px Fredoka, Quicksand, sans-serif';
      ctx.fillText(String(errorCount), panel.x + padding + 226, scoreY);

      const questionTop = headerY + headerHeight + gap;
      drawTextLines(ctx, lines, dependencies.width / 2, questionTop, questionLineHeight, '#49382d', `600 ${questionFontSize}px Fredoka, Quicksand, sans-serif`);
      const optionsTop = questionTop + questionHeight + gap;
      const optionWidth = (panel.width - padding * 2 - (columns - 1) * optionGap) / columns;
      for (let index = 0; index < 4; index++) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const optionX = panel.x + padding + optionWidth / 2 + column * (optionWidth + optionGap);
        const optionY = optionsTop + optionHeight / 2 + row * (optionHeight + optionGap);
        drawOption(ctx, index, optionX, optionY, optionWidth, optionHeight);
      }

      if (substate === 'feedback') {
        ctx.fillStyle = plannedResult === 'lose' && feedbackText !== '¡Muy bien!' ? '#9a564d' : '#557647';
        ctx.font = '700 16px Fredoka, Quicksand, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const feedbackY = optionsTop + optionsHeight + gap;
        ctx.fillText(feedbackText, dependencies.width / 2, feedbackY + 11, panel.width - padding * 2);
        const buttonY = feedbackY + feedbackTextHeight + 6 + feedbackButtonHeight / 2;
        const hover = dependencies.isMouseInBox(dependencies.width / 2, buttonY, 170, 38);
        drawResultButton(ctx, dependencies.width / 2, buttonY, 170, 38, 'SIGUIENTE', hover);
        if (interactionsEnabled && dependencies.mouse.clicked && hover) {
          dependencies.mouse.clicked = false;
          advanceFeedback();
        }
      }
    }

    function drawResult(ctx, won) {
      if (!won) {
        ctx.fillStyle = 'rgba(55, 39, 31, 0.36)';
        ctx.fillRect(0, 0, dependencies.width, dependencies.height);
      }
      const width = won ? 780 : 650;
      const height = won ? 148 : 390;
      const x = (dependencies.width - width) / 2;
      const y = won ? 66 : (dependencies.height - height) / 2 - 20;
      drawRoundedPanel(ctx, x, y, width, height, '#fff2d8', won ? '#89a86b' : '#bf8465');
      drawTextLines(ctx, dialogueLines, dependencies.width / 2, y + (won ? 24 : 42), 34, '#503b2e', '600 25px Fredoka, Quicksand, sans-serif');
      if (won) {
        ctx.fillStyle = '#708b53';
        ctx.font = '600 19px Fredoka, Quicksand, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('El camino hacia la copa está despejado', dependencies.width / 2, y + 112);
        return;
      }

      ctx.fillStyle = '#75543a';
      ctx.font = '600 23px Fredoka, Quicksand, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Aciertos: ${correctCount}     Errores: ${errorCount}`, dependencies.width / 2, y + 160);
      const retryHover = dependencies.isMouseInBox(dependencies.width / 2, y + 238, 290, 54);
      const menuHover = dependencies.isMouseInBox(dependencies.width / 2, y + 310, 290, 54);
      drawResultButton(ctx, dependencies.width / 2, y + 238, 290, 54, 'REINTENTAR', retryHover);
      drawResultButton(ctx, dependencies.width / 2, y + 310, 290, 54, 'VOLVER AL INICIO', menuHover);
      if (interactionsEnabled && dependencies.mouse.clicked && retryHover) {
        dependencies.mouse.clicked = false;
        dependencies.audio.sfxClick();
        resetToDifficulty();
      } else if (interactionsEnabled && dependencies.mouse.clicked && menuHover) {
        dependencies.mouse.clicked = false;
        dependencies.audio.sfxClick();
        dependencies.gameState.resetLives(3);
        dependencies.switchState(dependencies.states.MENU);
      }
    }

    function drawResultButton(ctx, x, y, width, height, text, hover) {
      ctx.fillStyle = hover ? '#eab45f' : '#d79a45';
      ctx.beginPath();
      ctx.roundRect(x - width / 2, y - height / 2, width, height, 17);
      ctx.fill();
      ctx.strokeStyle = '#fff1d2';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#fffaf0';
      ctx.font = '700 19px Fredoka, Quicksand, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y + 1);
    }

    function drawGoblin(ctx, x, groundY) {
      const breathing = Math.sin(elapsed * 2.4) * 1.5;
      const happyJump = substate === 'feedback' && reaction === 'happy' ? Math.max(0, Math.sin(elapsed * 8)) * 5 : 0;
      const headTilt = reaction === 'sad' ? -0.06 : Math.sin(elapsed * 1.25) * 0.012;
      const blink = Math.sin(elapsed * 1.5 + 0.4) > 0.985;
      const talking = substate === 'intro' || substate === 'extraNotice' || substate === 'defeatDialog' || substate === 'victory';
      ctx.save();
      ctx.translate(x, groundY - breathing - happyJump);
      ctx.drawImage(goblinBaseCanvas, 55, 119, 70, 61, -35, -DUENDE_HEIGHT, 70, DUENDE_HEIGHT);

      ctx.save();
      ctx.translate(0, -DUENDE_HEIGHT + 1);
      ctx.rotate(Math.sin(elapsed * 1.4) * 0.025);
      ctx.fillStyle = '#70513a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8bbf85';
      ctx.beginPath();
      ctx.moveTo(-17, -2);
      ctx.quadraticCurveTo(-17, -17, -4, -21);
      ctx.lineTo(17, -34);
      ctx.quadraticCurveTo(16, -16, 11, -2);
      ctx.quadraticCurveTo(0, 3, -17, -2);
      ctx.fill();
      ctx.fillStyle = '#75a572';
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.quadraticCurveTo(9, -18, 17, -34);
      ctx.quadraticCurveTo(16, -16, 11, -2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#527b50';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#c9a158';
      ctx.beginPath();
      ctx.roundRect(-17, -8, 34, 6, 3);
      ctx.fill();
      ctx.fillStyle = '#f3d996';
      ctx.beginPath();
      ctx.arc(1, -5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d2ad64';
      ctx.beginPath();
      ctx.arc(-1, -21, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff1cb';
      ctx.beginPath();
      ctx.arc(-1.8, -22, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const eyeY = -44;
      ctx.save();
      ctx.rotate(headTilt);
      ctx.strokeStyle = '#654536';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-16, eyeY - 7);
      ctx.quadraticCurveTo(-11, eyeY - (reaction === 'happy' ? 10 : 8), -6, eyeY - 6);
      ctx.moveTo(6, eyeY - 6);
      ctx.quadraticCurveTo(11, eyeY - (reaction === 'sad' ? 3 : 9), 16, eyeY - 7);
      ctx.stroke();

      if (blink) {
        ctx.strokeStyle = '#49382d';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-14, eyeY);
        ctx.quadraticCurveTo(-11, eyeY + 2, -8, eyeY);
        ctx.moveTo(8, eyeY);
        ctx.quadraticCurveTo(11, eyeY + 2, 14, eyeY);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#fffdf5';
        ctx.beginPath();
        ctx.ellipse(-11, eyeY, 4.5, 5.2, 0, 0, Math.PI * 2);
        ctx.ellipse(11, eyeY, 4.5, 5.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#49382d';
        ctx.beginPath();
        ctx.arc(-10, eyeY + 0.5, 2.5, 0, Math.PI * 2);
        ctx.arc(12, eyeY + 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fffdf5';
        ctx.beginPath();
        ctx.arc(-10.7, eyeY - 0.7, 0.9, 0, Math.PI * 2);
        ctx.arc(11.3, eyeY - 0.7, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#d59a78';
      ctx.beginPath();
      ctx.ellipse(-21, -37, 5, 3.2, 0, 0, Math.PI * 2);
      ctx.ellipse(21, -37, 5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#bb815a';
      ctx.beginPath();
      ctx.ellipse(0, -38, 4.2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#8b5a48';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      if (reaction === 'sad') ctx.arc(0, -30, 4.5, Math.PI * 1.1, Math.PI * 1.9);
      else if (talking && Math.floor(elapsed * 5) % 2 === 0) ctx.ellipse(0, -31, 2.5, 3.2, 0, 0, Math.PI * 2);
      else ctx.arc(0, -34, 5, 0.15, Math.PI - 0.15);
      ctx.stroke();

      if (talking) {
        const gesture = Math.sin(elapsed * 3.4) * 4;
        ctx.strokeStyle = '#557d4e';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-23, -29);
        ctx.quadraticCurveTo(-31, -36 - gesture, -35, -44 - gesture);
        ctx.moveTo(23, -29);
        ctx.quadraticCurveTo(31, -36 + gesture, 35, -44 + gesture);
        ctx.stroke();
        ctx.fillStyle = '#edc49b';
        ctx.beginPath();
        ctx.arc(-35, -44 - gesture, 4.5, 0, Math.PI * 2);
        ctx.arc(35, -44 + gesture, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = '#d9c4a0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-8, -22);
      ctx.quadraticCurveTo(0, -19 + Math.sin(elapsed * 2.6) * 1.4, 8, -22);
      ctx.stroke();

      ctx.restore();
      ctx.restore();
    }

    function drawCelebration(ctx) {
      ctx.fillStyle = '#f5c46f';
      for (let index = 0; index < 5; index++) {
        const x = 440 + index * 94;
        const y = 284 + Math.sin(elapsed * 3 + index) * 11;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
      }
    }

    function drawCharacters(ctx) {
      const walkingToTree = substate === 'victoryExit' || substate === 'victoryPause' || substate === 'transitioning';
      const girlX = walkingToTree ? victoryGirlX : GOBLIN_INITIAL_GIRL_X;
      girlOptions.animTime = elapsed;
      girlOptions.state = substate === 'victoryExit' && victoryGirlX < GOBLIN_WALK_TARGET_X ? 'run' : 'idle';
      dependencies.drawGirl(ctx, girlX, GOBLIN_QUIZ_CONFIG.groundY, girlOptions);
      const goblinX = walkingToTree ? 944 : 920;
      drawGoblin(ctx, goblinX, GOBLIN_QUIZ_CONFIG.groundY);
    }

    function drawCameraScene(ctx) {
      ctx.save();
      ctx.translate(dependencies.width / 2, GOBLIN_QUIZ_CONFIG.groundY);
      ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);
      ctx.translate(-dependencies.width / 2, -GOBLIN_QUIZ_CONFIG.groundY);
      ctx.drawImage(sceneCanvas, 0, 0);
      drawCharacters(ctx);
      ctx.restore();
    }

    function draw(ctx) {
      buildScene();
      interactionsEnabled = !dependencies.isPaused();
      if (interactionsEnabled && (substate === 'victoryExit' || substate === 'victoryPause') && dependencies.mouse.clicked) {
        dependencies.mouse.clicked = false;
        startPineTransition();
      }
      drawCameraScene(ctx);
      if (substate === 'intro') {
        drawDialoguePanel(ctx, dialogueText, 44, 850, true);
      } else if (substate === 'difficulty') {
        drawDifficulty(ctx);
      } else if (substate === 'question' || substate === 'feedback') {
        drawQuestion(ctx);
      } else if (substate === 'extraNotice') {
        drawDialoguePanel(ctx, dialogueText, 44, 850, true);
      } else if (substate === 'victory') {
        drawCelebration(ctx);
        drawDialoguePanel(ctx, dialogueText, 34, 850, true);
      } else if (substate === 'victoryExit' || substate === 'victoryPause') {
        drawCelebration(ctx);
      } else if (substate === 'defeatDialog') {
        drawDialoguePanel(ctx, dialogueText, 44, 850, true);
      } else if (substate === 'defeat') {
        drawResult(ctx, false);
      }

      dependencies.drawLogo(ctx, dependencies.logoSize);
    }

    function handleKey(event) {
      const restartShortcut = (event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === GOBLIN_RESTART_KEY;
      if (restartShortcut) {
        event.preventDefault();
        if (!event.repeat && !dependencies.isPaused()) restartLevel();
        return true;
      }
      if (dependencies.isPaused()) return false;
      if ((substate === 'victoryExit' || substate === 'victoryPause') && (event.code === 'Space' || event.code === 'Enter')) {
        startPineTransition();
        return true;
      }
      if (substate === 'intro' || substate === 'extraNotice' || substate === 'victory' || substate === 'defeatDialog') {
        if (event.code === 'Enter' || event.code === 'Space') {
          advanceDialogue();
          return true;
        }
        return false;
      }
      if (substate === 'difficulty') {
        if (event.code === 'Digit1' || event.code === 'Numpad1') createSession('facil');
        else if (event.code === 'Digit2' || event.code === 'Numpad2') createSession('medio');
        else if (event.code === 'Digit3' || event.code === 'Numpad3') createSession('dificil');
        else return false;
        dependencies.audio.sfxClick();
        return true;
      }
      if (substate === 'question') {
        const keyMap = { Digit1: 0, Numpad1: 0, KeyA: 0, Digit2: 1, Numpad2: 1, KeyB: 1, Digit3: 2, Numpad3: 2, KeyC: 2, Digit4: 3, Numpad4: 3, KeyD: 3 };
        if (Object.prototype.hasOwnProperty.call(keyMap, event.code)) {
          answer(keyMap[event.code]);
          return true;
        }
      } else if (substate === 'feedback' && (event.code === 'Enter' || event.code === 'Space')) {
        advanceFeedback();
        return true;
      } else if (substate === 'defeat' && (event.code === 'Enter' || event.code === 'KeyR')) {
        resetToDifficulty();
        return true;
      }
      return false;
    }

    return {
      init: startLevel,
      update,
      draw,
      handleKey,
      decideOutcome,
      getSnapshot() {
        return { substate, difficulty, questionIndex, correctCount, errorCount, extraMode, currentQuestion, victoryGirlX };
      }
    };
  };
})();