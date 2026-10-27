// MediaScript commands in Spanish (color, plus `hidden`), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


const ONLY_MEDIA = {MEDIA_KEY: MEDIA};
const HUE_DEGREES = 'grados que girar el tono';


export const MEDIASCRIPT_SPANISH_6: TagDocsTranslation['mediaScriptCommands'] = {
  brightness: {
    summary: 'Hace la multimedia más brillante (o más oscura con números negativos).',
    args: ONLY_MEDIA,
  },
  darken: {
    summary: 'Hace la multimedia más oscura (o más brillante con números negativos).',
    args: ONLY_MEDIA,
  },
  contrast: {
    summary: 'Sube o baja el contraste.',
    args: ONLY_MEDIA,
  },
  contrastmultiply: {
    summary: 'Multiplica el contraste de brillo, manteniendo los colores. 1 lo deja igual, 0 es un gris plano y los negativos invierten el brillo.',
    args: ONLY_MEDIA,
  },
  grayscale: {
    summary: 'Quita todo el color.',
    args: ONLY_MEDIA,
  },
  hidden: {
    summary: 'Esconde la multimedia en un tablero de ajedrez; solo se ve de lejos o alejando el zoom.',
    args: {
      MEDIA_KEY: MEDIA,
      SHARE: 'cuánta multimedia se mezcla',
      SIZE: 'el tamaño de las casillas en píxeles; none elige uno según el tamaño de la multimedia',
    },
  },
  sepia: {
    summary: 'Da a la multimedia un tono marrón de foto antigua.',
    args: ONLY_MEDIA,
  },
  invert: {
    summary: 'Invierte todos los colores, como el negativo de una foto.',
    args: ONLY_MEDIA,
  },
  invertlab: {
    summary: 'Invierte canales CIELAB: intercambia claros y oscuros manteniendo los colores, o intercambia verde/rojo y azul/amarillo.',
    args: {
      MEDIA_KEY: MEDIA,
      LIGHTNESS: '1 intercambia claros y oscuros, manteniendo los colores',
      A: '1 intercambia verde y rojo',
      B: '1 intercambia azul y amarillo',
    },
  },
  invertrgba: {
    summary: 'Invierte solo los canales de color que elijas.',
    args: {
      MEDIA_KEY: MEDIA,
      RED: '1 invierte, 0 lo deja como está',
    },
  },
  opacity: {
    summary: 'Hace la multimedia transparente.',
    args: {
      MEDIA_KEY: MEDIA,
      PERCENTAGE: '100 es totalmente visible, 0 es invisible',
    },
  },
  hueshifthsv: {
    summary: 'Cambia el tono, la saturación y el brillo en HSV.',
    args: {
      MEDIA_KEY: MEDIA,
      HUE: HUE_DEGREES,
      SATURATION: 'cambio de saturación en porcentaje',
      BRIGHTNESS: 'cambio de brillo en porcentaje',
    },
    notes: ['Bajar la saturación lleva los colores hacia el blanco (el gris de su canal más brillante); subir el brillo los mantiene con color. Mira `hueshifthsl` para la versión HSL.'],
  },
  hueshifthsl: {
    summary: 'Cambia el tono, la saturación y la luminosidad en HSL.',
    args: {
      MEDIA_KEY: MEDIA,
      HUE: HUE_DEGREES,
      SATURATION: 'cambio de saturación en porcentaje',
      LIGHTNESS: 'cambio de luminosidad en porcentaje',
    },
    notes: ['Bajar la saturación lleva los colores hacia el gris; subir la luminosidad los mezcla hacia el blanco. Si solo cambias el tono, se ve igual que `hueshifthsv`.'],
  },
  hueshifthsvffmpeg: {
    summary: 'Como `hueshifthsv`, pero hecho con FFmpeg en lugar de ImageMagick (a menudo más rápido en vídeo).',
    args: {
      MEDIA_KEY: MEDIA,
      HUE: HUE_DEGREES,
      SATURATION: 'multiplicador de saturación (1 la deja igual)',
      BRIGHTNESS: 'cambio de brillo',
    },
    notes: ['Aquí la saturación es un multiplicador, así que si la omites se mantiene la saturación original.'],
  },
  applylut: {
    summary: 'Etalona el color de la multimedia con una LUT `.cube` cargada con `loadcube`, opcionalmente mezclada con la original.',
    args: {
      MEDIA_KEY: MEDIA,
      CUBE_KEY: 'el nombre de la LUT en `loadcube`',
      STRENGTH: 'cuánto del aspecto etalonado usar; `0.5` es mitad etalonado y mitad original',
      INTERP: 'cómo se calculan los colores entre los puntos de la LUT',
    },
    results: [
      'Etalona la imagen o el vídeo con el archivo `.cube` adjunto.',
      'Etalona el clip con un 60% de intensidad.',
    ],
    notes: [
      'Es lo mismo que `ffmpeg MEDIA_KEY -vf lut3d=CUBE_KEY.cube`, y cuenta para el mismo límite de ejecuciones de `ffmpeg`. El mismo efecto es el comando `.lut` (`/media-iv-color lut`).',
      'Solo imágenes y vídeo; el audio se queda como está. La transparencia se mantiene.',
    ],
  },
  hueshiftrgb: {
    summary: 'Desplaza los canales rojo, verde y azul.',
    args: {
      MEDIA_KEY: MEDIA,
      RED: 'normalmente -255..255',
    },
  },
  huecurvergba: {
    summary: 'Reasigna un canal de color con una curva, como la herramienta Curvas de los editores de fotos.',
    args: {
      MEDIA_KEY: MEDIA,
      CHANNEL: 'qué canal cambiar',
      TEXT: 'puntos de la curva separados por espacios, como `x,y` o solo `y`, todos entre 0 y 1; `x` tiene que ir en aumento',
    },
    results: [
      'Una curva en forma de V: las sombras y las luces se aclaran, y los medios tonos se oscurecen.',
      'Sube o baja al azar los medios tonos del rojo.',
    ],
  },
  gradientmap: {
    summary: 'Vuelve a colorear la multimedia según el brillo a lo largo de un degradado, como el Gradient Map de VEGAS: las partes más oscuras reciben el primer color y las más brillantes el último.',
    args: {
      MEDIA_KEY: MEDIA,
      STOPS: 'los colores del degradado separados por espacios, cada uno como `COLOR` o `COLOR,POSITION` (posición de 0 a 1); las paradas sin posición se reparten por igual entre las que tienen alrededor',
    },
    results: [
      'Sombras azul marino, naranja a partir del 70% de brillo y luces blancas.',
      'Las sombras siguen oscuras y las zonas claras reciben un tinte rojo a media intensidad.',
    ],
    notes: [
      'Los colores son códigos hexadecimales, nombres de color o `rgb(R,G,B)`/`rgba(R,G,B,A)`. El alfa de un color es cuánto cubre la multimedia, así que una parada semitransparente deja ver la original. Como mucho 32 paradas.',
      'Una parada nunca se coloca antes de la anterior, como en los degradados de CSS.',
    ],
  },
  swaprgba: {
    summary: 'Reordena los canales rojo, verde, azul y alfa.',
    args: {
      MEDIA_KEY: MEDIA,
      CHANNELS: '3 o 4 letras de entre `r`, `g`, `b`, `a`, `0` (canal vacío) y `1` (canal lleno), p. ej. `bgra`',
    },
  },
  blurple: {
    summary: 'Tiñe la multimedia del blurple de Discord.',
    args: ONLY_MEDIA,
  },
  gold: {
    summary: 'Da a la multimedia un tinte dorado.',
    args: ONLY_MEDIA,
  },
  rain: {
    summary: 'Aplica un tinte al estilo arcoíris.',
    args: ONLY_MEDIA,
  },
  derain: {
    summary: 'Aplica lo contrario del tinte de `rain`.',
    args: ONLY_MEDIA,
  },
  raingold: {
    summary: 'Combina los tintes de arcoíris y dorado.',
    args: ONLY_MEDIA,
  },
  recolor: {
    summary: 'Vuelve a colorear la multimedia con colores vaporwave intensos.',
    args: ONLY_MEDIA,
  },
  solarize: {
    summary: 'Invierte todo lo que es más brillante que un umbral, para un aspecto de foto solarizada.',
    args: ONLY_MEDIA,
  },
  acid: {
    summary: 'Revuelve la paleta de colores, como la tabla de colores de un GIF corrupto.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'porcentaje de los colores de la paleta que se cambian por otros al azar',
      LEVELS: 'escalones de color por canal; la paleta tiene LEVELS³ colores',
      SEED: 'la misma semilla da el mismo resultado; none es al azar',
    },
  },
  hueshiftccs: {
    summary: 'Gira el tono y ajusta la saturación, la gamma, la ganancia y el desplazamiento de una vez.',
    args: {
      MEDIA_KEY: MEDIA,
      HUE: HUE_DEGREES,
    },
  },
  hueshiftyiq: {
    summary: 'Gira el tono en el espacio de color YIQ (NTSC), manteniendo el brillo.',
    args: {
      MEDIA_KEY: MEDIA,
      HUE: HUE_DEGREES,
    },
  },
  rainbow: {
    summary: 'Hace pasar la multimedia por tintes de los colores del arcoíris.',
    args: ONLY_MEDIA,
    notes: ['Una imagen fija se convierte en un GIF animado.'],
  },
  rgbsplit: {
    summary: 'Separa los canales rojo, verde y azul.',
    args: {
      MEDIA_KEY: MEDIA,
      OFFSET: 'cuánto se separan los canales',
    },
  },
  swapcolors: {
    summary: 'Desordena los canales RGBA de cada píxel.',
    args: ONLY_MEDIA,
  },
};
