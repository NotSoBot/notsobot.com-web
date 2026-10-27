// MediaScript commands in Spanish (combine & mask), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


const ONLY_MEDIA = {MEDIA_KEY: MEDIA};
const TOP = 'la multimedia que poner encima';
const LEFT = 'posición izquierda de la multimedia de encima';
const UP = 'posición superior de la multimedia de encima';
const LOOP_SHORTER = 'repetir en bucle la multimedia más corta para que dure lo mismo que la más larga';
const OPACITY_TOP = 'opacidad de la multimedia de encima';
const FIRST_CHANGED = 'la primera multimedia (se cambia)';
const SIMILAR = 'lo parecido que tiene que ser un color para quitarlo';
const EDGES = 'lo suave que es la mezcla de los bordes';
const CONVERT = 'un mimetype de imagen o vídeo al que convertir';
const VIDEO_BLACK = 'El vídeo no puede ser transparente, así que en un vídeo las zonas quitadas se vuelven negras.';
const AI_FACES = 'Usa IA y cuenta para las 20 peticiones de IA que puede hacer un script (compartidas con `edit` e `imagine`).';
const STILL_RESULT = 'El resultado es una imagen fija: un gif o un vídeo da su primer fotograma.';
const HAT = 'Se coloca encima de la cabeza (el pelo voluminoso lo sube) y gira con ella. Las cabezas en las que no se encuentra una cara, como el anime, los dibujos o la parte de atrás de una cabeza, también reciben uno, y en GIFs y vídeos sigue a cada cara.';
const BIGGEST_FACES = 'cuántas de las caras más grandes sustituir';


export const MEDIASCRIPT_SPANISH_5: TagDocsTranslation['mediaScriptCommands'] = {
  overlay: {
    summary: 'Coloca una multimedia encima de otra en una posición.',
    args: {
      MEDIA_KEY: 'la multimedia de fondo (se cambia)',
      MEDIA_KEY_2: TOP,
      X: LEFT,
      Y: UP,
      COLOR: 'un color que quitar de la multimedia de encima (como un croma)',
      SIMILARITY: SIMILAR,
      BLEND: 'lo suave que es la mezcla de los bordes quitados',
      LOOP: LOOP_SHORTER,
      OPACITY: OPACITY_TOP,
    },
    results: [
      'Pone el avatar en el centro de la imagen.',
      'Superpone un vídeo con croma verde, quitando el verde.',
    ],
  },
  blend: {
    summary: 'Coloca una multimedia encima de otra con un modo de fusión, como los modos de fusión de capas de los editores de imágenes.',
    args: {
      MEDIA_KEY: 'la multimedia de abajo (se cambia)',
      MEDIA_KEY_2: TOP,
      MODE: 'cómo se mezcla la multimedia de encima con la de abajo (`normal` es lo mismo que `overlay`)',
      X: LEFT,
      Y: UP,
      LOOP: LOOP_SHORTER,
      OPACITY: OPACITY_TOP,
    },
    results: [
      'Oscurece la imagen con un degradado estirado por encima.',
      'Aplica el avatar en modo screen sobre la esquina superior izquierda de un vídeo, al 60% de opacidad.',
    ],
    notes: ['La multimedia de encima no se redimensiona; usa antes `resize` para que cubra toda la de abajo. Las partes transparentes de la multimedia de encima quedan fuera de la fusión.'],
  },
  watermark: {
    summary: 'Coloca una copia pequeña y semitransparente de una multimedia en la esquina inferior derecha de otra.',
    args: {
      MEDIA_KEY: 'la multimedia a la que poner la marca de agua',
      MEDIA_KEY_2: 'la marca de agua',
      SIZE: 'tamaño de la marca de agua como porcentaje de MEDIA_KEY',
      OPACITY: 'opacidad de la marca de agua',
      MARGIN: 'separación de la esquina como porcentaje de MEDIA_KEY',
    },
  },
  overlayface: {
    summary: 'Detecta caras y pega multimedia encima de la cara, los ojos o la boca.',
    args: {
      MEDIA_KEY: 'la multimedia que tiene las caras',
      FACE_MEDIA: 'clave de multimedia con la que tapar cada cara',
      LEFT_EYE_MEDIA: 'clave de multimedia para los ojos izquierdos',
      RIGHT_EYE_MEDIA: 'clave de multimedia para los ojos derechos',
      MOUTH_MEDIA: 'clave de multimedia para las bocas',
      FACE_SCALE: 'tamaño de lo que se pega sobre la cara comparado con la cara',
      EYE_SCALE: 'tamaño de lo que se pega sobre los ojos',
    },
  },
  join: {
    summary: 'Pone dos multimedia una al lado de la otra, o una encima de la otra.',
    args: {
      MEDIA_KEY: FIRST_CHANGED,
      MEDIA_KEY_2: 'la multimedia que añadir',
      VERTICAL: 'apilarlas de arriba abajo en lugar de izquierda a derecha',
      LOOP: LOOP_SHORTER,
      NORESIZE: 'no redimensionarlas para que coincidan',
    },
  },
  concat: {
    summary: 'Reproduce una multimedia detrás de otra.',
    args: {
      MEDIA_KEY: FIRST_CHANGED,
      MEDIA_KEY_2: 'la multimedia que añadir al final',
    },
  },
  concatmultiple: {
    summary: 'Reproduce varias multimedia una detrás de otra. Mucho más rápido que encadenar `concat`.',
    args: {
      MEDIA_KEY: FIRST_CHANGED,
      MEDIA_KEY_2: 'la siguiente multimedia',
      MEDIA_KEY_3: 'cualquier número de claves de multimedia más',
    },
  },
  interpolate: {
    summary: 'Alterna entre dos vídeos cada pocos instantes, intercalando trozos de cada uno.',
    args: {
      MEDIA_KEY: 'el primer vídeo (se cambia)',
      MEDIA_KEY_2: 'el vídeo que intercalar',
      SEGMENT: 'duración de cada trozo en segundos',
      LOOP: 'repetir el más corto para que los dos duren todo el tiempo',
    },
    results: [
      'Alterna entre el vídeo y una copia invertida de él cada medio segundo.',
    ],
    notes: [
      'MEDIA_KEY_2 se redimensiona para encajar con MEDIA_KEY.',
      'Pensado para dos vídeos; no se admiten imágenes ni clips solo de audio.',
    ],
  },
  croptransparency: {
    summary: 'Usa una multimedia como máscara de transparencia para otra.',
    args: {
      MEDIA_KEY: MEDIA,
      MEDIA_KEY_2: 'la máscara',
    },
  },
  chromakey: {
    summary: 'Quita un color, como un croma.',
    args: {
      MEDIA_KEY: MEDIA,
      COLOR: 'el color que quitar (`mostused` funciona)',
      SIMILARITY: SIMILAR,
      BLEND: EDGES,
      CONVERT: CONVERT,
    },
    notes: [VIDEO_BLACK],
  },
  colorremove: {
    summary: 'Quita el color más usado (normalmente el fondo), como el comando de quitar color.',
    args: {
      MEDIA_KEY: MEDIA,
      COLOR: 'el color que quitar',
      SIMILARITY: SIMILAR,
      BLEND: EDGES,
      CONVERT: CONVERT,
    },
    notes: ['`chromakey` con otros valores por defecto. ' + VIDEO_BLACK],
  },
  backgroundremove: {
    summary: 'Quita el fondo con IA, dejando el sujeto sobre transparencia.',
    args: {
      MEDIA_KEY: MEDIA,
      MODEL: 'qué modelo usar, p. ej. `ISNET_ANIME` para dibujos o `BIREFNET_PORTRAIT` para personas',
    },
    notes: [
      'En GIFs y vídeos, los fotogramas repetidos solo cuentan una vez. Los modelos `BIREFNET_` y `BRIA_RMBG` admiten un fotograma (imágenes fijas), `ISNET_ANIME`, `ISNET_GENERAL_USE` y `U2NET_CLOTH_SEG` hasta 128 fotogramas distintos, y el resto cualquier cantidad dentro del límite habitual de fotogramas.',
    ],
  },
  overlaypreset: {
    summary: 'Aplica una de las plantillas de superposición del bot, como `wasted` o una bandera.',
    args: {
      MEDIA_KEY: MEDIA,
      NAME: 'la plantilla; los guiones, los guiones bajos y las mayúsculas dan igual (`flagusa` funciona)',
    },
    results: [
      'La pantalla de "wasted" del GTA sobre la imagen.',
    ],
  },
  flies: {
    summary: 'Añade moscas volando alrededor de la multimedia.',
    args: {
      MEDIA_KEY: MEDIA,
      DEGREES: 'girar la imagen de la mosca; none es el ángulo propio de la mosca',
      FLY_MEDIA: 'clave de multimedia que usar como mosca en lugar de la de por defecto',
    },
    notes: ['Una imagen fija se convierte en un GIF animado.'],
  },
  rtx: {
    summary: 'Pone dos multimedia una al lado de la otra con las insignias RTX OFF y RTX ON.',
    args: {
      MEDIA_KEY: 'el lado "off"; el resultado va aquí',
      MEDIA_KEY_2: 'el lado "on"',
    },
  },
  achievement: {
    summary: 'Pone sobre la multimedia una ventana de "Logro desbloqueado" al estilo Xbox.',
    args: {
      MEDIA_KEY: MEDIA,
      GAMERSCORE: 'la puntuación que se muestra en la ventana',
      TEXT: 'el logro, de hasta 100 caracteres',
    },
    results: [
      'La última imagen o vídeo con una ventana de logro "touched grass" de 50G.',
    ],
  },
  snapchat: {
    summary: 'Pone sobre la multimedia un subtítulo al estilo Snapchat: texto blanco sobre una barra negra semitransparente que ocupa todo el ancho.',
    args: {
      MEDIA_KEY: MEDIA,
      POSITION: 'dónde va el centro de la barra; 0 es arriba y 100 abajo',
      TEXT: 'el subtítulo, de hasta 200 caracteres',
    },
    results: [
      'La última imagen o vídeo con un subtítulo de Snapchat "me at 3am" en su parte baja.',
    ],
  },
  tiktok: {
    summary: 'Pone sobre la multimedia texto al estilo TikTok, cada línea en su propio recuadro redondeado.',
    args: {
      MEDIA_KEY: MEDIA,
      POSITION: 'dónde va el centro del texto; 0 es arriba y 100 abajo',
      DARK: 'recuadros negros con texto blanco en lugar de recuadros blancos con texto negro',
      TEXT: 'el texto, de hasta 200 caracteres',
    },
    results: [
      'La última imagen o vídeo con texto de TikTok en su parte alta.',
    ],
  },
  subtitle: {
    summary: 'Pone subtítulos de película a lo largo de la parte de abajo de la multimedia, en blanco con contorno negro.',
    args: {
      MEDIA_KEY: MEDIA,
      YELLOW: 'subtítulos amarillos al estilo DVD en lugar de blancos',
      TEXT: 'los subtítulos, de hasta 200 caracteres',
    },
  },
  news: {
    summary: 'Pone sobre la multimedia un rótulo de informativo de televisión: una pestaña roja encima de una barra blanca con el titular, y un rótulo de noticias debajo opcional.',
    args: {
      MEDIA_KEY: MEDIA,
      LABEL: 'la pestaña roja, de hasta 30 caracteres',
      TEXT: '`headline | ticker`, el titular de hasta 150 caracteres; el rótulo de después del `|` es opcional',
    },
    results: [
      'La última imagen o vídeo con un titular de noticias LIVE y un rótulo de noticias.',
    ],
  },
  notification: {
    summary: 'Pone un banner de notificación de Mensajes de iPhone a lo largo de la parte de arriba de la multimedia.',
    args: {
      MEDIA_KEY: MEDIA,
      TEXT: '`title | message`, o solo el mensaje bajo el título "Messages"',
    },
  },
  youtube: {
    summary: 'Convierte la multimedia en una página de vídeo de YouTube con título, canal y visitas inventadas.',
    args: {
      MEDIA_KEY: MEDIA,
      CHANNEL: 'el nombre del canal, de hasta 50 caracteres',
      TEXT: 'el título del vídeo, de hasta 100 caracteres',
    },
  },
  demotivate: {
    summary: 'Convierte la multimedia en un póster desmotivador: enmarcada sobre negro con un gran título con serifa y una línea debajo.',
    args: {
      MEDIA_KEY: MEDIA,
      TEXT: '`title | line`; la línea de después del `|` es opcional',
    },
    results: [
      'La última imagen o vídeo como póster desmotivador de TEAMWORK.',
    ],
  },
  watchmojo: {
    summary: 'Convierte la multimedia en una miniatura de vídeo de WatchMojo.',
    args: {
      MEDIA_KEY: MEDIA,
      TEXT: 'el título del vídeo, de hasta 100 caracteres',
    },
  },
  eyes: {
    summary: 'Pone ojos nuevos sobre cada ojo detectado.',
    args: {
      MEDIA_KEY: MEDIA,
      FLIPPED: 'reflejar la imagen del ojo',
    },
  },
  drawfaces: {
    summary: 'Pone un óvalo translúcido numerado sobre cada cara encontrada.',
    args: ONLY_MEDIA,
    notes: ['Útil para ver qué caras van a encontrar los efectos de caras.'],
  },
  facehalloweenhat: {
    summary: 'Pone un sombrero de Halloween encima de cada cabeza.',
    args: ONLY_MEDIA,
    notes: [HAT],
  },
  facexmascap: {
    summary: 'Pone un gorro de Papá Noel encima de cada cabeza.',
    args: ONLY_MEDIA,
    notes: [HAT],
  },
  facejoy: {
    summary: 'Pone un emoji 😂 sobre cada cara.',
    args: ONLY_MEDIA,
  },
  faceknight: {
    summary: 'Pone la cara más grande en un caballero con una espada.',
    args: ONLY_MEDIA,
  },
  facelenin: {
    summary: 'Pone las caras en una foto antigua en sepia con Lenin.',
    args: ONLY_MEDIA,
  },
  facemonalisa: {
    summary: 'Pone la cara más grande sobre la Mona Lisa.',
    args: ONLY_MEDIA,
  },
  facemountrushmore: {
    summary: 'Talla la cara más grande en el monte Rushmore.',
    args: ONLY_MEDIA,
  },
  faceswap: {
    summary: 'Pone la cara de otra multimedia sobre las caras de la multimedia.',
    args: {
      MEDIA_KEY: 'la multimedia cuyas caras se sustituyen (su primer fotograma)',
      FACE_MEDIA_KEY: 'la multimedia con la cara que usar (su primer fotograma)',
      MAX_FACES: BIGGEST_FACES,
    },
    notes: [
      STILL_RESULT,
      AI_FACES,
    ],
  },
  faceswappreset: {
    summary: 'Pone una de las caras del bot sobre las caras de la multimedia.',
    args: {
      MEDIA_KEY: MEDIA,
      NAME: 'la cara de quién',
      MAX_FACES: BIGGEST_FACES,
    },
    notes: [AI_FACES],
  },
  facefeaturesswap: {
    summary: 'Mantiene la cara pero le pone la pose de la cara de otra multimedia.',
    args: {
      MEDIA_KEY: 'la multimedia cuya cara se cambia de pose (su primer fotograma)',
      DRIVING_MEDIA_KEY: 'la multimedia con la pose y la expresión que copiar (su primer fotograma)',
      REGIONS: 'qué partes copiar',
      MODE: '`RELATIVE` suma la expresión de la cara de referencia a la propia de la cara, `ABSOLUTE` la copia tal cual',
      MULTIPLIER: 'con cuánta fuerza',
    },
    notes: [
      STILL_RESULT,
      AI_FACES,
    ],
  },
  facemood: {
    summary: 'Da un estado de ánimo a las caras de la multimedia.',
    args: {
      MEDIA_KEY: MEDIA,
      MAX_FACES: 'cuántas de las caras más grandes cambiar',
    },
    notes: [AI_FACES],
  },
  bill: {
    summary: 'Graba la multimedia en un billete de 100 dólares.',
    args: ONLY_MEDIA,
  },
  burn: {
    summary: 'Dibuja la multimedia en una foto que se quema.',
    args: {
      MEDIA_KEY: MEDIA,
      ANIMATED: 'false da una imagen fija',
    },
  },
  instantcamera: {
    summary: 'Convierte la multimedia en una foto de cámara instantánea con un pie escrito a mano.',
    args: {
      MEDIA_KEY: MEDIA,
      TEXT: 'pie de foto opcional, de hasta 40 caracteres',
    },
  },
  latte: {
    summary: 'Dibuja la multimedia en un café con leche.',
    args: ONLY_MEDIA,
  },
  museum: {
    summary: 'Cuelga la multimedia en un marco de museo.',
    args: ONLY_MEDIA,
  },
  oldtv: {
    summary: 'Muestra la multimedia en una tele antigua.',
    args: {
      MEDIA_KEY: MEDIA,
      ANIMATED: 'false da una imagen fija más grande',
    },
  },
  spheres: {
    summary: 'Pinta la multimedia como la Galatea de las esferas de Dalí.',
    args: ONLY_MEDIA,
  },
  timesquare: {
    summary: 'Pone la multimedia en una valla publicitaria de Times Square.',
    args: ONLY_MEDIA,
  },
  universe: {
    summary: 'Funde la multimedia con el espacio exterior.',
    args: {
      MEDIA_KEY: MEDIA,
      SPACE: 'qué fondo espacial',
    },
  },
  adhd: {
    summary: 'Apila debajo de la multimedia imágenes de gameplay al azar.',
    args: {
      MEDIA_KEY: MEDIA,
      HORIZONTAL: 'poner el gameplay al lado de la multimedia en su lugar',
    },
    notes: ['También funciona con audio. El resultado siempre es un vídeo.'],
  },
};
