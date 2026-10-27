// MediaScript commands in Spanish (filters, plus `dance`), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


const ONLY_MEDIA = {MEDIA_KEY: MEDIA};
const ANIMATED_GIF = 'Una imagen fija se convierte en un GIF animado.';
const AUTO = '0 lo elige automáticamente';
const SAME_SEED = 'la misma semilla da el mismo resultado; none es al azar';
const STILL_PNG = 'Los vídeos usan su primer fotograma, y el resultado siempre es un PNG fijo.';


export const MEDIASCRIPT_SPANISH_7: TagDocsTranslation['mediaScriptCommands'] = {
  ascii: {
    summary: 'Vuelve a dibujar una imagen o un vídeo como arte ASCII.',
    args: {
      MEDIA_KEY: MEDIA,
      INVERT: 'invertir el brillo',
    },
  },
  blur: {
    summary: 'Desenfoca la multimedia.',
    args: {
      MEDIA_KEY: MEDIA,
      SCALE: 'intensidad del desenfoque',
    },
  },
  motionblur: {
    summary: 'Desenfoca en una sola dirección, como si la cámara se hubiera movido.',
    args: {
      MEDIA_KEY: MEDIA,
      VERTICAL: 'desenfocar hacia arriba/abajo en lugar de izquierda/derecha',
    },
  },
  zoomblur: {
    summary: 'Desenfoca hacia fuera desde el centro, como al hacer zoom durante una exposición larga.',
    args: ONLY_MEDIA,
  },
  sharpen: {
    summary: 'Enfoca la multimedia (los números negativos la suavizan).',
    args: ONLY_MEDIA,
  },
  deepfry: {
    summary: 'Aplica deepfry a la multimedia: colores machacados, sobresaturada y crujiente.',
    args: {
      MEDIA_KEY: MEDIA,
      SCALE: 'cuánto se fríe',
    },
  },
  jpeg: {
    summary: 'Añade artefactos de compresión JPEG ("needs more jpeg").',
    args: {
      MEDIA_KEY: MEDIA,
      QUALITY: 'calidad de imagen; cuanto más baja, más crujiente',
    },
  },
  android: {
    summary: 'Hace que la multimedia parezca enviada desde un Android antiguo: audio comprimido, imagen pixelada y 2 fps.',
    args: ONLY_MEDIA,
  },
  magik: {
    summary: 'Aplica la clásica deformación "magik" de reescalado líquido.',
    args: {
      MEDIA_KEY: MEDIA,
      ITERATIONS: 'cuántas veces aplicarlo',
      SCALE: 'cuánto aplasta la imagen cada pasada',
    },
  },
  pixelate: {
    summary: 'Pixela la multimedia.',
    args: {
      MEDIA_KEY: MEDIA,
      PIXEL_WIDTH: 'tamaño de cada bloque (`PIXEL_SIZE=` también funciona)',
      NO_LINES: 'ocultar las líneas de la cuadrícula entre bloques',
    },
  },
  trace: {
    summary: 'Encuentra y resalta los bordes (detección de bordes de Prewitt).',
    args: ONLY_MEDIA,
  },
  edgedetect: {
    summary: 'Encuentra los bordes y los vuelve a mezclar con la multimedia, con muchos modos de fusión.',
    args: {
      MEDIA_KEY: MEDIA,
      METHOD: 'cómo se componen los bordes sobre la multimedia',
      MIX: 'cuánto del efecto aplicar',
    },
    notes: ['Usa detección de bordes de Sobel en 8 direcciones.'],
  },
  emboss: {
    summary: 'Hace que la multimedia parezca en relieve o estampada.',
    args: {
      MEDIA_KEY: MEDIA,
      AZIMUTH: 'dirección de la luz',
      ELEVATION: 'altura de la luz',
      COMPOSE: 'mezclar el relieve de vuelta con la original',
      GRAY: '`none`, o un número que fija el nivel de gris de las zonas planas (solo con el método GIMP)',
    },
  },
  paint: {
    summary: 'Hace que la multimedia parezca una pintura al óleo.',
    args: {
      MEDIA_KEY: MEDIA,
      RADIUS: 'tamaño del pincel',
    },
  },
  watercolor: {
    summary: 'Hace que la multimedia parezca una acuarela.',
    args: ONLY_MEDIA,
  },
  cartoon: {
    summary: 'Hace que la multimedia parezca un dibujo animado con colores planos y bordes entintados.',
    args: {
      MEDIA_KEY: MEDIA,
      LEVELS: 'número de niveles de color',
      METHOD: 'cómo se encuentran los bordes',
    },
  },
  exo: {
    summary: 'Aplica un filtro de aspecto alienígena.',
    args: {
      MEDIA_KEY: MEDIA,
      SWIRL: 'añadir un remolino',
      RAIN: 'añadir el tinte de arcoíris',
    },
    notes: [
      'El efecto `kek` del bot es `exo MEDIA_KEY true`.',
      'El efecto `kek2` del bot es `exo MEDIA_KEY true true`.',
    ],
  },
  glitch: {
    summary: 'Aplica un efecto glitch fuerte.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: AUTO,
      ITERATIONS: AUTO,
      SEED: 'usa la misma semilla para obtener el mismo glitch; 0 es al azar',
    },
  },
  dance: {
    summary: 'Recorta el sujeto y hace que se aplaste y se estire al ritmo sobre su fondo rellenado.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'cuánto se aplasta y se estira, en porcentaje de su altura',
      BPM: 'pulsaciones por minuto; cambia de pose en cada pulsación',
      MODEL: 'el modelo de quitar fondos que encuentra el sujeto',
    },
    notes: [
      'Siempre crea un GIF en bucle de un rebote a partir del primer fotograma: los GIFs y los vídeos usan su primer fotograma, así que el fondo solo se quita una vez.',
    ],
  },
  datamosh: {
    summary: 'Duplica los P-frames del vídeo para un glitch de datamosh borroso.',
    args: ONLY_MEDIA,
  },
  grain: {
    summary: 'Añade grano de película.',
    args: {
      MEDIA_KEY: MEDIA,
      FLAGS: 'de 1 a 4 letras de entre `a`, `p`, `t`, `u` (flags de ruido de FFmpeg: promediado, patrón, temporal, uniforme)',
    },
  },
  glow: {
    summary: 'Añade un resplandor poniendo encima de la multimedia una copia desenfocada y con los colores invertidos al 50% de opacidad.',
    args: ONLY_MEDIA,
  },
  vaporwave: {
    summary: 'Da a la multimedia una estética vaporwave, opcionalmente con texto.',
    args: {
      MEDIA_KEY: MEDIA,
      TEXT: 'texto opcional que añadir',
    },
  },
  phosimp: {
    summary: 'Aplica filtros de PhoSimp, uno detrás de otro.',
    args: {
      MEDIA_KEY: MEDIA,
      FILTERS: 'números de filtro separados por espacios, aplicados en orden',
    },
    results: [
      'Aclara los colores, mezcla la imagen con su reflejo y la gira en sentido horario.',
    ],
    notes: [
      'Como mucho 300 filtros. Funciona con imágenes y vídeo.',
      'Algunos para empezar: `1` negativo (invertir), `2` multiplicar RGB por 2, `3` dividir RGB entre 2, `7` / `8` girar en sentido antihorario / horario, `9` mezcla con reflejo, `10` duplicar en cuatro cuadrados. Hay más de mil, así que prueba números al azar.',
    ],
  },
  edit: {
    summary: 'Edita una imagen con IA según un prompt, opcionalmente usando otra multimedia como imágenes de referencia.',
    args: {
      MEDIA_KEY: MEDIA,
      MEDIA_KEYS: 'hasta 5 claves de otras imágenes o vídeos, escritas antes del prompt, que usar como imágenes de referencia',
      PROMPT: 'qué cambiar; si está vacío se usa un prompt al azar',
    },
    results: [
      '',
      'Pone el sombrero de la última imagen del chat sobre el avatar.',
    ],
    notes: [
      'Funciona mejor con ediciones sencillas.',
      'Las palabras del principio del prompt que coinciden con una clave de multimedia se usan como imágenes de referencia, así que envuelve el prompt en `{jsonify:}` si puede empezar por uno de tus nombres de clave.',
      STILL_PNG,
    ],
  },
  mashup: {
    summary: 'Edita la primera multimedia con IA para que parezca las dos mezcladas, como `.mashup`.',
    args: {
      MEDIA_KEY: MEDIA,
      MEDIA_KEY_2: 'la multimedia que mezclar',
    },
    results: [
      'El avatar mezclado con la última imagen del chat.',
    ],
    notes: [
      'Primero la IA describe las dos, y la primera se edita para que parezca las dos descripciones.',
      STILL_PNG,
    ],
  },
  artistic: {
    summary: 'Convierte la multimedia en una pintura en relieve.',
    args: ONLY_MEDIA,
  },
  charcoal: {
    summary: 'Hace que la multimedia parezca un dibujo al carboncillo.',
    args: ONLY_MEDIA,
  },
  charcoalanimated: {
    summary: 'Un efecto de dibujo al carboncillo que se va haciendo más fuerte poco a poco.',
    args: {
      MEDIA_KEY: MEDIA,
      RADIUS: 'el radio más fuerte al que llega',
    },
    notes: [ANIMATED_GIF],
  },
  circle: {
    summary: 'Aplica un desenfoque radial (giratorio).',
    args: {
      MEDIA_KEY: MEDIA,
      SCALE: 'intensidad del desenfoque',
    },
  },
  emojimosaic: {
    summary: 'Reconstruye la multimedia a base de emojis.',
    args: {
      MEDIA_KEY: MEDIA,
      SIZE: 'cuántos emojis a lo largo del lado más largo; none es uno cada 16 píxeles',
    },
  },
  glass: {
    summary: 'Pone la multimedia detrás de un cristal roto.',
    args: ONLY_MEDIA,
  },
  glitchanimated: {
    summary: 'Aplica el efecto `glitch`, cambiando en cada fotograma.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: AUTO,
      ITERATIONS: AUTO,
      SEED: '0 es al azar',
    },
    notes: [ANIMATED_GIF],
  },
  legofy: {
    summary: 'Reconstruye la multimedia con piezas de LEGO.',
    args: {
      MEDIA_KEY: MEDIA,
      SIZE: 'piezas a lo largo del lado más largo; none lo elige automáticamente',
      PALETTE: 'limitar los colores a colores reales de LEGO',
      DITHER: 'aplicar tramado a los colores (usa la paleta ALL si no se elige ninguna)',
    },
  },
  magikanimated: {
    summary: 'Aplica `magik` (reescalado líquido) cada vez más a lo largo de los fotogramas.',
    args: {
      MEDIA_KEY: MEDIA,
      BOOMERANG: 'reproducirlo al revés después',
    },
    notes: [ANIMATED_GIF],
  },
  paintanimated: {
    summary: 'Un efecto de pintura al óleo que se va haciendo más fuerte poco a poco.',
    args: ONLY_MEDIA,
    notes: [ANIMATED_GIF],
  },
  paper: {
    summary: 'Convierte la multimedia en una polaroid inclinada y la dobla como una hoja de papel.',
    args: {
      MEDIA_KEY: MEDIA,
      ANGLE: 'cuánto inclinarla; none elige un ángulo al azar',
    },
  },
  pix2pix: {
    summary: 'Vuelve a dibujar la multimedia con un modelo pix2pix.',
    args: {
      MEDIA_KEY: MEDIA,
      MODEL: 'EDGES convierte la multimedia en dibujo de líneas; EMOJI y FLESH la vuelven a dibujar a partir de ese dibujo de líneas',
      RESIZE: 'volver a ampliar el resultado al tamaño de la multimedia (más lento); con imágenes fijas siempre se hace',
    },
  },
  pixelsort: {
    summary: 'Ordena tiras de píxeles para un aspecto de glitch art a rayas.',
    args: {
      MEDIA_KEY: MEDIA,
      ANGLE: 'dirección del ordenado',
      INTERVAL: 'cómo se eligen las tiras; IMAGE ordena todos los píxeles como una sola tira',
      SORT_BY: 'COLOR agrupa por el color dominante y después por el brillo',
      LOWER: 'THRESHOLD solo ordena los píxeles entre LOWER y UPPER',
      LENGTH: 'longitud de las tiras con RANDOM y WAVES',
      RANDOMNESS: 'porcentaje de tiras que se quedan sin ordenar (píxeles con IMAGE)',
      SEED: SAME_SEED,
    },
  },
  popart: {
    summary: 'Crea una cuadrícula de pop art al estilo Warhol con copias teñidas.',
    args: ONLY_MEDIA,
  },
  quadart: {
    summary: 'Vuelve a dibujar la multimedia como un quadtree de círculos o cuadrados.',
    args: ONLY_MEDIA,
  },
  smile: {
    summary: 'Hace sonreír a las caras de la multimedia, como el comando smile.',
    args: {
      MEDIA_KEY: MEDIA,
      LEVEL: 'desde una sonrisa con la boca cerrada hasta una radiante',
      MAX_FACES: 'cuántas de las caras más grandes cambiar',
    },
    notes: [
      'Solo cambian las caras; el resto de la multimedia se queda como está.',
      'Usa IA y cuenta para las 20 peticiones de IA que puede hacer un script (compartidas con `edit` e `imagine`).',
    ],
  },
  swappixels: {
    summary: 'Desordena todos los píxeles.',
    args: ONLY_MEDIA,
  },
  vhs: {
    summary: 'Hace que la multimedia parezca una cinta VHS antigua.',
    args: ONLY_MEDIA,
  },
};
