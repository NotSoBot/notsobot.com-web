// MediaScript commands in Spanish (text, size), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA, TEXT_STYLE_ARGS, TEXT_STYLE_NOTES } from './mediascriptCommon';


const TEXT_IMAGE = 'el nombre de la imagen de texto';
const TTI_ARGS = {
  MEDIA_KEY: TEXT_IMAGE,
  FONT_SIZE: 'tamaño del texto',
  WRAP_WIDTH: 'ancho en píxeles al que partir las líneas',
  COLOR: 'nombre de color, RGBA o #HEX, sin espacios',
  TEXT: 'el texto, envuelto en `{jsonify:}`',
};
const BOX = {
  MEDIA_KEY: MEDIA,
  WIDTH: 'ancho del recuadro en píxeles',
  HEIGHT: 'alto del recuadro en píxeles',
};
const ONLY_MEDIA = {MEDIA_KEY: MEDIA};
const CROP_BACK = 'recortar de vuelta al tamaño original';


export const MEDIASCRIPT_SPANISH_3: TagDocsTranslation['mediaScriptCommands'] = {
  caption: {
    summary: 'Añade encima de la multimedia una barra blanca con texto, como el meme clásico de subtítulo.',
    args: {
      MEDIA_KEY: MEDIA,
      TEXT: 'el subtítulo; separa el texto de arriba y el de abajo con `|`',
    },
  },
  meme: {
    summary: 'Añade texto de meme al estilo Impact encima de la multimedia.',
    args: {
      MEDIA_KEY: MEDIA,
      TEXT: 'el texto; separa el texto de arriba y el de abajo con `|`',
    },
  },
  text: {
    summary: 'Crea una imagen transparente de texto con estilo: cualquier fuente incluida, contorno, sombra, recuadro de fondo, markup y emoji.',
    args: {
      ...TEXT_STYLE_ARGS,
      MEDIA_KEY: TEXT_IMAGE,
      TEXT: 'el texto',
    },
    results: [
      'Pone texto Impact blanco con contorno negro a lo largo de la parte de arriba de la imagen.',
      'Una etiqueta amarilla redondeada con "NEW" en negrita.',
    ],
    notes: [
      'La imagen solo es tan grande como el texto (más su contorno, sombra y recuadro), así que usa `KEYw` / `KEYh` para colocarla con `overlay`, o usa `drawtext` para escribir directamente sobre la multimedia.',
      'La forma antigua de escribirlo, `text MEDIA_KEY FONT_SIZE WRAP_WIDTH COLOR ...TEXT` (dos números y un color antes del texto), sigue funcionando y hace lo mismo que `tti`.',
      ...TEXT_STYLE_NOTES,
    ],
  },
  fittext: {
    summary: 'Escribe el texto lo más grande posible dentro de un recuadro, para plantillas de memes y bocadillos.',
    args: {
      ...TEXT_STYLE_ARGS,
      MEDIA_KEY: TEXT_IMAGE,
      WIDTH: 'ancho del recuadro en píxeles',
      HEIGHT: 'alto del recuadro en píxeles',
      TEXT: 'el texto',
      MIN_SIZE: 'el tamaño de fuente más pequeño que probar',
      MAX_SIZE: 'el tamaño de fuente más grande que probar',
      VALIGN: 'dónde se coloca el texto en vertical dentro del recuadro',
      WRAP: 'partir las líneas para que quepan en el recuadro (false lo mantiene en las líneas que escribiste)',
    },
    results: [
      'Encaja los argumentos del tag en el cuarto superior de la imagen, al estilo meme.',
      'Dos recuadros con el mismo tamaño de fuente, el segundo limitado al tamaño que eligió el primero.',
    ],
    notes: [
      'La imagen mide exactamente `WIDTH`x`HEIGHT`, con el texto colocado según `ALIGN` y `VALIGN`, así que superponla en la esquina superior izquierda del recuadro.',
      'El tamaño que eligió se guarda en la variable `KEYfs` (p. ej. `afs`), útil para que varios recuadros coincidan.',
      'El texto que no cabe ni siquiera con `MIN_SIZE` se corta en el borde del recuadro.',
      ...TEXT_STYLE_NOTES,
    ],
  },
  drawtext: {
    summary: 'Escribe texto con estilo directamente sobre una imagen, un GIF o un vídeo, y puede moverse con el tiempo.',
    args: {
      ...TEXT_STYLE_ARGS,
      MEDIA_KEY: MEDIA,
      TEXT: 'el texto',
      X: 'borde izquierdo del texto, una expresión que puede cambiar en cada fotograma (mira las notas)',
      Y: 'borde superior del texto, igual que `X`',
      START: 'segundo en el que aparece el texto',
      END: 'segundo en el que desaparece el texto; 0 para el final',
    },
    results: [
      'Pone "subscribe" en la esquina inferior derecha.',
      'Un rótulo rojo entra desplazándose desde la derecha pasado un segundo.',
      'Texto que sube y baja en cada fotograma de un GIF.',
    ],
    notes: [
      '`X` e `Y` son expresiones normales con algunos nombres extra: `w`/`h` (el tamaño de la multimedia), `tw`/`th` (el tamaño del texto), `t` (el tiempo del fotograma en segundos) y `n` (el número de fotograma). Además de las funciones habituales admiten `floor`, `ceil`, `sqrt` y `clip(x,min,max)`, y `rand()` da un número nuevo en cada fotograma.',
      'Las líneas se parten en el ancho de la multimedia salvo que se dé `WIDTH`.',
      'Los vídeos cuentan para los usos de `ffmpeg` del script. El audio se mantiene tal cual.',
      ...TEXT_STYLE_NOTES,
    ],
  },
  tti: {
    summary: 'Crea una imagen transparente con texto centrado.',
    args: TTI_ARGS,
    results: [
      'Escribe "hello" en el centro de la imagen.',
    ],
    notes: ['La imagen solo es tan grande como el texto, así que usa `textw` / `texth` para colocarla con `overlay`.'],
  },
  ttil: {
    summary: 'Igual que `tti`, pero el texto se alinea a la izquierda.',
    args: TTI_ARGS,
  },
  ttir: {
    summary: 'Igual que `tti`, pero el texto se alinea a la derecha.',
    args: TTI_ARGS,
  },
  asciitext: {
    summary: 'Crea una imagen con letras grandes de arte ASCII a partir de un texto.',
    args: {
      MEDIA_KEY: 'el nombre de la nueva imagen',
      TEXT: 'el texto, envuelto en `{jsonify:}` (se admiten saltos de línea)',
    },
  },
  labeltriggered2: {
    summary: 'Redimensiona la multimedia a 256 píxeles de ancho y añade debajo una etiqueta de "triggered".',
    args: ONLY_MEDIA,
  },
  labeltriggered3: {
    summary: 'Igual que `labeltriggered2`, con otra etiqueta de "triggered".',
    args: ONLY_MEDIA,
  },
  labelanalysis: {
    summary: 'Añade debajo de la multimedia un panel de "Kowalski, analysis".',
    args: ONLY_MEDIA,
  },
  labelexcuse: {
    summary: 'Añade debajo de la multimedia un panel de "excuse me, what?".',
    args: ONLY_MEDIA,
  },
  labelifunny: {
    summary: 'Añade la barra con la marca de agua de iFunny.',
    args: ONLY_MEDIA,
  },
  labelkirby: {
    summary: 'Añade debajo de la multimedia un panel de "Kirby\'s Calling the Police".',
    args: ONLY_MEDIA,
  },
  labelperfection: {
    summary: 'Añade encima de la multimedia una definición de diccionario de "perfection".',
    args: ONLY_MEDIA,
  },

  resize: {
    summary: 'Redimensiona a un ancho y un alto exactos (estirando si hace falta).',
    args: {
      MEDIA_KEY: MEDIA,
      WIDTH: 'nuevo ancho en píxeles',
      HEIGHT: 'nuevo alto en píxeles',
      KERNEL: 'método de remuestreo, p. ej. `NEAREST` para pixel art nítido',
    },
  },
  contain: {
    summary: 'Encaja la multimedia dentro de un recuadro y rellena el espacio vacío con transparencia.',
    args: BOX,
  },
  cover: {
    summary: 'Rellena un recuadro por completo, recortando lo que sobresalga.',
    args: BOX,
  },
  fit: {
    summary: 'Reduce o amplía la multimedia para que quepa dentro de un recuadro, manteniendo su forma.',
    args: BOX,
  },
  scale: {
    summary: 'Redimensiona por un multiplicador, p. ej. 0.5 para la mitad del tamaño o 2 para el doble.',
    args: {
      MEDIA_KEY: MEDIA,
      SCALE: 'el multiplicador',
    },
  },
  stretch: {
    summary: 'Estira el ancho o el alto (o los dos) por un multiplicador.',
    args: {
      MEDIA_KEY: MEDIA,
      WIDTH: 'multiplicador del ancho',
      HEIGHT: 'multiplicador del alto',
      CROP: CROP_BACK,
    },
  },
  crop: {
    summary: 'Recorta un rectángulo de la multimedia.',
    args: {
      MEDIA_KEY: MEDIA,
      WIDTH: 'ancho de la zona que conservar',
      HEIGHT: 'alto de la zona que conservar',
      X: 'borde izquierdo de la zona',
      Y: 'borde superior de la zona',
    },
  },
  cropauto: {
    summary: 'Recorta automáticamente a la parte más interesante de la multimedia.',
    args: ONLY_MEDIA,
  },
  cropcircle: {
    summary: 'Recorta la multimedia en un círculo con el exterior transparente.',
    args: ONLY_MEDIA,
  },
  cropnft: {
    summary: 'Recorta la multimedia en un hexágono, como los avatares NFT de Twitter.',
    args: ONLY_MEDIA,
  },
  croptriangle: {
    summary: 'Recorta la multimedia en un triángulo con el exterior transparente.',
    args: ONLY_MEDIA,
  },
  trim: {
    summary: 'Quita los bordes negros alrededor de la multimedia.',
    args: {
      MEDIA_KEY: MEDIA,
      THRESHOLD: 'lo oscuro que tiene que ser un borde para contar como negro',
    },
  },
  uncaption: {
    summary: 'Recorta una barra de subtítulo que esté encima de la multimedia.',
    args: {
      MEDIA_KEY: MEDIA,
      TOLERANCE: 'cuánto puede alejarse del blanco el fondo del subtítulo',
    },
  },
  flip: {
    summary: 'Pone la multimedia boca abajo (volteo vertical).',
    args: ONLY_MEDIA,
  },
  flop: {
    summary: 'Refleja la multimedia de izquierda a derecha (volteo horizontal).',
    args: ONLY_MEDIA,
  },
  rotate: {
    summary: 'Gira la multimedia un número de grados.',
    args: {
      MEDIA_KEY: MEDIA,
      DEGREES: 'cuánto girar',
      FILLCOLOR: 'color para las esquinas que quedan al descubierto, como `image_color|video_color` o un solo color para los dos',
      CROP: CROP_BACK,
    },
    results: [
      'Inclina la imagen 45 grados sobre un fondo blanco.',
    ],
    notes: ['Por defecto las imágenes quedan con las esquinas transparentes y los vídeos con esquinas negras, porque el vídeo no puede ser transparente.'],
  },
  offset: {
    summary: 'Desplaza la imagen dentro de su lienzo X o Y píxeles (o ambos).',
    args: {
      MEDIA_KEY: MEDIA,
      X: 'desplazamiento horizontal',
      Y: 'desplazamiento vertical',
    },
  },
};
