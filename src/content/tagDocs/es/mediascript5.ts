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
      RESIZE: '`fit`, `contain`, `cover` o `force` con un tamaño, como `fit(mw,mh)` (cabe dentro de la multimedia) o `cover(256,256)`; `none` mantiene su propio tamaño',
      FADE: 'hace aparecer la multimedia de encima, de invisible hasta su opacidad',
      FADE_START: 'segundos en los que empieza la aparición',
      FADE_DURATION: 'segundos que dura la aparición; 0 es hasta el final',
      POSITION: 'un sitio de la cuadrícula: `topleft`, `top`, `topright`, `left`, `center`, `right`, `bottomleft`, `bottom`, `bottomright`, o una celda como `3x3:2` (`COLUMNASxFILAS:CELDA`, contadas desde 1 de izquierda a derecha y luego hacia abajo). Encoge la multimedia de encima para que quepa en esa celda (nunca la agranda) y la centra ahí; un `X`, `Y` o `RESIZE` que pongas sigue mandando',
    },
    results: [
      'Pone el avatar en el centro de la imagen.',
      'Ajusta el avatar dentro de la imagen, lo centra y lo hace aparecer (lo que hace el comando overlay).',
      'Superpone un vídeo con croma verde, quitando el verde.',
      'Pone el avatar en el noveno de abajo a la derecha de la imagen, encogido para que quepa si es más grande.',
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
      'Oscurece y tiñe la imagen con un degradado de atardecer estirado por encima.',
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
      'En GIFs y vídeos, los fotogramas repetidos solo cuentan una vez. Los modelos `BIREFNET_` admiten un fotograma (imágenes fijas), `ISNET_ANIME`, `ISNET_GENERAL_USE` y `U2NET_CLOTH_SEG` hasta 128 fotogramas distintos, y el resto cualquier cantidad dentro del límite habitual de fotogramas.',
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
  autosubtitle: {
    summary: 'Subtitula lo que se dice en la multimedia, encontrado con reconocimiento de voz y grabado como `subtitle`.',
    args: {
      MEDIA_KEY: 'un audio o vídeo con voz',
      HIGHLIGHT: 'mostrar unas pocas palabras a la vez con la que se está diciendo en el otro color',
      YELLOW: 'subtítulos amarillos al estilo DVD en lugar de blancos',
      FONT: 'el nombre de una fuente incluida o una clave de `loadfont`',
      TRANSLATE: 'un código de idioma (como `es`, `ja` o `zh-CN`) al que traducir los subtítulos; `HIGHLIGHT` se ignora entonces, una traducción no tiene tiempos por palabra. Si ya se habla en ese idioma se deja tal cual',
    },
    results: [
      'El clip con subtítulos de lo que se dice en él.',
      'Un vídeo negro con el audio, sus palabras resaltadas en Impact a medida que se dicen.',
      'El clip con subtítulos en español de lo que se dice en él, sea cual sea su idioma.',
    ],
    notes: [
      'Un audio recibe un vídeo negro de 1280x720. Solo se escuchan los primeros 15 minutos. El resultado es un mp4. Cuenta para el límite de `ffmpeg`.',
      'El mismo efecto es el comando `.autosubtitle` (`/media-av-tools auto-subtitle`), que también acepta tus fuentes guardadas. `.autosubtitletranslate` (`/media-av-tools auto-subtitle-translate`) es la versión con `TRANSLATE`, en tu idioma salvo que elijas otro.',
    ],
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
    notes: [
      'Los tipos LASER_ disparan rayos desde los ojos hacia donde mira la cabeza, y los LIGHTNING_ hacen brillar los ojos con rayos saliendo de ellos (FLIPPED no hace nada en ninguno de los dos).',
    ],
  },
  abovehead: {
    summary: 'Pone una imagen sobre las cabezas de la gente, todas o las que elijas.',
    args: {
      MEDIA_KEY: MEDIA,
      IMAGE_MEDIA_KEY: 'lo que flota sobre las cabezas (su primer fotograma)',
      FACES: 'los números que `drawfaces` pone en las caras cuyas cabezas la llevan, separados por comas, como `1,0` (todas las cabezas si no se da)',
      SIZE: 'qué tan grande es la imagen, en cabezas',
    },
    results: [
      'Tu avatar sobre la cabeza de todos.',
      'Solo la cara 1 (de `drawfaces`) recibe tu avatar, un poco más grande.',
    ],
    notes: [
      'Úsalo otra vez con otra imagen y otras caras para darle imágenes distintas a cada persona.',
      'Cuando una cabeza está muy cerca del borde de arriba la multimedia crece hacia arriba para que quepa la imagen, y en GIFs y videos sigue a cada cabeza.',
    ],
  },
  facecutout: {
    summary: 'Recorta los ojos y la boca de la cara más grande y los vuelve a pegar más grandes, como un objeto que habla.',
    args: {
      MEDIA_KEY: MEDIA,
      COVER_MEDIA_KEY: 'una multimedia (su primer fotograma) que tapa la cara, debajo de los ojos y la boca',
      COLOR: 'sin multimedia de portada, una mancha de este color tapa la cara',
      SIZE: 'cuánto más grandes se hacen los ojos y la boca',
      FACE: 'el número que `drawfaces` pone en una cara, para usar esa cara y seguirla por los fotogramas en vez de la más grande en cada fotograma',
    },
    results: [
      'Tu avatar tapa la cara del vídeo, con los propios ojos y boca de la cara hablando encima.',
      'Una mancha azul con ojos grandes y una boca grande.',
    ],
    notes: [
      'Sin portada ni color, los ojos y la boca más grandes van sobre la propia cara.',
      'Los ojos y la boca siguen la cara por los fotogramas de un vídeo, así que sigue hablando y parpadeando.',
    ],
  },
  wrap: {
    summary: 'Pone una segunda multimedia sobre la superficie de la multimedia, curvada según su forma e iluminada como si estuviera impresa ahí.',
    args: {
      MEDIA_KEY: MEDIA,
      OVERLAY_MEDIA_KEY: 'lo que va sobre la superficie, funciona mejor con texto o un PNG transparente, un GIF o un video se reproduce sobre ella',
      X: 'dónde va su centro a lo ancho, 0 es el borde izquierdo',
      Y: 'dónde va su centro a lo alto, 0 es el borde de arriba',
      SIZE: 'su ancho mirando a la cámara, respecto al lado más corto',
      ROTATE: 'grados en el sentido de las agujas del reloj, sobre la superficie',
      RELIEF: 'cuánto sigue la forma de la superficie, 0 es una pegatina plana',
      LIGHT: 'cuánto toma de las sombras y los brillos de la superficie',
      OPACITY: 'cuánto se transparenta',
      CLIP: 'parar en el contorno y los bordes marcados de la superficie, false deja que pase por encima de todo',
    },
    results: [
      'NotSoBot en rojo impreso sobre lo que haya en el centro de la imagen, siguiendo su forma y sus sombras.',
      'Tu avatar sobre la camiseta (o lo que haya ahí), girado 10 grados hacia el otro lado y doblándose más con los pliegues.',
    ],
    notes: [
      'La forma sale de la profundidad estimada de la multimedia: se dobla con los pliegues de la tela, envuelve las cosas curvas y sigue en perspectiva sobre una pared en ángulo. Una superficie que se aleja la recibe más grande, así que cubre más o menos la misma área.',
      'Se detiene donde termina la superficie: el contorno de un objeto, el borde de una caja, el suelo debajo de algo.',
      'La superficie siempre es una imagen fija: el primer fotograma de un GIF, o un fotograma de un video.',
      'Una superposición animada (un GIF o un video) se reproduce sobre la superficie, el resultado es un GIF con sus fotogramas.',
    ],
  },
  depthmap: {
    summary: 'Reemplaza la multimedia por su profundidad estimada como imagen: lo cercano es claro y lo lejano oscuro.',
    args: {
      MEDIA_KEY: MEDIA,
      COLORMAP: 'GRAY, INFERNO, MAGMA, PLASMA, TURBO o VIRIDIS, lo cercano es el extremo cálido',
      INVERT: 'lo lejano claro en vez de lo cercano',
    },
    results: [
      'La imagen como un mapa de profundidad arcoíris, rojo cerca y azul lejos.',
    ],
    notes: [
      'Los GIF y los videos obtienen la profundidad de cada fotograma, coherente entre fotogramas.',
    ],
  },
  depthblur: {
    summary: 'Modo retrato: desenfoca lo que está delante y detrás del foco según la profundidad estimada de la multimedia.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'el desenfoque máximo, en porcentaje del lado más corto',
      RANGE: 'cuánta profundidad alrededor del foco queda nítida',
      X: 'un punto en el que enfocar a lo ancho, el sujeto del centro si se omite',
      Y: 'un punto en el que enfocar a lo alto',
      MINIATURE: 'tilt-shift: foco en el centro, una franja nítida más fina, más desenfoque y colores más intensos',
    },
    results: [
      'El sujeto queda nítido y el fondo se difumina, con los puntos brillantes floreciendo.',
      'La escena parece una maqueta diminuta.',
    ],
    notes: [
      'El desenfoque se hace en luz lineal, así que los puntos brillantes florecen como reflejos desenfocados reales, y el sujeto nítido no se mancha sobre el fondo.',
      'En un video el foco sigue los fotogramas con suavidad.',
    ],
  },
  parallax: {
    summary: 'Una foto 3D: la cámara se mueve un poco para que lo que está delante y detrás del foco se deslice entre sí.',
    args: {
      MEDIA_KEY: MEDIA,
      MOTION: 'CIRCLE da vueltas, SWAY va de lado a lado, ZOOM se acerca y vuelve',
      AMOUNT: 'cuánto se mueven las cosas más cercanas, en porcentaje del lado más corto',
      DURATION: 'segundos que dura un ciclo',
      X: 'el punto que no se mueve a lo ancho, el sujeto si se omite',
      Y: 'el punto que no se mueve a lo alto',
    },
    results: [
      'Un GIF en bucle de la imagen con la cámara girando alrededor del sujeto.',
      'La cámara se acerca y vuelve, y lo cercano crece más rápido que lo lejano.',
    ],
    notes: [
      'Las imágenes fijas se convierten en un GIF en bucle (512px como máximo), los GIF y los videos recorren el ciclo mientras se reproducen.',
      'El encuadre se amplía un poco para que no se vean los bordes que mostraría una cámara en movimiento.',
    ],
  },
  stereo: {
    summary: '3D estéreo a partir de la profundidad estimada de la multimedia: anaglifo, lado a lado, ojos cruzados, wigglegram u ojo mágico.',
    args: {
      MEDIA_KEY: MEDIA,
      TYPE: 'ANAGLYPH (gafas rojo/cian), SIDEBYSIDE (visión paralela, visores VR de móvil), CROSSEYE (cruzando los ojos), WIGGLE (un wigglegram) o MAGICEYE (un autoestereograma de puntos)',
      AMOUNT: 'cuánto 3D tiene, en porcentaje del ancho',
      X: 'el punto que queda en la pantalla a lo ancho, el sujeto si se omite',
      Y: 'el punto que queda en la pantalla a lo alto',
    },
    results: [
      'Un anaglifo rojo/cian que sale de la pantalla con gafas 3D.',
      'Una imagen de ojo mágico que esconde la forma de la imagen, con sus propios colores.',
    ],
    notes: [
      'SIDEBYSIDE y CROSSEYE salen el doble de anchos, WIGGLE convierte una imagen fija en un GIF en bucle.',
      'Lo que está más cerca que el foco sale de la pantalla y lo que está más lejos se hunde.',
    ],
  },
  drawfaces: {
    summary: 'Pone un óvalo translúcido numerado sobre cada cara encontrada.',
    args: ONLY_MEDIA,
    notes: ['Útil para ver qué caras van a encontrar los efectos de caras.'],
  },
  drawobjects: {
    summary: 'Dibuja un recuadro con nombre alrededor de cada objeto encontrado.',
    args: ONLY_MEDIA,
    notes: [
      'Cada etiqueta es el nombre del objeto y qué tan seguro está el detector, los mismos objetos a los que recorta `cropauto`. El mismo tipo de objeto siempre tiene el mismo color.',
      'En las animaciones se mira cada pocos fotogramas, los fotogramas intermedios mantienen los recuadros del último.',
    ],
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
