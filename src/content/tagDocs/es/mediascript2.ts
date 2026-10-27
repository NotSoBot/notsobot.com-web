// MediaScript commands in Spanish (create media), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


const NEW_IMAGE = 'el nombre de la nueva imagen';
const POLYGON_COLOR = 'RGBA o #HEX, sin espacios';
const POLYGON_POINTS = 'puntos `x,y` separados por espacios';
const ONLY_BY_NAME = 'solo por nombre';


export const MEDIASCRIPT_SPANISH_2: TagDocsTranslation['mediaScriptCommands'] = {
  create: {
    summary: 'Crea una imagen en blanco: totalmente transparente, o de un color sólido si le das uno.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      WIDTH: 'ancho en píxeles',
      HEIGHT: 'alto en píxeles',
      ALPHA: 'opacidad: 0 es invisible y 255 es sólido; omítelo para que sea totalmente opaca cuando se da un color, o totalmente transparente cuando no',
    },
    results: [
      'Un cuadrado azul cielo de 500x500.',
      'Una imagen de 500x500 totalmente transparente.',
    ],
    notes: [
      'Sin RED, GREEN ni BLUE, la imagen es totalmente transparente (alfa 0). Dar cualquiera de ellos crea un color sólido, con los que falten a 0 y ALPHA a 255 salvo que lo indiques.',
    ],
  },
  createpolygonfill: {
    summary: 'Dibuja un polígono relleno a partir de una lista de puntos.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      COLOR: POLYGON_COLOR,
      POINTS: POLYGON_POINTS,
    },
    results: [
      'Un triángulo rojo sobre una imagen transparente de 300x300.',
    ],
    notes: ['El tamaño de la imagen lo marcan la X y la Y más grandes de entre los puntos.'],
  },
  createpolygonstroke: {
    summary: 'Dibuja solo el contorno de un polígono a partir de una lista de puntos.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      COLOR: POLYGON_COLOR,
      POINTS: POLYGON_POINTS,
    },
    notes: ['Igual que `createpolygonfill`, pero con contorno en lugar de relleno.'],
  },
  loadsvg: {
    summary: 'Convierte código SVG en una imagen.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      SVG_TEXT: 'el código SVG, envuelto en `{jsonify:}`',
    },
    results: [
      'Un círculo rojo.',
    ],
  },
  imagine: {
    summary: 'Genera una imagen con IA a partir de un prompt de texto.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      PROMPT: 'qué dibujar; si está vacío se usa un prompt al azar',
    },
    results: [
      'Un coche hecho con IA, con vaporwave.',
    ],
  },
  reimagine: {
    summary: 'Sustituye la multimedia por una imagen nueva hecha con IA de lo que muestra, como `.reimagine`.',
    args: {
      MEDIA_KEY: MEDIA,
      ADD: 'palabras extra que se añaden al final de la descripción de la imagen',
    },
    results: [
      'Una imagen nueva de lo que muestra el avatar, en pixel art.',
    ],
    notes: [
      'Primero la IA describe la imagen, y lo que se dibuja es esa descripción (más `ADD`), así que el resultado es una imagen nueva, no una edición.',
      'Los vídeos usan su primer fotograma, y el resultado siempre es una imagen fija.',
    ],
  },
  screenshot: {
    summary: 'Hace una captura de pantalla de una página web.',
    args: {
      URL: 'la página que capturar',
      MEDIA_KEY: 'el nombre de la captura',
      TIMEOUT: 'segundos que esperar a que cargue la página',
      WIDTH: 'ancho del navegador en píxeles',
      HEIGHT: 'alto del navegador en píxeles',
      WAIT: 'segundos extra que esperar después de cargar',
      DARKMODE: 'pedirle a la página su tema oscuro',
    },
    results: [
      'Una captura de 1280x720 de la web.',
    ],
  },
  qrcode: {
    summary: 'Crea una imagen con un código QR.',
    args: {
      MEDIA_KEY: 'el nombre del código QR',
      WIDTH: 'ancho en píxeles; 512 es una buena opción',
      HEIGHT: 'alto en píxeles; 512 es una buena opción',
      MARGIN: 'borde vacío alrededor del código, normalmente 1',
      TEXT: 'el texto o el enlace que codificar',
    },
    results: [
      'Un código QR de la web que se puede escanear.',
    ],
  },
  wordcloud: {
    summary: 'Crea una nube de palabras a partir de una lista de palabras o mensajes.',
    args: {
      MEDIA_KEY: 'el nombre de la nube de palabras',
      WIDTH: 'ancho en píxeles; 0 usa el valor por defecto',
      HEIGHT: 'alto en píxeles; 0 usa el valor por defecto',
      THEME: 'colores, ' + ONLY_BY_NAME + ': `FIRE`, `FOREST`, `IMAGE` (los colores de la máscara; el valor por defecto si hay una), `MONO`, `NEON`, `OCEAN`, `PASTEL`, `RAINBOW` o `SUNSET`',
      SHAPE: ONLY_BY_NAME + ': `CIRCLE`, `CLOUD`, `HEART`, `RECTANGLE` o `STAR`',
      BACKGROUND: ONLY_BY_NAME + ': un código hexadecimal, `r,g,b(,a)`, un nombre de color o `transparent`',
      MASK: ONLY_BY_NAME + ': una imagen que rellenan las palabras (sus partes blancas o transparentes se quedan vacías) y de la que toman los colores',
      SEED: ONLY_BY_NAME + ': la misma semilla con las mismas palabras da la misma nube',
      WORDS: 'las palabras o mensajes, cada línea por separado (envuélvelo en `{jsonify:}`)',
    },
    results: [
      'Una nube de palabras donde "cake" es la palabra más grande.',
      'Las palabras que des, en forma de corazón con colores de atardecer sobre blanco.',
      'Las palabras rellenando tu avatar, con sus colores.',
    ],
    notes: [
      'El tamaño se mantiene entre 512 y 2048 píxeles; con una forma es 1024x1024 por defecto, y con una máscara se ajusta para que la máscara quepa.',
      'Las palabras comunes (como "the", "lol") se omiten, y dos palabras que aparecen juntas una y otra vez se convierten en una.',
    ],
  },
  song: {
    summary: 'Crea una canción a partir de acordes, con bajo y batería.',
    args: {
      MEDIA_KEY: 'el nombre con el que guardar la canción',
      BPM: 'pulsaciones por minuto',
      BARS: 'cuántos compases, un acorde por compás. none toca los acordes dos veces',
      SOUND: 'con qué se tocan los acordes',
      DRUMS: 'tocar la batería',
      CHORDS: 'nombres de acordes como `C Am F G7 F#m7 Bbsus4`, o notas como `C4,E4,G4`',
    },
    results: [
      'Cuatro acordes en un pad a 90 bpm, dos veces.',
    ],
    notes: ['Las opciones van solo por nombre; los acordes se quedan con todo lo demás. Las canciones pueden durar como mucho 60 segundos.'],
  },
  tts: {
    summary: 'Genera un clip de audio de texto a voz.',
    args: {
      MEDIA_KEY: 'el nombre del audio',
      VOICE: 'una de las voces de la tabla de voces de texto a voz, o el nombre o ID de una de tus voces clonadas',
      TEXT: 'lo que decir, envuelto en `{jsonify:}`',
    },
    results: [
      'Un MP3 de Ghostface haciendo la pregunta.',
      'Mezcla tu voz por defecto leyendo los argumentos sobre el último vídeo.',
    ],
    notes: [
      'El texto de más de 4096 caracteres se corta. Mira la sección de Klattsch para la voz de fonemas `KLATTSCH`.',
      'Con NotSoPremium puedes usar tus propias voces clonadas (de `tts voice create` o `/tts voice create`): `VOICE="my voice"` por nombre (sin importar mayúsculas) o ID, o `VOICE=CLONED` para la más reciente. Siempre son las voces de quien ejecuta el script, y una voz integrada tiene prioridad sobre una voz clonada con el mismo nombre.',
      'Sin `VOICE`, usa la voz de TTS por defecto de quien ejecuta el script (`/settings set tts-voice`, o la sección de texto a voz de los ajustes de tu panel), o `TIKTOK_EN_US_FEMALE_01` si no ha elegido ninguna. Una voz clonada por defecto necesita NotSoPremium; sin él se usa la alternativa.',
    ],
  },
  createaudionoise: {
    summary: 'Crea un clip MP3 de ruido puro, como estática o lluvia.',
    args: {
      MEDIA_KEY: 'el nombre del nuevo audio',
      DURATION: 'duración en segundos',
      COLOR: 'el tipo de ruido; `brown` y `pink` son más graves, `blue` y `violet` sisean más',
      AMPLITUDE: 'volumen',
      SAMPLE_RATE: 'muestras por segundo',
    },
    results: [
      '30 segundos de ruido marrón suave.',
    ],
  },
  einstein: {
    summary: 'Hace que Einstein escriba un texto en una pizarra.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'hasta 15 caracteres',
    },
  },
  foggywindow: {
    summary: 'Escribe un texto en una ventana empañada.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'hasta 20 caracteres',
      BACKGROUND: 'qué ventana; solo por nombre, porque el texto se queda con el resto de la línea',
    },
  },
  hacker: {
    summary: 'Pone un texto en la pantalla de un hacker.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'hasta 1000 caracteres',
      TEMPLATE: 'qué hacker; solo por nombre',
    },
  },
  neon: {
    summary: 'Escribe un texto como un cartel de neón.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'una o dos líneas (`line 1 | line 2`), de hasta 20 caracteres cada una',
    },
    results: [
      'Un cartel de neón que pone "open" encima de "24/7".',
    ],
  },
  presidential: {
    summary: 'Crea una alerta presidencial de iPhone con el texto.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'hasta 250 caracteres',
      TIME: 'la hora que se muestra, como `12:00`; solo por nombre. none es la hora UTC actual',
      DATE: 'la fecha que se muestra; solo por nombre. none es hoy (UTC)',
    },
  },
  realfact: {
    summary: 'Pone un texto en un tapón de Snapple "Real Fact".',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'hasta 200 caracteres',
    },
  },
  retrowave: {
    summary: 'Crea una imagen de título retrowave de los 80.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'hasta tres líneas, `top | middle | bottom`',
      BACKGROUND: ONLY_BY_NAME,
      TEXT_STYLE: 'cómo se dibuja la línea del medio; solo por nombre',
    },
  },
  snowwriting: {
    summary: 'Escribe un texto en la nieve.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'una o dos líneas (`line 1 | line 2`), de hasta 15 caracteres cada una',
    },
  },
  sonic: {
    summary: 'Hace que Sonic diga el texto.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'hasta 200 caracteres',
    },
  },
  soup: {
    summary: 'Escribe el texto con sopa de letras.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'hasta 14 caracteres',
    },
  },
  thonkify: {
    summary: 'Escribe el texto con la fuente del emoji pensativo.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'hasta 70 caracteres',
    },
  },
  tombstone: {
    summary: 'Escribe un texto en una lápida.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'hasta cinco líneas, separadas por `|`',
    },
  },
  treecarving: {
    summary: 'Talla un texto en un árbol.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'una o dos líneas (`line 1 | line 2`), de hasta 15 y 12 caracteres',
    },
  },
  woodensign: {
    summary: 'Talla un texto en un cartel de madera.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'hasta 25 caracteres',
    },
  },
  yacht: {
    summary: 'Escribe un texto en el costado de un yate.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'hasta 25 caracteres',
    },
  },
};
